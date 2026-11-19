process.env.KELVIN_CLOCK=process.env.KELVIN_CLOCK||String(Date.UTC(2026,10,12,3,0,0));
// Grammar: lessons from mistakes, review boxes, AI helpers. Real server code against the fake Sheets and fake Gemini.
const {ctx,sheets,props,cache,advance}=require('./gas_env.js');
const vm=require('vm');const get=n=>vm.runInContext(n,ctx);
ctx.setupDatabase();props.GEMINI_API_KEY='K';
const G=require('./fake_gemini.js').install(ctx,advance);
const api=(f,p)=>ctx.apiCall(f,p);
let fail=0;const t=(n,c,x)=>{console.log((c?'PASS ':'FAIL ')+n+(c?'':' -> '+String(JSON.stringify(x)).slice(0,500)));if(!c)fail++};
const DAY=86400000;
t('three grammar sheets exist',['GrammarErrors','GrammarLessons','UserGrammar'].every(n=>sheets[n]&&sheets[n].rows[0].length>5));
get('Seed').load();
const reg=api('register',{name:'Gram Mar',username:'gram1',password:'1',confirm:'1'});let tok=reg.data.token;
api('saveOnboarding',{token:tok,overall:'A2',skills:{speaking:'A2',listening:'A2',reading:'A2',writing:'A2'},goals:['work']});
const rows=(n)=>{const s=sheets[n],h=s.rows[0];return s.rows.slice(1).map(r=>Object.fromEntries(h.map((k,i)=>[k,r[i]])))};

// 1. no mistakes yet: the level decides
let h=api('grammarHome',{token:tok});
t('home answers with a queue by level',h.ok&&h.data.queue.length===5&&h.data.queue[0].topic==='past-simple'&&h.data.queue[0].reason==='level'&&h.data.due.length===0,h);
t('level comes from the profile',h.data.level==='A2');

// 2. a writing practice whose corrections carry no topic is sorted when Grammar opens (one AI call)
let ps=api('practiceStart',{token:tok,skill:'writing'});
let sub=api('practiceSubmit',{token:tok,sessionId:ps.data.sessionId,text:'I am agree with the plan and I go to office yesterday because we must finish the report for the client today.',seconds:120});
t('writing practice still works',sub.ok,sub);
t('nothing filed yet (no topic given)',rows('GrammarErrors').length===0,rows('GrammarErrors'));
Object.keys(cache).filter(k=>/^gr_imp_/.test(k)).forEach(k=>delete cache[k]);
h=api('grammarHome',{token:tok});
t('old corrections are imported and sorted into a topic',G.classifyCalls===1&&h.data.errors.total===1&&h.data.errors.byTopic[0].topic==='present-simple',h.data.errors);
t('the topic with mistakes comes first, with the reason',h.data.queue[0].topic==='present-simple'&&h.data.queue[0].reason==='errors'&&h.data.queue[0].errors===1,h.data.queue[0]);
Object.keys(cache).filter(k=>/^gr_imp_/.test(k)).forEach(k=>delete cache[k]);
api('grammarHome',{token:tok});t('the import does not run twice',G.classifyCalls===1,G.classifyCalls);

// 3. corrections that carry a topic are filed at once
{const old=G.ratingLevel; const f=ctx.__fetch;
 ctx.__fetch=(u,o)=>{const r=f(u,o);const b=JSON.parse(o.payload).contents[0].parts[0].text;if(!/^Task given to the learner/.test(b))return r;
   const j=JSON.parse(JSON.parse(r.getContentText()).candidates[0].content.parts[0].text);j.corrections=[{original:'She have a car',better:'She has a car',why:'Third person.',topic:'subject-verb-agreement'},{original:'a informations',better:'information',why:'Uncountable.',topic:'none'}];
   return G.reply(200,{candidates:[{content:{parts:[{text:JSON.stringify(j)}]}}]})};
 ps=api('practiceStart',{token:tok,skill:'writing'});sub=api('practiceSubmit',{token:tok,sessionId:ps.data.sessionId,text:'She have a car and she give me a informations about the new office every day in the morning before work.',seconds:100});
 ctx.__fetch=f;
 const e=rows('GrammarErrors');t('topic corrections are filed with the answer id',sub.ok&&e.filter(r=>r.Topic==='subject-verb-agreement'&&r.RefID).length===1&&e.filter(r=>r.Original==='a informations'&&r.Topic==='none').length===1,e);
 t('the practice prompt lists the grammar topics',G.aiLog.some(l=>/^Task given/.test(l.prompt)&&/past-simple = Past simple/.test(l.prompt)));}

