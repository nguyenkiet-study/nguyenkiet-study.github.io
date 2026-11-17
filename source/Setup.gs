/**
 * Setup.gs
 * One-time and maintenance tools. Run them from the spreadsheet menu "Kelvin" (the menu appears when the
 * spreadsheet is opened) or from the Apps Script editor. Visitors of the web app cannot run them:
 * every function here starts with assertOwner_().
 *
 * First-time order
 *  1. Kelvin > Set up database          (creates the 24 sheets and the password secret)
 *  2. Kelvin > Set up daily clean-up and community topics (expired sessions, and the 3-day Community topic)
 *     Kelvin > Set admin                (your username: hide or delete posts, change the topic)
 *  3. Kelvin > Set invite code          (optional, recommended: only friends can register)
 *  4. Kelvin > Import WordBank CSV      (paste the Drive link of wordbank_import.csv)
 *  5. Kelvin > Set Gemini key           (paste the key from Google AI Studio), then Test the AI
 *  6. Kelvin > Load writing and speaking tasks, then Generate questions (repeat until the report says the bank is full)
 *  7. Kelvin > Generate word content (repeat, or switch on the hourly run) until the word bank report says all words are ready
 *  Run "Set up database" again after updating the code: it adds any new columns without touching your data.
 */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Kelvin')
    .addItem('Set up database', 'setupDatabase')
    .addItem('Set up daily clean-up and community topics', 'setupTriggers')
    .addItem('Set invite code', 'setInviteCode')
    .addItem('Set admin', 'setAdmin')
    .addItem('Import WordBank CSV from Drive', 'importWordBankFromDrive')
    .addSeparator()
    .addItem('Set Gemini key', 'setGeminiKey')
    .addItem('List Gemini models for my key', 'listGeminiModels')
    .addItem('Test the AI', 'testAI')
    .addSeparator()
    .addItem('Load writing and speaking tasks', 'loadSeedTasks')
    .addItem('Generate questions (about 4 minutes)', 'generateQuestions')
    .addItem('Generate questions every hour until full', 'setupQuestionTrigger')
    .addItem('Question bank report', 'questionBankReport')
    .addSeparator()
    .addItem('Generate word content (about 4 minutes)', 'generateWordContent')
    .addItem('Generate word content every hour until done', 'setupWordTrigger')
    .addItem('Word bank report', 'wordBankReport')
    .addItem('Retry rejected words', 'retryRejectedWords')
    .addSeparator()
    .addItem('Check status', 'checkStatus')
    .addItem('Time one password check', 'benchmarkHash')
    .addToUi();
}

/** Stops anyone but the script owner. Web app visitors can call global functions, so this matters. */
function assertOwner_() {
  var active = '', effective = '';
  try { active = Session.getActiveUser().getEmail(); effective = Session.getEffectiveUser().getEmail(); } catch (e) { /* fall through */ }
  if (!active || active !== effective) throw new Error('Only the owner can run this.');
}

function say_(message) {
  console.log(message);
  try { SpreadsheetApp.getUi().alert(message); } catch (e) { /* editor run without a spreadsheet window */ }
}

function ask_(title, text) {
  try {
    var r = SpreadsheetApp.getUi().prompt(title, text, SpreadsheetApp.getUi().ButtonSet.OK_CANCEL);
    return r.getSelectedButton() === SpreadsheetApp.getUi().Button.OK ? r.getResponseText().trim() : null;
  } catch (e) { return null; }
}

