# Real-mode browser test: the UI calls window.google.script.run, which forwards to the Node fake of the server code.
import asyncio,json,subprocess,time,urllib.request,sys
from playwright.async_api import async_playwright
srv=subprocess.Popen(['node','-e',"""
const {ctx,props}=require('./gas_env.js');const http=require('http');ctx.setupDatabase();
if(process.argv[1]==='invite')props.INVITE_CODE='friends';
http.createServer((q,s)=>{let b='';q.on('data',d=>b+=d);q.on('end',()=>{const {fn,payload}=JSON.parse(b);if(fn==='__expire'){require('./gas_env.js').advance(73*3600*1000);return s.end('{}')}
s.setHeader('Access-Control-Allow-Origin','*');s.setHeader('Content-Type','application/json');s.end(JSON.stringify(ctx.apiCall(fn,payload)))})}).listen(8765);
""".replace('process.argv[1]',"'%s'"%(sys.argv[1] if len(sys.argv)>1 else ''))],cwd='/home/claude/prism/tools',stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
time.sleep(1.5)
INJECT="""
window.google={script:{run:(function(){function mk(ok,fail){return new Proxy({}, {get:(t,k)=>{
 if(k==='withSuccessHandler')return f=>mk(f,fail); if(k==='withFailureHandler')return f=>mk(ok,f);
 return (fn,payload)=>{fetch('http://localhost:8765/',{method:'POST',body:JSON.stringify({fn,payload})}).then(r=>r.json()).then(ok).catch(fail)}}})} return mk(()=>{},()=>{})})()}};
"""
async def main():
    errs=[]
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--disable-web-security'])
        ctxb=await b.new_context(viewport={'width':1280,'height':800}); pg=await ctxb.new_page()
        pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.add_init_script(INJECT)
        await pg.goto('file:///home/claude/prism/preview.html'); await pg.wait_for_timeout(800)
        print('preview note hidden:',not await pg.is_visible('#preview-note'))
        print('invite field visible:',await pg.is_visible('#form-register [data-f=invite]'))
        # login with unknown user
        await pg.fill('#form-login [name=username]','nobody'); await pg.fill('#form-login [name=password]','abcd1234'); await pg.click('#login-btn'); await pg.wait_for_timeout(700)
        print('bad login banner:',await pg.inner_text('#login-banner'))
        # register
        await pg.click('#tab-register'); 
        await pg.fill('#form-register [name=name]','Kiet Test'); await pg.fill('#form-register [name=username]','Kiet.Test'); await pg.fill('#form-register [name=password]','abcd1234'); await pg.fill('#form-register [name=confirm]','abcd1234')
        if await pg.is_visible('#form-register [data-f=invite]'):
            await pg.click('#register-btn'); await pg.wait_for_timeout(300)
            print('invite required error shown:',await pg.evaluate("document.querySelector('[data-f=invite]').classList.contains('bad')"))
            await pg.fill('#form-register [name=invite]','wrong'); await pg.click('#register-btn'); await pg.wait_for_timeout(700)
            print('wrong invite banner:',await pg.inner_text('#register-banner'))
            await pg.fill('#form-register [name=invite]','friends')
        await pg.click('#register-btn'); await pg.wait_for_timeout(900)
        print('onboarding visible:',await pg.is_visible('#screen-onboarding'))
        # walk onboarding: choose overall level, continue, continue, pick goal, finish
        for _ in range(6):
            if not await pg.is_visible('#screen-onboarding'): break
            opts=await pg.query_selector_all('#ob-stage [data-action="ob-level"], #ob-stage [data-action="ob-goal"], #ob-stage .opt')
            if opts and await pg.is_enabled('[data-action="ob-next"]')==False: await opts[0].click()
            await pg.click('[data-action="ob-next"]'); await pg.wait_for_timeout(700)
        print('app visible after onboarding:',await pg.is_visible('#screen-app'),'| side user:',await pg.inner_text('#side-username') if await pg.is_visible('#screen-app') else None)
        # reload -> session restore from sessionStorage/localStorage token
        await pg.reload(); await pg.wait_for_timeout(1200)
        print('restored after reload:',await pg.is_visible('#screen-app'),'| name:',await pg.inner_text('#side-name') if await pg.is_visible('#screen-app') else None)
        # change setting, reload, confirm persisted on server
        await pg.evaluate("document.querySelector('[data-go=settings]')&&document.querySelector('[data-go=settings]').click()"); await pg.wait_for_timeout(400)
        sel=await pg.query_selector('#set-goal')
        if sel: await sel.select_option('300'); await pg.wait_for_timeout(600)
        await pg.evaluate("sessionStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(1200)
        await pg.evaluate("document.querySelector('[data-go=settings]').click()"); await pg.wait_for_timeout(400)
        print('weekly goal persisted on server:',await pg.evaluate("(document.querySelector('#set-goal')||{}).value"))
        # expire sessions on server, then trigger a call -> should bounce to login
        urllib.request.urlopen(urllib.request.Request('http://localhost:8765/',data=json.dumps({'fn':'__expire','payload':{}}).encode()))
        await pg.reload(); await pg.wait_for_timeout(1200)
        print('expired session -> login screen:',await pg.is_visible('#screen-auth'))
        # sign in again with username, different case
        await pg.fill('#form-login [name=username]','KIET.test'); await pg.fill('#form-login [name=password]','abcd1234'); await pg.click('#login-btn'); await pg.wait_for_timeout(1200)
        print('signed in again:',await pg.is_visible('#screen-app'))
        await pg.click('[data-action="logout"] >> visible=true'); await pg.wait_for_timeout(600)
        print('after sign out -> login:',await pg.is_visible('#screen-auth'),'| token cleared:',await pg.evaluate("localStorage.getItem('kelvin_tok')"))
        await b.close()
    print('PAGE ERRORS',errs); print('SERVER STDERR',srv.stderr.read1().decode()[:300] if False else '')
try: asyncio.run(main())
finally: srv.kill()
