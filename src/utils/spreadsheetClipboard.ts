import { SelectionParameter, SelectionKind, AlvField, AlvToolbarButton, SapDataType, TextAlignment } from '../types/sap';

/**
 * Splits raw pasted clipboard text into 2D array of cells [rows][cols].
 * Handles standard Excel/Google Sheets TSV and CSV formats.
 */
export function parseSpreadsheetText(rawText: string): string[][] {
  if (!rawText || !rawText.trim()) return [];

  // Normalize line endings
  const clean = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = clean.split('\n');

  const rows: string[][] = [];

  for (const line of lines) {
    if (!line.trim()) continue; // skip blank trailing lines

    // If contains tabs, split by tab (standard for Excel/Sheets copy)
    if (line.includes('\t')) {
      const cells = line.split('\t').map((c) => c.trim());
      rows.push(cells);
    } else if (line.includes(',') && !line.includes('\t')) {
      // Basic CSV fallback
      const cells = line.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
      rows.push(cells);
    } else {
      // Single column line
      rows.push([line.trim()]);
    }
  }

  return rows;
}

/**
 * Safely copy TSV text to clipboard
 */
export async function copyTsvToClipboard(tsvContent: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(tsvContent);
      return true;
    }
  } catch (err) {
    console.warn('Clipboard writeText failed, falling back to execCommand', err);
  }

  // Fallback using textarea
  try {
    const el = document.createElement('textarea');
    el.value = tsvContent;
    el.setAttribute('readonly', '');
    el.style.position = 'absolute';
    el.style.left = '-9999px';
    document.body.appendChild(el);
    el.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(el);
    return successful;
  } catch (e) {
    console.error('All clipboard copy attempts failed', e);
    return false;
  }
}

// ============================================================================
// 1. SELECTION SCREEN SPREADSHEET PARSER & EXPORTER
// ============================================================================
// Excel Columns:
// [0] Kind (PARAM / S-OPT / PARAMETER / SELECT_OPTION)
// [1] Name (P_VKORG / S_ERDAT)
// [2] Screen Text (Label)
// [3] Type (CHAR, DATS, NUMC, CURR, DEC, UNIT, etc.)
// [4] Length (number)
// [5] Ref Table (VBAK, MARA)
// [6] Ref Field (VKORG, ERDAT)
// [7] Obligatory (X, 1, TRUE, Y)
// [8] Default Value (1000, 2026.10.01)

