/**
 * UserProfile.gs
 * The learner's profile: onboarding answers, goals and settings.
 * Called only through apiCall() in Api.gs, always with an authenticated user row.
 */
var Profile = (function () {
  function isTrue(v) { return v === true || String(v).toLowerCase() === 'true'; }
  function validLevel(l) { return CONFIG.LEVELS.indexOf(l) > -1; }
  function cleanGoals(goals) {
    if (!Array.isArray(goals) || goals.length > 12) throw new AppError('Choose up to 12 goals.');
    return goals.map(function (g) {
      g = String(g);
      if (!/^[a-z_]{2,30}$/.test(g)) throw new AppError('One of the goals is not valid.');
      return g;
    });
  }

  function log(userId, event, detail) {
    Db.insert(CONFIG.SHEETS.ACTIVITY_LOGS, { LogID: Db.newId('log'), UserID: userId, Event: event, Detail: detail || '', CreatedAt: Db.now() });
  }

  /** Everything the browser needs right after sign-in or when it reopens with a saved token. */
  function bootstrap(userRow, token) {
    var uid = userRow.UserID;
    var prof = Db.findByKey(CONFIG.SHEETS.USER_PROFILES, 'UserID', uid) || {};
    var self = {}, skills = {};
    // Latest result per skill: the report texts come from AssessmentResults.
    var latest = {};
    Db.filter(CONFIG.SHEETS.ASSESSMENT_RESULTS, function (r) { return String(r.UserID) === uid; }).forEach(function (r) {
      if (!latest[r.Skill] || String(r.CreatedAt) > String(latest[r.Skill].CreatedAt)) latest[r.Skill] = r;
    });
    var list = function (s) { try { var a = JSON.parse(s); return Array.isArray(a) ? a : []; } catch (e) { return []; } };
    Db.filter(CONFIG.SHEETS.SKILL_LEVELS, function (r) { return String(r.UserID) === uid; }).forEach(function (r) {
      if (r.SelfLevel) self[r.Skill] = r.SelfLevel;
      if (r.MeasuredLevel) {
        var res = latest[r.Skill];
        skills[r.Skill] = { level: r.MeasuredLevel, progress: Number(r.ProgressPct) || 0, measured: true, conf: r.Confidence || 'Medium',
          strengths: res ? list(res.Strengths) : [], weaknesses: res ? list(res.Weaknesses) : [], next: res ? list(res.Recommendations) : [] };
      }
    });
    var weekly = Number(prof.WeeklyGoalMin), V = CONFIG.VOCAB, wordsGoal = Math.round(Number(prof.WordsGoalMin));
    return {
      token: token,
      user: Auth.publicUser(userRow),
      onboarded: isTrue(prof.OnboardingDone),
      hasTest: isTrue(prof.PlacementDone),
      self: self,
      skills: skills,
      goals: prof.Goals ? String(prof.Goals).split(',').filter(Boolean) : [],
      settings: {
        weeklyGoal: weekly > 0 ? weekly : 150,
        accent: prof.VoiceAccent === 'uk' ? 'uk' : 'us',
        reminder: prof.ReminderOn === '' || prof.ReminderOn === undefined ? true : isTrue(prof.ReminderOn),
        reduceMotion: isTrue(prof.ReduceMotion),
        wordsGoal: wordsGoal >= V.GOAL_MIN && wordsGoal <= V.GOAL_MAX ? wordsGoal : V.GOAL_MINUTES,
        wordsRound: V.ROUND_SIZES.indexOf(Number(prof.WordsRound)) > -1 ? Number(prof.WordsRound) : V.ROUND_DEFAULT,
        wordsAuto: !(prof.WordsAuto === false || String(prof.WordsAuto).toLowerCase() === 'false')
      }
    };
  }

  function saveOnboarding(user, p) {
    if (!validLevel(p.overall)) throw new AppError('Choose your overall level.');
    var goals = cleanGoals(p.goals);
    if (!goals.length) throw new AppError('Choose at least one goal.');
    var skills = p.skills && typeof p.skills === 'object' ? p.skills : {};
    var now = Db.now();
    Db.lock(function () {
      CONFIG.SKILLS.forEach(function (k) {
        var lv = validLevel(skills[k]) ? skills[k] : p.overall;
        Db.upsert(CONFIG.SHEETS.SKILL_LEVELS, { UserID: user.UserID, Skill: k }, { SelfLevel: lv, UpdatedAt: now });
      });
      Db.upsert(CONFIG.SHEETS.USER_PROFILES, { UserID: user.UserID }, { OnboardingDone: true, OverallSelfLevel: p.overall, Goals: goals.join(','), UpdatedAt: now });
      log(user.UserID, 'onboarding_done', p.overall);
    });
    return { saved: true };
  }

  function saveGoals(user, p) {
    var goals = cleanGoals(p.goals);
    Db.lock(function () { Db.upsert(CONFIG.SHEETS.USER_PROFILES, { UserID: user.UserID }, { Goals: goals.join(','), UpdatedAt: Db.now() }); });
    return { saved: true };
  }

  function saveSettings(user, p) {
    var patch = { UpdatedAt: Db.now() };
    if (p.weeklyGoal !== undefined) {
      var w = Math.round(Number(p.weeklyGoal));
      if (!(w >= 30 && w <= 1000)) throw new AppError('Weekly goal must be between 30 and 1000 minutes.');
      patch.WeeklyGoalMin = w;
    }
    if (p.accent !== undefined) {
      if (p.accent !== 'us' && p.accent !== 'uk') throw new AppError('Choose a voice.');
      patch.VoiceAccent = p.accent;
    }
    if (p.reminder !== undefined) patch.ReminderOn = !!p.reminder;
    if (p.reduceMotion !== undefined) patch.ReduceMotion = !!p.reduceMotion;
    var V = CONFIG.VOCAB;
    if (p.wordsGoal !== undefined) {
      var g = Math.round(Number(p.wordsGoal));
      if (!(g >= V.GOAL_MIN && g <= V.GOAL_MAX)) throw new AppError('The Words goal must be between ' + V.GOAL_MIN + ' and ' + V.GOAL_MAX + ' minutes a day.');
      patch.WordsGoalMin = g;
    }
    if (p.wordsRound !== undefined && V.ROUND_SIZES.indexOf(Number(p.wordsRound)) > -1) patch.WordsRound = Number(p.wordsRound);
    if (p.wordsAuto !== undefined) patch.WordsAuto = !!p.wordsAuto;
    Db.lock(function () { Db.upsert(CONFIG.SHEETS.USER_PROFILES, { UserID: user.UserID }, patch); });
    return { saved: true };
  }

  return { bootstrap: bootstrap, saveOnboarding: saveOnboarding, saveGoals: saveGoals, saveSettings: saveSettings };
})();
