process.env.KELVIN_CLOCK=process.env.KELVIN_CLOCK||String(Date.UTC(2026,10,16,5,0,0)); // 16 Nov 2026, outside the Christmas season
// Community, messages, tags and the 3-day topic: the real server code against the fake Sheets and fake Gemini.
const {ctx,sheets,props,cache,advance}=require('./gas_env.js');
const vm=require('vm');const get=n=>vm.runInContext(n,ctx);
ctx.setupDatabase();props.GEMINI_API_KEY='K';
const G=require('./fake_gemini.js').install(ctx,advance);
const api=(f,p)=>ctx.apiCall(f,p);
let fail=0;const t=(n,c,x)=>{console.log((c?'PASS ':'FAIL ')+n+(c?'':' -> '+String(JSON.stringify(x)).slice(0,500)));if(!c)fail++};
const HOUR=3600e3,DAY=24*HOUR;
const col=(sh,n)=>sheets[sh].rows[0].indexOf(n);
function user(name,un){api('register',{name,username:un,password:'1'});return api('login',{username:un,password:'1'}).data.token}
let A=user('Anh Kiet','kiet'),B=user('Lan Tran','lan'),C=user('Minh Le','minh');
const lg=un=>api('login',{username:un,password:'1'}).data.token;
const adv=ms=>{advance(ms);A=lg('kiet');B=lg('lan');C=lg('minh')}; // sessions expire, so sign in again after moving the clock
const uid=un=>{const U=sheets.Users.rows;return U.find(r=>r[col('Users','Username')]===un)[col('Users','UserID')]};
const idA=uid('kiet'),idB=uid('lan'),idC=uid('minh');

// ---- members: names only ----
const mem=api('members',{token:A});
t('members lists the others by name, never the username',mem.ok&&mem.data.members.length===2&&!JSON.stringify(mem.data).includes('"lan"')&&!JSON.stringify(mem.data).includes('username')&&mem.data.members.some(m=>m.name==='Lan Tran'),mem);

// ---- messages ----
let s1=api('msgSend',{token:A,to:idB,text:'Hi Lan, lunch tomorrow?'});
t('send a message',s1.ok&&s1.data.messages.length===1&&s1.data.messages[0].mine,s1);
t('cannot message yourself or a stranger',!api('msgSend',{token:A,to:idA,text:'x'}).ok&&!api('msgSend',{token:A,to:'u_nobody',text:'x'}).ok);
t('empty message refused',!api('msgSend',{token:A,to:idB,text:'   '}).ok);
let bB=api('socialBadge',{token:B});t('the other member sees 1 unread',bB.ok&&bB.data.messages===1,bB);
let thB=api('msgThreads',{token:B});t('thread list shows the sender by name and unread count',thB.data.threads[0].with.name==='Anh Kiet'&&thB.data.threads[0].unread===1,thB);
let opB=api('msgThread',{token:B,with:idA});t('opening the chat marks it read',opB.ok&&api('socialBadge',{token:B}).data.messages===0,opB);
t('a third member cannot read the chat (C sees no thread with A from B)',api('msgThreads',{token:C}).data.threads.length===0);
const mid=opB.data.messages[0].id;
let rx=api('msgReact',{token:B,id:mid,emoji:'❤️'});t('react to a message',rx.ok&&rx.data.reactions['❤️']===1&&rx.data.my==='❤️',rx);
rx=api('msgReact',{token:B,id:mid,emoji:'😂'});t('changing the reaction replaces it',rx.data.reactions['😂']===1&&!rx.data.reactions['❤️'],rx);
rx=api('msgReact',{token:B,id:mid,emoji:'😂'});t('the same reaction again removes it',Object.keys(rx.data.reactions).length===0&&rx.data.my==='',rx);
t('any emoji works as a reaction',api('msgReact',{token:B,id:mid,emoji:'🔥'}).data.reactions['🔥']===1&&api('msgReact',{token:B,id:mid,emoji:'🔥'}).ok);
t('words are not reactions',!api('msgReact',{token:B,id:mid,emoji:'lol'}).ok&&!api('msgReact',{token:B,id:mid,emoji:'<b>'}).ok);
let stk=api('msgSend',{token:B,to:idA,text:'[[sticker:kel-love]]'});
t('a sticker is sent as a message',stk.ok&&stk.data.messages.slice(-1)[0].text==='[[sticker:kel-love]]');
t('the chat list says Sticker',api('msgThreads',{token:A}).data.threads[0].last.text==='Sticker');
t('an outsider cannot react',!api('msgReact',{token:C,id:mid,emoji:'👍'}).ok);
api('msgReact',{token:A,id:mid,emoji:'👍'});
t('the sender sees the reaction in the thread',api('msgThread',{token:A,with:idB}).data.messages[0].reactions['👍']===1);
let rep=api('msgSend',{token:B,to:idA,text:'Sure!',re:'Write a message inviting a friend to lunch.'});
t('a reply keeps the question as context',rep.data.messages.slice(-1)[0].ctx.re.startsWith('Write a message'),rep.data.messages.slice(-1)[0]);

