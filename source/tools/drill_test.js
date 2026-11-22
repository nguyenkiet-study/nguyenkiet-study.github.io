process.env.KELVIN_CLOCK=process.env.KELVIN_CLOCK||String(Date.UTC(2026,10,16,5,0,0));
// Practice sets built from the shared exercise kinds (Daily mix and the skill drills).
const {ctx,sheets,props,advance}=require('./gas_env.js');
const vm=require('vm');const get=n=>vm.runInContext(n,ctx);
ctx.setupDatabase();props.GEMINI_API_KEY='K';
const G=require('./fake_gemini.js').install(ctx,advance);
const api=(f,p)=>ctx.apiCall(f,p);
let fail=0;const t=(n,c,x)=>{console.log((c?'PASS ':'FAIL ')+n+(c?'':' -> '+String(JSON.stringify(x)).slice(0,600)));if(!c)fail++};
function user(name,un,lvl){api('register',{name,username:un,password:'1'});const tok=api('login',{username:un,password:'1'}).data.token;
  api('saveOnboarding',{token:tok,overall:lvl,skills:{speaking:lvl,listening:lvl,reading:lvl,writing:lvl},goals:['workplace']});return tok}
get('Seed').load();
// a few approved words in the bank
{const wb=sheets.WordBank,H=wb.rows[0];[['deadline','noun','A2','the time by which you must finish something','hạn chót'],['borrow','verb','A2','to take something and give it back later','mượn'],['receipt','noun','A2','a paper that shows what you paid','hóa đơn'],['nervous','adjective','A2','a little afraid or worried','hồi hộp'],['crowded','adjective','A2','full of people','đông đúc'],['invite','verb','A2','to ask someone to come','mời'],['explain','verb','A2','to make something clear','giải thích'],['cheap','adjective','A2','not costing much money','rẻ']].forEach((w,i)=>{const o={WordID:'W'+(900+i),Headword:w[0],PartOfSpeech:w[1],CEFR:w[2],Pack:'core',Sense:'',DefinitionEN:w[3],Example:'',Collocations:'',VietnameseGloss:w[4],Source:'S',Status:'approved',CreatedAt:'x'};wb.rows.push(H.map(h=>o[h]===undefined?'':o[h]))});}
const A=user('Drill Tester','drill','A2');
const kinds=s=>s.data.steps.map(x=>x.t);
let m=api('drillStart',{token:A,mode:'mix'});
t('Daily mix: about 12 steps of many kinds',m.ok&&m.data.steps.length>=10&&['gap','tiles','listen','repeat','write'].every(k=>kinds(m).includes(k)),m.ok?kinds(m):m);
t('Daily mix is the same all day (stable order)',JSON.stringify(api('drillStart',{token:A,mode:'mix'}).data.steps.map(x=>x.vi||x.en||x.q||x.def))===JSON.stringify(m.data.steps.map(x=>x.vi||x.en||x.q||x.def)));
t('no sentence twice in one set',(()=>{const k=m.data.steps.map(x=>x.vi||x.en||x.q).filter(Boolean);return new Set(k).size===k.length})());
const L=api('drillStart',{token:A,mode:'listen'});
t('Listening drill: listen-and-build steps with English and Vietnamese',L.ok&&kinds(L).filter(k=>k==='listen').length>=6&&L.data.steps.every(x=>x.t!=='listen'||(x.en&&x.vi)),L.ok&&kinds(L));
const S=api('drillStart',{token:A,mode:'speak'});
t('Speaking drill: 8 repeat-after-Kel sentences',S.ok&&S.data.steps.length===8&&kinds(S).every(k=>k==='repeat'));
t('repeat sentences are short enough to say (A2: at most 12 words)',S.data.steps.every(x=>x.en.split(/\s+/).length<=12),S.data.steps.map(x=>x.en));
const W=api('drillStart',{token:A,mode:'translate'});
t('Writing drill: tiles and write-it-yourself, Vietnamese with accepted answers',W.ok&&kinds(W).includes('tiles')&&kinds(W).includes('write')&&W.data.steps.every(x=>x.vi&&x.answers.length));
const R=api('drillStart',{token:A,mode:'gap'});
t('Reading drill: gap questions with the right option and why',R.ok&&R.data.steps.length===8&&R.data.steps.every(x=>x.t==='gap'&&/_{2,}/.test(x.q)&&x.options.length>=3&&x.why&&x.why.en));
const Wd=api('drillStart',{token:A,mode:'words'});
t('Words drill: meaning and spelling steps from words',Wd.ok&&kinds(Wd).some(k=>k==='meaning'||k==='spell'),Wd.ok?kinds(Wd):Wd);
t('meaning step: the right word first among 3 options',Wd.data.steps.filter(x=>x.t==='meaning').every(x=>x.options.length===3&&x.answer===0&&new Set(x.options).size===3));
const C=user('Drill C1','drillc','C1');
const mc=api('drillStart',{token:C,mode:'listen'});
t('a C1 learner hears longer sentences than an A2 learner',(()=>{const av=s=>s.data.steps.filter(x=>x.t==='listen').reduce((a,x)=>a+x.en.split(/\s+/).length,0)/s.data.steps.filter(x=>x.t==='listen').length;return av(mc)>av(L)})());
const f=api('drillFinish',{token:A,mode:'mix',right:9,total:12,seconds:600,kinds:{listen:2,repeat:2,gap:2,tiles:2,write:1,meaning:2,spell:1}});
t('finishing saves the score',f.ok&&f.data.saved&&f.data.score===75,f);
const h=sheets.UserProgress.rows[0],rows=sheets.UserProgress.rows.slice(1);
const sk=rows.map(r=>r[h.indexOf('Skill')]);
t('time counts toward each skill that was practised',['listening','speaking','reading','writing','words'].every(s=>sk.includes(s)),sk);
// Listening level (22/11/2026): a Practice listening question counts 100%, a Conversation answer 40%, Listen and build 30%; Daily mix does not move it
{ const uidOf=un=>get("Db.find(CONFIG.SHEETS.USERS,function(r){return r.Username==='"+un+"'}).UserID");
  const SH=sheets.SkillLevels.rows[0],si=n=>SH.indexOf(n),uid=uidOf('drill');
  const row=sk=>sheets.SkillLevels.rows.find(r=>r[si('UserID')]===uid&&r[si('Skill')]===sk);
  const setTheta=(sk,th)=>{const r=row(sk);r[si('MeasuredLevel')]='B1';r[si('Theta')]=String(th);r[si('ProgressPct')]=50};
  const E=get('Engine'),W=get('CONFIG.PRACTICE.LISTEN_WEIGHT'),STEP=get('CONFIG.PRACTICE.ELO_STEP');
  t('weights: Conversation 40%, Listen and build 30% of a Practice question',W.conversation===0.4&&W.listenBuild===0.3,W);
  setTheta('listening',0.2);
  const fl=api('drillFinish',{token:A,mode:'listen',right:6,total:8,seconds:300,kinds:{listen:6,spell:2}});
  let th=0.2;const mid=E.itemTheta('B1',50);for(let k=0;k<8;k++)th+=0.3*STEP*((k<6?1:0)-E.prob(th,mid));
  t('Listen and build moves Listening at 30% of a Practice question',fl.ok&&fl.data.measured&&Math.abs(Number(row('listening')[si('Theta')])-th)<0.002,{got:row('listening')[si('Theta')],want:th.toFixed(3)});
  const before=row('listening')[si('Theta')];
  api('drillFinish',{token:A,mode:'mix',right:12,total:12,seconds:600,kinds:{listen:2,repeat:2,gap:2,tiles:2,write:1,meaning:2,spell:1}});
  t('Daily mix does not move the Listening level',row('listening')[si('Theta')]===before);
  const P=get('Practice'),d=w=>{setTheta('reading',0);P.nudge(uid,'reading',[{correct:true,b:0},{correct:true,b:0},{correct:true,b:0}],w);return Number(row('reading')[si('Theta')])};
  const full=d(1),conv=d(W.conversation),lb=d(W.listenBuild);
  t('the same answers move the level 100% / 40% / 30%',Math.abs(conv/full-0.4)<0.03&&Math.abs(lb/full-0.3)<0.03,{full,conv,lb});
  t('Conversation answers are scored with the 40% weight',/scoreSet\([^)]*LISTEN_WEIGHT\.conversation\)/.test(require('fs').readFileSync(require('path').join(__dirname,'..','Conversation.gs'),'utf8')));
}
t('a set with no answers is not saved',api('drillFinish',{token:A,mode:'mix',right:0,total:0,seconds:10}).data.saved===false);
t('a bad token is refused',!api('drillStart',{token:'nope',mode:'mix'}).ok);
t('the AI sentence check works without a grammar topic',api('grammarJudge',{token:A,prompt:'Tôi thích cà phê.',model:'I like coffee.',answer:'I love coffee.'}).ok);
// tap a word in a conversation: Vietnamese meaning
const g1=api('wordGloss',{token:A,word:'Deadlines,',context:'We have two deadlines this week.'});
t('a word from the bank (plural form) gets its Vietnamese meaning, no AI',g1.ok&&g1.data.base==='deadline'&&g1.data.vi==='hạn chót'&&g1.data.from==='bank'&&!G.glossCalls,g1);
const g0=api('wordGloss',{token:A,word:'kettle',context:'The kettle is hot.'});
t('a word that is not a key word and not in the dictionary has no meaning',!g0.ok&&!G.glossCalls,g0);
const g2=api('wordGloss',{token:A,word:'kettle',context:'The kettle is hot.',key:true});
t('a word not in the bank is explained by the AI',g2.ok&&g2.data.vi==='nghĩa của kettle'&&G.glossCalls===1,g2);
api('wordGloss',{token:A,word:'kettle',context:'The kettle is hot.',key:true});
t('asking again uses the cache',G.glossCalls===1);
t('an empty word is refused',!api('wordGloss',{token:A,word:'  ,'}).ok);
t('the dictionary check finds word forms in a text',JSON.stringify(get('Words').known('Two deadlines and a cheap receipt, nervous kettles').sort())===JSON.stringify(['cheap','deadlines','nervous','receipt']),get('Words').known('Two deadlines and a cheap receipt, nervous kettles'));
console.log(fail?fail+' FAILED':'ALL PASSED');
