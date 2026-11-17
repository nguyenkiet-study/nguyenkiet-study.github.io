# Kelvin: architecture and design notes (v0.4, Phase 4)

Kelvin is an English-learning web app with a vocabulary trainer that measures speaking, listening, reading and writing separately on the CEFR scale (A1 to C2) and builds a plan from the result. It runs entirely on Google Apps Script, with Google Sheets as the database and Gemini as the AI provider.

## 1. Architecture

```
Browser (single page, vanilla JS)
   |  google.script.run  (one entry point: apiCall)
   v
Code.gs  ->  Auth.gs  ->  Database.gs  ->  Google Sheets
   |                          ^
   +->  AdaptiveEngine.gs -----+
   +->  AIService.gs  ->  provider adapter (Gemini now, Claude later)
```

| File | Role | Phase |
|---|---|---|
| Code.gs | `doGet`, `include` | 1 |
| Config.gs | Constants, model names per task, sheet names, `SCHEMA` (columns of every sheet), `AppError` | 1-2 |
| Index.html | Page shell and includes | 1 |
| CSS.html | Design system | 1 |
| JavaScript.html | Front-end logic, charts, sample-data API layer | 1 |
| Login.html, Onboarding.html, Dashboard.html, Assessment.html, Learning.html, Progress.html, Profile.html | Views | 1 |
| Words.html, WordsJS.html | Vocabulary module: daily session, review boxes, vocabulary check | 1 |
| Icons.html | SVG icon sprite | 1 |
| Auth.gs | Username register/login, salted iterated HMAC-SHA256 hashing, session tokens (only their hash is stored), failed-login lock, optional invite code | 2 |
| Database.gs | `Db`: read by header name, find, insert, update, upsert, delete, script lock, ids | 2 |
| UserProfile.gs | Sign-in bootstrap, onboarding, goals, settings | 2 |
| Api.gs | `apiCall(fn, payload)`: the only function the browser calls; reply `{ok,data}` or `{ok:false,message,code}` | 2 |
| Setup.gs | Menu *Kelvin*: set up database, daily clean-up trigger, invite code, WordBank CSV import, status, hash timing. Owner only | 2 |
| AIService.gs | `AI.generateJson(task, request)`: per-model daily and per-minute budget, one retry, fallback model, JSON repair, key in Script properties | 3 |
| AdaptiveEngine.gs | `Engine`: Bayesian ability estimate on a 71-point grid, item selection by information, stop rule, confidence | 3 |
| QuestionFactory.gs | `QF`: generate, shape-check, verify with a second model, shuffle, store as approved; fills gaps in the bank | 3 |
| Seed.gs | Hand-written writing and speaking tasks | 3 |
| Placement.gs | The placement test: start/resume, grade answers, rate writing and speaking with the rubric, results and report | 3 |

Rules that keep it maintainable:

- The front end never holds a secret. The Gemini key lives in Script Properties.
- Views only render. All server calls go through `Api.call`, which calls `apiCall` through `google.script.run` inside Apps Script and answers from sample data anywhere else (the preview page).
- The app owns the structure and the scoring formulas. AI returns structured scores, and the app turns them into levels.

## 2. Hard limits of the platform and how the design handles them

| Limit | Handling |
|---|---|
| Each server call takes about 1 to 3 seconds | Fetch a whole test part at once, grade multiple-choice answers in the browser, sync results at the end of a part |
| Free Gemini tier has small, changing daily limits (check Google AI Studio) | Grade objective questions without AI. Use AI only for writing, speaking and the final report. Generate questions in batches by trigger. Keep a daily call counter, retry on 429, fall back to a lighter model |
| Web app runs inside an iframe, so microphone and speech recognition may be blocked | Test early. Typed answer is always offered as a fallback |
| No bcrypt | Salted SHA-256 with repeated rounds, plus login rate limiting |
| Sheets handle concurrent writes poorly | `LockService` around writes, `CacheService` for reads |
| Google cannot prove who the visitor is when the app runs as the owner | Own session token (random, stored hashed with expiry in AuthSessions) |

