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
