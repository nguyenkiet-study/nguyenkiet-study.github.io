"""Browser check for: popup on opening, I know this word, Learn more, Practise a set (4 modes), Quick words after a practice.
Uses the same fake server as learning_e2e.py. Run: python3 tools/words2_e2e.py"""
import asyncio, pathlib
_src = (pathlib.Path(__file__).parent / 'learning_e2e.py').read_text()
exec(_src[:_src.index('async def main')])  # SERVER, INJECT, srv (starts the fake server), imports

async def main():
    errs = []
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--disable-web-security'])
        first = True
        for name, vp in [('desktop', {'width': 1280, 'height': 800}), ('mobile', {'width': 390, 'height': 780})]:
            ctxb = await b.new_context(viewport=vp); pg = await ctxb.new_page()
            pg.on('pageerror', lambda e: errs.append(str(e))); await pg.add_init_script(INJECT)
            await pg.goto('file:///home/claude/prism/preview.html'); await pg.wait_for_timeout(700)
            user = 'w2' + name
            await pg.click('#tab-register'); await pg.fill('#form-register [name=name]', 'Kiet ' + name); await pg.fill('#form-register [name=username]', user)
            await pg.fill('#form-register [name=password]', '1'); await pg.fill('#form-register [name=confirm]', '1'); await pg.click('#register-btn'); await pg.wait_for_timeout(900)
            for _ in range(6):
                if not await pg.is_visible('#screen-onboarding'): break
                opts = await pg.query_selector_all('#ob-stage .opt, #ob-stage [data-action="ob-level"], #ob-stage [data-action="ob-goal"]')
                if opts and not await pg.is_enabled('[data-action="ob-next"]'): await opts[0].click()
                await pg.click('[data-action="ob-next"]'); await pg.wait_for_timeout(600)
            if first: await pg.evaluate("__call('__words')"); await pg.wait_for_timeout(2500); first = False
            # ---- popup when opening the app
            await pg.evaluate("Kelvin.loadOverview(true)"); await pg.wait_for_timeout(1200)
            if not await pg.is_visible('.qw.center.on'):
                await pg.evaluate("document.querySelector('[data-go=dashboard]').click()"); await pg.wait_for_timeout(1200)
            shown = await pg.is_visible('.qw.center.on')
            txt = (await pg.inner_text('#qw')) if shown else ''
            print(name, '| welcome popup in the centre:', shown, '| says ready:', "Ready for today" in txt, '| shows the time goal:', 'of 30 min' in txt)
            await pg.screenshot(path=f'/home/claude/logo_work/w3_welcome_{name}.png')
            if name == 'desktop':
                await pg.click('#qw [data-action="qw-later"]'); await pg.wait_for_timeout(300)
                print(name, '| Later closes it:', not await pg.is_visible('.qw.on'))
                await pg.evaluate("document.querySelector('[data-go=dashboard]').click()"); await pg.wait_for_timeout(800)
                print(name, '| no second popup on the dashboard right away:', not await pg.is_visible('.qw.on'))
                await pg.evaluate("document.querySelector('[data-go=words]').click()"); await pg.wait_for_timeout(1500)
                t = await pg.inner_text('#words-root')
                print(name, '| words page: time goal, round button, no daily limit:', 'Today: 0 of 30 min' in t and 'Learn 5 new words' in t and 'No daily limit' in t, '| no review button when nothing is due:', await pg.query_selector('[data-action="wd-review"]') is None)
                await pg.screenshot(path=f'/home/claude/logo_work/w3_page_{name}.png', full_page=True)
                await pg.click('[data-action="wd-learn"]'); await pg.wait_for_timeout(300)
            else:
                await pg.click('#qw [data-action="qw-start"]'); await pg.wait_for_timeout(1800)
                print(name, '| Start opens Words and starts a round:', await pg.evaluate("!!Kelvin.words.peek()"))
            # ---- Vietnamese: a switch on each card, back to English on the next card
            t0 = await pg.inner_text('#words-root'); await pg.click('[data-action="wd-vi-run"]'); t1 = await pg.inner_text('#words-root')
            await pg.click('[data-action="wd-vi-run"]'); t2 = await pg.inner_text('#words-root'); await pg.click('[data-action="wd-vi-run"]')
            await pg.screenshot(path=f'/home/claude/logo_work/w3_intro_{name}.png')
            await pg.click('[data-action="wd-next"]'); t3 = await pg.inner_text('#words-root')
            print(name, '| Vietnamese shows and hides on the card:', 'Show Vietnamese' in t0 and 'Hide Vietnamese' in t1 and 'nghia' in t1 and 'nghia' not in t2 and 'Show Vietnamese' in t2, '| next card is English again:', 'Show Vietnamese' in t3 and 'nghia' not in t3)
            # ---- I know this word: the next word shows at once
            known_word = (await pg.evaluate("Kelvin.words.peek()"))['w']
            await pg.click('[data-action="wd-know"]')
            after = await pg.evaluate("Kelvin.words.peek()")           # no waiting: the spare word is already in the browser
            body = await pg.inner_text('body')
            print(name, '| I know this word: toast:', 'marked as known' in body, '| a different word shows at once:', bool(after) and after['w'] != known_word and after['t'] == 'intro')
            words_seen = await pg.evaluate("Kelvin.words.state.run.steps.filter(s=>s.t!=='use').map(s=>s.wd.w)")
            print(name, '| known word left the round:', known_word not in words_seen, '| still 5 new words:', len(set(words_seen)) == 5)
            ws = sorted(set(words_seen)); miss_w, hint_w = ws[0], ws[1]
            n, log = await run_session(pg, miss={miss_w}, hint={hint_w})
            kinds = [x for x in log if x[0] != 'use-fb']
            first_miss = next(i for i, x in enumerate(kinds) if x[1] == miss_w and x[0] != 'intro'); retry = [(i, x) for i, x in enumerate(kinds) if x[1] == miss_w and x[2]]
            print(name, '| a missed word comes back later as another exercise:', len(retry) >= 1 and retry[0][0] - first_miss >= 2 and retry[0][1][0] != kinds[first_miss][0], '|', kinds[first_miss][0], '->', retry[0][1][0] if retry else None, 'after', (retry[0][0] - first_miss) if retry else None, 'cards')
            fb = [x for x in log if x[0] == 'use-fb']
            print(name, '| the round ends with one sentence of your own:', len(fb) == 1, '| offers more words to use:', len(fb) == 1 and len(fb[0][2]) >= 1, '| AI note shown:', len(fb) == 1 and 'A more natural way' in fb[0][1])
            t = await pg.inner_text('#words-root')
            print(name, '| summary: round complete:', 'Round complete' in t, '| hint keeps the box:', 'stay in their box (hint)' in t and 'Same box' in t, '| miss goes back:', 'back to box 1' in t.lower(), '| time and forecast:', 'of 30 min' in t and 'By tomorrow: about 2 reviews' in t)
            await pg.screenshot(path=f'/home/claude/logo_work/w3_summary_{name}.png', full_page=True)
            await pg.click('[data-action="wd-more-round"]'); await pg.wait_for_timeout(700)
            pk = await pg.evaluate("Kelvin.words.peek()")
            print(name, '| Learn 5 more starts another round (no daily limit):', bool(pk) and pk['t'] == 'intro' and pk['w'] not in ws)
            while pk and pk['t'] != 'cloze':
                await run_one(pg, pk); pk = await pg.evaluate("Kelvin.words.peek()")
            t = await pg.inner_text('#words-root .card')
            print(name, '| the blank shows the first letter, not the word:', pk['typed'].lower() not in t.lower() and (pk['typed'][0] + ' _') in t)
            await pg.click('[data-action="wd-hint"]'); t = await pg.inner_text('#words-root'); print(name, '| hint gives the Vietnamese meaning:', 'In Vietnamese' in t)
            await pg.screenshot(path=f'/home/claude/logo_work/w3_cloze_{name}.png')
            await run_session(pg)
            await pg.click('[data-action="wd-exit"]'); await pg.wait_for_timeout(1500)
            t = await pg.inner_text('#words-root'); flat = t.replace('\n', ' ')
            print(name, '| page after two rounds: 10 new today:', '10 new today' in flat, '| already knew 1:', '1 already knew' in flat, '| next round ready:', 'Learn 5 new words' in t)
            # ---- reviews: the exercise follows the box
            await pg.evaluate("__call('__boxes',{user:'%s',boxes:[1,2,3,4,5]})" % user); await pg.evaluate("__call('__extras',{user:'%s'})" % user); await pg.evaluate("Kelvin.words.reload()"); await pg.wait_for_timeout(1500)
            t = await pg.inner_text('#words-root'); print(name, '| reviews are due:', 'Review 10' in t and '10 to review' in t.replace('\n', ' '))
            await pg.click('[data-action="wd-review"]'); await pg.wait_for_timeout(300)
            by_box = {}; shots = set(); rel_hi = 0; rel_lo = 0
            while True:
                pk = await pg.evaluate("Kelvin.words.peek()")
                if not pk: break
                if not pk['retry']: by_box.setdefault(pk['box'], set()).add(pk['t'] + (':' + pk['clue'] if pk['clue'] else ''))
                if pk['t'] in ('syn', 'ant') and name == 'mobile' and pk['t'] not in shots: shots.add(pk['t']); await pg.screenshot(path=f'/home/claude/logo_work/w4_{pk["t"]}_{name}.png')
                if pk['t'] in ('listen', 'ask', 'vi') and pk['t'] not in shots and name == 'mobile': shots.add(pk['t']); await pg.screenshot(path=f'/home/claude/logo_work/w3_{pk["t"]}_{name}.png')
                await run_fb(pg, pk)
                rel = await pg.evaluate("!!document.querySelector('.rel-line')")
                if rel and pk['box'] >= 3: rel_hi += 1
                if rel and pk['box'] < 3: rel_lo += 1
                if rel and name == 'mobile' and 'rel' not in shots: shots.add('rel'); await pg.screenshot(path=f'/home/claude/logo_work/w4_rel_{name}.png')
                await pg.click('[data-action="wd-next"]'); await pg.wait_for_timeout(60)
            await pg.wait_for_timeout(900)
            ok_box = by_box.get(1) == {'cloze:letter'} and by_box.get(2) == {'cloze:def'} and by_box.get(3, set()) <= {'listen', 'def'} and by_box.get(4, set()) <= {'coll', 'vi', 'syn'} and by_box.get(5, set()) <= {'ask', 'ant', 'syn', 'def'}
            print(name, '| exercise by box:', ok_box, {k: sorted(v) for k, v in sorted(by_box.items())})
            print(name, '| similar/opposite shown after answers from box 3, never on boxes 1-2:', rel_hi > 0 and rel_lo == 0, rel_hi, rel_lo)
            t = await pg.inner_text('#words-root'); print(name, '| reviews done:', 'Reviews done' in t and 'moved up' in t)
            await pg.click('[data-action="wd-exit"]'); await pg.wait_for_timeout(1300)
            # ---- many reviews waiting: a warning, then smaller rounds
            await pg.evaluate("__call('__pile',{user:'%s',n:60})" % user); await pg.evaluate("Kelvin.words.reload()"); await pg.wait_for_timeout(1500)
            t = await pg.inner_text('#words-root'); first_btn = await pg.evaluate("document.querySelector('.round-row .btn').dataset.action")
            print(name, '| 60 waiting: warning shown, Review comes first, round still 5:', '60 reviews are waiting' in t and 'Review first' in t and first_btn == 'wd-review' and 'Learn 5 new words' in t)
            await pg.evaluate("__call('__pile',{user:'%s',n:30})" % user); await pg.evaluate("Kelvin.words.reload()"); await pg.wait_for_timeout(1500)
            t = await pg.inner_text('#words-root')
            print(name, '| 90 waiting: rounds cut to 2:', '90 reviews are waiting' in t and 'down to 2 words' in t and 'Learn 2 new words' in t)
            await pg.screenshot(path=f'/home/claude/logo_work/w3_reduce_{name}.png')
            await pg.evaluate("document.querySelector('[data-go=dashboard]').click()"); await pg.evaluate("Kelvin.loadOverview(true)"); await pg.wait_for_timeout(1500)
            dt = await pg.inner_text('#dash-words'); print(name, '| dashboard card: minutes and the warning:', dt.replace(chr(10),' ')[:160], '/ 30' in dt and 'Many reviews are waiting' in dt and 'Review now' in dt)
            await pg.screenshot(path=f'/home/claude/logo_work/w3_dash_{name}.png')
            await pg.evaluate("document.querySelector('[data-go=settings]').click()"); await pg.wait_for_timeout(500)
            st = await pg.inner_text('#settings-root'); print(name, '| settings have the Words goal, round size and the pile-up choice:', 'Daily goal for Words' in st and 'New words per round' in st and 'When many reviews are waiting' in st)
            await pg.screenshot(path=f'/home/claude/logo_work/w3_settings_{name}.png', full_page=True)
            await pg.select_option('#set-wauto', '0'); await pg.wait_for_timeout(700)
            await pg.evaluate("document.querySelector('[data-go=words]').click()"); await pg.wait_for_timeout(1500)
            t = await pg.inner_text('#words-root'); print(name, '| "only warn me": the round is 5 again, still warned:', 'Learn 5 new words' in t and 'Review before you learn more' in t)
            await pg.evaluate("document.querySelector('[data-go=settings]').click()"); await pg.wait_for_timeout(400)
            await pg.fill('#set-wgoal', '60'); await pg.dispatch_event('#set-wgoal', 'change'); await pg.select_option('#set-wauto', '1'); await pg.wait_for_timeout(900)
            await pg.evaluate("document.querySelector('[data-go=words]').click()"); await pg.wait_for_timeout(1500)
            t = await pg.inner_text('#words-root'); print(name, '| a 60-minute goal: 90 reviews are no problem yet:', 'of 60 min' in t and 'reviews are waiting' not in t and 'Learn 5 new words' in t)
            await pg.select_option('#wd-size', '10'); await pg.wait_for_timeout(1800)
            t = await pg.inner_text('#words-root'); print(name, '| round size on the page: 10:', 'Learn 10 new words' in t)
            await pg.select_option('#wd-size', '5'); await pg.wait_for_timeout(1800)
            await pg.evaluate("document.querySelector('[data-go=settings]').click()"); await pg.wait_for_timeout(400)
            await pg.fill('#set-wgoal', '3'); await pg.dispatch_event('#set-wgoal', 'change'); await pg.wait_for_timeout(300)
            print(name, '| a goal under 5 minutes is refused:', 'from 5 to 180' in await pg.inner_text('body'))
            await pg.fill('#set-wgoal', '30'); await pg.dispatch_event('#set-wgoal', 'change'); await pg.wait_for_timeout(700)
            await pg.evaluate("__call('__unpile',{user:'%s'})" % user)
            await pg.evaluate("document.querySelector('[data-go=words]').click()"); await pg.wait_for_timeout(1500)
            # ---- known list: study again
            await pg.click('[data-action="wd-filter"][data-f="known"]'); await pg.wait_for_timeout(1000)
            lt = await pg.inner_text('#wd-list'); print(name, '| known list shows it:', known_word in lt and 'Already known' in lt)
            await pg.click('#wd-list [data-action="wd-again"]'); await pg.wait_for_timeout(1300)
            print(name, '| study again works:', 'Back in your reviews' in await pg.inner_text('body'))
            await pg.click('[data-action="wd-filter"][data-f="learning"]'); await pg.wait_for_timeout(1000)
            await pg.click('#wd-list [data-action="wd-know-row"]'); await pg.wait_for_timeout(1300)
            print(name, '| I know it from the list:', 'marked as known' in await pg.inner_text('body'))
            print(name, '| overflow words:', await pg.evaluate("[document.documentElement.scrollWidth,innerWidth]"))
            await pg.screenshot(path=f'/home/claude/logo_work/w2_words_{name}.png', full_page=True)
            # ---- practise a set: the 4 modes on "All learned"
            await pg.click('#study-card [data-action="st-set"][data-s="learned"]')
            await pg.click('#study-card [data-action="st-start"][data-m="flashcards"]'); await pg.wait_for_timeout(1000)
            pk = await pg.evaluate("Kelvin.study.peek()"); front = await pg.inner_text('.flashcard')
            await pg.click('.flashcard'); back = await pg.inner_text('.flashcard')
            print(name, '| flashcards:', pk['n'], 'cards | flips:', front != back, '| front is English:', front.split('\n')[0].strip() != back.split('\n')[0].strip())
            await pg.screenshot(path=f'/home/claude/logo_work/w2_flash_{name}.png')
            for i in range(pk['n']):
                await pg.click('[data-action="st-fc"][data-k="%d"]' % (0 if i == 0 else 1)); await pg.wait_for_timeout(40)
            t = await pg.inner_text('#words-root'); print(name, '| flashcards summary:', 'You know' in t, '| study 1 again offered:', 'Study the 1 again' in t)
            await pg.click('[data-action="st-exit"]'); await pg.wait_for_timeout(1300)
            # learn
            await pg.click('#study-card [data-action="st-set"][data-s="learned"]'); await pg.click('#study-card [data-action="st-start"][data-m="learn"]'); await pg.wait_for_timeout(1000)
            guard = 0
            while guard < 80:
                guard += 1
                pk = await pg.evaluate("Kelvin.study.peek()")
                if not pk or pk['mode'] != 'learn' or 'finished' in (await pg.inner_text('#words-root')): break
                if await pg.query_selector('[data-action="st-ln-next"]'): await pg.click('[data-action="st-ln-next"]'); continue
                if pk['round'] == 1:
                    ci = [o['ok'] for o in pk['opts']].index(True); await pg.click(f'[data-action="st-ln-pick"][data-i="{ci}"]')
                else:
                    await pg.fill('#st-input', pk['q']); await pg.click('[data-action="st-ln-type"]')
                await pg.wait_for_timeout(40)
            t = await pg.inner_text('#words-root'); print(name, '| learn finished both rounds:', 'You learned all' in t, guard)
            await pg.click('[data-action="st-exit"]'); await pg.wait_for_timeout(1300)
            # match
            await pg.click('#study-card [data-action="st-set"][data-s="learned"]'); await pg.click('#study-card [data-action="st-start"][data-m="match"]'); await pg.wait_for_timeout(1000)
            tiles = (await pg.evaluate("Kelvin.study.peek()"))['tiles']
            w0 = [i for i, x in enumerate(tiles) if x['k'] == 'w'][0]; wrong = [i for i, x in enumerate(tiles) if x['k'] == 'm' and x['id'] != tiles[w0]['id']][0]
            await pg.click(f'[data-action="st-mt"][data-i="{w0}"]'); await pg.click(f'[data-action="st-mt"][data-i="{wrong}"]')
            print(name, '| match wrong pair flashes:', len(await pg.query_selector_all('.tile.bad')) == 2)
            await pg.screenshot(path=f'/home/claude/logo_work/w2_match_{name}.png')
            await pg.wait_for_timeout(700)
            for i, x in enumerate(tiles):
                if x['k'] != 'w': continue
                j = [k for k, y in enumerate(tiles) if y['k'] == 'm' and y['id'] == x['id']][0]
                await pg.click(f'[data-action="st-mt"][data-i="{i}"]'); await pg.click(f'[data-action="st-mt"][data-i="{j}"]'); await pg.wait_for_timeout(30)
            t = await pg.inner_text('#words-root'); print(name, '| match finished with a time:', 'Match: finished' in t and 's' in t, '| new best:', 'New best' in t)
            await pg.click('[data-action="st-exit"]'); await pg.wait_for_timeout(1300)
            # test
            await pg.click('#study-card [data-action="st-set"][data-s="learned"]'); await pg.click('#study-card [data-action="st-start"][data-m="test"]'); await pg.wait_for_timeout(1000)
            n = 0
            while n < 30:
                pk = await pg.evaluate("Kelvin.study.peek()")
                if not pk or not pk['test']: break
                q = pk['test']; n += 1
                if n == 1:  # one wrong answer on purpose
                    if q['k'] == 'tf': await pg.click('[data-action="st-ts"][data-v="%s"]' % ('f' if q['truth'] else 't'))
                    elif q['k'] == 'mc': await pg.click('[data-action="st-ts"][data-v="%d"]' % ((q['ok'] + 1) % 2))
                    else: await pg.fill('#st-input', 'zzzz'); await pg.click('[data-action="st-ts"][data-v="type"]')
                elif q['k'] == 'tf': await pg.click('[data-action="st-ts"][data-v="%s"]' % ('t' if q['truth'] else 'f'))
                elif q['k'] == 'mc': await pg.click('[data-action="st-ts"][data-v="%d"]' % q['ok'])
                else: await pg.fill('#st-input', q['w']); await pg.click('[data-action="st-ts"][data-v="type"]')
                await pg.wait_for_timeout(30)
            t = await pg.inner_text('#words-root'); print(name, '| test result:', [l for l in t.split('\n') if ' right (' in l][:1], '| lists the wrong one:', 'Check these' in t)
            await pg.screenshot(path=f'/home/claude/logo_work/w2_test_{name}.png', full_page=True)
            await pg.click('[data-action="st-exit"]'); await pg.wait_for_timeout(1300)
            hard = await pg.evaluate("__call('apiCallProxy')") if False else None
            # ---- quick words right after a practice
            await pg.evaluate("document.querySelector('[data-go=reading]').click()"); await pg.wait_for_timeout(700)
            await pg.click('#pr-start'); await pg.wait_for_timeout(900)
            word = await pg.evaluate("""(function(){var els=document.querySelectorAll('#practice-card .cap');for(var k=0;k<els.length;k++){var w=document.createTreeWalker(els[k],NodeFilter.SHOW_TEXT),tn;while((tn=w.nextNode())){var m=/[A-Za-z]{6,}/.exec(tn.textContent);if(m){var r=document.createRange();r.setStart(tn,m.index);r.setEnd(tn,m.index+m[0].length);var s=getSelection();s.removeAllRanges();s.addRange(r);return m[0]}}}return null})()""")
            await pg.wait_for_timeout(500); await pg.click('#cap-bar button'); await pg.wait_for_timeout(900)
            print(name, '| no reminder during the exercise:', not await pg.is_visible('.qw.on'))
            done = 0
            while await pg.query_selector('#practice-card .opt') and done < 12:
                if await pg.is_visible('.pane-next'): await pg.click('.pane-next'); await pg.wait_for_timeout(150)   # phones: passage first, then the question
                opts = await pg.query_selector_all('#practice-card .opt'); await opts[0].click(); await pg.click('#pr-check'); await pg.wait_for_timeout(500)
                await pg.click('[data-action="pr-next"]'); await pg.wait_for_timeout(250); done += 1
            await pg.wait_for_timeout(1500)
            vis = await pg.is_visible('.qw.corner.on'); qt = (await pg.inner_text('#qw')) if vis else ''
            print(name, '| after the set: corner popup:', vis, '| offers the saved word:', 'you just saved' in qt)
            await pg.screenshot(path=f'/home/claude/logo_work/w2_corner_{name}.png')
            if vis:
                await pg.click('#qw [data-action="qw-go"]'); await pg.wait_for_timeout(1300)
                pk = await pg.evaluate("Kelvin.words.peek()")
                print(name, '| quick round has the saved word:', bool(pk) and pk['w'].lower() == (word or '').lower(), '| inside the popup:', await pg.is_visible('#qw-body .card'))
                await pg.screenshot(path=f'/home/claude/logo_work/w2_quick_{name}.png')
                await run_session(pg, '#qw')
                qt = await pg.inner_text('#qw'); print(name, '| quick round done:', 'Nice, done' in qt)
                await pg.click('#qw [data-action="wd-exit"]'); await pg.wait_for_timeout(500)
                print(name, '| popup closed:', not await pg.is_visible('.qw.on'))
            print(name, '| overflow practice:', await pg.evaluate("[document.documentElement.scrollWidth,innerWidth]"))
            # ---- throttle: back to the dashboard soon after: no popup
            await pg.evaluate("document.querySelector('[data-go=dashboard]').click()"); await pg.wait_for_timeout(1200)
            print(name, '| no popup again within 20 minutes:', not await pg.is_visible('.qw.on'))
            # ---- switch off in Settings
            await pg.evaluate("document.querySelector('[data-go=settings]').click()"); await pg.wait_for_timeout(500)
            await pg.click('[data-action="switch"][data-id="quickWords"]'); await pg.wait_for_timeout(200)
            print(name, '| settings switch off:', await pg.evaluate("Kelvin.state.settings.quickWords===false"))
            await ctxb.close()
        await b.close()
    print('PAGE ERRORS', errs)

