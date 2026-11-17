export const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwlEKO_SGplEReKLOdaCdpmztSXHDB_0oapI1dwiEY7qmuzvhScIvmXjB6_HLP8jFQL/exec";
export const MAIN_SPREADSHEET_ID = "1MvNdsblxNzREdV5kSgBo_78IusmQzilbar9pteufEz0";

/**
 * Robust sheet data fetcher:
 * 1. Tries Google GViz API first (fastest when sheet has public link view)
 * 2. If blocked by CORS / Restricted sheet or any network error,
 *    automatically falls back to Apps Script Web App (action=fetch) proxy.
 *    Because Apps Script executes as the Owner ("Execute as: Me"), it has full
 *    permission to read 100% Restricted / Private sheets with NO CORS errors!
 *
 * Both sources return the exact same format:
 * { table: { cols: [...], rows: [ { c: [{ v: ..., f: ... }] } ] } }
 */
export async function fetchSheetData(sheetName, options = {}) {
  const spreadsheetId = options.spreadsheetId || MAIN_SPREADSHEET_ID;
  const scriptUrl = options.scriptUrl || APPS_SCRIPT_URL;

  // 1. Try GViz first
  try {
    const gvizUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}&t=${Date.now()}`;
    const res = await fetch(gvizUrl);
    if (res.ok) {
      const text = await res.text();
      const start = text.indexOf("{");
      const end = text.lastIndexOf("}");
      if (start !== -1 && end !== -1) {
        const json = JSON.parse(text.substring(start, end + 1));
        if (json && json.table && json.table.rows) {
          return json;
        }
      }
    }
  } catch (err) {
    // Expected when Google Sheet is Restricted (causes 302 redirect to ServiceLogin -> CORS error)
    console.warn(`[sheetApi] GViz fetch failed for "${sheetName}" (Sheet is likely Restricted). Using Apps Script proxy...`);
  }

  // 2. Fallback to Apps Script proxy (works on Restricted sheets)
  const proxyUrl = `${scriptUrl}?sheet=${encodeURIComponent(sheetName)}&action=fetch&t=${Date.now()}`;
  const proxyRes = await fetch(proxyUrl);
  if (!proxyRes.ok) {
    throw new Error(`Failed to fetch sheet "${sheetName}": HTTP ${proxyRes.status}`);
  }
  const proxyJson = await proxyRes.json();
  if (proxyJson && proxyJson.table) {
    return proxyJson;
  }
  throw new Error(`Invalid data returned for sheet "${sheetName}"`);
}
