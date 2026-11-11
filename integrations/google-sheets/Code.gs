/**
 * Robotics MENA: website forms → Google Sheet.
 *
 * Paste this into a new project at script.google.com (or Extensions → Apps Script of the Sheet)
 * to collect the website's sign-ups, submissions and "Work with us" enquiries, then deploy it as a web app
 * (see integrations/google-sheets/README.md). Each form gets its own tab; new fields become
 * new columns automatically. Status and Notes columns are added for follow-up.
 */

// The Google Sheet that collects the entries (the long ID in its address, between /d/ and /edit).
// Lets this run as a standalone project from script.google.com; leave it empty to use the Sheet
// the script is attached to (Extensions → Apps Script).
var SHEET_ID = '1Af2GzhWl5YkrGS-XZ46HMJ3MlFqK2V1kAqFL9stzqXI';
function book() { return SHEET_ID ? SpreadsheetApp.openById(SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet(); }

// Website form type → tab name.
var TABS = { signup: 'Sign-ups', submission: 'Submissions', work: 'Work with us' };
// Columns shown first, in this order; anything else the form sends is added after them.
var LEAD = ['Received', 'Status', 'Notes'];
var MAX_LEN = 5000; // longest value stored per cell

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var data = {};
    try { data = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (err) { return reply({ ok: false, error: 'bad json' }); }
    if (data.website_url_check) return reply({ ok: true }); // honeypot field: bots fill it, people never see it
    var tab = TABS[data.kind] || 'Other';
    var ss = book(), sheet = ss.getSheetByName(tab) || ss.insertSheet(tab);

    var row = { Received: new Date(), Status: 'New', Notes: '' };
    Object.keys(data).forEach(function (k) {
      if (k === 'kind' || k.charAt(0) === '_') return;
      row[k] = clean(data[k]);
    });

    var headers = sheet.getLastRow() ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].filter(String) : LEAD.slice();
    Object.keys(row).forEach(function (k) { if (headers.indexOf(k) < 0) headers.push(k); });
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    sheet.setFrozenRows(1);

    // Sign-ups: mark repeat addresses instead of silently duplicating them.
    if (tab === 'Sign-ups' && row.email && sheet.getLastRow() > 1) {
      var col = headers.indexOf('email') + 1;
      var seen = sheet.getRange(2, col, sheet.getLastRow() - 1, 1).getValues().some(function (r) { return String(r[0]).toLowerCase() === String(row.email).toLowerCase(); });
      if (seen) row.Status = 'Repeat';
    }

    sheet.appendRow(headers.map(function (h) { return row[h] === undefined ? '' : row[h]; }));
    if (tab === 'Sign-ups' && row.email && row.Status !== 'Repeat') addToKit(row.email);
    return reply({ ok: true });
  } finally {
    lock.releaseLock();
  }
}

// Health check: open the web app URL in a browser and you should see {"ok":true}.
function doGet() { return reply({ ok: true, service: 'Robotics MENA forms' }); }

// Stops spreadsheet formulas being injected through the form, and caps length.
function clean(v) {
  var s = v == null ? '' : String(v);
  if (s.length > MAX_LEN) s = s.slice(0, MAX_LEN) + '…';
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return s;
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ---- Newsletter: add sign-ups to Kit (kit.com) --------------------------------------------------------
// Set two Script properties (Project Settings → Script properties): KIT_API_KEY (Kit → Settings → Developer
// → V4 key) and KIT_FORM_ID (the id of the double opt-in form, from the form's address in Kit). Kit then
// sends its own "confirm your subscription" email. Without the properties this step is skipped.
function addToKit(email) {
  var p = PropertiesService.getScriptProperties(), key = p.getProperty('KIT_API_KEY'), form = p.getProperty('KIT_FORM_ID');
  if (!key || !form || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
  var opt = function (body) { return { method: 'post', contentType: 'application/json', headers: { 'X-Kit-Api-Key': key }, payload: JSON.stringify(body), muteHttpExceptions: true }; };
  try {
    UrlFetchApp.fetch('https://api.kit.com/v4/subscribers', opt({ email_address: email, state: 'inactive' }));
    var r = UrlFetchApp.fetch('https://api.kit.com/v4/forms/' + form + '/subscribers', opt({ email_address: email }));
    return r.getResponseCode() < 300;
  } catch (err) { console.error('Kit: ' + err); return false; }
}

// One-off: add every existing sign-up to Kit (run once from the editor after setting the properties).
// Each person gets Kit's confirmation email; anyone already on the form is skipped by Kit.
function syncAllSignupsToKit() {
  var sheet = book().getSheetByName(TABS.signup); if (!sheet || sheet.getLastRow() < 2) return;
  var head = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0], col = head.indexOf('email');
  var seen = {}, n = 0;
  sheet.getRange(2, 1, sheet.getLastRow() - 1, head.length).getValues().forEach(function (r) {
    var e = String(r[col] || '').trim().toLowerCase(); if (!e || seen[e]) return; seen[e] = 1;
    if (addToKit(e)) n++; Utilities.sleep(300);
  });
  console.log('Added ' + n + ' sign-ups to Kit');
}
