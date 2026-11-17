"""Browser test: Sentences inside a Grammar lesson (tiles, hints, write it yourself with the AI). Screenshots in /tmp/cv/."""
import asyncio, json, pathlib, urllib.request
_src = (pathlib.Path(__file__).resolve().parent / 'learning_e2e.py').read_text()
exec(_src[:_src.index('async def main')])
OUT = pathlib.Path('/tmp/cv'); OUT.mkdir(exist_ok=True)
def call(fn, payload=None):
    r = urllib.request.Request('http://localhost:8766', data=json.dumps({'fn': fn, 'payload': payload or {}}).encode(), method='POST')
    return json.loads(urllib.request.urlopen(r).read())
oks = []
def check(name, cond, extra=''):
    oks.append(bool(cond)); print(('PASS ' if cond else 'FAIL ') + name + ('' if cond else ' -> ' + str(extra)[:300]))
async def open_lesson(pg, topic):
    await pg.evaluate("Kelvin.go('grammar')"); await pg.wait_for_timeout(1200)
    await pg.evaluate("(t=>{const b=document.createElement('button');b.dataset.action='gr-start';b.dataset.t=t;b.hidden=true;document.body.appendChild(b);b.click();b.remove()})('%s')" % topic)
    await pg.wait_for_timeout(2500)
async def to_step(pg, kinds):
    for _ in range(40):
        pk = await pg.evaluate("Kelvin.grammar.peek()")
        if not pk or pk.get('done'): return None
        if pk['t'] in kinds:
            await pg.evaluate("Kelvin.go('grammar')"); await pg.wait_for_timeout(400); return pk
        await pg.evaluate("document.querySelector('[data-action=\"gr-next\"]') ? document.querySelector('[data-action=\"gr-next\"]').click() : (Kelvin.grammar.state.run.i++, 0)")
        await pg.wait_for_timeout(250)
