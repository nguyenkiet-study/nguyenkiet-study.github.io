process.env.KELVIN_CLOCK=process.env.KELVIN_CLOCK||String(Date.UTC(2026,10,12,3,0,0));
// History: saving sessions with their questions, the list (with older sessions as score-only), filters and paging.
const {ctx,sheets,props,cache,advance}=require('./gas_env.js');
ctx.setupDatabase();props.GEMINI_API_KEY='K';
require('./fake_gemini.js').install(ctx,advance);
const api=(f,p)=>ctx.apiCall(f,p);
let fail=0;const t=(n,c,x)=>{console.log((c?'PASS ':'FAIL ')+n+(c?'':' -> '+String(JSON.stringify(x)).slice(0,400)));if(!c)fail++};
t('History sheet exists',sheets.History&&sheets.History.rows[0].includes('ItemsJSON'));
const tok=api('register',{name:'His Tory',username:'hist1',password:'1',confirm:'1'}).data.token;
const tok2=api('register',{name:'Oth Er',username:'hist2',password:'1',confirm:'1'}).data.token;
const U=sheets.Users.rows,uid=U.find(r=>r.includes('hist1'))[U[0].indexOf('UserID')];
// an older activity (before History existed)
const LA=sheets.LearningActivities,h=LA.rows[0];
LA.rows.push(h.map(k=>({ActivityID:'act_old',UserID:uid,Skill:'reading',Type:'practice',Title:'Reading practice | 3 of 5 correct',Status:'completed',Score:60,DurationMin:7,CompletedAt:'2026-11-01T02:00:00.000Z'})[k]??''));
let s=api('historySave',{token:tok,kind:'grammar',title:'Grammar: Past simple',right:7,total:9,minutes:8,items:[{q:'She ___ it.',a:'finish',r:'finished',ok:false,why:'Past.'},{q:'Fix it',a:'I went.',r:'I went.',ok:true}]});
t('save works',s.ok&&s.data.id,s);
// the matching activity row written by the module at the same time is not listed twice
LA.rows.push(h.map(k=>({ActivityID:'act_g',UserID:uid,Skill:'grammar',Type:'grammar',Title:'Grammar: Past simple | 7 of 9 correct',Status:'completed',Score:78,DurationMin:8,CompletedAt:new Date(Number(process.env.KELVIN_CLOCK)).toISOString()})[k]??''));
t('unknown kind refused',!api('historySave',{token:tok,kind:'zzz',items:[]}).ok);
let L=api('historyList',{token:tok});
t('list: saved session + older one, newest first, no duplicate',L.ok&&L.data.items.length===2&&L.data.items[0].detail&&L.data.items[0].right===7&&L.data.items[1].id==='act:act_old'&&!L.data.items[1].detail&&L.data.items[1].title==='Reading practice',L.data);
let G=api('historyGet',{token:tok,id:L.data.items[0].id});
t('get returns the questions',G.ok&&G.data.items.length===2&&G.data.items[0].r==='finished'&&G.data.items[0].ok===false&&G.data.items[1].ok===true,G);
t('another learner cannot open it',!api('historyGet',{token:tok2,id:L.data.items[0].id}).ok&&api('historyList',{token:tok2}).data.items.length===0);
t('filter by skill',api('historyList',{token:tok,skill:'reading'}).data.items.length===1&&api('historyList',{token:tok,skill:'grammar'}).data.items.length===1);
api('historySave',{token:tok,kind:'flashcards',title:'Words: Flashcards',right:3,total:4,items:[{q:'w',r:'m',ok:true}]});
t('word sets count as Words',api('historyList',{token:tok,skill:'words'}).data.items.length===1);
// size limits
const big=Array.from({length:200},(_,i)=>({q:'Q'+i+' '+'x'.repeat(500),a:'y'.repeat(1400),r:'z'.repeat(1400),ok:i%2===0}));
s=api('historySave',{token:tok,kind:'reading',title:'Big',items:big});
const row=sheets.History.rows.find(r=>r[0]===s.data.id),js=row[sheets.History.rows[0].indexOf('ItemsJSON')];
t('a huge session is trimmed to fit one cell',s.ok&&js.length<=45000&&JSON.parse(js).length>5,js.length);
// paging
for(let i=0;i<45;i++){advance(60000);api('historySave',{token:tok,kind:'reading',title:'R'+i,items:[{q:'q',a:'a',r:'a',ok:true}]});}
L=api('historyList',{token:tok});
t('first page is 40 with more',L.data.items.length===40&&L.data.more,L.data.items.length);
const L2=api('historyList',{token:tok,before:L.data.next});
t('next page continues without overlap',L2.ok&&L2.data.items.length>=5&&!L2.data.items.some(x=>L.data.items.some(y=>y.id===x.id)));
console.log(fail?fail+' FAILED':'ALL PASSED');process.exit(fail?1:0);
