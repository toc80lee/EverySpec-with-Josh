import React from 'react';

/**
 * ABAP Keywords and syntax highlighting categories matching SAP GUI ABAP Editor (SE38/SE80)
 */
const ABAP_KEYWORDS = new Set([
  'REPORT', 'PROGRAM', 'FUNCTION-POOL', 'TYPE-POOL', 'CLASS-POOL',
  'INCLUDE', 'TABLES', 'TYPES', 'DATA', 'CONSTANTS', 'STATICS', 'FIELD-SYMBOLS',
  'PARAMETERS', 'SELECT-OPTIONS', 'SELECTION-SCREEN',
  'INITIALIZATION', 'AT', 'START-OF-SELECTION', 'END-OF-SELECTION',
  'TOP-OF-PAGE', 'END-OF-PAGE',
  'PERFORM', 'FORM', 'ENDFORM',
  'MODULE', 'ENDMODULE',
  'FUNCTION', 'ENDFUNCTION',
  'METHOD', 'ENDMETHOD', 'CLASS', 'ENDCLASS', 'INTERFACE', 'ENDINTERFACE',
  'SELECT', 'ENDSELECT', 'FROM', 'WHERE', 'INTO', 'CORRESPONDING', 'FIELDS',
  'TABLE', 'OF', 'INNER', 'LEFT', 'OUTER', 'JOIN', 'ON', 'ORDER', 'BY', 'GROUP',
  'UP', 'TO', 'ROWS', 'PACKAGE', 'SIZE', 'APPEND', 'INSERT', 'MODIFY', 'DELETE',
  'READ', 'CLEAR', 'REFRESH', 'FREE', 'SORT', 'DESCENDING', 'ASCENDING',
  'IF', 'ELSE', 'ELSEIF', 'ENDIF',
  'CASE', 'WHEN', 'ENDCASE',
  'DO', 'ENDDO', 'WHILE', 'ENDWHILE', 'LOOP', 'ENDLOOP', 'ASSIGN', 'UNASSIGN',
  'CHECK', 'EXIT', 'CONTINUE', 'RETURN', 'LEAVE', 'STOP',
  'CALL', 'FUNCTION', 'METHOD', 'SCREEN', 'TRANSACTION',
  'CREATE', 'OBJECT', 'SET', 'GET', 'HANDLER',
  'EXPORTING', 'IMPORTING', 'CHANGING', 'TABLES', 'EXCEPTIONS', 'RECEIVING',
  'RAISE', 'MESSAGE', 'RAISING', 'TRY', 'CATCH', 'CLEANUP', 'ENDTRY',
  'TYPE', 'LIKE', 'REF', 'LINE', 'STRUCTURE', 'BEGIN', 'END', 'VALUE',
  'LENGTH', 'DECIMALS', 'DEFINITION', 'IMPLEMENTATION', 'PUBLIC', 'PROTECTED', 'PRIVATE',
  'DEFERRED', 'FINAL', 'ABSTRACT', 'FOR', 'EVENT', 'OF', 'EVENTS',
  'WITH', 'KEY', 'DEFAULT', 'HEADER', 'NOT', 'AND', 'OR', 'EQ', 'NE', 'LT', 'LE', 'GT', 'GE',
  'IN', 'BETWEEN', 'IS', 'INITIAL', 'BOUND', 'ASSIGNED', 'REQUESTED',
]);

const SAP_TYPES = new Set([
  'c', 'n', 'i', 'p', 'f', 'd', 't', 'x', 'string', 'xstring',
  'numc3', 'numc4', 'numc10', 'dats', 'tims', 'char1', 'char2', 'char4', 'char10', 'char20', 'char30', 'char40',
  'sy-ucomm', 'sy-subrc', 'sy-tabix', 'sy-datum', 'sy-uzeit', 'sy-title', 'sy-repid',
  'icon-id', 'txt40', 'cl_gui_docking_container', 'cl_gui_alv_grid', 'cl_gui_custom_container',
]);

/**
 * Tokenizes and renders a single line with SAP GUI style syntax highlighting on light background
 */
export const HighlightedAbapLine: React.FC<{ line: string }> = ({ line }) => {
  const trimmed = line.trim();

  // Full-line Comment (starts with * in column 1, or begins with ")
  if (line.startsWith('*') || trimmed.startsWith('"')) {
    return <span className="text-[#2e7d32] italic font-mono">{line}</span>;
  }

  // Handle inline comments
  const quoteIdx = line.indexOf('"');
  let codePart = line;
  let commentPart = '';
  if (quoteIdx !== -1) {
    codePart = line.substring(0, quoteIdx);
    commentPart = line.substring(quoteIdx);
  }

  // Tokenize codePart preserving whitespace
  const tokens = codePart.split(/(\s+|[.,:()~+\-*\/=><])/);

  return (
    <span className="font-mono">
      {tokens.map((token, i) => {
        if (!token) return null;
        if (/^\s+$/.test(token)) {
          return <span key={i}>{token}</span>;
        }

        const upper = token.toUpperCase();
        const lower = token.toLowerCase();

        // 1. ABAP Major Keywords (Blue / Deep Navy bold)
        if (ABAP_KEYWORDS.has(upper)) {
          return (
            <span key={i} className="text-[#0000cc] font-bold">
              {token}
            </span>
          );
        }

        // 2. Types & Standard structures (Deep Teal / Violet)
        if (SAP_TYPES.has(lower) || lower.startsWith('zgco2') || lower.startsWith('zcozs') || lower.startsWith('csks') || lower.startsWith('t001')) {
          return (
            <span key={i} className="text-[#008080] font-semibold">
              {token}
            </span>
          );
        }

        // 3. String literals ('...')
        if (token.startsWith("'") || token.endsWith("'")) {
          return (
            <span key={i} className="text-[#b71c1c]">
              {token}
            </span>
          );
        }

        // 4. Numbers
        if (/^\d+$/.test(token)) {
          return (
            <span key={i} className="text-[#e65100]">
              {token}
            </span>
          );
        }

        // 5. Variables starting with gv_, gs_, gt_, go_, gc_, p_, s_ (Burgundy / Purple)
        if (/^(gv_|gs_|gt_|go_|gc_|p_|s_|lv_|ls_|lt_|lo_|lc_)/i.test(token)) {
          return (
            <span key={i} className="text-[#5c2d91] font-medium">
              {token}
            </span>
          );
        }

        // Default code text: Crisp dark charcoal
        return (
          <span key={i} className="text-[#1e293b]">
            {token}
          </span>
        );
      })}

      {commentPart && (
        <span className="text-[#2e7d32] italic">{commentPart}</span>
      )}
    </span>
  );
};
