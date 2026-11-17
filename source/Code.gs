/**
 * Code.gs
 * Entry point of the Kelvin web app (Google Apps Script).
 *
 * Files: Config.gs (settings and sheet columns), Database.gs (Db), Auth.gs (accounts and sessions),
 * UserProfile.gs (onboarding, goals, settings), Api.gs (apiCall, the only entry point for the browser),
 * Setup.gs (menu, database setup, WordBank import). The AI service arrives in Phase 3.
 *
 * Deploy: Deploy > New deployment > Web app
 *   Execute as: Me
 *   Who has access: Anyone (users sign in with their own Kelvin account)
 */

/**
 * Serves the single-page app.
 * @param {GoogleAppsScript.Events.DoGet} e
 * @return {GoogleAppsScript.HTML.HtmlOutput}
 */
function doGet(e) {
  const template = HtmlService.createTemplateFromFile('Index');
  return template
    .evaluate()
    .setTitle('English, skill by skill')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Inlines another HTML file of the project into a template.
 * Used from Index.html as <?!= include('CSS'); ?>.
 * Included files are inserted as they are, so they must not contain
 * Apps Script scriptlet tags.
 * @param {string} filename File name without the .html extension.
 * @return {string}
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}


/**
 * API entry point for a page hosted outside Apps Script (GitHub Pages, Cloudflare Pages and so on).
 * The page sends one POST per call with a text/plain body: {"fn": "...", "payload": {...}}.
 * It runs the same apiCall() as the built-in page, so sign-in, tokens and checks are unchanged.
 * @param {GoogleAppsScript.Events.DoPost} e
 * @return {GoogleAppsScript.Content.TextOutput}
 */
function doPost(e) {
  let reply;
  try {
    const raw = e && e.postData && e.postData.contents ? String(e.postData.contents) : '';
    if (!raw || raw.length > 200000) {
      reply = { ok: false, message: 'Request not accepted.', code: 'invalid' };
    } else {
      const body = JSON.parse(raw);
      reply = apiCall(String(body.fn || ''), body.payload);
    }
  } catch (err) {
    reply = { ok: false, message: 'Request not accepted.', code: 'invalid' };
  }
  return ContentService.createTextOutput(JSON.stringify(reply)).setMimeType(ContentService.MimeType.JSON);
}