## 3. Database (Google Sheets)

One spreadsheet. Row 1 of each sheet holds the headers below. IDs are prefixed random strings (`usr_`, `ses_`, `q_`) so records link across sheets.

| Sheet | Columns |
|---|---|
| Users | UserID, FullName, Username (unique, lowercase), PasswordHash, Salt, Iterations, Role, Status, CreatedAt, LastLoginAt |
| UserProfiles | UserID, OnboardingDone, OverallSelfLevel, Goals, WeeklyGoalMin, VoiceAccent, ReminderOn, ReduceMotion, PlacementDone, UpdatedAt |
| SkillLevels | UserID, Skill, SelfLevel, MeasuredLevel, Theta, StandardError, Confidence, ProgressPct, UpdatedAt |
| WordBank | WordID, Headword, PartOfSpeech, CEFR, Pack, Sense, DefinitionEN, Example, Collocations, VietnameseGloss, Source, Status, CreatedAt |
| UserWords | UserID, WordID, Status, Box, NextReview, Streak, Lapses, LastResult, FirstSeenAt, UpdatedAt |
| QuestionBank | QuestionID, Skill, Subtype, CEFR, DifficultyScore, Stem, Passage, AudioFileId, OptionsJSON, CorrectAnswer, EvaluationCriteria, Explanation, Source, Status, TimesServed, TimesCorrect, CreatedAt |
| TestSessions | SessionID, UserID, Type, Status, StartedAt, CompletedAt, EngineStateJSON, ItemsServedJSON |
| TestAnswers | AnswerID, SessionID, UserID, QuestionID, Skill, Answer, IsCorrect, Score, ResponseMs, Difficulty, ThetaAfter, AIScoreJSON, CreatedAt |
| AssessmentResults | ResultID, SessionID, UserID, Skill, EstimatedLevel, Theta, StandardError, Confidence, Strengths, Weaknesses, Recommendations, ModelUsed, CreatedAt |
| LearningPlans | PlanID, UserID, Version, WeekStart, PriorityOrder, WeeklyGoals, Vocabulary, Grammar, Status, CreatedAt |
| LearningActivities | ActivityID, UserID, PlanID, Skill, Type, Title, QuestionIDs, DueDate, Status, Score, DurationMin, CompletedAt |
| UserProgress | UserID, Date, Skill, Minutes, LessonsCompleted, Score |
| ActivityLogs | LogID, UserID, Event, Detail, CreatedAt |
| AuthSessions | TokenHash, UserID, ExpiresAt, CreatedAt |
| AIUsage | Date, Model, Calls, Errors |

Question requirements from the brief are all columns of QuestionBank: ID, skill, CEFR level, content (Stem, Passage), options, correct answer or evaluation criteria, explanation, difficulty score. `Status` (pending, approved, retired) keeps unchecked AI questions away from users.

## 3b. Vocabulary module (Words)

Goal: close a vocabulary gap with about 10 minutes a day, aimed at work and everyday use.

**Sessions.** There is no daily limit on new words. The learner sets a daily study time (30 minutes by default), reviews what is due, and learns new words in rounds of 5, 10 or 15. Each new word goes through: introduction (meaning, example, collocations, Vietnamese gloss behind a switch on each card), choose the meaning, and fill the blank with only the first letter given. A round ends with one sentence of the learner's own, prompted by a question. (Section "Words: time goal, rounds, exercise by box" below has the details as built.)

**Spacing.** Five Leitner boxes with intervals of 1, 2, 4, 8 and 16 days. A right answer moves a word up, a wrong answer returns it to box 1. A right answer given with a hint keeps the box. A word in box 5 counts as known. Instead of a cap on new words, the learner is warned when reviews pile up, and rounds get smaller above a higher mark. This runs on two sheets, with one row per user and word in UserWords.

**Vocabulary check (5 minutes).** Separates three kinds of weakness: size (does not recognise the word), recall (recognises it but cannot produce it) and word partners (does not know which words go together). The result decides which exercise types are weighted more in the daily session.

