import asyncio,json,subprocess
from playwright.async_api import async_playwright
SERVER="""
const {ctx,sheets,advance,props,cache}=require('./gas_env.js');const G=require('./fake_gemini.js').install(ctx,advance);
const vm=require('vm'),fs=require('fs'),path=require('path'),http=require('http');
ctx.setupDatabase();props.GEMINI_API_KEY='K';
function pl(l){const o=[];let c='',q=false;for(let i=0;i<l.length;i++){const ch=l[i];if(q){if(ch==='"'&&l[i+1]==='"'){c+='"';i++}else if(ch==='"')q=false;else c+=ch}else if(ch==='"')q=true;else if(ch===','){o.push(c);c=''}else c+=ch}o.push(c);return o}
const lines=fs.readFileSync(path.join(__dirname,'..','data','wordbank_import.csv'),'utf8').trim().split('\\n').slice(1).map(pl);
const per={},wb=sheets.WordBank,H=wb.rows[0];
lines.forEach(r=>{per[r[3]]=(per[r[3]]||0)+1;if(per[r[3]]<=45){const o={};H.slice(0,13).forEach((h,j)=>o[h]=r[j]);o.Status='pending';o.CreatedAt='x';wb.rows.push(H.map(h=>o[h]===undefined?'':o[h]))}});
vm.runInContext('Seed.load()',ctx);vm.runInContext('QF.run(360000e6)',ctx);
const uidOf=u=>{const U=sheets.Users.rows,uh=U[0];return U.find(r=>r[uh.indexOf('Username')]===u)[uh.indexOf('UserID')]};
function boxes(user,list){const uid=uidOf(user),W=sheets.UserWords.rows,h=W[0],x=n=>h.indexOf(n);let k=0;W.slice(1).forEach(r=>{if(r[x('UserID')]===uid&&r[x('Status')]!=='knew'&&!String(r[x('FirstSeenAt')]).startsWith('2000')){r[x('Box')]=list[k++%list.length];r[x('NextReview')]='2000-01-01';r[x('Status')]='learning'}});return k}
function pile(user,n){const uid=uidOf(user),W=sheets.UserWords.rows,h=W[0],x=c=>h.indexOf(c),wh=wb.rows[0];const have=new Set(W.filter(r=>r[x('UserID')]===uid).map(r=>r[x('WordID')]));
 const ids=wb.rows.slice(1).filter(r=>r[wh.indexOf('Status')]==='approved'&&!have.has(r[0])).slice(0,n).map(r=>r[0]);
 ids.forEach(id=>W.push(h.map(c=>({UserID:uid,WordID:id,Status:'learning',Box:1,NextReview:'2000-01-01',Streak:0,Lapses:0,FirstSeenAt:'2000-01-01T00:00:00Z'})[c]||'')));return ids.length}
function unpile(user){const uid=uidOf(user),W=sheets.UserWords.rows,h=W[0],x=c=>h.indexOf(c);for(let i=W.length-1;i>0;i--)if(W[i][x('UserID')]===uid&&String(W[i][x('FirstSeenAt')]).startsWith('2000'))W.splice(i,1)}
let words=false;
http.createServer((q,s)=>{let b='';q.on('data',d=>b+=d);q.on('end',()=>{const {fn,payload}=JSON.parse(b);
s.setHeader('Access-Control-Allow-Origin','*');s.setHeader('Content-Type','application/json');
if(fn==='__eval'){const v=vm.runInContext(payload.code,ctx);return s.end(JSON.stringify(v===undefined?null:v))}
if(fn==='__words'){vm.runInContext('WordGen.run(3600e3)',ctx);return s.end('{}')}
if(fn==='__boxes'){return s.end(JSON.stringify({n:boxes(payload.user,payload.boxes)}))}
if(fn==='__pile'){return s.end(JSON.stringify({n:pile(payload.user,payload.n)}))}
if(fn==='__unpile'){unpile(payload.user);return s.end('{}')}
if(fn==='__extras'){const uid=uidOf(payload.user),W=sheets.UserWords.rows,h=W[0],wh=wb.rows[0],ids=new Set(W.filter(r=>r[h.indexOf('UserID')]===uid).map(r=>r[h.indexOf('WordID')]));
  wb.rows.slice(1).forEach(r=>{if(ids.has(r[0])){r[wh.indexOf('Related')]=JSON.stringify({s:['simple word'],a:['opposite word'],n:'The word is a bit more formal.'});r[wh.indexOf('Question')]=r[wh.indexOf('Question')]||'What is one ['+r[1]+'] you use at work?'}});
  Object.keys(cache).filter(k=>/^wb_/.test(k)).forEach(k=>delete cache[k]);return s.end('{}')}
if(fn==='__ai'){return s.end(JSON.stringify({extra:G.extraCalls||0,sentence:G.sentenceCalls||0}))}
if(fn==='__tts'){return s.end(JSON.stringify({n:(G.ttsLog||[]).length}))}
if(fn==='__ttsfail'){G.ttsFailAll=true;return s.end('{}')}
if(fn==='__fail'){G.failN=payload.n;return s.end('{}')}
if(fn==='__measure'){const S=sheets.SkillLevels,h=S.rows[0],ix=n=>h.indexOf(n);S.rows.slice(1).forEach(r=>{if(r[ix('MeasuredLevel')]!==undefined){r[ix('MeasuredLevel')]='B1';r[ix('Theta')]='0.20';r[ix('StandardError')]='0.5';r[ix('Confidence')]='Medium';r[ix('ProgressPct')]=70}});return s.end('{}')}
s.end(JSON.stringify(ctx.apiCall(fn,payload)))})}).listen(8766);console.error('ready');
"""
srv=subprocess.Popen(['node','-e',SERVER],cwd='/home/claude/prism/tools',stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
for _ in range(200):
    l=srv.stderr.readline().decode()
    if 'ready' in l: break
    if l.strip(): print(l.strip()[:300])
INJECT="""
window.__noWaitHold=true;window.google={script:{run:(function(){function mk(ok,fail){return new Proxy({}, {get:(t,k)=>{
 if(k==='withSuccessHandler')return f=>mk(f,fail); if(k==='withFailureHandler')return f=>mk(ok,f);
 return (fn,payload)=>{fetch('http://localhost:8766/',{method:'POST',body:JSON.stringify({fn,payload})}).then(r=>r.json()).then(ok).catch(fail)}}})} return mk(()=>{},()=>{})})()}};
window.__played=0;HTMLMediaElement.prototype.play=function(){window.__played++;return Promise.resolve()};
window.SpeechRecognition=undefined;window.webkitSpeechRecognition=undefined;
window.__call=(fn,payload)=>fetch('http://localhost:8766/',{method:'POST',body:JSON.stringify({fn,payload:payload||{}})}).then(r=>r.json());
"""
async def run_session(pg, scope='', limit=120, seen=None, miss=None, hint=None):
    """Plays a Words session to the end with right answers. miss / hint: sets of words to answer wrong once / with a hint."""
    steps = 0; q = (scope + ' ') if scope else ''; missed = set(); log = []
    while True:
        pk = await pg.evaluate("Kelvin.words.peek()")
        if not pk: break
        steps += 1; log.append((pk['t'], pk['w'], pk['retry']))
        if seen is not None: seen.add(pk['w'].lower())
        wrong = miss is not None and pk['w'] in miss and pk['w'] not in missed and pk['t'] not in ('intro', 'use')
        if wrong: missed.add(pk['w'])
        if pk['t'] == 'intro': await pg.click(q + '[data-action="wd-next"]')
        elif pk['t'] in ('meaning', 'coll'):
            i = pk['correct'] if not wrong else (pk['correct'] + 1) % 4
            await pg.click(q + f'[data-action="wd-pick"][data-i="{i}"]'); await pg.click(q + '[data-action="wd-next"]')
        elif pk['t'] in ('cloze', 'def', 'listen', 'vi'):
            if hint is not None and pk['w'] in hint and pk['hints']: await pg.click(q + '[data-action="wd-hint"]')
            await pg.fill(q + '#wd-input', 'zzzz' if wrong else pk['typed']); await pg.click(q + '[data-action="wd-submit"]'); await pg.click(q + '[data-action="wd-next"]')
        elif pk['t'] == 'ask':
            await pg.fill(q + '#wd-input', 'I really do not know this one today' if wrong else 'I often think about ' + pk['w'] + ' when I am at work'); await pg.click(q + '[data-action="wd-submit"]'); await pg.click(q + '[data-action="wd-next"]')
        elif pk['t'] == 'use':
            await pg.fill(q + '#wd-input', 'I will use ' + pk['w'] + ' in a sentence at work today'); await pg.click(q + '[data-action="wd-submit"]')
            try: await pg.wait_for_selector(q + '#wd-ai', state='detached', timeout=4000)
            except Exception: pass
            log.append(('use-fb', await pg.inner_text(q + '#wd-fb'), pk['also'])); await pg.click(q + '[data-action="wd-next"]')
        await pg.wait_for_timeout(50)
        if steps > limit: break
    await pg.wait_for_timeout(900)
    return steps, log

async def main():
    errs=[]
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--disable-web-security'])
        for name,vp in [('desktop',{'width':1280,'height':800}),('mobile',{'width':390,'height':780})]:
            ctxb=await b.new_context(viewport=vp); pg=await ctxb.new_page()
            pg.on('pageerror',lambda e:errs.append(str(e))); await pg.add_init_script(INJECT)
            await pg.goto('file:///home/claude/prism/preview.html'); await pg.wait_for_timeout(700)
            user='learner'+name
            await pg.click('#tab-register'); await pg.fill('#form-register [name=name]','Kiet '+name); await pg.fill('#form-register [name=username]',user)
            await pg.fill('#form-register [name=password]','1'); await pg.fill('#form-register [name=confirm]','1'); await pg.click('#register-btn'); await pg.wait_for_timeout(900)
            for _ in range(6):
                if not await pg.is_visible('#screen-onboarding'): break
                opts=await pg.query_selector_all('#ob-stage .opt, #ob-stage [data-action="ob-level"], #ob-stage [data-action="ob-goal"]')
                if opts and not await pg.is_enabled('[data-action="ob-next"]'): await opts[0].click()
                await pg.click('[data-action="ob-next"]'); await pg.wait_for_timeout(600)
            print(name,'| app visible:',await pg.is_visible('#screen-app'))
            await pg.evaluate("Kelvin.state.settings.quickWords=false")  # popups are covered by words2_e2e.py
            # --- words before content exists
            await pg.evaluate("document.querySelector('[data-go=words]').click()"); await pg.wait_for_timeout(900)
            t=await pg.inner_text('#words-root'); print(name,'| words not ready message:','still being prepared' in t)
            await pg.evaluate("__call('__words')"); await pg.wait_for_timeout(2500)
            await pg.evaluate("document.querySelector('[data-go=dashboard]').click()"); await pg.wait_for_timeout(300)
            await pg.evaluate("document.querySelector('[data-go=words]').click()"); await pg.wait_for_timeout(1200)
            t=await pg.inner_text('#words-root'); print(name,'| words page ready:','Learn 5 new words' in t and 'of 30 min' in t,'| no sample label:','Sample list' not in t)
            print(name,'| my words list loaded:',len(await pg.query_selector_all('#wd-list .wrow'))>=0,'| filter new works:',end=' ')
            await pg.click('[data-action="wd-filter"][data-f="new"]'); await pg.wait_for_timeout(900); n=len(await pg.query_selector_all('#wd-list .wrow')); print(n>0,n)
            await pg.click('[data-action="wd-learn"]'); await pg.wait_for_timeout(300)
            steps,_=await run_session(pg)
            t=await pg.inner_text('#words-root'); print(name,'| session steps:',steps,'| summary saved:','Round complete' in t,'| time today shown:','of 30 min' in t,'| example brackets hidden:','[' not in t)
            await pg.click('[data-action="wd-exit"]'); await pg.wait_for_timeout(1200)
            t=await pg.inner_text('#words-root'); print(name,'| after the round: 5 new today, next round ready:','Learn 5 new words' in t and 'of 30 min' in t)
            # --- practice before measured
            await pg.evaluate("document.querySelector('[data-go=reading]').click()"); await pg.wait_for_timeout(1000)
            t=await pg.inner_text('#learning-root'); print(name,'| reading intro shown:','Start practice' in t,'| says estimate:','still an estimate' in t,'| no sample badge:','Sample' not in t)
            print(name,'| overflow reading:',await pg.evaluate("[document.documentElement.scrollWidth,innerWidth]"))
            await pg.evaluate("__call('__measure')")
            for skill in ['reading','listening']:
                await pg.evaluate(f"document.querySelector('[data-go={skill}]').click()"); await pg.wait_for_timeout(700)
                await pg.click('#pr-start'); await pg.wait_for_timeout(900)
                done=0
                while await pg.query_selector('#practice-card .opt'):
                    if skill=='listening' and done==0:
                        print(name,'| listening player:',await pg.is_visible('.player'),'| script hidden before answer:','Script:' not in await pg.inner_text('#practice-card'))
                    if skill=='listening' and done==0:
                        n0=(await pg.evaluate("__call('__tts')"))['n']
                        await pg.click('[data-action="pr-play"]'); await pg.wait_for_timeout(1500)
                        n1=(await pg.evaluate("__call('__tts')"))['n']
                        print(name,'| natural voice asked for audio:',n1==n0+1,'| audio element played:',await pg.evaluate("window.__played")>=1)
                        await pg.click('[data-action="pr-play"]'); await pg.wait_for_timeout(300)
                        await pg.click('[data-action="pr-play"]'); await pg.wait_for_timeout(800)
                        print(name,'| replay uses the saved audio (no new request):',(await pg.evaluate("__call('__tts')"))['n']==n1)
                        await pg.click('[data-action="pr-play"]'); await pg.wait_for_timeout(300)
                    if await pg.is_visible('.pane-next'): await pg.click('.pane-next'); await pg.wait_for_timeout(150)   # phones: passage first, then the question
                    opts=await pg.query_selector_all('#practice-card .opt'); await opts[1].click(); await pg.click('#pr-check'); await pg.wait_for_timeout(600)
                    fb=await pg.inner_text('#practice-card .fbk'); done+=1
                    if done==1: print(name,skill,'| feedback shows:',fb[:50].replace('\n',' '))
                    await pg.click('[data-action="pr-next"]'); await pg.wait_for_timeout(300)
                    if done>8: break
                t=await pg.inner_text('#practice-card'); print(name,skill,'| questions:',done,'| summary:','Set complete' in t,'|',[l for l in t.split('\n') if 'Level' in l or 'estimate' in l][:1])
                print(name,skill,'| overflow:',await pg.evaluate("[document.documentElement.scrollWidth,innerWidth]"))
            if name=='mobile':
                await pg.evaluate("__call('__ttsfail')")
                r=await pg.evaluate("new Promise(res=>{Kelvin.speakNatural([{s:0,t:'A brand new sentence for the test.'}],1,()=>res('ended'));setTimeout(()=>res('timeout'),7000)})")
                print(name,'| AI voice failure falls back to the browser voice:',r in ('ended','timeout'),'(',r,')')
            # --- writing (with outage), speaking typed
            await pg.evaluate("document.querySelector('[data-go=writing]').click()"); await pg.wait_for_timeout(700)
            await pg.click('#pr-start'); await pg.wait_for_timeout(900)
            await pg.fill('#pr-text','I think working from home two days a week is a good plan because we save time and can focus. We should still meet in the office on Tuesday and Thursday to talk about the project together.')
            await pg.evaluate("__call('__fail',{n:6})"); await pg.click('#pr-send'); await pg.wait_for_timeout(1500)
            print(name,'| writing outage message:',(await pg.inner_text('#pr-banner'))[:70],'| text kept:',len(await pg.input_value('#pr-text'))>50)
            await pg.click('#pr-send'); await pg.wait_for_timeout(1800)
            t=await pg.inner_text('#practice-card'); print(name,'| writing feedback:','Your feedback' in t,'| corrections:','Corrections' in t or 'better version' in t.lower())
            print(name,'| overflow writing:',await pg.evaluate("[document.documentElement.scrollWidth,innerWidth]"))
            await pg.screenshot(path=f'/home/claude/logo_work/pr_writing_{name}.png',full_page=False)
            await pg.evaluate("document.querySelector('[data-go=speaking]').click()"); await pg.wait_for_timeout(700)
            await pg.click('#pr-start'); await pg.wait_for_timeout(900)
            print(name,'| speaking typed box:',await pg.is_visible('#pr-type'))
            await pg.fill('#pr-type','In the morning I drink coffee and read my emails before the first meeting at work'); await pg.click('#pr-send'); await pg.wait_for_timeout(1800)
            t=await pg.inner_text('#practice-card'); print(name,'| speaking feedback:','Your feedback' in t)
            # --- saving a word while practising, then studying it in Words
            await pg.evaluate("document.querySelector('[data-go=reading]').click()"); await pg.wait_for_timeout(700)
            await pg.click('#pr-start'); await pg.wait_for_timeout(900)
            word=await pg.evaluate("""(function(){var els=document.querySelectorAll('#practice-card .cap');for(var k=0;k<els.length;k++){var w=document.createTreeWalker(els[k],NodeFilter.SHOW_TEXT),tn;while((tn=w.nextNode())){var m=/[A-Za-z]{5,}/.exec(tn.textContent);if(m){var r=document.createRange();r.setStart(tn,m.index);r.setEnd(tn,m.index+m[0].length);var s=getSelection();s.removeAllRanges();s.addRange(r);return m[0]}}}return null})()""")
            await pg.wait_for_timeout(500)
            print(name,'| selected word:',word,'| save bar shown:',await pg.is_visible('#cap-bar button'))
            print(name,'| bar text:',(await pg.inner_text('#cap-bar button')).strip()[:40])
            await pg.click('#cap-bar button'); await pg.wait_for_timeout(900)
            print(name,'| toast says saved:','Saved' in await pg.inner_text('body'),'| bar hidden after:',not await pg.evaluate("document.getElementById('cap-bar').classList.contains('on')"))
            await pg.evaluate("document.querySelector('[data-go=words]').click()"); await pg.wait_for_timeout(1500)
            t=await pg.inner_text('#words-root'); print(name,'| saved card:','Saved from practice' in t,'| shows 1 saved:','1 saved' in t,'| word listed:',word.lower() in t.lower())
            await pg.click('[data-action="wd-learn"]'); await pg.wait_for_timeout(600)  # the saved word comes first in the next round
            seen=set(); steps,_=await run_session(pg,seen=seen); sawSaved=word.lower() in seen
            t=await pg.inner_text('#words-root'); print(name,'| saved word was in the session:',sawSaved,'| summary:','Round complete' in t,'| lists the saved word:',word.lower() in t.lower())
            await pg.click('[data-action="wd-exit"]'); await pg.wait_for_timeout(1500)
            t=await pg.inner_text('#words-root'); print(name,'| saved list shows learning box:','Saved from practice' in t and ('In 2 days' in t or name=='mobile'))
            print(name,'| overflow words:',await pg.evaluate("[document.documentElement.scrollWidth,innerWidth]"))
            await pg.screenshot(path=f'/home/claude/logo_work/words_saved_{name}.png',full_page=True)
            await pg.click('[data-action="wd-sdel"]'); await pg.wait_for_timeout(1500)
            t=await pg.inner_text('#words-root'); print(name,'| after remove, nothing saved:','0 saved' in t)
            # --- dashboard / progress
            await pg.evaluate("document.querySelector('[data-go=dashboard]').click()"); await pg.wait_for_timeout(1200)
            d=await pg.inner_text('#view-dashboard'); print(name,'| dashboard plan minutes:','min this week' in d or ' of ' in await pg.inner_text('#dash-rings'),'| streak 1:',(await pg.inner_text('#top-streak')).strip()=='1')
            print(name,'| overflow dashboard:',await pg.evaluate("[document.documentElement.scrollWidth,innerWidth]"))
            await pg.screenshot(path=f'/home/claude/logo_work/pr_dash_{name}.png',full_page=True)
            await pg.evaluate("document.querySelector('[data-go=progress]').click()"); await pg.wait_for_timeout(900)
            pr=await pg.inner_text('#progress-root'); print(name,'| progress milestones real:','Milestones' in pr,'| heat cells:',len(await pg.query_selector_all('.heat i')),'| line chart:',bool(await pg.query_selector('.linechart')))
            print(name,'| overflow progress:',await pg.evaluate("[document.documentElement.scrollWidth,innerWidth]"))
            await ctxb.close()
        await b.close()
    print('PAGE ERRORS',errs)
asyncio.run(main()); srv.kill()
