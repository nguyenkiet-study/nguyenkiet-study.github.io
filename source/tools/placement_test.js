const {ctx,sheets,props,cache,advance}=require('./gas_env.js');
const vm=require('vm');const get=n=>vm.runInContext(n,ctx);
ctx.setupDatabase();props.GEMINI_API_KEY='K';
const G=require('./fake_gemini.js').install(ctx,advance);const aiLog=G.aiLog;
Object.defineProperty(global,'ratingLevel',{get:()=>G.ratingLevel,set:v=>G.ratingLevel=v});Object.defineProperty(global,'failN',{get:()=>G.failN,set:v=>G.failN=v});
const reply=G.reply,para=n=>G.para(n);
const api=(f,p)=>ctx.apiCall(f,p);
let fail=0;const t=(n,c,x)=>{console.log((c?'PASS ':'FAIL ')+n+(c?'':' -> '+String(JSON.stringify(x)).slice(0,300)));if(!c)fail++};

// ---- 1. build the bank ----
t('seed tasks load',get('Seed').load()>=14&&get('Seed').load()===0);
let rep=get('QF').run(1000*60*60*100);
t('factory fills the bank',rep.remainingCells===0&&rep.stoppedBecause==='bank is full',rep);
const bankRows=sheets.QuestionBank.rows.slice(1);const H=sheets.QuestionBank.rows[0];const ix=n=>H.indexOf(n);
const aiAll=bankRows.filter(r=>r[ix('Source')]==='ai');const ai=aiAll.filter(r=>r[ix('OptionsJSON')]&&r[ix('Subtype')]!=='conversation'); // writing/speaking tasks have no options; conversation items carry their own item list (see conversation_test.js)
t('only verified questions kept (dropped some)',rep.dropped>0&&ai.length>0,rep);
t('all kept are approved with 4 options and a valid key',ai.every(r=>r[ix('Status')]==='approved'&&JSON.parse(r[ix('OptionsJSON')]).length===4&&['0','1','2','3'].includes(String(r[ix('CorrectAnswer')]))));
t('no duplicate options in kept questions',ai.every(r=>new Set(JSON.parse(r[ix('OptionsJSON')])).size===4));
const keyCounts=[0,1,2,3].map(k=>ai.filter(r=>String(r[ix('CorrectAnswer')])===String(k)).length);
t('answer position balanced by shuffling',Math.min(...keyCounts)>ai.length*0.12,keyCounts);
t('verify used a different model than generate',aiLog.some(a=>/^Solve/.test(a.prompt)&&a.model==='gemini-3.1-flash-lite')&&aiLog.some(a=>/^Write \d+/.test(a.prompt)&&a.model==='gemini-3.5-flash-lite'));
t('listening items carry a script, vocabulary items do not',ai.filter(r=>r[ix('Skill')]==='listening').every(r=>r[ix('Passage')])&&ai.filter(r=>r[ix('Subtype')]==='vocabulary').every(r=>!r[ix('Passage')]));
const before=sheets.QuestionBank.getLastRow();aiLog.length=0;rep=get('QF').run(1000);t('second run does nothing when full',rep.batches===0&&aiLog.length===0&&sheets.QuestionBank.getLastRow()===before,rep);

