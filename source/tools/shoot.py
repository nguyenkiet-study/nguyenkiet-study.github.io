import asyncio, sys, json
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        errors = []
        async def run(name, w, h, steps):
            ctx = await b.new_context(viewport={'width': w, 'height': h})
            pg = await ctx.new_page()
            pg.on('pageerror', lambda e: errors.append(f'{name}: {e}'))
            pg.on('console', lambda m: errors.append(f'{name} console: {m.text}') if m.type == 'error' and 'fonts.g' not in m.text and 'ERR_' not in m.text else None)
            await pg.goto('file:///home/claude/prism/preview.html')
            await pg.wait_for_timeout(1400)
            await steps(pg, name)
            await ctx.close()

        async def desktop(pg, name):
            await pg.screenshot(path=f'/tmp/{name}_auth.png')
            await pg.click('#tab-register')
            await pg.fill('#form-register [name=name]', 'Alex Morgan')
            await pg.fill('#form-register [name=username]', 'alex.morgan')
            await pg.fill('#form-register [name=password]', 'Sunrise2026')
            await pg.fill('#form-register [name=confirm]', 'Sunrise2026')
            await pg.click('#register-btn')
            await pg.wait_for_timeout(900)
            await pg.screenshot(path=f'/tmp/{name}_ob0.png')
            await pg.click('[data-action=ob-next]'); await pg.wait_for_timeout(300)
            await pg.click('[data-action=ob-level][data-l=B1]'); await pg.wait_for_timeout(200)
            await pg.screenshot(path=f'/tmp/{name}_ob1.png')
            await pg.click('[data-action=ob-next]'); await pg.wait_for_timeout(300)
            await pg.click('[data-action=ob-skill][data-k=speaking][data-l=A2]')
            await pg.click('[data-action=ob-skill][data-k=reading][data-l=B2]')
            await pg.wait_for_timeout(200)
            await pg.screenshot(path=f'/tmp/{name}_ob2.png')
            await pg.click('[data-action=ob-next]'); await pg.wait_for_timeout(300)
            await pg.click('[data-action=ob-goal][data-g=business]')
            await pg.click('[data-action=ob-goal][data-g=travel]')
            await pg.screenshot(path=f'/tmp/{name}_ob3.png')
            await pg.click('[data-action=ob-next]'); await pg.wait_for_timeout(1400)
            await pg.screenshot(path=f'/tmp/{name}_dash_new.png', full_page=True)
            # sign out and sign in as demo user
            await pg.click('#side-nav ~ .side-foot [data-action=logout]') if name=='desk' else None
            await pg.wait_for_timeout(300)
            await pg.fill('#form-login [name=username]', 'alex.morgan')
            await pg.fill('#form-login [name=password]', 'whatever1')
            await pg.click('#login-btn'); await pg.wait_for_timeout(1600)
            await pg.screenshot(path=f'/tmp/{name}_dash.png', full_page=True)
            for v in ['reading','listening','speaking','writing','progress','profile','settings','assessment']:
                await pg.click(f'#side-nav [data-go={v}]'); await pg.wait_for_timeout(500)
                await pg.screenshot(path=f'/tmp/{name}_{v}.png', full_page=True)
            # run through assessment
            await pg.click('[data-action=assess-start]'); await pg.wait_for_timeout(300)
            await pg.click('.opt >> nth=1'); await pg.click('[data-action=assess-answer]'); await pg.wait_for_timeout(300)
            await pg.screenshot(path=f'/tmp/{name}_test_r2.png')
            await pg.click('.opt >> nth=0'); await pg.click('[data-action=assess-answer]'); await pg.wait_for_timeout(300)
            await pg.screenshot(path=f'/tmp/{name}_test_l.png')
            await pg.click('.opt >> nth=1'); await pg.click('[data-action=assess-answer]'); await pg.wait_for_timeout(300)
            await pg.fill('#as-text', 'Last weekend I visited my parents and we cooked lunch together.')
            await pg.click('[data-action=assess-answer]'); await pg.wait_for_timeout(300)
            await pg.screenshot(path=f'/tmp/{name}_test_s.png')
            await pg.click('[data-action=assess-skip]'); await pg.wait_for_timeout(500)
            await pg.screenshot(path=f'/tmp/{name}_result.png', full_page=True)
        await run('desk', 1440, 900, desktop)

        async def mobile(pg, name):
            await pg.screenshot(path=f'/tmp/{name}_auth.png')
            await pg.fill('#form-login [name=username]', 'alex.morgan')
            await pg.fill('#form-login [name=password]', 'whatever1')
            await pg.click('#login-btn'); await pg.wait_for_timeout(1600)
            await pg.screenshot(path=f'/tmp/{name}_dash.png', full_page=True)
            await pg.click('#bottom-nav [data-go=practice]'); await pg.wait_for_timeout(400)
            await pg.screenshot(path=f'/tmp/{name}_practice.png', full_page=True)
            await pg.click('#practice-hub [data-go=listening]'); await pg.wait_for_timeout(500)
            await pg.screenshot(path=f'/tmp/{name}_listening.png', full_page=True)
        await run('mob', 390, 844, mobile)

        async def tablet(pg, name):
            await pg.fill('#form-login [name=username]', 'alex.morgan')
            await pg.fill('#form-login [name=password]', 'whatever1')
            await pg.click('#login-btn'); await pg.wait_for_timeout(1600)
            await pg.screenshot(path=f'/tmp/{name}_dash.png', full_page=True)
        await run('tab', 900, 1100, tablet)
        await b.close()
        print('ERRORS:', json.dumps(errors, indent=1))
asyncio.run(main())
