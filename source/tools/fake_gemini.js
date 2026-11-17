// A pretend Gemini for the tests. install(ctx, advance) wires it in as UrlFetchApp; returns a state object to steer it.
module.exports.install=function(ctx,advance){
  const reply=(code,body)=>({getResponseCode:()=>code,getContentText:()=>typeof body==='string'?body:JSON.stringify(body)});
  const okj=o=>reply(200,{candidates:[{content:{parts:[{text:JSON.stringify(o)}]}}]});
  const S={counter:0,keys:{},aiLog:[],failN:0,ratingLevel:'B1',reply};
  const WORDS='the office team meeting report client price room train ticket doctor phone message plan week morning coffee manager email schedule'.split(' ');
  const para=n=>Array.from({length:n},(_,i)=>WORDS[(i*7+S.counter)%WORDS.length]).join(' ');
  ctx.__fetch=(url,opt)=>{
    advance(61000); // every call is a new minute, so the per-minute limiter never blocks a test
    if(S.failN>0){S.failN--;return reply(503,'x')}
    const body=JSON.parse(opt.payload),prompt=body.contents[0].parts[0].text;S.aiLog.push({model:url.match(/models\/([^:]+):/)[1],prompt});
    if(/^Read this clearly/.test(prompt)){const model=S.aiLog[S.aiLog.length-1].model;S.ttsLog=S.ttsLog||[];S.ttsLog.push({model,speech:body.generationConfig.speechConfig,text:prompt,modal:body.generationConfig.responseModalities});
      if((S.ttsBad||[]).includes(model))return reply(404,'nf');if(S.ttsFailAll)return reply(500,'x');
      return reply(200,{candidates:[{content:{parts:[{inlineData:{mimeType:'audio/L16;codec=pcm;rate=24000',data:Buffer.alloc(4800,1).toString('base64')}}]}}]})}
    let cm=prompt.match(/^Write one listening lesson: a conversation between two people\.\nCEFR level: (\w+)\./);
    if(cm){S.convCalls=(S.convCalls||0)+1;const n=S.convCalls,lv=cm[1],nL={A1:7,A2:9,B1:11,B2:13,C1:13,C2:13}[lv]||9;
      if(S.convFail)return reply(500,'x');
      const names=['Anna'+String.fromCharCode(96+n),'Ben'+String.fromCharCode(96+n)];
      const lines=Array.from({length:nL},(_,i)=>({s:i%2,t:i===2?'The meeting starts at nine in room five.':i===4?'I will bring the printed report tomorrow morning.':'Line number '+i+' of this short talk about plans.',vi:'Câu '+i}));
      S.lastConv={gist:0,detail:[1,0,2],tf:['true','false','not given']};
      return okj({title:'Fake talk '+n,scene:names[0]+' talks to '+names[1]+'.',speakers:[{name:names[0],role:'a worker',gender:'f'},{name:names[1],role:'a manager',gender:'m'}],words:[{w:'report',m:'a document'}],lines,
        gist:{q:'What is it about?',options:['Plans','Food','Sport'],answer:0},
        detail:[{q:'When does it start?',options:['At eight','At nine','At ten'],answer:1,line:2},{q:'Which room?',options:['Room five','Room six','Room two'],answer:0,line:2},{q:'What will be brought?',options:['Coffee','Cake','The report'],answer:2,line:4}],
        tf:[{statement:'The meeting is at nine.',answer:'true',line:2},{statement:'The meeting is in room six.',answer:'false',line:2},{statement:'The manager is from Hanoi.',answer:'not given',line:0}],
        gap:{line:4,word:'printed'},order:['They talk about the time.','They talk about the room.','They talk about the report.','They say goodbye.']})}
    if(/^Answer these listening questions about the transcript\./.test(prompt)){S.verifyConv=(S.verifyConv||0)+1;const L=S.lastConv||{gist:0,detail:[1,0,2],tf:['true','false','not given']};
      const shuffled=[...prompt.matchAll(/^\[(\d)\] They /gm)].map(m=>+m[1]);
      const tf=L.tf.slice();if(S.convWrongTf)tf[1]='true';
      return okj({mcq:[L.gist].concat(L.detail),tf,order:[0,1,2,3]})}
    if(/^Topic that is ending: /.test(prompt)){S.topicCalls=(S.topicCalls||0)+1;S.lastTopicPrompt=prompt;
      if(S.topicFail)return reply(500,'x');
      return okj({review:{score:4,verdict:'People liked it.',worked:'Personal stories.',change:'Ask a follow-up question.'},next:{topic:'AI topic number '+S.topicCalls+': what did you cook last weekend, and who ate it with you?',why:'Food stories got many answers.'}})}
    let tm=prompt.match(/^Write (\d+) different (speaking|writing) tasks for English learners\.\nCEFR level: (\w+)\./);
    if(tm){S.taskCalls=(S.taskCalls||0)+1;const n=+tm[1];
      const tasks=Array.from({length:n},(_,i)=>{S.counter++;return {prompt:'Tell me about topic number '+S.counter+' at level '+tm[3]+'?',criteria:'Clear answer with reasons.'}});
      tasks.push({prompt:'Tell me about your family or your friends.',criteria:'Duplicate of a seed task.'});
      tasks.push({prompt:'bad',criteria:''});
      return okj({tasks})}
    let m=prompt.match(/^Write (\d+) different multiple-choice.*\nSkill: (\w+)\. CEFR level: (\w+)\. Type: (\w+)\./);
    if(m){const n=+m[1];const needPassage=!/Leave "passage" empty/.test(prompt);
      const qs=Array.from({length:n},(_,i)=>{S.counter++;const ci=S.counter%4;
        const stem=needPassage?'What is the main point number '+S.counter+'?':'She ___ to the office number '+S.counter+' every day.';
        const q={passage:needPassage?para(30):'',question:stem,options:['opt A'+S.counter,'opt B'+S.counter,'opt C'+S.counter,'opt D'+S.counter],correct_index:ci,difficulty:20+(i*60/Math.max(1,n-1)|0),explanation:'Because.'};
        S.keys[stem]=ci;if(S.counter%9===0)q.options[1]=q.options[0]; // some are malformed on purpose
        return q});
      return okj({questions:qs})}
    if(/^Solve each multiple-choice/.test(prompt)){const items=JSON.parse(prompt.slice(prompt.lastIndexOf('\n\n')+2));
      return okj({answers:items.map(it=>{const k=S.keys[it.question];const bad=/number \d*7[ ?]/.test(it.question);return {id:it.id,answer:bad?(k+1)%4:k,unambiguous:!bad}})})}
    if(/^Write one grammar lesson/.test(prompt)){S.lessonCalls=(S.lessonCalls||0)+1;const tw={en:'Because of the rule.',vi:'Vì quy tắc.'};
      return okj({rule:{en:'Use it for finished actions.',vi:'Dùng cho hành động đã xong.'},forms:['Subject + verb-ed','Subject + did not + verb'],examples:[1,2,3,4].map(i=>({en:'I worked at home on day '+i+'.',vi:'Tôi làm ở nhà ngày '+i+'.'})),
        mistakes:[{wrong:'I work yesterday.',right:'I worked yesterday.',why:tw}],warm:[1,2,3,4].map(i=>({sentence:'She ___ the report on day '+i+'.',options:['finished','finish','finishing','finishes'],why:tw})),
        write:Array.from({length:10},(_,i)=>({type:i<4?'fix':i<7?'transform':'translate',instruction:i>=4&&i<7?'Make it negative':'',prompt:i<4?'She finish task '+i+' yesterday.':i<7?'She finished task '+i+'.':'Cô ấy đã xong việc '+i+'.',answers:i>=4&&i<7?['She did not finish task '+i+'.',"She didn't finish task "+i+'.']:['She finished task '+i+' yesterday.'],focus:'finish',why:tw})),
        free:{en:'Write 3 sentences about yesterday.',vi:'Viết 3 câu về hôm qua.'}})}
    if(/^Write \d+ more writing items/.test(prompt)){S.extendCalls=(S.extendCalls||0)+1;const k=S.extendCalls;const tw={en:'Because of the rule.',vi:'Vì quy tắc.'};
      return okj({write:Array.from({length:8},(_,i)=>({type:'fix',instruction:'',prompt:'Extra wrong sentence '+k+'-'+i+'.',answers:['Extra right sentence '+k+'-'+i+'.'],focus:'right',why:tw}))})}
    if(/^Each entry is a correction given to an English learner/.test(prompt)){S.classifyCalls=(S.classifyCalls||0)+1;const items=JSON.parse(prompt.slice(prompt.lastIndexOf('\n\n')+2));return okj({items:items.map((it,i)=>({id:it.id,topic:i%2?'none':'present-simple'}))})}
    if(/^Grammar topic: /.test(prompt)){S.judgeCalls=(S.judgeCalls||0)+1;return okj({correct:/also fine/.test(prompt),why:{en:'Checked.',vi:'Đã kiểm tra.'}})}
    if(/^Copy the handwritten English text/.test(prompt)){S.readCalls=(S.readCalls||0)+1;S.lastImage=body.contents[0].parts[1]&&body.contents[0].parts[1].inlineData;return okj({text:'Yesterday I go to work.\nI finished the report.'})}
    if(/^The learner has just studied/.test(prompt)){S.freeCalls=(S.freeCalls||0)+1;return okj({used:true,comment:{en:'Good. Check one verb.',vi:'Tốt. Xem lại một động từ.'},corrections:[{original:'Yesterday I go to work.',better:'Yesterday I went to work.',why:{en:'Past time needs past simple.',vi:'Quá khứ dùng quá khứ đơn.'},topic:'present-simple'}]})}
    if(/^Task given to the learner/.test(prompt)){const c={level:S.ratingLevel,evidence:'ok'};return okj({task:c,grammar:c,vocabulary:c,coherence:c,strengths:['Clear ideas'],weaknesses:['Some tense slips'],summary:'Clear and polite. Check the verb tenses.',corrections:[{original:'I am agree',better:'I agree',why:'Agree is a verb here.'}],improved:'An improved version of the text.',tip:'Add a closing line.'})}
    if(/^You write learning content for an English vocabulary app/.test(prompt)){const items=JSON.parse(prompt.slice(prompt.lastIndexOf('\n\n')+2));S.wordBatches=(S.wordBatches||0)+1;
      return okj({words:items.map(it=>{const n=+it.id.slice(1);const w=it.word;
        const ex=n%7===0?'No brackets in this sentence about '+w+' at work today.':'We talked about the ['+w+'] during the meeting today.';
        return {id:it.id,definition:'A simple meaning of '+w+' for learners at level '+it.level+'.',example:ex,collocations:['a '+w+' plan','the '+w+' team'],vietnamese:'nghia '+(n%5),quiz:{sentence:'We must ___ the '+w+' today.',options:['meet','smell','sleep','paint']}}})})}
    if(/^You check vocabulary-app content/.test(prompt)){const items=JSON.parse(prompt.slice(prompt.lastIndexOf('\n\n')+2));S.verifyCalls=(S.verifyCalls||0)+1;
      return okj({results:items.map(it=>{const n=+it.id.slice(1);return {id:it.id,definition_ok:true,example_ok:n%11!==0,vietnamese_ok:true,quiz_ok:n%13!==0}})})}
    if(/^Explain these English words or phrases/.test(prompt)){const items=JSON.parse(prompt.slice(prompt.lastIndexOf('\n\n')+2));S.savedCalls=(S.savedCalls||0)+1;return okj({items:items.map(i=>({id:i.id,definition:'a simple meaning of '+i.text+' for tests',vietnamese:'nghĩa '+i.text}))})}
    if(/^You write practice material for an English vocabulary app/.test(prompt)){const items=JSON.parse(prompt.slice(prompt.lastIndexOf('\n\n')+2));S.extraCalls=(S.extraCalls||0)+1;S.extraIds=(S.extraIds||[]).concat(items.map(i=>i.id));
      return okj({words:items.map(it=>{const bad=(S.extrasBad||[]).includes(it.id);const w=it.word;
        return {id:it.id,examples:bad?['No brackets here about '+w+' at all today.']:['I finished the ['+w+'] before lunch at the office today.','My friend talked about a new ['+w+'] on the long trip.'],question:bad?'Is this good':'What is one ['+w+'] that you think about at work?',synonyms:bad?['<b>x</b>',w]:['simple word','easy term','third one'],antonyms:bad?[]:['opposite word','simple word'],note:bad?'':'The word is a bit more formal than simple word.',ipa_us:bad?'<x>':'/ˈtest/',ipa_uk:bad?'':'[ˈtɛst]',family:bad?[{w:w,pos:'noun'}]:[{w:'testing',pos:'noun'},{w:'tested',pos:'adjective'},{w:'testing',pos:'verb'}]}})})}
    if(/^A Vietnamese adult learner practises new English words/.test(prompt)){S.sentenceCalls=(S.sentenceCalls||0)+1;const ws=JSON.parse(prompt.match(/Target words: (.*)\n/)[1]);
      return okj({good:false,better:'A better version of the sentence.',note:'Put the word after the verb.',words:ws.map(w=>({word:w,ok:true}))})}
    if(/^Give the meaning of the English word/.test(prompt)){S.glossCalls=(S.glossCalls||0)+1;const w=prompt.match(/word "([^"]+)"/)[1];return okj({base:w,pos:'noun',vi:'nghĩa của '+w,def:'a simple meaning of '+w})}
    if(/^Make a short study focus/.test(prompt)){return okj({note:'Focus on your writing this week, because it is your weakest skill.',grammar:['Past simple','Articles','Linking words'],vocabulary:['Meetings','Emails','Deadlines']})}
    if(/^Write feedback for each skill/.test(prompt)){const inp=JSON.parse(prompt.split('\n')[1]);const o={};Object.keys(inp).forEach(k=>o[k]={strengths:['Good '+k+' base'],weaknesses:['Needs more '+k],next:['Next '+k+' 1','Next '+k+' 2']});return okj(o)}
    if(/^Return \{"word"/.test(prompt))return okj({word:'hello',level:'A1',example:'Hello there.'});
    throw new Error('unexpected prompt: '+prompt.slice(0,80));
  };
  S.para=para;
  return S;
};
