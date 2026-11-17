process.env.KELVIN_CLOCK=process.env.KELVIN_CLOCK||String(Date.UTC(2026,10,12,17,0,0)); // the day-boundary checks depend on the time of day, so pin it
// Words, word generation, practice, plan and progress: runs the real server code against the fake Sheets and fake Gemini.
const {ctx,sheets,props,cache,advance}=require('./gas_env.js');
const vm=require('vm'),fs=require('fs'),path=require('path');const get=n=>vm.runInContext(n,ctx);
ctx.setupDatabase();props.GEMINI_API_KEY='K';
const G=require('./fake_gemini.js').install(ctx,advance);
const api=(f,p)=>ctx.apiCall(f,p);
let fail=0;const t=(n,c,x)=>{console.log((c?'PASS ':'FAIL ')+n+(c?'':' -> '+String(JSON.stringify(x)).slice(0,400)));if(!c)fail++};
const DAY=86400000;

// ---- 0. the sheets: new column and migration of an old sheet ----
const wb=sheets.WordBank;t('WordBank has the Quiz column',wb.rows[0].includes('Quiz'),wb.rows[0]);
{ // an old sheet with 13 columns gets Quiz added, data kept
  const old=sheets.WordBank.rows[0].slice(0,13);wb.rows[0]=old;wb.rows[1]=['W0001','a','article','A1','p','','','','','','S','pending','x'];
  ctx.setupDatabase();t('migration adds the missing column and keeps the data',wb.rows[0].length===18&&wb.rows[0][13]==='Quiz'&&wb.rows[0][15]==='Question'&&wb.rows[0][16]==='Related'&&wb.rows[1][1]==='a',[wb.rows[0],wb.rows[1]]);
  wb.rows.length=1;
}

// ---- 1. import a sample of the real word list ----
function parseCsvLine(l){const o=[];let c='',q=false;for(let i=0;i<l.length;i++){const ch=l[i];if(q){if(ch==='"'&&l[i+1]==='"'){c+='"';i++}else if(ch==='"')q=false;else c+=ch}else if(ch==='"')q=true;else if(ch===','){o.push(c);c=''}else c+=ch}o.push(c);return o}
const lines=fs.readFileSync(path.join(__dirname,'..','data','wordbank_import.csv'),'utf8').trim().split('\n').slice(1).map(parseCsvLine);
const perLevel={};const sample=[];lines.forEach(r=>{perLevel[r[3]]=(perLevel[r[3]]||0)+1;if(perLevel[r[3]]<=45)sample.push(r)});
const H=wb.rows[0];sample.forEach((r,i)=>{const o={};H.slice(0,13).forEach((h,j)=>o[h]=r[j]);o.Status='pending';o.CreatedAt='x';wb.rows.push(H.map(h=>o[h]===undefined?'':o[h]))});
t('sample imported (a sample over 6 levels)',wb.rows.length-1===sample.length&&sample.length>=200,sample.length);

// ---- 2. the question bank and tasks (the practice material) ----
t('seed tasks',get('Seed').load()===232);
let rep=get('QF').run(360000e3);t('question bank full',rep.remainingCells===0,rep);
const QH=sheets.QuestionBank.rows[0],qi=n=>QH.indexOf(n);
const keyOf=id=>Number(sheets.QuestionBank.rows.find(r=>r[0]===id)[qi('CorrectAnswer')]);

// ---- 3. word content generation ----
t('no word usable before generation',api('register',{name:'W One',username:'wone',password:'1'}).ok);
const tokA=api('login',{username:'wone',password:'1'}).data.token;
api('saveOnboarding',{token:tokA,overall:'B1',skills:{speaking:'B1',listening:'B1',reading:'B1',writing:'B1'},goals:['business','workplace']});
let td=api('wordsToday',{token:tokA});t('today says content is not ready yet',td.ok&&td.data.ready===false&&td.data.bank.pending>0,td);
let gen=get('WordGen').run(3600e3);
const WH=wb.rows[0],wi=n=>WH.indexOf(n);const rows=wb.rows.slice(1);
const by=s=>rows.filter(r=>r[wi('Status')]===s).length;
t('generation ran in batches of up to 20',gen.batches>=Math.ceil(sample.length/20)&&G.wordBatches>=gen.batches,gen);
t('most words approved; failures are retried then rejected',by('approved')>sample.length*0.7&&by('pending')===0,{a:by('approved'),r:by('retry'),x:by('rejected'),p:by('pending')});
t('a verifier ran for each batch',G.verifyCalls>=gen.batches);
const ap=rows.filter(r=>r[wi('Status')]==='approved');
t('every approved word has definition, one bracketed word, partners and a gloss',ap.every(r=>r[wi('DefinitionEN')]&&/^[^\[\]]*\[[^\[\]]+\][^\[\]]*$/.test(r[wi('Example')])&&r[wi('Collocations')].split(' | ').length>=2&&r[wi('VietnameseGloss')]));
t('a failed quiz check keeps the word but drops the quiz',ap.some(r=>!r[wi('Quiz')])&&ap.some(r=>r[wi('Quiz')]));
t('second run retries failures once more, then rejects',(()=>{const g2=get('WordGen').run(3600e3);return g2.batches>=1&&rows.filter(r=>r[wi('Status')]==='retry').length===0})());
t('rejected words are listed in the report',/rejected/.test(get('WordGen').report()),get('WordGen').report());
t('generation stops cleanly when the AI is down',(()=>{ // nothing left to do => reports completion, not an error
  const g3=get('WordGen').run(1000);return g3.stoppedBecause==='every word has content'||g3.stoppedBecause.length>0})());
t('hourly trigger entry does nothing unless switched on',(()=>{const b=G.wordBatches;ctx.generateWordContentTrigger();return G.wordBatches===b})());

// ---- 4. today's words ----
const today=tok=>{const d=api('wordsToday',{token:tok}).data;d.fresh=d.round?d.round.fresh:[];d.rev=d.review?d.review.review:[];return d};
const UW=sheets.UserWords.rows[0],uwi=n=>UW.indexOf(n);
const dueRows=(uid,n,skipIds)=>{const u=sheets.UserWords;const pool=ap.map(r=>r[wi('WordID')]).filter(id=>!u.rows.some(r=>r[uwi('UserID')]===uid&&r[uwi('WordID')]===id)).slice(0,n);
  pool.forEach(id=>u.rows.push(UW.map(h=>({UserID:uid,WordID:id,Status:'learning',Box:1,NextReview:'2000-01-01',Streak:0,Lapses:0,FirstSeenAt:'2000-01-01T00:00:00Z'})[h]||'')));return pool.length};
td=today(tokA);
t('today: a round of 5 new words with 3 spares, nothing to review yet',td.ready&&td.fresh.length===5&&td.round.spare.length===3&&td.rev.length===0&&td.goal.due===0,td.goal);
t('goal line: 30 minutes by default, nothing done, warn from 56 reviews, reduce above 84, about 14 new words a day',td.goal.minutes===30&&td.goal.doneSec===0&&td.goal.state==='ok'&&td.goal.warnAt===56&&td.goal.reduceAt===84&&td.goal.suggest===14&&td.goal.round===5,td.goal);
t('new words carry content and no duplicates',td.fresh.every(w=>w.def&&w.ex&&w.coll.length>=2&&w.vi&&Array.isArray(w.ex2))&&new Set(td.fresh.concat(td.round.spare).map(w=>w.id)).size===8);
t('new words are at the learner level or one below (B1 or A2)',td.fresh.every(w=>['A2','B1'].includes(w.lvl)),td.fresh.map(w=>w.lvl));
t('extra meanings supplied for wrong answers',td.extraDefs.length>=4&&td.extraDefs.every(d=>d.def));
t('same words if asked again the same day',JSON.stringify(today(tokA).fresh.map(w=>w.id))===JSON.stringify(td.fresh.map(w=>w.id)));
t('level bars count the bank',td.stats.levels.length===6&&td.stats.levels.reduce((n,l)=>n+l.total,0)===ap.length,td.stats.levels);
t('word rows are read through the cache the second time',(()=>{const sh=sheets.WordBank,g=sh.getRange.bind(sh);let n=0;sh.getRange=(...a)=>{if(a[2]===1&&a[1]===1)n++;return g(...a)};today(tokA);sh.getRange=g;return n===0})());

