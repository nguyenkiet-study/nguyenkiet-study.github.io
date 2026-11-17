// Runs the server files against an in-memory fake of Sheets, Utilities, Cache, Lock and Properties.
const fs=require('fs'),vm=require('vm'),crypto=require('crypto'),path=require('path');
const dir=path.join(__dirname,'..');
class FakeSheet{constructor(n){this.n=n;this.rows=[];this.frozen=0}
 getLastRow(){let l=0;this.rows.forEach((r,i)=>{if(r&&r.some(v=>v!==''&&v!==undefined))l=i+1});return l}
 getLastColumn(){return this.rows.reduce((m,r)=>Math.max(m,r?r.length:0),0)}
 getMaxRows(){return Math.max(this.rows.length,1000)} getMaxColumns(){return 26}
 getRange(r,c,nr=1,nc=1){const s=this;return{getValues(){const o=[];for(let i=0;i<nr;i++){const row=s.rows[r-1+i]||[];o.push(Array.from({length:nc},(_,j)=>row[c-1+j]===undefined?'':row[c-1+j]))}return o},
  setValues(v){for(let i=0;i<nr;i++){s.rows[r-1+i]=s.rows[r-1+i]||[];for(let j=0;j<nc;j++)s.rows[r-1+i][c-1+j]=v[i][j]}},
  setFontWeight(){return this},setBackground(){return this},setFontColor(){return this},setNumberFormat(){return this}}}
 deleteRow(r){this.rows.splice(r-1,1)} setFrozenRows(){} insertColumnsAfter(){} setTabColor(){}}
const sheets={};const ss={getSheetByName:n=>sheets[n]||null,insertSheet:n=>sheets[n]=new FakeSheet(n),getSheets:()=>Object.values(sheets),getId:()=>'SSID',deleteSheet(){}};
const props={};const cache={};let clock=process.env.KELVIN_CLOCK?+process.env.KELVIN_CLOCK:Date.now();
const signed=b=>Array.from(b).map(x=>x>127?x-256:x);
const unsigned=a=>Buffer.from(a.map(x=>x<0?x+256:x));
const ctx={console,Date:class extends Date{constructor(...a){super(...(a.length?a:[clock]))}static now(){return clock}},
 SpreadsheetApp:{getActiveSpreadsheet:()=>ss,openById:()=>ss,getUi(){throw new Error('no ui')}},
 PropertiesService:{getScriptProperties:()=>({getProperty:k=>props[k]===undefined?null:props[k],setProperty:(k,v)=>props[k]=v,deleteProperty:k=>delete props[k]})},
 CacheService:{getScriptCache:()=>({get:k=>cache[k]===undefined?null:cache[k],put:(k,v)=>cache[k]=v,remove:k=>delete cache[k],getAll:ks=>{const o={};ks.forEach(k=>{if(cache[k]!==undefined)o[k]=cache[k]});return o},putAll:o=>Object.assign(cache,o)})},
 LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})},
 Session:{getActiveUser:()=>({getEmail:()=>'owner@x'}),getEffectiveUser:()=>({getEmail:()=>'owner@x'}),getScriptTimeZone:()=>'Asia/Saigon'},
 Utilities:{getUuid:()=>crypto.randomUUID(),DigestAlgorithm:{SHA_256:'sha256',MD5:'md5'},Charset:{UTF_8:'u'},
  computeDigest:(a,t)=>signed(crypto.createHash('sha256').update(typeof t==='string'?t:unsigned(t)).digest()),
  computeHmacSha256Signature:(v,k)=>signed(crypto.createHmac('sha256',typeof k==='string'?k:unsigned(k)).update(typeof v==='string'?v:unsigned(v)).digest()),
  base64Encode:b=>Buffer.from(typeof b==='string'?b:unsigned(b)).toString('base64'),base64EncodeWebSafe:b=>Buffer.from(typeof b==='string'?b:unsigned(b)).toString('base64').replace(/\+/g,'-').replace(/\//g,'_'),base64Decode:s=>signed(Buffer.from(s,'base64')),
  sleep(){},formatDate:(d,tz,f)=>new Date(d.getTime()-8*3600e3).toISOString().slice(0,10),newBlob:s=>({getBytes:()=>signed(Buffer.from(s,'utf8'))}),parseCsv:s=>s.trim().split('\n').map(l=>l.split(','))}};
ctx.UrlFetchApp={fetch:(u,o)=>ctx.__fetch(u,o)};
// a tiny Drive: folders and text files in memory
const drive={folders:{},files:{},n:0};
const mkFile=(name,text)=>{const id='f'+(++drive.n),f={getId:()=>id,getName:()=>name,getBlob:()=>({getDataAsString:()=>text})};drive.files[id]=f;return f};
const mkFolder=name=>{const id='d'+(++drive.n),list=[];const f={getId:()=>id,getName:()=>name,createFile:(n,t)=>{const x=mkFile(n,t);list.push(x);return x},getFilesByName:n=>{const m=list.filter(x=>x.getName()===n);let i=0;return {hasNext:()=>i<m.length,next:()=>m[i++]}}};drive.folders[id]=f;return f};
ctx.DriveApp={createFolder:mkFolder,getFolderById:id=>{if(!drive.folders[id])throw new Error('no folder');return drive.folders[id]},getFileById:id=>{if(!drive.files[id])throw new Error('no file');return drive.files[id]}};
ctx.__drive=drive;vm.createContext(ctx);
// Apps Script shares one global scope; const/class at top level are visible to later files. Concatenate in load order.
const files=process.env.KELVIN_MERGED?['apps_script/Backend.gs']:['Config.gs','Common.gs','Database.gs','Auth.gs','UserProfile.gs','AIService.gs','AdaptiveEngine.gs','QuestionFactory.gs','Seed.gs','Placement.gs','WordsService.gs','SavedWords.gs','GrammarSeed.gs','GrammarSeedB1.gs','Grammar.gs','History.gs','Tts.gs','Plan.gs','ProgressTracker.gs','Practice.gs','ConversationSeed.gs','Conversation.gs','Drill.gs','Community.gs','Api.gs','Setup.gs'];
vm.runInContext(files.map(f=>fs.readFileSync(path.join(dir,f),'utf8')).join('\n')+'\n;this.__x={CONFIG,SCHEMA,AppError,Db,Auth}',ctx);
module.exports={ctx,sheets,props,cache,advance:ms=>{clock+=ms}};
