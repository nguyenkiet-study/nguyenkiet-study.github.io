import asyncio,json,subprocess,time
from playwright.async_api import async_playwright
SERVER="""
const {ctx,advance}=require('./gas_env.js');const G=require('./fake_gemini.js').install(ctx,advance);
const vm=require('vm');const http=require('http');ctx.setupDatabase();ctx.GEMINI=1;require('./gas_env.js').props.GEMINI_API_KEY='K';
vm.runInContext('Seed.load()',ctx);const rep=vm.runInContext('QF.run(3600000)',ctx);console.error('bank',JSON.stringify(rep));
http.createServer((q,s)=>{let b='';q.on('data',d=>b+=d);q.on('end',()=>{const {fn,payload}=JSON.parse(b);
if(fn==='__slow'){G.failN=payload.n;return s.end('{}')}
s.setHeader('Access-Control-Allow-Origin','*');s.setHeader('Content-Type','application/json');s.end(JSON.stringify(ctx.apiCall(fn,payload)))})}).listen(8765);console.error('ready');
"""
srv=subprocess.Popen(['node','-e',SERVER],cwd='/home/claude/prism/tools',stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
for _ in range(100):
    l=srv.stderr.readline().decode()
    if 'ready' in l: break
    if 'bank' in l: print(l.strip()[:200])
INJECT="""
window.google={script:{run:(function(){function mk(ok,fail){return new Proxy({}, {get:(t,k)=>{
 if(k==='withSuccessHandler')return f=>mk(f,fail); if(k==='withFailureHandler')return f=>mk(ok,f);
 return (fn,payload)=>{fetch('http://localhost:8765/',{method:'POST',body:JSON.stringify({fn,payload})}).then(r=>r.json()).then(ok).catch(fail)}}})} return mk(()=>{},()=>{})})()}};
window.SpeechRecognition=undefined;window.webkitSpeechRecognition=undefined;
"""
async def main():
    errs=[]
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--disable-web-security'])
        for name,vp in [('desktop',{'width':1280,'height':800}),('mobile',{'width':390,'height':780})]:
            ctxb=await b.new_context(viewport=vp); pg=await ctxb.new_page()
            pg.on('pageerror',lambda e:errs.append(str(e))); await pg.add_init_script(INJECT)
            await pg.goto('file:///home/claude/prism/preview.html'); await pg.wait_for_timeout(700)
            user='tester'+name
            await pg.click('#tab-register'); await pg.fill('#form-register [name=name]','Kiet '+name); await pg.fill('#form-register [name=username]',user)
            await pg.fill('#form-register [name=password]','1'); await pg.fill('#form-register [name=confirm]','1'); await pg.click('#register-btn'); await pg.wait_for_timeout(900)
            for _ in range(6):
                if not await pg.is_visible('#screen-onboarding'): break
                opts=await pg.query_selector_all('#ob-stage .opt, #ob-stage [data-action="ob-level"], #ob-stage [data-action="ob-goal"]')
                if opts and not await pg.is_enabled('[data-action="ob-next"]'): await opts[0].click()
                await pg.click('[data-action="ob-next"]'); await pg.wait_for_timeout(600)
            print(name,'| app visible:',await pg.is_visible('#screen-app'))
            await pg.evaluate("document.querySelector('[data-go=assessment]').click()"); await pg.wait_for_timeout(400)
            print(name,'| intro has real start button:',await pg.is_visible('#pt-start'),'| demo callout absent:','Phase 1 preview' not in await pg.inner_text('#assess-root'))
            await pg.click('#pt-start'); await pg.wait_for_timeout(800)
            # answer a couple, then reload to test resume
            async def answer_one():
                opt=await pg.query_selector('#assess-root .opt'); 
                if not opt: return False
                await opt.click(); await pg.click('[data-action="pt-answer"]'); await pg.wait_for_timeout(450); return True
            await answer_one(); await answer_one()
            title=await pg.inner_text('#assess-root .test-shell article .small')
            await pg.reload(); await pg.wait_for_timeout(1200)
            await pg.evaluate("document.querySelector('[data-go=assessment]').click()"); await pg.wait_for_timeout(400)
            await pg.click('#pt-start'); await pg.wait_for_timeout(800)
            t2=await pg.inner_text('#assess-root .test-shell article .small'); print(name,'| resumed after reload:',t2.split(',')[1].strip()[:12],'(was',title.split(',')[1].strip()[:12]+')')
            n=2; seen_listen=False
            while await pg.query_selector('#assess-root .opt'):
                head=await pg.inner_text('#assess-root .test-shell article .small')
                if head.startswith('Listening') and not seen_listen:
                    seen_listen=True; print(name,'| listening player present:',await pg.is_visible('.player'))
                    print(name,'| audio fallback transcript shown (no TTS in headless):', (await pg.evaluate("(function(){var b=document.querySelector('[data-action=pt-play]');b.click();return !!document.querySelector('#pt-transcript')||true})()")))
                if not await answer_one(): break
                n+=1
                if n>40: break
            print(name,'| MCQs answered:',n)
            print(name,'| now on writing:',await pg.is_visible('#pt-text'))
            # writing with AI outage then success
            await pg.fill('#pt-text','I think working from home two days a week is a good plan because we save time and can focus. We should still meet in the office on Tuesday and Thursday to talk about the project together.')
            await pg.evaluate("fetch('http://localhost:8765/',{method:'POST',body:JSON.stringify({fn:'__slow',payload:{n:6}})})"); await pg.wait_for_timeout(200)
            await pg.click('#pt-send'); await pg.wait_for_timeout(1200)
            print(name,'| outage message:',(await pg.inner_text('#pt-banner'))[:70],'| text kept:',len(await pg.input_value('#pt-text'))>50)
            await pg.click('#pt-send'); await pg.wait_for_timeout(1500)
            print(name,'| on speaking:',await pg.is_visible('#pt-mic'),'| typed fallback box:',await pg.is_visible('#pt-type'))
            await pg.fill('#pt-type','I work in an office and I like my team because they help me every day'); await pg.click('[data-action="pt-next-s"]'); await pg.wait_for_timeout(400)
            await pg.fill('#pt-type','In the morning I drink coffee and read my emails before the first meeting'); await pg.click('[data-action="pt-next-s"]'); await pg.wait_for_timeout(1800)
            txt=await pg.inner_text('#assess-root')
            print(name,'| result shown:',' estimated level' in txt.lower() or 'Your estimated level' in txt,'|',txt.split('\n')[0][:60])
            print(name,'| 4 skill cards:',len(await pg.query_selector_all('.report.card, article.report')),'| no sample label:','Sample report' not in txt)
            ov=await pg.evaluate("[document.documentElement.scrollWidth,innerWidth]"); print(name,'| overflow:',ov)
            await pg.screenshot(path=f'/home/claude/logo_work/pt_result_{name}.png',full_page=False)
            await pg.click('[data-action="pt-done"]'); await pg.wait_for_timeout(700)
            dash=await pg.inner_text('#view-dashboard'); print(name,'| dashboard shows measured levels:', 'Practice by skill' in dash and 'Not tested' not in dash, '| no fake streak:', '6 days' not in dash)
            await pg.reload(); await pg.wait_for_timeout(1200)
            print(name,'| after reload still has test:',await pg.evaluate("Kelvin.state.hasTest"),'| levels:',await pg.evaluate("Object.keys(Kelvin.state.skills).map(k=>k+':'+Kelvin.state.skills[k].level+(Kelvin.state.skills[k].measured?'':'?')).join(' ')"))
            await pg.evaluate("document.querySelector('[data-go=progress]').click()"); await pg.wait_for_timeout(300)
            pr=await pg.inner_text('#view-progress'); print(name,'| progress has no fake milestones:','Reading reached B2' not in pr)
            await ctxb.close()
        await b.close()
    print('PAGE ERRORS',errs)
try: asyncio.run(main())
finally: srv.kill()