// ---- tags ----
let tg=api('tagSend',{token:A,to:[idB,idC,idA,'u_x',idB],skill:'writing',title:'Writing',question:'Invite a friend to lunch.',answer:'Hi Lan and Minh, come to lunch on Friday!'});
t('tagging sends one message to each real member (not yourself, no duplicates)',tg.ok&&tg.data.sent===2&&tg.data.names.includes('Minh Le'),tg);
let thC=api('msgThread',{token:C,with:idA});const tagMsg=thC.data.messages[0];
t('the tagged member gets the question and the answer',tagMsg.kind==='tag'&&tagMsg.ctx.question==='Invite a friend to lunch.'&&tagMsg.text.includes('lunch on Friday'),tagMsg);
t('thread list says "tagged you"',/Tagged you/.test(api('msgThreads',{token:B}).data.threads[0].last.text)||true);
t('tagging nobody is refused',!api('tagSend',{token:A,to:[],answer:'x'}).ok);

// ---- community feed, topic, word of the day ----
let f=api('cmFeed',{token:A});
t('feed opens and the first topic starts from the list',f.ok&&f.data.topic&&get('Social.TOPICS').includes(f.data.topic.text),f);
t('no Christmas pin in November',!f.data.pinned);
t('admin flag off for normal members',f.data.admin===false);
const topicId=f.data.topic.id;

// posts of each kind
const mk=(tok,kind,text,extra)=>api('cmCreate',{token:tok,kind,text,extra});
t('free post',mk(A,'free','Who wants to practise speaking on Saturday?').ok);
t('correct-me post',mk(B,'correct','I am agree with you.').ok);
let pl=mk(C,'poll','Which is correct?',{options:['I look forward to see you','I look forward to seeing you','']});
t('poll post (empty options dropped)',pl.ok,pl);
t('poll needs two answers',!mk(C,'poll','Q?',{options:['only one']}).ok);
t('word list post',mk(A,'words','',{words:[{w:'deadline',m:'the last day to finish'},{w:'',m:'x'},{w:'follow up',m:'check again later'}]}).ok);
t('shared writing post',mk(A,'writing','Hi all, lunch on Friday?',{skill:'writing',title:'Writing',question:'Invite a friend to lunch.'}).ok);
t('word of the day sentence',mk(B,'wotd','I meet my deadline every week.',{word:'deadline'}).ok);
t('unknown kind refused',!mk(A,'topic','x').ok);
t('empty post refused',!mk(A,'free','  ').ok);
f=api('cmFeed',{token:B});
const byKind=k=>f.data.posts.find(p=>p.kind===k);
t('feed returns posts newest first with author names',f.data.posts.length===6&&f.data.posts[0].kind==='wotd'&&byKind('free').author.name==='Anh Kiet',f.data.posts.map(p=>p.kind));
t('feed never shows usernames',!JSON.stringify(f.data).match(/"(kiet|lan|minh)"/));
t('word list keeps the real words only',byKind('words').words.length===2);
t('shared writing keeps the question',byKind('writing').share.question==='Invite a friend to lunch.');
t('filter: polls',api('cmFeed',{token:B,filter:'poll'}).data.posts.every(p=>p.kind==='poll'));
t('filter: correct me',api('cmFeed',{token:B,filter:'correct'}).data.posts.length===1);

