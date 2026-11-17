import asyncio, json
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        errs=[]
        for name,(w,h) in {'desk':(1440,900),'mob':(390,844)}.items():
            pg = await (await b.new_context(viewport={'width':w,'height':h})).new_page()
            pg.on('pageerror', lambda e: errs.append(f'{name}: {e}'))
            await pg.goto('file:///home/claude/prism/preview.html'); await pg.wait_for_timeout(700)
            await pg.fill('#form-login [name=username]','alex'); await pg.fill('#form-login [name=password]','x')
            await pg.click('#login-btn'); await pg.wait_for_timeout(1500)
            await pg.screenshot(path=f'/tmp/w_{name}_dash.png', full_page=True)
            if name=='desk':
                await pg.click('#side-nav [data-go=words]')
            else:
                await pg.click('#bottom-nav [data-go=practice]'); await pg.wait_for_timeout(300)
                await pg.screenshot(path=f'/tmp/w_{name}_hub.png', full_page=True)
                await pg.click('#practice-hub [data-go=words]')
            await pg.wait_for_timeout(500)
            await pg.screenshot(path=f'/tmp/w_{name}_words.png', full_page=True)
            sw = await pg.evaluate('[document.documentElement.scrollWidth, innerWidth]'); print(name,'scroll',sw)
            # session: answer everything correctly except one wrong MCQ
            await pg.click('[data-action=wd-start]'); await pg.wait_for_timeout(300)
            n=0; wrong_done=False; types=[]
            while True:
                s = await pg.evaluate('Kelvin.words.peek()')
                if not s: break
                types.append(s['t']); n+=1
                if n==1: await pg.screenshot(path=f'/tmp/w_{name}_s1.png')
                if s['t']=='intro':
                    if n==4: await pg.screenshot(path=f'/tmp/w_{name}_intro.png')
                    await pg.click('[data-action=wd-next]')
                elif s['t'] in ('meaning','coll'):
                    idx = s['correct']
                    if s['t']=='meaning' and not wrong_done: idx=(idx+1)%4; wrong_done=True
                    await pg.click(f'[data-action=wd-pick][data-i="{idx}"]')
                    if name=='desk' and n in (9,10): await pg.screenshot(path=f'/tmp/w_{name}_fb{n}.png')
                    await pg.click('[data-action=wd-next]')
                elif s['t'] in ('cloze','def'):
                    ans = s['typed']
                    if n==3: ans = ans[:-1]+('x' if ans[-1]!='x' else 'y')  # one slip -> near
                    await pg.fill('#wd-input', ans); await pg.click('[data-action=wd-submit]')
                    await pg.click('[data-action=wd-next]')
                elif s['t']=='sentence':
                    await pg.fill('#wd-input','My workload is too heavy this month so I need help.'); await pg.click('[data-action=wd-submit]')
                    await pg.click('[data-action=wd-next]')
                await pg.wait_for_timeout(30)
            print(name,'steps',n, sorted(set(types)))
            await pg.screenshot(path=f'/tmp/w_{name}_summary.png', full_page=True)
            print(name,'summary:', (await pg.inner_text('#words-root'))[:140].replace('\n',' | '))
            await pg.click('[data-action=wd-exit]'); await pg.wait_for_timeout(200)
            print(name,'due after:', await pg.eval_on_selector('.wd-stat b','e=>e.textContent'))
            # diagnostic
            await pg.click('[data-action=wd-check]'); await pg.wait_for_timeout(200)
            k=0
            while True:
                s = await pg.evaluate('Kelvin.words.peek()')
                if not s: break
                k+=1
                if s['t']=='meaning' or s['t']=='coll':
                    idx=s['correct']
                    if k==2: idx=(idx+1)%4
                    await pg.click(f'[data-action=wd-pick][data-i="{idx}"]')
                else:
                    await pg.fill('#wd-input', 'wrongword' if k==5 else s['typed']); await pg.click('[data-action=wd-submit]')
            print(name,'check items',k)
            await pg.screenshot(path=f'/tmp/w_{name}_check.png', full_page=True)
            print(await pg.inner_text('.diag-row >> nth=0'), '|', (await pg.inner_text('#words-root'))[:200].replace('\n',' | '))
            await pg.click('[data-action=wd-exit]'); await pg.wait_for_timeout(300)
            await pg.click('[data-action=wd-filter][data-f=all]'); await pg.wait_for_timeout(200)
            await pg.screenshot(path=f'/tmp/w_{name}_after.png', full_page=True)
            await pg.click('[data-action=wd-vi]'); 
            await pg.click('#words-root [data-action=wd-speak] >> nth=0')
        await b.close()
        print('ERRORS', errs)
asyncio.run(main())
