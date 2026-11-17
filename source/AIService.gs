/**
 * AIService.gs
 * One door to Gemini. The rest of the app calls AI.generateJson(task, request) and never talks to Google itself,
 * so switching model or provider means editing this file and Config.gs only.
 *
 * What it does for the free tier
 *  - Counts calls per model and per day in the AIUsage sheet and stops before the daily limit.
 *    Google resets the daily quota at midnight Pacific time, so the day is counted in that time zone.
 *  - Keeps under the per-minute limit with a counter in the script cache.
 *  - Retries once on a server error, and moves straight to the fallback model on a rate limit.
 *  - Asks for JSON, repairs fenced or slightly broken JSON, and asks once more if the app's own validation fails.
 *  - The API key is read from Script properties (GEMINI_API_KEY) and sent in a header, never in the URL or the page.
 *
 * Usage (server side only):
 *   var r = AI.generateJson('WRITING_SPEAKING_EVALUATION', { system: '...', prompt: '...', schema: {...},
 *                                                          validate: function (d) { return d.score >= 0 ? '' : 'score missing'; } });
 *   r.data  -> the parsed object,  r.model -> the model that answered
 * Tasks are the keys of CONFIG.AI.MODELS.
 */
var AI = (function () {
  var BASE = 'https://generativelanguage.googleapis.com/v1beta/';

  /** An internal failure type: kind is 'retry', 'skip' (try the next model), 'badjson' or 'fatal'. */
  function fail(kind, message) { var e = new Error(message); e.kind = kind; return e; }

  function apiKey() {
    var k = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
    if (!k) throw new AppError('The AI helper is not set up yet. Ask the person who runs Kelvin.', 'server');
    return String(k).trim();
  }

  /** Quota day in Pacific time, because that is when Google resets the daily limit. */
  function quotaDay() { return Utilities.formatDate(new Date(), 'America/Los_Angeles', 'yyyy-MM-dd'); }

  function dailyLimit(model) {
    var lim = CONFIG.AI.FREE_DAILY_LIMITS[model];
    return lim === undefined ? 20 : lim; // unknown model: assume the smallest limit
  }
  function margin(model) { return Math.min(CONFIG.AI.DAILY_LIMIT_MARGIN, Math.ceil(dailyLimit(model) * 0.1)); }

  function usageRow(model) {
    var day = quotaDay();
    return Db.find(CONFIG.SHEETS.AI_USAGE, function (r) { return String(r.Date) === day && r.Model === model; });
  }
  function usedToday(model) { var r = usageRow(model); return r ? Number(r.Calls) || 0 : 0; }

  function record(model, field) {
    Db.lock(function () {
      var r = usageRow(model);
      if (r) { var patch = {}; patch[field] = (Number(r[field]) || 0) + 1; Db.update(CONFIG.SHEETS.AI_USAGE, r._row, patch); }
      else { var o = { Date: quotaDay(), Model: model, Calls: 0, Errors: 0 }; o[field] = 1; Db.insert(CONFIG.SHEETS.AI_USAGE, o); }
    });
  }

  function cache() { return CacheService.getScriptCache(); }
  function minuteKey(model) { return 'rpm_' + model + '_' + Math.floor(Date.now() / 60000); }
  function deadKey(model) { return 'dead_' + model + '_' + quotaDay(); }

  /** True when the model can take one more call now. */
  function available(model) {
    if (cache().get(deadKey(model))) return false;                                   // Google said the daily quota is gone
    if (cache().get('cool_' + model)) return false;                                  // told to slow down a moment ago
    if (usedToday(model) >= dailyLimit(model) - margin(model)) return false;         // our own daily budget
    var rpm = CONFIG.AI.FREE_RPM[model];
    if (rpm && parseInt(cache().get(minuteKey(model)) || '0', 10) >= rpm) return false; // per-minute budget
    return true;
  }
  function countMinute(model) {
    var k = minuteKey(model);
    cache().put(k, String(parseInt(cache().get(k) || '0', 10) + 1), 90);
  }

  function parseJson(text) {
    var t = String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    try { return JSON.parse(t); } catch (e) { /* try the outermost braces */ }
    var a = t.search(/[\[{]/), b = Math.max(t.lastIndexOf('}'), t.lastIndexOf(']'));
    if (a > -1 && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch (e2) { /* give up below */ } }
    throw fail('badjson', 'The reply was not valid JSON.');
  }

  /** One HTTP call to one model. Returns the reply text or throws a classified failure. */
  function callOnce(model, req, correction) {
    var prompt = correction ? req.prompt + '\n\n' + correction : req.prompt;
    var gen = { temperature: req.temperature === undefined ? CONFIG.AI.TEMPERATURE_SCORING : req.temperature, responseMimeType: 'application/json' };
    if (req.schema) gen.responseSchema = req.schema;
    if (req.maxOutputTokens) gen.maxOutputTokens = req.maxOutputTokens;
    var parts = [{ text: prompt }];
    if (req.image && req.image.data) parts.push({ inlineData: { mimeType: req.image.mimeType || 'image/jpeg', data: req.image.data } });   // a photo, for example of handwriting
    var body = { contents: [{ role: 'user', parts: parts }], generationConfig: gen };
    if (req.system) body.systemInstruction = { parts: [{ text: req.system }] };

    countMinute(model);
    var res = UrlFetchApp.fetch(BASE + 'models/' + encodeURIComponent(model) + ':generateContent', {
      method: 'post', contentType: 'application/json', muteHttpExceptions: true,
      headers: { 'x-goog-api-key': apiKey() }, payload: JSON.stringify(body)
    });
    var code = res.getResponseCode(), raw = res.getContentText();

    if (code === 429) {
      if (/per ?day|daily/i.test(raw)) cache().put(deadKey(model), '1', 21600); else cache().put('cool_' + model, '1', 30);
      throw fail('skip', 'Rate limited (' + model + ').'); // waiting rarely helps within a request; use the fallback model
    }
    if (code >= 500) throw fail('retry', 'Server error ' + code + ' (' + model + ').');
    if (code === 404) throw fail('skip', 'Model not found: ' + model + '. Check the ID in Config.gs.');
    if (code === 400 && /API key/i.test(raw)) throw fail('fatal', 'The Gemini API key is not valid.');
    if (code === 401 || code === 403) throw fail('fatal', 'The Gemini API key was refused (' + code + ').');
    if (code !== 200) throw fail('skip', 'Unexpected reply ' + code + ' from ' + model + ': ' + raw.slice(0, 200));

    var j;
    try { j = JSON.parse(raw); } catch (e) { throw fail('retry', 'Unreadable reply from ' + model + '.'); }
    if (j.promptFeedback && j.promptFeedback.blockReason) throw fail('fatal', 'The request was blocked: ' + j.promptFeedback.blockReason);
    var cand = j.candidates && j.candidates[0];
    var text = cand && cand.content && cand.content.parts ? cand.content.parts.map(function (p) { return p.text || ''; }).join('') : '';
    if (!text) throw fail('retry', 'Empty reply from ' + model + (cand && cand.finishReason ? ' (' + cand.finishReason + ')' : '') + '.');
    return text;
  }

  /** Runs the request on one model: one retry for busy errors, one repair round for bad or invalid JSON. */
  function tryModel(model, req) {
    var correction = '', busy = 0, repaired = false;
    for (var n = 0; n < 3; n++) {
      try {
        var data = parseJson(callOnce(model, req, correction));
        var problem = req.validate ? req.validate(data) : '';
        if (problem) throw fail('badjson', String(problem));
        record(model, 'Calls');
        return data;
      } catch (e) {
        if (!e.kind) throw e;                               // a bug in our own code: do not hide it
        record(model, e.kind === 'badjson' ? 'Calls' : 'Errors');
        if (e.kind === 'fatal') throw new AppError('The AI helper could not run. Ask the person who runs Kelvin to check the key.', 'server');
        if (e.kind === 'retry' && busy++ === 0) { Utilities.sleep(1500 + Math.floor(Math.random() * 1000)); continue; }
        if (e.kind === 'badjson' && !repaired) { repaired = true; correction = 'Your previous reply was not acceptable (' + e.message + '). Reply again with valid JSON only, exactly in the requested format.'; continue; }
        console.warn('AI: giving up on ' + model + ': ' + e.message);
        return undefined;                                   // move on to the fallback model
      }
    }
    return undefined;
  }

  function generateJson(task, req) {
    var primary = CONFIG.AI.MODELS[task];
    if (!primary) throw new Error('Unknown AI task: ' + task);
    var chain = [primary];
    // The fallback is the shared fallback model, or the question model when the task already uses the fallback model.
    var backup = CONFIG.AI.FALLBACK_MODEL !== primary ? CONFIG.AI.FALLBACK_MODEL : CONFIG.AI.MODELS.QUESTION_GENERATION;
    if (backup && backup !== primary) chain.push(backup);
    for (var i = 0; i < chain.length; i++) {
      if (!available(chain[i])) continue;
      var data = tryModel(chain[i], req);
      if (data !== undefined) return { data: data, model: chain[i] };
    }
    throw new AppError('The AI helper is busy or resting for today. Please try again in a few minutes.', 'busy');
  }

  /** Models this key can call for text. Used by the owner menu to confirm IDs. */
  function listModels() {
    var res = UrlFetchApp.fetch(BASE + 'models?pageSize=200', { method: 'get', muteHttpExceptions: true, headers: { 'x-goog-api-key': apiKey() } });
    if (res.getResponseCode() !== 200) throw new Error('Could not list models (' + res.getResponseCode() + '): ' + res.getContentText().slice(0, 200));
    return (JSON.parse(res.getContentText()).models || [])
      .filter(function (m) { return (m.supportedGenerationMethods || []).indexOf('generateContent') > -1; })
      .map(function (m) { return String(m.name).replace(/^models\//, ''); })
      .sort();
  }

  /** Today's use per model, for the status check. */
  function usageToday() {
    var day = quotaDay();
    return Db.filter(CONFIG.SHEETS.AI_USAGE, function (r) { return String(r.Date) === day; })
      .map(function (r) { return r.Model + ': ' + r.Calls + ' calls, ' + r.Errors + ' errors (limit ' + dailyLimit(r.Model) + ')'; });
  }

  return { generateJson: generateJson, listModels: listModels, usageToday: usageToday };
})();
