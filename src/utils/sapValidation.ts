/**
 * SAP Naming Convention Validation Utility
 *
 * Enforces standard SAP ERP / S/4HANA governance and corporate naming standards:
 * - SAP Customer Namespace: All custom developments (CBO: Custom Business Objects,
 *   Reports, Dialog Programs, and Transaction Codes) MUST begin with 'Z' or 'Y'.
 * - Transaction Code (T-Code):
 *   - Stored in SAP table TSTC (field TCODE, CHAR 20)
 *   - Must begin with 'Z' or 'Y' (case-insensitive input, canonical uppercase)
 *   - Length: between 2 and 20 characters (typically 4-20)
 *   - Characters: only alphanumeric characters (A-Z, 0-9) and underscore (_)
 *   - Must not collide with reserved SAP standard transactions (e.g., VA01, MM03, SE38)
 */

import { AlvField, SapDataType } from '../types/sap';

export type SapValidationSeverity = 'success' | 'warning' | 'error' | 'info';

export type SapTCodeValidationStatus =
  | 'valid'
  | 'invalid_prefix'
  | 'reserved_sap_standard'
  | 'invalid_chars'
  | 'too_long'
  | 'too_short'
  | 'empty';

export interface SapTCodeValidationResult {
  isValid: boolean;
  severity: SapValidationSeverity;
  status: SapTCodeValidationStatus;
  message: string;
  details: string;
  suggestedTCode?: string;
  ruleName: string;
}

// Well-known standard SAP transactions to prevent accidental conflict/overwrite
export const RESERVED_SAP_STANDARD_TCODES: Record<string, string> = {
  VA01: 'Create Sales Order (SD)',
  VA02: 'Change Sales Order (SD)',
  VA03: 'Display Sales Order (SD)',
  VL01N: 'Create Outbound Delivery (LE)',
  VL02N: 'Change Outbound Delivery (LE)',
  VL03N: 'Display Outbound Delivery (LE)',
  VF01: 'Create Billing Document (SD)',
  VF02: 'Change Billing Document (SD)',
  VF03: 'Display Billing Document (SD)',
  MM01: 'Create Material Master (MM)',
  MM02: 'Change Material Master (MM)',
  MM03: 'Display Material Master (MM)',
  ME21N: 'Create Purchase Order (MM)',
  ME22N: 'Change Purchase Order (MM)',
  ME23N: 'Display Purchase Order (MM)',
  FB01: 'Post Financial Document (FI)',
  FB02: 'Change Financial Document (FI)',
  FB03: 'Display Financial Document (FI)',
  FS00: 'G/L Account Master Record (FI)',
  FS03: 'Display G/L Account (FI)',
  FBL1N: 'Vendor Line Items (FI-AP)',
  FBL3N: 'G/L Account Line Items (FI-GL)',
  FBL5N: 'Customer Line Items (FI-AR)',
  KS01: 'Create Cost Center (CO)',
  KS03: 'Display Cost Center (CO)',
  KAH1: 'Create Cost Element Group (CO)',
  KAH3: 'Display Cost Element Group (CO)',
  SE38: 'ABAP Editor (Basis)',
  SE80: 'Object Navigator (Basis)',
  SE11: 'ABAP Dictionary (Basis)',
  SE16: 'Data Browser (Basis)',
  SE16N: 'General Table Display (Basis)',
  SE24: 'Class Builder (Basis)',
  SE37: 'Function Builder (Basis)',
  SM30: 'Table View Maintenance (Basis)',
  SM50: 'Work Process Overview (Basis)',
  ST05: 'Performance Trace (Basis)',
  SPRO: 'Customizing: Implementation Guide (IMG)',
};

/**
 * Generates a compliant SAP customer T-Code based on the input
 */
export function suggestCustomerTCode(input: string, preferredPrefix: 'Z' | 'Y' = 'Z'): string {
  if (!input || !input.trim()) {
    return `${preferredPrefix}ALV01`;
  }

  // Clean invalid characters and uppercase
  let cleaned = input.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '');

  if (!cleaned) {
    return `${preferredPrefix}ALV01`;
  }

  // If it already starts with Z or Y, keep it
  if (cleaned.startsWith('Z') || cleaned.startsWith('Y')) {
    return cleaned.slice(0, 20);
  }

  // Otherwise prefix with Z (or Y)
  const candidate = `${preferredPrefix}${cleaned}`;
  return candidate.slice(0, 20);
}

/**
 * Validates a Transaction Code according to SAP corporate development standards
 */