// ---- 2. a learner takes the test ----
const reg=u=>api('register',{name:'Test '+u,username:u,password:'1'}).data.token;
const tokA=reg('learnera'),tokB=reg('learnerb');
api('saveOnboarding',{token:tokA,overall:'B1',skills:{speaking:'B1',listening:'B1',reading:'B1',writing:'B1'},goals:['daily']});
const keyOf=id=>{const r=sheets.QuestionBank.rows.find(r=>r[0]===id);return Number(r[ix('CorrectAnswer')])};
const bOf=id=>{const r=sheets.QuestionBank.rows.find(r=>r[0]===id);return get('Engine').itemTheta(r[ix('CEFR')],r[ix('DifficultyScore')])};
let seed=7;const rnd=()=>{seed=(seed*1664525+1013904223)%4294967296;return seed/4294967296};
function play(token,trueTheta,stopAt){
  let s=api('placementStart',{token}).data,answered=0,leak=false,views=[s.view];const sid=s.sessionId;
  while(s.view.type==='mcq'){
    const it=s.view.item;if(JSON.stringify(s.view).includes('CorrectAnswer'))leak=true;
    const p=get('Engine').prob(trueTheta,bOf(it.id));const choice=rnd()<p?keyOf(it.id):(keyOf(it.id)+1)%4;
    if(stopAt&&answered===stopAt)return {sid,view:s.view,answered};
    const r=api('placementAnswer',{token,sessionId:sid,questionId:it.id,choice,ms:4000});if(!r.ok)return {err:r};s={view:r.data.view};answered++;views.push(s.view)}
  return {sid,view:s.view,answered,leak,views}
}
let g=play(tokA,0.4);
t('adaptive part ends in writing',g.view.type==='writing'&&!g.leak,g.view&&g.view.type);
const counts={reading:0,listening:0};g.views.forEach(v=>{if(v.type==='mcq')counts[v.skill]++});
t('reading 7-12 and listening 5-8 questions',counts.reading>=7&&counts.reading<=12&&counts.listening>=5&&counts.listening<=8,counts);
t('answers recorded',sheets.TestAnswers.getLastRow()-1===g.answered,[sheets.TestAnswers.getLastRow(),g.answered]);
t('no repeated question in a test',new Set(g.views.filter(v=>v.type==='mcq').map(v=>v.item.id)).size===g.views.filter(v=>v.type==='mcq').length);
// writing: AI busy first, then ok
G.failN=6;
const wtext='I think working from home two days a week is a good plan because we save time and we can focus. We should still meet in the office on Tuesday and Thursday to talk about the project together.';
let w=api('placementWriting',{token:tokA,sessionId:g.sid,text:wtext,ms:90000});
t('writing: AI outage gives a friendly retryable error, test not lost',!w.ok&&w.code==='busy',w);
w=api('placementWriting',{token:tokA,sessionId:g.sid,text:wtext,ms:90000});
t('writing accepted on retry, speaking is next',w.ok&&w.data.view.type==='speaking'&&w.data.view.tasks.length===2,w);
t('writing prompt wraps learner text in data tags',/<learner_text>[\s\S]*working from home[\s\S]*<\/learner_text>/.test(aiLog.filter(a=>/^Task given/.test(a.prompt)).pop().prompt));
const sp=api('placementSpeaking',{token:tokA,sessionId:g.sid,answers:[{transcript:'I work in an office and I like my team',seconds:12},{transcript:'In the morning I drink coffee and I read emails before the meeting starts',seconds:14}]});
t('speaking finishes the test with a result',sp.ok&&sp.data.view.type==='done'&&Object.keys(sp.data.result.skills).length===4,sp);
const R=sp.data.result;
t('result has level, confidence, texts per skill',CONFIG_SKILLS().every(k=>R.skills[k]&&R.skills[k].level&&['High','Medium','Low'].includes(R.skills[k].conf)&&R.skills[k].strengths.length&&R.skills[k].next.length),R);
function CONFIG_SKILLS(){return ['reading','listening','writing','speaking']}
t('productive skills never High confidence',R.skills.writing.conf!=='High'&&R.skills.speaking.conf!=='High');
t('writing/speaking B1 rating maps to B1',R.skills.writing.level==='B1'&&R.skills.speaking.level==='B1',[R.skills.writing,R.skills.speaking]);
t('results saved to 4 AssessmentResults rows and SkillLevels',sheets.AssessmentResults.getLastRow()===5&&sheets.SkillLevels.rows.slice(1).filter(r=>r[0]&&r[3]).length===4);
let bs=api('session',{token:tokA}).data;
t('bootstrap now has hasTest and full skill reports',bs.hasTest&&bs.skills.reading.measured&&bs.skills.reading.strengths.length&&bs.skills.writing.next.length,bs.skills);
t('finished test cannot be answered again',!api('placementAnswer',{token:tokA,sessionId:g.sid,questionId:'x',choice:0}).ok);
t('AI calls for the productive part and report are few',aiLog.filter(a=>/^Task given|^Write feedback/.test(a.prompt)).length<=4);