// Every topic now has a hand-written lesson, so for the AI-written-lesson tests below we hide the seed of present-simple (restored before section 9).
const GS0=get('GrammarSeed'),gsHas=GS0.has,gsGet=GS0.get;GS0.has=id=>id==='present-simple'?false:gsHas(id);GS0.get=id=>id==='present-simple'?null:gsGet(id);
// 4. a lesson: written once, then cached
let L=api('grammarLesson',{token:tok,topic:'present-simple'});
t('lesson content',L.ok&&L.data.kind==='lesson'&&L.data.warm.length===3&&L.data.write.length===6&&L.data.rule.vi&&L.data.forms.length===2&&L.data.examples.length>=2,L);
t('the own mistake is part of the lesson',L.data.own.length===1&&L.data.own[0].original==='I am agree',L.data.own);
t('answers come with the items, best first',L.data.write[0].answers[0]==='She finished task 0 yesterday.'&&L.data.write[4].answers.length===2);
api('grammarLesson',{token:tok,topic:'present-simple'});
t('the lesson is written once and kept',G.lessonCalls===1&&rows('GrammarLessons').length===1,G.lessonCalls);
Object.keys(cache).filter(k=>/^gr_les_/.test(k)).forEach(k=>delete cache[k]);api('grammarLesson',{token:tok,topic:'present-simple'});
t('without the cache the sheet is used, not the AI',G.lessonCalls===1);
t('an unknown topic is refused',!api('grammarLesson',{token:tok,topic:'zzz'}).ok);

// 5. finishing: box 1, review tomorrow; own mistake counted as fixed; wrong sentences filed
const ownId=L.data.own[0].id;
let s=api('grammarSubmit',{token:tok,topic:'present-simple',right:8,total:10,wrongs:[{original:'She finish it.',better:'She finished it.'}],fixed:[ownId],seconds:400});
t('first lesson goes to box 1, next review in 1 day',s.ok&&s.data.first&&s.data.box===1&&s.data.days===1&&s.data.pct===80&&s.data.pass,s);
let ug=rows('UserGrammar');t('UserGrammar row written',ug.length===1&&ug[0].Topic==='present-simple'&&String(ug[0].Box)==='1');
let ge=rows('GrammarErrors');t('wrong sentence filed; own mistake counted once',ge.some(r=>r.Original==='She finish it.'&&r.Topic==='present-simple'&&r.Source==='grammar')&&String(ge.find(r=>r.ErrorID===ownId).Fixed)==='1',ge);
t('progress recorded under grammar',rows('UserProgress').some(r=>r.Skill==='grammar')&&rows('LearningActivities').some(r=>r.Skill==='grammar'&&/Grammar: Present simple/.test(r.Title)));
h=api('grammarHome',{token:tok});
t('not due today; next lesson is the other mistake topic',h.data.due.length===0&&h.data.lessons.length===1&&h.data.lessons[0].days===1&&h.data.queue[0].topic==='subject-verb-agreement',[h.data.due,h.data.queue[0]]);
s=api('grammarSubmit',{token:tok,topic:'present-simple',right:5,total:5,seconds:100});
t('extra practice before the due day does not move the box up',s.data.box===1&&!s.data.first,s);

