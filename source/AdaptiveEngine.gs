/**
 * AdaptiveEngine.gs
 * Estimates a learner's ability from multiple-choice answers and picks the next question.
 * Pure calculation: no sheets, no AI, no randomness unless a random function is passed in.
 *
 * Method
 *  - Ability (theta) lives on a scale where each CEFR level has a centre (CONFIG.TEST.LEVEL_THETA).
 *  - The estimate is a probability distribution over 71 ability values (a grid from -3.5 to 3.5).
 *    It starts as a wide bell curve around the learner's own estimate.
 *  - After each answer the distribution is multiplied by the chance of that answer at each ability value
 *    (a one-parameter logistic model with a guessing floor of 25 percent for four options).
 *  - Ability = the mean of the distribution. Standard error (SE) = its spread.
 *  - Next question = the unused one that tells us most at the current estimate (Fisher information),
 *    with a small penalty for repeating the same question type.
 *  - Misfit (right on hard items but wrong on easy ones) lowers the confidence rating.
 * A learner state is plain data (see newState) and can be saved as JSON between requests.
 */
var Engine = (function () {
  var GRID_N = 71, LO = -3.5, HI = 3.5, STEP = (HI - LO) / (GRID_N - 1);

  function grid(i) { return LO + i * STEP; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function round(v, d) { var m = Math.pow(10, d); return Math.round(v * m) / m; }
  function levelIndex(level) { var i = CONFIG.LEVELS.indexOf(level); return i < 0 ? 2 : i; }

  /** Difficulty of a question on the ability scale: its level's centre, nudged by its 0-100 score. */
  function itemTheta(level, difficultyScore) {
    var d = Number(difficultyScore);
    if (!isFinite(d)) d = 50;
    return CONFIG.TEST.LEVEL_THETA[levelIndex(level)] + (clamp(d, 0, 100) - 50) / 100;
  }

  /** Chance of a correct answer at ability theta for an item of difficulty b. */
  function prob(theta, b) {
    var c = CONFIG.TEST.GUESS, a = CONFIG.TEST.DISCRIMINATION;
    return c + (1 - c) / (1 + Math.exp(-a * (theta - b)));
  }

  /** How much one question tells us at ability theta (3-parameter logistic information). */
  function information(theta, b) {
    var c = CONFIG.TEST.GUESS, a = CONFIG.TEST.DISCRIMINATION, p = prob(theta, b);
    var core = (p - c) / (1 - c);
    return a * a * ((1 - p) / p) * core * core;
  }

  function newState(priorLevel) {
    var mean = CONFIG.TEST.LEVEL_THETA[levelIndex(priorLevel)], sd = CONFIG.TEST.PRIOR_SD, post = [], sum = 0, i;
    for (i = 0; i < GRID_N; i++) { var z = (grid(i) - mean) / sd, w = Math.exp(-0.5 * z * z); post.push(w); sum += w; }
    return { post: post.map(function (w) { return round(w / sum, 6); }), items: [] };
  }

  /** Records one answer. item = { b, sub, id }, correct = true/false. Returns the same state. */
  function update(state, item, correct) {
    var sum = 0, i;
    for (i = 0; i < GRID_N; i++) {
      var p = prob(grid(i), item.b);
      state.post[i] *= correct ? p : 1 - p;
      sum += state.post[i];
    }
    for (i = 0; i < GRID_N; i++) state.post[i] = round(state.post[i] / sum, 6);
    state.items.push({ id: item.id, b: round(item.b, 3), x: correct ? 1 : 0, sub: item.sub || '' });
    return state;
  }

  /** Ability and standard error of the current distribution. */
  function estimate(state) {
    var mean = 0, i;
    for (i = 0; i < GRID_N; i++) mean += grid(i) * state.post[i];
    var v = 0;
    for (i = 0; i < GRID_N; i++) v += Math.pow(grid(i) - mean, 2) * state.post[i];
    return { theta: mean, se: Math.sqrt(v) };
  }

  /** Mean squared surprise of the answers at the final estimate. About 1 is normal; well above 1.5 means erratic answers. */
  function infit(state) {
    var th = estimate(state).theta, num = 0, den = 0;
    state.items.forEach(function (it) { var p = prob(th, it.b); num += Math.pow(it.x - p, 2); den += p * (1 - p); });
    return den > 0 ? num / den : 1;
  }

  /**
   * Chooses the next question from candidates [{ id, b, sub, group }].
   * `rand` is an optional function returning 0..1, used only to break near-ties.
   */
  function pickNext(state, candidates, rand) {
    rand = rand || Math.random;
    var th = estimate(state).theta, used = {}, groups = {}, subCount = {};
    state.items.forEach(function (it) { used[it.id] = 1; if (it.sub) subCount[it.sub] = (subCount[it.sub] || 0) + 1; });
    (state.groups || []).forEach(function (g) { groups[g] = 1; });
    var best = null, bestScore = -1;
    candidates.forEach(function (c) {
      if (used[c.id] || (c.group && groups[c.group])) return;
      var score = information(th, c.b) * (1 - 0.12 * (subCount[c.sub] || 0)) * (0.97 + 0.06 * rand());
      if (score > bestScore) { bestScore = score; best = c; }
    });
    return best;
  }

  /** Stop when the maximum is reached, or the minimum is reached and the estimate is precise enough. */
  function shouldStop(state, cfg) {
    var n = state.items.length;
    return n >= cfg.MAX || (n >= cfg.MIN && estimate(state).se <= cfg.SE_STOP);
  }

  /** CEFR level of an ability value. */
  function levelFromTheta(theta) { return CONFIG.LEVELS[clamp(Math.floor(theta + 3), 0, 5)]; }

  /** Position inside the level, 0 to 100. */
  function progressPct(theta) {
    var idx = clamp(Math.floor(theta + 3), 0, 5);
    return clamp(Math.round((theta - (idx - 3)) * 100), 0, 100);
  }

  /** 'High', 'Medium' or 'Low' from precision, number of answers and answer consistency. */
  function confidence(se, fit, n) {
    if (n < 4 || se > 0.85 || fit > 2.2) return 'Low';
    if (se <= 0.5 && n >= 7 && fit <= 1.6) return 'High';
    return 'Medium';
  }

  return {
    itemTheta: itemTheta, prob: prob, information: information, newState: newState, update: update,
    estimate: estimate, infit: infit, pickNext: pickNext, shouldStop: shouldStop,
    levelFromTheta: levelFromTheta, progressPct: progressPct, confidence: confidence, levelIndex: levelIndex
  };
})();
