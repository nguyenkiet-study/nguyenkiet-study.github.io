"""Browser test for Community, Messages and tags (phone and PC). Starts the fake backend from learning_e2e.py.
Run: python3 tools/community_e2e.py   Screenshots go to /tmp/cm/."""
import asyncio, json, pathlib, urllib.request
_src = (pathlib.Path(__file__).resolve().parent / 'learning_e2e.py').read_text()
exec(_src[:_src.index('async def main')])
OUT = pathlib.Path('/tmp/cm'); OUT.mkdir(exist_ok=True)
def call(fn, payload=None):
    r = urllib.request.Request('http://localhost:8766', data=json.dumps({'fn': fn, 'payload': payload or {}}).encode(), method='POST')
    return json.loads(urllib.request.urlopen(r).read())
def ev(code): return call('__eval', {'code': code})
ok_all = []
def check(name, cond, extra=''):
    ok_all.append(bool(cond)); print(('PASS ' if cond else 'FAIL ') + name + ('' if cond else ' -> ' + str(extra)[:300]))

def user(name, un):
    call('register', {'name': name, 'username': un, 'password': '1'})
    tok = call('login', {'username': un, 'password': '1'})['data']['token']
    call('saveOnboarding', {'token': tok, 'overall': 'A2', 'skills': {'speaking': 'A2', 'listening': 'A2', 'reading': 'A2', 'writing': 'A2'}, 'goals': ['workplace']})
    return tok

async def login(pg, un):
    await pg.goto('file:///home/claude/prism/preview.html'); await pg.wait_for_timeout(700)
    await pg.fill('#form-login [name=username]', un); await pg.fill('#form-login [name=password]', '1'); await pg.click('#login-btn')
    await pg.wait_for_timeout(2500)
    await pg.evaluate("document.querySelectorAll('.qw.on [data-action=\"qw-later\"]').forEach(b=>b.click())")

