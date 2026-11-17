# Kelvin: set-up guide (Phase 4)

## 1. Create the project
1. Create a new Google Sheet. Name it "Kelvin DB".
2. In the sheet: Extensions > Apps Script. This script is now bound to the sheet.
3. Make one file per item below (Files + > Script for `.gs`, Files + > HTML for `.html`). Names must match exactly, without the extension. Paste the full content of each.
   - Script (do not reuse an HTML name: Words and Progress are HTML files, so the scripts are WordsService and ProgressTracker): `Code`, `Config`, `Database`, `Auth`, `UserProfile`, `AIService`, `AdaptiveEngine`, `QuestionFactory`, `Seed`, `Placement`, `Common`, `WordsService`, `SavedWords`, `Tts`, `Plan`, `ProgressTracker`, `Practice`, `Api`, `Setup`
   - HTML: `Index`, `CSS`, `Icons`, `Login`, `Onboarding`, `Dashboard`, `Assessment`, `Learning`, `Progress`, `Profile` (HTML), `Words`, `JavaScript`, `PracticeJS`, `WordsJS`
4. Drag `Config` to the top of the file list so it loads first.
5. Project Settings (gear icon) > Time zone: choose your own (for example Asia/Ho_Chi_Minh). Streaks and daily word limits follow this time zone.

## 2. Prepare the database
1. Reload the spreadsheet. A menu **Kelvin** appears.
2. Kelvin > **Set up database**. Allow the permissions. 16 sheets are created. After any update of the code, run **Set up database** again: it adds new columns to existing sheets and keeps your data.
3. Kelvin > **Set up daily clean-up** (removes expired sign-in sessions).
4. Kelvin > **Set invite code**. Type a code and share it only with your friends. Without a code, anyone with the link can register and use your Gemini quota.
5. Upload `data/wordbank_import.csv` to Google Drive, then Kelvin > **Import WordBank CSV from Drive** and paste its link.
6. Kelvin > **Time one password check**. If it is over 2 seconds, lower `HASH_ITERATIONS` in Config.gs.

## 2b. Build the placement test
1. Kelvin > **Set Gemini key**, then **Test the AI** (it should name the model that answered).
2. Kelvin > **Load writing and speaking tasks** (14 hand-written tasks).
3. Kelvin > **Generate questions (about 4 minutes)**. Repeat until **Question bank report** says the bank is full (about 180 questions; 6 to 10 runs at most). Or choose **Generate questions every hour until full** and let it run.
4. Take the test yourself first and tell me if any question looks wrong. A wrong question can be switched off by setting its Status to `retired` in QuestionBank.

## 2c. Build the word bank (Words)
1. Kelvin > **Generate word content (about 4 minutes)**. Each run writes the definition, example, word partners, a short Vietnamese gloss and a quiz for 20 words at a time, and a second model checks them.
2. Repeat until **Word bank report** shows no words waiting. Or choose **Generate word content every hour until done**. The 5,310 words take roughly 265 batches; the free quota spreads this over several days.
3. Words appear to learners as soon as they are approved, so Words works after the first run. Words that fail the check are retried once, then rejected. **Retry rejected words** gives them another chance.
4. Practice for Reading and Listening needs the question bank (step 2b). It now aims for 30 reading and 20 listening questions per level, so run **Generate questions** until the bank report says it is full.

## 3. Deploy
Deploy > New deployment > Web app. Execute as: **Me**. Who has access: **Anyone**. Open the link and register.
After every code change: Deploy > Manage deployments > edit > New version.

## 4. Safety notes
- Share the spreadsheet with nobody. Users and AuthSessions contain password hashes.
- Never change or delete the Script property `AUTH_PEPPER`: every password would stop working.
- To switch an account off: set Status to `disabled` in Users. Admin: set Role to `admin` (used from Phase 4).

## Faster updates: two files
(After the Words update of 2026-11-12, run Set up database once: it adds the Misses column.)
`apps_script/Backend.gs` (all server code) and `apps_script/Index.html` (the whole page) replace the 30 separate files. See `apps_script/README.txt` for the one-time switch. Rebuild them with `python3 tools/build_gas.py` after any change.