/** Creates every sheet with its headers. Safe to run again: existing data is never changed. */
function setupDatabase() {
  assertOwner_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss && CONFIG.SPREADSHEET_ID) ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  if (!ss) throw new Error('Open this script from a spreadsheet (Extensions > Apps Script) or set CONFIG.SPREADSHEET_ID.');

  var props = PropertiesService.getScriptProperties();
  props.setProperty('SPREADSHEET_ID', ss.getId()); // the web app finds the database through this
  if (!props.getProperty('AUTH_PEPPER')) {
    var secret = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.getUuid() + Utilities.getUuid() + Date.now()));
    props.setProperty('AUTH_PEPPER', secret);
  }

  var created = [], problems = [], added = [];
  Object.keys(SCHEMA).forEach(function (name) {
    var headers = SCHEMA[name], sh = ss.getSheetByName(name);
    if (!sh) { sh = ss.insertSheet(name); created.push(name); }
    var current = sh.getLastColumn() ? sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), headers.length)).getValues()[0] : [];
    var empty = current.every(function (v) { return v === ''; });
    if (empty) {
      sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    } else {
      // An older version of the sheet has the same headers but fewer columns: add the new ones at the end.
      var have = 0; while (have < current.length && current[have] !== '') have++;
      var prefixOk = headers.slice(0, have).every(function (h, i) { return current[i] === h; });
      if (prefixOk && have < headers.length) {
        sh.getRange(1, have + 1, 1, headers.length - have).setValues([headers.slice(have)]);
        added.push(name + ' (' + headers.slice(have).join(', ') + ')');
      } else if (!prefixOk) {
        problems.push(name + ': row 1 does not match the expected headers. Fix it by hand; nothing was changed.');
      }
    }
    sh.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#EDEBFF').setFontColor('#1C1541');
    sh.setFrozenRows(1);
    if (sh.getMaxColumns() < headers.length) sh.insertColumnsAfter(sh.getMaxColumns(), headers.length - sh.getMaxColumns());
    headers.forEach(function (h, i) {
      if (Db.TEXT_COLUMN.test(h)) sh.getRange(2, i + 1, Math.max(sh.getMaxRows() - 1, 1), 1).setNumberFormat('@');
    });
  });

  var blank = ss.getSheetByName('Sheet1') || ss.getSheetByName('Trang tính1');
  if (blank && ss.getSheets().length > 1 && blank.getLastRow() === 0 && blank.getLastColumn() === 0) ss.deleteSheet(blank);

  // Sheets that hold secrets: a visible reminder, not a lock (anyone with edit access to the file can still see them).
  ss.getSheetByName(CONFIG.SHEETS.USERS).setTabColor('#E5484D');
  ss.getSheetByName(CONFIG.SHEETS.AUTH_SESSIONS).setTabColor('#E5484D');

  say_('Database ready.\nCreated: ' + (created.join(', ') || 'nothing new') + '.' + (added.length ? '\nNew columns added: ' + added.join('; ') + '.' : '') + (problems.length ? '\n\nCheck:\n' + problems.join('\n') : '') +
    '\n\nDo not share this spreadsheet with anyone you do not trust: Users and AuthSessions hold password hashes.');
}