async def main():
    lan = user('Lan Tran', 'lan'); minh = user('Minh Le', 'minh')
    errs = []
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--disable-web-security'])
        for name, vp, sc, touch in [('m', {'width': 390, 'height': 844}, 2, True), ('pc', {'width': 1440, 'height': 900}, 1, False)]:
            me = 'kiet' + name; tok = user('Anh Kiet', me)
            # admin through the data layer
            ev("(()=>{const r=Db.findByKey(CONFIG.SHEETS.USERS,'Username','%s');Db.update(CONFIG.SHEETS.USERS,r._row,{Role:'admin'});return 1})()" % me) if name == 'm' else None
            myid = ev("Db.findByKey(CONFIG.SHEETS.USERS,'Username','%s').UserID" % me)
            # what friends posted and sent
            call('cmCreate', {'token': lan, 'kind': 'correct', 'text': 'Yesterday I go to the office early and I am agree with my boss.'})
            call('cmCreate', {'token': minh, 'kind': 'poll', 'text': 'Which is correct?', 'extra': {'options': ['I look forward to see you', 'I look forward to seeing you']}})
            call('cmCreate', {'token': lan, 'kind': 'words', 'text': 'Words from my meeting today', 'extra': {'words': [{'w': 'deadline', 'm': 'the last day to finish'}, {'w': 'follow up', 'm': 'check again later'}, {'w': 'agenda', 'm': 'list of things to talk about'}]}})
            pid = call('cmCreate', {'token': minh, 'kind': 'free', 'text': 'Who wants to practise speaking on Saturday morning? I can bring coffee.'})['data']['id']
            call('cmComment', {'token': lan, 'postId': pid, 'text': 'Me! 9am at the usual café?'})
            call('msgSend', {'token': lan, 'to': myid, 'text': 'Hi Kiet! Are you free for lunch tomorrow?'})
            call('tagSend', {'token': minh, 'to': [myid], 'skill': 'writing', 'title': 'Writing', 'question': 'Write a message inviting a friend to lunch.', 'answer': 'Hi Kiet, let us have lunch on Friday at 12. I know a great pho place near the office.'})

            ctx = await b.new_context(viewport=vp, device_scale_factor=sc, has_touch=touch, is_mobile=touch)
            pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e))); await pg.add_init_script(INJECT)
            await login(pg, me)
            check(name + ' | red dot on the messages icon', await pg.evaluate("(()=>{const d=document.querySelector('.top-msg .msg-dot');return d&&!d.hidden&&d.textContent==='2'})()"),
                  await pg.evaluate("document.querySelector('.top-msg .msg-dot')&&document.querySelector('.top-msg .msg-dot').outerHTML"))
            if name == 'm':
                nav = await pg.evaluate("Array.from(document.querySelectorAll('#bottom-nav button span')).map(s=>s.textContent).join(' · ')")
                check(name + ' | bottom bar: Home · Learn · Words · Community · You', nav == 'Home · Learn · Words · Community · You', nav)
                await pg.screenshot(path=str(OUT / (name + '_home.png')))
            # Community
            await pg.evaluate("Kelvin.go('community')"); await pg.wait_for_timeout(2200)
            txt = await pg.inner_text('#community-root')
            check(name + ' | topic card shows', 'TOPIC FOR 3 DAYS' in txt.upper() and 'left' in txt, txt[:200])
            check(name + ' | posts by name, no usernames', 'Lan Tran' in txt and 'Minh Le' in txt and '@lan' not in txt, txt[:300])
            await pg.screenshot(path=str(OUT / (name + '_community.png')), full_page=True)
            # vote and heart
            await pg.click('.cm-opt >> nth=1'); await pg.wait_for_timeout(1500)
            check(name + ' | vote shows results', await pg.evaluate("!!document.querySelector('.cm-poll.voted')"))
            await pg.click('.cm-post .cm-heart >> nth=0'); await pg.wait_for_timeout(1200)
            check(name + ' | heart turns on', await pg.evaluate("document.querySelector('.cm-post .cm-heart').classList.contains('on')"))
            # correct me: open and answer
            await pg.click('.cm-post:has(.cm-correct) .cm-act'); await pg.wait_for_timeout(1500)
            await pg.fill('#cmp-input', 'Yesterday I went to the office early, and I agree with my boss.')
            await pg.click('#cm-post [data-action="cm-comment"]'); await pg.wait_for_timeout(1500)
            check(name + ' | correction posted', 'I agree with my boss' in await pg.inner_text('#cmp-body'))
            await pg.click('#cm-post .emo-btn'); await pg.wait_for_timeout(300)
            await pg.click('#cm-emo [data-t="doodle"]'); await pg.wait_for_timeout(500)
            await pg.click('#cm-emo [data-s="doodle-peace"]'); await pg.wait_for_timeout(2000)
            check(name + ' | sticker as a comment', await pg.evaluate("!!document.querySelector('#cmp-body .cm-cb img.stk')"))
            await pg.screenshot(path=str(OUT / (name + '_correct.png')))
            await pg.click('#cm-post [data-action="cm-close"]'); await pg.wait_for_timeout(300)
            # topic answer
            await pg.click('.cm-topic [data-action="cm-open"]'); await pg.wait_for_timeout(1500)
            await pg.fill('#cmp-input', 'My small habit: a 10-minute walk after lunch. It helps me focus.')
            await pg.click('#cm-post [data-action="cm-comment"]'); await pg.wait_for_timeout(1500)
            await pg.click('#cm-post [data-action="cm-close"]'); await pg.wait_for_timeout(300)
            check(name + ' | topic shows the answer count', 'No answers' not in await pg.inner_text('.cm-topic') and ' answer' in await pg.inner_text('.cm-topic'))
            # new post: poll
            await pg.click('[data-action="cm-new"] >> nth=0'); await pg.wait_for_timeout(400)
            await pg.click('#cm-new [data-k="poll"]'); await pg.wait_for_timeout(300)
            await pg.fill('#cc-text', 'Which sounds more natural?')
            await pg.fill('#cm-new .cc-opts input >> nth=0', 'I am agree'); await pg.fill('#cm-new .cc-opts input >> nth=1', 'I agree')
            await pg.screenshot(path=str(OUT / (name + '_compose.png')))
            await pg.click('#cm-new [data-action="cc-post"]'); await pg.wait_for_timeout(2500)
            check(name + ' | my poll is first in the feed', 'Which sounds more natural?' in await pg.inner_text('.cm-post >> nth=0'))
            # save a word from a word list
            await pg.click('.cm-post:has(.cm-words) [data-action="cm-saveall"]'); await pg.wait_for_timeout(3000)
            saved = ev("Db.filter(CONFIG.SHEETS.SAVED_WORDS,r=>r.UserID==='%s').map(r=>r.Text).join(',')" % myid)
            check(name + ' | Save all to Words', 'deadline' in saved and 'agenda' in saved, saved)
            if name == 'm':
                # admin: hide Lan's correct-me post
                await pg.click('.cm-post:has(.cm-correct) .cm-menu'); await pg.wait_for_timeout(300)
                await pg.screenshot(path=str(OUT / (name + '_admin_menu.png')))
                await pg.click('#cm-m [data-action="cm-hide"]'); await pg.wait_for_timeout(2500)
                hidden_for_minh = not any(p['kind'] == 'correct' for p in call('cmFeed', {'token': minh})['data']['posts'])
                check(name + ' | admin hides a post for others', hidden_for_minh)
                await pg.click('.cm-topic [data-action="tp-admin"]'); await pg.wait_for_timeout(1500)
                await pg.screenshot(path=str(OUT / (name + '_topic_admin.png')))
                await pg.click('#cm-ta [data-action="cm-close"]')
            # Messages
            await pg.click('.top-msg'); await pg.wait_for_timeout(2000)
            ml = await pg.inner_text('#messages-root')
            check(name + ' | message list shows both chats', 'Lan Tran' in ml and 'Minh Le' in ml and 'Tagged you' in ml, ml[:300])
            await pg.screenshot(path=str(OUT / (name + '_messages.png')))
            await pg.click('.ms-row:has-text("Minh Le")'); await pg.wait_for_timeout(2000)
            check(name + ' | tagged answer shows the question and Reply', await pg.evaluate("!!document.querySelector('.ms-msg.is-tag .ms-reply')") and 'inviting a friend to lunch' in await pg.inner_text('#ms-list'))
            await pg.click('.ms-reply'); await pg.wait_for_timeout(400)
            check(name + ' | Reply fills the context', 'Replying about' in await pg.inner_text('.ms-compose'))
            await pg.fill('#ms-input', 'Sounds great, see you on Friday!')
            await pg.click('.ms-send'); await pg.wait_for_timeout(2000)
            th = call('msgThread', {'token': minh, 'with': myid})['data']['messages']
            check(name + ' | reply arrives with the question as context', th[-1]['text'].startswith('Sounds great') and th[-1]['ctx'] and 'lunch' in th[-1]['ctx']['re'], th[-1])
            # react (phone: long press; pc: hover button)
            if touch:
                box = await pg.query_selector('.ms-msg.them .ms-b')
                bb = await box.bounding_box()
                await pg.evaluate("""([x,y])=>{const el=document.elementFromPoint(x,y);const t=new Touch({identifier:1,target:el,clientX:x,clientY:y});el.dispatchEvent(new TouchEvent('touchstart',{touches:[t],bubbles:true}));}""", [bb['x'] + 30, bb['y'] + 15])
                await pg.wait_for_timeout(700)
            else:
                await pg.hover('.ms-msg.them .ms-b'); await pg.click('.ms-msg.them .ms-rx-open')
            await pg.wait_for_timeout(300)
            check(name + ' | reaction bar opens', await pg.evaluate("!!document.querySelector('.ms-rxbar')"))
            await pg.screenshot(path=str(OUT / (name + '_rxbar.png')))
            await pg.click('.ms-rxbar button >> nth=2'); await pg.wait_for_timeout(1800)
            check(name + ' | reaction saved', '❤️' in json.dumps(call('msgThread', {'token': minh, 'with': myid})['data']['messages'][0]['reactions'], ensure_ascii=False))
            # reply to that message
            await pg.evaluate("document.querySelector('.ms-msg.them .ms-rx-open').click()"); await pg.wait_for_timeout(300)
            await pg.click('.ms-rxbar .rx-reply'); await pg.wait_for_timeout(300)
            check(name + ' | reply bar shows above the message box', await pg.evaluate("!!document.querySelector('.ms-compose .ms-re.rp')"))
            await pg.fill('#ms-input', 'Replying to you'); await pg.click('.ms-send'); await pg.wait_for_timeout(1800)
            check(name + ' | the reply shows the quoted message', await pg.evaluate("!!document.querySelector('.ms-msg.me:last-of-type .ms-quote.rp') || Array.from(document.querySelectorAll('.ms-msg.me .ms-quote.rp')).length>0"))
            await pg.screenshot(path=str(OUT / (name + '_reply.png')))
            if name == 'm':
                cdp = await pg.context.new_cdp_session(pg)
                async def swipe(sel, dx):
                    await pg.evaluate("document.querySelector('%s').scrollIntoView({block:'center'})" % sel); await pg.wait_for_timeout(200)
                    bb = await (await pg.query_selector(sel)).bounding_box()
                    x, y = bb['x'] + bb['width'] / 2, bb['y'] + 8
                    await cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': x, 'y': y}]})
                    for k in range(1, 9):
                        await cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': x + dx * k / 8, 'y': y}]}); await pg.wait_for_timeout(16)
                    await cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []}); await pg.wait_for_timeout(500)
                await swipe('.ms-msg.them:not(.is-stk) .ms-b', -110)
                check('m | swiping their message the wrong way does nothing', await pg.evaluate("!document.querySelector('.ms-compose .ms-re.rp')"))
                await swipe('.ms-msg.them:not(.is-stk) .ms-b', 110)
                check('m | swipe their message to the right: reply', await pg.evaluate("!!document.querySelector('.ms-compose .ms-re.rp')"))
                await pg.click('[data-action="ms-reply-x"]'); await pg.wait_for_timeout(200)
                await swipe('.ms-msg.me:not(.is-stk) .ms-b', -110)
                check('m | swipe my own message to the left: reply', await pg.evaluate("!!document.querySelector('.ms-compose .ms-re.rp')"))
                await pg.click('[data-action="ms-reply-x"]'); await pg.wait_for_timeout(200)
            # emoji into the box, a sticker sent at once, any emoji as a reaction
            await pg.click('.ms-compose .emo-btn'); await pg.wait_for_timeout(400)
            await pg.click('#cm-emo .emo-grid button:has-text("😂") >> nth=0'); await pg.wait_for_timeout(300)
            check(name + ' | emoji goes into the message box', '😂' in await pg.input_value('#ms-input'))
            await pg.fill('#ms-input', '')
            await pg.click('.ms-compose .emo-btn'); await pg.wait_for_timeout(300)
            await pg.click('#cm-emo [data-t="kel"]'); await pg.wait_for_timeout(600)
            await pg.screenshot(path=str(OUT / (name + '_stickers.png')))
            await pg.click('#cm-emo [data-s="kel-love"]'); await pg.wait_for_timeout(2000)
            last = call('msgThread', {'token': minh, 'with': myid})['data']['messages'][-1]
            check(name + ' | sticker sent', last['text'] == '[[sticker:kel-love]]', last)
            check(name + ' | sticker picture loads in the chat', await pg.evaluate("(()=>{const i=document.querySelector('.ms-msg.is-stk img.stk');return !!i&&i.complete&&i.naturalWidth>0})()"))
            await pg.click('.ms-compose .emo-btn'); await pg.wait_for_timeout(300)
            await pg.click('#cm-emo [data-t="bull"]'); await pg.wait_for_timeout(600)
            await pg.click('#cm-emo [data-s="bull-shock"]'); await pg.wait_for_timeout(2000)
            check(name + ' | photo sticker loads too', await pg.evaluate("Array.from(document.querySelectorAll('.ms-msg.is-stk img.stk')).some(i=>i.src.endsWith('bull-shock.webp')&&i.naturalWidth>0)"))
            if touch:
                await pg.evaluate("document.querySelector('.ms-msg.them:not(.is-stk) .ms-b').scrollIntoView({block:'center'})"); await pg.wait_for_timeout(200)
                box = await pg.query_selector('.ms-msg.them:not(.is-stk) .ms-b')
                bb = await box.bounding_box()
                await pg.evaluate("""([x,y])=>{const el=document.elementFromPoint(x,y);const t=new Touch({identifier:2,target:el,clientX:x,clientY:y});el.dispatchEvent(new TouchEvent('touchstart',{touches:[t],bubbles:true}));}""", [bb['x'] + 30, bb['y'] + 15])
                await pg.wait_for_timeout(700)
            else:
                await pg.evaluate("document.querySelector('.ms-msg.them:not(.is-stk) .ms-b').scrollIntoView({block:'center'})")
                await pg.hover('.ms-msg.them:not(.is-stk) .ms-b'); await pg.click('.ms-msg.them:not(.is-stk) .ms-rx-open')
            await pg.wait_for_timeout(300)
            await pg.click('.ms-rxbar .rx-more'); await pg.wait_for_timeout(400)
            await pg.click('#cm-emo .emo-grid button:has-text("🔥") >> nth=0'); await pg.wait_for_timeout(1800)
            check(name + ' | any emoji as a reaction', '🔥' in json.dumps(call('msgThread', {'token': minh, 'with': myid})['data']['messages'][0]['reactions'], ensure_ascii=False))
            await pg.screenshot(path=str(OUT / (name + '_chat_stickers.png')))
            # polling: a new message from Minh shows up without reloading
            call('msgSend', {'token': minh, 'to': myid, 'text': 'Great, I will book a table.'})
            await pg.wait_for_timeout(9500)
            check(name + ' | new message appears by itself (8 s check)', 'book a table' in await pg.inner_text('#ms-list'))
            await pg.screenshot(path=str(OUT / (name + '_chat.png')))
            if touch:
                check(name + ' | chat hides the bottom bar', await pg.evaluate("getComputedStyle(document.querySelector('#bottom-nav')).display==='none'"))
            await pg.click('[data-action="ms-back"]'); await pg.wait_for_timeout(800)
            # Writing: hint, tag Lan, submit, share
            await pg.evaluate("Kelvin.go('writing')"); await pg.wait_for_timeout(1500)
            await pg.click('#pr-start'); await pg.wait_for_timeout(2500)
            check(name + ' | writing shows Tag friends (no tip line)', await pg.evaluate("!document.querySelector('.wr-hint')&&!!document.querySelector('.tagbox[data-k=writing]')"))
            await pg.type('#pr-text', 'Hi everyone, I would like to invite you to lunch on Friday at noon. ')
            await pg.type('#pr-text', '@'); await pg.wait_for_timeout(1200)
            check(name + ' | typing @ shows friends under the box', await pg.evaluate("!document.querySelector('.mn-list').hidden && document.querySelectorAll('.mn-list .mn-row').length>=2"))
            await pg.type('#pr-text', 'La'); await pg.wait_for_timeout(300)
            check(name + ' | typing letters filters the list', await pg.evaluate("Array.from(document.querySelectorAll('.mn-list .mn-row')).map(r=>r.textContent).join('|')") == 'LTLan Tran')
            await pg.screenshot(path=str(OUT / (name + '_mention_list.png')))
            await pg.click('.mn-list .mn-row'); await pg.wait_for_timeout(300)
            check(name + ' | picking puts the full name in the text and keeps typing', (await pg.input_value('#pr-text')).endswith('@Lan Tran ') and await pg.evaluate("document.activeElement.id==='pr-text'"), await pg.input_value('#pr-text'))
            await pg.type('#pr-text', 'and ')
            await pg.click('.tagbox[data-k=writing] [data-action="tg-open"]'); await pg.wait_for_timeout(400)
            await pg.click('.mn-list .mn-row:has-text("Minh Le")'); await pg.wait_for_timeout(300)
            await pg.type('#pr-text', ', we can try the new pho place near the office. Please bring your colleagues too.')
            check(name + ' | both names are highlighted in blue', await pg.evaluate("Array.from(document.querySelectorAll('.mn-back mark')).map(m=>m.textContent).join('|')") == '@Lan Tran|@Minh Le')
            check(name + ' | note lists who is tagged', 'Tagging Lan Tran and Minh Le' in await pg.inner_text('.tagbox[data-k=writing]'))
            aligned = await pg.evaluate("""(()=>{const t=document.querySelector('#pr-text'),b=document.querySelector('.mn-back');const a=t.getBoundingClientRect(),c=b.getBoundingClientRect();return [a.left,c.left,a.top,c.top,a.width,c.width,a.height,c.height].map(Math.round)})()""")
            check(name + ' | highlight layer lines up with the text box', aligned[0]==aligned[1] and aligned[2]==aligned[3] and aligned[4]==aligned[5] and abs(aligned[6]-aligned[7])<=1, aligned)
            await pg.screenshot(path=str(OUT / (name + '_writing.png')))
            await pg.click('#pr-send'); await pg.wait_for_timeout(5000)
            fb = await pg.inner_text('#practice-card')
            check(name + ' | tagged friends get it in Messages', 'Sent to' in fb and 'Lan Tran' in fb and 'Minh Le' in fb, fb[-300:])
            got = call('msgThread', {'token': lan, 'with': myid})['data']['messages']
            check(name + ' | Lan has the question and the answer', any(m['kind'] == 'tag' and 'pho place' in m['text'] and m['ctx']['question'] for m in got))
            await pg.click('#practice-card [data-action="cm-share"]'); await pg.wait_for_timeout(500)
            await pg.click('#cm-share [data-action="cm-share-go"]'); await pg.wait_for_timeout(2500)
            check(name + ' | shared to Community', any(p['kind'] == 'writing' and 'pho place' in p['text'] for p in call('cmFeed', {'token': minh})['data']['posts']))
            await pg.screenshot(path=str(OUT / (name + '_shared.png')), full_page=True)
            # You page has History on the phone
            if touch:
                await pg.evaluate("Kelvin.go('profile')"); await pg.wait_for_timeout(800)
                check(name + ' | History is in You', await pg.evaluate("!!document.querySelector('#view-profile .you-menu [data-go=history]')"))
            await ctx.close()
        await b.close()
    check('no page errors', not errs, errs[:5])
    print('ALL PASSED' if all(ok_all) else str(ok_all.count(False)) + ' FAILED')

try:
    asyncio.run(main())
finally:
    srv.kill()