export function parseSelectionParamsFromTsv(rawText: string, existingLength = 0): SelectionParameter[] {
  const grid = parseSpreadsheetText(rawText);
  if (grid.length === 0) return [];

  const results: SelectionParameter[] = [];

  grid.forEach((cells, idx) => {
    // If the first row looks like a header, skip it
    if (idx === 0) {
      const firstCell = (cells[0] || '').toUpperCase();
      const secondCell = (cells[1] || '').toUpperCase();
      if (
        firstCell.includes('KIND') ||
        firstCell.includes('구분') ||
        secondCell.includes('NAME') ||
        secondCell.includes('FIELD') ||
        secondCell.includes('파라미터')
      ) {
        return; // skip header row
      }
    }

    let kind: SelectionKind = 'PARAMETER';
    let name = '';
    let text = '';
    let datatype: SapDataType = 'CHAR';
    let length = 10;
    let ref_table = '';
    let ref_field = '';
    let obligatory = false;
    let default_val = '';

    // Check if column 0 is Kind or Name
    const cell0 = (cells[0] || '').trim();
    const cell0Upper = cell0.toUpperCase();

    if (
      cell0Upper === 'PARAM' ||
      cell0Upper === 'PARAMETER' ||
      cell0Upper === 'P' ||
      cell0Upper === 'S-OPT' ||
      cell0Upper === 'SELECT_OPTION' ||
      cell0Upper === 'SELECT-OPTION' ||
      cell0Upper === 'S'
    ) {
      // Standard 9-column format
      kind = cell0Upper.startsWith('S') ? 'SELECT_OPTION' : 'PARAMETER';
      name = (cells[1] || '').trim().toUpperCase();
      text = (cells[2] || '').trim();
      datatype = normalizeDataType(cells[3]);
      length = parseInt(cells[4], 10) || defaultLengthForType(datatype);
      ref_table = (cells[5] || '').trim().toUpperCase();
      ref_field = (cells[6] || '').trim().toUpperCase();
      obligatory = isTruthy(cells[7]);
      default_val = (cells[8] || '').trim();
    } else {
      // User pasted starting from Name (cell0 is name)
      name = cell0.toUpperCase();
      kind = name.startsWith('S_') ? 'SELECT_OPTION' : 'PARAMETER';
      text = (cells[1] || '').trim();
      datatype = normalizeDataType(cells[2]);
      length = parseInt(cells[3], 10) || defaultLengthForType(datatype);
      ref_table = (cells[4] || '').trim().toUpperCase();
      ref_field = (cells[5] || '').trim().toUpperCase();
      obligatory = isTruthy(cells[6]);
      default_val = (cells[7] || '').trim();
    }

    if (!name) {
      const curNum = existingLength + results.length + 1;
      name = kind === 'PARAMETER' ? `P_FLD${curNum}` : `S_FLD${curNum}`;
    }
    if (!text) {
      text = name;
    }

    results.push({
      id: `param-paste-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
      kind,
      name,
      text,
      datatype,
      length,
      ref_table,
      ref_field,
      obligatory,
      default_val,
      low: '',
      high: '',
      sign: 'I',
      option: 'EQ',
    });
  });

  return results;
}

export function exportSelectionParamsToTsv(params: SelectionParameter[]): string {
  const header = ['KIND', 'NAME', 'SCREEN TEXT', 'TYPE', 'LENGTH', 'REF TABLE', 'REF FIELD', 'OBLIGATORY', 'DEFAULT VALUE'].join('\t');
  const rows = params.map((p) => {
    return [
      p.kind === 'PARAMETER' ? 'PARAM' : 'S-OPT',
      p.name,
      p.text,
      p.datatype,
      p.length,
      p.ref_table || '',
      p.ref_field || '',
      p.obligatory ? 'X' : '',
      p.default_val || '',
    ].join('\t');
  });
  return [header, ...rows].join('\n');
}

// ============================================================================
// 2. FIELD CATALOG SPREADSHEET PARSER & EXPORTER
// ============================================================================
// Excel Columns:
// [0] POS (optional, or FIELDNAME)
// [1] FIELDNAME
// [2] COLTEXT (Label)
// [3] TYPE (CHAR, NUMC, DATS, CURR, DEC, UNIT, etc.)
// [4] LENGTH (number)
// [5] JUST (L, C, R)
// [6] COLOR (C300, etc.)
// [7] KEY (X, 1)
// [8] HOTSPOT (X, 1)
// [9] CHECKBOX (X, 1)
// [10] EDIT (X, 1)
// [11] DO_SUM (X, 1)
// [12] REF_TABLE
// [13] REF_FIELD
// [14] TCODE

export function parseFieldCatalogFromTsv(rawText: string, currentLength = 0): AlvField[] {
  const grid = parseSpreadsheetText(rawText);
  if (grid.length === 0) return [];

  const results: AlvField[] = [];

  grid.forEach((cells, idx) => {
    // Check if row is a header
    if (idx === 0) {
      const c0 = (cells[0] || '').toUpperCase();
      const c1 = (cells[1] || '').toUpperCase();
      if (
        c0.includes('POS') ||
        c0.includes('순번') ||
        c0.includes('FIELD') ||
        c1.includes('FIELD') ||
        c1.includes('COLTEXT') ||
        c1.includes('항목')
      ) {
        return; // skip header row
      }
    }

    let fieldname = '';
    let coltext = '';
    let datatype: SapDataType = 'CHAR';
    let outputlen = 10;
    let just: TextAlignment = 'L';
    let emphasize = '';
    let isKey = false;
    let hotspot = false;
    let checkbox = false;
    let edit = false;
    let do_sum = false;
    let ref_table = '';
    let ref_field = '';
    let drilldown_tcode = '';

    const cell0 = (cells[0] || '').trim();
    const cell0IsNumber = /^\d+$/.test(cell0);

    // If first column is numerical POS:
    let offset = 0;
    if (cell0IsNumber && cells.length > 2) {
      offset = 1; // cells[1] is fieldname
    }

    fieldname = (cells[offset] || '').trim().toUpperCase();
    if (!fieldname) return; // skip row without fieldname

    coltext = (cells[offset + 1] || '').trim() || fieldname;
    datatype = normalizeDataType(cells[offset + 2]);
    outputlen = parseInt(cells[offset + 3], 10) || defaultLengthForType(datatype);

    const justRaw = (cells[offset + 4] || '').trim().toUpperCase();
    just = justRaw === 'R' ? 'R' : justRaw === 'C' ? 'C' : datatype === 'CURR' || datatype === 'DEC' ? 'R' : datatype === 'DATS' ? 'C' : 'L';

    emphasize = (cells[offset + 5] || '').trim().toUpperCase();
    isKey = isTruthy(cells[offset + 6]);
    hotspot = isTruthy(cells[offset + 7]);
    checkbox = isTruthy(cells[offset + 8]);
    edit = isTruthy(cells[offset + 9]);
    do_sum = isTruthy(cells[offset + 10]) || (datatype === 'CURR');
    ref_table = (cells[offset + 11] || '').trim().toUpperCase();
    ref_field = (cells[offset + 12] || '').trim().toUpperCase();
    drilldown_tcode = (cells[offset + 13] || '').trim().toUpperCase();

    const nextPos = currentLength + results.length + 1;

    results.push({
      id: `fcat-paste-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
      col_pos: nextPos,
      fieldname,
      coltext,
      datatype,
      outputlen,
      just,
      emphasize,
      key: isKey,
      hotspot,
      checkbox,
      edit,
      do_sum: datatype === 'CHAR' ? false : do_sum,
      ref_table,
      ref_field,
      drilldown_tcode,
    });
  });

  return results;
}

