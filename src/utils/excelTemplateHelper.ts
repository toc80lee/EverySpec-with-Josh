import { AlvField } from '../types/sap';
import { downloadFile } from './specExport';

/**
 * Generate and download an Excel-compatible CSV template matching the active Field Catalog
 */
export function downloadExcelTemplate(
  fieldCatalog: AlvField[],
  programId = 'ZR_CUSTOM_REPORT'
): void {
  if (!fieldCatalog || fieldCatalog.length === 0) {
    console.warn('Field catalog is empty, cannot generate template');
    return;
  }

  // 1. Header row: Column Text (with Fieldname)
  const headerColnames = fieldCatalog.map((f) => f.fieldname);
  const headerLabels = fieldCatalog.map((f) => `${f.coltext} [${f.fieldname}]`);

  // 2. Sample data row to guide the user
  const sampleRow = fieldCatalog.map((f) => {
    const fname = f.fieldname.toUpperCase();
    if (fname === 'ZICON' || fname === 'STATUS' || fname === 'LIGHTS') {
      return '1'; // 1-Green
    }
    if (f.datatype === 'DATS') {
      return '2026.11.03';
    }
    if (f.datatype === 'CURR') {
      return '50000000';
    }
    if (f.datatype === 'DEC' || f.datatype === 'INT4' || f.datatype === 'NUMC') {
      return '10';
    }
    if (fname.includes('CURR') || fname === 'WAERK') {
      return 'KRW';
    }
    if (fname.includes('UNIT') || fname === 'VRKME') {
      return 'EA';
    }
    return `TEST_${f.coltext || f.fieldname}`;
  });

  const csvRows = [
    headerColnames.map((v) => `"${v}"`).join(','),
    headerLabels.map((v) => `"# ${v}"`).join(','), // Commented guide row
    sampleRow.map((v) => `"${v}"`).join(','),
  ];

  // UTF-8 with BOM for Excel Korean/English support
  const csvContent = '\uFEFF' + csvRows.join('\r\n');
  downloadFile(`${programId}_TEST_TEMPLATE.csv`, csvContent, 'text/csv;charset=utf-8;');
}

/**
 * Robust CSV parser supporting quotes, commas, multiline values, and BOM
 */
export function parseCsvRows(csvText: string): string[][] {
  const cleanText = csvText.replace(/^\uFEFF/, '').trim();
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let insideQuote = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (char === '"') {
      if (insideQuote && nextChar === '"') {
        currentCell += '"';
        i++; // skip escaped quote
      } else {
        insideQuote = !insideQuote;
      }
    } else if (char === ',' && !insideQuote) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\r' || char === '\n') && !insideQuote) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip CRLF
      }
      currentRow.push(currentCell.trim());
      if (currentRow.some((c) => c !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }

  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((c) => c !== '')) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Parse uploaded Excel/CSV file content and convert into ALV mock rows
 * Requirement: All status fields (ZICON, STATUS, LIGHTS) MUST be set to green ('1')!
 */
export function parseUploadedExcelOrCsv(
  csvContent: string,
  fieldCatalog: AlvField[]
): {
  rows: Record<string, any>[];
  errors?: string[];
} {
  const parsedGrid = parseCsvRows(csvContent);
  if (parsedGrid.length === 0) {
    return { rows: [], errors: ['파일에 데이터가 없습니다.'] };
  }

  // 1. Identify header row (skip empty or guide comment rows starting with #)
  let headerRowIndex = 0;
  while (
    headerRowIndex < parsedGrid.length &&
    parsedGrid[headerRowIndex].every((c) => c.startsWith('#') || c === '')
  ) {
    headerRowIndex++;
  }

  if (headerRowIndex >= parsedGrid.length) {
    return { rows: [], errors: ['유효한 헤더 열을 찾을 수 없습니다.'] };
  }

  const rawHeaders = parsedGrid[headerRowIndex];

  // 2. Map header column indices to field catalog fields
  const colIndexToField: Record<number, AlvField> = {};

  rawHeaders.forEach((rawH, idx) => {
    const cleanHeader = rawH.replace(/^[#\s]+/, '').trim().toUpperCase();
    const matchedField = fieldCatalog.find((f) => {
      const fn = f.fieldname.toUpperCase();
      const ct = (f.coltext || '').toUpperCase();
      return (
        cleanHeader === fn ||
        cleanHeader === ct ||
        cleanHeader.startsWith(fn) ||
        cleanHeader.includes(`[${fn}]`)
      );
    });

    if (matchedField) {
      colIndexToField[idx] = matchedField;
    } else if (idx < fieldCatalog.length) {
      // Fallback by position
      colIndexToField[idx] = fieldCatalog[idx];
    }
  });

  // 3. Find status field (ZICON / STATUS / LIGHTS)
  const statusFields = fieldCatalog.filter(
    (f) =>
      f.fieldname === 'ZICON' ||
      f.fieldname === 'STATUS' ||
      f.fieldname === 'LIGHTS' ||
      f.icon_type === 'LIGHTS'
  );

  // 4. Parse data rows
  const resultRows: Record<string, any>[] = [];

  for (let r = headerRowIndex + 1; r < parsedGrid.length; r++) {
    const rawRow = parsedGrid[r];
    // Skip comment lines
    if (rawRow[0]?.startsWith('#')) continue;

    const rowObj: Record<string, any> = {};

    // Initialize all catalog fields
    fieldCatalog.forEach((f) => {
      rowObj[f.fieldname] = '';
    });

    // Populate from uploaded row
    rawRow.forEach((val, cIdx) => {
      const field = colIndexToField[cIdx];
      if (field) {
        if (field.datatype === 'CURR' || field.datatype === 'DEC' || field.datatype === 'INT4') {
          const num = Number(val.replace(/,/g, ''));
          rowObj[field.fieldname] = isNaN(num) ? val : num;
        } else {
          rowObj[field.fieldname] = val;
        }
      }
    });

    // CRITICAL USER REQUIREMENT:
    // "상태 필드는 모두 녹색('1')으로 표시한다."
    statusFields.forEach((sf) => {
      rowObj[sf.fieldname] = '1';
    });

    resultRows.push(rowObj);
  }

  return { rows: resultRows };
}
