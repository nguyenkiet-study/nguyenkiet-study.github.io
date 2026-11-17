# Kelvin on its own address (option A)

The page is hosted on a static host. Apps Script and Google Sheets stay as the back end. Because the page runs on its own address, the browser can ask for the microphone.

## 1. Update Apps Script
1. Replace `Code.gs` (it now has `doPost`) and `JavaScript.html`, `WordsJS.html` with the new versions.
2. Deploy > Manage deployments > pencil > New version > Deploy. Who has access must stay **Anyone**.
3. Copy the Web app URL (ends in `/exec`).

## 2. Prepare the web folder
The folder `web/` has two files: `index.html` (the whole app) and `config.js`.
Open `config.js` and replace `PASTE_YOUR_EXEC_URL_HERE` with the URL from step 1. Keep the quotes.

## 3. Publish (pick one)
**GitHub Pages:** create a public repository, upload `index.html` and `config.js` to its root (Add file > Upload files), then Settings > Pages > Deploy from a branch > main > / (root). The address is `https://<your-name>.github.io/<repository>/`. Wait a minute or two.

**Cloudflare Pages:** Workers & Pages > Create > Pages > Upload assets, drop the `web` folder, choose a project name. The address is `https://<project-name>.pages.dev`.

## 4. Check
Open the address, sign in, open Speaking, tap the microphone and allow it. Use Chrome or Edge; Firefox has no speech recognition.

## Updating later
- Back-end change: paste the new `.gs` files, then New version in Apps Script.
- Page change: upload the new `index.html` to the host. `config.js` stays as it is.
- If you create a new deployment, its URL changes: update `config.js`.

## Notes
- The Apps Script link still works as before. Both addresses share the same accounts and data.
- Sign-in is remembered in the browser on the new address (it was not reliable inside the Apps Script frame).
- Anyone can call the back-end address, as before. Sign-in tokens and the invite code protect the data. Keep the invite code set.