**Word source.** The word bank is pluggable. Rows need a headword, part of speech and a CEFR level. The plan is to import the learner's own copy of the Oxford 3000 and 5000 (CSV, supplied by the learner), then fill in definitions, examples, collocations and Vietnamese glosses in batches with AI, written in Kelvin's own words. Work and everyday packs are added by AI generation. Before the full import, a quick "do I know this word" screen removes words the learner already knows, so study time goes to unknown words.

**AI cost.** Cards are generated in batches (about 30 per call) and stored. Multiple-choice and typed answers are graded by code, with one slip of spelling tolerated in words of five letters or more. Only the optional "own sentence" step uses AI, batched at the end of a session.

**Honest limits.** One new word costs about 2 minutes in total: about 45 seconds to learn it and five or six reviews of about 15 seconds. At 30 minutes a day that is about 14 new words a day (roughly 400 a month); at 10 minutes, about 5. The full Oxford 3000 is still not a short project. Filtering out known words and starting with work and everyday packs is what makes the time count.

## 4. User journey

1. Register or sign in. Validation in the browser and again on the server.
2. Onboarding: welcome, overall level, level per skill (with a live radar), goals.
3. Dashboard shows estimates, clearly marked "Your estimate".
4. Placement test (about 20 minutes): reading, listening, writing, speaking. Each skill is scored independently.
5. Report: estimated level, confidence, strengths, weaknesses, next activities per skill. The dashboard switches to "Measured".
6. Personal plan: priorities from the weakest skill up, weekly goals, daily activities, vocabulary and grammar.
7. Daily vocabulary session and daily practice per skill. Results update levels and the plan. A short periodic test re-checks levels.

Honesty rule used across the UI: a level is always called an estimate, with a confidence rating, and never presented as an official CEFR certificate.

## 5. Design system

| Token | Value |
|---|---|
| Primary / secondary | #635BFF / #8B7CFF |
| Background / surface | #F7F8FC / #FFFFFF |
| Text / muted | #171923 / #737789 |
| Success / warning / error | #22C55E / #F59E0B / #EF4444 |
| Skill hues | Speaking #635BFF, Listening #0F9D9A, Reading #3B82F6, Writing #D9559B |
| Type | Inter 400 to 700, 15px body, sentence case everywhere |
| Radius | 20 cards, 14 inner blocks, 10 controls, pill for status |
| Motion | One orchestrated moment (the radar drawing in). Everything else answers a user action. Reduced motion respected and switchable in Settings |