// ---- 3. engine accuracy end-to-end: strong learner vs weak learner ----
const lv=tok=>{const r=play(tok,0,0);return r};
const tokS=reg('strong'),tokW=reg('weak');
G.ratingLevel='C1';let rs=play(tokS,2.0);api('placementWriting',{token:tokS,sessionId:rs.sid,text:para(60),ms:1});let fs=api('placementSpeaking',{token:tokS,sessionId:rs.sid,answers:[{transcript:para(40),seconds:20},{transcript:para(40),seconds:20}]}).data.result;
G.ratingLevel='A2';let rw=play(tokW,-2.1);api('placementWriting',{token:tokW,sessionId:rw.sid,text:para(30),ms:1});let fw=api('placementSpeaking',{token:tokW,sessionId:rw.sid,answers:[{transcript:para(15),seconds:30},{transcript:para(15),seconds:30}]}).data.result;
const li=l=>['A1','A2','B1','B2','C1','C2'].indexOf(l);
t('strong learner scores clearly above weak learner in every skill',['reading','listening','writing','speaking'].every(k=>li(fs.skills[k].level)>li(fw.skills[k].level)),[fs.skills,fw.skills].map(o=>Object.keys(o).map(k=>k+':'+o[k].level).join(' ')));

// ---- 4. productive caps and skipping ----
const tokC=reg('shorty');G.ratingLevel='C2';let gc=play(tokC,0.4);
api('placementWriting',{token:tokC,sessionId:gc.sid,text:'I like it very much indeed.',ms:1});
let c=api('placementSpeaking',{token:tokC,sessionId:gc.sid,skip:true});
t('very short writing is capped at A2 with Low confidence even if AI says C2',c.ok&&c.data.result.skills.writing.level==='A2'&&c.data.result.skills.writing.conf==='Low',c.data&&c.data.result.skills.writing);
t('skipped speaking is simply not measured',!c.data.result.skills.speaking);

// ---- 5. resume and ownership ----
const tokR=reg('resumer');let s1=api('placementStart',{token:tokR}).data;
const a1=api('placementAnswer',{token:tokR,sessionId:s1.sessionId,questionId:s1.view.item.id,choice:0,ms:1}).data;
let s2=api('placementStart',{token:tokR}).data;
t('restarting resumes the same test at the same question',s2.resumed&&s2.sessionId===s1.sessionId&&s2.view.item.id===a1.view.item.id,[s1.sessionId,s2.sessionId]);
t('wrong question id rejected',!api('placementAnswer',{token:tokR,sessionId:s1.sessionId,questionId:s1.view.item.id,choice:0}).ok);
t("another user cannot use someone else's session",!api('placementAnswer',{token:tokB,sessionId:s1.sessionId,questionId:a1.view.item.id,choice:0}).ok);
t('invalid choice rejected',!api('placementAnswer',{token:tokR,sessionId:s1.sessionId,questionId:a1.view.item.id,choice:9}).ok);
advance(4*3600*1000);let s3=api('placementStart',{token:tokR}).data;
t('stale unfinished test is abandoned and a new one starts',!s3.resumed&&s3.sessionId!==s1.sessionId);
t('not signed in cannot start',api('placementStart',{}).code==='auth');
console.log(fail?`\n${fail} FAILED`:'\nALL PASSED');process.exit(fail?1:0);