/** Installs the daily trigger that removes expired sign-in sessions. */
function setupTriggers() {
  assertOwner_();
  ScriptApp.getProjectTriggers().forEach(function (t) { var h = t.getHandlerFunction(); if (h === 'cleanupSessions' || h === 'communityTick') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('cleanupSessions').timeBased().everyDays(1).atHour(3).create();
  ScriptApp.newTrigger('communityTick').timeBased().everyHours(1).create();
  say_('Installed: daily clean-up (about 3 AM) and an hourly check that moves the Community topic along (Gemini reviews each topic 12 hours before it ends).');
}

/** Gives a member the admin role (hide or delete posts and comments, change the topic). Run again with an empty name to see who is admin. */
function setAdmin() {
  assertOwner_();
  var name = ask_('Set admin', 'Type the username to make admin. Type "-username" to remove admin from someone.');
  if (name === null) return;
  var remove = name.charAt(0) === '-', u = Auth.normalizeUsername(remove ? name.slice(1) : name);
  var admins = Db.filter(CONFIG.SHEETS.USERS, function (r) { return String(r.Role) === 'admin'; }).map(function (r) { return r.Username; });
  if (!u) return say_('Admins now: ' + (admins.join(', ') || 'none') + '.');
  var row = Db.findByKey(CONFIG.SHEETS.USERS, 'Username', u);
  if (!row) return say_('No member with the username "' + u + '".');
  Db.update(CONFIG.SHEETS.USERS, row._row, { Role: remove ? 'user' : 'admin' });
  say_((remove ? 'Removed admin from ' : 'Made admin: ') + u + '. Sign out and in again in Kelvin to see the admin tools.');
}

/** Sets or clears the invite code needed to register. */
function setInviteCode() {
  assertOwner_();
  var code = ask_('Invite code', 'Type the code friends must enter to register. Leave empty to allow open registration.');
  if (code === null) return;
  var props = PropertiesService.getScriptProperties();
  if (code) props.setProperty('INVITE_CODE', code); else props.deleteProperty('INVITE_CODE');
  say_(code ? 'Invite code saved. New accounts need it.' : 'Invite code removed. Anyone with the link can register.');
}

/** Stores the Gemini API key in Script properties (never in code or in the web page). */
function setGeminiKey() {
  assertOwner_();
  var key = ask_('Gemini API key', 'Paste the key from Google AI Studio. It is stored in Script properties only.');
  if (key === null) return;
  if (!key) return say_('Nothing was entered. The key was not changed.');
  PropertiesService.getScriptProperties().setProperty('GEMINI_API_KEY', key);
  say_('Key saved. Next: Kelvin > Test the AI.');
}

/** Shows the model IDs the key can use, and whether the three IDs in Config.gs are among them. */
function listGeminiModels() {
  assertOwner_();
  var ids = AI.listModels();
  var wanted = Object.keys(CONFIG.AI.MODELS).map(function (k) { return CONFIG.AI.MODELS[k]; }).concat([CONFIG.AI.FALLBACK_MODEL]);
  var missing = wanted.filter(function (m, i) { return wanted.indexOf(m) === i && ids.indexOf(m) < 0; });
  console.log(ids.join('\n'));
  say_('This key can call ' + ids.length + ' models (full list in the execution log).\n' +
    (missing.length ? 'NOT found in your list: ' + missing.join(', ') + '. Fix the ID in Config.gs.' : 'All models in Config.gs are available.'));
}

/** Sends one tiny request through the normal path and reports which model answered. */
function testAI() {
  assertOwner_();
  var r = AI.generateJson('QUESTION_GENERATION', {
    system: 'You reply with JSON only.',
    prompt: 'Return {"word":"hello","level":"A1","example":"<one short English sentence using the word>"}',
    validate: function (d) { return d && d.example ? '' : 'example is missing'; }
  });
  say_('The AI works.\nModel: ' + r.model + '\nReply: ' + JSON.stringify(r.data) + '\n\nToday: ' + (AI.usageToday().join(' | ') || 'no calls yet'));
}

/** Loads the hand-written writing and speaking tasks into the QuestionBank. */
function loadSeedTasks() {
  assertOwner_();
  say_('Added ' + Seed.load() + ' writing and speaking tasks.');
}

/** Generates and checks questions with Gemini for about 4 minutes. Run it again until the bank is full. */
function generateQuestions() {
  assertOwner_();
  var r = QF.run(4 * 60 * 1000);
  say_('Batches: ' + r.batches + '\nNew questions kept: ' + r.approved + '\nDropped by the checks: ' + r.dropped + '\nStopped because: ' + r.stoppedBecause + '\nBank cells still short: ' + r.remainingCells + '\n\n' + QF.report());
}

function questionBankReport() {
  assertOwner_();
  var gaps = QF.gaps();
  say_(QF.report() + '\n\n' + (gaps.length ? gaps.length + ' groups are still below target.' : 'The bank is full.'));
}

/** Runs question generation every hour; it removes itself once the bank is full. */
function setupQuestionTrigger() {
  assertOwner_();
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'generateQuestionsTrigger') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('generateQuestionsTrigger').timeBased().everyHours(1).create();
  PropertiesService.getScriptProperties().setProperty('QF_AUTO', '1');
  say_('Hourly question generation switched on. It stops by itself when the bank is full.');
}

/**
 * Trigger entry point. Global functions can be called by any visitor, so it only works while the owner has switched
 * the schedule on, never runs more than once every 15 minutes, and does nothing once the bank is full.
 */
function generateQuestionsTrigger() {
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty('QF_AUTO') !== '1') return;
  var last = Number(props.getProperty('QF_LAST_RUN') || 0);
  if (Date.now() - last < 15 * 60 * 1000) return;
  props.setProperty('QF_LAST_RUN', String(Date.now()));
  if (!QF.gaps().length) {
    props.deleteProperty('QF_AUTO');
    ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'generateQuestionsTrigger') ScriptApp.deleteTrigger(t); });
    return;
  }
  QF.run(4 * 60 * 1000);
}

/**
 * Imports wordbank_import.csv into the WordBank sheet. Upload the CSV to Google Drive first, then paste its link
 * (or file ID) when asked. Rows already present (same word, part of speech and sense) are skipped, so it is safe to repeat.
 */
function importWordBankFromDrive(fileRef) {
  assertOwner_();
  var ref = fileRef || ask_('Import WordBank', 'Paste the Google Drive link (or file ID) of wordbank_import.csv.');
  if (!ref) return;
  var m = String(ref).match(/[-\w]{25,}/);
  if (!m) throw new Error('That does not look like a Drive link or file ID.');
  var rows = Utilities.parseCsv(DriveApp.getFileById(m[0]).getBlob().getDataAsString('UTF-8'));
  var expected = SCHEMA[CONFIG.SHEETS.WORD_BANK];
  var head = rows.shift();
  // The CSV may have fewer columns than the sheet (the sheet also has Quiz); the columns it has must match, in order.
  if (!head || head.length > expected.length || head.some(function (h, i) { return expected[i] !== h; })) throw new Error('The CSV header does not match the WordBank columns: ' + expected.join(', '));

  var key = function (w, p, s) { return [w, p, s].join('|').toLowerCase(); };
  var have = {}, existing = Db.all(CONFIG.SHEETS.WORD_BANK);
  existing.forEach(function (r) { have[key(r.Headword, r.PartOfSpeech, r.Sense)] = true; });
  var nextNumber = existing.length + 1, now = Db.now(), fresh = [], skipped = 0;
  rows.forEach(function (r) {
    if (!r[1]) return;
    var k = key(r[1], r[2], r[5]);
    if (have[k]) { skipped++; return; }
    have[k] = true;
    var o = {};
    expected.forEach(function (h, i) { o[h] = r[i] === undefined ? '' : r[i]; });
    o.WordID = 'W' + ('0000' + (nextNumber++)).slice(-4);
    o.Status = o.Status || 'pending';
    o.CreatedAt = now;
    fresh.push(o);
  });
  for (var i = 0; i < fresh.length; i += 1000) Db.insertMany(CONFIG.SHEETS.WORD_BANK, fresh.slice(i, i + 1000));
  say_('WordBank import finished.\nAdded: ' + fresh.length + '\nAlready there (skipped): ' + skipped);
}