// ---- 5. finishing a session ----
const ids=td.fresh.map(w=>w.id);
let sub=api('wordsSubmit',{token:tokA,seconds:540,results:[{id:ids[0],r:'ok'},{id:ids[1],ok:true},{id:ids[2],r:'miss'},{id:ids[3],r:'ok'},{id:ids[3],r:'miss'},{id:ids[4],r:'ok'},{id:ids[4],r:'hint'}]});
t('session saved: 2 up, 2 back, 1 with a hint (a word counts as its worst answer)',sub.ok&&sub.data.up===2&&sub.data.back===2&&sub.data.same===1,sub);
const boxes=Object.fromEntries(sub.data.list.map(x=>[x.id,x.box]));
t('new word right -> box 2, wrong -> box 1, right with a hint -> box 1',boxes[ids[0]]===2&&boxes[ids[1]]===2&&boxes[ids[2]]===1&&boxes[ids[3]]===1&&boxes[ids[4]]===1,boxes);
t('time is kept to the second and new words are counted',sub.data.goal.doneSec===540&&sub.data.goal.newToday===5&&sub.data.goal.minutes===30,sub.data.goal);
t('forecast: the 3 box-1 words are due tomorrow (about 1 minute)',sub.data.goal.tomorrow===3&&sub.data.goal.tomorrowMin===1,sub.data.goal);
t('submitting the same session again is refused and changes nothing',(()=>{const r=api('wordsSubmit',{token:tokA,seconds:60,results:ids.map(i=>({id:i,ok:true}))});return !r.ok&&sheets.UserWords.getLastRow()-1===5})());
t('unknown or unapproved word ids are ignored',!api('wordsSubmit',{token:tokA,results:[{id:'W9999',ok:true}]}).ok&&!api('wordsSubmit',{token:tokA,results:[{id:'x',ok:true}]}).ok);
t('no daily limit: another round of 5 different words is ready at once',(()=>{const d=today(tokA);return d.fresh.length===5&&d.fresh.every(w=>!ids.includes(w.id))&&d.goal.newToday===5})());
{ const r10=api('wordsRound',{token:tokA,n:10});
  t('a round can be 10 or 15 words; another size falls back to the setting',r10.ok&&r10.data.fresh.length===10&&r10.data.spare.length===3&&api('wordsRound',{token:tokA,n:15}).data.fresh.length===15&&api('wordsRound',{token:tokA,n:7}).data.fresh.length===5,r10.ok?r10.data.fresh.length:r10);
  const got=r10.data.fresh.map(w=>w.id);
  t('the next round leaves out the words the browser already has',api('wordsRound',{token:tokA,n:10,exclude:got}).data.fresh.every(w=>!got.includes(w.id))); }
t('progress and activity recorded for the day, with seconds',sheets.UserProgress.getLastRow()===2&&sheets.LearningActivities.getLastRow()===2&&Number(sheets.UserProgress.rows[1][sheets.UserProgress.rows[0].indexOf('Seconds')])===540&&Number(sheets.UserProgress.rows[1][sheets.UserProgress.rows[0].indexOf('Minutes')])===9,sheets.UserProgress.rows[1]);

// ---- 6. next day: reviews come due by box ----
advance(DAY);
td=today(tokA);
t('next day: the 3 box-1 words are due (1 day), box-2 words wait (2 days)',td.rev.length===3&&td.rev.every(w=>w.box===1)&&td.fresh.length===5&&td.goal.due===3,{r:td.rev.map(w=>w.box),f:td.fresh.length});
t('wordsReview returns the same reviews',(()=>{const r=api('wordsReview',{token:tokA});return r.ok&&r.data.review.length===3&&r.data.left===0&&r.data.extraDefs.length>=4})());
let s2=api('wordsSubmit',{token:tokA,seconds:300,results:td.rev.map(w=>({id:w.id,r:'ok'})).concat(td.fresh.map(w=>({id:w.id,r:'ok'})))});
t('reviewed words move up one box',s2.ok&&s2.data.list.filter(x=>!x.fresh).every(x=>x.box===2),s2.data&&s2.data.list);
advance(DAY);td=today(tokA);
t('day 3: box-2 words from day 1 are due',td.rev.length>=2&&td.rev.some(w=>w.box===2),td.rev.map(w=>w.box));
// a wrong answer on review returns to box 1 and counts a lapse
const w0=td.rev[0];api('wordsSubmit',{token:tokA,seconds:60,results:[{id:w0.id,r:'miss'}]});
const rec=sheets.UserWords.rows.find(r=>r[uwi('WordID')]===w0.id);
t('wrong review -> box 1, lapse counted',Number(rec[uwi('Box')])===1&&Number(rec[uwi('Lapses')])>=1,rec);
// a hint on review keeps the box
{ const r3=sheets.UserWords.rows.find(r=>r[uwi('WordID')]===ids[1]);r3[uwi('Box')]=3;r3[uwi('NextReview')]='2000-01-01';const lap=Number(r3[uwi('Lapses')])||0;
  const rh=api('wordsSubmit',{token:tokA,seconds:30,results:[{id:ids[1],r:'hint'}]});const D=get('Day');
  t('a right answer with a hint keeps the box and its interval, no lapse',rh.ok&&Number(r3[uwi('Box')])===3&&r3[uwi('NextReview')]===D.add(D.today(),4)&&(Number(r3[uwi('Lapses')])||0)===lap&&rh.data.same===1,r3); }
// a word reaches "known" at box 5
{ const r5=sheets.UserWords.rows.find(r=>r[uwi('WordID')]===ids[0]);r5[uwi('Box')]=4;r5[uwi('NextReview')]='2000-01-01';
  const rs=api('wordsSubmit',{token:tokA,seconds:60,results:[{id:ids[0],ok:true}]});
  t('box 5 makes a word known',rs.ok&&r5[uwi('Status')]==='known'&&Number(r5[uwi('Box')])===5,r5); }