Signature elements: the **Skill Radar** (four axes, six CEFR rings, dashed line for the user's own estimate) and the **CEFR ladder** (six rungs with a marker for the level). Both are plain SVG/HTML, with no chart library.

Responsive: sidebar on desktop, icon rail on tablet, bottom navigation on mobile.

## 6. Adaptive assessment engine (Phase 3)

Simple "right means harder, wrong means easier" is too noisy, because one guess or slip moves the result by a full level. The engine uses a small Bayesian ability estimate per skill.

1. **Scale.** Each CEFR level maps to a difficulty centre from -2.5 (A1) to +2.5 (C2). Each question has a difficulty score from 0 to 100 inside its level.
2. **Prior.** Start from the user's self-estimate with a deliberately wide spread, so real answers outweigh it quickly.
3. **Update.** After each answer, update a probability distribution over ability on a 60-point grid using a Rasch-style model with a guessing floor for multiple choice (25 percent for four options). This is cheap enough for Apps Script.
4. **Next question.** Pick the unused question whose difficulty is closest to the current estimate, balanced across subtypes (vocabulary, grammar, comprehension).
5. **Stop.** After a minimum number of items, stop when the standard error is small enough or the maximum is reached.
6. **Consistency.** Misfit (correct on hard items, wrong on easy ones) lowers the confidence rating.
7. **Productive skills.** Writing and speaking are scored by AI against a fixed rubric (task completion, grammar, vocabulary, coherence, and fluency for speaking), temperature 0, JSON output. The app converts rubric scores to a level with its own formula. Measured facts such as word count and words per minute are computed by the app, not by the model.
8. **Pronunciation.** Speech-to-text cannot judge pronunciation reliably, so Kelvin reports an intelligibility indicator and says so.
9. **Output.** Level, confidence (high, medium, low), and the label "estimate".

Question sources: a fixed starter bank in the sheet, plus AI-generated questions created in batches by a time trigger, validated by schema (all required fields, one correct option, level tag, no duplicates), and held as `pending` until approved. Difficulty scores are recalibrated from real answers over time.

## 7. AI cost plan for the free tier

- Multiple-choice answers: graded by code, zero AI calls.
- Placement test: about 3 to 5 calls (writing, speaking, report), sent after the relevant part.
- Question generation: one call returns about 10 questions.
- Daily budget counter (`AIUsage`) blocks calls before the provider's limit is hit, and shows a friendly message.
- Free-tier requests may be used by Google to improve its products, so users are told not to enter sensitive personal information in writing tasks.

## 8. Phases

1. Front end with sample data. **Done in this delivery.**
2. Backend: Auth, Database, Profile, Api, Setup; sessions; profiles; WordBank import. **Done in this delivery** (sample data remains for learning content until Phase 3-4).
3. AI and placement test: AIService, AdaptiveEngine, QuestionFactory, Placement. **Done in this delivery.** Learning plan generation and vocabulary content generation are next.
4. Learning modules fed by the question bank, progress tracking.
5. Testing: authentication, storage, AI errors, scoring checks, responsive, performance.

## 9. Open items to verify

- Whether the microphone and speech recognition work inside the Apps Script iframe on your browsers (spike test at the start of Phase 2).
- Model names in Config.gs (`gemini-flash-latest` and `gemini-flash-lite-latest` are aliases to confirm in Google AI Studio), and your key's real daily limits.
- The Oxford 3000/5000 file to import (supplied by the learner). Kelvin does not ship these lists.
- Whether Gemini text-to-speech is available on your free key (it is optional and off by default).

## 10. Placement test as built

- **Order and length.** Reading (7 to 12 adaptive questions), Listening (5 to 8), Writing (one task), Speaking (two prompts). Reading and Listening stop early when the standard error is small enough.
- **Accuracy (simulation, 300 simulated learners per level, answers drawn from the same model).** Mean error about half a CEFR level, the true level is within one level about 95 percent of the time, and exactly right about 50 to 60 percent of the time. This is the limit of a short multiple-choice test with a 25 percent guessing chance, so the result is always shown as an estimate with a confidence rating. Retaking later, and using practice results (Phase 4), tightens it.
- **Question quality.** Every AI question is checked by a different model that solves it blind; only questions where both agree and the checker calls it unambiguous are kept. Option order is shuffled by code.
- **Productive skills.** The AI gives a CEFR level per criterion with evidence; the app combines them with fixed weights. Writing: task 20, grammar 30, vocabulary 25, coherence 25 percent. Speaking adds fluency (25 percent, from words per minute measured by the app; left out when the answer was typed). Too little text caps the level at A2 and the confidence at Low. Productive skills never get High confidence.
- **Learner text is data.** It is sent inside tags with an instruction to ignore any instructions inside it.
- **Server owns the answers.** The browser never receives the answer key; grading and the engine state stay on the server.
- **AI calls per test.** Normally 3: one for writing, one for speaking, one report. Question generation is separate and done in advance.


## 11. Phase 4: Words, Practice, plan and progress (as built)
- **Words** (`WordsService.gs`, `WordsJS.html`): Leitner boxes 1 to 5 with intervals 1, 2, 4, 8, 16 days. The browser reports right or wrong per word; the server computes boxes and due dates, so a repeated submit changes nothing. No daily limit on new words (see the Words section at the end); reviews come 20 at a time. New words come from the learner's level and the one below, stable for the day.
- **Word content** (`WordGen`): batches of 20 through `WORD_CONTENT`, shape checks in code, then a second model (`QUESTION_VERIFY`) checks definition, example and gloss; the quiz is checked separately. A word with a bad quiz is kept without it. Failures are retried once, then rejected. Example sentences keep the target word in [brackets].
- **Vocabulary check**: 12 words (recognise, recall, word partners) gives a profile (size, recall gap, depth gap, balanced), stored in ActivityLogs.
- **Practice** (`Practice.gs`, `PracticeJS.html`): Reading 5 and Listening 4 questions from QuestionBank, graded on the server with explanation after each answer (no AI). Writing and Speaking: one `PRACTICE_FEEDBACK` call, with word count and pace measured by code. Level moves with a small Elo-style step; short text never counts; 15 written or spoken pieces a day per learner.
- **Plan** (`Plan.gs`): one active weekly plan per learner, shares from skill scores and goals; the four skills share 80% of the weekly goal and Words is planned apart from its own daily goal (minutes a day times seven), rebuilt after a new placement or a new week. One AI call per plan adds a coach note and topics, with a fixed fallback.
- **Progress** (`ProgressTracker.gs`): daily minutes, streak, 12-week calendar, 8-week level history, milestones, recent activity. All numbers are computed from UserProgress, LearningActivities and SkillLevels; none are made up.
- **Tests**: `tools/learning_test.js` (server), `tools/learning_e2e.py` (real browser against the server code).

## Saved words (SavedWords.gs)
Learners select a word or phrase in any practice text (passage, listening script, feedback, prompts, corrections) and tap "Save to Words". `Api` actions: `saveWord`, `savedList`, `savedRemove`, `savedSubmit`. Saving is instant; the meaning is filled later (bank match, else one AI call, with a 10-minute backoff on failure). Saved words use the same Leitner boxes and join the daily Words session (up to 5 new + 10 reviews). Limits: 4 words per phrase, 60 saves/day, 500 total. Sheet: `SavedWords`.

## Listening voice (Tts.gs)
Two layers. (1) Natural voice: `ttsAudio` calls Gemini TTS (models in `CONFIG.AI.TTS_MODELS`, tried in order; voices in `TTS_VOICES`; two named voices Sam/Priya for conversations) and returns 16-bit PCM as base64, which the page wraps as WAV and plays; the browser keeps the audio per clip so replays cost nothing. Limits: 900 characters and 10 lines per clip, 40 clips per learner per day; after every model fails the voice rests for 10 minutes. (2) Browser voice fallback (`speakLines`): ranks installed voices (Edge Natural/Google first, robotic last), splits sentences, pauses between speakers, supports a chosen voice in Settings. Settings: Voice quality (Natural AI / Browser) and Browser voice. Single words in Words always use the browser voice. To switch the AI voice off, set `USE_GEMINI_TTS: false` in Config.gs.

## Words: time goal, rounds, exercise by box, I know this word, Practise a set, Quick words
- **Time goal, no word limit.** `CONFIG.VOCAB.GOAL_MINUTES` (30) is the default daily goal; the learner changes it in Settings (5 to 180, stored in `UserProfiles.WordsGoalMin`). Time is kept to the second in `UserProgress.Seconds` (sessions and free practice; the browser counts only active time, a pause over a minute counts as one minute). `wordsToday` returns the goal line (`goal`), the reviews that are due (`review`, 20 WordBank + 10 saved at a time) and the first round of new words (`round`, with 3 spare words).
- **Rounds.** `wordsRound {n, exclude}` gives one more round (5, 10 or 15; `UserProfiles.WordsRound`). The learner's saved words always come first (oldest first); WordBank words fill the rest. The browser fetches the next round while the current one is studied, so "Learn more" starts at once.
- **When reviews pile up.** Reviews waiting are compared with the goal (15 seconds a card): from `WARN_SHARE` (7/15 of the goal: 56 cards at 30 minutes) the learner is warned and Review becomes the main button; above `REDUCE_SHARE` (0.7: 84 cards) a round takes only `REDUCED_ROUND` (2) WordBank words. Saved words are never cut. `UserProfiles.WordsAuto = false` ("Only warn me") switches the cut off. After every session the summary shows the reviews due by tomorrow, so the learner sees a pile coming.
- **Exercise by box** (`reviewStep` in WordsJS.html): box 1 fill the blank with the first letter given; box 2 fill the blank from the meaning; box 3 hear the word and type it, or type it from its meaning; box 4 word partners, Vietnamese to English or the closest word; box 5 answer a question using the word, or the opposite word. The target word is never printed next to the blank. Missing content falls back to an easier kind.
- **Hints** (typed exercises): first letters and length, then a meaning. A right answer after a hint is reported as `hint`: the box and its interval stay. `wordsSubmit {results:[{id, r}], seconds}` takes `ok`, `hint` or `miss` per word (the worst answer counts) and saves WordBank and saved words in one call.
- **Missed words come back** 3 to 5 cards later in the same session as a different kind of exercise, up to three times. The word still returns to box 1: the second try only shows short-term memory.
- **More sentences and a question** (`wordsExtras {ids}`): in the background, one AI call per session writes two more example sentences and one question for up to 10 words that have none (`WordBank.MoreExamples`, `WordBank.Question`, same columns in SavedWords). Reviews then use a different sentence at each box. Limits: `EXTRAS_CALLS_PER_DAY` (60, everyone together); when the AI is busy the call rests 10 minutes and words keep their one sentence. A word whose answer fails the checks gets `Question = "-"` and is not asked for again.
- **Similar and opposite words** (`WordBank.Related`, `SavedWords.Related`, JSON `{s, a, n}`): up to two of each and a one-line note on the difference, written in the same background AI call as the extra sentences (no extra call). Never shown with a new word: learning two close words at once makes both harder. From box 3 they appear after each answer; boxes 4 and 5 can ask "closest meaning" or "opposite". `{}` marks a word with no good related words. Words that got their sentences in the earlier version get their related words in the next call, keeping their sentences.
- **Use it** (end of a round): one question taken from a new word, with up to two more new words offered. Checked in the browser for the words and the length; then `wordsSentence` adds a short AI note (`PRACTICE_FEEDBACK`, `SENTENCE_AI_PER_DAY` 8 per learner). Never graded.
- **Speed.** WordBank rows are read through the script cache (`wb_<WordID>`, one hour), so a session does not read the sheet once per word. Edits made by hand in the WordBank sheet show up within the hour.
- I know this word (`wordsKnow {id}`): status `knew`, box 5, next review in 10 years. The browser moves on at once (a spare word takes the place of a new one) and saves in the background. `wordsStudyAgain` undoes it. Stats show "already knew" apart from "mastered" (box 5 reached in the app).
- Practise a set (`wordsDeck {set}`: today, due, saved, hard, learned): Flashcards, Learn, Match, Test in StudyJS.html. Free practice never moves boxes or dates. `wordsPractice` adds misses minus right answers to the `Misses` column; a word with `Misses >= HARD_MISSES` (2) is in "Hard words".
- Quick words (`wordsQuick {ids}`): a centre popup once when the app opens (Start / Later); afterwards a corner reminder when returning to the Dashboard or after a practice set, at most every 20 minutes, never during an exercise, and not once today's time goal is reached. A quick round takes saved new words first, then reviews, then new WordBank words. After a practice in which words were saved, the corner offers exactly those words (one look and one check each). Settings > Word reminders switches it off.
- New columns: `Misses`, `MoreExamples`, `Question`, `Related` (SavedWords), `MoreExamples`, `Question`, `Related` (WordBank), `Seconds` (UserProgress), `WordsGoalMin`, `WordsRound`, `WordsAuto` (UserProfiles). Run Kelvin > Set up database after updating, so the new columns get their headers.
- **Sound on phones** (JavaScript.html): on iPhone and iPad the system picks the voice (a voice picked by hand can stay silent), `speak()` is not called straight after `cancel()`, and one audio player is unlocked inside the tap and reused for clips that arrive later. `Kelvin.say(word)` uses the browser voice first and switches to the natural voice when the browser voice never starts.