export function exportFieldCatalogToTsv(fields: AlvField[]): string {
  const header = ['POS', 'FIELDNAME', 'COLTEXT', 'TYPE', 'LENGTH', 'JUST', 'COLOR', 'KEY', 'HOTSPOT', 'CHK', 'EDIT', 'SUM', 'REF.TABLE', 'REF.FIELD', 'T-CODE'].join('\t');
  const rows = fields.map((f, idx) => {
    return [
      idx + 1,
      f.fieldname,
      f.coltext,
      f.datatype,
      f.outputlen,
      f.just,
      f.emphasize || '',
      f.key ? 'X' : '',
      f.hotspot ? 'X' : '',
      f.checkbox ? 'X' : '',
      f.edit ? 'X' : '',
      f.do_sum ? 'X' : '',
      f.ref_table || '',
      f.ref_field || '',
      f.drilldown_tcode || '',
    ].join('\t');
  });
  return [header, ...rows].join('\n');
}

// ============================================================================
// 3. TOOLBAR BUTTONS SPREADSHEET PARSER & EXPORTER
// ============================================================================
// Excel Columns:
// [0] DISPLAY / VISIBLE (X, 1, TRUE)
// [1] FUNCTION (&DETAIL, FC01)
// [2] BUTTON TEXT (Details, 출력)
// [3] QUICKINFO (Choose Details (F2))
// [4] SEPARATOR (X, 1)
// [5] DISABLED (X, 1)
// [6] ICON (ICON_DETAIL)

