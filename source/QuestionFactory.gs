/**
 * QuestionFactory.gs
 * Builds the QuestionBank with Gemini, and keeps only questions that pass checks.
 *
 * Pipeline for each batch (about 10 questions):
 *   1. GENERATE: one AI call returns questions as JSON for one skill, CEFR level and question type.
 *   2. CHECK THE SHAPE: 4 options, a valid correct index, distinct options, right length, no duplicate of an existing stem.
 *   3. VERIFY: a different model solves each question without seeing the key. Only questions where it picks the same
 *      answer and says the question is unambiguous are kept (Status "approved"). Others are dropped.
 *   4. SHUFFLE: option order is shuffled by code, so the key is not biased towards one letter.
 *
 * Run it from the spreadsheet menu: Kelvin > Generate questions. It works for about 4 minutes per run and can be
 * repeated, or scheduled with Kelvin > Generate questions every hour until the bank is full.
 */
var QF = (function () {
  /** What is asked for, per skill. */
  var KINDS = {
    reading: [
      { sub: 'vocabulary', passage: false, how: 'One sentence with a single blank (___). The options are four words or short phrases; exactly one fits the blank in meaning and usage.' },
      { sub: 'grammar', passage: false, how: 'One sentence with a single blank (___) testing grammar (tense, article, preposition, conditional, modal, word form). Exactly one option is correct.' },
      { sub: 'comprehension', passage: true, how: 'A short text, then one question about it (main idea, detail, inference or the meaning of a word in context). The answer must be clear from the text alone.' }
    ],
    listening: [
      { sub: 'gist', passage: true, how: 'A spoken script, then one question about the main purpose or topic.' },
      { sub: 'detail', passage: true, how: 'A spoken script, then one question about a specific detail (a number, time, place, reason or decision).' }
    ]
  };
  var TOPICS = ['a workday and meetings', 'emails and messages at work', 'ordering food and drink', 'shopping and prices', 'travel and transport', 'hotels and appointments', 'health and the doctor', 'housing and neighbours', 'phone and internet', 'weather and plans', 'family and friends', 'hobbies and sport', 'job interviews and CVs', 'customer service', 'news and city life', 'school and learning'];
  var LEVEL_STYLE = {
    A1: 'Very basic everyday English. Short sentences, present tense, common words. Texts 20 to 40 words.',
    A2: 'Simple everyday English. Past and future basics, common phrases. Texts 40 to 70 words.',
    B1: 'Clear standard English on familiar topics, with some linking words and mixed tenses. Texts 70 to 110 words.',
    B2: 'Wider vocabulary, passive, conditionals, opinions and abstract topics. Texts 100 to 150 words.',
    C1: 'Complex and precise English, idiomatic phrases, nuanced inference. Texts 130 to 180 words.',
    C2: 'Sophisticated English, subtle shades of meaning, rare words, dense argument. Texts 150 to 200 words.'
  };

  function norm(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
  function stemKey(q) { return norm(q.Stem).slice(0, 80) + '|' + norm(q.Passage).slice(0, 40); }

  /** The JSON shape the model must return. */
  function genSchema() {
    return {
      type: 'OBJECT', properties: { questions: { type: 'ARRAY', items: { type: 'OBJECT', properties: {
        passage: { type: 'STRING' }, question: { type: 'STRING' },
        options: { type: 'ARRAY', items: { type: 'STRING' } },
        correct_index: { type: 'INTEGER' }, difficulty: { type: 'INTEGER' }, explanation: { type: 'STRING' }
      }, required: ['question', 'options', 'correct_index', 'difficulty', 'explanation'] } } }, required: ['questions']
    };
  }

  function genPrompt(skill, level, kind, count) {
    var topics = [], pool = TOPICS.slice(), i;
    for (i = 0; i < count; i++) topics.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0] || TOPICS[0]);
    return 'Write ' + count + ' different multiple-choice English test questions.\n' +
      'Skill: ' + skill + '. CEFR level: ' + level + '. Type: ' + kind.sub + '.\n' +
      'Level guide: ' + LEVEL_STYLE[level] + '\n' +
      'Format: ' + kind.how + '\n' +
      (kind.passage ? (skill === 'listening' ? '"passage" is the exact words that will be read aloud (a dialogue as "A: ... B: ..." or an announcement). It must not contain the question.\n' : '"passage" is the text to read.\n') : 'Leave "passage" empty.\n') +
      'Topics, one per question in this order: ' + topics.join('; ') + '. Use work and daily-life situations.\n' +
      'Rules: exactly 4 options, only one correct, plausible wrong options, no "all of the above", all options similar in length. ' +
      '"correct_index" is 0 to 3. "difficulty" is 0 to 100 inside the ' + level + ' level (50 = typical ' + level + ', spread the ' + count + ' questions between 20 and 80). ' +
      '"explanation" is one short sentence in English saying why the answer is right.\n' +
      'Use neutral names and no real people, brands or controversial topics. Return JSON: {"questions":[...]}.';
  }

  /** Returns an error text, or '' when a generated question is acceptable. */
  function checkShape(q, skill, kind) {
    if (!q || typeof q !== 'object') return 'not an object';
    if (!q.question || String(q.question).length < 8 || String(q.question).length > 300) return 'bad question length';
    if (!Array.isArray(q.options) || q.options.length !== 4) return 'needs 4 options';
    var opts = q.options.map(function (o) { return String(o || '').trim(); });
    if (opts.some(function (o) { return !o || o.length > 140; })) return 'bad option';
    if (new Set(opts.map(norm)).size !== 4) return 'duplicate options';
    if (!(q.correct_index >= 0 && q.correct_index <= 3) || q.correct_index !== Math.floor(q.correct_index)) return 'bad correct_index';
    if (/all of the above|none of the above/i.test(opts.join('|'))) return 'all/none of the above';
    if (kind.passage) {
      var n = String(q.passage || '').trim().split(/\s+/).length;
      if (n < 12 || n > 260) return 'bad passage length';
      if (skill === 'listening' && norm(q.passage).indexOf(norm(q.question)) > -1) return 'question inside the script';
    }
    if (!kind.passage && String(q.question).indexOf('___') < 0) return 'blank missing';
    return '';
  }

  function shuffled(arr) { var a = arr.slice(), i, j, t; for (i = a.length - 1; i > 0; i--) { j = Math.floor(Math.random() * (i + 1)); t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  /** Asks a second model to solve the questions. Returns one verdict per question, same order. */
  function verify(kept, skill) {
    var items = kept.map(function (q, i) {
      return { id: i, passage: q.passage || '', question: q.question, options: q.options };
    });
    var res = AI.generateJson('QUESTION_VERIFY', {
      system: 'You are an expert English teacher and test checker. You answer test questions independently and honestly.',
      prompt: 'Solve each multiple-choice question. For each one give the index (0 to 3) of the best answer, and set "unambiguous" to true only if exactly one option is clearly correct and the question has no error.' +
        (skill === 'listening' ? ' The passage is what the learner hears.' : '') + '\nReturn JSON: {"answers":[{"id":0,"answer":0,"unambiguous":true}]}\n\n' + JSON.stringify(items),
      schema: { type: 'OBJECT', properties: { answers: { type: 'ARRAY', items: { type: 'OBJECT', properties: { id: { type: 'INTEGER' }, answer: { type: 'INTEGER' }, unambiguous: { type: 'BOOLEAN' } }, required: ['id', 'answer', 'unambiguous'] } } }, required: ['answers'] },
      validate: function (d) { return d && Array.isArray(d.answers) ? '' : 'answers missing'; }
    });
    var byId = {};
    res.data.answers.forEach(function (a) { byId[a.id] = a; });
    return kept.map(function (q, i) { var a = byId[i]; return !!(a && a.unambiguous === true && a.answer === q.correct_index); });
  }

  /**
   * Makes one batch and stores the approved questions.
   * @return {{asked:number, shapeOk:number, approved:number, model:string}}
   */
  function makeBatch(skill, level, kind, count) {
    var gen = AI.generateJson('QUESTION_GENERATION', {
      system: 'You are an expert English language test writer who follows the CEFR. You output JSON only.',
      prompt: genPrompt(skill, level, kind, count), schema: genSchema(), temperature: 0.9,
      validate: function (d) { return d && Array.isArray(d.questions) && d.questions.length ? '' : 'questions missing'; }
    });
    var existing = {};
    Db.all(CONFIG.SHEETS.QUESTION_BANK).forEach(function (r) { existing[stemKey(r)] = 1; });
    var kept = gen.data.questions.filter(function (q) {
      var err = checkShape(q, skill, kind);
      if (err) { console.log('QF drop (' + err + ')'); return false; }
      var k = stemKey({ Stem: q.question, Passage: q.passage });
      if (existing[k]) return false;
      existing[k] = 1; return true;
    });
    var out = { asked: gen.data.questions.length, shapeOk: kept.length, approved: 0, model: gen.model };
    if (!kept.length) return out;
    var verdicts = verify(kept, skill), rows = [], now = Db.now();
    kept.forEach(function (q, i) {
      if (!verdicts[i]) return;
      var order = shuffled([0, 1, 2, 3]), opts = order.map(function (k) { return String(q.options[k]).trim(); });
      rows.push({
        QuestionID: Db.newId('q'), Skill: skill, Subtype: kind.sub, CEFR: level,
        DifficultyScore: Math.max(0, Math.min(100, Math.round(Number(q.difficulty) || 50))),
        Stem: String(q.question).trim(), Passage: kind.passage ? String(q.passage).trim() : '', AudioFileId: '',
        OptionsJSON: JSON.stringify(opts), CorrectAnswer: String(order.indexOf(q.correct_index)),
        EvaluationCriteria: '', Explanation: String(q.explanation || '').trim(), Source: 'ai', Status: 'approved',
        TimesServed: 0, TimesCorrect: 0, CreatedAt: now
      });
    });
    Db.lock(function () { Db.insertMany(CONFIG.SHEETS.QUESTION_BANK, rows); });
    out.approved = rows.length;
    return out;
  }

  /* ---------- Speaking and Writing tasks (open prompts, no answer key) ---------- */
  var TASK_SKILLS = ['speaking', 'writing'];
  var TASK_STYLE = {
    A1: 'Very simple personal questions about self, family, home, food, daily routine. Short words, present tense. The learner can answer in 3 to 5 short sentences.',
    A2: 'Simple everyday topics: routines, last weekend, plans, shopping, home, friends, work basics, simple invitations. Past simple and going to are fine. Answer in about 30 to 45 seconds.',
    B1: 'Familiar topics with reasons and short stories: experiences, preferences, work situations, advice, plans. Answer in about 1 minute.',
    B2: 'Opinions with reasons and examples, workplace situations, comparisons, hypothetical questions. Answer in about 1 to 2 minutes.',
    C1: 'Abstract or complex issues, balanced argument, nuance, professional and social topics. Answer in about 2 minutes.',
    C2: 'Sophisticated, abstract questions that invite subtle argument and reflection. Answer in about 2 minutes.'
  };
  var TASK_TOPICS = ['daily routine', 'family and friends', 'home and neighbourhood', 'food and cooking', 'shopping', 'travel and holidays', 'work and colleagues', 'meetings and emails', 'study and learning', 'health and sport', 'free time and hobbies', 'technology and phones', 'money and saving', 'weather and seasons', 'city life', 'festivals and celebrations', 'films, books and music', 'plans and goals', 'problems and solutions', 'customer service', 'job interviews', 'the environment', 'past experiences', 'advice and recommendations'];

  function taskSchema() {
    return { type: 'OBJECT', required: ['tasks'], properties: { tasks: { type: 'ARRAY', items: { type: 'OBJECT', required: ['prompt', 'criteria'], properties: { prompt: { type: 'STRING' }, criteria: { type: 'STRING' } } } } } };
  }

  /**
   * Asks the AI for new open tasks at one level and stores the ones that pass the checks (approved at once:
   * an open prompt has no answer key that could be wrong). Never repeats a prompt already in the bank.
   * @return {{asked:number, approved:number, model:string}}
   */
  function makeTasks(skill, level, count) {
    var have = Db.filter(CONFIG.SHEETS.QUESTION_BANK, function (r) { return r.Skill === skill && r.Subtype === 'task'; });
    var existing = {}; have.forEach(function (r) { existing[norm(r.Stem)] = 1; });
    var sameLevel = have.filter(function (r) { return r.CEFR === level; }).map(function (r) { return '- ' + r.Stem; }).slice(-40);
    var pool = TASK_TOPICS.slice(), topics = [], i;
    for (i = 0; i < count; i++) topics.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0] || TASK_TOPICS[0]);
    var what = skill === 'speaking'
      ? 'speaking tasks. Each "prompt" is one question or short instruction the learner answers out loud, written to the learner as "you".'
      : 'writing tasks. Each "prompt" is one short writing instruction (a message, an email or a short text) written to the learner as "you", with a word range in brackets.';
    var gen = AI.generateJson('QUESTION_GENERATION', {
      system: 'You are an expert English teacher who writes CEFR-aligned speaking and writing tasks. You output JSON only.',
      temperature: 1,
      schema: taskSchema(),
      validate: function (d) { return d && Array.isArray(d.tasks) && d.tasks.length ? '' : 'tasks missing'; },
      prompt: 'Write ' + count + ' different ' + skill + ' tasks for English learners.\nCEFR level: ' + level + '.\n' +
        'Kind: ' + what + '\nLevel guide: ' + TASK_STYLE[level] + '\n' +
        'Topics, one per task in this order: ' + topics.join('; ') + '. Use real work and daily-life situations. Vary the question form (describe, tell me about, what would you do, do you agree).\n' +
        '"prompt" is under 200 characters and ends with "?" or ".". "criteria" says in under 160 characters what a good answer at this level does (grammar, vocabulary, organisation).\n' +
        'Do not repeat or closely copy these existing tasks:\n' + (sameLevel.join('\n') || '(none)') + '\n\n' +
        'Return JSON: {"tasks":[{"prompt":"...","criteria":"..."}]}'
    });
    var rows = [], now = Db.now();
    gen.data.tasks.forEach(function (t) {
      var pr = String(t && t.prompt || '').replace(/\s+/g, ' ').trim(), cr = String(t && t.criteria || '').replace(/\s+/g, ' ').trim();
      if (pr.length < 12 || pr.length > 240 || !/[?.)]$/.test(pr) || cr.length < 8) { console.log('QF task drop (shape)'); return; }
      var k = norm(pr); if (existing[k]) return; existing[k] = 1;
      rows.push({ QuestionID: Db.newId('q'), Skill: skill, Subtype: 'task', CEFR: level, DifficultyScore: 50, Stem: pr, Passage: '', AudioFileId: '', OptionsJSON: '', CorrectAnswer: '', EvaluationCriteria: cr.slice(0, 240), Explanation: '', Source: 'ai', Status: 'approved', TimesServed: 0, TimesCorrect: 0, CreatedAt: now });
    });
    if (rows.length) Db.lock(function () { Db.insertMany(CONFIG.SHEETS.QUESTION_BANK, rows); });
    return { asked: gen.data.tasks.length, approved: rows.length, model: gen.model };
  }

  function taskCounts() {
    var have = {};
    Db.all(CONFIG.SHEETS.QUESTION_BANK).forEach(function (r) { if (r.Status === 'approved' && r.Subtype === 'task') { var k = r.Skill + '|' + r.CEFR; have[k] = (have[k] || 0) + 1; } });
    return have;
  }

  /** How many approved questions exist per skill and level, against the target. */
  function counts() {
    var have = {};
    Db.all(CONFIG.SHEETS.QUESTION_BANK).forEach(function (r) {
      if (r.Status !== 'approved' || !KINDS[r.Skill]) return;
      var k = r.Skill + '|' + r.CEFR + '|' + r.Subtype; have[k] = (have[k] || 0) + 1;
    });
    return have;
  }

  /** The cells of the bank that are furthest from their target, biggest gap first. */
  function gaps() {
    var have = counts(), out = [];
    Object.keys(KINDS).forEach(function (skill) {
      var target = CONFIG.TEST.BANK_TARGET[skill], kinds = KINDS[skill];
      CONFIG.LEVELS.forEach(function (level) {
        kinds.forEach(function (kind) {
          var want = Math.ceil(target / kinds.length), got = have[skill + '|' + level + '|' + kind.sub] || 0;
          if (got < want) out.push({ skill: skill, level: level, kind: kind, missing: want - got, got: got, want: want });
        });
      });
    });
    var cc = Conv.counts(), cw = CONFIG.TEST.CONVERSATION_TARGET || 0;
    CONFIG.LEVELS.forEach(function (level) { var got = cc[level] || 0; if (got < cw) out.push({ skill: 'listening', level: level, kind: { sub: 'conversation' }, missing: cw - got, got: got, want: cw }); });
    var tc = taskCounts();
    TASK_SKILLS.forEach(function (skill) {
      var want = (CONFIG.TEST.TASK_TARGET || {})[skill] || 0;
      CONFIG.LEVELS.forEach(function (level) {
        var got = tc[skill + '|' + level] || 0;
        if (got < want) out.push({ skill: skill, level: level, kind: { sub: 'task' }, missing: want - got, got: got, want: want });
      });
    });
    return out.sort(function (a, b) { return b.missing - a.missing; });
  }

  /** Makes batches until the time budget ends, the bank is full, or the AI stops answering. */
  function run(budgetMs) {
    var start = Date.now(), report = { batches: 0, approved: 0, dropped: 0, stoppedBecause: 'bank is full' };
    while (true) {
      var todo = gaps();
      if (!todo.length) break;
      if (Date.now() - start > budgetMs) { report.stoppedBecause = 'time budget used (run again)'; break; }
      var g = todo[0], count = Math.min(10, Math.max(g.missing + 2, 5));
      try {
        var r = g.kind.sub === 'conversation' ? Conv.make(g.level) : g.kind.sub === 'task' ? makeTasks(g.skill, g.level, count) : makeBatch(g.skill, g.level, g.kind, count);
        if (g.kind.sub === 'task') r.asked = r.asked || 0;
        report.batches++; report.approved += r.approved; report.dropped += r.asked - r.approved;
        if (r.approved === 0 && report.batches > 6 && report.approved === 0) { report.stoppedBecause = 'no question passed the checks; check the models in Config.gs'; break; }
      } catch (e) {
        if (e instanceof AppError) { report.stoppedBecause = e.message; break; }
        throw e;
      }
    }
    report.remainingCells = gaps().length;
    return report;
  }

  /** Plain-text table of the bank for the owner. */
  function report() {
    var have = counts(), lines = [];
    Object.keys(KINDS).forEach(function (skill) {
      var row = CONFIG.LEVELS.map(function (l) { return l + ' ' + KINDS[skill].reduce(function (n, k) { return n + (have[skill + '|' + l + '|' + k.sub] || 0); }, 0); });
      lines.push(skill + ': ' + row.join(', '));
    });
    var tc = taskCounts();
    var ccr = Conv.counts(); lines.push('listening conversations: ' + CONFIG.LEVELS.map(function (l) { return l + ' ' + (ccr[l] || 0); }).join(', '));
    TASK_SKILLS.forEach(function (skill) { lines.push(skill + ' tasks: ' + CONFIG.LEVELS.map(function (l) { return l + ' ' + (tc[skill + '|' + l] || 0); }).join(', ')); });
    return lines.join('\n');
  }

  return { run: run, makeBatch: makeBatch, gaps: gaps, report: report, checkShape: checkShape, KINDS: KINDS, makeTasks: makeTasks, taskCounts: taskCounts };
})();
