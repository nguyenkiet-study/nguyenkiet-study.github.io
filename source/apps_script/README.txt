KELVIN - 2 FILES FOR APPS SCRIPT

Instead of about 30 files, the Apps Script project needs only these two:
  Backend.gs   all server code (Config, Database, Api, Tts, SavedWords ...)
  Index.html   the whole page (styles, icons, screens, scripts)

ONE-TIME SWITCH
1. In Apps Script, create Backend.gs and Index.html as below FIRST (so you still have the old ones as a backup).
2. Delete every other file (all the old .gs and .html). Keep only Backend and Index (and appsscript.json if shown).
   Two copies of the same code cannot stay together: Apps Script would report "already been declared".
3. Save, then Kelvin > Set up database, then Deploy > Manage deployments > pencil > New version > Deploy.

EVERY UPDATE AFTER THAT
1. Open Backend.gs, select all (Ctrl+A), paste the new Backend.gs. Save.
2. Open Index.html, select all, paste the new Index.html. Save.
3. If the update adds sheet columns, run Kelvin > Set up database (it only adds the missing headers, data is kept).
4. Deploy > Manage deployments > pencil > New version > Deploy.
If only the server changed, only Backend.gs needs pasting. If only the screen changed, only Index.html.

For the GitHub page, upload web/index.html as before (config.js stays).
Rebuild these files from the source with: python3 tools/build_gas.py