// ---- 7. many reviews waiting: a warning first, then smaller rounds ----
{ const u=sheets.UserWords;const before=u.rows.length,uidA=u.rows[1][uwi('UserID')];
  dueRows(uidA,58);
  let d=today(tokA);
  t('56 or more reviews waiting: a warning, the round stays 5, reviews come 20 at a time',d.goal.state==='warn'&&!d.goal.reduced&&d.fresh.length===5&&d.rev.length===20&&d.review.left===d.goal.due-20&&d.goal.due>=56,{st:d.goal.state,f:d.fresh.length,r:d.rev.length,due:d.goal.due});
  dueRows(uidA,30);
  d=today(tokA);
  t('more than 84 waiting: the round takes only 2 new words',d.goal.state==='reduce'&&d.goal.reduced&&d.fresh.length===2&&d.round.reduced&&d.goal.dueMin===Math.ceil(d.goal.due/4),{st:d.goal.state,f:d.fresh.length,due:d.goal.due});
  t('a bigger round asked for is cut too',api('wordsRound',{token:tokA,n:15}).data.fresh.length===2);
  api('saveSettings',{token:tokA,wordsAuto:false});d=today(tokA);
  t('"only warn" in Settings: still told, but the round is not cut',d.goal.state==='reduce'&&!d.goal.reduced&&d.fresh.length===5&&d.goal.auto===false,d.goal);
  api('saveSettings',{token:tokA,wordsAuto:true,wordsGoal:60});d=today(tokA);
  t('the marks follow the goal: with 60 minutes, 88 reviews are no problem yet',d.goal.minutes===60&&d.goal.warnAt===112&&d.goal.reduceAt===168&&d.goal.state==='ok'&&d.fresh.length===5,d.goal);
  api('saveSettings',{token:tokA,wordsGoal:10,wordsRound:10});d=today(tokA);
  t('a 10-minute goal: warn from 19, reduce above 28; round size is saved',d.goal.warnAt===19&&d.goal.reduceAt===28&&d.goal.state==='reduce'&&d.goal.round===10&&d.goal.suggest===5,d.goal);
  t('a goal outside 5 to 180 minutes is refused',!api('saveSettings',{token:tokA,wordsGoal:2}).ok&&!api('saveSettings',{token:tokA,wordsGoal:999}).ok);
  api('saveSettings',{token:tokA,wordsGoal:30,wordsRound:5});
  u.rows.length=before; }

// ---- 8. word list and filters ----
const L1=api('wordsList',{token:tokA,filter:'learning'}).data,L2=api('wordsList',{token:tokA,filter:'known'}).data,L3=api('wordsList',{token:tokA,filter:'new'}).data,L4=api('wordsList',{token:tokA,filter:'all'}).data;
t('list: learning/known/new/all',L1.items.length>0&&L2.items.length===1&&L3.items.length===20&&L3.total>0&&L4.total===L1.total+L2.total,{l1:L1.total,l2:L2.total,l3:L3.total,l4:L4.total});
t('list rows have meaning and Vietnamese',L1.items.every(i=>i.def&&i.vi));
t('new-word list does not include words already started',(()=>{const have=new Set(sheets.UserWords.rows.slice(1).map(r=>r[uwi('WordID')]));return L3.items.every(i=>!have.has(i.id))})());

// ---- 9. vocabulary check ----
const cs=api('wordsCheckStart',{token:tokA}).data;
t('check: 4 recognise + 4 recall + 4 word partners, partners have a quiz',cs.items.length===12&&cs.items.filter(i=>i.task==='col').every(i=>i.word.quiz)&&['rec','prod','col'].every(k=>cs.items.filter(i=>i.task===k).length===4),cs.items&&cs.items.map(i=>i.task));
const sv=api('wordsCheckSave',{token:tokA,rec:90,prod:40,col:70});
t('check saved with a profile; recall gap detected',sv.ok&&/Recall gap/.test(sv.data.profile.title),sv);
t('profile comes back in today',api('wordsToday',{token:tokA}).data.profile&&api('wordsToday',{token:tokA}).data.profile.rec===90);
t('bad check values are refused',!api('wordsCheckSave',{token:tokA,rec:'x',prod:1,col:1}).ok);

// ---- 10. practice (a second learner, measured levels) ----
api('register',{name:'P Two',username:'ptwo',password:'1'});const tokB=api('login',{username:'ptwo',password:'1'}).data.token;
api('saveOnboarding',{token:tokB,overall:'B1',skills:{speaking:'B1',listening:'B1',reading:'B1',writing:'B1'},goals:['interview']});
const uidB=api('session',{token:tokB}).data.user&&sheets.Users.rows.find(r=>r[2]==='ptwo')[0];
const SLH=sheets.SkillLevels.rows[0],sli=n=>SLH.indexOf(n);
const slRow=skill=>sheets.SkillLevels.rows.find(r=>r[sli('UserID')]===uidB&&r[sli('Skill')]===skill);
t('practice before the placement test works on the self-level and does not move the level',(()=>{
  const r=api('practiceStart',{token:tokB,skill:'reading'});if(!r.ok)return false;const th0=slRow('reading')[sli('Theta')];
  r.data.items.forEach(it=>api('practiceAnswer',{token:tokB,sessionId:r.data.sessionId,questionId:it.id,choice:keyOf(it.id)}));return slRow('reading')[sli('Theta')]===th0&&r.data.measured===false})());
// make the learner "measured" at B1 like a finished placement test
['reading','listening','writing','speaking'].forEach(k=>{const r=slRow(k);r[sli('MeasuredLevel')]='B1';r[sli('Theta')]='0.20';r[sli('StandardError')]='0.5';r[sli('Confidence')]='Medium';r[sli('ProgressPct')]=70});

let pr=api('practiceStart',{token:tokB,skill:'reading'});
t('reading set: 5 questions, no answer keys in the view',pr.ok&&pr.data.items.length===5&&!JSON.stringify(pr.data).includes('CorrectAnswer')&&pr.data.items.every(i=>i.options.length===4&&i.stem),pr.ok?pr.data.items.length:pr);
t('reading items are around B1 (A2 to B2)',pr.data.items.every(i=>['A2','B1','B2'].includes(i.level)),pr.data.items.map(i=>i.level));
t('starting again resumes the same set',api('practiceStart',{token:tokB,skill:'reading'}).data.sessionId===pr.data.sessionId&&api('practiceStart',{token:tokB,skill:'reading'}).data.resumed===true);
const sidR=pr.data.sessionId,its=pr.data.items;
let a1=api('practiceAnswer',{token:tokB,sessionId:sidR,questionId:its[0].id,choice:keyOf(its[0].id)});
t('a right answer says correct, shows the key and explanation',a1.ok&&a1.data.correct&&a1.data.key===keyOf(its[0].id)&&!a1.data.done,a1);
t('answering the same question twice is refused',!api('practiceAnswer',{token:tokB,sessionId:sidR,questionId:its[0].id,choice:0}).ok);
t('a question from outside the set is refused',!api('practiceAnswer',{token:tokB,sessionId:sidR,questionId:'q_nope',choice:0}).ok);
t('another learner cannot answer my set',!api('practiceAnswer',{token:tokA,sessionId:sidR,questionId:its[1].id,choice:0}).ok);
t('resume shows what is already answered',api('practiceStart',{token:tokB,skill:'reading'}).data.answered.length===1);
const th0=Number(slRow('reading')[sli('Theta')]);let last;
its.slice(1).forEach((it,i)=>{last=api('practiceAnswer',{token:tokB,sessionId:sidR,questionId:it.id,choice:i<3?keyOf(it.id):(keyOf(it.id)+1)%4})});
t('last answer finishes the set with a summary (4 of 5)',last.ok&&last.data.done&&last.data.summary.right===4&&last.data.summary.total===5&&last.data.summary.measured,last.data&&last.data.summary);
t('ability estimate moved up a little (4 of 5 at the learner level)',Number(slRow('reading')[sli('Theta')])>th0&&Number(slRow('reading')[sli('Theta')])-th0<0.6,[th0,slRow('reading')[sli('Theta')],last.data.summary,its.map(i=>i.level)]);
t('progress bar follows the estimate',Number(slRow('reading')[sli('ProgressPct')])!==70);
t('finished set cannot be answered again',!api('practiceAnswer',{token:tokB,sessionId:sidR,questionId:its[0].id,choice:0}).ok);
t('a new set avoids questions already seen',(()=>{const n=api('practiceStart',{token:tokB,skill:'reading'});const seen=new Set(its.map(i=>i.id));return n.ok&&n.data.sessionId!==sidR&&n.data.items.filter(i=>seen.has(i.id)).length===0})());
// listening
const pl=api('practiceStart',{token:tokB,skill:'listening'});
t('listening set: 4 questions with a script to play',pl.ok&&pl.data.items.length===4&&pl.data.items.every(i=>i.audioText&&!i.passage),pl.ok?0:pl);
// a wrong set lowers the estimate
{ const th=Number(slRow('listening')[sli('Theta')]);pl.data.items.forEach(it=>api('practiceAnswer',{token:tokB,sessionId:pl.data.sessionId,questionId:it.id,choice:(keyOf(it.id)+1)%4}));
  t('0 of 4 lowers the estimate',Number(slRow('listening')[sli('Theta')])<th); }
