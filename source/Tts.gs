/**
 * Tts.gs - natural voices for Listening, made by Gemini text-to-speech.
 *
 * The browser asks for audio with `ttsAudio`. The reply is raw 16-bit PCM audio as base64, which the page wraps
 * into a WAV file and plays. If anything fails here (no key, quota, model gone), the page falls back to the
 * voices built into the browser, so Listening never stops working.
 *
 * Shared audio: every clip that was made once is kept as a small file in the Drive folder "Kelvin voice cache"
 * (the script owner's Drive). The next learner who needs the same words, accent and voices gets the file back at once:
 * no AI call and nothing taken from their daily voice allowance. Turn it off with CONFIG.AI.TTS_DRIVE_CACHE = false.
 */
var Tts = (function () {
  var BASE = 'https://generativelanguage.googleapis.com/v1beta/';

  function apiKey() {
    var k = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
    if (!k) throw new AppError('The AI voice is not set up yet.', 'server');
    return String(k).trim();
  }
  function day() { return Utilities.formatDate(new Date(), 'America/Los_Angeles', 'yyyy-MM-dd'); }

  /** Cleans the lines and checks size. Returns [{s:0|1, t:'...'}]. */
  function cleanLines(raw) {
    if (!Array.isArray(raw) || !raw.length) throw new AppError('There is nothing to read.', 'invalid');
    if (raw.length > CONFIG.AI.TTS_MAX_LINES) throw new AppError('That clip is too long.', 'invalid');
    var total = 0, out = raw.map(function (l) {
      var t = String((l && l.t) || '').replace(/\s+/g, ' ').trim();
      total += t.length;
      return { s: l && Number(l.s) === 1 ? 1 : 0, t: t };
    }).filter(function (l) { return l.t; });
    if (!out.length) throw new AppError('There is nothing to read.', 'invalid');
    if (total > CONFIG.AI.TTS_MAX_CHARS) throw new AppError('That clip is too long.', 'invalid');
    return out;
  }

  function quota(user) {
    var key = 'tts_' + user.UserID + '_' + day(), c = CacheService.getScriptCache(), n = Number(c.get(key)) || 0;
    if (n >= CONFIG.AI.TTS_PER_USER_PER_DAY) throw new AppError('You have used today\'s AI voice. The browser voice is used instead.', 'limit');
    c.put(key, String(n + 1), 21600);
  }

  /** cast (optional): {names:['Tom','Dad'], g:['m','m']} - the two people of a Listening conversation. */
  function cleanCast(c) {
    if (!c || !Array.isArray(c.names) || c.names.length !== 2) return null;
    var names = c.names.map(function (n) { return String(n || '').replace(/[^A-Za-z .'-]/g, '').trim().slice(0, 20); });
    if (!names[0] || !names[1] || names[0] === names[1]) return null;
    var g = (Array.isArray(c.g) ? c.g : []).map(function (x) { return x === 'f' ? 'f' : 'm'; });
    return { names: names, g: [g[0] || 'm', g[1] || 'f'] };
  }
  function voicesFor(cast) {
    var V = CONFIG.AI.TTS_VOICES;
    if (!cast) return [V.speaker0, V.speaker1];
    var a = cast.g[0] === 'f' ? V.female[0] : V.male[0];
    var b = cast.g[1] === 'f' ? (cast.g[0] === 'f' ? V.female[1] : V.female[0]) : (cast.g[0] === 'm' ? V.male[1] : V.male[0]);
    return [a, b];
  }
  function buildRequest(lines, accent, cast) {
    var V = CONFIG.AI.TTS_VOICES, uk = accent === 'uk', voices = voicesFor(cast);
    var style = 'Read this clearly at a calm, natural pace for an English learner, in a ' + (uk ? 'British' : 'American') + ' accent.';
    var two = lines.some(function (l) { return l.s === 1; }) && lines.some(function (l) { return l.s === 0; });
    if (!two) {
      var who = cast ? lines[0].s : -1;
      return { text: style + '\n' + lines.map(function (l) { return l.t; }).join(' '),
        speech: { voiceConfig: { prebuiltVoiceConfig: { voiceName: who > -1 ? voices[who] : V.single } } } };
    }
    var n = cast ? cast.names : ['Sam', 'Priya'];
    return {
      text: style + ' This is a natural conversation between ' + n[0] + ' and ' + n[1] + '.\n' + lines.map(function (l) { return n[l.s] + ': ' + l.t; }).join('\n'),
      speech: { multiSpeakerVoiceConfig: { speakerVoiceConfigs: [
        { speaker: n[0], voiceConfig: { prebuiltVoiceConfig: { voiceName: voices[0] } } },
        { speaker: n[1], voiceConfig: { prebuiltVoiceConfig: { voiceName: voices[1] } } }
      ] } }
    };
  }

  /** One call to one model. Returns {audio, rate} or throws {kind:'next'|'fatal'}. */
  function callModel(model, req) {
    var body = { contents: [{ role: 'user', parts: [{ text: req.text }] }],
      generationConfig: { responseModalities: ['AUDIO'], speechConfig: req.speech } };
    var res = UrlFetchApp.fetch(BASE + 'models/' + encodeURIComponent(model) + ':generateContent', {
      method: 'post', contentType: 'application/json', muteHttpExceptions: true,
      headers: { 'x-goog-api-key': apiKey() }, payload: JSON.stringify(body)
    });
    var code = res.getResponseCode(), raw = res.getContentText();
    if (code === 401 || code === 403) { var f = new Error('The AI key was refused.'); f.kind = 'fatal'; throw f; }
    if (code !== 200) { var n = new Error('TTS ' + model + ' replied ' + code); n.kind = 'next'; throw n; }
    var j; try { j = JSON.parse(raw); } catch (e) { var b = new Error('Unreadable TTS reply'); b.kind = 'next'; throw b; }
    var cand = j.candidates && j.candidates[0], parts = cand && cand.content && cand.content.parts || [], i, inline = null;
    for (i = 0; i < parts.length; i++) if (parts[i].inlineData && parts[i].inlineData.data) { inline = parts[i].inlineData; break; }
    if (!inline) { var m = new Error('No audio in the TTS reply'); m.kind = 'next'; throw m; }
    var rate = /rate=(\d+)/.exec(inline.mimeType || ''); 
    return { audio: inline.data, rate: rate ? Number(rate[1]) : 24000 };
  }

  /* ---------- the shared Drive cache ---------- */
  function hashOf(req) {
    var d = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, JSON.stringify([req.text, req.speech]), Utilities.Charset.UTF_8);
    return 'v1_' + d.map(function (b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join('');
  }
  function folder() {
    var props = PropertiesService.getScriptProperties(), id = props.getProperty('TTS_FOLDER_ID');
    if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
    var f = DriveApp.createFolder('Kelvin voice cache');
    props.setProperty('TTS_FOLDER_ID', f.getId());
    return f;
  }
  function fromDrive(key) {
    if (!CONFIG.AI.TTS_DRIVE_CACHE) return null;
    try {
      var c = CacheService.getScriptCache(), id = c.get('ttsf_' + key), file = null;
      if (id) { try { file = DriveApp.getFileById(id); } catch (e) { file = null; } }
      if (!file) { var it = folder().getFilesByName(key + '.txt'); if (it.hasNext()) file = it.next(); }
      if (!file) return null;
      c.put('ttsf_' + key, file.getId(), 21600);
      var j = JSON.parse(file.getBlob().getDataAsString());
      return j && j.audio ? { audio: j.audio, rate: j.rate || 24000, cached: true } : null;
    } catch (e) { console.log('voice cache read skipped: ' + (e && e.message)); return null; }
  }
  function toDrive(key, out) {
    if (!CONFIG.AI.TTS_DRIVE_CACHE) return;
    try {
      var file = folder().createFile(key + '.txt', JSON.stringify({ audio: out.audio, rate: out.rate }), 'text/plain');
      CacheService.getScriptCache().put('ttsf_' + key, file.getId(), 21600);
    } catch (e) { console.log('voice cache write skipped: ' + (e && e.message)); }
  }

  /** api: ttsAudio {lines:[{s,t}], accent, cast} -> {audio, rate}. */
  function audio(user, p) {
    if (!CONFIG.AI.USE_GEMINI_TTS) throw new AppError('The AI voice is switched off.', 'server');
    var lines = cleanLines(p && p.lines), cache = CacheService.getScriptCache();
    var req = buildRequest(lines, p && p.accent === 'uk' ? 'uk' : 'us', cleanCast(p && p.cast)), key = hashOf(req);
    var hit = fromDrive(key); if (hit) return hit;
    if (cache.get('tts_dead_' + day())) throw new AppError('The AI voice is resting. The browser voice is used instead.', 'limit');
    quota(user);
    var models = CONFIG.AI.TTS_MODELS, i, last = '';
    for (i = 0; i < models.length; i++) {
      try { var out = callModel(models[i], req); toDrive(key, out); return out; }
      catch (e) { last = e.message; if (e.kind === 'fatal') break; }
    }
    cache.put('tts_dead_' + day(), '1', 600); // rest for ten minutes after every model failed
    throw new AppError('The AI voice is not available right now. ' + last, 'server');
  }

  return { audio: audio, buildRequest: buildRequest, cleanCast: cleanCast };
})();