export function validateSapTCode(tcode: string): SapTCodeValidationResult {
  const trimmed = (tcode || '').trim();
  const upper = trimmed.toUpperCase();

  // 1. Empty Check
  if (!trimmed) {
    return {
      isValid: false,
      severity: 'error',
      status: 'empty',
      ruleName: 'SAP_TCODE_MANDATORY',
      message: 'Transaction Code is required.',
      details: 'Every SAP dialog or report program requires a unique Transaction Code to be executed from the SAP Easy Access menu or command bar.',
      suggestedTCode: 'ZREP01',
    };
  }

  // 2. Length Check (Max 20 chars in SAP TSTC table)
  if (upper.length > 20) {
    return {
      isValid: false,
      severity: 'error',
      status: 'too_long',
      ruleName: 'SAP_TCODE_LENGTH_MAX',
      message: `Transaction Code length exceeds SAP 20-character limit (${upper.length}/20).`,
      details: 'The SAP table TSTC (Transaction Codes) defines the TCODE field as CHAR 20. Longer codes cannot be registered in SAP systems.',
      suggestedTCode: suggestCustomerTCode(upper.slice(0, 20)),
    };
  }

  // 3. Length Check (Min 2 chars)
  if (upper.length < 2) {
    return {
      isValid: false,
      severity: 'warning',
      status: 'too_short',
      ruleName: 'SAP_TCODE_LENGTH_MIN',
      message: 'Transaction Code should be at least 2 characters long.',
      details: 'SAP transaction codes typically consist of 4 to 20 characters representing module and function (e.g., ZSD01, ZRALV0010).',
      suggestedTCode: suggestCustomerTCode(upper),
    };
  }

  // 4. Character Set Check (Only A-Z, 0-9, and underscore)
  const validCharRegex = /^[A-Z0-9_]+$/;
  if (!validCharRegex.test(upper)) {
    return {
      isValid: false,
      severity: 'error',
      status: 'invalid_chars',
      ruleName: 'SAP_TCODE_CHARSET',
      message: 'Transaction Code contains invalid characters.',
      details: 'SAP Transaction Codes may only contain alphanumeric characters (A-Z, 0-9) and underscores (_). Spaces, hyphens, and special symbols are disallowed.',
      suggestedTCode: suggestCustomerTCode(upper),
    };
  }

  // 5. Reserved SAP Standard Transaction Check
  if (RESERVED_SAP_STANDARD_TCODES[upper]) {
    const desc = RESERVED_SAP_STANDARD_TCODES[upper];
    return {
      isValid: false,
      severity: 'error',
      status: 'reserved_sap_standard',
      ruleName: 'SAP_STANDARD_NAMESPACE_COLLISION',
      message: `'${upper}' is an existing SAP standard transaction (${desc}).`,
      details: `SAP standard transactions cannot be overridden for custom developments. Corporate ERP policy requires all custom programs and transactions to reside within the customer namespace (Z* or Y*).`,
      suggestedTCode: suggestCustomerTCode(upper),
    };
  }

  // 6. SAP Customer Namespace Prefix Check (Z... or Y...) - CORE USER REQUIREMENT
  const firstChar = upper.charAt(0);
  if (firstChar !== 'Z' && firstChar !== 'Y') {
    return {
      isValid: false,
      severity: 'warning',
      status: 'invalid_prefix',
      ruleName: 'SAP_CUSTOMER_NAMESPACE_VIOLATION',
      message: `Transaction Code '${upper}' deviates from standard SAP corporate conventions (must start with 'Z' or 'Y').`,
      details: `According to SAP governance and corporate standards, all custom development (CBO, reports, dialog transactions) must reside in the SAP customer namespace beginning with 'Z' or 'Y'. Standard namespace prefixes (A-X except Y, Z) are strictly reserved for SAP standard applications.`,
      suggestedTCode: suggestCustomerTCode(upper),
    };
  }

  // 7. Success - Fully Compliant with SAP Corporate Standards
  return {
    isValid: true,
    severity: 'success',
    status: 'valid',
    ruleName: 'SAP_CORPORATE_STANDARD_COMPLIANT',
    message: `Valid SAP customer Transaction Code (${firstChar}-namespace).`,
    details: `Conforms to SAP customer development namespace conventions and corporate governance guidelines.`,
  };
}

/**
 * Validates SAP Program ID (Must start with Z or Y, max 40 chars in TRDIR)
 */