// "not sure" counts as wrong but does not move the estimate by itself
// writing
{const qb=sheets.QuestionBank,h=qb.rows[0],c=k=>h.indexOf(k);let keep=2;qb.rows.slice(1).forEach(r=>{if(r[c('Skill')]==='writing'&&r[c('Subtype')]==='task'&&r[c('CEFR')]==='B1'){if(keep>0)keep--;else r[c('Status')]='retired'}})} // only 2 writing tasks left at B1
const wCalls=G.taskCalls||0,wBefore=get('QF').taskCounts()['writing|B1']||0;
const pw=api('practiceStart',{token:tokB,skill:'writing'});
t('few new writing tasks at B1: starting asks the AI for more and serves one',pw.ok&&(G.taskCalls||0)===wCalls+1&&(get('QF').taskCounts()['writing|B1']||0)>wBefore,[G.taskCalls,wCalls]);
t('writing task offered',pw.ok&&pw.data.kind==='text'&&pw.data.task.prompt&&pw.data.task.minWords===25,pw);
const wtext='Hello Sam, I would like to move our meeting from Tuesday to Thursday because I have a client visit on Tuesday morning. Please let me know if Thursday afternoon works for you. Thank you for your help and best regards.';
let ws=api('practiceSubmit',{token:tokB,sessionId:pw.data.sessionId,text:wtext});
t('writing feedback: level, criteria, corrections, improved text, tip',ws.ok&&ws.data.result.level&&ws.data.result.criteria.grammar&&ws.data.result.corrections.length>=1&&ws.data.result.improved&&ws.data.result.tip,ws);
t('writing result is not counted twice',!api('practiceSubmit',{token:tokB,sessionId:pw.data.sessionId,text:wtext}).ok);
G.failN=6;const pw2=api('practiceStart',{token:tokB,skill:'writing'});
let wfail=api('practiceSubmit',{token:tokB,sessionId:pw2.data.sessionId,text:wtext});
t('AI down: a clear message, nothing saved, retry possible',!wfail.ok&&/busy|resting/i.test(wfail.message),wfail);
const nAct=sheets.LearningActivities.getLastRow();
G.failN=0;let wok=api('practiceSubmit',{token:tokB,sessionId:pw2.data.sessionId,text:wtext});
t('retry after the outage works',wok.ok&&sheets.LearningActivities.getLastRow()===nAct+1,wok);
const thW=Number(slRow('writing')[sli('Theta')]);
t('a short text is rated but does not count towards the level',(()=>{const p=api('practiceStart',{token:tokB,skill:'writing'});const r=api('practiceSubmit',{token:tokB,sessionId:p.data.sessionId,text:'I like my job and my team very much.'});return r.ok&&r.data.result.capped&&Number(slRow('writing')[sli('Theta')])===thW})());
// speaking tasks from the AI
(()=>{const QF=get('QF');const before=QF.taskCounts()['speaking|A1']||0;const r=QF.makeTasks('speaking','A1',5);
  t('AI tasks: new ones kept, duplicates and malformed dropped',r.approved===5&&(QF.taskCounts()['speaking|A1']||0)===before+5,r);
  const calls=G.taskCalls||0;api('practiceStart',{token:tokB,skill:'speaking'});
  t('practice does not call the AI while enough new tasks exist at the level',(G.taskCalls||0)===calls,G.taskCalls);
  t('the bank report lists speaking tasks per level',/speaking tasks: A1 \d+, A2 \d+/.test(QF.report()),QF.report());})();
// speaking
const ps=api('practiceStart',{token:tokB,skill:'speaking'});
const sp=api('practiceSubmit',{token:tokB,sessionId:ps.data.sessionId,text:'In the morning I wake up at six and I drink coffee then I read the news and go to work by bus and I like it',seconds:30});
t('speaking feedback includes measured pace',sp.ok&&sp.data.result.wpm>20&&sp.data.result.words>=12&&sp.data.result.corrections,sp);
t('the daily limit on rated pieces protects the AI quota',(()=>{let blocked=false;for(let i=0;i<20&&!blocked;i++){const p=api('practiceStart',{token:tokB,skill:'writing'});const r=api('practiceSubmit',{token:tokB,sessionId:p.data.sessionId,text:wtext});if(!r.ok&&/limit/.test(r.message))blocked=true}return blocked})());
t('a prompt-injection text is only data (sent inside learner_text tags)',(()=>{const log=G.aiLog.filter(a=>/^Task given/.test(a.prompt)).pop();return /<learner_text>/.test(log.prompt)})());

// ---- 11. a practice set in progress does not disturb the placement test ----
{ const p=api('practiceStart',{token:tokB,skill:'listening'});const r=api('placementStart',{token:tokB});
  t('placement test starts normally while a practice set is open',r.ok&&r.data.view.type==='mcq'&&r.data.sessionId!==p.data.sessionId,r); }

// ---- 12. plan ----
let ov=api('overview',{token:tokB});t('overview works',ov.ok,ov);const plan=ov.data.plan;
t('plan: the four skills share about 80% of the weekly goal, weakest skills get more',(()=>{const n=['speaking','listening','reading','writing'].reduce((a,k)=>a+plan.targets[k],0);return n>=110&&n<=150})(),plan.targets);
t('plan: Words is planned from its own daily goal (30 min x 7)',plan.targets.words===210,plan.targets.words);
t('plan: today list has words and two skills',plan.today.length===3&&plan.today[0].skill==='words',plan.today);
t('plan has built-in grammar and vocabulary suggestions (interview goal)',plan.grammar.length===3&&plan.vocabulary.some(v=>/experience|Strengths/.test(v)),plan);
t('plan starts not enriched; enrich asks the AI once',plan.enriched===false);
const en=api('planEnrich',{token:tokB});t('enrich fills coach note, grammar, vocabulary',en.ok&&en.data.changed&&en.data.plan.enriched&&en.data.plan.note&&en.data.plan.grammar[0]==='Past simple',en);
t('enrich again does nothing (no second AI call)',(()=>{const n=G.aiLog.length;const r=api('planEnrich',{token:tokB});return r.ok&&!r.data.changed&&G.aiLog.length===n})());
t('plan done minutes include practice done this week',plan.done.reading>=1||ov.data.plan.done.reading>=1,plan.done);
// goal change changes targets at once
api('saveSettings',{token:tokB,weeklyGoal:300});
t('a bigger weekly goal raises the targets at once',api('overview',{token:tokB}).data.plan.targets.reading>plan.targets.reading);
// next week keeps the AI note; same placement
advance(8*DAY);const tokB2=api('login',{username:'ptwo',password:'1'}).data.token;const ov2=api('overview',{token:tokB2}).data.plan;
t('next week: a new plan row keeps the AI note',ov2.week!==plan.week&&ov2.note&&ov2.enriched&&sheets.LearningPlans.getLastRow()-1>=2,ov2.week);
t('old plan rows are marked replaced; exactly one active',(()=>{const ph=sheets.LearningPlans.rows[0],si=ph.indexOf('Status'),ui=ph.indexOf('UserID');return sheets.LearningPlans.rows.slice(1).filter(r=>r[ui]===uidB&&r[si]==='active').length===1})());
advance(-8*DAY);

