"""Builds the two-file version for Apps Script: apps_script/Backend.gs (all server code) and apps_script/Index.html (the whole page).
Paste these two files into the Apps Script editor instead of 30. Run: python3 tools/build_gas.py"""
import re, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
ORDER = ['Config','Common','Database','Auth','UserProfile','AIService','AdaptiveEngine','QuestionFactory','Seed','Placement',
         'WordsService','SavedWords','GrammarSeed','GrammarSeedB1','Grammar','History','Tts','Plan','ProgressTracker','Practice','ConversationSeed', 'Conversation', 'Drill','Community','Api','Setup','Code']
out = root / 'apps_script'; out.mkdir(exist_ok=True)
parts = []
for n in ORDER:
    parts.append('// ' + '=' * 70 + '\n// File: ' + n + '.gs\n// ' + '=' * 70 + '\n' + (root / (n + '.gs')).read_text().rstrip() + '\n')
listed = {p.stem for p in root.glob('*.gs')}
assert listed == set(ORDER), 'a .gs file is missing from ORDER: ' + str(listed ^ set(ORDER))
(out / 'Backend.gs').write_text('\n'.join(parts))
def inc(m): return (root / (m.group(1) + '.html')).read_text()
html = (root / 'Index.html').read_text()
for _ in range(4): html = re.sub(r"<\?!=\s*include\('([A-Za-z]+)'\);\s*\?>", inc, html)
assert '<?' not in html, 'unresolved scriptlet'
(out / 'Index.html').write_text(html)
print('wrote apps_script/Backend.gs', len((out / 'Backend.gs').read_text()), 'bytes; Index.html', len(html), 'bytes')