export function validateSapProgramId(programId: string): SapTCodeValidationResult {
  const trimmed = (programId || '').trim();
  const upper = trimmed.toUpperCase();

  if (!trimmed) {
    return {
      isValid: false,
      severity: 'error',
      status: 'empty',
      ruleName: 'SAP_PROGRAM_MANDATORY',
      message: 'Program ID is required.',
      details: 'An ABAP report or module pool program requires a Program ID (TRDIR-NAME).',
      suggestedTCode: 'ZR_SALES_REPORT',
    };
  }

  if (upper.length > 40) {
    return {
      isValid: false,
      severity: 'error',
      status: 'too_long',
      ruleName: 'SAP_PROGRAM_LENGTH_MAX',
      message: `Program ID exceeds SAP limit of 40 characters (${upper.length}/40).`,
      details: 'ABAP repository program names in TRDIR are limited to CHAR 40.',
      suggestedTCode: suggestCustomerTCode(upper.slice(0, 40)),
    };
  }

  const validCharRegex = /^[A-Z0-9_]+$/;
  if (!validCharRegex.test(upper)) {
    return {
      isValid: false,
      severity: 'error',
      status: 'invalid_chars',
      ruleName: 'SAP_PROGRAM_CHARSET',
      message: 'Program ID contains invalid characters (only A-Z, 0-9, and _ allowed).',
      details: 'ABAP program names cannot contain spaces or special characters.',
      suggestedTCode: suggestCustomerTCode(upper),
    };
  }

  const firstChar = upper.charAt(0);
  if (firstChar !== 'Z' && firstChar !== 'Y') {
    return {
      isValid: false,
      severity: 'warning',
      status: 'invalid_prefix',
      ruleName: 'SAP_PROGRAM_CUSTOMER_NAMESPACE',
      message: `Program ID '${upper}' deviates from SAP standard (must start with 'Z' or 'Y').`,
      details: `Custom ABAP programs must start with 'Z' or 'Y' to prevent collisions with SAP standard programs during upgrades or support packages.`,
      suggestedTCode: suggestCustomerTCode(upper),
    };
  }

  return {
    isValid: true,
    severity: 'success',
    status: 'valid',
    ruleName: 'SAP_PROGRAM_COMPLIANT',
    message: `Valid SAP customer Program ID (${firstChar}-namespace).`,
    details: 'Conforms to SAP customer development naming standards.',
  };
}

// ============================================================================
// SAP ALV Field Catalog (LVC_T_FCAT) Real-Time Validation Layer
// ============================================================================

export const VALID_SAP_FIELD_TYPES: readonly SapDataType[] = [
  'CHAR',
  'NUMC',
  'DATS',
  'TIMS',
  'CURR',
  'DEC',
  'UNIT',
  'INT4',
  'STRING',
  'CUKY',
] as const;

export const VALID_SAP_FIELD_TYPE_SET = new Set<string>(VALID_SAP_FIELD_TYPES);

export function isValidSapFieldType(datatype: string | undefined | null): boolean {
  if (!datatype || typeof datatype !== 'string') return false;
  return VALID_SAP_FIELD_TYPE_SET.has(datatype.trim().toUpperCase());
}

export interface FieldCatalogRowValidation {
  invalidDatatype: boolean;
  datatypeMessage?: string;
  duplicateColPos: boolean;
  invalidColPos: boolean;
  colPosMessage?: string;
  duplicateFieldname: boolean;
  fieldnameMessage?: string;
  hasAnyIssue: boolean;
}

export interface FieldCatalogValidationIssue {
  rowIndex: number;
  fieldname: string;
  category: 'invalid_type' | 'duplicate_pos' | 'invalid_pos' | 'duplicate_fieldname';
  message: string;
}

export interface FieldCatalogValidationSummary {
  isValid: boolean;
  totalIssueCount: number;
  rowErrors: Record<number, FieldCatalogRowValidation>;
  issues: FieldCatalogValidationIssue[];
  invalidTypeRows: number[];
  duplicateColPosValues: number[];
  invalidColPosRows: number[];
  duplicateFieldnames: string[];
}

/**
 * Validates an ALV Field Catalog (LVC_T_FCAT) in real time:
 * - Checks for invalid or unrecognized SAP DDIC field types
 * - Checks for duplicate or invalid (<= 0 / missing) column positions (COL_POS)
 * - Checks for duplicate technical fieldnames
 */