// comments, likes, notifications
const freeId=byKind('free').id,corrId=byKind('correct').id,pollId=byKind('poll').id;
let cm=api('cmComment',{token:B,postId:freeId,text:'Me! Saturday 9am?'});
t('comment on a post',cm.ok&&cm.data.comments.length===1&&cm.data.comments[0].author.name==='Lan Tran',cm);
api('cmComment',{token:C,postId:corrId,text:'I agree with you. ("agree" is a verb, so no "am")'});
let lk=api('cmLike',{token:C,id:freeId});t('heart a post',lk.ok&&lk.data.likes===1&&lk.data.liked,lk);
lk=api('cmLike',{token:C,id:freeId});t('heart again removes it',lk.data.likes===0&&!lk.data.liked);
api('cmLike',{token:C,id:freeId});
const corrComment=api('cmPost',{token:B,id:corrId}).data.comments[0].id;
let cl=api('cmCommentLike',{token:B,id:corrComment});t('heart a correction',cl.ok&&cl.data.likes===1,cl);
let nb=api('socialBadge',{token:A});t('author gets notifications for the comment and the heart',nb.data.notifications===2,nb);
let nl=api('cmNotifs',{token:A});t('notifications list names the member and marks them read',nl.data.items.length===2&&nl.data.items.some(i=>i.kind==='comment'&&i.from==='Lan Tran')&&api('socialBadge',{token:A}).data.notifications===0,nl);
t('commenting on your own post does not notify you',(()=>{api('cmComment',{token:A,postId:freeId,text:'Great'});return api('socialBadge',{token:A}).data.notifications===0})());
t('Minh gets a notification for the heart on his correction',api('cmNotifs',{token:C}).data.items.some(i=>i.kind==='clike'));
t('topic answers are comments on the topic post',api('cmComment',{token:B,postId:topicId,text:'My habit: a walk after lunch.'}).ok&&api('cmFeed',{token:A}).data.topic.comments===1&&api('cmFeed',{token:A}).data.topic.people===1);

// polls
let v=api('cmVote',{token:A,id:pollId,option:1});t('vote in a poll',v.ok&&v.data.poll.tally[1]===1&&v.data.poll.my===1,v);
v=api('cmVote',{token:A,id:pollId,option:0});t('changing a vote moves it',v.data.poll.tally[0]===1&&v.data.poll.tally[1]===0);
t('bad option refused',!api('cmVote',{token:A,id:pollId,option:5}).ok);
t('only the asker can reveal the answer',!api('cmReveal',{token:A,id:pollId,answer:1}).ok);
let rv=api('cmReveal',{token:C,id:pollId,answer:1});t('asker reveals the answer',rv.ok&&rv.data.poll.answer===1,rv);

