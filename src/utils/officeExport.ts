import * as XLSX from 'xlsx';
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import { AlvField, ProgramSpec } from '../types/sap';
import { getEffectiveDataFlow } from '../components/MermaidFlowChartSvg';

function triggerBlobDownload(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function sanitizeFilename(name: string): string {
  return (name || 'SAP_SPEC')
    .trim()
    .replace(/[^a-zA-Z0-9가-힣_-]/g, '_')
    .replace(/_+/g, '_');
}

function sanitizeSheetName(name: string): string {
  return name.replace(/[\\/?*[\]:]/g, '_').slice(0, 31);
}

function computeColWidths(rows: unknown[][], minWidth = 10, maxWidth = 54): { wch: number }[] {
  const colCount = rows.reduce((max, r) => Math.max(max, r.length), 0);
  const widths: number[] = Array(colCount).fill(minWidth);

  for (const row of rows) {
    row.forEach((cell, idx) => {
      const text = cell === null || cell === undefined ? '' : String(cell);
      const lines = text.split('\n');
      for (const line of lines) {
        // Approximate display width (East Asian chars count as ~1.8)
        let len = 0;
        for (const ch of line) {
          len += ch.charCodeAt(0) > 255 ? 1.85 : 1;
        }
        const padded = Math.ceil(len) + 3;
        if (padded > widths[idx]) {
          widths[idx] = Math.min(maxWidth, padded);
        }
      }
    });
  }

  return widths.map((wch) => ({ wch }));
}

function appendAoaSheet(wb: XLSX.WorkBook, sheetName: string, rows: unknown[][]) {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = computeColWidths(rows);
  XLSX.utils.book_append_sheet(wb, ws, sanitizeSheetName(sheetName));
}

function buildFieldCatalogRows(fields: AlvField[]): unknown[][] {
  const header = [
    'COL_POS',
    'FIELDNAME',
    'COLTEXT',
    'SCRTEXT_S',
    'SCRTEXT_M',
    'SCRTEXT_L',
    'DATATYPE',
    'OUTPUTLEN',
    'DECIMALS',
    'JUST',
    'KEY',
    'HOTSPOT',
    'CHECKBOX',
    'EDIT',
    'DO_SUM',
    'EMPHASIZE',
    'CFIELDNAME',
    'QFIELDNAME',
    'REF_TABLE',
    'REF_FIELD',
    'DRILLDOWN_TCODE',
  ];

  const data = fields.map((f) => [
    f.col_pos,
    f.fieldname,
    f.coltext,
    f.scrtext_s || '',
    f.scrtext_m || '',
    f.scrtext_l || '',
    f.datatype,
    f.outputlen,
    f.decimals ?? '',
    f.just,
    f.key ? 'X' : '',
    f.hotspot ? 'X' : '',
    f.checkbox ? 'X' : '',
    f.edit ? 'X' : '',
    f.do_sum ? 'X' : '',
    f.emphasize || '',
    f.cfieldname || '',
    f.qfieldname || '',
    f.ref_table || '',
    f.ref_field || '',
    f.drilldown_tcode || '',
  ]);

  return [header, ...data];
}

/**
 * Export multi-sheet Microsoft Excel (.xlsx) workbook covering the complete SAP functional specification.
 */
export function exportSpecificationXlsx(spec: ProgramSpec): string {
  const wb = XLSX.utils.book_new();
  const effectiveFlow = getEffectiveDataFlow(spec);

  // 1. Overview Sheet
  const overviewRows: unknown[][] = [
    ['SAP FUNCTIONAL SPECIFICATION SUMMARY'],
    ['Generated At', new Date().toISOString().slice(0, 19).replace('T', ' ')],
    [],
    ['1. DOCUMENT & PROGRAM METADATA', 'VALUE'],
    ['Project', spec.project_code || 'TEMP'],
    ['Program ID', spec.program_id],
    ['Program Title', spec.title],
    ['Transaction Code (T-Code)', spec.tcode],
    ['SAP Module', spec.module],
    ['Program Type', spec.program_type === 'REPORT' ? 'ALV Report (CL_GUI_ALV_GRID)' : 'Dialog / Transaction'],
    ['Author', spec.author],
    ['Created Date', spec.created_date],
    ['Target SAP Release', spec.target_sap_release],
    ['CDS View / Main Table', spec.cds_view_table || '-'],
    [],
    ['2. ALV LAYOUT SETTINGS (LVC_S_LAYO)', 'VALUE'],
    ['GRID_TITLE', spec.layout.grid_title || spec.title],
    ['ZEBRA (Striped Rows)', spec.layout.zebra ? 'X' : ''],
    ['CWIDTH_OPT (Optimize Column Width)', spec.layout.cwidth_opt ? 'X' : ''],
    ['SEL_MODE (Selection Mode)', spec.layout.sel_mode],
    ['SGL_CLK_HD (Single Click Sort)', spec.layout.sgl_clk_hd ? 'X' : ''],
    ['NO_TOOLBAR', spec.layout.no_toolbar ? 'X' : ''],
    ['NO_HEADERS', spec.layout.no_headers ? 'X' : ''],
    ['EXCP_FNAME (Traffic Light Field)', spec.layout.excp_fname || 'LIGHTS'],
    ['INFO_FNAME (Row Color Field)', spec.layout.info_fname || ''],
    ['CTAB_FNAME (Cell Color Table)', spec.layout.ctab_fname || ''],
    ['STYLEFNAME (Cell Style Table)', spec.layout.stylefname || ''],
    [],
    ['3. BUSINESS PURPOSE & SCOPE'],
    [spec.business_purpose || '-'],
    [],
    ['4. DATA EXTRACTION & PROCESSING LOGIC'],
    [spec.data_extraction_logic || '-'],
  ];

  if (spec.change_history && spec.change_history.length > 0) {
    overviewRows.push([]);
    overviewRows.push(['5. REVISION HISTORY', 'DATE', 'AUTHOR', 'COMMENT']);
    spec.change_history.forEach((h) => {
      overviewRows.push([h.version, h.changed_at, h.author, h.comment]);
    });
  }
  appendAoaSheet(wb, 'Overview', overviewRows);

  // 2. Selection Screen Sheet
  const selRows: unknown[][] = [
    [
      'SEQ',
      'BLOCK_ID',
      'BLOCK_TITLE',
      'KIND',
      'NAME',
      'SCREEN_TEXT',
      'RADIO_GROUP',
      'DATATYPE',
      'LENGTH',
      'REF_TABLE',
      'REF_FIELD',
      'OBLIGATORY',
      'DEFAULT_VAL',
      'MEMORY_ID',
    ],
    ...spec.selection_params.map((p, idx) => [
      idx + 1,
      p.block_id || '',
      p.block_title || '',
      p.kind,
      p.name,
      p.text,
      p.radio_group || '',
      p.datatype,
      p.length,
      p.ref_table || '',
      p.ref_field || '',
      p.obligatory ? 'X' : '',
      p.default_val || '',
      p.memory_id || '',
    ]),
  ];
  appendAoaSheet(wb, 'Selection Screen', selRows);

  // 3. Field Catalog Sheet (Header / Main Grid)
  appendAoaSheet(wb, 'Field Catalog', buildFieldCatalogRows(spec.field_catalog));

  // Optional Item Field Catalog for Master-Detail specs
  if (spec.item_grid && spec.item_grid.field_catalog.length > 0) {
    appendAoaSheet(wb, 'Item Field Catalog', buildFieldCatalogRows(spec.item_grid.field_catalog));
  }

  // 4. Sort & Toolbar Sheet
  const sortToolbarRows: unknown[][] = [
    ['PART A: ALV SORT & SUBTOTAL RULES (LVC_T_SORT)'],
    ['SPOS', 'FIELDNAME', 'UP (ASC)', 'DOWN (DESC)', 'SUBTOT', 'GROUP', 'EXPA'],
  ];
  const explicitSorts =
    spec.sort_fields && spec.sort_fields.length > 0
      ? spec.sort_fields
      : spec.field_catalog
          .filter((f) => f.sort_enable || f.sort_up || f.sort_down || f.subtot || f.subtotal)
          .map((f, idx) => ({
            fieldname: f.fieldname,
            spos: f.spos || idx + 1,
            up: f.sort_up ?? true,
            down: f.sort_down ?? false,
            subtot: f.subtot || f.subtotal || false,
            group: f.group || '',
            expa: f.expa ?? false,
          }));

  if (explicitSorts.length > 0) {
    explicitSorts.forEach((s) => {
      sortToolbarRows.push([
        s.spos,
        s.fieldname,
        s.up ? 'X' : '',
        s.down ? 'X' : '',
        s.subtot ? 'X' : '',
        s.group === true ? '*' : s.group || '',
        s.expa ? 'X' : '',
      ]);
    });
  } else {
    sortToolbarRows.push(['-', 'No predefined sort fields', '', '', '', '', '']);
  }

  sortToolbarRows.push([]);
  sortToolbarRows.push(['PART B: ALV TOOLBAR BUTTONS']);
  sortToolbarRows.push(['TYPE', 'FUNCTION', 'TEXT', 'QUICKINFO', 'ICON', 'VISIBLE', 'DISABLED']);

  const combinedButtons = [
    ...(spec.toolbar_buttons || []),
    ...(spec.custom_toolbar || []).filter(
      (cb) => !(spec.toolbar_buttons || []).some((tb) => tb.function === cb.function)
    ),
  ];

  if (combinedButtons.length > 0) {
    combinedButtons.forEach((b) => {
      sortToolbarRows.push([
        b.is_standard ? 'STANDARD' : 'CUSTOM',
        b.function,
        b.text,
        b.quickinfo,
        b.icon,
        b.visible === false ? '' : 'X',
        b.disabled ? 'X' : '',
      ]);
    });
  } else {
    sortToolbarRows.push(['STANDARD', '-', 'Default ALV Toolbar', '', '', 'X', '']);
  }
  appendAoaSheet(wb, 'Sort & Toolbar', sortToolbarRows);

  // 5. Data Flow Sheet
  const flowRows: unknown[][] = [
    ['NODE_ID', 'STEP / LABEL', 'DETAILED TECHNICAL SPECIFICATION'],
  ];
  const nodeDetailEntries = Object.entries(effectiveFlow.nodeDetails || {});
  if (nodeDetailEntries.length > 0) {
    nodeDetailEntries.forEach(([id, detail]) => {
      flowRows.push([id, detail.label || id, detail.markdown || '']);
    });
  } else if (spec.data_flow?.steps && spec.data_flow.steps.length > 0) {
    spec.data_flow.steps.forEach((step) => {
      flowRows.push([step.step_no, step.label, step.description || '']);
    });
  } else {
    flowRows.push(['FLOW', 'Mermaid Flowchart', effectiveFlow.mermaidCode || '']);
  }
  flowRows.push([]);
  flowRows.push(['MERMAID DIAGRAM SOURCE']);
  flowRows.push([effectiveFlow.mermaidCode || '']);
  appendAoaSheet(wb, 'Data Flow', flowRows);

  // 6. Test Cases Sheet
  const tcRows: unknown[][] = [
    ['NO', 'SCENARIO', 'INPUT CONDITION', 'EXPECTED RESULT'],
    ...(spec.test_cases.length > 0
      ? spec.test_cases.map((tc, idx) => [idx + 1, tc.scenario, tc.condition, tc.expected])
      : [[1, 'Standard Execution Test', 'Default selection parameters', 'ALV Grid displays expected records']]),
  ];
  appendAoaSheet(wb, 'Test Cases', tcRows);

  // 7. Mock Data Sheet
  const mockHeaders = spec.field_catalog.map((f) => f.fieldname);
  const mockSubHeaders = spec.field_catalog.map((f) => f.coltext);
  const mockRows: unknown[][] = [
    mockHeaders,
    mockSubHeaders,
    ...(spec.mock_rows || []).map((row) => mockHeaders.map((fn) => row[fn] ?? '')),
  ];
  appendAoaSheet(wb, 'Mock Data', mockRows);

  if (spec.item_grid && spec.item_grid.field_catalog.length > 0) {
    const itemHeaders = spec.item_grid.field_catalog.map((f) => f.fieldname);
    const itemSubHeaders = spec.item_grid.field_catalog.map((f) => f.coltext);
    const itemMockRows: unknown[][] = [
      itemHeaders,
      itemSubHeaders,
      ...(spec.item_grid.mock_rows || []).map((row) => itemHeaders.map((fn) => row[fn] ?? '')),
    ];
    appendAoaSheet(wb, 'Item Mock Data', itemMockRows);
  }

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const filename = `${sanitizeFilename(spec.program_id)}_SPECIFICATION.xlsx`;
  triggerBlobDownload(filename, blob);
  return filename;
}

// =============================================================================
// DOCX (MICROSOFT WORD) GENERATOR HELPERS
// =============================================================================

const SAP_NAVY = '1E3A8A';
const SAP_BLUE_LIGHT = 'EFF6FF';
const SLATE_BORDER = 'CBD5E1';
const SLATE_BG = 'F8FAFC';

const DEFAULT_CELL_BORDERS = {
  top: { style: BorderStyle.SINGLE, size: 4, color: SLATE_BORDER },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: SLATE_BORDER },
  left: { style: BorderStyle.SINGLE, size: 4, color: SLATE_BORDER },
  right: { style: BorderStyle.SINGLE, size: 4, color: SLATE_BORDER },
};