/** Writes meanings, examples, word partners and Vietnamese glosses for the WordBank for about 4 minutes. Run it again until it says all words are ready. */
function generateWordContent() {
  assertOwner_();
  var r = WordGen.run(4 * 60 * 1000);
  say_('Batches: ' + r.batches + '\nWords added: ' + r.approved + '\nFailed the checks: ' + r.failed + '\nStopped because: ' + r.stoppedBecause + '\n\n' + WordGen.report());
}

function wordBankReport() {
  assertOwner_();
  say_(WordGen.report());
}

/** Moves words that failed twice back to the waiting list for another try. */
function retryRejectedWords() {
  assertOwner_();
  var rows = Db.columns(CONFIG.SHEETS.WORD_BANK, ['WordID', 'Status']).filter(function (r) { return r.Status === 'rejected'; });
  rows.forEach(function (r) { Db.update(CONFIG.SHEETS.WORD_BANK, r._row, { Status: 'pending' }); });
  say_(rows.length + ' words will be tried again.');
}

/** Runs word-content generation every hour; it removes itself once every word has content. */
function setupWordTrigger() {
  assertOwner_();
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'generateWordContentTrigger') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('generateWordContentTrigger').timeBased().everyHours(1).create();
  PropertiesService.getScriptProperties().setProperty('WG_AUTO', '1');
  say_('Hourly word-content generation switched on. It stops by itself when every word has content.');
}

/** Trigger entry point. Same protections as generateQuestionsTrigger: only while switched on, at most once every 15 minutes. */
function generateWordContentTrigger() {
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty('WG_AUTO') !== '1') return;
  var last = Number(props.getProperty('WG_LAST_RUN') || 0);
  if (Date.now() - last < 15 * 60 * 1000) return;
  props.setProperty('WG_LAST_RUN', String(Date.now()));
  var r = WordGen.run(4 * 60 * 1000);
  if (r.stoppedBecause === 'every word has content') {
    props.deleteProperty('WG_AUTO');
    ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'generateWordContentTrigger') ScriptApp.deleteTrigger(t); });
  }
}

/** Shows what is set up. */
function checkStatus() {
  assertOwner_();
  var props = PropertiesService.getScriptProperties(), lines = [];
  lines.push('Spreadsheet linked: ' + (props.getProperty('SPREADSHEET_ID') ? 'yes' : 'NO (run Set up database)'));
  lines.push('Password secret: ' + (props.getProperty('AUTH_PEPPER') ? 'yes' : 'NO (run Set up database)'));
  lines.push('Invite code: ' + (props.getProperty('INVITE_CODE') ? 'set' : 'not set (anyone with the link can register)'));
  lines.push('Gemini key: ' + (props.getProperty('GEMINI_API_KEY') ? 'set' : 'not set yet (needed from Phase 3)'));
  try {
    lines.push('AI use today: ' + (AI.usageToday().join(' | ') || 'no calls yet'));
    lines.push('Question bank:\n' + QF.report());
    lines.push('Users: ' + Math.max(Db.sheet(CONFIG.SHEETS.USERS).getLastRow() - 1, 0));
    lines.push(WordGen.report());
  } catch (e) { lines.push('Sheets: ' + e.message); }
  say_(lines.join('\n'));
}

/** Times one password hash so you can tune CONFIG.AUTH.HASH_ITERATIONS. */
function benchmarkHash() {
  assertOwner_();
  var t = Date.now(), salt = Auth.newSalt();
  Auth.hashPassword('benchmark1', salt, CONFIG.AUTH.HASH_ITERATIONS);
  var ms = Date.now() - t;
  say_('One password check takes ' + ms + ' ms with ' + CONFIG.AUTH.HASH_ITERATIONS + ' rounds.\nAim for under 2000 ms. If it is higher, lower HASH_ITERATIONS in Config.gs (existing accounts keep their own saved value).');
}