export function validateFieldCatalog(fields: AlvField[]): FieldCatalogValidationSummary {
  const rowErrors: Record<number, FieldCatalogRowValidation> = {};
  const issues: FieldCatalogValidationIssue[] = [];
  const invalidTypeRows: number[] = [];
  const invalidColPosRows: number[] = [];

  // Track col_pos occurrences -> row indices
  const posOccurrences = new Map<number, number[]>();
  // Track fieldname occurrences -> row indices
  const nameOccurrences = new Map<string, number[]>();

  fields.forEach((field, idx) => {
    const pos = field.col_pos;
    if (typeof pos === 'number' && Number.isInteger(pos) && pos >= 1) {
      const list = posOccurrences.get(pos) || [];
      list.push(idx);
      posOccurrences.set(pos, list);
    }

    const name = (field.fieldname || '').trim().toUpperCase();
    if (name) {
      const list = nameOccurrences.get(name) || [];
      list.push(idx);
      nameOccurrences.set(name, list);
    }
  });

  const duplicateColPosValues: number[] = [];
  posOccurrences.forEach((indices, pos) => {
    if (indices.length > 1) {
      duplicateColPosValues.push(pos);
    }
  });
  duplicateColPosValues.sort((a, b) => a - b);

  const duplicateFieldnames: string[] = [];
  nameOccurrences.forEach((indices, name) => {
    if (indices.length > 1) {
      duplicateFieldnames.push(name);
    }
  });

  fields.forEach((field, idx) => {
    const displayFieldname = field.fieldname?.trim() || `Row ${idx + 1}`;
    const rawType = (field.datatype ?? '').toString().trim().toUpperCase();
    const invalidDatatype = !isValidSapFieldType(rawType);

    let datatypeMessage: string | undefined;
    if (invalidDatatype) {
      invalidTypeRows.push(idx);
      datatypeMessage = rawType
        ? `Invalid SAP field type '${rawType}'. Valid types: ${VALID_SAP_FIELD_TYPES.join(', ')}.`
        : `SAP field type is required. Valid types: ${VALID_SAP_FIELD_TYPES.join(', ')}.`;
      issues.push({
        rowIndex: idx,
        fieldname: displayFieldname,
        category: 'invalid_type',
        message: `Row ${idx + 1} (${displayFieldname}): ${datatypeMessage}`,
      });
    }

    const pos = field.col_pos;
    const invalidColPos = typeof pos !== 'number' || isNaN(pos) || !Number.isInteger(pos) || pos < 1;
    const posConflictingRows = !invalidColPos ? (posOccurrences.get(pos) || []) : [];
    const duplicateColPos = !invalidColPos && posConflictingRows.length > 1;

    let colPosMessage: string | undefined;
    if (invalidColPos) {
      invalidColPosRows.push(idx);
      colPosMessage = 'Column position (COL_POS) must be a positive integer >= 1.';
      issues.push({
        rowIndex: idx,
        fieldname: displayFieldname,
        category: 'invalid_pos',
        message: `Row ${idx + 1} (${displayFieldname}): ${colPosMessage}`,
      });
    } else if (duplicateColPos) {
      const otherRowLabels = posConflictingRows
        .filter((r) => r !== idx)
        .map((r) => `#${r + 1} (${fields[r]?.fieldname?.trim() || 'unnamed'})`)
        .join(', ');
      colPosMessage = `Duplicate column position (COL_POS = ${pos}) conflicts with row ${otherRowLabels}.`;
      issues.push({
        rowIndex: idx,
        fieldname: displayFieldname,
        category: 'duplicate_pos',
        message: `Row ${idx + 1} (${displayFieldname}): ${colPosMessage}`,
      });
    }

    const upperName = (field.fieldname || '').trim().toUpperCase();
    const nameConflictingRows = upperName ? (nameOccurrences.get(upperName) || []) : [];
    const duplicateFieldname = nameConflictingRows.length > 1;
    let fieldnameMessage: string | undefined;
    if (duplicateFieldname) {
      const otherRows = nameConflictingRows
        .filter((r) => r !== idx)
        .map((r) => `#${r + 1}`)
        .join(', ');
      fieldnameMessage = `Duplicate fieldname '${upperName}' (also in row ${otherRows}).`;
      issues.push({
        rowIndex: idx,
        fieldname: displayFieldname,
        category: 'duplicate_fieldname',
        message: `Row ${idx + 1} (${upperName}): ${fieldnameMessage}`,
      });
    }

    rowErrors[idx] = {
      invalidDatatype,
      datatypeMessage,
      duplicateColPos,
      invalidColPos,
      colPosMessage,
      duplicateFieldname,
      fieldnameMessage,
      hasAnyIssue: invalidDatatype || duplicateColPos || invalidColPos || duplicateFieldname,
    };
  });

  return {
    isValid: issues.length === 0,
    totalIssueCount: issues.length,
    rowErrors,
    issues,
    invalidTypeRows,
    duplicateColPosValues,
    invalidColPosRows,
    duplicateFieldnames,
  };
}
