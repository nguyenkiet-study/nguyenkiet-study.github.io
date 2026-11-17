/**
 * Database.gs
 * Thin data layer over Google Sheets. All other files read and write through Db.
 *
 * Rules
 *  - Columns are addressed by header name (see SCHEMA in Config.gs), never by position.
 *  - Writes that read before they write (duplicate checks, upserts) run inside Db.lock().
 *  - Dates are stored as ISO 8601 text so Sheets never converts them.
 *  - Do not call Db from the browser. The browser only calls apiCall() in Api.gs.
 */
var Db = (function () {
  var spreadsheet = null;
  var sheets = {};

  /** Columns that must stay text (IDs, hashes, dates, free text), so Sheets never turns "007" or a date into a number. */
  var TEXT_COLUMN = /ID$|Hash|Salt|Username|Name$|Headword|Sense|Definition|Example|Collocation|Gloss|Stem|Passage|Answer|JSON|At$|^Date$|Review|DueDate|WeekStart|Detail|Event|Strengths|Weaknesses|Recommendations|Explanation|Criteria|Title|Goals|Quiz|Question$|Related|Text|Context|Vietnamese|QuestionIDs|PriorityOrder|WeeklyGoals|Vocabulary|Grammar/;

  function getSpreadsheet() {
    if (spreadsheet) return spreadsheet;
    var id = CONFIG.SPREADSHEET_ID || PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    spreadsheet = id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
    if (!spreadsheet) throw new Error('No spreadsheet found. Run setupDatabase() from the spreadsheet menu first.');
    return spreadsheet;
  }

  function headers(name) {
    var h = SCHEMA[name];
    if (!h) throw new Error('Unknown sheet: ' + name);
    return h;
  }

  function sheet(name) {
    if (sheets[name]) return sheets[name];
    var sh = getSpreadsheet().getSheetByName(name);
    if (!sh) throw new Error('Sheet "' + name + '" is missing. Run setupDatabase() from the Kelvin menu.');
    sheets[name] = sh;
    return sh;
  }

  function cell(v) {
    if (v instanceof Date) return v.toISOString();
    return v;
  }

  /** Every data row as an object. The row number is kept in the hidden field _row. */
  function all(name) {
    var h = headers(name), sh = sheet(name), last = sh.getLastRow();
    if (last < 2) return [];
    var values = sh.getRange(2, 1, last - 1, h.length).getValues();
    return values.map(function (r, i) {
      var o = { _row: i + 2 };
      for (var c = 0; c < h.length; c++) o[h[c]] = cell(r[c]);
      return o;
    });
  }

  function filter(name, predicate) {
    return all(name).filter(predicate);
  }

  function find(name, predicate) {
    var rows = all(name);
    for (var i = 0; i < rows.length; i++) if (predicate(rows[i])) return rows[i];
    return null;
  }

  /** Looks one row up by the value of one column. Reads only that column first. Comparison is on text. */
  function findByKey(name, column, value) {
    var h = headers(name), col = h.indexOf(column);
    if (col < 0) throw new Error('Unknown column ' + column + ' in ' + name);
    var sh = sheet(name), last = sh.getLastRow();
    if (last < 2) return null;
    var keys = sh.getRange(2, col + 1, last - 1, 1).getValues(), want = String(value);
    for (var i = 0; i < keys.length; i++) {
      if (String(keys[i][0]) === want) {
        var row = i + 2, vals = sh.getRange(row, 1, 1, h.length).getValues()[0], o = { _row: row };
        for (var c = 0; c < h.length; c++) o[h[c]] = cell(vals[c]);
        return o;
      }
    }
    return null;
  }

  function toRow(name, obj) {
    return headers(name).map(function (col) { return obj[col] === undefined || obj[col] === null ? '' : obj[col]; });
  }

  function insert(name, obj) {
    var sh = sheet(name), row = sh.getLastRow() + 1;
    sh.getRange(row, 1, 1, headers(name).length).setValues([toRow(name, obj)]);
    return Object.assign({ _row: row }, obj);
  }

  function insertMany(name, objs) {
    if (!objs.length) return 0;
    var sh = sheet(name), h = headers(name), start = sh.getLastRow() + 1;
    sh.getRange(start, 1, objs.length, h.length).setValues(objs.map(function (o) { return toRow(name, o); }));
    return objs.length;
  }

  /** Changes only the named columns of one row. */
  function update(name, row, patch) {
    var h = headers(name), sh = sheet(name), range = sh.getRange(row, 1, 1, h.length);
    var vals = range.getValues()[0];
    Object.keys(patch).forEach(function (k) {
      var c = h.indexOf(k);
      if (c < 0) throw new Error('Unknown column ' + k + ' in ' + name);
      vals[c] = patch[k] === null ? '' : patch[k];
    });
    range.setValues([vals]);
  }

  /**
   * Reads only some columns of every row (fast for a large sheet such as the WordBank).
   * Returns [{ _row, <column>: value, ... }] in sheet order.
   */
  function columns(name, cols) {
    var h = headers(name), sh = sheet(name), last = sh.getLastRow();
    if (last < 2) return [];
    var out = [];
    for (var i = 0; i < last - 1; i++) out.push({ _row: i + 2 });
    cols.forEach(function (c) {
      var idx = h.indexOf(c);
      if (idx < 0) throw new Error('Unknown column ' + c + ' in ' + name);
      var vals = sh.getRange(2, idx + 1, last - 1, 1).getValues();
      for (var r = 0; r < vals.length; r++) out[r][c] = cell(vals[r][0]);
    });
    return out;
  }

  /** Reads the given sheet rows (row numbers) as objects, in the order asked. */
  function rowsAt(name, rowNumbers) {
    var h = headers(name), sh = sheet(name);
    return rowNumbers.map(function (row) {
      var vals = sh.getRange(row, 1, 1, h.length).getValues()[0], o = { _row: row };
      for (var c = 0; c < h.length; c++) o[h[c]] = cell(vals[c]);
      return o;
    });
  }

  /** Writes a whole row object back (columns missing from the object are written empty). */
  function writeRow(name, row, obj) {
    sh_(name).getRange(row, 1, 1, headers(name).length).setValues([toRow(name, obj)]);
  }
  function sh_(name) { return sheet(name); }

  /** Updates the row whose key columns equal `keys`, or inserts a new one. Call inside lock(). */
  function upsert(name, keys, obj) {
    var names = Object.keys(keys);
    var existing = find(name, function (r) {
      return names.every(function (k) { return String(r[k]) === String(keys[k]); });
    });
    var data = Object.assign({}, keys, obj);
    if (existing) { update(name, existing._row, data); return Object.assign({}, existing, data); }
    return insert(name, data);
  }

  /** Deletes rows by number. Bottom rows first so numbers stay valid. */
  function removeRows(name, rowNumbers) {
    var sh = sheet(name);
    rowNumbers.slice().sort(function (a, b) { return b - a; }).forEach(function (r) { sh.deleteRow(r); });
  }

  /** Runs fn while holding the script lock. */
  function lock(fn) {
    var l = LockService.getScriptLock();
    if (!l.tryLock(20000)) throw new AppError('The server is busy. Please try again in a moment.', 'busy');
    try { return fn(); } finally { l.releaseLock(); }
  }

  function newId(prefix) {
    return prefix + '_' + Utilities.getUuid().replace(/-/g, '').slice(0, 12);
  }

  function now() { return new Date().toISOString(); }

  return {
    TEXT_COLUMN: TEXT_COLUMN,
    spreadsheet: getSpreadsheet,
    headers: headers,
    sheet: sheet,
    all: all,
    columns: columns,
    rowsAt: rowsAt,
    writeRow: writeRow,
    filter: filter,
    find: find,
    findByKey: findByKey,
    insert: insert,
    insertMany: insertMany,
    update: update,
    upsert: upsert,
    removeRows: removeRows,
    lock: lock,
    newId: newId,
    now: now
  };
})();
