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
const M=new Function('window','navigator','setTimeout','clearTimeout','audioSession',code+';return {makeRecognizer: makeSharedRecognizer, classic: makeRecognizer}')(win,{},T.setTimeout,T.clearTimeout,type=>sessions.push(type));
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
function voiceEnv(x){
  const E={audios:[],plays:[],ctx:[],spoken:[],toasts:[]};
  class FakeAudio{constructor(){E.audios.push(this);this.paused=true}play(){E.plays.push(this.src);this.paused=false;return {catch(){},then(){}}}pause(){this.paused=true}}
  class FakeCtx{constructor(){E.ctx.push(this);this.state='suspended';this.srcs=[]}resume(){this.state='running';return Promise.resolve()}suspend(){this.state='suspended';return Promise.resolve()}
    decodeAudioData(buf,ok){ok({len:buf.byteLength})}
    createBufferSource(){const s={playbackRate:{value:1},connect(){},start(){s.started=true},stop(){s.stopped=true;s.onended&&s.onended()}};this.srcs.push(s);return s}
    get destination(){return {}}}
  const win={AudioContext:FakeCtx,speechSynthesis:{speaking:false,pending:false,getVoices:()=>[],speak:u=>E.spoken.push(u.text),cancel(){},resume(){}}};
  class Utt{constructor(t){this.text=t}}
  const state={settings:{accent:'us',voiceMode:'natural'}};
  const Api={call:()=>Promise.resolve({audio:Buffer.from('abcd').toString('base64'),rate:24000})};
  const f=new Function('window','navigator','speechSynthesis','SpeechSynthesisUtterance','Audio','state','Api','BACKEND_READY','toast','$','syncSettings','SR_X','srDbg','audioSession','fetch','btoa','atob','URL','Blob','setTimeout','clearTimeout',
    voiceCode+';return {speakNatural:speakNatural,stopSpeech:stopSpeech,unlockAudio:unlockAudio,cur:function(){return curAudio}}');
  E.api=f(win,{userAgent:'iPhone',platform:'iPhone',maxTouchPoints:5},win.speechSynthesis,Utt,FakeAudio,state,Api,true,m=>E.toasts.push(m),()=>null,()=>{},x,()=>{},()=>{},
    ()=>Promise.resolve({arrayBuffer:()=>Promise.resolve(new ArrayBuffer(8))}),s=>Buffer.from(s,'binary').toString('base64'),s=>Buffer.from(s,'base64').toString('binary'),{createObjectURL:()=>'blob:x'+Math.random()},class{constructor(p){this.p=p}},(fn)=>{fn();return 0},()=>{});
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
  console.log(fail?('\n'+fail+' FAILED'):'\nALL PASSED');process.exit(fail?1:0);
})();