function parseInlineRuns(text: string, baseSize = 20): TextRun[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/);
  return parts
    .filter((p) => p.length > 0)
    .map((part) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return new TextRun({
          text: part.slice(2, -2),
          bold: true,
          size: baseSize,
          font: 'Malgun Gothic',
        });
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return new TextRun({
          text: part.slice(1, -1),
          font: 'Consolas',
          size: baseSize - 1,
          color: '1E40AF',
        });
      }
      return new TextRun({
        text: part,
        size: baseSize,
        font: 'Malgun Gothic',
      });
    });
}

function markdownToDocxParagraphs(markdown: string): Paragraph[] {
  if (!markdown || !markdown.trim()) {
    return [
      new Paragraph({
        children: [new TextRun({ text: '-', color: '64748B', size: 20, font: 'Malgun Gothic' })],
      }),
    ];
  }

  const lines = markdown.split('\n');
  const paragraphs: Paragraph[] = [];
  let inCodeBlock = false;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    if (trimmed.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }

    if (inCodeBlock) {
      paragraphs.push(
        new Paragraph({
          spacing: { before: 20, after: 20 },
          shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'F1F5F9' },
          children: [
            new TextRun({
              text: rawLine || ' ',
              font: 'Consolas',
              size: 18,
              color: '0F172A',
            }),
          ],
        })
      );
      continue;
    }

    if (!trimmed) {
      paragraphs.push(new Paragraph({ spacing: { before: 40, after: 40 }, children: [] }));
      continue;
    }

    if (trimmed.startsWith('# ')) {
      paragraphs.push(
        new Paragraph({
          spacing: { before: 140, after: 60 },
          children: [
            new TextRun({
              text: trimmed.slice(2),
              bold: true,
              size: 24,
              color: SAP_NAVY,
              font: 'Malgun Gothic',
            }),
          ],
        })
      );
    } else if (trimmed.startsWith('## ')) {
      paragraphs.push(
        new Paragraph({
          spacing: { before: 120, after: 40 },
          children: [
            new TextRun({
              text: trimmed.slice(3),
              bold: true,
              size: 22,
              color: '1D4ED8',
              font: 'Malgun Gothic',
            }),
          ],
        })
      );
    } else if (trimmed.startsWith('### ') || trimmed.startsWith('#### ')) {
      const content = trimmed.replace(/^#{3,4}\s+/, '');
      paragraphs.push(
        new Paragraph({
          spacing: { before: 80, after: 30 },
          children: [
            new TextRun({
              text: content,
              bold: true,
              size: 20,
              color: '0F172A',
              font: 'Malgun Gothic',
            }),
          ],
        })
      );
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      paragraphs.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { before: 30, after: 30 },
          children: parseInlineRuns(trimmed.slice(2)),
        })
      );
    } else if (/^\d+\.\s/.test(trimmed)) {
      paragraphs.push(
        new Paragraph({
          indent: { left: 320 },
          spacing: { before: 30, after: 30 },
          children: parseInlineRuns(trimmed),
        })
      );
    } else if (trimmed.startsWith('> ')) {
      paragraphs.push(
        new Paragraph({
          indent: { left: 240 },
          shading: { type: ShadingType.CLEAR, color: 'auto', fill: SAP_BLUE_LIGHT },
          spacing: { before: 40, after: 40 },
          children: parseInlineRuns(trimmed.slice(2)),
        })
      );
    } else {
      paragraphs.push(
        new Paragraph({
          spacing: { before: 30, after: 40 },
          children: parseInlineRuns(rawLine),
        })
      );
    }
  }

  return paragraphs;
}

