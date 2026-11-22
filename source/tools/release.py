"""Build everything and copy the result into the GitHub repo layout.
Layout expected (repo root = parent of this source/ folder):
  <repo>/apps_script/Backend.js   <- tools/build_gas.py output (clasp pushes it as Backend.gs)
  <repo>/apps_script/Index.html
  <repo>/index.html               <- tools/build_web.py output (GitHub Pages)
  <repo>/stickers/                <- web/stickers
  <repo>/config.js                <- NOT touched (holds the /exec URL)
Run: python3 source/tools/release.py   (from the repo root)
Then commit + push: the GitHub Action deploys apps_script/ to Apps Script, Pages serves the rest."""
import pathlib, shutil, subprocess, sys
src = pathlib.Path(__file__).resolve().parent.parent
repo = src.parent
if not (repo / '.clasp.json').exists():
    sys.exit('Not inside the Kelvin repo (no .clasp.json next to source/). Nothing copied.')
for tool in ('build_gas.py', 'build_web.py'):
    subprocess.run([sys.executable, str(src / 'tools' / tool)], cwd=src, check=True)
(repo / 'apps_script').mkdir(exist_ok=True)
shutil.copyfile(src / 'apps_script' / 'Backend.gs', repo / 'apps_script' / 'Backend.js')
shutil.copyfile(src / 'apps_script' / 'Index.html', repo / 'apps_script' / 'Index.html')
shutil.copyfile(src / 'web' / 'index.html', repo / 'index.html')
shutil.copytree(src / 'web' / 'stickers', repo / 'stickers', dirs_exist_ok=True)
if (src / 'miclab.html').exists():   # stand-alone microphone test page for phones, served as /miclab.html
    shutil.copyfile(src / 'miclab.html', repo / 'miclab.html')
print('Release files copied into', repo)