export function parseToolbarButtonsFromTsv(rawText: string, currentLength = 0): AlvToolbarButton[] {
  const grid = parseSpreadsheetText(rawText);
  if (grid.length === 0) return [];

  const results: AlvToolbarButton[] = [];

  grid.forEach((cells, idx) => {
    // Check if row is a header
    if (idx === 0) {
      const c0 = (cells[0] || '').toUpperCase();
      const c1 = (cells[1] || '').toUpperCase();
      if (
        c0.includes('DISPLAY') ||
        c0.includes('표시') ||
        c0.includes('FUNCTION') ||
        c1.includes('FUNCTION') ||
        c1.includes('BUTTON') ||
        c1.includes('버튼')
      ) {
        return; // skip header row
      }
    }

    let visible = true;
    let func = '';
    let text = '';
    let quickinfo = '';
    let separator = false;
    let disabled = false;
    let icon = 'ICON_EXECUTE';

    const cell0 = (cells[0] || '').trim();
    const cell0Upper = cell0.toUpperCase();

    // If cell 0 is boolean display (X, 1, Y, TRUE, or empty/FALSE)
    if (cell0Upper === 'X' || cell0Upper === 'Y' || cell0Upper === 'TRUE' || cell0Upper === '1' || cell0Upper === 'FALSE' || cell0Upper === '0' || cell0Upper === '') {
      visible = isTruthy(cell0, true); // default true if empty
      func = (cells[1] || '').trim().toUpperCase();
      text = (cells[2] || '').trim();
      quickinfo = (cells[3] || '').trim();
      separator = isTruthy(cells[4]);
      disabled = isTruthy(cells[5]);
      icon = (cells[6] || '').trim() || 'ICON_EXECUTE';
    } else {
      // User pasted starting from function code
      func = cell0.toUpperCase();
      text = (cells[1] || '').trim();
      quickinfo = (cells[2] || '').trim();
      separator = isTruthy(cells[3]);
      disabled = isTruthy(cells[4]);
      icon = (cells[5] || '').trim() || 'ICON_EXECUTE';
      visible = true;
    }

    if (!func) {
      const nextNum = currentLength + results.length + 1;
      func = `FC0${nextNum}`;
    }
    if (!text) {
      text = func;
    }

    results.push({
      id: `btn-paste-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
      function: func,
      text,
      quickinfo: quickinfo || text,
      icon: icon || 'ICON_EXECUTE',
      disabled,
      visible,
      is_standard: func.startsWith('&'),
      separator_before: separator,
    });
  });

  return results;
}

export function exportToolbarButtonsToTsv(buttons: AlvToolbarButton[]): string {
  const header = ['DISPLAY', 'FUNCTION', 'BUTTON TEXT', 'QUICKINFO', 'SEPARATOR', 'DISABLED', 'ICON'].join('\t');
  const rows = buttons.map((b) => {
    return [
      b.visible !== false ? 'X' : '',
      b.function,
      b.text,
      b.quickinfo || '',
      b.separator_before ? 'X' : '',
      b.disabled ? 'X' : '',
      b.icon || '',
    ].join('\t');
  });
  return [header, ...rows].join('\n');
}

export interface CellRange {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

export function isCellInRange(range: CellRange | null, r: number, c: number): boolean {
  if (!range) return false;
  const minR = Math.min(range.startRow, range.endRow);
  const maxR = Math.max(range.startRow, range.endRow);
  const minC = Math.min(range.startCol, range.endCol);
  const maxC = Math.max(range.startCol, range.endCol);
  return r >= minR && r <= maxR && c >= minC && c <= maxC;
}

export function extractCellRangeTsv(
  range: CellRange,
  getCellValue: (row: number, col: number) => string
): string {
  const minR = Math.min(range.startRow, range.endRow);
  const maxR = Math.max(range.startRow, range.endRow);
  const minC = Math.min(range.startCol, range.endCol);
  const maxC = Math.max(range.startCol, range.endCol);

  const lines: string[] = [];
  for (let r = minR; r <= maxR; r++) {
    const rowCells: string[] = [];
    for (let c = minC; c <= maxC; c++) {
      rowCells.push(getCellValue(r, c) ?? '');
    }
    lines.push(rowCells.join('\t'));
  }
  return lines.join('\n');
}

// Helpers
export function isTruthy(val: any, defaultWhenEmpty = false): boolean {
  if (val === undefined || val === null) return defaultWhenEmpty;
  const s = String(val).trim().toUpperCase();
  if (s === '') return defaultWhenEmpty;
  return s === 'X' || s === 'TRUE' || s === '1' || s === 'Y' || s === 'YES' || s === 'O';
}

export function normalizeDataType(val: any): SapDataType {
  const s = String(val || '').trim().toUpperCase();
  if (s === 'NUMC') return 'NUMC';
  if (s === 'DATS' || s === 'DATE') return 'DATS';
  if (s === 'TIMS' || s === 'TIME') return 'TIMS';
  if (s === 'CURR' || s === 'CURRENCY') return 'CURR';
  if (s === 'DEC' || s === 'DECIMAL') return 'DEC';
  if (s === 'UNIT') return 'UNIT';
  if (s === 'INT4' || s === 'INT') return 'INT4';
  if (s === 'STRING') return 'STRING';
  return 'CHAR';
}

export function defaultLengthForType(dt: SapDataType): number {
  switch (dt) {
    case 'DATS': return 8;
    case 'TIMS': return 6;
    case 'CURR': return 15;
    case 'DEC': return 13;
    case 'UNIT': return 3;
    case 'INT4': return 10;
    case 'STRING': return 255;
    default: return 10;
  }
}
