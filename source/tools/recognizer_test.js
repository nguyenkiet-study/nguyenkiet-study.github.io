// Unit test of makeRecognizer (JavaScript.html): never stuck on "Listening", one shared recognizer, one session at a time.
const fs=require('fs'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','JavaScript.html'),'utf8');
const a=src.indexOf('var liveRec = null;'),b=src.indexOf('/* ---------- shared multiple-choice helpers');
const code=src.slice(a,b);
let now=0,q=[],nid=0;
const T={setTimeout:(f,ms)=>{const id=++nid;q.push({id,f,at:now+ms,live:true});return id},clearTimeout:id=>{const t=q.find(x=>x.id===id);if(t)t.live=false}};
const tick=ms=>{const end=now+ms;for(;;){const n=q.filter(t=>t.live&&t.at<=end).sort((x,y)=>x.at-y.at)[0];if(!n)break;now=Math.max(now,n.at);n.live=false;n.f()}now=end};
let fail=0;const t=(n,c,x)=>{console.log((c?'PASS ':'FAIL ')+n+(c?'':' -> '+String(JSON.stringify(x)).slice(0,300)));if(!c)fail++};
// a recognizer like the phone's: start() while running throws; stop()/abort() end after a moment unless "silent" (never sends end)
let silent=false,startThrows=false;
class FakeSR{constructor(){FakeSR.all.push(this);this.running=false}
  start(){if(startThrows)throw new Error('x');if(this.running)throw new Error('InvalidStateError');this.running=true}
  stop(){this.closing()}
  abort(){this.aborted=true;this.closing()}
  closing(){if(this.running&&!this.stopping&&!silent){this.stopping=true;T.setTimeout(()=>{this.running=false;this.stopping=false;this.onend&&this.onend()},10)}}}
FakeSR.all=[];
const sessions=[];
const win={SpeechRecognition:FakeSR};
const load=(IS_IOS,doc,nav,search,soundAt)=>new Function('window','navigator','setTimeout','clearTimeout','audioSession','IS_IOS','document','location','lastSoundAt',code+';return {makeRecognizer: makeSharedRecognizer, classic: makeRecognizer, xOn: xOn, srx: function(){return SR_X}}')(win,nav||{},T.setTimeout,T.clearTimeout,type=>sessions.push(type),IS_IOS,doc,{search:search||''},soundAt||0);
const M=load(false,undefined);
function mk(){const log={text:[],err:[],end:[]};const r=M.makeRecognizer({text:(f,i)=>log.text.push([f,i]),error:e=>log.err.push(e),end:f=>log.end.push(f)});return {r,log}}
const cur=()=>FakeSR.all[FakeSR.all.length-1];
const say=(w)=>cur().onresult({resultIndex:0,results:[Object.assign([{transcript:w}],{isFinal:true})]});

// 1. a sentence: result, stop, the end event arrives once
let {r,log}=mk();r.start();say('hello world');r.stop();tick(50);
t('text comes through',log.text.length===1&&log.text[0][0].trim()==='hello world',log.text);
t('end is sent once',log.end.length===1&&log.end[0].trim()==='hello world',log.end);
// 2. the next sentences use the SAME recognizer (the phone keeps the microphone for a new one)
for(let i=0;i<3;i++){({r,log}=mk());r.start();say('again '+i);r.stop();tick(50);t('sentence '+(i+2)+' is heard',log.text.length===1&&log.end.length===1,log)}
t('only one recognizer was ever created',FakeSR.all.length===1,FakeSR.all.length);
// 3. continuous=false set by the caller reaches the recognizer
({r,log}=mk());r.continuous=false;r.start();t('continuous follows the caller',cur().continuous===false);r.stop();tick(50);
// 4. the phone never sends "end" after stop(): finished by itself after 1.5 s, and the next sentence still works
silent=true;({r,log}=mk());r.start();r.stop();tick(1400);t('not finished before 1.5 s',log.end.length===0);tick(200);
t('finished by itself after 1.5 s',log.end.length===1,log);
// 4b. the stuck run never ends: after 0.7 s a new recognizer is used and the sentence is heard
const before=FakeSR.all.length;({r,log}=mk());r.start();tick(900);
t('a new recognizer replaces the stuck one',FakeSR.all.length===before+1&&cur().running,{n:FakeSR.all.length,before});
silent=false;say('works');r.stop();tick(50);t('and the sentence is heard',log.text.length===1&&log.end.length===1,log);
// 4c. the stuck run ends late: the same recognizer is used again
silent=true;({r,log}=mk());r.start();r.stop();tick(1600);silent=false;
const n4=FakeSR.all.length;({r,log}=mk());r.start();tick(100);
t('a late end lets the same recognizer start again',FakeSR.all.length===n4&&cur().running,{n:FakeSR.all.length,n4});
say('also works');r.stop();tick(50);t('and is heard too',log.text.length===1&&log.end.length===1,log);
// 5. nothing heard for 9 s
({r,log}=mk());r.start();tick(8900);t('still listening at 8.9 s',log.end.length===0&&log.err.length===0);tick(200);
t('no-speech after 9 s, then end',log.err[0]==='no-speech'&&log.end.length===1,log);
// 6. speaking cancels the 9 s watchdog
({r,log}=mk());r.start();cur().onspeechstart();tick(20000);t('no watchdog once speech started',log.err.length===0&&log.end.length===0,log);
// 7. a new session takes over a running one: the old one is dropped quietly, the new one starts after the old run ended
const old=log;({r,log}=mk());r.start();tick(50);t('old session gets no more events',old.end.length===0&&old.err.length===0,old);
say('new one');r.stop();tick(50);t('new session works',log.text.length===1&&log.end.length===1,log);
// 8. audio session goes back to playback at the end
sessions.length=0;({r,log}=mk());r.start();r.stop();tick(50);t('play-and-record then playback',sessions[0]==='play-and-record'&&sessions[sessions.length-1]==='playback',sessions);
// 9. error and end each reach the handlers once
({r,log}=mk());r.start();cur().onerror({error:'not-allowed'});cur().running=false;cur().onend();t('error and end each once',log.err.length===1&&log.end.length===1,log);
// 10. the phone refuses to start: error, then end, never stuck
startThrows=true;({r,log}=mk());r.start();t('refused start ends the session with an error',log.err[0]==='audio-capture'&&log.end.length===1,log);startThrows=false;
// 11. the default (classic) recognizer: a new recognizer per sentence, handlers wired as before
{const n0=FakeSR.all.length;const lg={t:[],e:[],n:[]};const c1=M.classic({text:(f,i)=>lg.t.push(f),error:e=>lg.e.push(e),end:f=>lg.n.push(f)});c1.start();
 t('classic makes its own recognizer',FakeSR.all.length===n0+1);
 cur().onresult({resultIndex:0,results:[Object.assign([{transcript:'hi there'}],{isFinal:true})]});cur().onerror({error:'no-speech'});cur().onend();
 t('classic passes text, error and end',lg.t[0].trim()==='hi there'&&lg.e[0]==='no-speech'&&lg.n[0].trim()==='hi there',lg);
 const c2=M.classic({text(){},error(){},end(){}});c2.start();t('classic: next sentence gets another recognizer',FakeSR.all.length===n0+2);}
// 12. phone test switches for the spoken sample (speakNatural): default <audio>, x=synth browser voice, x=webaudio AudioContext
const a2=src.indexOf('var activeRec = null;'),b2=src.indexOf('var liveRec = null;');
const voiceCode=src.slice(a2,b2);
function voiceEnv(x,doc){
  const E={audios:[],plays:[],ctx:[],spoken:[],toasts:[],calls:0};
  class FakeAudio{constructor(){E.audios.push(this);this.paused=true}play(){E.plays.push(this.src);this.paused=false;return {catch(){},then(){}}}pause(){this.paused=true}}
  class FakeCtx{constructor(){E.ctx.push(this);this.state='suspended';this.srcs=[]}resume(){this.state='running';return Promise.resolve()}suspend(){this.state='suspended';return Promise.resolve()}
    decodeAudioData(buf,ok){ok({len:buf.byteLength})}
    createBufferSource(){const s={playbackRate:{value:1},connect(){},start(){s.started=true},stop(){s.stopped=true;s.onended&&s.onended()}};this.srcs.push(s);return s}
    get destination(){return {}}}
  const win={AudioContext:FakeCtx,speechSynthesis:{speaking:false,pending:false,getVoices:()=>[],speak:u=>E.spoken.push(u.text),cancel(){},resume(){}}};
  class Utt{constructor(t){this.text=t}}
  const state={settings:{accent:'us',voiceMode:'natural'}};
  const Api={call:()=>{E.calls++;return Promise.resolve({audio:Buffer.from('abcd').toString('base64'),rate:24000})}};
  const f=new Function('window','navigator','speechSynthesis','SpeechSynthesisUtterance','Audio','state','Api','BACKEND_READY','toast','$','syncSettings','SR_X','srDbg','audioSession','fetch','btoa','atob','URL','Blob','setTimeout','clearTimeout','xOn','document','ic',
    voiceCode+';return {speakNatural:speakNatural,stopSpeech:stopSpeech,unlockAudio:unlockAudio,armVoiceNote:armVoiceNote,prefetchNatural:prefetchNatural,armed:function(){return voiceNoteArmed},cur:function(){return curAudio},pcmToWavUrl:pcmToWavUrl,pcm48:pcm48,lastSound:function(){return lastSoundAt}}');
  E.api=f(win,{userAgent:'iPhone',platform:'iPhone',maxTouchPoints:5},win.speechSynthesis,Utt,FakeAudio,state,Api,true,m=>E.toasts.push(m),()=>null,()=>{},x,()=>{},()=>{},
    ()=>Promise.resolve({arrayBuffer:()=>Promise.resolve(new ArrayBuffer(8))}),s=>Buffer.from(s,'binary').toString('base64'),s=>Buffer.from(s,'base64').toString('binary'),{createObjectURL:()=>'blob:x'+Math.random()},class{constructor(p){this.p=p}},(fn)=>{fn();return 0},()=>{},n=>(','+x+',').indexOf(','+n+',')>=0,doc,()=>'');
  return E;
}
const flush=()=>new Promise(r=>setImmediate(r));
(async()=>{
  // default: the shared <audio> element plays the clip, no AudioContext, no browser voice
  {const E=voiceEnv('');E.api.speakNatural([{s:0,t:'Hello there.'}],1,()=>{});for(let i=0;i<8;i++)await flush();
   t('default: clip plays through <audio>',E.plays.length>=2&&E.ctx.length===0&&E.spoken.length===0,{plays:E.plays.length,ctx:E.ctx.length,spoken:E.spoken});}
  // synth: browser voice only, no <audio> playback of the clip
  {const E=voiceEnv('synth');E.api.speakNatural([{s:0,t:'Hello there.'}],1,()=>{});for(let i=0;i<8;i++)await flush();
   t('x=synth: browser voice, no audio element',E.spoken.length===1&&E.plays.length===0,{plays:E.plays,spoken:E.spoken});}
  // webaudio: clip through an AudioContext, <audio> never played, context paused after the clip, onEnd once
  {const E=voiceEnv('webaudio');let ended=0;E.api.speakNatural([{s:0,t:'Hello there.'}],1,()=>ended++);for(let i=0;i<10;i++)await flush();
   const c=E.ctx[0],s=c&&c.srcs[0];
   t('x=webaudio: clip starts in an AudioContext, no <audio> playback',!!(s&&s.started)&&E.plays.length===0,{ctx:E.ctx.length,plays:E.plays.length});
   if(s)s.onended();t('x=webaudio: onEnd once and the context is paused after the clip',ended===1&&c&&c.state==='suspended',{ended,state:c&&c.state});
   // stopSpeech (the mic tap) stops a playing clip, pauses the context, and onEnd is not called
   E.api.speakNatural([{s:0,t:'Second one.'}],1,()=>ended++);for(let i=0;i<10;i++)await flush();
   const s2=c&&c.srcs[1];t('x=webaudio: second clip plays',!!(s2&&s2.started)&&c.state==='running',{n:c&&c.srcs.length,state:c&&c.state});
   E.api.stopSpeech();t('x=webaudio: stopSpeech stops it, pauses the context, no onEnd',!!(s2&&s2.stopped)&&c.state==='suspended'&&ended===1&&E.api.cur()===null,{state:c&&c.state,ended});}
  // 13. iPhone default: one hidden frame per sentence (removed afterwards) and the microphone opened and closed after each sentence
  { const frames = [], closed = []; const FSR = class extends FakeSR {}; FSR.all = [];
    const doc = { createElement: () => { const f = { attrs: {}, style: {}, parentNode: null, setAttribute(k, v) { this.attrs[k] = v }, contentWindow: { webkitSpeechRecognition: FSR } }; frames.push(f); return f },
      body: { appendChild(f) { f.parentNode = this; f.in = true }, removeChild(f) { f.in = false; f.parentNode = null } } };
    const nav = { mediaDevices: { getUserMedia: () => Promise.resolve({ getTracks: () => [{ stop() { closed.push(1) } }] }) } };
    const MI = load(true, doc, nav); const n13 = FakeSR.all.length;
    const lg = { t: [], e: [], n: [] }; const r = MI.classic({ text: (f, i) => lg.t.push(f), error: e => lg.e.push(e), end: f => lg.n.push(f) });
    t('iPhone: the recognizer comes from a hidden frame', frames.length === 1 && frames[0].in === true && FakeSR.all.length === n13 + 1, { frames: frames.length, made: FakeSR.all.length - n13 });
    r.start(); const inst = FakeSR.all[n13];
    inst.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: 'hello' }], { isFinal: true })] }); inst.running = false; inst.onend();
    t('iPhone: text and end reach the handlers', lg.t.length === 1 && lg.n.length === 1, lg);
    t('iPhone: the frame is still there right after the end', frames[0].in === true);
    tick(400);
    t('iPhone: the frame is removed after the end', frames[0].in === false, frames[0]);
    await flush();
    t('iPhone: the microphone is not opened by the page after the sentence (gumreset no longer in the default)', closed.length === 0, closed);
    MI.classic({ text() {}, error() {}, end() {} });
    t('iPhone: the next sentence gets its own frame', frames.length === 2 && frames[1].in === true && FakeSR.all.length === n13 + 2, { frames: frames.length });
  }
  // 14. newer phone test switches (whole-word match), all off by default
  { const MI = load(false, undefined, {}, '?debug=1&x=nogum,gumreset,waitfix');
    t('xOn matches whole words: nogum on, gum off', MI.xOn('nogum') && !MI.xOn('gum') && MI.xOn('gumreset') && MI.xOn('waitfix') && !MI.xOn('wait'), MI.srx());
    const MD = load(true, undefined, {}, '');
    t('default iPhone switches: hidden frame + iPhone voice + no unlock clip (22/11)', MD.srx() === 'iframe,synth,nounlock' && MD.xOn('synth') && MD.xOn('nounlock') && !MD.xOn('gum') && !MD.xOn('gumreset') && !MD.xOn('waitfix'), MD.srx());
    const MP = load(false, undefined, {}, '?x=playgum,gumreset');
    t('gum is no longer switched on by gumreset or playgum', !MP.xOn('gum') && MP.xOn('gumreset') && MP.xOn('playgum'), MP.srx());
    const MN = load(true, undefined, {}, '?x=none,iframe,gumreset');
    t('x=none drops the iPhone default and keeps the extras after it', MN.srx() === 'iframe,gumreset' && !MN.xOn('gum') && !MN.xOn('none'), MN.srx());
    const M0 = load(true, undefined, {}, '?x=none');
    t('x=none alone: no switches at all', M0.srx() === '', M0.srx()); }
  // 14b. the iPhone default no longer touches getUserMedia (gum/gumreset never worked there: InvalidStateError); x=gum still can, x=nogum never
  { delete win.__kmic; const calls = []; const nav = { mediaDevices: { getUserMedia: () => { calls.push(1); return Promise.reject({ name: 'InvalidStateError' }); } } };
    const MD = load(true, undefined, nav, ''); const n0 = FakeSR.all.length; const r = MD.classic({ text() {}, error() {}, end() {} }); r.start();
    t('default iPhone: starts at once, inside the tap, no getUserMedia', FakeSR.all[n0].running && calls.length === 0, { calls: calls.length });
    FakeSR.all[n0].running = false; FakeSR.all[n0].onend(); await flush(); tick(400);
    t('default iPhone: no getUserMedia after the sentence either', calls.length === 0, { calls: calls.length });
    delete win.__kmic; const MX = load(true, undefined, nav, '?x=gum'); const nx = FakeSR.all.length; MX.classic({ text() {}, error() {}, end() {} }).start();
    t('x=gum (test switch): getUserMedia is asked before the start', calls.length === 1 && !FakeSR.all[nx].running, { calls: calls.length });
    await flush(); await flush(); t('x=gum: the recognizer starts after that', FakeSR.all[nx].running);
    calls.length = 0; const MN = load(true, undefined, nav, '?x=nogum'); const n1 = FakeSR.all.length; const lg = { n: [] };
    const r2 = MN.classic({ text() {}, error() {}, end: f => lg.n.push(f) }); r2.start();
    t('x=nogum: starts at once, inside the tap, no getUserMedia', FakeSR.all[n1].running && calls.length === 0, { calls: calls.length });
    FakeSR.all[n1].running = false; FakeSR.all[n1].onend(); await flush(); tick(400);
    t('x=nogum: no getUserMedia after the sentence either', calls.length === 0 && lg.n.length === 1, { calls: calls.length });
    calls.length = 0; delete win.__kmic; const MG = load(true, undefined, nav, '?x=none,iframe,gumreset'); const n2 = FakeSR.all.length;
    MG.classic({ text() {}, error() {}, end() {} }).start();
    t('x=none,iframe,gumreset: starts at once, no kept microphone stream', FakeSR.all[n2].running && calls.length === 0, { calls: calls.length }); }
  // 14c. x=waitfix: listening starts 2.5 s after the last sound; stop() during the wait ends the run without starting
  { const M2 = load(false, undefined, {}, '?x=waitfix', Date.now() - 500); const n0 = FakeSR.all.length; const lg = { n: [], e: [] };
    const r = M2.classic({ text() {}, error: e => lg.e.push(e), end: f => lg.n.push(f) }); r.start();
    t('x=waitfix: not started right after a sound', !FakeSR.all[n0].running);
    tick(1800); t('x=waitfix: still waiting at 2.3 s', !FakeSR.all[n0].running); tick(300);
    t('x=waitfix: started by 2.6 s', FakeSR.all[n0].running);
    const M3 = load(false, undefined, {}, '?x=waitfix', Date.now() - 100); const n1 = FakeSR.all.length; const l3 = { n: [] };
    const r3 = M3.classic({ text() {}, error() {}, end: f => l3.n.push(f) }); r3.start(); r3.stop(); tick(5000);
    t('x=waitfix: stop while waiting ends once and never starts', l3.n.length === 1 && !FakeSR.all[n1].running, { ends: l3.n.length, running: FakeSR.all[n1].running });
    const M4 = load(false, undefined, {}, '?x=waitfix', Date.now() - 10000); const n2 = FakeSR.all.length;
    M4.classic({ text() {}, error() {}, end() {} }).start();
    t('x=waitfix: no wait when the last sound was long ago', FakeSR.all[n2].running); }
  // 14d. x=waitidle: waits while navigator.audioSession.state is "active", starts once it is not (or after 4 s)
  { const nav = { audioSession: { type: 'playback', state: 'active' } };
    const M2 = load(false, undefined, nav, '?x=waitidle', Date.now() - 200); const n0 = FakeSR.all.length;
    M2.classic({ text() {}, error() {}, end() {} }).start(); tick(600);
    t('x=waitidle: waits while the session is active', !FakeSR.all[n0].running);
    nav.audioSession.state = 'inactive'; tick(300);
    t('x=waitidle: starts when the session is no longer active', FakeSR.all[n0].running); }
  // 14e. x=sessflip: "auto" then "play-and-record" right before the start
  { const M2 = load(false, undefined, {}, '?x=sessflip'); sessions.length = 0; M2.classic({ text() {}, error() {}, end() {} }).start();
    t('x=sessflip: auto, then play-and-record', sessions[0] === 'auto' && sessions[1] === 'play-and-record', sessions); }
  // 15. sample switches: ctxclose closes the context after each clip, freshaudio / frameaudio use a player per clip and remove it, hz writes 48 kHz
  { const E = voiceEnv('ctxclose'); let ended = 0; E.api.speakNatural([{ s: 0, t: 'One.' }], 1, () => ended++); for (let i = 0; i < 10; i++) await flush();
    const c = E.ctx[0], s = c && c.srcs[0]; if (c) c.close = function () { this.state = 'closed'; return Promise.resolve(); };
    t('x=ctxclose: plays through Web Audio, no <audio> playback', !!(s && s.started) && E.plays.length === 0, { ctx: E.ctx.length, plays: E.plays.length });
    if (s) s.onended(); t('x=ctxclose: context closed after the clip, onEnd once', c && c.state === 'closed' && ended === 1, { state: c && c.state, ended });
    E.api.speakNatural([{ s: 0, t: 'Two.' }], 1, () => ended++); for (let i = 0; i < 10; i++) await flush();
    t('x=ctxclose: the next clip gets a new context', E.ctx.length === 2 && E.ctx[1].srcs.length === 1, { ctx: E.ctx.length }); }
  for (const mode of ['freshaudio', 'frameaudio']) {
    const made = [], frames = [];
    const mkEl = (owner) => ({ tag: 'audio', paused: true, owner, parentNode: null, play() { this.paused = false; this.playedSrc = (this.playedSrc || []).concat(this.src); return { catch() {}, then() {} }; }, pause() { this.paused = true; }, removeAttribute() { this.src = ''; }, load() { this.loaded = true; } });
    const body = { appendChild(x) { x.parentNode = body; x.in = true; }, removeChild(x) { x.in = false; x.parentNode = null; } };
    const fbody = { appendChild(x) { x.parentNode = fbody; x.in = true; }, removeChild(x) { x.in = false; x.parentNode = null; } };
    const fdoc = { createElement: () => { const e = mkEl('frame'); made.push(e); return e; }, body: fbody };
    const doc = { body, createElement: (tag) => { if (tag === 'iframe') { const f = { tag, style: {}, setAttribute() {}, contentDocument: fdoc }; frames.push(f); return f; } const e = mkEl('page'); made.push(e); return e; } };
    const E = voiceEnv(mode, doc); let ended = 0;
    E.api.unlockAudio(true);
    t('x=' + mode + ': no unlock clip on the first touch', E.audios.length === 0 && made.length === 0, { audios: E.audios.length, made: made.length });
    E.api.speakNatural([{ s: 0, t: 'Hello.' }], 1, () => ended++); for (let i = 0; i < 8; i++) await flush();
    const a = made[0];
    t('x=' + mode + ': the clip plays on its own new element', made.length === 1 && a.in && a.owner === (mode === 'frameaudio' ? 'frame' : 'page') && E.audios.length === 0 && a.playedSrc.length === 2, { made: made.length, audios: E.audios.length, played: a && a.playedSrc });
    if (mode === 'frameaudio') t('x=frameaudio: inside a hidden frame', frames.length === 1 && frames[0].in);
    a.onended(); t('x=' + mode + ': element removed after the clip, onEnd once', !a.in && a.loaded && ended === 1 && (mode !== 'frameaudio' || !frames[0].in), { in: a.in, ended });
    t('x=' + mode + ': the time of the sound is kept', E.api.lastSound() > 0);
    E.api.speakNatural([{ s: 0, t: 'Again.' }], 1, () => ended++); for (let i = 0; i < 8; i++) await flush();
    const b = made[1]; E.api.stopSpeech();
    t('x=' + mode + ': stopSpeech removes the playing element', made.length === 2 && !b.in && ended === 1, { made: made.length, in: b && b.in });
  }
  { const E = voiceEnv('nounlock'); E.api.unlockAudio(true); t('x=nounlock: no unlock clip on the first touch', E.audios.length === 0);
    E.api.unlockAudio(); t('x=nounlock: a tap on Listen still unlocks', E.audios.length === 1);
    const D = voiceEnv(''); D.api.unlockAudio(true); t('default: the first touch still unlocks', D.audios.length === 1); }
  // the iPhone default since 22/11 (iframe,synth,nounlock): no <audio> element ever, the voice is woken up by the first touch
  { const E = voiceEnv('iframe,synth,nounlock'); E.api.unlockAudio(true);
    t('iPhone default: the first touch makes no audio element and wakes the voice (one silent utterance)', E.audios.length === 0 && E.plays.length === 0 && E.spoken.length === 1, { audios: E.audios.length, spoken: E.spoken });
    E.api.unlockAudio(); E.api.unlockAudio(true);
    t('iPhone default: later unlocks (e.g. a word tap) never make an audio element, the voice is woken once', E.audios.length === 0 && E.spoken.length === 1, { audios: E.audios.length, spoken: E.spoken });
    E.api.prefetchNatural([{ s: 0, t: 'Next one.' }]);
    t('iPhone default: nothing is fetched in advance (the iPhone voice needs nothing)', E.calls === 0, E.calls);
    E.api.speakNatural([{ s: 0, t: 'Hello there.' }], 1, () => {}); for (let i = 0; i < 6; i++) await flush();
    t('iPhone default: the sample is read by the iPhone voice, no audio element', E.audios.length === 0 && E.spoken.includes('Hello there.'), { audios: E.audios.length, spoken: E.spoken }); }
  // computers and Android: the natural voice is fetched in advance
  { const E = voiceEnv(''); E.api.prefetchNatural([{ s: 0, t: 'Next one.' }]); await flush();
    t('default: prefetch asks the server for the next clip', E.calls === 1, E.calls); }
  // the silent-mode reminder: armed when a lesson starts, shown once at its first sound, "Play again" reads the sentence again
  { const kids = []; const mk = () => ({ id: '', className: '', attrs: {}, l: {}, setAttribute(k, v) { this.attrs[k] = v; }, addEventListener(n, f) { this.l[n] = f; }, parentNode: null });
    const doc = { createElement: mk, getElementById: id => kids.filter(k => k.id === id)[0] || null,
      body: { appendChild(c) { c.parentNode = this; kids.push(c); }, removeChild(c) { kids.splice(kids.indexOf(c), 1); c.parentNode = null; } } };
    const E = voiceEnv('iframe,synth,nounlock', doc);
    E.api.speakNatural([{ s: 0, t: 'One.' }], 1, () => {}); for (let i = 0; i < 4; i++) await flush();
    t('reminder: not shown before a lesson starts', kids.length === 0, kids.length);
    E.api.armVoiceNote(); E.api.speakNatural([{ s: 0, t: 'Two.' }], 1, () => {}); for (let i = 0; i < 4; i++) await flush();
    const box = kids[0];
    t('reminder: shown at the first sound of the lesson', kids.length === 1 && box.id === 'voice-note' && /Can you hear Kel/.test(box.innerHTML) && /I can hear Kel/.test(box.innerHTML) && /Play again/.test(box.innerHTML), kids.length);
    E.api.speakNatural([{ s: 0, t: 'Three.' }], 1, () => {}); for (let i = 0; i < 4; i++) await flush();
    t('reminder: only once per lesson', kids.length === 1 && !E.api.armed(), kids.length);
    const n0 = E.spoken.filter(w => w === 'Two.').length;
    box.l.click({ target: { closest: () => ({ getAttribute: () => 'again' }) }, stopPropagation() {} }); for (let i = 0; i < 4; i++) await flush();
    t('reminder: Play again closes it and reads the sentence again', kids.length === 0 && E.spoken.filter(w => w === 'Two.').length === n0 + 1, { kids: kids.length, spoken: E.spoken });
    E.api.armVoiceNote(); E.api.speakNatural([{ s: 0, t: 'Five.' }], 1, () => {}); for (let i = 0; i < 4; i++) await flush();
    const box2 = kids[0]; box2.l.click({ target: { closest: () => ({ getAttribute: () => 'ok' }) }, stopPropagation() {} });
    t('reminder: the next lesson shows it again; "I can hear Kel" just closes it', kids.length === 0 && E.spoken.filter(w => w === 'Five.').length === 1, { kids: kids.length });
    const P = voiceEnv('', doc); P.api.armVoiceNote(); P.api.speakNatural([{ s: 0, t: 'Four.' }], 1, () => {}); for (let i = 0; i < 6; i++) await flush();
    t('reminder: never on computers and Android (Kelvin voice, not the iPhone voice)', kids.length === 0 && !P.api.armed(), kids.length); }
  { const E = voiceEnv('hz'); const pcm = Buffer.from([0, 0, 100, 0]).toString('binary'), out = E.api.pcm48(pcm);
    const v = [0, 1].map(i => out.charCodeAt(2 * i) | (out.charCodeAt(2 * i + 1) << 8));
    t('x=hz: 24 kHz samples doubled with a midpoint', out.length === 8 && v[0] === 0 && v[1] === 50, v); }
  console.log(fail ? (fail + ' FAILED') : 'ALL PASSED'); process.exit(fail ? 1 : 0);
})();
