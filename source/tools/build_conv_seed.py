"""Builds ConversationSeed.gs from data/conv/*.json (hand-written Listening conversations) and checks every lesson
against the same rules the server uses (Conv.tidy), so a broken lesson is caught here, not on the sheet.

Compact lesson format in the JSON files:
  t  title            tp topic            sc scene (one sentence or two)
  sp [[name, role, 'm'|'f', mascot?], ...]   (mascot: a Kelvin sticker name such as 'pilot'; chosen from the role when left out)
  lv level, when the file holds several levels (else the file name is the level)
  w  [[word, simple meaning], ...]
  l  [[speaker 0|1, english, vietnamese], ...]
  g  [gist question, [3 options], right index]
  m  [[question, [3 options], right index, line], ...]
  tf [[statement, 0 true | 1 false | 2 not given, line], ...]
  gap [line, word]     o [4 events in order]
"""
import json, pathlib, re, sys

root = pathlib.Path(__file__).resolve().parent.parent
LINES = {'A1': (6, 8), 'A2': (8, 10), 'B1': (10, 12), 'B2': (12, 14), 'C1': (12, 16), 'C2': (12, 16)}
WPL = {'A1': 12, 'A2': 14, 'B1': 20, 'B2': 24, 'C1': 28, 'C2': 30}
MAX_CHARS = 2200 - 200
TAKEN = {'Tom', 'Dad', 'Mr Carter', 'Mai'}  # the two lessons in Conversation.gs

def fail(msg):
    print('ERROR', msg); sys.exit(1)

out, names, titles = [], {}, set()
for f in sorted((root / 'data' / 'conv').glob('*.json')):
    for n, x in enumerate(json.loads(f.read_text())):
        level = x.get('lv', f.stem)
        where = '%s #%d %s' % (level, n + 1, x.get('t'))
        lines = [{'s': int(s), 't': t.strip(), 'vi': vi.strip()} for s, t, vi in x['l']]
        lo, hi = LINES[level]
        if not (lo - 1 <= len(lines) <= hi + 2): fail('%s: %d lines (allowed %d-%d)' % (where, len(lines), lo - 1, hi + 2))
        if sum(len(l['t']) for l in lines) > MAX_CHARS: fail('%s: too long for one audio clip' % where)
        for l in lines:
            if len(l['t'].split()) > WPL[level] + 6: fail('%s: line too long: %s' % (where, l['t']))
            if not l['vi']: fail('%s: missing Vietnamese' % where)
        if {l['s'] for l in lines} != {0, 1}: fail('%s: both people must speak' % where)
        sp = [dict({'name': z[0], 'role': z[1], 'g': z[2]}, **({'av': z[3]} if len(z) > 3 else {})) for z in x['sp']]
        for s in sp:
            if not re.match(r"^[A-Za-z][A-Za-z .'-]{0,19}$", s['name']): fail('%s: bad name %s' % (where, s['name']))
            if s['g'] not in ('m', 'f'): fail('%s: gender' % where)
            if s['name'] in TAKEN and s['name'] not in ('Mum', 'Grandma', 'Grandpa'): fail('%s: name %s is used in %s' % (where, s['name'], names.get(s['name'], 'the first lessons')))
            names[s['name']] = where
        TAKEN.update(s['name'] for s in sp)
        if x['t'] in titles: fail('%s: title used twice' % where)
        titles.add(x['t'])
        ex = []
        q, o, a = x['g']
        if len(set(o)) != 3 or not 0 <= a < 3: fail('%s: gist' % where)
        ex.append({'type': 'mcq', 'gist': True, 'q': q, 'options': o, 'answer': a, 'line': 0})
        for q, o, a, ln in x['m']:
            if len(set(o)) != 3 or not 0 <= a < 3 or not 0 <= ln < len(lines): fail('%s: mcq %s' % (where, q))
            ex.append({'type': 'mcq', 'q': q, 'options': o, 'answer': a, 'line': ln})
        for q, a, ln in x['tf']:
            if a not in (0, 1, 2) or not 0 <= ln < len(lines): fail('%s: tf %s' % (where, q))
            ex.append({'type': 'tf', 'q': q, 'answer': a, 'line': ln})
        ln, w = x['gap']
        if not (0 <= ln < len(lines) and len(w) >= 3 and re.match(r"^[A-Za-z'-]+$", w)): fail('%s: gap' % where)
        if not re.search(r'\b' + re.sub(r"[-']", '.', w) + r'\b', lines[ln]['t'], re.I): fail('%s: gap word "%s" not in line %d' % (where, w, ln))
        if any(w.lower() in s['name'].lower() for s in sp): fail('%s: gap word is a name' % where)
        ex.append({'type': 'gap', 'line': ln, 'word': w})
        if len(x['o']) < 3 or len(set(x['o'])) != len(x['o']): fail('%s: order' % where)
        ex.append({'type': 'order', 'items': x['o']})
        out.append({'level': level, 'topic': x['tp'], 'title': x['t'], 'scene': x['sc'], 'speakers': sp,
                    'words': [{'w': a, 'm': b} for a, b in x['w']], 'lines': lines, 'ex': ex})

js = ('/**\n * ConversationSeed.gs - hand-written Listening conversations (made by tools/build_conv_seed.py from data/conv/*.json).\n'
      ' * Do not edit by hand: change the JSON and run the tool again. Conv.seed() adds any that are not on the sheet yet.\n */\n'
      'var CONV_SEED = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n')
(root / 'ConversationSeed.gs').write_text(js)
by = {}
for x in out: by[x['level']] = by.get(x['level'], 0) + 1
print('wrote ConversationSeed.gs:', len(out), 'lessons', by, len(js), 'bytes')