function makeSectionHeading(title: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 260, after: 100 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 8, color: SAP_NAVY },
    },
    children: [
      new TextRun({
        text: title,
        bold: true,
        size: 24,
        color: SAP_NAVY,
        font: 'Malgun Gothic',
      }),
    ],
  });
}

function makeStyledTable(
  headers: string[],
  rows: (string | number | undefined)[][],
  columnPercents?: number[]
): Table {
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((h, idx) =>
      new TableCell({
        width: columnPercents
          ? { size: columnPercents[idx], type: WidthType.PERCENTAGE }
          : undefined,
        shading: { type: ShadingType.CLEAR, color: 'auto', fill: SAP_NAVY },
        borders: DEFAULT_CELL_BORDERS,
        margins: { top: 80, bottom: 80, left: 90, right: 90 },
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: h,
                bold: true,
                color: 'FFFFFF',
                size: 18,
                font: 'Malgun Gothic',
              }),
            ],
          }),
        ],
      })
    ),
  });

  const bodyRows = rows.map((r, rIdx) =>
    new TableRow({
      children: r.map((cell, cIdx) =>
        new TableCell({
          width: columnPercents
            ? { size: columnPercents[cIdx], type: WidthType.PERCENTAGE }
            : undefined,
          shading:
            rIdx % 2 === 1
              ? { type: ShadingType.CLEAR, color: 'auto', fill: SLATE_BG }
              : undefined,
          borders: DEFAULT_CELL_BORDERS,
          margins: { top: 60, bottom: 60, left: 90, right: 90 },
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: cell === undefined || cell === null || cell === '' ? '-' : String(cell),
                  size: 18,
                  color: '0F172A',
                  font: 'Malgun Gothic',
                }),
              ],
            }),
          ],
        })
      ),
    })
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...bodyRows],
  });
}

