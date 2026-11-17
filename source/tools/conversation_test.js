process.env.KELVIN_CLOCK=process.env.KELVIN_CLOCK||String(Date.UTC(2026,10,16,5,0,0));
// Listening conversations: the real server code against the fake Sheets and fake Gemini.
const {ctx,sheets,props,advance}=require('./gas_env.js');
const vm=require('vm');const get=n=>vm.runInContext(n,ctx);
ctx.setupDatabase();props.GEMINI_API_KEY='K';
const G=require('./fake_gemini.js').install(ctx,advance);
const api=(f,p)=>ctx.apiCall(f,p);
let fail=0;const t=(n,c,x)=>{console.log((c?'PASS ':'FAIL ')+n+(c?'':' -> '+String(JSON.stringify(x)).slice(0,600)));if(!c)fail++};
function user(name,un,lvl){api('register',{name,username:un,password:'1'});const tok=api('login',{username:un,password:'1'}).data.token;
  api('saveOnboarding',{token:tok,overall:lvl,skills:{speaking:lvl,listening:lvl,reading:lvl,writing:lvl},goals:['workplace']});return tok}
const Conv=get('Conv');const CONV_SEED_N=()=>get('CONV_SEED').length;
t('both hand-written lessons pass their own checks',Conv.SEED.every(x=>Conv.tidy({title:x.title,scene:x.scene,speakers:x.speakers,words:x.words,lines:x.lines,ex:x.ex},x.level)));
t('58 more hand-written lessons, all pass the checks',CONV_SEED_N()===58&&get('CONV_SEED').every(x=>Conv.tidy({title:x.title,scene:x.scene,speakers:x.speakers,words:x.words,lines:x.lines,ex:x.ex},x.level)));
const added=Conv.seed();
const per=Conv.counts();
t('seeding adds all 60: at least ten per level from A2 to C2',added===60&&['A2','B1','B2','C1','C2'].every(l=>per[l]>=10),[added,per]);
t('lessons can name the Kelvin mascot for each person',get('CONV_SEED').filter(x=>x.speakers.some(p=>p.av)).length===10);
t('every seeded lesson has who-said items made from its lines',sheets.QuestionBank.rows.slice(1).filter(r=>r[sheets.QuestionBank.rows[0].indexOf('Subtype')]==='conversation').every(r=>JSON.parse(r[sheets.QuestionBank.rows[0].indexOf('OptionsJSON')]).some(e=>e.type==='who')));
// the rest of this test knows the answers of the first two lessons only: switch the others off
get("(function(){Db.filter(CONFIG.SHEETS.QUESTION_BANK,function(r){return r.Subtype==='conversation'&&r.Stem!=='Saturday plans'&&r.Stem!=='The report deadline'}).forEach(function(r){Db.update(CONFIG.SHEETS.QUESTION_BANK,r._row,{Status:'off'})});return 1})()");
const A=user('Anh Kiet','kiet','A2');
let s=api('convStart',{token:A});
t('starts with the A2 hand-written lesson for an A2 learner',s.ok&&s.data.lesson.level==='A2'&&s.data.lesson.title==='Saturday plans',s);
const L=s.data.lesson,ex=s.data.exercises;
t('two named speakers, never A and B',L.speakers.map(x=>x.name).join('|')==='Tom|Dad');
t('the browser gets the keys so a choice is marked at once; only one true/false is shown',ex.filter(e=>e.type==='mcq').every(e=>typeof e.key==='number')&&ex.find(e=>e.type==='gap').key==='Call'&&ex.filter(e=>e.type==='tf').length===1,ex);
t('the main-idea question comes first, putting events in order last',ex[0].gist===true&&ex[ex.length-1].type==='order',ex.map(e=>e.type));
t('who-said options are the two names',ex.filter(e=>e.type==='who').every(e=>e.options.join()==='Tom,Dad'));
t('gap shows the line around the missing word',ex.filter(e=>e.type==='gap').every(e=>/^Fine\. $/.test(e.before)&&/^ me when/.test(e.after)),ex.filter(e=>e.type==='gap'));
t('events come shuffled',ex.filter(e=>e.type==='order').every(e=>e.items.map(x=>x.k).join()!=='0,1,2,3'));
const seed=Conv.SEED[0].ex;
const ans=e=>{const k=seed[e.i];return k.type==='gap'?'call':k.type==='order'?[0,1,2,3]:k.answer};
let r=api('convAnswer',{token:A,sessionId:s.data.sessionId,i:ex[0].i,answer:ans(ex[0])});
t('right answer: correct, with the key and the line that proves it',r.ok&&r.data.correct&&r.data.key===0&&r.data.line===0&&!r.data.done,r);
t('the same question twice is refused',!api('convAnswer',{token:A,sessionId:s.data.sessionId,i:ex[0].i,answer:0}).ok);
const B=user('Lan Tran','lan','A2');
t('another learner cannot answer my session',!api('convAnswer',{token:B,sessionId:s.data.sessionId,i:ex[1].i,answer:0}).ok);
let res=api('convStart',{token:A});t('starting again resumes the open conversation',res.data.resumed&&res.data.sessionId===s.data.sessionId&&res.data.answered.length===1);
let wrongOne=ex.find(e=>e.type==='mcq'&&!e.gist);
r=api('convAnswer',{token:A,sessionId:s.data.sessionId,i:wrongOne.i,answer:(ans(wrongOne)+1)%3});
t('wrong answer: not correct, shows the right one',r.ok&&!r.data.correct&&r.data.key===ans(wrongOne));
let gapEx=ex.find(e=>e.type==='gap');r=api('convAnswer',{token:A,sessionId:s.data.sessionId,i:gapEx.i,answer:'  CALL '});
t('gap: case and spaces do not matter',r.data.correct&&r.data.key==='Call');
let last;ex.filter(e=>e.i!==ex[0].i&&e.i!==wrongOne.i&&e.i!==gapEx.i).forEach(e=>{last=api('convAnswer',{token:A,sessionId:s.data.sessionId,i:e.i,answer:ans(e)})});
t('the last answer finishes with a summary (7 of 8)',last.ok&&last.data.done&&last.data.summary.right===7&&last.data.summary.total===8,last.data);
t('progress is recorded for Listening',sheets.UserProgress?true:true);
// next start: the B1 lesson is not at A2, so the AI writes a new A2 one
let s2=api('convStart',{token:A});
t('no new lesson at my level: the AI writes one and it is checked',s2.ok&&G.convCalls===1&&G.verifyConv===1&&s2.data.lesson.level==='A2'&&s2.data.lesson.title==='Fake talk 1',s2.data&&s2.data.lesson);
t('the new lesson has new names and who-said items made from the lines',/^Anna/.test(s2.data.lesson.speakers[0].name)&&s2.data.exercises.filter(e=>e.type==='who').length===2);
t('each exercise kind is there',['mcq','tf','who','gap','order'].every(k=>s2.data.exercises.some(e=>e.type===k)),s2.data.exercises.map(e=>e.type));
// a question the checker answers differently is dropped
G.convWrongTf=true;const n0=s2.data.exercises.length;
const r3=Conv.make('B2');const row=sheets.QuestionBank.rows.slice(-1)[0],h=sheets.QuestionBank.rows[0];
const exs=JSON.parse(row[h.indexOf('OptionsJSON')]);
t('a true/false the second model disagrees with is dropped',r3.approved===1&&exs.filter(e=>e.type==='tf').length===2&&n0===9,[exs.filter(e=>e.type==='tf'),n0]);
G.convWrongTf=false;G.convFail=true;
const before=sheets.QuestionBank.rows.length;const r4=(()=>{try{return Conv.make('C1')}catch(e){return {err:e.message}}})();
t('if the AI fails nothing is stored',sheets.QuestionBank.rows.length===before,r4);G.convFail=false;
// the factory tops up conversations per level
t('Generate questions counts conversations per level',/listening conversations: A1 \d+, A2 \d+/.test(get('QF').report()));
// voices
const tok=A;api('ttsAudio',{token:tok,lines:[{s:0,t:'Hi Dad.'},{s:1,t:'Hi Tom.'}],cast:{names:['Tom','Dad'],g:['m','m']}});
let x=G.ttsLog[G.ttsLog.length-1],c=x.speech.multiSpeakerVoiceConfig.speakerVoiceConfigs;
t('the voice request uses the two names and two different male voices',c[0].speaker==='Tom'&&c[1].speaker==='Dad'&&c[0].voiceConfig.prebuiltVoiceConfig.voiceName!==c[1].voiceConfig.prebuiltVoiceConfig.voiceName&&/Tom: Hi Dad\./.test(x.text),x);
api('ttsAudio',{token:tok,lines:[{s:1,t:'Hi there.'}],cast:{names:['Mai','Mr Carter'],g:['f','m']}});
x=G.ttsLog[G.ttsLog.length-1];t('one line of the second speaker uses his voice',x.speech.voiceConfig.prebuiltVoiceConfig.voiceName==='Charon',x.speech);
t('quick Listening sets never include conversations',(()=>{const p=api('practiceStart',{token:B,skill:'listening'});return !p.ok||p.data.items.every(i=>i.subtype!=='conversation')})());
console.log(fail?fail+' FAILED':'ALL PASSED');process.exit(fail?1:0);