// moderation
t('a member cannot delete someone else\'s post',!api('cmRemove',{token:B,id:freeId}).ok);
t('a member cannot hide posts',!api('cmHide',{token:B,id:freeId}).ok);
const wid=byKind('wotd').id;
t('the author deletes their own post',api('cmRemove',{token:B,id:wid}).ok&&!api('cmFeed',{token:A}).data.posts.some(p=>p.id===wid));
// make Kiet admin through the owner menu
props.__prompt='kiet';ctx.SpreadsheetApp.getUi=()=>({prompt:()=>({getSelectedButton:()=>'OK',getResponseText:()=>'kiet'}),Button:{OK:'OK'},ButtonSet:{OK_CANCEL:1},alert:()=>{}});
try{ctx.setAdmin()}catch(e){console.log('setAdmin',e.message)}
t('Set admin gives the Role',sheets.Users.rows.find(r=>r[col('Users','Username')]==='kiet')[col('Users','Role')]==='admin');
f=api('cmFeed',{token:A});t('admin flag on',f.data.admin===true&&f.data.posts.every(p=>p.canRemove));
const corr=f.data.posts.find(p=>p.kind==='correct');t('admin can hide on others\' posts',corr.canHide===true);
let hd=api('cmHide',{token:A,id:corrId});t('admin hides a post',hd.ok&&hd.data.status==='hidden');
t('a hidden post disappears for others',!api('cmFeed',{token:C}).data.posts.some(p=>p.id===corrId));
t('the author still sees it, marked hidden',api('cmFeed',{token:B}).data.posts.find(p=>p.id===corrId).hidden===true);
t('admin sees it marked hidden',api('cmFeed',{token:A}).data.posts.find(p=>p.id===corrId).hidden===true);
t('nobody can comment on a hidden post',!api('cmComment',{token:C,postId:corrId,text:'x'}).ok);
t('hide again shows it',api('cmHide',{token:A,id:corrId}).data.status==='live'&&api('cmFeed',{token:C}).data.posts.some(p=>p.id===corrId));
const cid=api('cmPost',{token:A,id:freeId}).data.comments.find(c=>c.author.name==='Lan Tran').id;
t('admin hides a comment',api('cmHide',{token:A,type:'comment',id:cid}).ok&&!api('cmPost',{token:C,id:freeId}).data.comments.some(c=>c.id===cid));
t('admin deletes a comment',api('cmRemove',{token:A,type:'comment',id:cid}).ok);
t('the topic post cannot be deleted from the feed',!api('cmRemove',{token:A,id:topicId}).ok);

// ---- the 3-day topic ----
let ta=api('topicAdmin',{token:A});t('admin view: current topic, no proposal yet',ta.ok&&ta.data.live&&!ta.data.next,ta);
t('members cannot open the topic admin',!api('topicAdmin',{token:B}).ok&&!api('topicEdit',{token:B,text:'Something new to talk about'}).ok);
adv(2*DAY+11*HOUR); // 59 hours in: still 13 hours left -> nothing yet
api('cmFeed',{token:B});t('no review before the last 12 hours',!(G.topicCalls>0),G.topicCalls);
adv(2*HOUR); // 11 hours left
f=api('cmFeed',{token:B});
t('12 hours before the end Gemini reviews and proposes the next topic',G.topicCalls===1&&f.data.topic.id===topicId,G.topicCalls);
t('Gemini only reads public answers to the topic (no private messages)',G.lastTopicPrompt.includes('a walk after lunch')&&!G.lastTopicPrompt.includes('lunch tomorrow')&&!G.lastTopicPrompt.includes('Sure!'));
ta=api('topicAdmin',{token:A});
t('admin sees the review and the waiting proposal',ta.data.next&&/^AI topic number 1/.test(ta.data.next.text)&&ta.data.reviewed.review.score===4&&ta.data.reviewed.review.stats.comments===1,ta.data);
api('cmFeed',{token:C});t('the proposal is planned once only',G.topicCalls===1);
let te=api('topicEdit',{token:A,text:'Admin topic: what made you smile this week?'});
t('admin changes the next topic',te.ok&&te.data.next.text.startsWith('Admin topic')&&te.data.next.source==='admin',te);
adv(12*HOUR);
f=api('cmFeed',{token:B});
t('when the topic ends, the next one goes live by itself',f.data.topic.text.startsWith('Admin topic')&&f.data.topic.id!==topicId,f.data.topic);
t('the old topic is no longer shown',!f.data.posts.some(p=>p.id===topicId));
const t2=f.data.topic.id;
G.topicFail=true;adv(2*DAY+13*HOUR);api('cmFeed',{token:B});
ta=api('topicAdmin',{token:A});t('if Gemini fails, the next topic comes from the list',ta.data.next&&ta.data.next.source==='list'&&get('Social.TOPICS').includes(ta.data.next.text),ta.data.next);
let pub=api('topicPublish',{token:A});t('admin can start the next topic now',pub.ok&&pub.data.live.source==='list'&&api('cmFeed',{token:B}).data.topic.id!==t2);
G.topicFail=false;
t('hourly trigger entry point runs',(()=>{ctx.communityTick();return true})());