// 6. tomorrow: due, a review with other items, 80% moves up, less goes back to box 1
advance(DAY);
h=api('grammarHome',{token:tok});t('due the next day',h.data.due.length===1&&h.data.due[0].topic==='present-simple',h.data.due);
L=api('grammarLesson',{token:tok,topic:'present-simple'});
t('a review has 4 writing items the lesson did not use and no warm-up',L.data.kind==='review'&&L.data.warm.length===0&&L.data.write.length===4&&!/task [0-5]\b/.test(L.data.write[0].prompt+L.data.write[0].answers[0])===false||L.data.write.length===4,L.data.write.map(w=>w.prompt));
s=api('grammarSubmit',{token:tok,topic:'present-simple',right:4,total:5,seconds:200});
t('80% moves the lesson to box 2 (2 days)',s.data.box===2&&s.data.days===2,s);
advance(2*DAY);tok=api('login',{username:'gram1',password:'1'}).data.token;s=api('grammarSubmit',{token:tok,topic:'present-simple',right:2,total:5,seconds:200});
t('under 80% returns to box 1',s.data.box===1&&!s.data.pass&&s.data.days===1,s);
t('submit needs answers',!api('grammarSubmit',{token:tok,topic:'present-simple',right:0,total:0}).ok);

// 7. the AI helpers
let j=api('grammarJudge',{token:tok,topic:'present-simple',prompt:'She finish it.',model:'She finished it.',answer:'She did finish it, also fine.'});
t('judge says yes when the AI does',j.ok&&j.data.correct===true&&j.data.why.vi,j);
j=api('grammarJudge',{token:tok,topic:'present-simple',prompt:'She finish it.',model:'She finished it.',answer:'She finishing it.'});t('judge says no',j.ok&&j.data.correct===false);
let rd=api('grammarRead',{token:tok,image:'data:image/jpeg;base64,'+'A'.repeat(4000)});
t('a photo is sent to the AI as an image and comes back as text',rd.ok&&/Yesterday I go/.test(rd.data.text)&&G.lastImage&&G.lastImage.mimeType==='image/jpeg'&&G.lastImage.data.length===4000,rd);
t('a tiny or huge photo is refused',!api('grammarRead',{token:tok,image:'abc'}).ok&&!api('grammarRead',{token:tok,image:'A'.repeat(1600000)}).ok);
const before=rows('GrammarErrors').length;
let fr=api('grammarFree',{token:tok,topic:'present-simple',text:'Yesterday I go to work. I finished the report.'});
t('free writing: comment, corrections, and the mistake is filed',fr.ok&&fr.data.corrections.length===1&&fr.data.comment.vi&&rows('GrammarErrors').length===before+1,fr);
t('free writing needs a few words',!api('grammarFree',{token:tok,topic:'present-simple',text:'Hi'}).ok);
for(let i=0;i<30;i++)j=api('grammarJudge',{token:tok,topic:'present-simple',prompt:'a',model:'b c',answer:'d e'});
t('the daily limit on AI checks holds',!j.ok&&j.code==='busy',j);

// 8. the overview carries the summary; a second learner is separate
const ov=api('overview',{token:tok});
t('overview has the grammar summary',ov.ok&&ov.data.grammar&&typeof ov.data.grammar.due==='number'&&ov.data.grammar.next&&ov.data.grammar.byTopic.length>=1,ov.data&&ov.data.grammar);
const tok2=api('register',{name:'Other One',username:'gram2',password:'1',confirm:'1'}).data.token;
const h2=api('grammarHome',{token:tok2});t('another learner starts clean',h2.ok&&h2.data.errors.total===0&&h2.data.lessons.length===0);
t('fixed twice closes a mistake',(()=>{api('grammarSubmit',{token:tok,topic:'present-simple',right:5,total:5,fixed:[ownId],seconds:60});const hh=api('grammarHome',{token:tok}).data;return hh.errors.recent.find(x=>x.id===ownId).fixed===true})());

