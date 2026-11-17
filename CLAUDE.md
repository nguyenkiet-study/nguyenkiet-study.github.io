# Kelvin: notes for Claude

Kelvin is an English-learning web app. Owner: Nguyen Anh Kiet. Reply in Vietnamese ("mình" for Claude, "bạn" for the user). All UI text in the app is English.

## Stack
- Backend: Google Apps Script (merged into one Backend.gs) with Google Sheets as the database and Gemini for AI.
- Front end: one Index.html (Apps Script page) and the same page built for GitHub Pages (root index.html, API URL in root config.js).
- Apps Script, the Sheet and the /exec link belong to another Google account (the "B" account). Never change the deployment ID.

## Repo layout (GitHub: nguyenkiet-study/nguyenkiet-study.github.io, branch main)
- source/            full source (this is what you edit): *.gs, *.html modules, data/, tools/, web/
- apps_script/       generated: Backend.js (clasp pushes it as Backend.gs), Index.html, appsscript.json
- index.html, stickers/, config.js, icons   GitHub Pages files (index.html is generated; do not touch config.js)
- .clasp.json, .github/workflows/deploy.yml   push to main with changes in apps_script/ => GitHub Action runs clasp push + clasp deploy on the same deployment

## How to ship a change
1. Edit files in source/ (never edit the generated apps_script/ or root index.html by hand).
2. Run the tests that fit (node tools/*_test.js; browser tests tools/*_e2e.py) from source/.
3. From the repo root run: python3 source/tools/release.py
4. Commit and push to main. The Action deploys. If a change adds sheet columns, tell the user to run Kelvin > Set up database once.

## Rules from the user
- Always deliver the full code of changed files, never partial snippets, when they ask for code.
- Discuss big ideas first when the user says so ("bàn trước khi code"); otherwise just do it.
- Show members by full name only, never usernames. Keep the "niulai.wiki" mark on the bull stickers (private group only).
- Secrets (CLASPRC_JSON, DEPLOYMENT_ID) live only in GitHub Actions secrets. Never print or commit them, and keep the user's email private.
- Gemini features are only tested with tools/fake_gemini.js. Say so when relevant.
- See docs/ARCHITECTURE.md and docs/SETUP.md for module details.
