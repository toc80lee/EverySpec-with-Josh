import {
  AlvErrorLog,
  AlvField,
  ProgramSpec,
  SelectionParameter,
} from '../types/sap';
import { getDD03LFields } from './sapDdicStorage';

export interface SelectionVariant {
  id: string;
  name: string;
  description?: string;
  updatedAt: string;
  values: Record<
    string,
    {
      low?: string;
      high?: string;
      multi_values?: { sign: 'I' | 'E'; option: string; low: string; high: string }[];
    }
  >;
}

export interface AlvLayoutConfigState {
  visibleFields: string[]; // ordered fieldnames
  subtotalField: string | null;
  zebra: boolean;
  cwidth_opt: boolean;
  no_hgridln: boolean;
  no_vgridln: boolean;
}

export interface AlvLayoutVariant {
  id: string;
  name: string;
  description?: string;
  updatedAt: string;
  config: AlvLayoutConfigState;
}

export interface F4SuggestionItem {
  value: string;
  label: string;
  source: 'Mock Data' | 'SAP Domain' | 'Date Preset';
}

const SELECTION_VARIANT_PREFIX = 'sap_sim_sel_variants_';
const ALV_LAYOUT_VARIANT_PREFIX = 'sap_sim_alv_variants_';

// ============================================================================
// 1. Selection Screen Variant Storage
// ============================================================================
export function getSelectionVariants(programId: string): SelectionVariant[] {
  try {
    const key = `${SELECTION_VARIANT_PREFIX}${(programId || 'DEFAULT').toUpperCase()}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore storage read error
  }
  return [];
}

export function saveSelectionVariant(
  programId: string,
  variant: SelectionVariant
): SelectionVariant[] {
  const existing = getSelectionVariants(programId);
  const filtered = existing.filter(
    (v) => v.name.toUpperCase() !== variant.name.toUpperCase()
  );
  const next = [variant, ...filtered];
  try {
    const key = `${SELECTION_VARIANT_PREFIX}${(programId || 'DEFAULT').toUpperCase()}`;
    localStorage.setItem(key, JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}

export function deleteSelectionVariant(
  programId: string,
  variantId: string
): SelectionVariant[] {
  const existing = getSelectionVariants(programId);
  const next = existing.filter((v) => v.id !== variantId);
  try {
    const key = `${SELECTION_VARIANT_PREFIX}${(programId || 'DEFAULT').toUpperCase()}`;
    localStorage.setItem(key, JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}

// ============================================================================
// 2. ALV Layout Variant Storage
// ============================================================================
export function getAlvLayoutVariants(programId: string): AlvLayoutVariant[] {
  try {
    const key = `${ALV_LAYOUT_VARIANT_PREFIX}${(programId || 'DEFAULT').toUpperCase()}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

export function saveAlvLayoutVariant(
  programId: string,
  variant: AlvLayoutVariant
): AlvLayoutVariant[] {
  const existing = getAlvLayoutVariants(programId);
  const filtered = existing.filter(
    (v) => v.name.toUpperCase() !== variant.name.toUpperCase()
  );
  const next = [variant, ...filtered];
  try {
    const key = `${ALV_LAYOUT_VARIANT_PREFIX}${(programId || 'DEFAULT').toUpperCase()}`;
    localStorage.setItem(key, JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}

export function deleteAlvLayoutVariant(
  programId: string,
  variantId: string
): AlvLayoutVariant[] {
  const existing = getAlvLayoutVariants(programId);
  const next = existing.filter((v) => v.id !== variantId);
  try {
    const key = `${ALV_LAYOUT_VARIANT_PREFIX}${(programId || 'DEFAULT').toUpperCase()}`;
    localStorage.setItem(key, JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}

// ============================================================================
// 3. F4 Value Help Suggestions Builder
// ============================================================================
const SAP_DOMAIN_PRESETS: Record<string, { value: string; label: string }[]> = {
  BUKRS: [
    { value: '1000', label: '한국 본사 (KR Headquarters)' },
    { value: '2000', label: '미국 법인 (US Subsidiary)' },
    { value: '3000', label: '유럽 법인 (EU Subsidiary)' },
  ],
  VKORG: [
    { value: '1000', label: '국내 영업조직 (Domestic Sales)' },
    { value: '1100', label: '직판 영업조직 (Direct Sales)' },
    { value: '2000', label: '해외 수출조직 (Export Sales)' },
  ],
  WERKS: [
    { value: '1000', label: '수원 플랜트 (Suwon Plant)' },
    { value: '1100', label: '화성 플랜트 (Hwaseong Plant)' },
    { value: '2000', label: '울산 플랜트 (Ulsan Plant)' },
  ],
  WAERK: [
    { value: 'KRW', label: 'South Korean Won' },
    { value: 'USD', label: 'US Dollar' },
    { value: 'EUR', label: 'Euro' },
    { value: 'JPY', label: 'Japanese Yen' },
  ],
  WAERS: [
    { value: 'KRW', label: 'South Korean Won' },
    { value: 'USD', label: 'US Dollar' },
    { value: 'EUR', label: 'Euro' },
    { value: 'JPY', label: 'Japanese Yen' },
  ],
  AUART: [
    { value: 'OR', label: 'Standard Order (표준 오더)' },
    { value: 'RE', label: 'Returns (반품 오더)' },
    { value: 'SO', label: 'Rush Order (긴급 오더)' },
    { value: 'ZOR1', label: 'Domestic Custom Order' },
  ],
  KUNNR: [
    { value: '100001', label: '(주)삼성전자 수원공장' },
    { value: '100002', label: '현대모비스 남양연구소' },
    { value: '100003', label: 'LG에너지솔루션 오창공장' },
  ],
  MATNR: [
    { value: 'MAT-PART-001', label: '전장 제어 모듈 A100' },
    { value: 'MAT-PART-002', label: '배터리 하우징 프레임 B200' },
    { value: 'MAT-PART-003', label: '고전압 커넥터 어셈블리 C300' },
  ],
  GJAHR: [
    { value: '2026', label: '2026 회계연도' },
    { value: '2025', label: '2025 회계연도' },
  ],
  MONAT: [
    { value: '10', label: '10월 (Period 10)' },
    { value: '11', label: '11월 (Period 11)' },
    { value: '12', label: '12월 (Period 12)' },
  ],
};

function findMatchingRowFieldKey(
  param: SelectionParameter,
  sampleRow: Record<string, any> | undefined,
  fieldCatalog: AlvField[]
): string | null {
  const keys = sampleRow ? Object.keys(sampleRow) : fieldCatalog.map((f) => f.fieldname);
  if (keys.length === 0) return null;

  const refField = param.ref_field?.trim().toUpperCase();
  const stripped = param.name
    .trim()
    .toUpperCase()
    .replace(/^(P|S|R|C)_/, '');

  const candidates = [refField, param.name.trim().toUpperCase(), stripped].filter(
    Boolean
  ) as string[];

  for (const c of candidates) {
    const exact = keys.find((k) => k.toUpperCase() === c);
    if (exact) return exact;
  }

  // Semantic aliases between SAP technical field names and mock columns
  const aliasGroups: string[][] = [
    ['VBELN', 'DOC_NO', 'DOCNO', 'ORD_NO', 'EBELN', 'BELNR'],
    ['ERDAT', 'FKDAT', 'BUDAT', 'DOC_DATE', 'DATE', 'POST_DATE', 'AEDAT'],
    ['KUNNR', 'PARTNER_NAME', 'KUNAG', 'NAME1', 'CUSTOMER', 'LIFNR', 'VENDOR'],
    ['WAERK', 'WAERS', 'CURRENCY', 'HWAER'],
    ['NETWR', 'DMBTR', 'AMOUNT', 'WRBTR', 'TOTAL_AMT'],
    ['MATNR', 'MATERIAL', 'MAT_NO'],
    ['WERKS', 'PLANT'],
    ['VKORG', 'SALES_ORG'],
    ['BUKRS', 'COMP_CODE'],
    ['CARRID', 'AIRLINE'],
  ];

  for (const c of candidates) {
    const grp = aliasGroups.find((g) => g.includes(c));
    if (grp) {
      const matched = keys.find((k) => grp.includes(k.toUpperCase()));
      if (matched) return matched;
    }
  }

  // Partial contains match for date/doc/partner fields
  if (param.datatype === 'DATS') {
    const dateCol = fieldCatalog.find((f) => f.datatype === 'DATS')?.fieldname;
    if (dateCol && keys.includes(dateCol)) return dateCol;
  }

  return null;
}

export function getF4SuggestionsForParam(
  param: SelectionParameter,
  spec: ProgramSpec
): F4SuggestionItem[] {
  const seen = new Set<string>();
  const items: F4SuggestionItem[] = [];

  const pushUnique = (value: string, label: string, source: F4SuggestionItem['source']) => {
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    items.push({ value: trimmed, label, source });
  };

  // 1. Date presets if DATS
  if (param.datatype === 'DATS') {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const lastDay = new Date(yyyy, now.getMonth() + 1, 0).getDate();
    pushUnique(`${yyyy}.${mm}.${dd}`, 'Today (SY-DATUM)', 'Date Preset');
    pushUnique(`${yyyy}.${mm}.01`, 'First Day of Current Month', 'Date Preset');
    pushUnique(
      `${yyyy}.${mm}.${String(lastDay).padStart(2, '0')}`,
      'Last Day of Current Month',
      'Date Preset'
    );
    pushUnique('2026.10.01', 'Sample Period Start (2026.10.01)', 'Date Preset');
    pushUnique('2026.10.31', 'Sample Period End (2026.10.31)', 'Date Preset');
  }

  // 2. Values from current Mock Rows
  const matchedKey = findMatchingRowFieldKey(
    param,
    spec.mock_rows?.[0],
    spec.field_catalog
  );
  if (matchedKey && spec.mock_rows) {
    spec.mock_rows.forEach((row, idx) => {
      const val = row[matchedKey];
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        pushUnique(
          String(val),
          `Row ${idx + 1} (${matchedKey})`,
          'Mock Data'
        );
      }
    });
  }

  // 3. Domain presets via ref_field or stripped parameter name
  const refKey = (param.ref_field || param.name.replace(/^(P|S)_/i, '')).toUpperCase();
  const presets = SAP_DOMAIN_PRESETS[refKey];
  if (presets) {
    presets.forEach((p) => pushUnique(p.value, p.label, 'SAP Domain'));
  }

  // 4. Default value if defined
  if (param.default_val && param.default_val !== 'SY-DATUM') {
    pushUnique(param.default_val, 'Default Value', 'SAP Domain');
  }

  // 5. Fallback from DDIC metadata description if still empty
  if (items.length === 0 && param.ref_table && param.ref_field) {
    const ddFields = getDD03LFields(param.ref_table);
    const dd = ddFields.find(
      (f) => f.fieldname.toUpperCase() === param.ref_field?.toUpperCase()
    );
    if (dd) {
      pushUnique(
        param.default_val || 'SAMPLE_01',
        `${dd.tabname}-${dd.fieldname}: ${dd.scrtext_l}`,
        'SAP Domain'
      );
    }
  }

  return items;
}

// ============================================================================
// 4. Selection Screen Validation & ALV Filtering Engine
// ============================================================================
export function validateSelectionParams(
  params: SelectionParameter[]
): { valid: boolean; missingIds: string[]; missingLabels: string[] } {
  const missingIds: string[] = [];
  const missingLabels: string[] = [];

  params.forEach((p) => {
    if (!p.obligatory || p.kind === 'RADIOBUTTON' || p.kind === 'CHECKBOX') return;
    const hasLow = !!(p.low && p.low.trim() !== '');
    const hasMulti = !!(p.multi_values && p.multi_values.length > 0);
    // Note: if low was never touched yet, default_val acts as initial value in placeholder
    const hasEffectiveDefault =
      p.low === undefined && !!(p.default_val && p.default_val.trim() !== '');

    if (!hasLow && !hasMulti && !hasEffectiveDefault) {
      missingIds.push(p.id);
      missingLabels.push(p.text || p.name);
    }
  });

  return {
    valid: missingIds.length === 0,
    missingIds,
    missingLabels,
  };
}

function normalizeComparable(val: any, datatype?: string): string {
  const s = String(val ?? '').trim();
  if (datatype === 'DATS') {
    return s.replace(/[.\-/]/g, '');
  }
  return s.toUpperCase();
}

function matchesPattern(cellStr: string, patternStr: string): boolean {
  if (!patternStr.includes('*')) {
    return cellStr === patternStr;
  }
  const escaped = patternStr.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`, 'i').test(cellStr);
}

export interface SelectionFilterResult {
  filteredRows: Record<string, any>[];
  appliedParams: string[];
  summaryModeHint: boolean;
}

export function filterRowsBySelectionParams(
  rows: Record<string, any>[],
  params: SelectionParameter[],
  fieldCatalog: AlvField[]
): SelectionFilterResult {
  if (!rows || rows.length === 0) {
    return { filteredRows: [], appliedParams: [], summaryModeHint: false };
  }

  let summaryModeHint = false;
  const appliedParams: string[] = [];

  // Check radio/checkbox hints (e.g. "요약", "집계", "Summary", "Totals Only")
  params.forEach((p) => {
    const isChecked =
      p.low !== undefined ? p.low === 'X' : p.default_val?.toUpperCase() === 'X';
    if ((p.kind === 'RADIOBUTTON' || p.kind === 'CHECKBOX') && isChecked) {
      const txt = `${p.text} ${p.name}`.toLowerCase();
      if (
        txt.includes('집계') ||
        txt.includes('요약') ||
        txt.includes('summary') ||
        txt.includes('totals only')
      ) {
        summaryModeHint = true;
        appliedParams.push(p.name);
      }
    }
  });

  const activeCriteria: {
    param: SelectionParameter;
    rowKey: string;
  }[] = [];

  params.forEach((p) => {
    if (p.kind === 'RADIOBUTTON' || p.kind === 'CHECKBOX') return;
    const effectiveLow = (p.low ?? '').trim();
    const effectiveHigh = (p.high ?? '').trim();
    const multi = p.multi_values || [];

    if (!effectiveLow && !effectiveHigh && multi.length === 0) return;

    const rowKey = findMatchingRowFieldKey(p, rows[0], fieldCatalog);
    if (rowKey) {
      activeCriteria.push({ param: p, rowKey });
      appliedParams.push(p.name);
    }
  });

  if (activeCriteria.length === 0) {
    return { filteredRows: rows, appliedParams, summaryModeHint };
  }

  const filteredRows = rows.filter((row) => {
    return activeCriteria.every(({ param, rowKey }) => {
      const cellNorm = normalizeComparable(row[rowKey], param.datatype);
      const lowNorm = normalizeComparable(param.low || '', param.datatype);
      const highNorm = normalizeComparable(param.high || '', param.datatype);
      const multi = param.multi_values || [];

      if (param.kind === 'PARAMETER') {
        if (!lowNorm) return true;
        if (lowNorm.includes('*')) return matchesPattern(cellNorm, lowNorm);
        return cellNorm.includes(lowNorm);
      }

      // SELECT_OPTION evaluation (Include / Exclude logic like SAP ABAP IN s_range)
      const includes = multi.filter((m) => m.sign === 'I');
      const excludes = multi.filter((m) => m.sign === 'E');

      // Check explicit excludes first
      for (const ex of excludes) {
        const exLow = normalizeComparable(ex.low, param.datatype);
        const exHigh = normalizeComparable(ex.high, param.datatype);
        if (ex.option === 'BT' && exLow && exHigh) {
          if (cellNorm >= exLow && cellNorm <= exHigh) return false;
        } else if (exLow) {
          if (exLow.includes('*') ? matchesPattern(cellNorm, exLow) : cellNorm === exLow) {
            return false;
          }
        }
      }

      // Check includes (either from multi_values OR direct low/high fields)
      if (includes.length > 0) {
        return includes.some((inc) => {
          const incLow = normalizeComparable(inc.low, param.datatype);
          const incHigh = normalizeComparable(inc.high, param.datatype);
          if (inc.option === 'BT' && incLow && incHigh) {
            return cellNorm >= incLow && cellNorm <= incHigh;
          }
          if (incLow.includes('*')) return matchesPattern(cellNorm, incLow);
          return cellNorm === incLow || cellNorm.includes(incLow);
        });
      }

      if (lowNorm && highNorm) {
        return cellNorm >= lowNorm && cellNorm <= highNorm;
      }
      if (lowNorm) {
        if (lowNorm.includes('*')) return matchesPattern(cellNorm, lowNorm);
        return cellNorm.includes(lowNorm);
      }
      if (highNorm) {
        return cellNorm <= highNorm;
      }
      return true;
    });
  });

  return { filteredRows, appliedParams, summaryModeHint };
}

// ============================================================================
// 5. Editable ALV Validation Engine (Data Check & Save Protocol)
// ============================================================================
export function validateAlvEdits(
  rows: Record<string, any>[],
  fieldCatalog: AlvField[],
  dirtyCellKeys?: Set<string>
): { errors: AlvErrorLog[]; cellErrors: Record<string, string> } {
  const errors: AlvErrorLog[] = [];
  const cellErrors: Record<string, string> = {};

  rows.forEach((row, rIdx) => {
    fieldCatalog.forEach((field) => {
      if (!field.edit) return;
      const cellKey = `${rIdx}:${field.fieldname}`;
      if (dirtyCellKeys && dirtyCellKeys.size > 0 && !dirtyCellKeys.has(cellKey)) {
        return;
      }

      const raw = row[field.fieldname];
      const strVal = raw !== undefined && raw !== null ? String(raw).trim() : '';

      if (
        field.datatype === 'CURR' ||
        field.datatype === 'DEC' ||
        field.datatype === 'INT4' ||
        field.datatype === 'NUMC'
      ) {
        if (strVal !== '') {
          const cleaned = strVal.replace(/,/g, '');
          const isValidNum =
            field.datatype === 'INT4' || field.datatype === 'NUMC'
              ? /^-?\d+$/.test(cleaned)
              : /^-?\d+(\.\d+)?$/.test(cleaned);
          if (!isValidNum) {
            const msg = `Row ${rIdx + 1}: "${strVal}" is not a valid ${field.datatype} numeric entry.`;
            cellErrors[cellKey] = msg;
            errors.push({
              id: `err-${rIdx}-${field.fieldname}`,
              type: 'E',
              col_name: field.coltext || field.fieldname,
              message: msg,
            });
          }
        }
      } else if (field.datatype === 'DATS' && strVal !== '') {
        const validDate =
          /^\d{4}\.\d{2}\.\d{2}$/.test(strVal) ||
          /^\d{4}-\d{2}-\d{2}$/.test(strVal) ||
          /^\d{8}$/.test(strVal);
        if (!validDate) {
          const msg = `Row ${rIdx + 1}: Invalid date format "${strVal}" (expected YYYY.MM.DD).`;
          cellErrors[cellKey] = msg;
          errors.push({
            id: `err-${rIdx}-${field.fieldname}`,
            type: 'E',
            col_name: field.coltext || field.fieldname,
            message: msg,
          });
        }
      }

      if (
        field.outputlen > 0 &&
        strVal.length > field.outputlen &&
        field.datatype !== 'CURR' &&
        field.datatype !== 'DEC'
      ) {
        const msg = `Row ${rIdx + 1}: Value length (${strVal.length}) exceeds OUTPUTLEN (${field.outputlen}).`;
        cellErrors[cellKey] = msg;
        errors.push({
          id: `err-len-${rIdx}-${field.fieldname}`,
          type: 'E',
          col_name: field.coltext || field.fieldname,
          message: msg,
        });
      }
    });
  });

  return { errors, cellErrors };
}
