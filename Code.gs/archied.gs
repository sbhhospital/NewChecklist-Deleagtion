/**
 * ARCHIVE FUNCTION
 * Source:      Spreadsheet ID: 1MvNdsblxNzREdV5kSgBo_78IusmQzilbar9pteufEz0  |  Sheet: "Checklist"
 * Destination: Spreadsheet ID: 13_SRVtKTS75uE0YAM8ib2gc_Mie7BHuhshV52-rhkBQ  |  Sheet: "All Tasks"
 *
 * Rules:
 *  1. Skip any row where Column B (index 1) is blank — do NOT archive it.
 *  2. Column B is formula-driven — NEVER copy its value to All Tasks, NEVER overwrite it in Checklist.
 *  3. Copy rows older than 1 week (based on Column A timestamp) to All Tasks (Column B stays blank).
 *  4. Duplicate check: if a row with the same Column A (timestamp) + Column F (task description)
 *     already exists in All Tasks → skip it, but still DELETE it from Checklist.
 *  5. After archiving, DELETE old rows from Checklist using batch grouped deletes (fast).
 *  6. Rows within the last 7 days stay in Checklist completely untouched.
 *
 * HOW TO SET UP A TIME TRIGGER:
 *  1. In Apps Script editor → click "Triggers" (clock icon on the left sidebar).
 *  2. Click "+ Add Trigger".
 *  3. Choose function: archiveOldChecklistData
 *  4. Event source: Time-driven
 *  5. Type: Day timer (runs once per day at your chosen hour)
 *  6. Save.
 */