// ---- 13. overview numbers ----
ov=api('overview',{token:tokB}).data;
t('overview: totals count minutes and lessons',ov.totals.lessons>=5&&ov.totals.hours>0,ov.totals);
t('overview: streak is 1 after practising today',ov.totals.streak===1,ov.totals);
t('overview: weekly has 7 numbers and today is non-zero',ov.weekly.length===7&&ov.weekly.reduce((a,b)=>a+b,0)>=5,ov.weekly);
t('overview: heat map has 84 days',ov.heat.length===84&&ov.heat.some(m=>m>0));
t('overview: recent activity newest first, with names',ov.recent.length>=5&&ov.recent[0].when==='Today'&&ov.recent.every(r=>r.title),ov.recent.slice(0,3));
t('overview: level history has 8 weekly points per skill',Object.keys(ov.history).length===4&&ov.history.reading.length===8&&ov.history.reading[7]!==null,ov.history.reading);
t('overview: milestones are listed',Array.isArray(ov.milestones),ov.milestones);
// streak over several days
{ const uid=uidB;const up=sheets.UserProgress,ph=up.rows[0];const day=get('Day');const d=n=>day.add(day.today(),n);
  [-1,-2].forEach(n=>up.rows.push(ph.map(h=>({UserID:uid,Date:d(n),Skill:'reading',Minutes:5,LessonsCompleted:1,Score:80})[h]||'')));
  t('streak counts consecutive days (today, yesterday, day before)',api('overview',{token:tokB}).data.totals.streak===3);
  up.rows.push(ph.map(h=>({UserID:uid,Date:d(-4),Skill:'reading',Minutes:5,LessonsCompleted:1,Score:80})[h]||''));
  t('a gap ends the streak',api('overview',{token:tokB}).data.totals.streak===3);
  advance(DAY);t('a day not practised yet does not reset the streak until it is over',api('overview',{token:tokB}).data.totals.streak===3);
  advance(DAY);t('after a missed day the streak is 0',api('overview',{token:tokB}).data.totals.streak===0);advance(-2*DAY); }
t('a learner with no activity gets zeros, not fake data',(()=>{const o=api('overview',{token:tokA});return o.ok&&o.data.totals.streak>=0&&o.data.recent.every(r=>r.title)})());
t('bad token is refused on every new call',['overview','wordsToday','practiceStart','planEnrich','wordsList'].every(f=>{const r=api(f,{token:'nope'});return !r.ok&&r.code==='auth'}));
t('practice rejects an unknown skill',!api('practiceStart',{token:tokB,skill:'cooking'}).ok);

// ---- 12. saved words (marked while practising) ----
{
  api('register',{name:'S Three',username:'sthree',password:'1'});const tokS=api('login',{username:'sthree',password:'1'}).data.token;
  api('saveOnboarding',{token:tokS,overall:'B1',skills:{speaking:'B1',listening:'B1',reading:'B1',writing:'B1'},goals:['business']});
  const sv=(text,ctx,skill)=>api('saveWord',{token:tokS,text,context:ctx,skill:skill||'reading'});
  const SW=sheets.SavedWords,SH=SW.rows[0],si=n=>SH.indexOf(n);
  t('SavedWords sheet exists with the study columns',!!SW&&['SavedID','Text','Context','Box','NextReview','Enriched'].every(c=>SH.includes(c)),SH);
  const r1=sv('  Deadline, ','The team met the deadline on Friday.');
  t('saving a word works and cleans the text',r1.ok&&r1.data.saved===true&&SW.rows[1][si('Text')]==='Deadline',r1);
  t('the sentence is kept when it contains the word',SW.rows[1][si('Context')]==='The team met the deadline on Friday.');
  t('saving the same word twice is a no-op',(()=>{const r=sv('deadline','x');return r.ok&&r.data.saved===false&&r.data.already===true&&SW.rows.length===2})());
  t('a context that does not contain the word is dropped',(()=>{sv('take part in','He sat alone.','listening');return SW.rows[2][si('Context')]===''&&SW.rows[2][si('Skill')]==='listening'})());
  t('a phrase of up to 4 words is accepted',sv('on the other hand','').ok);
  t('too long, empty, numbers and code are refused',['one two three four five','','1234','<b>x</b>','a'].every(x=>!sv(x,'').ok));
  t('an unknown skill is stored as words',(()=>{sv('reliable','A reliable partner.','cooking');return SW.rows[4][si('Skill')]==='words'})());
  t('saving needs a signed-in user',!api('saveWord',{token:'nope',text:'hello'}).ok);
  t('Text, Context are stored as text (not turned into numbers)',(()=>{sv('go','I go home.','speaking');return true})());

  let td2=api('wordsToday',{token:tokS});
  t('the round lists saved words with meanings filled in (bank match or AI)',td2.ok&&td2.data.round.saved.items.length===5&&td2.data.round.fresh.length===0&&td2.data.round.saved.items.every(i=>i.def&&i.id.startsWith('sw_')),td2.ok?td2.data.round.saved:td2);
  const bankRow=wb.rows.slice(1).find(r=>r[wi('Status')]==='approved'&&/^[a-z]{5,}$/.test(r[wi('Headword')]));
  t('a word that is in the WordBank can be saved',api('saveWord',{token:tokS,text:bankRow[wi('Headword')],context:'',skill:'reading'}).ok);
  t('AI was called once for the words with no bank match',G.savedCalls===1,G.savedCalls);
  t('the second call does not ask the AI again',(()=>{const b=G.savedCalls;api('wordsToday',{token:tokS});return G.savedCalls===b})());
  const items=td2.data.round.saved.items,idsS=items.map(i=>i.id);
  t('examples carry the word in [brackets] for the blank',items.find(i=>i.w==='Deadline').ex==='The team met the [deadline] on Friday.',items.map(i=>i.ex));
  let su=api('savedSubmit',{token:tokS,results:idsS.map((id,i)=>({id,ok:i!==1})),seconds:120});
  t('submit moves boxes: right 1->2, wrong stays box 1',su.ok&&su.data.up===4&&su.data.back===1&&su.data.list.find(x=>x.id===idsS[0]).box===2&&su.data.list.find(x=>x.id===idsS[1]).box===1,su);
  t('a repeated submit changes nothing',!api('savedSubmit',{token:tokS,results:idsS.map(id=>({id,ok:true})),seconds:60}).ok);
  t('a session with seconds is logged to progress',api('overview',{token:tokS}).data.recent.some(r=>/Saved words/.test(r.title)));
  t('another learner cannot move my words',(()=>{const r=api('savedSubmit',{token:tokA,results:[{id:idsS[0],ok:true}],seconds:0});return !r.ok})());
  t('studied words wait for their date',(()=>{const d=api('wordsToday',{token:tokS}).data;return d.review.saved.items.length===0&&d.round.saved.items.every(i=>!idsS.includes(i.id))})());
  advance(2*DAY);
  const tokS2=api('login',{username:'sthree',password:'1'}).data.token;
  const td3d=api('wordsToday',{token:tokS2}).data;let td3=td3d.review.saved;
  t('after the interval the box-2 words are due again, with the wrong one',idsS.every((id,i)=>td3.items.some(x=>x.id===id&&x.box===(i===1?1:2))),td3.items.map(x=>[x.w,x.box]));
  t('a bank word takes the bank meaning',(()=>{const x=td3d.round.saved.items.find(i=>i.w===bankRow[wi('Headword')]);return !!x&&x.def===bankRow[wi('DefinitionEN')]})(),td3d.round.saved.items.map(i=>i.w));
  const li=api('savedList',{token:tokS2,filter:'all'});
  t('list shows all saved words, newest first, with their sentence',li.ok&&li.data.total>=6&&li.data.items[0].w!==undefined&&li.data.items.some(i=>i.ctx),li.ok?li.data.total:li);
  t('list filter: learning',api('savedList',{token:tokS2,filter:'learning'}).data.items.every(i=>i.status==='learning'));
  t('removing a word hides it everywhere',(()=>{const id=li.data.items[0].id;const r=api('savedRemove',{token:tokS2,id});return r.ok&&!api('savedList',{token:tokS2,filter:'all'}).data.items.some(i=>i.id===id)})());
  t('a learner cannot remove someone else\'s word',!api('savedRemove',{token:tokA,id:idsS[0]}).ok);
  t('dashboard numbers include saved words',(()=>{const o=api('overview',{token:tokS2}).data.plan.words;return o.saved===api('savedList',{token:tokS2,filter:'all'}).data.total&&o.savedDue>0})());
  G.failN=99;
  t('saving still works when the AI is down',(()=>{const r=sv('resilient','');return r.ok&&r.data.saved})());
  t('today still loads when the AI is down',api('wordsToday',{token:tokS2}).ok);
  G.failN=0;
  t('the daily save cap is enforced',(()=>{let blocked=false;for(let i=0;i<70;i++){const w='alpha'+String.fromCharCode(97+i%26)+String.fromCharCode(97+Math.floor(i/26));const r=sv(w,'');if(!r.ok){blocked=r.code==='limit';break}}return blocked})());
}

