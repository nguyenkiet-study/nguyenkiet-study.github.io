/**
 * ProgressTracker.gs
 * Records what the learner does, and builds the numbers for the dashboard and the progress page.
 *
 *  - record(): one finished activity (a practice set, a words session...). It adds minutes to the day's row in UserProgress
 *    and writes one row to LearningActivities. Call it inside Db.lock().
 *  - overview(): totals, streak, this week's minutes, a 12-week calendar, level history, milestones, recent activity,
 *    the weekly plan and today's words. The browser asks for it when the dashboard or progress page opens.
 *
 * Streak: the number of days in a row with at least one minute of practice, counted back from today. A day that has not
 * been practised yet does not break the streak until the day is over (counting starts from yesterday then).
 */
var Progress = (function () {
  var SKILLS = CONFIG.SKILLS;

  /**
   * Adds one finished activity. a: { skill, type, title, minutes or seconds, score, lessons, questionIds }. Title may be "Title | detail".
   * With `seconds` the day's time is kept to the second (Words uses it for the daily goal) and the minutes follow from it.
   */
  function record(uid, a) {
    var day = Day.today(), now = Db.now(), lessons = Number(a.lessons) || 0;
    var secs = a.seconds !== undefined ? Math.max(0, Math.round(Number(a.seconds) || 0)) : Math.round((Number(a.minutes) || 0) * 60);
    var minutes = a.seconds !== undefined ? Math.max(secs ? 1 : 0, Math.round(secs / 60)) : (Number(a.minutes) || 0);
    if (minutes || lessons) {
      var row = Db.find(CONFIG.SHEETS.USER_PROGRESS, function (r) { return String(r.UserID) === uid && Day.norm(r.Date) === day && r.Skill === a.skill; });
      if (row) {
        var total = (Number(row.Seconds) || (Number(row.Minutes) || 0) * 60) + secs;
        Db.update(CONFIG.SHEETS.USER_PROGRESS, row._row, {
          Minutes: a.seconds !== undefined ? Math.max(1, Math.round(total / 60)) : (Number(row.Minutes) || 0) + minutes,
          LessonsCompleted: (Number(row.LessonsCompleted) || 0) + lessons, Seconds: total,
          Score: a.score === undefined ? row.Score : a.score
        });
      } else {
        Db.insert(CONFIG.SHEETS.USER_PROGRESS, { UserID: uid, Date: day, Skill: a.skill, Minutes: minutes, LessonsCompleted: lessons, Score: a.score === undefined ? '' : a.score, Seconds: secs });
      }
    }
    Db.insert(CONFIG.SHEETS.LEARNING_ACTIVITIES, {
      ActivityID: Db.newId('act'), UserID: uid, PlanID: '', Skill: a.skill, Type: a.type || 'practice', Title: a.title || '',
      QuestionIDs: a.questionIds ? JSON.stringify(a.questionIds) : '', DueDate: day, Status: 'completed', Score: a.score === undefined ? '' : a.score,
      DurationMin: minutes, CompletedAt: now
    });
  }

  /** Remembers a new ability estimate, so the level history can be drawn. Call inside Db.lock(). */
  function trace(uid, skill, theta) {
    Db.insert(CONFIG.SHEETS.ACTIVITY_LOGS, {
      LogID: Db.newId('log'), UserID: uid, Event: 'skill_update', Detail: JSON.stringify({ skill: skill, theta: Math.round(theta * 1000) / 1000 }), CreatedAt: Db.now()
    });
  }

  function relative(day, today) {
    var n = Day.diff(day, today);
    return n <= 0 ? 'Today' : n === 1 ? 'Yesterday' : n < 7 ? n + ' days ago' : n < 14 ? 'Last week' : n < 60 ? Math.floor(n / 7) + ' weeks ago' : day;
  }

  function streakOf(byDay, today) {
    var d = byDay[today] > 0 ? today : Day.add(today, -1), n = 0;
    while (byDay[d] > 0) { n++; d = Day.add(d, -1); }
    return n;
  }
  function longestStreak(byDay) {
    var days = Object.keys(byDay).filter(function (d) { return byDay[d] > 0; }).sort(), best = 0, run = 0, prev = '';
    days.forEach(function (d) { run = prev && Day.diff(prev, d) === 1 ? run + 1 : 1; if (run > best) best = run; prev = d; });
    return best;
  }

  function scoreOf(theta) { var l = Engine.levelFromTheta(theta); return CONFIG.LEVELS.indexOf(l) + Engine.progressPct(theta) / 100; }

  /** Level history: for each skill, 8 weekly values (level number + position), or null before the first measurement. */
  function history(uid, today) {
    var events = {};
    SKILLS.forEach(function (k) { events[k] = []; });
    Db.filter(CONFIG.SHEETS.ASSESSMENT_RESULTS, function (r) { return String(r.UserID) === uid; }).forEach(function (r) {
      if (events[r.Skill] && isFinite(Number(r.Theta))) events[r.Skill].push({ at: String(r.CreatedAt), theta: Number(r.Theta) });
    });
    Db.filter(CONFIG.SHEETS.ACTIVITY_LOGS, function (r) { return String(r.UserID) === uid && r.Event === 'skill_update'; }).forEach(function (r) {
      var d = Util.jparse(r.Detail, null);
      if (d && events[d.skill] && isFinite(Number(d.theta))) events[d.skill].push({ at: String(r.CreatedAt), theta: Number(d.theta) });
    });
    var thisWeek = Day.weekStart(today), out = {}, weeks = [];
    for (var i = 7; i >= 0; i--) weeks.push(Day.add(thisWeek, -7 * i));
    SKILLS.forEach(function (k) {
      var ev = events[k].sort(function (a, b) { return a.at.localeCompare(b.at); });
      out[k] = weeks.map(function (w) {
        var end = Day.add(w, 6), last = null;
        ev.forEach(function (e) { if (Day.ofIso(e.at) <= end) last = e; });
        return last ? Math.round(scoreOf(last.theta) * 100) / 100 : null;
      });
    });
    return { values: out, events: events };
  }

  function milestones(hist, longest, lessons, known) {
    var list = [];
    SKILLS.forEach(function (k) {
      var prevIdx = -1;
      hist.events[k].sort(function (a, b) { return a.at.localeCompare(b.at); }).forEach(function (e) {
        var idx = CONFIG.LEVELS.indexOf(Engine.levelFromTheta(e.theta));
        if (prevIdx > -1 && idx > prevIdx) list.push({ at: e.at, title: k.charAt(0).toUpperCase() + k.slice(1) + ' reached ' + CONFIG.LEVELS[idx], meta: Day.ofIso(e.at) });
        prevIdx = idx;
      });
    });
    list.sort(function (a, b) { return b.at.localeCompare(a.at); });
    var out = list.map(function (m) { return { title: m.title, meta: m.meta }; });
    [30, 14, 7, 3].forEach(function (n) { if (longest >= n) out.push({ title: n + '-day streak', meta: 'Reached' }); });
    [100, 50, 25, 10].forEach(function (n) { if (lessons >= n) out.push({ title: n + ' lessons completed', meta: 'Reached' }); });
    [1000, 500, 250, 100, 25].forEach(function (n) { if (known >= n) out.push({ title: n + ' words known', meta: 'Reached' }); });
    return out.slice(0, 8);
  }

  function overview(user) {
    var uid = user.UserID, today = Day.today();
    var prog = Db.filter(CONFIG.SHEETS.USER_PROGRESS, function (r) { return String(r.UserID) === uid; });
    var byDay = {}, minutes = 0, lessons = 0;
    prog.forEach(function (r) { var d = Day.norm(r.Date), m = Number(r.Minutes) || 0; byDay[d] = (byDay[d] || 0) + m; minutes += m; lessons += Number(r.LessonsCompleted) || 0; });

    var wk = Day.weekStart(today), weekly = [];
    for (var i = 0; i < 7; i++) weekly.push(byDay[Day.add(wk, i)] || 0);
    var heat = [], start = Day.add(wk, -77);
    for (var j = 0; j < 84; j++) { var d = Day.add(start, j); heat.push(d > today ? 0 : (byDay[d] || 0)); }

    var recent = [];
    Db.filter(CONFIG.SHEETS.LEARNING_ACTIVITIES, function (r) { return String(r.UserID) === uid && r.Status === 'completed'; }).forEach(function (r) {
      var parts = String(r.Title).split(' | '), min = Number(r.DurationMin) || 0;
      recent.push({ at: String(r.CompletedAt), skill: r.Skill, title: parts[0], meta: (parts[1] ? parts[1] + (min ? ', ' : '') : '') + (min ? min + ' min' : ''), when: relative(Day.ofIso(r.CompletedAt), today) });
    });
    Db.filter(CONFIG.SHEETS.ACTIVITY_LOGS, function (r) { return String(r.UserID) === uid && r.Event === 'placement_done'; }).forEach(function (r) {
      recent.push({ at: String(r.CreatedAt), skill: 'reading', title: 'Placement test', meta: r.Detail ? 'Estimated level ' + r.Detail : 'Completed', when: relative(Day.ofIso(r.CreatedAt), today) });
    });
    recent.sort(function (a, b) { return b.at.localeCompare(a.at); });
    recent = recent.slice(0, 8).map(function (r) { return { skill: r.skill, title: r.title, meta: r.meta, when: r.when }; });

    var plan = Plan.current(user, prog), hist = history(uid, today), longest = longestStreak(byDay);
    return {
      totals: { hours: Math.round(minutes / 6) / 10, lessons: lessons, streak: streakOf(byDay, today) },
      weekly: weekly, heat: heat, recent: recent, history: hist.values,
      milestones: milestones(hist, longest, lessons, plan.words.known || 0),
      plan: plan, today: today, grammar: Grammar.summary(user), stats: stats(uid, prog, byDay, today, longest, plan.goalMinutes)
    };
  }

  /**
   * The numbers behind the My progress page.
   *  - weeks: the last 4 weeks (oldest first, this week last): minutes and days practised, against the weekly goal
   *  - month / prev: minutes and active days in the last 30 days and the 30 days before
   *  - bySkill: for each area (four skills, words, grammar): minutes in the last 30 days and the 30 before, sessions,
   *    average score of the scored sessions (0-100, null when none) and days since it was last practised (null = never)
   */
  var AREAS = SKILLS.concat(['words', 'grammar']);
  function stats(uid, prog, byDay, today, longest, goal) {
    var from30 = Day.add(today, -29), from60 = Day.add(today, -59), bySkill = {};
    AREAS.forEach(function (k) { bySkill[k] = { min: 0, prev: 0, sessions: 0, acc: null, last: null }; });
    prog.forEach(function (r) {
      var b = bySkill[r.Skill], d = Day.norm(r.Date), m = Number(r.Minutes) || 0; if (!b || d > today) return;
      if (d >= from30) b.min += m; else if (d >= from60) b.prev += m;
      if (m > 0) { var ago = Day.diff(d, today); if (b.last === null || ago < b.last) b.last = ago; }
    });
    var sum = {}, cnt = {};
    Db.filter(CONFIG.SHEETS.LEARNING_ACTIVITIES, function (r) { return String(r.UserID) === uid && r.Status === 'completed'; }).forEach(function (r) {
      var b = bySkill[r.Skill], d = Day.ofIso(r.CompletedAt); if (!b || d < from30 || d > today) return;
      b.sessions++;
      if (r.Score !== '' && r.Score !== null && isFinite(Number(r.Score))) { sum[r.Skill] = (sum[r.Skill] || 0) + Number(r.Score); cnt[r.Skill] = (cnt[r.Skill] || 0) + 1; }
    });
    AREAS.forEach(function (k) { if (cnt[k]) bySkill[k].acc = Math.round(sum[k] / cnt[k]); });
    function span(a, b) {
      var min = 0, days = 0;
      for (var d = a; d <= b && d <= today; d = Day.add(d, 1)) { var m = byDay[d] || 0; min += m; if (m > 0) days++; }
      return { min: min, days: days };
    }
    var wk = Day.weekStart(today), weeks = [];
    for (var i = 3; i >= 0; i--) { var st = Day.add(wk, -7 * i), w = span(st, Day.add(st, 6)); weeks.push({ start: st, min: w.min, days: w.days }); }
    return {
      goal: goal, best: longest, weeks: weeks, month: span(from30, today), prev: span(from60, Day.add(from30, -1)),
      bySkill: bySkill, weekday: Day.weekday(today)
    };
  }

  return { record: record, trace: trace, overview: overview };
})();
