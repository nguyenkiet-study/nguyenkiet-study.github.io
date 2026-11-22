// Practice "Say this sentence" (DrillJS.html): walks sentence 1 -> Continue -> sentence 2 with fake timers, a fake voice and a
// fake recognizer, and checks what the app itself does with sound and the microphone between the two sentences:
// one recognizer per tap, the old one is finished before the new one starts, no sample is played or still pending after the
// microphone starts, and the mic tap starts the recognizer synchronously inside the tap (the user gesture).
// Since 22/11/2026 a speaking step plays its sample by itself when it opens (the iPhone uses its own voice, which leaves the mic working);
// not where that is unsafe (K.voiceSafe() false: an iPhone without its own voice) or with the phone test switch x=noplay.
// The mic tap stops the sample at once.
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'DrillJS.html'), 'utf8');
const code = html.replace(/^\s*<script>/, '').replace(/<\/script>\s*$/, '');
let fail = 0; const t = (n, c, x) => { console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : ' -> ' + String(JSON.stringify(x)).slice(0, 300))); if (!c) fail++; };

function run(srx, unsafe) {
  let now = 0, q = [], nid = 0, inTap = false;
  const setT = (f, ms) => { const id = ++nid; q.push({ id, f, at: now + (ms || 0), live: true }); return id; };
  const clearT = id => { const x = q.find(y => y.id === id); if (x) x.live = false; };
  const tick = ms => { const end = now + ms; for (;;) { const n = q.filter(x => x.live && x.at <= end).sort((a, b) => a.at - b.at)[0]; if (!n) break; now = Math.max(now, n.at); n.live = false; n.f(); } now = end; };
  const log = [];          // what happened, in order
  const recs = [];         // every recognizer made
  let speakGen = 0;
  const root = { innerHTML: '' };
  const actions = {};
  const K = {
    $: s => (s === '#drill-root' ? root : null), $$: () => [], esc: s => String(s), ic: () => '', toast: m => log.push('toast:' + m),
    waveBars: () => '', live: true, state: { view: 'drill', settings: {} }, go: () => {}, register() {}, onGo() {}, setDash() {},
    actions: m => Object.assign(actions, m), loadOverview() {}, history: { save() {} }, srx: () => srx,
    ex: { norm: s => String(s).toLowerCase().replace(/[^a-z' ]/g, '').trim(), makeTiles: () => [], matches: () => false },
    Api: { call: (fn) => fn === 'drillStart' ? Promise.resolve({ mode: 'speak', title: 'Repeat', steps: [{ t: 'repeat', en: 'I like green tea.' }, { t: 'repeat', en: 'She walks to work.' }] }) : Promise.resolve({}) },
    stopSpeech: () => { speakGen++; log.push('stopSpeech'); },
    // the natural voice: fetching takes 1.5 s, then the clip plays for 2 s, unless stopSpeech came in between
    speakNatural: (lines, rate, onEnd) => {
      speakGen++; const g = speakGen; log.push('sample:request ' + lines[0].t);
      setT(() => { if (g !== speakGen) return log.push('sample:dropped'); log.push('sample:play'); setT(() => { if (g !== speakGen) return; log.push('sample:end'); onEnd && onEnd(); }, 2000); }, 1500);
      return {};
    },
    speakLines: () => ({}), say: () => {}, voiceSafe: () => !unsafe,
    makeRecognizer: (h) => {
      const r = { n: recs.length + 1, running: false, ended: false, continuous: true, h,
        start() { if (!inTap) log.push('rec' + this.n + ':start OUTSIDE tap'); this.running = true; log.push('rec' + this.n + ':start'); },
        stop() { log.push('rec' + this.n + ':stop'); setT(() => this.finish(), 300); },
        finish() { if (this.ended) return; this.running = false; this.ended = true; log.push('rec' + this.n + ':end'); h.end(this.text || ''); } };
      recs.push(r); return r;
    }
  };
  const win = { Kelvin: K, SpeechRecognition: function () {}, scrollTo() {} };
  const doc = { addEventListener() {} };
  const ls = { getItem: () => null, setItem() {} };
  new Function('window', 'document', 'localStorage', 'setTimeout', 'clearTimeout', code.replace("var K = window.Kelvin", "var K = window.Kelvin")).call(null, win, doc, ls, setT, clearT);
  const tap = (a, el) => { inTap = true; try { actions[a](el || { dataset: {} }); } finally { inTap = false; } };
  return { K, log, recs, tap, tick, root, D: () => K.drill.state(), flush: () => new Promise(r => setImmediate(r)) };
}

(async () => {
  // default
  const A = run('');
  A.K.drill.start('speak', null); await A.flush(); await A.flush();
  A.tick(4000);                                                     // a speaking step plays its sample by itself when it opens
  t('sentence 1: the sample plays by itself', A.log.includes('sample:request I like green tea.') && A.log.includes('sample:end'), A.log);
  A.tap('dr-mic'); const r1 = A.recs[0];
  t('sentence 1: one recognizer, started inside the tap', A.recs.length === 1 && r1.running && !A.log.some(l => /OUTSIDE/.test(l)), A.log);
  t('sentence 1: continuous=false', r1.continuous === false);
  r1.text = 'I like green tea'; r1.finish();                      // the phone ends by itself after speechend
  t('sentence 1: scored and done', A.D().steps[0].state === 'done' && A.D().steps[0].ok === true, A.D().steps[0]);
  const mark = A.log.length;
  A.tap('dr-next');                                                 // Continue
  t('Continue: no stop() on an already ended recognizer', !A.log.slice(mark).some(l => /rec1:stop/.test(l)), A.log.slice(mark));
  A.tick(200); A.tap('dr-mic');                                     // impatient user: taps the mic while the sample is still being fetched
  const r2 = A.recs[1];
  t('sentence 2: a NEW recognizer, the first one already ended', A.recs.length === 2 && r1.ended && !r1.running && r2.running, A.recs.map(r => [r.running, r.ended]));
  A.tick(10000);
  const after = A.log.slice(A.log.indexOf('rec2:start'));
  t('mic tapped before the 350 ms auto-play: the sample is not even asked for while listening', !after.some(l => /^sample:(request|play)/.test(l)), after);
  r2.text = 'She walks to work'; r2.finish();
  t('sentence 2: heard and scored', A.D().steps[1].state === 'done' && A.D().steps[1].ok === true, A.D().steps[1]);
  t('never two recognizers running at once', A.recs.filter(r => r.running).length === 0);

  // patient user: waits for the sample before tapping
  const B = run('');
  B.K.drill.start('speak', null); await B.flush(); await B.flush(); B.tick(4000);
  B.tap('dr-mic'); B.recs[0].text = 'I like green tea'; B.recs[0].finish(); B.tap('dr-next'); B.tick(4000);
  const m2 = B.log.lastIndexOf('sample:end');
  B.tap('dr-mic');
  t('patient: sentence 2 played by itself and finished before rec2, rec1 ended', B.log.includes('sample:request She walks to work.') && m2 > -1 && m2 < B.log.indexOf('rec2:start') && B.recs[0].ended, B.log);
  t('patient: nothing of the sample after rec2 started', !B.log.slice(B.log.indexOf('rec2:start')).some(l => /^sample:(request|play|end)/.test(l)), B.log);

  // mic tapped while the sample is still being fetched: the late clip is dropped
  const E = run('');
  E.K.drill.start('speak', null); await E.flush(); await E.flush(); E.tick(4000);
  E.tap('dr-mic'); E.recs[0].text = 'I like green tea'; E.recs[0].finish(); E.tap('dr-next'); E.tick(1000);
  E.tap('dr-mic'); E.tick(5000);
  const aft = E.log.slice(E.log.indexOf('rec2:start'));
  t('mic tapped while the sample loads: it is stopped, never played over the mic', !aft.some(l => /^sample:(request|play|end)/.test(l)) && E.log.includes('sample:request She walks to work.'), aft);
  // Listen tapped when the learner wants it: plays
  { const C = run(''); C.K.drill.start('speak', null); await C.flush(); await C.flush(); C.tick(1000); C.tap('dr-play', { dataset: {} }); C.tick(5000);
    t('Listen plays the sample when tapped', C.log.includes('sample:play') && C.log.includes('sample:end'), C.log); }
  // Listen tapped while listening: ignored
  const n0 = E.log.length; E.tap('dr-play', { dataset: {} }); E.tick(5000);
  t('Listen while the mic is on: no sample', !E.log.slice(n0).some(l => /^sample/.test(l)), E.log.slice(n0));

  // an iPhone without its own voice (K.voiceSafe() false): a speaking step never plays by itself
  { const U = run('', true); U.K.drill.start('speak', null); await U.flush(); await U.flush(); U.tick(4000);
    t('unsafe phone: no sample by itself', !U.log.some(l => /^sample/.test(l)), U.log); }
  // x=noplay: no sample by itself
  const C = run('noplay');
  C.K.drill.start('speak', null); await C.flush(); await C.flush(); C.tick(4000);
  t('x=noplay: sentence 1 plays no sample', !C.log.some(l => /^sample/.test(l)), C.log);
  C.tap('dr-mic'); C.recs[0].text = 'I like green tea'; C.recs[0].finish(); C.tap('dr-next'); C.tick(4000);
  t('x=noplay: sentence 2 plays no sample either', !C.log.some(l => /^sample/.test(l)), C.log);
  C.tap('dr-mic'); t('x=noplay: the mic still works', C.recs.length === 2 && C.recs[1].running);

  console.log(fail ? ('\n' + fail + ' FAILED') : '\nALL PASSED'); process.exit(fail ? 1 : 0);
})();