function makeKeyValueTable(pairs: [string, string][]): Table {
  const rows: TableRow[] = [];
  for (let i = 0; i < pairs.length; i += 2) {
    const [k1, v1] = pairs[i];
    const second = pairs[i + 1];
    rows.push(
      new TableRow({
        children: [
          new TableCell({
            width: { size: 20, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.CLEAR, color: 'auto', fill: SAP_BLUE_LIGHT },
            borders: DEFAULT_CELL_BORDERS,
            margins: { top: 70, bottom: 70, left: 100, right: 100 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: k1, bold: true, size: 18, color: SAP_NAVY, font: 'Malgun Gothic' }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            borders: DEFAULT_CELL_BORDERS,
            margins: { top: 70, bottom: 70, left: 100, right: 100 },
            children: [
              new Paragraph({
                children: [new TextRun({ text: v1 || '-', size: 18, font: 'Malgun Gothic' })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 20, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.CLEAR, color: 'auto', fill: SAP_BLUE_LIGHT },
            borders: DEFAULT_CELL_BORDERS,
            margins: { top: 70, bottom: 70, left: 100, right: 100 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: second ? second[0] : '',
                    bold: true,
                    size: 18,
                    color: SAP_NAVY,
                    font: 'Malgun Gothic',
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            borders: DEFAULT_CELL_BORDERS,
            margins: { top: 70, bottom: 70, left: 100, right: 100 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: second ? second[1] || '-' : '', size: 18, font: 'Malgun Gothic' }),
                ],
              }),
            ],
          }),
        ],
      })
    );
  }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows,
  });
}

