/**
 * History.gs
 * What the learner has studied, to look back at later.
 *
 *  - Every finished session already writes one LearningActivities row (title, skill, score, minutes). That gives the list.
 *  - Since this update, each module also sends the session's questions and answers when it finishes (historySave).
 *    They are kept in the History sheet, so a session can be opened again with every question, your answer,
 *    the right answer and the explanation.
 *  - Older sessions (before this update) appear in the list without details.
 */
var History = (function () {
  var S = CONFIG.SHEETS, H = CONFIG.HISTORY;
  var KINDS = ['speaking', 'listening', 'reading', 'writing', 'words', 'grammar', 'flashcards', 'learn', 'match', 'test', 'placement'];
  var SKILL_OF = { flashcards: 'words', learn: 'words', match: 'words', test: 'words', placement: 'placement' };
  function clean(s, n) { return String(s == null ? '' : s).replace(/[ \t]+/g, ' ').trim().slice(0, n || 300); }
  function skillOf(kind) { return SKILL_OF[kind] || kind; }

  /** api: historySave {kind, title, score, total, right, minutes, items:[{q, a, r, ok, why, ctx}]} */
  function save(user, p) {
    var kind = String(p && p.kind || '');
    if (KINDS.indexOf(kind) < 0) throw new AppError('Unknown kind of session.', 'invalid');
    var items = (Array.isArray(p.items) ? p.items : []).slice(0, H.MAX_ITEMS).map(function (x) {
      return { q: clean(x && x.q, 600), a: clean(x && x.a, 1500), r: clean(x && x.r, 1500), ok: x && x.ok === true ? true : x && x.ok === false ? false : null, why: clean(x && x.why, 500), ctx: clean(x && x.ctx, 900) };
    }).filter(function (x) { return x.q || x.a; });
    var js = JSON.stringify(items);
    while (js.length > H.MAX_JSON && items.length) { items.pop(); js = JSON.stringify(items); }   // one sheet cell holds 50,000 characters
    var right = Util.clamp(Math.round(Number(p.right) || 0), 0, 500), total = Util.clamp(Math.round(Number(p.total) || 0), 0, 500);
    var row = {
      HistoryID: Db.newId('his'), UserID: user.UserID, Kind: kind, Skill: skillOf(kind), Title: clean(p.title, 160) || kind,
      Score: p.score === undefined || p.score === null ? (total ? Math.round(right / total * 100) : '') : clean(p.score, 40),
      Right: total ? right : '', Total: total || '', Minutes: Util.clamp(Math.round(Number(p.minutes) || 0), 0, 600),
      ItemsJSON: js, CreatedAt: Db.now()
    };
    Db.lock(function () { Db.insert(S.HISTORY, row); });
    return { id: row.HistoryID };
  }

  function pub(r, detail) {
    return { id: r.HistoryID, kind: r.Kind, skill: r.Skill, title: r.Title, score: r.Score === '' ? null : r.Score, right: r.Right === '' ? null : Number(r.Right), total: r.Total === '' ? null : Number(r.Total),
      minutes: Number(r.Minutes) || 0, at: String(r.CreatedAt), day: Day.ofIso(r.CreatedAt), detail: !!detail, n: detail ? (Util.jparse(r.ItemsJSON, []) || []).length : 0 };
  }

  /** api: historyList {skill?, before?} - newest first, a page at a time. */
  function list(user, p) {
    var uid = user.UserID, want = String(p && p.skill || 'all'), before = String(p && p.before || '');
    var mine = Db.filter(S.HISTORY, function (r) { return String(r.UserID) === uid; });
    var out = mine.map(function (r) { return pub(r, true); });
    var ms = function (iso) { var t = Date.parse(iso); return isFinite(t) ? t : 0; };
    // finished sessions without details: older activities (and any module that did not send details)
    Db.filter(S.LEARNING_ACTIVITIES, function (r) { return String(r.UserID) === uid && r.Status === 'completed'; }).forEach(function (a) {
      var t = ms(a.CompletedAt), sk = String(a.Skill || '');
      var covered = mine.some(function (h) { return (h.Skill === sk || (sk === 'reading' && h.Skill === 'placement')) && Math.abs(ms(h.CreatedAt) - t) < H.MATCH_MS; });
      if (covered) return;
      var parts = String(a.Title || '').split(' | ');
      out.push({ id: 'act:' + a.ActivityID, kind: sk, skill: sk, title: parts[0] || sk, note: parts[1] || '', score: a.Score === '' ? null : a.Score, right: null, total: null,
        minutes: Number(a.DurationMin) || 0, at: String(a.CompletedAt), day: Day.ofIso(a.CompletedAt), detail: false, n: 0 });
    });
    Db.filter(S.ACTIVITY_LOGS, function (r) { return String(r.UserID) === uid && r.Event === 'placement_done'; }).forEach(function (r) {
      var t = ms(r.CreatedAt);
      if (mine.some(function (h) { return h.Kind === 'placement' && Math.abs(ms(h.CreatedAt) - t) < H.MATCH_MS; })) return;
      out.push({ id: 'log:' + (r.LogID || t), kind: 'placement', skill: 'placement', title: 'Placement test', note: r.Detail ? 'Estimated level ' + r.Detail : '', score: null, right: null, total: null,
        minutes: 0, at: String(r.CreatedAt), day: Day.ofIso(r.CreatedAt), detail: false, n: 0 });
    });
    if (want !== 'all') out = out.filter(function (x) { return x.skill === want || (want === 'words' && SKILL_OF[x.kind] === 'words'); });
    out.sort(function (a, b) { return ms(b.at) - ms(a.at); });
    if (before) out = out.filter(function (x) { return ms(x.at) < ms(before); });
    var page = out.slice(0, H.PAGE);
    return { items: page, more: out.length > page.length, next: page.length ? page[page.length - 1].at : '' };
  }

  /** api: historyGet {id} - one session with its questions and answers. */
  function get(user, p) {
    var id = String(p && p.id || '');
    var r = Db.find(S.HISTORY, function (x) { return x.HistoryID === id && String(x.UserID) === user.UserID; });
    if (!r) throw new AppError('That session was not found.', 'invalid');
    var o = pub(r, true); o.items = Util.jparse(r.ItemsJSON, []) || [];
    return o;
  }

  return { save: save, list: list, get: get, KINDS: KINDS };
})();