function archiveOldChecklistData() {

  // ── Sheet references ──────────────────────────────────────────────────────
  var SOURCE_SS_ID = "1MvNdsblxNzREdV5kSgBo_78IusmQzilbar9pteufEz0";
  var SOURCE_SHEET = "Checklist";
  var DEST_SS_ID   = "13_SRVtKTS75uE0YAM8ib2gc_Mie7BHuhshV52-rhkBQ";
  var DEST_SHEET   = "All Tasks";

  // ── Column indices (0-based) ──────────────────────────────────────────────
  var COL_TIMESTAMP = 0;   // A – timestamp: used for age check + duplicate key
  var COL_TASK_ID   = 1;   // B – formula column: skip if blank, never write back
  var COL_TASK_DESC = 5;   // F – task description: used as duplicate key

  // ── Date threshold ────────────────────────────────────────────────────────
  var now        = new Date();
  var oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // ── Open spreadsheets ─────────────────────────────────────────────────────
  var sourceSS    = SpreadsheetApp.openById(SOURCE_SS_ID);
  var sourceSheet = sourceSS.getSheetByName(SOURCE_SHEET);
  if (!sourceSheet) {
    Logger.log('ERROR: Sheet "' + SOURCE_SHEET + '" not found in source spreadsheet.');
    return;
  }

  var destSS    = SpreadsheetApp.openById(DEST_SS_ID);
  var destSheet = destSS.getSheetByName(DEST_SHEET);
  if (!destSheet) {
    Logger.log('ERROR: Sheet "' + DEST_SHEET + '" not found in destination spreadsheet.');
    return;
  }

  // ── Read all values from Checklist ────────────────────────────────────────
  var lastRow = sourceSheet.getLastRow();
  if (lastRow < 2) {
    Logger.log("No data rows found in Checklist. Nothing to archive.");
    return;
  }

  var lastCol   = sourceSheet.getLastColumn();
  var allData   = sourceSheet.getRange(1, 1, lastRow, lastCol).getValues();
  var headerRow = allData[0];

  // ── Build a duplicate lookup set from existing All Tasks data ─────────────
  // Key format: "normalizedTimestamp||normalizedTaskDescription"
  // Reading this once up-front is a single API call — much faster than
  // checking row-by-row inside the loop.
  var existingKeys = {};
  var destLastRow  = destSheet.getLastRow();

  if (destLastRow > 1) {
    var destLastCol  = destSheet.getLastColumn();
    var destData     = destSheet.getRange(2, 1, destLastRow - 1, destLastCol).getValues(); // skip header
    for (var d = 0; d < destData.length; d++) {
      var dRow  = destData[d];
      var dKey  = normalizeTimestamp(dRow[COL_TIMESTAMP]) + "||" + String(dRow[COL_TASK_DESC]).trim().toLowerCase();
      existingKeys[dKey] = true;
    }
  }

  // ── Identify which rows need to be archived ───────────────────────────────
  var archiveRows     = []; // row data (with Col B blanked) to write to All Tasks
  var rowsToDeleteAsc = []; // 1-based sheet row numbers to delete from Checklist

  for (var i = 1; i < allData.length; i++) {
    var row       = allData[i];
    var taskId    = row[COL_TASK_ID];
    var timestamp = row[COL_TIMESTAMP];

    // Rule 1: If Task ID (Col B) is blank → keep, do not archive
    if (taskId === "" || taskId === null || taskId === undefined) {
      continue;
    }

    // Parse timestamp
    var rowDate = parseDate(timestamp);

    // Can't parse date → keep safely, do not archive
    if (!rowDate) continue;

    // Only process rows older than 1 week
    if (rowDate >= oneWeekAgo) continue;

    // This row is old — it will be deleted from Checklist regardless of duplicate status
    rowsToDeleteAsc.push(i + 1); // i+1 = 1-based sheet row

    // Duplicate check: same timestamp + same task description already in All Tasks → skip copy
    var taskDesc  = String(row[COL_TASK_DESC]).trim().toLowerCase();
    var rowKey    = normalizeTimestamp(timestamp) + "||" + taskDesc;

    if (existingKeys[rowKey]) {
      Logger.log("Duplicate skipped (row " + (i + 1) + "): " + rowKey);
      continue;
    }

    // Not a duplicate → queue for archiving and add to lookup so within-batch dupes are also caught
    var archiveRow = row.slice();
    archiveRow[COL_TASK_ID] = ""; // blank out Column B
    archiveRows.push(archiveRow);
    existingKeys[rowKey] = true;  // prevent duplicates within the current batch too
  }

  // ── Write archived rows to All Tasks ──────────────────────────────────────
  if (rowsToDeleteAsc.length === 0) {
    Logger.log("No rows older than 1 week found. Nothing to do.");
    return;
  }

  if (archiveRows.length > 0) {
    var writeStartRow = (destLastRow < 1) ? 1 : destLastRow + 1;

    // Write header to All Tasks if the sheet is completely empty
    if (destLastRow === 0) {
      var archiveHeader = headerRow.slice();
      archiveHeader[COL_TASK_ID] = ""; // blank Col B in header too
      destSheet.getRange(1, 1, 1, archiveHeader.length).setValues([archiveHeader]);
      writeStartRow = 2;
    }

    destSheet
      .getRange(writeStartRow, 1, archiveRows.length, archiveRows[0].length)
      .setValues(archiveRows);

    Logger.log("Archived " + archiveRows.length + " row(s) to All Tasks (Column B left blank).");
  } else {
    Logger.log("All old rows were duplicates — nothing new written to All Tasks.");
  }

  // ── Delete old rows from Checklist (batch grouped, bottom-up) ────────────
  // Group consecutive row numbers into single deleteRows() calls for speed.
  var groups = [];
  var j = rowsToDeleteAsc.length - 1;
  while (j >= 0) {
    var groupEnd   = rowsToDeleteAsc[j];
    var groupStart = groupEnd;
    while (j > 0 && rowsToDeleteAsc[j - 1] === rowsToDeleteAsc[j] - 1) {
      j--;
      groupStart = rowsToDeleteAsc[j];
    }
    groups.push({ start: groupStart, count: groupEnd - groupStart + 1 });
    j--;
  }
  for (var g = 0; g < groups.length; g++) {
    sourceSheet.deleteRows(groups[g].start, groups[g].count);
  }

  Logger.log(
    "Checklist cleaned. Removed " + rowsToDeleteAsc.length + " old row(s). " +
    "Column B formulas are completely untouched."
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Normalise a timestamp to a consistent string key (strips seconds for fuzzy matching). */
function normalizeTimestamp(ts) {
  var d = parseDate(ts);
  if (!d) return String(ts).trim().toLowerCase();
  // Key on year-month-day-hour-minute so minor sub-second differences don't break matching
  return d.getFullYear() + "-" +
         d.getMonth()    + "-" +
         d.getDate()     + "-" +
         d.getHours()    + "-" +
         d.getMinutes();
}

/** Parse various timestamp formats into a Date, or return null if unparseable. */
function parseDate(timestamp) {
  if (timestamp instanceof Date && !isNaN(timestamp.getTime())) return timestamp;
  if (typeof timestamp === "string" && timestamp.trim() !== "") {
    var d = new Date(timestamp);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof timestamp === "number") {
    return new Date((timestamp - 25569) * 86400 * 1000);
  }
  return null;
}