/**
 * Export formatted Microsoft Word (.docx) SAP Functional Specification document.
 */
export async function exportSpecificationDocx(spec: ProgramSpec): Promise<string> {
  const effectiveFlow = getEffectiveDataFlow(spec);
  const children: (Paragraph | Table)[] = [];

  // Title Block
  children.push(
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { before: 40, after: 40 },
      children: [
        new TextRun({
          text: `SAP FUNCTIONAL SPECIFICATION  |  FDD-${spec.module}-${spec.program_id}`,
          bold: true,
          size: 18,
          color: '2563EB',
          font: 'Malgun Gothic',
        }),
      ],
    }),
    new Paragraph({
      spacing: { before: 20, after: 80 },
      children: [
        new TextRun({
          text: `${spec.title} (${spec.program_id})`,
          bold: true,
          size: 32,
          color: '0F172A',
          font: 'Malgun Gothic',
        }),
      ],
    }),
    new Paragraph({
      spacing: { before: 0, after: 200 },
      children: [
        new TextRun({
          text: `Module: ${spec.module}   •   T-Code: ${spec.tcode || '-'}   •   Target Release: ${spec.target_sap_release}   •   Author: ${spec.author}`,
          size: 19,
          color: '475569',
          font: 'Malgun Gothic',
        }),
      ],
    })
  );

  // 1. Document Control & Program Overview
  children.push(makeSectionHeading('1. Document Control & Program Metadata'));
  children.push(
    makeKeyValueTable([
      ['Project', spec.project_code || 'TEMP'],
      ['Program ID', spec.program_id],
      ['T-Code', spec.tcode],
      ['Program Title', spec.title],
      ['SAP Module', spec.module],
      ['Program Type', spec.program_type === 'REPORT' ? 'ALV Report (CL_GUI_ALV_GRID)' : 'Dialog / Transaction'],
      ['Target Release', spec.target_sap_release],
      ['Author', spec.author],
      ['Created Date', spec.created_date],
      ['CDS / Main Table', spec.cds_view_table || '-'],
    ])
  );

  // 2. Business Purpose & Scope
  children.push(makeSectionHeading('2. Business Purpose & Scope'));
  children.push(...markdownToDocxParagraphs(spec.business_purpose));

  // 3. Selection Screen Specification
  children.push(makeSectionHeading('3. Selection Screen Specification (Screen 1000)'));
  if (spec.selection_params.length > 0) {
    children.push(
      makeStyledTable(
        ['Block', 'Kind', 'Field Name', 'Label / Description', 'Ref / Radio Grp', 'Type(Len)', 'Req', 'Default'],
        spec.selection_params.map((p) => [
          p.block_title || '-',
          p.kind === 'SELECT_OPTION'
            ? 'S-OPT'
            : p.kind === 'RADIOBUTTON'
            ? 'RADIO'
            : p.kind === 'CHECKBOX'
            ? 'CHK'
            : 'PARAM',
          p.name,
          p.text,
          p.kind === 'RADIOBUTTON' && p.radio_group
            ? `GROUP ${p.radio_group}`
            : p.ref_table
            ? `${p.ref_table}-${p.ref_field || ''}`
            : '-',
          `${p.datatype}(${p.length})`,
          p.obligatory ? 'Y' : 'N',
          p.default_val || '-',
        ]),
        [12, 9, 14, 22, 15, 11, 6, 11]
      )
    );
  } else {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: 'No custom selection screen parameters defined.', size: 19, color: '64748B' })],
      })
    );
  }

  // 4. ALV Layout & Field Catalog
  children.push(makeSectionHeading('4. ALV Grid Layout & Field Catalog (LVC_T_FCAT)'));
  children.push(
    makeKeyValueTable([
      ['Grid Title', spec.layout.grid_title || spec.title],
      ['Zebra / CWidth Opt', `${spec.layout.zebra ? 'ZEBRA=X' : 'ZEBRA= '} / ${spec.layout.cwidth_opt ? 'CWIDTH_OPT=X' : 'CWIDTH_OPT= '}`],
      ['Selection Mode', spec.layout.sel_mode],
      ['Exception Field', spec.layout.excp_fname || 'LIGHTS'],
    ]),
    new Paragraph({ spacing: { before: 100, after: 40 }, children: [] })
  );

  children.push(
    makeStyledTable(
      ['No', 'Fieldname', 'Column Text', 'Type(Len)', 'Just', 'Flags (K/H/E/S)', 'Ref Table-Field', 'Drilldown'],
      spec.field_catalog.map((f) => {
        const flags = [
          f.key ? 'KEY' : '',
          f.hotspot ? 'HOT' : '',
          f.checkbox ? 'CHK' : '',
          f.edit ? 'EDIT' : '',
          f.do_sum ? 'SUM' : '',
        ]
          .filter(Boolean)
          .join(', ');
        return [
          f.col_pos,
          f.fieldname,
          f.coltext,
          `${f.datatype}(${f.outputlen})`,
          f.just,
          flags || '-',
          f.ref_table ? `${f.ref_table}-${f.ref_field || ''}` : '-',
          f.drilldown_tcode || '-',
        ];
      }),
      [6, 15, 22, 11, 6, 15, 16, 9]
    )
  );

  if (spec.item_grid && spec.item_grid.field_catalog.length > 0) {
    children.push(
      new Paragraph({
        spacing: { before: 160, after: 60 },
        children: [
          new TextRun({
            text: `4.1 Item ALV Grid Field Catalog (${spec.item_grid.grid_name || 'Item Grid'})`,
            bold: true,
            size: 21,
            color: SAP_NAVY,
            font: 'Malgun Gothic',
          }),
        ],
      }),
      makeStyledTable(
        ['No', 'Fieldname', 'Column Text', 'Type(Len)', 'Just', 'Flags', 'Ref Table-Field', 'Drilldown'],
        spec.item_grid.field_catalog.map((f) => [
          f.col_pos,
          f.fieldname,
          f.coltext,
          `${f.datatype}(${f.outputlen})`,
          f.just,
          [f.key ? 'KEY' : '', f.hotspot ? 'HOT' : '', f.edit ? 'EDIT' : '', f.do_sum ? 'SUM' : '']
            .filter(Boolean)
            .join(', ') || '-',
          f.ref_table ? `${f.ref_table}-${f.ref_field || ''}` : '-',
          f.drilldown_tcode || '-',
        ]),
        [6, 15, 22, 11, 6, 15, 16, 9]
      )
    );
  }

  // 5. ALV Custom Toolbar
  children.push(makeSectionHeading('5. ALV Custom Toolbar Functions'));
  if (spec.custom_toolbar && spec.custom_toolbar.length > 0) {
    children.push(
      makeStyledTable(
        ['Function Code', 'Button Text', 'Quickinfo / Tooltip', 'Icon'],
        spec.custom_toolbar.map((b) => [b.function, b.text, b.quickinfo, b.icon]),
        [18, 20, 42, 20]
      )
    );
  } else {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: 'Uses standard CL_GUI_ALV_GRID toolbar.', size: 19, color: '475569', font: 'Malgun Gothic' })],
      })
    );
  }

  // 6. Data Extraction & Processing Logic
  children.push(makeSectionHeading('6. Data Extraction & Processing Logic'));
  const logicLines = (spec.data_extraction_logic || '').split('\n');
  logicLines.forEach((line) => {
    children.push(
      new Paragraph({
        spacing: { before: 15, after: 15 },
        shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'F1F5F9' },
        children: [
          new TextRun({
            text: line || ' ',
            font: 'Consolas',
            size: 18,
            color: '0F172A',
          }),
        ],
      })
    );
  });

  // 7. Data Flow & Node Details
  children.push(makeSectionHeading('7. Program Data Flow & Detailed Technical Specifications'));
  const detailEntries = Object.entries(effectiveFlow.nodeDetails || {});
  if (detailEntries.length > 0) {
    detailEntries.forEach(([nodeId, detail]) => {
      children.push(
        new Paragraph({
          spacing: { before: 120, after: 40 },
          children: [
            new TextRun({
              text: `[${nodeId}] ${detail.label || nodeId}`,
              bold: true,
              size: 21,
              color: '1D4ED8',
              font: 'Malgun Gothic',
            }),
          ],
        }),
        ...markdownToDocxParagraphs(detail.markdown || '')
      );
    });
  } else {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: effectiveFlow.mermaidCode || 'Standard sequential ALV report flow.',
            font: 'Consolas',
            size: 18,
          }),
        ],
      })
    );
  }

  // 8. Test Cases
  children.push(makeSectionHeading('8. Unit Test Cases & Verification Scenarios'));
  const tcRows =
    spec.test_cases.length > 0
      ? spec.test_cases.map((tc, idx) => [idx + 1, tc.scenario, tc.condition, tc.expected])
      : [[1, 'Normal Query Execution', 'Default selection parameters', 'ALV grid renders expected rows']];
  children.push(makeStyledTable(['No', 'Test Scenario', 'Input Condition', 'Expected Result'], tcRows, [8, 28, 32, 32]));

  // 9. Revision History
  if (spec.change_history && spec.change_history.length > 0) {
    children.push(makeSectionHeading('9. Revision History'));
    children.push(
      makeStyledTable(
        ['Version', 'Changed At', 'Author', 'Change Description'],
        spec.change_history.map((h) => [h.version, h.changed_at, h.author, h.comment]),
        [12, 22, 18, 48]
      )
    );
  }

  const doc = new Document({
    creator: spec.author || 'EverySpec with Josh',
    title: `${spec.program_id} - ${spec.title}`,
    description: 'SAP ABAP Functional Specification Document',
    sections: [
      {
        properties: {
          page: {
            margin: { top: 900, right: 850, bottom: 900, left: 850 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: `SAP Functional Specification  |  ${spec.program_id} (${spec.module})`,
                    size: 16,
                    color: '64748B',
                    font: 'Malgun Gothic',
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: `FDD-${spec.module}-${spec.program_id}   |   Page `,
                    size: 16,
                    color: '64748B',
                    font: 'Malgun Gothic',
                  }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '475569' }),
                  new TextRun({ text: ' / ', size: 16, color: '64748B' }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: '475569' }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const filename = `${sanitizeFilename(spec.program_id)}_SPECIFICATION.docx`;
  triggerBlobDownload(filename, blob);
  return filename;
}
