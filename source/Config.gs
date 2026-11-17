/**
 * Config.gs
 * Central, non-secret configuration for Kelvin.
 *
 * Secrets (the Gemini API key) are never written in code. Store them in
 * Project Settings > Script properties, for example GEMINI_API_KEY.
 *
 * Model names change often. Keep them here so that switching a model, or a
 * whole provider, is a one-line edit.
 */
const CONFIG = Object.freeze({
  APP_NAME: 'Kelvin',

  /** Google Sheets database. Leave empty to use the spreadsheet bound to this script. */
  SPREADSHEET_ID: '',

  /** Sheet (tab) names. One constant per table so no name is typed twice. */
  SHEETS: Object.freeze({
    USERS: 'Users',
    USER_PROFILES: 'UserProfiles',
    SKILL_LEVELS: 'SkillLevels',
    QUESTION_BANK: 'QuestionBank',
    TEST_SESSIONS: 'TestSessions',
    TEST_ANSWERS: 'TestAnswers',
    ASSESSMENT_RESULTS: 'AssessmentResults',
    LEARNING_PLANS: 'LearningPlans',
    LEARNING_ACTIVITIES: 'LearningActivities',
    USER_PROGRESS: 'UserProgress',
    ACTIVITY_LOGS: 'ActivityLogs',
    WORD_BANK: 'WordBank',
    USER_WORDS: 'UserWords',
    SAVED_WORDS: 'SavedWords',
    HISTORY: 'History',
    GRAMMAR_ERRORS: 'GrammarErrors',
    GRAMMAR_LESSONS: 'GrammarLessons',
    USER_GRAMMAR: 'UserGrammar',
    AUTH_SESSIONS: 'AuthSessions',
    AI_USAGE: 'AIUsage',
    POSTS: 'Posts',
    COMMENTS: 'Comments',
    MESSAGES: 'Messages',
    NOTIFICATIONS: 'Notifications'
  }),

  /** Community board, private messages and the 3-day topic (Community.gs). */
  COMMUNITY: Object.freeze({
    POST_MAX: 2000,
    COMMENT_MAX: 1000,
    MESSAGE_MAX: 1000,
    FEED_PAGE: 25,
    THREAD_SHOW: 120,
    /** Members one answer can tag. The decision was "no limit"; this only stops a runaway request. */
    TAG_MAX: 100,
    POSTS_PER_DAY: 30,
    /** A topic stays up this many days. */
    TOPIC_DAYS: 3,
    /** Gemini reviews the topic and proposes the next one this many hours before it ends; the admin can change it meanwhile. */
    TOPIC_REVIEW_HOURS: 12,
    /** At most this many answers are sent to Gemini for the review. */
    TOPIC_REVIEW_MAX: 60,
    /** The word of the day comes from these WordBank levels. */
    WOTD_LEVELS: Object.freeze(['A2', 'B1', 'B2']),
    /** Pinned at the top of Community from 1 December to 6 January. */
    XMAS_QUESTION: 'Christmas question: What is your best Christmas or year-end memory, and what are you planning this year? Tag a friend you would like to celebrate with.'
  }),

  /** CEFR levels in ascending order. Index 0 is A1. */
  LEVELS: Object.freeze(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']),
  SKILLS: Object.freeze(['speaking', 'listening', 'reading', 'writing']),

  /** Vocabulary learning (Words module). */
  VOCAB: Object.freeze({
    DICT_IPA: true,            // look up pronunciation (IPA) in the free dictionary at dictionaryapi.dev before asking the AI
    /**
     * Words has no daily limit on new words. The learner sets a daily study time instead (minutes, changed in Settings),
     * and learns new words in rounds of ROUND_SIZES words, as many rounds as they like.
     */
    GOAL_MINUTES: 30,
    GOAL_MIN: 5,
    GOAL_MAX: 180,
    ROUND_SIZES: Object.freeze([5, 10, 15]),
    ROUND_DEFAULT: 5,
    /** Rough time per card, used to turn "reviews waiting" into minutes and to suggest a steady number of new words a day. */
    REVIEW_SECONDS: 15,
    NEW_SECONDS: 45,
    /** One new word comes back for review about this many times before it is known (wrong answers included). */
    REVIEWS_PER_WORD: 5.5,
    /**
     * Reviews waiting, as a share of the daily goal: from WARN_SHARE the learner is warned, above REDUCE_SHARE a round takes
     * only REDUCED_ROUND new WordBank words (saved words are never cut). With a 30-minute goal: warn from 56, reduce above 84.
     */
    WARN_SHARE: 7 / 15,
    REDUCE_SHARE: 0.7,
    REDUCED_ROUND: 2,
    /** Extra new words sent with a round, so "I know this word" can show the next word at once. */
    SPARE_NEW: 3,
    /** Extra example sentences, a question, and similar and opposite words for words being learned: words per AI call, and AI calls per day for everyone together. */
    EXTRAS_BATCH: 10,
    EXTRAS_CALLS_PER_DAY: 60,
    /** "Use it" sentences checked by AI, per learner per day. After that the sentence is only checked for the words. */
    SENTENCE_AI_PER_DAY: 8,
    /** Leitner boxes 1 to 5: days until the next review. A wrong answer returns the word to box 1. */
    BOX_INTERVAL_DAYS: Object.freeze([1, 2, 4, 8, 16]),
    SESSION_TARGET_MINUTES: 10,
    /** A session reviews at most this many due words; the rest stay due for tomorrow. */
    REVIEW_CAP: 20,
    /** Saved words reviewed in one review session. In a round of new words, saved words come before any WordBank word. */
    SAVED_REVIEW_CAP: 10,
    /** Free practice (Flashcards, Learn, Match, Test): most cards in one set. These modes never move the review boxes. */
    DECK_MAX: 60,
    /** A word counts as hard after this many more wrong answers than right ones in practice. */
    HARD_MISSES: 2,
    /** Words in one "Quick words" round from the reminder popup. */
    QUICK_ITEMS: 5,
    /** Saved-word limits: most kept, most saved per day. */
    SAVED_MAX: 500,
    SAVED_PER_DAY: 60,
    /** Words per AI call when writing meanings, examples and Vietnamese glosses for the WordBank. */
    GEN_BATCH: 20,
    CHECK_WORDS_PER_TASK: 4
  }),

  /** The History page. See History.gs. */
  HISTORY: Object.freeze({
    MAX_ITEMS: 80,          // questions kept per session
    MAX_JSON: 45000,        // characters per session (a sheet cell holds 50,000)
    PAGE: 40,               // sessions per page in the list
    MATCH_MS: 15 * 60000    // an activity row and a saved session this close together are the same session
  }),

  /** Grammar lessons. See Grammar.gs. */
  GRAMMAR: Object.freeze({
    /** Leitner boxes 1 to 5 for a finished lesson: days until the next review. Under PASS_PCT the lesson returns to box 1. */
    BOX_INTERVAL_DAYS: Object.freeze([1, 2, 4, 8, 16]),
    PASS_PCT: 80,
    /** Items in a first lesson (warm-up choices, then writing) and writing items in a review. */
    LESSON_WARM: 3,
    LESSON_WRITE: 6,
    REVIEW_WRITE: 4,
    /** When a learner has used every writing item of a lesson, the AI writes EXTEND_ITEMS more, up to WRITE_MAX in one lesson. */
    EXTEND_ITEMS: 8,
    WRITE_MAX: 44,
    /** The learner's own mistakes of the topic that are added to a lesson or review as "fix your sentence". */
    OWN_ITEMS: 2,
    /** Sentences: Vietnamese sentences to put into English in each lesson. Stage by how many times the topic was studied: build with word tiles, then first-letter hints, then write it yourself. */
    BUILD_ITEMS: 3,
    /** A mistake leaves the open list after it has been rewritten correctly this many times. */
    FIXED_AFTER: 2,
    /** AI checks per learner per day: "is my sentence also correct?", free-writing feedback, and photos of handwriting. */
    JUDGE_PER_DAY: 25,
    FREE_PER_DAY: 8,
    READ_PER_DAY: 8,
    /** Largest photo accepted, as base64 characters (about 1.1 MB of JPEG). The browser shrinks photos before sending. */
    IMAGE_MAX_CHARS: 1500000,
    /** Corrections from earlier Writing and Speaking pieces that are sorted into topics in one AI call. */
    IMPORT_BATCH: 24
  }),

  /** Practice sessions (Reading, Listening, Writing, Speaking). See Practice.gs. */
  PRACTICE: Object.freeze({
    /** Questions in one Reading or Listening set. */
    SET_SIZE: Object.freeze({ reading: 5, listening: 4 }),
    /** How far one answer moves the ability estimate (Elo-style step; the placement test stays the main measurement). */
    ELO_STEP: 0.12,
    /** One writing or speaking piece moves the estimate this fraction of the way towards the piece's level, at most MAX_MOVE. */
    PRODUCTIVE_BLEND: 0.2,
    MAX_MOVE: 0.35,
    SESSION_STALE_MINUTES: 180,
    /** Writing and Speaking pieces rated by AI, per learner per day (protects the shared free quota). */
    FEEDBACK_PER_DAY: 15,
    /** Minutes credited to a finished set when the browser reports none (clamped to 1 to 40). */
    DEFAULT_MINUTES: Object.freeze({ reading: 8, listening: 8, writing: 12, speaking: 8 })
  }),

  AUTH: Object.freeze({
    SESSION_HOURS: 72,
    PASSWORD_MIN_LENGTH: 1,
    /** Rounds of HMAC-SHA256. Run benchmarkHash() from the editor; keep a sign-in under about 2 seconds. */
    HASH_ITERATIONS: 2000,
    /** After this many wrong passwords for one username the account is paused for LOCK_MINUTES. */
    MAX_FAILED_LOGINS: 5,
    LOCK_MINUTES: 10,
    /** Username rule: 3 to 20 letters, digits, dot, dash or underscore. Stored lowercase. */
    USERNAME_PATTERN: '^[a-z0-9._-]{3,20}$',
    NAME_MAX_LENGTH: 60
  }),

  /** Placement test. See AdaptiveEngine.gs and Placement.gs. */
  TEST: Object.freeze({
    /** Questions per skill: the test stops early when the estimate is precise enough (SE_STOP), never before MIN. */
    READING: Object.freeze({ MIN: 7, MAX: 12, SE_STOP: 0.42 }),
    LISTENING: Object.freeze({ MIN: 5, MAX: 8, SE_STOP: 0.48 }),
    WRITING_MIN_WORDS: 25,
    SPEAKING_PROMPTS: 2,
    SPEAKING_MIN_WORDS: 12,
    /** Wide prior around the learner's own estimate, so real answers outweigh it quickly. */
    PRIOR_SD: 2.0,
    GUESS: 0.25,            // chance of a correct guess on a 4-option question
    DISCRIMINATION: 1.1,
    /** Difficulty centre of each CEFR level on the ability scale (A1 to C2). Boundaries sit halfway between. */
    LEVEL_THETA: Object.freeze([-2.5, -1.5, -0.5, 0.5, 1.5, 2.5]),
    /** An unfinished test older than this is abandoned and a new one starts. */
    SESSION_STALE_MINUTES: 180,
    /** Questions wanted in the bank per level, before the test runs well (see QuestionFactory.gs). */
    BANK_TARGET: Object.freeze({ reading: 30, listening: 20 }),
    /** Speaking and Writing tasks wanted per level. Kelvin > Generate questions tops these up with AI. */
    TASK_TARGET: Object.freeze({ speaking: 25, writing: 15 }),
    /** When a learner has fewer than this many unseen tasks at their level, starting a practice asks the AI for more. */
    TASK_TOP_UP_LOW: 3,
    /** How many tasks one top-up asks for (one AI call). */
    TASK_TOP_UP_COUNT: 8,
    /** Listening conversations wanted per level. Kelvin > Generate questions writes the missing ones (2 AI calls each). */
    CONVERSATION_TARGET: 4
  }),

  /**
   * AI provider settings. The free Gemini tier has small daily limits, so the
   * default is a fast model for every task. Check your real limits in Google AI
   * Studio and raise a task to a stronger model only if your key allows it.
   */
  AI: Object.freeze({
    PROVIDER: 'gemini',
    MODELS: Object.freeze({
      QUESTION_GENERATION: 'gemini-3.5-flash-lite',
      WRITING_SPEAKING_EVALUATION: 'gemini-3.5-flash-lite',
      REPORT_AND_PLAN: 'gemini-3.8-flash',
      /** A different model checks each generated question by solving it. */
      QUESTION_VERIFY: 'gemini-3.1-flash-lite',
      /** Meanings, examples, word partners and Vietnamese glosses for the WordBank (about 270 calls for all 5,310 words). */
      WORD_CONTENT: 'gemini-3.5-flash-lite',
      /** Feedback on one practice piece of Writing or Speaking. */
      PRACTICE_FEEDBACK: 'gemini-3.5-flash-lite'
    }),
    FALLBACK_MODEL: 'gemini-3.1-flash-lite',
    /**
     * Free-tier daily request limits read from Google AI Studio on 2026-11-10 (check again: Google changes them).
     * AIService (Phase 3) counts calls per model in the AIUsage sheet and stops a little before each limit.
     * The three model IDs above were checked against AI Studio on 2026-11-10.
     */
    FREE_DAILY_LIMITS: Object.freeze({
      'gemini-3.5-flash-lite': 500,
      'gemini-3.1-flash-lite': 500,
      'gemini-3.8-flash': 20
    }),
    /** Free-tier requests per minute for the same models. */
    FREE_RPM: Object.freeze({
      'gemini-3.5-flash-lite': 15,
      'gemini-3.1-flash-lite': 15,
      'gemini-3.8-flash': 5
    }),
    /** Gemini text-to-speech is optional. Browser voices are used when false. */
    USE_GEMINI_TTS: true,
    /** Tried in order. If Google renames or retires a preview model, the next one is used. */
    TTS_MODELS: Object.freeze(['gemini-3.1-flash-tts-preview', 'gemini-2.5-flash-preview-tts']),
    /** Voice names from the Gemini prebuilt list: one calm voice for single clips, two for conversations. */
    TTS_VOICES: Object.freeze({ single: 'Kore', speaker0: 'Charon', speaker1: 'Kore', male: Object.freeze(['Charon', 'Puck']), female: Object.freeze(['Kore', 'Aoede']) }),
    TTS_PER_USER_PER_DAY: 40,
    TTS_DRIVE_CACHE: true,      // keep every clip in Drive (folder "Kelvin voice cache") so it is made only once for everyone
    TTS_MAX_CHARS: 2200,
    TTS_MAX_LINES: 18,
    TEMPERATURE_SCORING: 0,
    /** Stop this many calls before a model's daily limit (at most 10% of the limit), so a retry never hits the wall. */
    DAILY_LIMIT_MARGIN: 20
  })
});


/**
 * Columns of every sheet, in order. Row 1 of each sheet holds these headers.
 * Setup.gs creates the sheets from this table; Database.gs reads and writes by header name,
 * so a column can be added at the end without touching other code.
 */
const SCHEMA = Object.freeze({
  [CONFIG.SHEETS.USERS]: ['UserID', 'FullName', 'Username', 'PasswordHash', 'Salt', 'Iterations', 'Role', 'Status', 'CreatedAt', 'LastLoginAt'],
  [CONFIG.SHEETS.USER_PROFILES]: ['UserID', 'OnboardingDone', 'OverallSelfLevel', 'Goals', 'WeeklyGoalMin', 'VoiceAccent', 'ReminderOn', 'ReduceMotion', 'PlacementDone', 'UpdatedAt', 'WordsGoalMin', 'WordsRound', 'WordsAuto'],
  [CONFIG.SHEETS.SKILL_LEVELS]: ['UserID', 'Skill', 'SelfLevel', 'MeasuredLevel', 'Theta', 'StandardError', 'Confidence', 'ProgressPct', 'UpdatedAt'],
  [CONFIG.SHEETS.WORD_BANK]: ['WordID', 'Headword', 'PartOfSpeech', 'CEFR', 'Pack', 'Sense', 'DefinitionEN', 'Example', 'Collocations', 'VietnameseGloss', 'Source', 'Status', 'CreatedAt', 'Quiz', 'MoreExamples', 'Question', 'Related', 'Details'],
  [CONFIG.SHEETS.USER_WORDS]: ['UserID', 'WordID', 'Status', 'Box', 'NextReview', 'Streak', 'Lapses', 'LastResult', 'FirstSeenAt', 'UpdatedAt', 'Misses'],
  [CONFIG.SHEETS.SAVED_WORDS]: ['SavedID', 'UserID', 'Text', 'Context', 'Skill', 'Definition', 'Vietnamese', 'Enriched', 'Status', 'Box', 'NextReview', 'Streak', 'Lapses', 'FirstSeenAt', 'CreatedAt', 'UpdatedAt', 'Misses', 'MoreExamples', 'Question', 'Related', 'Details'],
  [CONFIG.SHEETS.QUESTION_BANK]: ['QuestionID', 'Skill', 'Subtype', 'CEFR', 'DifficultyScore', 'Stem', 'Passage', 'AudioFileId', 'OptionsJSON', 'CorrectAnswer', 'EvaluationCriteria', 'Explanation', 'Source', 'Status', 'TimesServed', 'TimesCorrect', 'CreatedAt'],
  [CONFIG.SHEETS.TEST_SESSIONS]: ['SessionID', 'UserID', 'Type', 'Status', 'StartedAt', 'CompletedAt', 'EngineStateJSON', 'ItemsServedJSON'],
  [CONFIG.SHEETS.TEST_ANSWERS]: ['AnswerID', 'SessionID', 'UserID', 'QuestionID', 'Skill', 'Answer', 'IsCorrect', 'Score', 'ResponseMs', 'Difficulty', 'ThetaAfter', 'AIScoreJSON', 'CreatedAt'],
  [CONFIG.SHEETS.ASSESSMENT_RESULTS]: ['ResultID', 'SessionID', 'UserID', 'Skill', 'EstimatedLevel', 'Theta', 'StandardError', 'Confidence', 'Strengths', 'Weaknesses', 'Recommendations', 'ModelUsed', 'CreatedAt'],
  [CONFIG.SHEETS.LEARNING_PLANS]: ['PlanID', 'UserID', 'Version', 'WeekStart', 'PriorityOrder', 'WeeklyGoals', 'Vocabulary', 'Grammar', 'Status', 'CreatedAt'],
  [CONFIG.SHEETS.LEARNING_ACTIVITIES]: ['ActivityID', 'UserID', 'PlanID', 'Skill', 'Type', 'Title', 'QuestionIDs', 'DueDate', 'Status', 'Score', 'DurationMin', 'CompletedAt'],
  [CONFIG.SHEETS.USER_PROGRESS]: ['UserID', 'Date', 'Skill', 'Minutes', 'LessonsCompleted', 'Score', 'Seconds'],
  [CONFIG.SHEETS.ACTIVITY_LOGS]: ['LogID', 'UserID', 'Event', 'Detail', 'CreatedAt'],
  [CONFIG.SHEETS.HISTORY]: ['HistoryID', 'UserID', 'Kind', 'Skill', 'Title', 'Score', 'Right', 'Total', 'Minutes', 'ItemsJSON', 'CreatedAt'],
  [CONFIG.SHEETS.GRAMMAR_ERRORS]: ['ErrorID', 'UserID', 'Topic', 'Original', 'Better', 'Why', 'Source', 'RefID', 'Fixed', 'CreatedAt', 'UpdatedAt'],
  [CONFIG.SHEETS.GRAMMAR_LESSONS]: ['LessonID', 'Topic', 'CEFR', 'ContentJSON', 'Model', 'Status', 'CreatedAt'],
  [CONFIG.SHEETS.USER_GRAMMAR]: ['UserID', 'Topic', 'Status', 'Box', 'NextReview', 'LastScore', 'Lessons', 'FirstSeenAt', 'UpdatedAt'],
  [CONFIG.SHEETS.AUTH_SESSIONS]: ['TokenHash', 'UserID', 'ExpiresAt', 'CreatedAt'],
  [CONFIG.SHEETS.AI_USAGE]: ['Date', 'Model', 'Calls', 'Errors'],
  [CONFIG.SHEETS.POSTS]: ['PostID', 'UserID', 'Kind', 'Text', 'ExtraJSON', 'LikesJSON', 'VotesJSON', 'Status', 'CreatedAt', 'UpdatedAt'],
  [CONFIG.SHEETS.COMMENTS]: ['CommentID', 'PostID', 'UserID', 'Text', 'LikesJSON', 'Status', 'CreatedAt', 'ReplyJSON'],
  [CONFIG.SHEETS.MESSAGES]: ['MessageID', 'ThreadID', 'FromID', 'ToID', 'Kind', 'Text', 'ContextJSON', 'ReactionsJSON', 'ReadAt', 'CreatedAt'],
  [CONFIG.SHEETS.NOTIFICATIONS]: ['NotificationID', 'UserID', 'Kind', 'PostID', 'FromID', 'Text', 'ReadAt', 'CreatedAt']
});

/**
 * An error whose message is safe to show to the user.
 * Anything else that is thrown is logged and shown as a generic message.
 */
class AppError extends Error {
  /**
   * @param {string} message Text for the user.
   * @param {string=} code 'auth' (sign in again), 'invalid', 'locked', 'busy' or 'server'.
   */
  constructor(message, code) {
    super(message);
    this.name = 'AppError';
    this.code = code || 'invalid';
  }
}
