/** Paste into the Apps Script project attached to your lead spreadsheet. */
var LEAD_HEADERS = ['Submission ID', 'Received UTC', 'Name', 'Email', 'Company', 'Project type', 'Project description', 'Budget and currency', 'Launch timeframe', 'Mobile platform', 'Project stage', 'Website or application type', 'Integrations', 'Design target', 'Design scope', 'Existing product URL', 'Advice needed', 'Contact consent'];

function setupLeadSheet() {
  var props = PropertiesService.getScriptProperties();
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error('Open this script through Extensions > Apps Script in your spreadsheet.');
  props.setProperty('SPREADSHEET_ID', spreadsheet.getId());
  if (!props.getProperty('LEAD_WEBHOOK_SECRET') || props.getProperty('LEAD_WEBHOOK_SECRET').length < 32) throw new Error('Add a secret of at least 32 characters to Script Properties first.');
  var sheet = spreadsheet.getSheetByName('Inquiries') || spreadsheet.insertSheet('Inquiries');
  if (sheet.getLastRow() === 0) sheet.appendRow(LEAD_HEADERS);
  assertHeaders(sheet);
  sheet.setFrozenRows(1);
}

function assertHeaders(sheet) {
  var existing = sheet.getRange(1, 1, 1, LEAD_HEADERS.length).getValues()[0];
  if (JSON.stringify(existing) !== JSON.stringify(LEAD_HEADERS)) throw new Error('The Inquiries columns do not match. Use a dedicated sheet tab; do not overwrite existing data.');
}

function leadJson(value) { return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON); }
function sheetText(value) {
  var text = typeof value === 'string' ? value : '';
  // Keep submitted values as text, never executable spreadsheet formulas.
  return /^[\s\u0000-\u001f]*[=+@-]/.test(text) ? "'" + text : text;
}

function doPost(event) {
  var lock;
  var locked = false;
  try {
    if (!event || !event.postData || event.postData.contents.length > 32768) return leadJson({ ok: false });
    var input = JSON.parse(event.postData.contents);
    var props = PropertiesService.getScriptProperties();
    var expected = props.getProperty('LEAD_WEBHOOK_SECRET');
    if (!expected || expected.length < 32 || input.secret !== expected) return leadJson({ ok: false });
    if (!/^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(input.id || '') || input.consent !== true || typeof input.email !== 'string' || !input.email || typeof input.name !== 'string' || !input.name) return leadJson({ ok: false });
    var spreadsheet = SpreadsheetApp.openById(props.getProperty('SPREADSHEET_ID'));
    var sheet = spreadsheet.getSheetByName('Inquiries');
    if (!sheet) return leadJson({ ok: false });
    lock = LockService.getScriptLock();
    locked = lock.tryLock(10000);
    if (!locked) return leadJson({ ok: false });
    assertHeaders(sheet);
    var lastRow = sheet.getLastRow();
    if (lastRow > 1 && sheet.getRange(2, 1, lastRow - 1, 1).createTextFinder(input.id).matchEntireCell(true).findNext()) return leadJson({ ok: true, id: input.id });
    var answers = input.answers || {};
    var row = [input.id, input.receivedAt, input.name, input.email, input.company, input.projectLabel, input.description, input.budget, input.timeline,
      answers.platform, answers.stage, answers.websiteType, answers.integrations, answers.designTarget, answers.designScope, answers.existingUrl, answers.guidance, 'Yes'];
    sheet.appendRow(row.map(sheetText));
    SpreadsheetApp.flush();
    return leadJson({ ok: true, id: input.id });
  } catch (error) {
    // Return no lead content, secrets, or internal account errors to the caller.
    return leadJson({ ok: false });
  } finally {
    if (lock && locked) lock.releaseLock();
  }
}
