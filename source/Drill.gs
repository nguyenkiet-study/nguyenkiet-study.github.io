/**
 * Drill.gs - short practice sets built from one shared set of exercise kinds.
 *
 * The same kinds work for every skill; each skill gets the ones that fit it:
 *   tiles    build an English sentence from word tiles (Vietnamese given)        Writing, Grammar, Words, Mix
 *   write    write the English sentence yourself (the AI checks a different one) Writing, Mix
 *   gap      fill the blank in a sentence, then see why                           Reading, Grammar, Mix
 *   listen   hear a sentence, build it from tiles                                 Listening, Mix
 *   repeat   hear a sentence, say it into the microphone                          Speaking, Mix
 *   meaning  read a meaning, choose the word                                      Words, Mix
 *   spell    hear a word, type it                                                 Words, Listening, Mix
 *
 * Content comes from what Kelvin already has, near the learner's level: the lines of the hand-written conversations
 * (English with Vietnamese), the grammar lessons (examples, translation items and gap questions), and the learner's
 * own words. No AI call is needed to build a set.
 *
 * Modes: mix (Daily mix on Home), listen, speak, translate, gap, words.
 */
var Drill = (function () {
  var MODES = {
    mix:       { title: 'Daily mix', skill: 'mix', plan: ['meaning', 'gap', 'tiles', 'listen', 'repeat', 'spell', 'gap', 'listen', 'write', 'meaning', 'tiles', 'repeat'] },
    listen:    { title: 'Listen and build', skill: 'listening', plan: ['listen', 'listen', 'spell', 'listen', 'listen', 'spell', 'listen', 'listen'] },
    speak:     { title: 'Repeat after Kel', skill: 'speaking', plan: ['repeat', 'repeat', 'repeat', 'repeat', 'repeat', 'repeat', 'repeat', 'repeat'] },
    translate: { title: 'Translate sentences', skill: 'writing', plan: ['tiles', 'tiles', 'write', 'tiles', 'write', 'write', 'tiles', 'write'] },
    gap:       { title: 'Fill the gap', skill: 'reading', plan: ['gap', 'gap', 'gap', 'gap', 'gap', 'gap', 'gap', 'gap'] },
    words:     { title: 'Practise your words', skill: 'words', plan: ['meaning', 'spell', 'meaning', 'spell', 'meaning', 'spell', 'meaning', 'spell'] }
  };
  var SKILL_OF = { tiles: 'writing', write: 'writing', gap: 'reading', listen: 'listening', repeat: 'speaking', meaning: 'words', spell: 'words' };
  var LV = CONFIG.LEVELS;

  function words(t) { return String(t).split(/\s+/).filter(Boolean).length; }
  function lvIdx(l) { var i = LV.indexOf(String(l)); return i < 0 ? 2 : i; }
  function shuffle(a, seed) { return a.map(function (x, i) { return { x: x, k: Util.hash01(seed + '|' + i + '|' + JSON.stringify(x).slice(0, 40)) }; }).sort(function (p, q) { return p.k - q.k; }).map(function (p) { return p.x; }); }

  /* ---------- the content pools (built once per run of the script) ---------- */
  var POOL = null;
  function pools() {
    if (POOL) return POOL;
    var sent = [], trans = [], gaps = [];
    var conv = (typeof CONV_SEED !== 'undefined' ? CONV_SEED : []).concat(Conv.SEED || []);
    conv.forEach(function (c) {
      var li = lvIdx(c.level), maxW = li >= 4 ? 16 : li >= 3 ? 14 : 12;
      c.lines.forEach(function (l) {
        var n = words(l.t);
        if (n >= 4 && n <= maxW && l.vi && !/[;:]/.test(l.t)) sent.push({ en: l.t, vi: l.vi, lv: li, src: 'conv' });
      });
    });
    var topicLv = {}; Grammar.TOPICS.forEach(function (t) { topicLv[t[0]] = lvIdx(t[1]); });
    GrammarSeed.ids().forEach(function (id) {
      var g = GrammarSeed.get(id), li = topicLv[id] === undefined ? 2 : topicLv[id];
      g.examples.forEach(function (e) { if (e.en && e.vi && words(e.en) >= 3 && words(e.en) <= 14) sent.push({ en: e.en, vi: e.vi, lv: li, src: 'grammar', topic: id }); });
      g.write.forEach(function (w) { if (w.type === 'translate' && w.answers.length) trans.push({ vi: w.prompt, answers: w.answers, lv: li, topic: id, why: w.why }); });
      g.warm.forEach(function (w) { if (/_{2,}/.test(w.sentence) && w.options.length >= 3) gaps.push({ q: w.sentence, options: w.options.slice(0, 4), why: w.why, lv: li, topic: id }); });
    });
    // a sentence with its translation can also be a translation item
    sent.forEach(function (x) { if (x.src === 'conv' && words(x.en) <= 12) trans.push({ vi: x.vi, answers: [x.en], lv: x.lv }); });
    POOL = { sent: sent, trans: trans, gaps: gaps };
    return POOL;
  }
  /** Items near level idx: same level first, then one below, then one above. */
  function near(list, idx, n, seed, used) {
    var out = [], tiers = [[idx], [idx - 1], [idx + 1], [idx - 2, idx + 2]];
    tiers.forEach(function (lvls) {
      if (out.length >= n) return;
      shuffle(list.filter(function (x) { return lvls.indexOf(x.lv) > -1 && !used[x.vi || x.en || x.q]; }), seed + lvls.join()).forEach(function (x) {
        if (out.length < n) { out.push(x); used[x.vi || x.en || x.q] = 1; }
      });
    });
    return out;
  }

  /* ---------- the learner's words ---------- */
  function myWords(user) {
    var out = [], seen = {};
    ['due', 'learning'].forEach(function (f) {
      try { (Words.list(user, { filter: f, page: 0 }).items || []).forEach(function (w) { if (!seen[w.id] && w.w && w.def) { seen[w.id] = 1; out.push(w); } }); } catch (e) {}
    });
    if (out.length < 4) {
      try { (Words.list(user, { filter: 'new', page: 0 }).items || []).forEach(function (w) { if (!seen[w.id] && w.w && w.def) { seen[w.id] = 1; out.push(w); } }); } catch (e2) {}
    }
    return out;
  }

  /** api: drillStart {mode} -> {mode, title, skill, steps:[...]} */
  function start(user, p) {
    var mode = MODES[p && p.mode] ? p.mode : 'mix', M = MODES[mode], uid = user.UserID;
    var lv = Plan.levelsOf(uid), seed = uid + '|' + Day.today() + '|' + mode + '|' + (mode === 'mix' ? '' : Math.random());
    var idxOf = function (kind) { var s = lv[SKILL_OF[kind]] || lv.reading || { idx: 2 }; return s.idx; };
    var P = pools(), used = {}, mine = (M.plan.indexOf('meaning') > -1 || M.plan.indexOf('spell') > -1) ? shuffle(myWords(user), seed) : [], wi = 0;
    var steps = [];
    M.plan.forEach(function (kind, k) {
      var idx = idxOf(kind), it;
      if (kind === 'tiles' || kind === 'write') {
        it = near(P.trans, idx, 1, seed + k, used)[0]; if (!it) return;
        steps.push({ t: kind, vi: it.vi, answers: it.answers, topic: it.topic || '', why: it.why || null });
      } else if (kind === 'listen' || kind === 'repeat') {
        it = near(P.sent, kind === 'repeat' ? Math.max(0, idx - 1) : idx, 1, seed + k, used)[0]; if (!it) return;
        steps.push({ t: kind, en: it.en, vi: it.vi });
      } else if (kind === 'gap') {
        it = near(P.gaps, idx, 1, seed + k, used)[0]; if (!it) return;
        steps.push({ t: 'gap', q: it.q, options: it.options, answer: 0, why: it.why, topic: it.topic });
      } else if (kind === 'meaning' || kind === 'spell') {
        var w = mine[wi++]; if (!w) return;
        if (kind === 'meaning') {
          var others = mine.filter(function (x) { return x.id !== w.id; }).slice(0, 6).map(function (x) { return x.w; });
          if (others.length < 2) { var nn = near(P.sent, idx, 6, seed + 'w' + k, {}); nn.forEach(function (x) { var c = x.en.split(/\s+/).filter(function (y) { return y.length >= 5 && /^[a-z]+$/.test(y); })[0]; if (c && others.indexOf(c) < 0) others.push(c); }); }
          var opts = [w.w].concat(shuffle(others, seed + w.id).slice(0, 2));
          if (opts.length < 3) return;
          steps.push({ t: 'meaning', id: w.id, def: w.def, vi: w.vi || '', pos: w.pos || '', options: opts, answer: 0 });
        } else steps.push({ t: 'spell', id: w.id, w: w.w, def: w.def, vi: w.vi || '' });
      }
    });
    // too few words for a word step: fill with sentence steps, so a set is never short
    while (steps.length < Math.min(8, M.plan.length)) {
      var extra = near(P.sent, (lv.listening || { idx: 2 }).idx, 1, seed + 'x' + steps.length, used)[0]; if (!extra) break;
      steps.push({ t: mode === 'speak' ? 'repeat' : 'listen', en: extra.en, vi: extra.vi });
    }
    if (!steps.length) throw new AppError('There is nothing to practise yet. Try again later.');
    return { mode: mode, title: M.title, skill: M.skill, steps: steps };
  }

  /** api: drillFinish {mode, right, total, seconds, kinds:{kind:n}} - counts the time toward each skill that was used. */
  function finish(user, p) {
    var mode = MODES[p && p.mode] ? p.mode : 'mix', M = MODES[mode];
    var total = Math.max(0, Math.min(40, Math.round(Number(p.total) || 0))), right = Math.max(0, Math.min(total, Math.round(Number(p.right) || 0)));
    var secs = Math.max(0, Math.min(3600, Math.round(Number(p.seconds) || 0)));
    if (!total) return { saved: false };
    var score = Math.round(right / total * 100), kinds = p.kinds && typeof p.kinds === 'object' ? p.kinds : {}, bySkill = {}, n = 0;
    Object.keys(kinds).forEach(function (k) { var s = SKILL_OF[k]; var c = Math.max(0, Math.round(Number(kinds[k]) || 0)); if (s && c) { bySkill[s] = (bySkill[s] || 0) + c; n += c; } });
    if (!n) { bySkill[M.skill === 'mix' ? 'reading' : M.skill] = 1; n = 1; }
    Db.lock(function () {
      Object.keys(bySkill).forEach(function (s, i) {
        Progress.record(user.UserID, { skill: s, type: 'drill', title: M.title + ' | ' + right + ' of ' + total + ' right', seconds: Math.round(secs * bySkill[s] / n), score: score, lessons: i === 0 ? 1 : 0 });
      });
    });
    return { saved: true, score: score, right: right, total: total };
  }

  return { start: start, finish: finish, MODES: MODES };
})();