async def run_fb(pg, pk):
    # answers right and stops on the feedback (the Continue button is not pressed)
    if pk['t'] in ('meaning', 'coll', 'syn', 'ant'): await pg.click(f'[data-action="wd-pick"][data-i="{pk["correct"]}"]')
    elif pk['t'] in ('cloze', 'def', 'listen', 'vi'): await pg.fill('#wd-input', pk['typed']); await pg.click('[data-action="wd-submit"]')
    elif pk['t'] == 'ask': await pg.fill('#wd-input', 'I often think about ' + pk['w'] + ' when I am at work'); await pg.click('[data-action="wd-submit"]')
    await pg.wait_for_timeout(40)

async def run_one(pg, pk):
    if pk['t'] in ('meaning', 'coll', 'syn', 'ant'):
        await pg.click(f'[data-action="wd-pick"][data-i="{pk["correct"]}"]'); await pg.click('[data-action="wd-next"]')
    elif pk['t'] in ('cloze', 'def', 'listen', 'vi'):
        await pg.fill('#wd-input', pk['typed']); await pg.click('[data-action="wd-submit"]'); await pg.click('[data-action="wd-next"]')
    elif pk['t'] == 'ask':
        await pg.fill('#wd-input', 'I often think about ' + pk['w'] + ' when I am at work'); await pg.click('[data-action="wd-submit"]'); await pg.click('[data-action="wd-next"]')
    elif pk['t'] == 'use':
        await pg.fill('#wd-input', 'I will use ' + pk['w'] + ' in a sentence at work today'); await pg.click('[data-action="wd-submit"]'); await pg.wait_for_timeout(400); await pg.click('[data-action="wd-next"]')
    else: await pg.click('[data-action="wd-next"]')
    await pg.wait_for_timeout(60)

asyncio.run(main()); srv.kill()
