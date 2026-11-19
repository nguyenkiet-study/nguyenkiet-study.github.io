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
console.log(fail?('\n'+fail+' FAILED'):'\nALL PASSED');process.exit(fail?1:0);