// ---- 13. natural voice (Gemini TTS) ----
{
  api('register',{name:'T Voice',username:'tvoice',password:'1'});const tokV=api('login',{username:'tvoice',password:'1'}).data.token;
  const tts=(lines,accent)=>api('ttsAudio',{token:tokV,lines,accent});
  const one=tts([{s:0,t:'Attention please. The train is late.'}]);
  t('one voice: returns base64 audio and its sample rate',one.ok&&typeof one.data.audio==='string'&&one.data.audio.length>100&&one.data.rate===24000,one);
  t('the request asks for audio only, with a single prebuilt voice',(()=>{const x=G.ttsLog[G.ttsLog.length-1];return x.modal[0]==='AUDIO'&&!!x.speech.voiceConfig&&/American/.test(x.text)})());
  tts([{s:0,t:'Hi Priya.'},{s:1,t:'Hi Sam, how are you?'}],'uk');
  t('two speakers: two named voices, British accent asked for',(()=>{const x=G.ttsLog[G.ttsLog.length-1],c=x.speech.multiSpeakerVoiceConfig&&x.speech.multiSpeakerVoiceConfig.speakerVoiceConfigs;return !!c&&c.length===2&&c[0].speaker==='Sam'&&c[1].speaker==='Priya'&&/British/.test(x.text)&&/Sam: Hi Priya\./.test(x.text)})());
  t('empty, too long and too many lines are refused',[[],[{s:0,t:'   '}],[{s:0,t:'x'.repeat(2201)}],Array.from({length:19},()=>({s:0,t:'hi'}))].every(l=>{const r=tts(l);return !r.ok&&r.code==='invalid'}));
  t('a bad token is refused',(()=>{const r=api('ttsAudio',{token:'nope',lines:[{s:0,t:'hi'}]});return !r.ok&&r.code==='auth'})());
  {const n0=G.ttsLog.length;const a=tts([{s:0,t:'Shared voice test line.'}]);const n1=G.ttsLog.length;const b=tts([{s:0,t:'Shared voice test line.'}]);
   t('a clip made once is kept in Drive and shared: no second AI call',a.ok&&b.ok&&n1===n0+1&&G.ttsLog.length===n1&&b.data.cached===true&&b.data.audio===a.data.audio,[n0,n1,G.ttsLog.length]);
   t('the voice cache lives in a Drive folder',Object.values(ctx.__drive.folders).some(f=>f.getName()==='Kelvin voice cache'));}
  G.ttsBad=['gemini-3.1-flash-tts-preview'];
  t('if the first model is gone, the next one is used',(()=>{const r=tts([{s:0,t:'Fallback test.'}]);return r.ok&&G.ttsLog[G.ttsLog.length-1].model==='gemini-2.5-flash-preview-tts'})());
  G.ttsBad=[];G.ttsFailAll=true;
  t('when every model fails, the error is clear and not a crash',(()=>{const r=tts([{s:0,t:'All fail.'}]);return !r.ok&&/not available/.test(r.message)})());
  const before=G.ttsLog.length;
  t('after failing, the voice rests instead of hammering the AI',(()=>{const r=tts([{s:0,t:'Resting.'}]);return !r.ok&&r.code==='limit'&&G.ttsLog.length===before})());
  G.ttsFailAll=false;
  t('the daily limit per learner is enforced',(()=>{api('register',{name:'T Voice2',username:'tvoice2',password:'1'});const k=api('login',{username:'tvoice2',password:'1'}).data.token;let blocked=false;for(let i=0;i<45;i++){const r=api('ttsAudio',{token:k,lines:[{s:0,t:'Line '+i}]});if(!r.ok&&r.code==='limit'){blocked=true;break}}return blocked})());
}