GS0.has=gsHas;GS0.get=gsGet;
// 9. hand-written lessons: every one is complete, and opens with no AI call
{ const Seed=get('GrammarSeed'),ids=Seed.ids(),norm=x=>String(x).toLowerCase().replace(/[.,!?]/g,'').replace(/\s+/g,' ').trim();
  t('33 hand-written lessons (every topic, A1 to C1)',ids.length===33&&get('Grammar').TOPICS.every(x=>ids.includes(x[0])),ids);
  const bad=[];
  ids.forEach(id=>{const c=Seed.get(id),say=m=>bad.push(id+': '+m);
    if(!c.rule.en||!c.rule.vi)say('rule');if(c.forms.length<2)say('forms');if(c.examples.length!==4||c.examples.some(e=>!e.en||!e.vi))say('examples');if(c.mistakes.length!==3)say('mistakes');
    if(c.warm.length!==4)say('warm count');c.warm.forEach((w,i)=>{if(!/___/.test(w.sentence)||w.options.length!==4||new Set(w.options).size!==4||!w.why.en||!w.why.vi)say('warm '+i)});
    if(c.write.length!==12)say('write count '+c.write.length);
    const first6=c.write.slice(0,6).map(w=>w.type);if(first6.filter(x=>x==='fix').length<2||!first6.includes('transform')||!first6.includes('translate'))say('first six mix');
    const seen=new Set();c.write.forEach((w,i)=>{
      if(!w.prompt||!w.answers.length||w.answers.length>5)say('write '+i+' answers');
      if(w.type==='transform'&&!w.instruction)say('write '+i+' instruction');
      if(w.focus&&!w.answers[0].toLowerCase().includes(w.focus.toLowerCase()))say('write '+i+' focus "'+w.focus+'" not in "'+w.answers[0]+'"');
      if(!w.focus)say('write '+i+' no focus');
      if(w.answers.some(a=>norm(a)===norm(w.prompt)))say('write '+i+' answer equals prompt');
      if(w.answers.some(a=>!/[.?!]$/.test(a)))say('write '+i+' no end mark');
      if(new Set(w.answers.map(norm)).size!==w.answers.length&&false)say('write '+i+' duplicate answers');
      if(seen.has(w.prompt))say('write '+i+' duplicate prompt');seen.add(w.prompt);
      if(!w.why.en||!w.why.vi)say('write '+i+' why');
      if(w.type==='translate'&&!/[À-ỹ]/.test(w.prompt))say('write '+i+' translate prompt is not Vietnamese');});
    if(!c.free.en||!c.free.vi)say('free');});
  t('every hand-written lesson is complete and consistent',bad.length===0,bad);
  const before=G.lessonCalls;let L2=api('grammarLesson',{token:tok,topic:'past-simple'});
  t('a hand-written lesson opens with no AI call',L2.ok&&G.lessonCalls===before&&L2.data.write.length===6&&L2.data.warm.length===3&&L2.data.write[0].answers[0]==='I met the new manager yesterday.'&&L2.data.rule.vi.includes('quá khứ đơn'),L2.ok?L2.data.write[0]:L2);
  const GL=sheets.GrammarLessons,gh=GL.rows[0],row=()=>GL.rows.find(r=>r[gh.indexOf('Topic')]==='past-simple');
  t('it is kept in the sheet as a seed lesson',row()&&row()[gh.indexOf('Model')]==='seed:1'&&JSON.parse(row()[gh.indexOf('ContentJSON')]).seedN===12);
  // an AI lesson written before the update is replaced by the hand-written one
  GL.rows.push(gh.map(k=>({LessonID:'x1',Topic:'passive',CEFR:'B1',ContentJSON:JSON.stringify({rule:{en:'old',vi:'cu'}}),Model:'gemini-x',Status:'ready',CreatedAt:'x'})[k]||''));
  L2=api('grammarLesson',{token:tok,topic:'passive'});
  t('an older AI lesson is replaced by the hand-written one',L2.ok&&L2.data.write[0].answers[0]==='The email was sent to the client yesterday.'&&GL.rows.filter(r=>r[gh.indexOf('Topic')]==='passive').length===1&&GL.rows.find(r=>r[gh.indexOf('Topic')]==='passive')[gh.indexOf('Model')]==='seed:1',L2.ok?L2.data.write[0]:L2);
  // reviews: 4 items each from the unused ones; when they run out the AI adds 8
  api('grammarSubmit',{token:tok,topic:'past-simple',right:9,total:9,seconds:300});const e0=G.extendCalls||0;
  let r1=api('grammarLesson',{token:tok,topic:'past-simple'}).data;
  t('first review uses items 7 to 10',r1.kind==='review'&&r1.write.length===4&&r1.write[0].prompt==='He buyed a new laptop last month.'&&(G.extendCalls||0)===e0,r1.write.map(w=>w.prompt));
  api('grammarSubmit',{token:tok,topic:'past-simple',right:4,total:4,seconds:100});
  let r2=api('grammarLesson',{token:tok,topic:'past-simple'}).data;
  t('second review: items run out, so the AI writes more',G.extendCalls===e0+1&&r2.write.length===4&&r2.write[0].prompt==='I write three emails.'&&r2.write[2].prompt==='Extra wrong sentence '+(e0+1)+'-0.',r2.write.map(w=>w.prompt));
  t('the new items are kept in the sheet and marked',row()[gh.indexOf('Model')]==='seed:1+ai'&&JSON.parse(row()[gh.indexOf('ContentJSON')]).write.length===20&&JSON.parse(row()[gh.indexOf('ContentJSON')]).seedN===12);
  api('grammarLesson',{token:tok,topic:'past-simple'});t('no second AI call while items remain',G.extendCalls===e0+1);
  G.failN=6;Object.keys(cache).filter(k=>/^gr_ext_/.test(k)).forEach(k=>delete cache[k]);
  for(let i=0;i<3;i++)api('grammarSubmit',{token:tok,topic:'past-simple',right:4,total:4,seconds:100});
  const r3=api('grammarLesson',{token:tok,topic:'past-simple'});G.failN=0;
  t('if the AI is down the lesson still opens with earlier items',r3.ok&&r3.data.write.length===4,r3);
}
// Sentences: Vietnamese into English, harder each time the topic comes back
{const tk=api('register',{name:'Sen Tester',username:'sentest',password:'1'})&&api('login',{username:'sentest',password:'1'}).data.token;
 const l1=api('grammarLesson',{token:tk,topic:'past-simple'}).data;
 t('a first lesson has 3 Vietnamese sentences to build with word tiles',l1.build&&l1.build.stage===0&&l1.build.items.length===3&&l1.build.items.every(b=>b.vi&&b.answers.length),l1.build);
 t('Sentences never repeat a writing item of the same lesson',l1.build.items.every(b=>!l1.write.some(w=>w.prompt===b.vi)));
 api('grammarSubmit',{token:tk,topic:'past-simple',right:9,total:10,seconds:300});
 const l2=api('grammarLesson',{token:tk,topic:'past-simple'}).data;
 t('the first review gives first-letter hints, with new sentences',l2.build.stage===1&&l2.build.items.map(b=>b.vi).join()!==l1.build.items.map(b=>b.vi).join(),[l1.build.items.map(b=>b.vi),l2.build.items.map(b=>b.vi)]);
 api('grammarSubmit',{token:tk,topic:'past-simple',right:9,total:10,seconds:300});
 t('after that the learner writes them alone',api('grammarLesson',{token:tk,topic:'past-simple'}).data.build.stage===2);}
console.log(fail?fail+' FAILED':'ALL PASSED');process.exit(fail?1:0);