async def main():
    errs = []
    for un in ['senm']:
        call('register', {'name': 'Anh Kiet', 'username': un, 'password': '1'})
        tok = call('login', {'username': un, 'password': '1'})['data']['token']
        call('saveOnboarding', {'token': tok, 'overall': 'B1', 'skills': {'speaking': 'B1', 'listening': 'B1', 'reading': 'B1', 'writing': 'B1'}, 'goals': ['workplace']})
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--disable-web-security'])
        pg = await (await b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, has_touch=True, is_mobile=True)).new_page()
        pg.on('pageerror', lambda e: errs.append(str(e))); await pg.add_init_script(INJECT)
        await pg.goto('file:///home/claude/prism/preview.html'); await pg.wait_for_timeout(800)
        await pg.fill('#form-login [name=username]', 'senm'); await pg.fill('#form-login [name=password]', '1'); await pg.click('#login-btn'); await pg.wait_for_timeout(2500)
        await pg.evaluate("document.querySelectorAll('.qw.on [data-action=\"qw-later\"]').forEach(b=>b.click())")
        await open_lesson(pg, 'present-perfect')
        pk = await to_step(pg, ['tiles'])
        check('first lesson: a Vietnamese sentence with word tiles', pk and pk['t'] == 'tiles', pk)
        n = await pg.evaluate("document.querySelectorAll('.gx-bank .gx-t').length")
        words = len(pk['answers'][0].split())
        check('B1: several tiles that do not belong', n >= words + 3, [n, words])
        check('Kel says the Vietnamese in a bubble, answer lines below', await pg.evaluate("!!document.querySelector('.gx-stage .gx-kel') && !!document.querySelector('.gx-bubble') && !!document.querySelector('.gx-lines')"))
        await pg.screenshot(path=str(OUT / 'gr_tiles.png'))
        # tap the words of the answer in order
        await pg.evaluate("(()=>{window.__spoken=[];Kelvin.speakLines=function(l){window.__spoken.push(l[0].t);return {cancel(){}}}})()")
        import re
        for w in pk['answers'][0].split():
            w = re.sub(r'^[“"‘(]+|[.,!?;:”"’)…]+$', '', w)
            await pg.evaluate("(w=>{const b=Array.from(document.querySelectorAll('.gx-bank .gx-t:not(.gone)')).find(x=>x.textContent===w);b.click()})(%s)" % json.dumps(w))
            await pg.wait_for_timeout(80)
        await pg.screenshot(path=str(OUT / 'gr_tiles_built.png'))
        check('each tapped tile is read aloud', len(await pg.evaluate("window.__spoken")) == words, await pg.evaluate("window.__spoken"))
        check('a used tile leaves its place in the bank', await pg.evaluate("document.querySelectorAll('.gx-bank .gx-t.gone').length") == words)
        await pg.click('[data-action="gr-tile-check"]'); await pg.wait_for_timeout(300)
        check('right order: correct', (await pg.evaluate("Kelvin.grammar.peek()"))['ok'] is True)
        await pg.screenshot(path=str(OUT / 'gr_tiles_ok.png'))
        await pg.click('[data-action="gr-next"]', timeout=5000); await pg.wait_for_timeout(300)
        pk = await pg.evaluate("Kelvin.grammar.peek()")
        if pk and pk['t'] == 'tiles':
            await pg.click('.gx-bank .gx-t:not(.gone) >> nth=0'); await pg.click('.gx-bank .gx-t:not(.gone) >> nth=0')
            await pg.click('[data-action="gr-tile-reset"]'); await pg.wait_for_timeout(200)
            check('start again clears the built sentence', await pg.evaluate("document.querySelectorAll('.gx-lines .gx-t').length===0"))
        # fill in the blank: choose, then Check, then the why
        await open_lesson(pg, 'present-perfect')
        await pg.evaluate("(()=>{const G=Kelvin.grammar.state;G.run.i=G.run.steps.findIndex(s=>s.t==='mcq')})()")
        await pg.evaluate("Kelvin.go('grammar')"); await pg.wait_for_timeout(400)
        check('gap: the sentence has a blank in Kel\'s bubble', await pg.evaluate("!!document.querySelector('.gx-bubble .gx-blank')"))
        wrong = await pg.evaluate("(()=>{const r=Kelvin.grammar.state.run,s=r.steps[r.i];return s.opts.findIndex(o=>!o.ok)})()")
        await pg.click('.gx-opt >> nth=%d' % wrong); await pg.wait_for_timeout(150)
        check('gap: choosing fills the blank, nothing is marked yet', await pg.evaluate("document.querySelector('.gx-blank').textContent.trim().length>0 && !document.querySelector('.gx-opt.wrong') && !document.querySelector('.sheet')"))
        await pg.screenshot(path=str(OUT / 'gr_gap.png'))
        await pg.click('[data-action="gr-mcq-check"]'); await pg.wait_for_timeout(300)
        check('gap: after Check the answer and why are shown', await pg.evaluate("!!document.querySelector('.sheet .gx-why') && !!document.querySelector('.gx-opt.right') && !!document.querySelector('.gx-opt.wrong')"))
        await pg.screenshot(path=str(OUT / 'gr_gap_why.png'))
        # listen and build
        n_listen = await pg.evaluate("Kelvin.grammar.state.run.steps.filter(s=>s.t==='listen').length")
        check('lesson has listen-and-build steps', n_listen >= 1, n_listen)
        await pg.evaluate("(()=>{window.__nat=[];Kelvin.speakNatural=function(l,r,end){window.__nat.push([l[0].t,r]);setTimeout(end,50);return {cancel(){}}}})()")
        await pg.evaluate("(()=>{const G=Kelvin.grammar.state;G.run.i=G.run.steps.findIndex(s=>s.t==='listen')})()")
        await pg.evaluate("Kelvin.go('grammar')"); await pg.wait_for_timeout(900)
        check('listen: the sentence plays by itself', len(await pg.evaluate("window.__nat")) >= 1, await pg.evaluate("window.__nat"))
        await pg.click('.gx-slow .linkbtn'); await pg.wait_for_timeout(200)
        check('listen: Slow plays at a lower speed', (await pg.evaluate("window.__nat"))[-1][1] < 1)
        await pg.screenshot(path=str(OUT / 'gr_listen.png'))
        await pg.click('[data-action="gr-nolisten"]'); await pg.wait_for_timeout(300)
        pk2 = await pg.evaluate("Kelvin.grammar.peek()")
        check("can't listen now: moves on and skips listening", (not pk2) or pk2.get('t') != 'listen', pk2)
        await pg.evaluate("Kelvin.grammar.state.run=null")
        await open_lesson(pg, 'present-perfect')
        check("can't listen now: next lesson has no listening for a while", await pg.evaluate("Kelvin.grammar.state.run.steps.filter(s=>s.t==='listen').length===0"))
        await pg.evaluate("localStorage.removeItem('kelvin_nolisten')")
        # finish the lesson, then come back for the review: hints
        await pg.evaluate("Kelvin.grammar.state.run=null")
        call('grammarSubmit', {'token': tok, 'topic': 'present-perfect', 'right': 9, 'total': 10, 'seconds': 300})
        await open_lesson(pg, 'present-perfect')
        hint_steps = await pg.evaluate("Kelvin.grammar.state.run.steps.filter(s=>s.kind==='hint').length")
        check('review: Sentences come with first-letter hints (B1 moves on faster)', hint_steps >= 1, hint_steps)
        await pg.evaluate("(()=>{const G=Kelvin.grammar.state;G.run.i=G.run.steps.findIndex(s=>s.kind==='hint')})()")
        await pg.evaluate("Kelvin.go('grammar')"); await pg.wait_for_timeout(500)
        hint = await pg.inner_text('.gr-hint')
        check('the hint shows first letters only', '_' in hint and hint[0].isalpha(), hint)
        await pg.screenshot(path=str(OUT / 'gr_hint.png'))
        # write it yourself: a different but correct sentence goes to the AI by itself
        call('grammarSubmit', {'token': tok, 'topic': 'present-perfect', 'right': 9, 'total': 10, 'seconds': 300})
        await open_lesson(pg, 'present-perfect')
        await pg.evaluate("(()=>{const G=Kelvin.grammar.state;G.run.i=G.run.steps.findIndex(s=>s.kind==='build')})()")
        await pg.evaluate("Kelvin.go('grammar')"); await pg.wait_for_timeout(500)
        check('later: write it yourself from the Vietnamese', await pg.evaluate("!!document.querySelector('.wd-q.gr-vi') && !document.querySelector('.gr-hint')"))
        await pg.fill('#gr-input', 'This is my own different sentence for the test.')
        await pg.click('[data-action="gr-check"]'); await pg.wait_for_timeout(3000)
        check('a different sentence is sent to the AI automatically', await pg.evaluate("(()=>{const r=Kelvin.grammar.state.run,s=r.steps[r.i];return s.asked===true})()"))
        await pg.screenshot(path=str(OUT / 'gr_write.png'))
        # still wrong after the AI: the sentence comes back as tiles in this lesson and the next one
        await pg.evaluate("(()=>{const r=Kelvin.grammar.state.run,s=r.steps[r.i];s.ok=false;s.state='done';s.retyped=true})()")
        await pg.evaluate("Kelvin.go('grammar')"); await pg.wait_for_timeout(300)
        await pg.evaluate("document.querySelector('[data-action=\"gr-next\"]').click()"); await pg.wait_for_timeout(300)
        check('wrong sentence is added again as word tiles', await pg.evaluate("Kelvin.grammar.state.run.steps.some(s=>s.t==='tiles'&&s.retry)"))
        check('and saved for the next lesson', await pg.evaluate("!!localStorage.getItem('kelvin_gr_retry_present-perfect')"))
        await pg.evaluate("Kelvin.grammar.state.run=null")
        await open_lesson(pg, 'present-perfect')
        check('next lesson starts with it as tiles', await pg.evaluate("(()=>{const st=Kelvin.grammar.state.run.steps;const k=st.findIndex(s=>s.retry);return k>-1 && st[k].t==='tiles' && !st.slice(0,k).some(s=>s.t==='write')})()"))
        await b.close()
    check('no page errors', not errs, errs[:5])
    print('ALL PASSED' if all(oks) else str(oks.count(False)) + ' FAILED')
try:
    asyncio.run(main())
finally:
    srv.kill()
