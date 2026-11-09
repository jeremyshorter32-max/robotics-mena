/**
 * Robotics MENA: website forms → Google Sheet.
 *
 * Paste this into Extensions → Apps Script of the Google Sheet that should collect the
 * website's sign-ups, submissions and "Work with us" enquiries, then deploy it as a web app
 * (see integrations/google-sheets/README.md). Each form gets its own tab; new fields become
 * new columns automatically. Status and Notes columns are added for follow-up.
 */

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
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(tab) || SpreadsheetApp.getActiveSpreadsheet().insertSheet(tab);

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