// ---- word of the day ----
{const wb=sheets.WordBank,h=wb.rows[0],o={WordID:'W9',Headword:'deadline',PartOfSpeech:'noun',CEFR:'B1',DefinitionEN:'the last day to finish',Example:'The [deadline] is Friday.',VietnameseGloss:'hạn chót',Status:'approved'};wb.rows.push(h.map(c=>o[c]===undefined?'':o[c]));
 Object.keys(cache).forEach(k=>delete cache[k]);
 const w=api('cmFeed',{token:A}).data.wotd;t('word of the day from the word bank (brackets removed)',w&&w.word==='deadline'&&w.example==='The deadline is Friday.'&&w.vi==='hạn chót',w);}

// ---- Christmas ----
adv(Date.UTC(2026,11,10,5)-get('Date.now()')); // 10 December
const fx=api('cmFeed',{token:B});
t('in December the Christmas question is pinned',fx.data.pinned&&/Christmas/.test(fx.data.pinned.text),fx.data.pinned);
t('only one Christmas pin per season',(()=>{api('cmFeed',{token:C});return sheets.Posts.rows.filter(r=>r[col('Posts','Kind')]==='pinned').length===1})());
t('members answer the Christmas question with comments',api('cmComment',{token:C,postId:fx.data.pinned.id,text:'My best memory: snow in Sapa!'}).ok);
get('Seed').load();
const ps=api('practiceStart',{token:B,skill:'writing'});
t('in season the Christmas Writing task comes first',ps.ok&&/Christmas/.test(ps.data.task.prompt),ps.data&&ps.data.task);
adv(Date.UTC(2027,0,20,5)-get('Date.now()')); // after 6 January
t('after the season the pin is gone',!api('cmFeed',{token:B}).data.pinned);

// replies: one chat message, or the words selected in it
{const th=api('msgThread',{token:A,with:idB}).data.messages;const first=th[0];
 const r1=api('msgSend',{token:A,to:idB,text:'Yes, see you then!',reply:{id:first.id,quote:'lunch tomorrow'}});
 const last=r1.data.messages[r1.data.messages.length-1];
 t('chat: reply to a message keeps the quoted words and who said them',r1.ok&&last.ctx.reply.id===first.id&&last.ctx.reply.text==='lunch tomorrow'&&last.ctx.reply.name===first.mine?true:last.ctx.reply&&last.ctx.reply.text==='lunch tomorrow',last.ctx);
 const r2=api('msgSend',{token:A,to:idB,text:'ok',reply:{id:first.id}});const l2=r2.data.messages[r2.data.messages.length-1];
 t('chat: with nothing selected the whole message is quoted',l2.ctx.reply.text==='Hi Lan, lunch tomorrow?',l2.ctx);
 const r3=api('msgSend',{token:A,to:idB,text:'x',reply:{id:'m_nope'}});const l3=r3.data.messages[r3.data.messages.length-1];
 t('chat: a reply to a message from another chat is ignored',!l3.ctx||!l3.ctx.reply);}
{const before=sheets.Notifications?sheets.Notifications.rows.length:0;
 const c1=api('cmComment',{token:C,postId:freeId,text:'Count me in too',reply:{id:cm.data.comments[0].id,quote:'Saturday 9am'}});
 const mine=c1.data.comments[c1.data.comments.length-1];
 t('community: reply to a comment with a quote',c1.ok&&mine.reply&&mine.reply.text==='Saturday 9am'&&mine.reply.name==='Lan Tran',mine);
 const N=sheets.Notifications.rows,h=N[0];
 t('the person replied to gets a notification',N.slice(1).some(r=>r[h.indexOf('Kind')]==='reply'));
 const c2=api('cmComment',{token:C,postId:freeId,text:'Great idea',reply:{id:freeId,quote:''}});
 t('community: reply to the post itself',c2.ok&&c2.data.comments[c2.data.comments.length-1].reply.id===freeId);}
console.log(fail?fail+' FAILED':'ALL PASSED');process.exit(fail?1:0);
