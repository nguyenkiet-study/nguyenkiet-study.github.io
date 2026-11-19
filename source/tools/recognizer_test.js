// Unit test of makeRecognizer (JavaScript.html): never stuck on "Listening", one microphone session at a time.
const fs=require('fs'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','JavaScript.html'),'utf8');
const a=src.indexOf('var liveRec = null;'),b=src.indexOf('/* ---------- shared multiple-choice helpers');
const code=src.slice(a,b);
let now=0,q=[];const timers={setTimeout:(f,ms)=>{const id=q.length+1;q.push({id,f,at:now+ms,live:true});return id},clearTimeout:id=>{const t=q.find(x=>x.id===id);if(t)t.live=false}};
const tick=ms=>{now+=ms;q.filter(t=>t.live&&t.at<=now).forEach(t=>{t.live=false;t.f()})};
let fail=0;const t=(n,c,x)=>{console.log((c?'PASS ':'FAIL ')+n+(c?'':' -> '+String(JSON.stringify(x)).slice(0,200)));if(!c)fail++};
class FakeSR{constructor(opts){this.opts=opts||{};FakeSR.all.push(this);this.started=false;this.aborted=false}
  start(){this.started=true}
  stop(){if(!this.opts.silentStop)setTimeout_(()=>this.onend&&this.onend(),10)}
  abort(){this.aborted=true;this.started=false}}
FakeSR.all=[];let setTimeout_=(f,ms)=>timers.setTimeout(f,ms);
const sessions=[];
const sandbox={window:{},navigator:{audioSession:{type:'playback'}},setTimeout:timers.setTimeout,clearTimeout:timers.clearTimeout,
  audioSession(type){sessions.push(type)}};
sandbox.window.SpeechRecognition=FakeSR;
const run=new Function('window','navigator','setTimeout','clearTimeout','audioSession',code+';return {makeRecognizer,get live(){return liveRec}}');
const M=run(sandbox.window,sandbox.navigator,timers.setTimeout,timers.clearTimeout,sandbox.audioSession);
function mk(){const log={text:[],err:[],end:[]};const r=M.makeRecognizer({text:(f,i)=>log.text.push([f,i]),error:e=>log.err.push(e),end:f=>log.end.push(f)});return {r,log}}

// 1. normal: result then stop with a proper end event
let {r,log}=mk();r.start();r.onresult({resultIndex:0,results:[Object.assign([{transcript:'hello world'}],{isFinal:true})]});r.stop();tick(50);r.onend&&0;
t('text comes through',log.text.length===1&&log.text[0][0].trim()==='hello world',log.text);
t('end is sent once even when the end event also arrives',(()=>{r.onend();tick(2000);return log.end.length===1})(),log.end);

// 2. iPhone bug: stop() with nothing heard and no end event -> forced end within 1.5 s
({r,log}=mk());r.opts={silentStop:true};FakeSR.all[FakeSR.all.length-1].opts={silentStop:true};r.start();r.stop();tick(1400);
t('not finished before 1.5 s',log.end.length===0);tick(200);
t('finished by itself after 1.5 s',log.end.length===1&&FakeSR.all[FakeSR.all.length-1].aborted,log);

// 3. nothing heard for 9 s -> no-speech error then end
({r,log}=mk());r.start();tick(8900);t('still listening at 8.9 s',log.end.length===0&&log.err.length===0);tick(200);
t('no-speech after 9 s, then end',log.err[0]==='no-speech'&&log.end.length===1,log);

// 4. speaking cancels the 9 s watchdog
({r,log}=mk());r.start();r.onspeechstart();tick(20000);t('no watchdog once speech started',log.err.length===0&&log.end.length===0,log);

// 5. one session at a time: a new recognizer aborts the old one
({r,log}=mk());const old=FakeSR.all[FakeSR.all.length-1];r.start();const {r:r2}=mk();
t('the old microphone session is aborted',old.aborted===true);
// 6. audio session goes back to playback after the end
({r,log}=mk());sessions.length=0;r.start();r.onend();t('audio session is play-and-record then playback',sessions[0]==='play-and-record'&&sessions[sessions.length-1]==='playback',sessions);
// 7. real error then end: both reach the handlers once
({r,log}=mk());r.start();r.onerror({error:'not-allowed'});r.onend();t('error and end each once',log.err.length===1&&log.end.length===1,log);
console.log(fail?('\n'+fail+' FAILED'):'\nALL PASSED');process.exit(fail?1:0);