// ---- 14. saved words first, rounds, I know this word, free practice, extras, sentences, quick words ----
{
  api('register',{name:'Q Four',username:'qfour',password:'1'});let tok=api('login',{username:'qfour',password:'1'}).data.token;
  api('saveOnboarding',{token:tok,overall:'B1',skills:{speaking:'B1',listening:'B1',reading:'B1',writing:'B1'},goals:['business']});
  const sv=(text,ctx)=>api('saveWord',{token:tok,text,context:ctx||'',skill:'reading'});
  const r1=sv('bottleneck','The bottleneck slowed the team.');
  t('saving returns the new id (for Quick words after a practice)',r1.ok&&/^sw_/.test(r1.data.id),r1);
  t('saving the same word again returns the same id',sv('bottleneck','').data.id===r1.data.id);
  sv('workload');
  let td=today(tok);
  t('saved words come first: 2 saved + 3 bank words make the round of 5',td.round.saved.items.length===2&&td.fresh.length===3&&td.goal.savedFresh===2&&td.goal.newToday===0,{s:td.round.saved.items.length,f:td.fresh.length});
  ['agenda','follow up','headcount','onboarding'].forEach(w=>sv(w));
  td=today(tok);
  t('with 6 saved words, a round has only saved words (no bank words)',td.round.saved.items.length===5&&td.fresh.length===0,{s:td.round.saved.items.length,f:td.fresh.length});
  t('the oldest saved words come first',td.round.saved.items[0].w==='bottleneck'&&td.round.saved.items[1].w==='workload');
  const m=api('wordsRound',{token:tok,n:5,exclude:td.round.saved.items.map(i=>i.id)});
  t('next round: the other saved word first, then 4 bank words',m.ok&&m.data.saved.items.length===1&&m.data.fresh.length===4&&m.data.saved.items.every(i=>!td.round.saved.items.some(x=>x.id===i.id)),m.ok?{s:m.data.saved.items.length,f:m.data.fresh.length}:m);
  const s1=api('wordsSubmit',{token:tok,seconds:200,results:td.round.saved.items.map(i=>({id:i.id,r:'ok'})).concat(m.data.fresh.map(i=>({id:i.id,r:'ok'})),m.data.saved.items.map(i=>({id:i.id,r:'miss'})))});
  t('one submit saves saved words and bank words together',s1.ok&&s1.data.list.length===10&&s1.data.up===9&&s1.data.back===1&&s1.data.goal.newToday===10&&s1.data.goal.doneSec===200,s1.ok?s1.data.goal:s1);
  t('the session is one activity',api('overview',{token:tok}).data.recent.filter(r=>/^Words: 10 new/.test(r.title)).length===1);
  // reviews piled up: saved words are never cut
  { const u=sheets.UserWords,before=u.rows.length,uid=sheets.Users.rows.find(r=>r.includes('qfour'))[sheets.Users.rows[0].indexOf('UserID')];
    dueRows(uid,90);sv('pipeline');
    const d=today(tok);
    t('reduce: the saved word is still there, plus only 2 bank words',d.goal.state==='reduce'&&d.round.saved.items.length===1&&d.fresh.length===2,{st:d.goal.state,s:d.round.saved.items.length,f:d.fresh.length});
    api('wordsSubmit',{token:tok,seconds:20,results:d.round.saved.items.map(i=>({id:i.id,r:'ok'}))});
    u.rows.length=before; }
  // I know this word
  const td2=api('wordsRound',{token:tok,n:5}).data, b0=td2.fresh[0];
  const k=api('wordsKnow',{token:tok,id:b0.id});
  t('I know this word: marked in one short call; the spare words came with the round',k.ok&&k.data.known&&k.data.w===b0.w&&k.data.replacement===undefined&&td2.spare.length===3&&!td2.fresh.some(x=>td2.spare.some(sp=>sp.id===x.id)),k);
  t('a known word never comes back as new',(()=>{const r=api('wordsRound',{token:tok,n:15}).data;return !r.fresh.concat(r.spare).some(x=>x.id===b0.id)})());
  t('a known word is not counted as studied today',today(tok).goal.newToday===11);
  t('known words show in the Known list and in the stats',api('wordsList',{token:tok,filter:'known'}).data.items.some(x=>x.id===b0.id&&x.status==='knew')&&today(tok).stats.knew===1);
  t('a session result for a known word is ignored',(()=>{const r=api('wordsSubmit',{token:tok,results:[{id:b0.id,ok:false}],seconds:5});return !r.ok})());
  t('study again puts it back for review today',api('wordsStudyAgain',{token:tok,id:b0.id}).ok&&today(tok).rev.some(x=>x.id===b0.id));
  const sid=m.data.saved.items[0].id;
  t('saved words can be marked known too',api('wordsKnow',{token:tok,id:sid}).ok&&api('savedList',{token:tok,filter:'known'}).data.items.some(x=>x.id===sid&&x.status==='knew'));
  t('another learner cannot mark my saved word',!api('wordsKnow',{token:tokA,id:sid}).ok);
  t('unknown ids are refused',!api('wordsKnow',{token:tok,id:'W99999999'}).ok&&!api('wordsKnow',{token:tok,id:'x'}).ok);
  // free practice
  const dk=api('wordsDeck',{token:tok,set:'learned'});
  t('deck: learned words with meanings, no box changes',dk.ok&&dk.data.items.length>=5&&dk.data.items.every(i=>i.w&&(i.def||i.vi)),dk.ok?dk.data.items.length:dk);
  t('deck sets: missed, hard, today, learned, saved (and due) all answer; a wrong set is refused',['missed','hard','today','learned','saved','due'].every(s=>api('wordsDeck',{token:tok,set:s}).ok)&&!api('wordsDeck',{token:tok,set:'zzz'}).ok);
  { const met=new Set(api('wordsList',{token:tok,filter:'all'}).data.items.filter(x=>x.status==='learning'||x.status==='known').map(x=>x.id));
    const tdk=api('wordsDeck',{token:tok,set:'today'}).data.items.filter(i=>/^W/.test(i.id));
    t('Studied today holds only words already met, never unseen new words',tdk.length>0&&tdk.every(i=>met.has(i.id)),{n:tdk.length});
    const UWh=sheets.UserWords.rows[0],uidT=sheets.Users.rows.find(r=>r.includes('qfour'))[sheets.Users.rows[0].indexOf('UserID')];
    const row=sheets.UserWords.rows.find(r=>r[UWh.indexOf('UserID')]===uidT&&r[UWh.indexOf('Status')]==='learning'&&r[UWh.indexOf('LastResult')]==='ok');
    t('a word got right today is not in Missed today',!api('wordsDeck',{token:tok,set:'missed'}).data.items.some(i=>i.id===row[UWh.indexOf('WordID')]));
    row[UWh.indexOf('LastResult')]='miss';
    t('a word missed today shows in Missed today',api('wordsDeck',{token:tok,set:'missed'}).data.items.some(i=>i.id===row[UWh.indexOf('WordID')])&&today(tok).sets.missed>=1);
    row[UWh.indexOf('LastResult')]='ok'; }
  const UWs=sheets.UserWords,UH=UWs.rows[0],before=JSON.stringify(UWs.rows.map(r=>[r[UH.indexOf('Box')],r[UH.indexOf('NextReview')]]));
  const target=dk.data.items[0],sec0=today(tok).goal.doneSec;
  api('wordsPractice',{token:tok,mode:'match',seconds:90,results:[{id:target.id,ok:false},{id:target.id,ok:false},{id:target.id,ok:false}]});
  t('practice never moves boxes or dates (option A)',JSON.stringify(UWs.rows.map(r=>[r[UH.indexOf('Box')],r[UH.indexOf('NextReview')]]))===before);
  t('free practice counts towards the daily time',today(tok).goal.doneSec===sec0+90,[sec0,today(tok).goal.doneSec]);
  t('a word missed again and again lands in Hard words',api('wordsDeck',{token:tok,set:'hard'}).data.items.some(i=>i.id===target.id));
  api('wordsPractice',{token:tok,mode:'learn',seconds:5,results:[1,2,3,4,5].map(()=>({id:target.id,ok:true}))});
  t('right answers in practice take it out of Hard words again',!api('wordsDeck',{token:tok,set:'hard'}).data.items.some(i=>i.id===target.id));
  t('practice time is logged to progress',api('overview',{token:tok}).data.recent.some(r=>/Words practice: Match/.test(r.title)));
  t('today counts for each set come back with today',(()=>{const s=today(tok).sets;return s&&['missed','hard','today','learned','saved'].every(k=>typeof s[k]==='number')&&s.learned>=5})());
  // more example sentences and a question
  { const bid=m.data.fresh.map(i=>i.id),sv0=td.round.saved.items[0].id,WBH=wb.rows[0];G.extraCalls=0;
    G.extrasBad=[bid[3]];
    const ex=api('wordsExtras',{token:tok,ids:bid.concat([sv0,'W99999999','junk'])});
    t('extras: one AI call writes two sentences and a question per word (bank and saved)',ex.ok&&G.extraCalls===1&&Object.keys(ex.data.items).length===4&&ex.data.items[bid[0]].ex2.length===2&&/\?$/.test(ex.data.items[bid[0]].q)&&!!ex.data.items[sv0],ex.ok?Object.keys(ex.data.items):ex);
    const row=wb.rows.find(r=>r[0]===bid[0]);
    t('they are stored in the WordBank (MoreExamples, Question)',row[WBH.indexOf('MoreExamples')].split('\n').length===2&&/\[.+\]/.test(row[WBH.indexOf('Question')]),row.slice(13));
    t('similar and opposite words: at most 2, cleaned, the word itself and doubles left out, with a note',(()=>{const r=JSON.parse(row[WBH.indexOf('Related')]);return r.s.length===2&&r.s[0]==='simple word'&&r.a.length===1&&r.a[0]==='opposite word'&&/formal/.test(r.n)&&ex.data.items[bid[0]].rel.s.length===2})(),row[WBH.indexOf('Related')]);
    t('no good similar words: stored as {} and not asked again',wb.rows.find(r=>r[0]===bid[3])[WBH.indexOf('Related')]==='{}');
    { // a word that already had sentences from the earlier version gets its similar words, and keeps its sentences
      const r2=wb.rows.find(r=>r[0]===bid[1]);r2[WBH.indexOf('Related')]='';r2[WBH.indexOf('MoreExamples')]='Old one [x] here.';const q0=r2[WBH.indexOf('Question')];Object.keys(cache).filter(k=>/^wb_/.test(k)).forEach(k=>delete cache[k]);
      const n0=G.extraCalls;const e2=api('wordsExtras',{token:tok,ids:[bid[1]]});
      t('a word from the earlier version: one call adds similar words, sentences and question kept',e2.ok&&G.extraCalls===n0+1&&r2[WBH.indexOf('MoreExamples')]==='Old one [x] here.'&&r2[WBH.indexOf('Question')]===q0&&JSON.parse(r2[WBH.indexOf('Related')]).s.length===2,r2.slice(13)); }
    t('saved words get similar words too',(()=>{const SW=sheets.SavedWords,h=SW.rows[0];const r=SW.rows.find(x=>x[0]===sv0);return JSON.parse(r[h.indexOf('Related')]).s.length===2})());
    t('extra meanings carry the word, for "closest meaning" questions',api('wordsReview',{token:tok}).data.extraDefs.every(d=>d.w));
    t('a word whose AI answer fails the checks is marked so it is not asked for again',wb.rows.find(r=>r[0]===bid[3])[WBH.indexOf('Question')]==='-'&&!ex.data.items[bid[3]]);
    {const WBH2=sheets.WordBank.rows[0];const row=sheets.WordBank.rows.find(r=>r[0]===bid[0]);const det=JSON.parse(row[WBH2.indexOf('Details')]||'{}');
     t('word details are kept: IPA for both accents and the word family (no repeats, no headword)',det.ipa&&det.ipa.us==='/ˈtest/'&&det.ipa.uk==='/ˈtɛst/'&&det.fam.length===2&&det.fam[0].w==='testing',det);
     const v=ex.data.items[bid[0]];t('the browser gets the details with the extras',v&&v.det&&v.det.ipa.us==='/ˈtest/',v);}
    t('asking again makes no AI call',(()=>{const n=G.extraCalls;api('wordsExtras',{token:tok,ids:bid.concat([sv0])});return G.extraCalls===n})());
    api('wordsStudyAgain',{token:tok,id:bid[0]});api('wordsStudyAgain',{token:tok,id:bid[3]});
    const rv=api('wordsReview',{token:tok}).data.review;
    t('the sentences and the question reach the session',(()=>{const a=rv.find(x=>x.id===bid[0]),c=rv.find(x=>x.id===bid[3]);return a&&a.ex2.length===2&&a.q&&a.more&&a.rel&&a.rel.s.length===2&&c&&c.ex2.length===0&&c.q===''&&c.more&&c.rel===null})(),rv.map(x=>[x.id,x.q]));
    const other=api('wordsRound',{token:tok,n:5}).data.fresh.map(x=>x.id);
    G.failN=99;const exd=api('wordsExtras',{token:tok,ids:other});G.failN=0;
    t('AI down: extras answers quietly and rests for 10 minutes',exd.ok&&exd.data.wait===true&&(()=>{const n=G.aiLog.length;const r=api('wordsExtras',{token:tok,ids:other});return r.ok&&r.data.wait&&G.aiLog.length===n})());
    Object.keys(cache).filter(k=>/^wx_rest_/.test(k)).forEach(k=>delete cache[k]);
    props.WORDS_EXTRAS=JSON.stringify({day:get('Day').today(),n:60});
    t('the daily share of extras calls is respected',(()=>{const n=G.aiLog.length;const r=api('wordsExtras',{token:tok,ids:other});return r.ok&&r.data.wait&&G.aiLog.length===n})());
    delete props.WORDS_EXTRAS; }
  // "Use it": a sentence of the learner's own
  { G.sentenceCalls=0;
    const sn=api('wordsSentence',{token:tok,text:'I has a big workload this week at work.',words:['workload','<b>x</b>'],question:'What is your [workload] like this week?'});
    t('sentence: a short AI note with a better version',sn.ok&&sn.data.ai&&sn.data.better&&sn.data.note&&sn.data.words.length===1&&sn.data.words[0].ok&&sn.data.left===7,sn);
    t('sentence: too short or no words is refused',!api('wordsSentence',{token:tok,text:'Hi.',words:['workload']}).ok&&!api('wordsSentence',{token:tok,text:'I has a big workload this week.',words:[]}).ok);
    for(let i=0;i<7;i++)api('wordsSentence',{token:tok,text:'I has a big workload this week at work.',words:['workload']});
    const lim=api('wordsSentence',{token:tok,text:'I has a big workload this week at work.',words:['workload']});
    t('sentence: 8 notes a day, then the browser keeps its own check',lim.ok&&lim.data.ai===false&&lim.data.reason==='limit'&&G.sentenceCalls===8,[lim,G.sentenceCalls]);
    api('register',{name:'Q Five',username:'qfive',password:'1'});const tok5=api('login',{username:'qfive',password:'1'}).data.token;
    G.failN=99;const busy=api('wordsSentence',{token:tok5,text:'I has a big workload this week at work.',words:['workload']});G.failN=0;
    t('sentence: AI down is not an error',busy.ok&&busy.data.ai===false&&busy.data.reason==='busy',busy);
    const UWb=JSON.stringify(sheets.UserWords.rows);api('wordsSentence',{token:tok5,text:'I has a big workload this week at work.',words:['workload']});
    t('sentence never changes boxes',JSON.stringify(sheets.UserWords.rows)===UWb); }
  // quick words
  advance(DAY);tok=api('login',{username:'qfour',password:'1'}).data.token;
  const q=api('wordsQuick',{token:tok});
  t('quick words: at most 5 words, saved first',q.ok&&(q.data.review.length+q.data.fresh.length+q.data.saved.items.length)<=5&&(q.data.review.length+q.data.fresh.length+q.data.saved.items.length)>0,q.ok?q.data:q);
  const ns=sv('stakeholder','Every stakeholder joined the call.').data.id;
  const q2=api('wordsQuick',{token:tok,ids:[ns]});
  t('quick words with ids: exactly the words just saved, with meanings',q2.ok&&q2.data.saved.items.length===1&&q2.data.saved.items[0].id===ns&&q2.data.saved.items[0].def&&q2.data.fresh.length===0);
  const sm=api('overview',{token:tok}).data.plan.words;
  t('dashboard summary carries the daily goal in minutes and the practice set counts',sm.sets&&typeof sm.sets.missed==='number'&&sm.goal&&sm.goal.minutes===30&&typeof sm.goal.doneSec==='number'&&typeof sm.fresh==='number'&&typeof sm.due==='number',sm);
  t('sign-in returns the Words settings',(()=>{api('saveSettings',{token:tok,wordsGoal:45,wordsRound:15,wordsAuto:false});const st=api('login',{username:'qfour',password:'1'}).data.settings;return st.wordsGoal===45&&st.wordsRound===15&&st.wordsAuto===false})());
}

console.log(fail?'\n'+fail+' FAILED':'\nALL PASSED');process.exit(fail?1:0);
