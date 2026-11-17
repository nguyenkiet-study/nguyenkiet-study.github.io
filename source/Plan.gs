/**
 * Plan.gs
 * The personal weekly learning plan. One row per learner and week in LearningPlans (Status "active").
 *
 * How the plan is made (no AI is needed for the numbers)
 *  - Each skill gets a share of the weekly minutes. Weaker skills get more; the learner's goals (business, interview, travel...)
 *    nudge the shares. The four skills share 80% of the weekly goal. Words is planned apart: its target is the learner's
 *    daily Words goal (Settings) times seven.
 *  - Targets are shares of the weekly goal the learner set in Settings, rounded to 5 minutes, so changing the goal changes the plan at once.
 *  - The plan is rebuilt for each new week, and again (version + 1) after a new placement test.
 *  - After a placement test the browser asks once for a short coach note, grammar topics and vocabulary themes written by AI
 *    (planEnrich). If the AI is busy the built-in suggestions stay and the browser tries again later.
 *
 * Plan fields in the sheet: PriorityOrder (JSON list of skills, weakest first), WeeklyGoals (JSON: shares, note, basedOn, enriched),
 * Vocabulary (JSON list of themes), Grammar (JSON list of topics).
 */
var Plan = (function () {
  var SKILLS = CONFIG.SKILLS;
  var WORDS_SHARE = 0.2;
  var TILT = {
    business: { writing: 0.10, speaking: 0.05 }, workplace: { speaking: 0.08, writing: 0.07 }, interview: { speaking: 0.15 },
    academic: { reading: 0.10, writing: 0.10 }, daily: { listening: 0.08, speaking: 0.07 }, travel: { listening: 0.10, speaking: 0.05 }
  };
  var THEMES = {
    business: ['Meetings and negotiation', 'Emails and reports'], workplace: ['Working with teammates', 'Deadlines and workload'],
    daily: ['Shopping and services', 'Plans and invitations'], interview: ['Describing your experience', 'Strengths and goals'],
    academic: ['Study and research', 'Describing data'], travel: ['Airports and hotels', 'Directions and transport']
  };
  var GRAMMAR = [
    ['Present simple and continuous', 'Past simple', 'Articles: a, an, the'],
    ['Present perfect and past simple', 'First and second conditionals', 'Modal verbs for advice and requests'],
    ['Passive voice', 'Reported speech', 'Linking words for contrast'],
    ['Mixed conditionals', 'Inversion for emphasis', 'Hedging and softening language']
  ];
  var TITLE = {
    reading: 'Reading practice: a set of short questions', listening: 'Listening practice: short clips with questions',
    writing: 'Writing practice: one short text with feedback', speaking: 'Speaking practice: answer one prompt', words: 'Words: review and new words'
  };

  function goalMinutes(uid) {
    var p = Db.findByKey(CONFIG.SHEETS.USER_PROFILES, 'UserID', uid), w = p ? Number(p.WeeklyGoalMin) : 0;
    return w > 0 ? w : 150;
  }
  function goalsOf(uid) {
    var p = Db.findByKey(CONFIG.SHEETS.USER_PROFILES, 'UserID', uid);
    return p && p.Goals ? String(p.Goals).split(',').filter(Boolean) : [];
  }

  /** { skill: { idx, score, measured } } where score is the level number plus the position inside it. */
  function levelsOf(uid) {
    var out = {};
    Db.filter(CONFIG.SHEETS.SKILL_LEVELS, function (r) { return String(r.UserID) === uid; }).forEach(function (r) {
      var measured = !!r.MeasuredLevel, idx = CONFIG.LEVELS.indexOf(measured ? r.MeasuredLevel : r.SelfLevel);
      if (idx < 0) idx = 2;
      out[r.Skill] = { idx: idx, measured: measured, score: idx + (measured ? (Number(r.ProgressPct) || 0) / 100 : 0.5), level: CONFIG.LEVELS[idx] };
    });
    SKILLS.forEach(function (k) { if (!out[k]) out[k] = { idx: 2, measured: false, score: 2.5, level: 'B1' }; });
    return out;
  }

  function latestResultAt(uid) {
    var best = '';
    Db.filter(CONFIG.SHEETS.ASSESSMENT_RESULTS, function (r) { return String(r.UserID) === uid; }).forEach(function (r) { if (String(r.CreatedAt) > best) best = String(r.CreatedAt); });
    return best;
  }

  function computeShares(levels, goals) {
    var max = Math.max.apply(null, SKILLS.map(function (k) { return levels[k].score; })), w = {}, sum = 0;
    SKILLS.forEach(function (k) {
      var tilt = 0; goals.forEach(function (g) { tilt += (TILT[g] && TILT[g][k]) || 0; });
      w[k] = 1 + (max - levels[k].score) * 0.8 + tilt * 2; sum += w[k];
    });
    var shares = {}; SKILLS.forEach(function (k) { shares[k] = Math.round(w[k] / sum * (1 - WORDS_SHARE) * 1000) / 1000; });
    shares.words = WORDS_SHARE;
    return shares;
  }

  function fallbackTopics(levels, goals) {
    var avg = SKILLS.reduce(function (n, k) { return n + levels[k].idx; }, 0) / SKILLS.length;
    var band = avg < 1.5 ? 0 : avg < 2.5 ? 1 : avg < 3.5 ? 2 : 3;
    var themes = [];
    (goals.length ? goals : ['daily']).forEach(function (g) { (THEMES[g] || []).forEach(function (t) { if (themes.indexOf(t) < 0) themes.push(t); }); });
    return { grammar: GRAMMAR[band].slice(), vocabulary: themes.slice(0, 4) };
  }

  function parse(row) {
    var meta = Util.jparse(row.WeeklyGoals, {});
    return {
      week: Day.norm(row.WeekStart), version: Number(row.Version) || 1, priority: Util.jparse(row.PriorityOrder, SKILLS.slice()),
      shares: meta.shares || {}, note: meta.note || '', basedOn: meta.basedOn || '', enriched: !!meta.enriched,
      vocabulary: Util.jparse(row.Vocabulary, []), grammar: Util.jparse(row.Grammar, [])
    };
  }

  /** The active plan for this week, created (or rebuilt after a new placement test) when needed. */
  function ensure(uid) {
    var week = Day.weekStart(Day.today()), latest = latestResultAt(uid);
    var rows = Db.filter(CONFIG.SHEETS.LEARNING_PLANS, function (r) { return String(r.UserID) === uid; });
    var active = rows.filter(function (r) { return r.Status === 'active'; }).sort(function (a, b) { return (Number(b.Version) || 0) - (Number(a.Version) || 0); })[0];
    if (active) {
      var cur = parse(active);
      if (cur.week === week && cur.basedOn === latest) return cur;
    }
    var levels = levelsOf(uid), goals = goalsOf(uid), prev = active ? parse(active) : null, sameBasis = prev && prev.basedOn === latest;
    var topics = fallbackTopics(levels, goals);
    var made = {
      week: week, version: rows.reduce(function (m, r) { return Math.max(m, Number(r.Version) || 0); }, 0) + 1,
      priority: SKILLS.slice().sort(function (a, b) { return levels[a].score - levels[b].score; }),
      shares: computeShares(levels, goals),
      note: sameBasis ? prev.note : '', basedOn: latest, enriched: sameBasis ? prev.enriched : false,
      vocabulary: sameBasis && prev.enriched ? prev.vocabulary : topics.vocabulary,
      grammar: sameBasis && prev.enriched ? prev.grammar : topics.grammar
    };
    Db.lock(function () {
      Db.filter(CONFIG.SHEETS.LEARNING_PLANS, function (r) { return String(r.UserID) === uid && r.Status === 'active'; })
        .forEach(function (r) { Db.update(CONFIG.SHEETS.LEARNING_PLANS, r._row, { Status: 'replaced' }); });
      Db.insert(CONFIG.SHEETS.LEARNING_PLANS, {
        PlanID: Db.newId('plan'), UserID: uid, Version: made.version, WeekStart: made.week, PriorityOrder: JSON.stringify(made.priority),
        WeeklyGoals: JSON.stringify({ shares: made.shares, note: made.note, basedOn: made.basedOn, enriched: made.enriched }),
        Vocabulary: JSON.stringify(made.vocabulary), Grammar: JSON.stringify(made.grammar), Status: 'active', CreatedAt: Db.now()
      });
    });
    return made;
  }

  /** The plan as the browser shows it, with this week's progress. `prog` may be passed in to save a read. */
  function current(user, prog) {
    var uid = user.UserID, plan = ensure(uid), today = Day.today(), goal = goalMinutes(uid), levels = levelsOf(uid);
    prog = prog || Db.filter(CONFIG.SHEETS.USER_PROGRESS, function (r) { return String(r.UserID) === uid; });
    var done = {}, doneToday = {};
    prog.forEach(function (r) {
      var d = Day.norm(r.Date), m = Number(r.Minutes) || 0;
      if (d >= plan.week && d <= Day.add(plan.week, 6)) done[r.Skill] = (done[r.Skill] || 0) + m;
      if (d === today && m > 0) doneToday[r.Skill] = true;
    });
    var targets = {};
    ['words'].concat(SKILLS).forEach(function (k) { targets[k] = Math.max(5, Math.round(goal * (plan.shares[k] || 0.2) / 5) * 5); });
    var measured = SKILLS.some(function (k) { return levels[k].measured; });
    var ws = Words.summary(user);
    targets.words = ws.goal.minutes * 7;                        // Words has its own daily goal (Settings), counted for the week
    var items = [{ skill: 'words', title: TITLE.words, minutes: ws.minutes, done: ws.goal.doneSec >= ws.goal.minutes * 60, ready: ws.ready, due: ws.due, fresh: ws.fresh }];
    plan.priority.slice().sort(function (a, b) {
      return ((targets[b] - (done[b] || 0)) - (targets[a] - (done[a] || 0))) || (plan.priority.indexOf(a) - plan.priority.indexOf(b));
    }).slice(0, 2).forEach(function (k) {
      items.push({ skill: k, title: TITLE[k], minutes: k === 'writing' ? 12 : 8, done: !!doneToday[k] });
    });
    return {
      week: plan.week, version: plan.version, basis: measured ? 'placement' : 'estimate', priority: plan.priority, goalMinutes: goal,
      enriched: plan.enriched, note: plan.note, vocabulary: plan.vocabulary, grammar: plan.grammar,
      targets: targets, done: done, today: items, words: ws,
      levels: (function () { var o = {}; SKILLS.forEach(function (k) { o[k] = levels[k].level; }); return o; })()
    };
  }

  /** Asks the AI once for a coach note and topics. Safe to call often: it does nothing when done or when called too soon. */
  function enrich(user) {
    var uid = user.UserID, cache = CacheService.getScriptCache(), throttle = 'planenr_' + uid;
    var plan = ensure(uid);
    if (plan.enriched || cache.get(throttle)) return { plan: current(user), changed: false };
    var levels = levelsOf(uid);
    if (!SKILLS.some(function (k) { return levels[k].measured; })) return { plan: current(user), changed: false };
    cache.put(throttle, '1', 600);
    var weak = {};
    Db.filter(CONFIG.SHEETS.ASSESSMENT_RESULTS, function (r) { return String(r.UserID) === uid; })
      .sort(function (a, b) { return String(a.CreatedAt).localeCompare(String(b.CreatedAt)); })
      .forEach(function (r) { weak[r.Skill] = Util.jparse(r.Weaknesses, []); });
    var input = { levels: {}, weaknesses: weak, goals: goalsOf(uid), weakestFirst: plan.priority };
    SKILLS.forEach(function (k) { input.levels[k] = levels[k].level; });
    var res;
    try {
      var list = { type: 'ARRAY', items: { type: 'STRING' } };
      res = AI.generateJson('REPORT_AND_PLAN', {
        system: 'You are a kind, practical English coach. You write for an adult learner who uses English for work and daily life. Reply with JSON only.',
        prompt: 'Make a short study focus for this week from the data below. Return JSON: {"note":"one or two sentences speaking to the learner as you, under 200 characters, naming what to focus on and why",' +
          '"grammar":["3 grammar topics that fit their levels and weak points, each under 45 characters"],"vocabulary":["3 or 4 vocabulary themes that fit their goals, each under 45 characters"]}\n' + JSON.stringify(input),
        schema: { type: 'OBJECT', required: ['note', 'grammar', 'vocabulary'], properties: { note: { type: 'STRING' }, grammar: list, vocabulary: list } }, temperature: 0.4,
        validate: function (d) { return d && d.note && Array.isArray(d.grammar) && d.grammar.length && Array.isArray(d.vocabulary) && d.vocabulary.length ? '' : 'a field is missing'; }
      });
    } catch (e) {
      if (e instanceof AppError) return { plan: current(user), changed: false }; // busy: keep the built-in suggestions, try again later
      throw e;
    }
    var cut = function (a, n, m) { return a.slice(0, n).map(function (x) { return String(x).slice(0, m); }); };
    Db.lock(function () {
      var row = Db.filter(CONFIG.SHEETS.LEARNING_PLANS, function (r) { return String(r.UserID) === uid && r.Status === 'active'; })[0];
      if (!row) return;
      var meta = Util.jparse(row.WeeklyGoals, {}); meta.note = String(res.data.note).slice(0, 220); meta.enriched = true;
      Db.update(CONFIG.SHEETS.LEARNING_PLANS, row._row, { WeeklyGoals: JSON.stringify(meta), Grammar: JSON.stringify(cut(res.data.grammar, 3, 50)), Vocabulary: JSON.stringify(cut(res.data.vocabulary, 4, 50)) });
    });
    return { plan: current(user), changed: true };
  }

  return { current: current, enrich: enrich, levelsOf: levelsOf };
})();
