import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { ProgramSpec } from '../types/sap';

export interface PdfExportProgress {
  percent: number;
  step: string;
}

export interface PdfExportOptions {
  mode?: 'high_fidelity' | 'vector';
  includeApproval?: boolean;
  includeRevision?: boolean;
  includeDataFlow?: boolean;
  onProgress?: (progress: PdfExportProgress) => void;
}

/**
 * Generate a clean, vector-based PDF using jsPDF and jspdf-autotable.
 * Fast, lightweight, selectable text, and professional enterprise layout.
 */
export async function generateVectorPdf(
  spec: ProgramSpec,
  options?: PdfExportOptions
): Promise<jsPDF> {
  options?.onProgress?.({ percent: 15, step: 'Building vector document structure...' });

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // Primary colors
  const primaryColor: [number, number, number] = [30, 58, 138]; // Deep SAP Blue
  const secondaryColor: [number, number, number] = [71, 85, 105]; // Slate
  const accentColor: [number, number, number] = [14, 116, 144]; // Cyan / Teal

  // Helper: Draw running header
  const drawRunningHeader = (title: string) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('SAP S/4HANA ERP - FUNCTIONAL SPECIFICATION', margin, 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`[${spec.program_id}] ${title}`, pageWidth - margin, 10, { align: 'right' });

    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(margin, 12, pageWidth - margin, 12);
  };

  // Helper: Draw running footer
  const drawRunningFooter = (pageNum: number, totalPages: number) => {
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`CONFIDENTIAL - FDD-${spec.module}-${spec.program_id}`, margin, pageHeight - 8);

    doc.setFont('helvetica', 'bold');
    doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin, pageHeight - 8, {
      align: 'right',
    });
  };

  // ==========================================
  // PAGE 1: COVER & OVERVIEW
  // ==========================================
  options?.onProgress?.({ percent: 30, step: 'Formatting Document Control & Scope...' });

  // Top Banner
  doc.setFillColor(30, 58, 138);
  doc.rect(margin, 14, contentWidth, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(`SAP S/4HANA ERP DEVELOPMENT | MODULE: ${spec.module}`, margin + 4, 19.5);

  // Document Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text(spec.title || 'ABAP Program Specification', margin, 32);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Program ID: ${spec.program_id}  |  T-Code: ${spec.tcode}  |  Release: ${spec.target_sap_release}`, margin, 38);

  // Horizontal divider
  doc.setDrawColor(30, 58, 138);
  doc.setLineWidth(0.8);
  doc.line(margin, 42, pageWidth - margin, 42);

  // Section 1: Document Control / Metadata Table
  let currentY = 48;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('1. Document Control & Administration', margin, currentY);

  autoTable(doc, {
    startY: currentY + 3,
    head: [['Attribute', 'Specification Detail', 'Attribute', 'Specification Detail']],
    body: [
      ['Program ID', spec.program_id, 'T-Code', spec.tcode],
      ['Module', spec.module, 'Program Type', spec.program_type === 'REPORT' ? 'ALV Report (CL_GUI_ALV_GRID)' : 'Dialog/Dynpro'],
      ['Author', spec.author, 'Creation Date', spec.created_date],
      ['SAP Release', spec.target_sap_release, 'Document ID', `FDD-${spec.module}-${spec.program_id}`],
    ],
    theme: 'grid',
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    styles: {
      fontSize: 8,
      cellPadding: 2,
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 32 },
      1: { cellWidth: 59 },
      2: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 32 },
      3: { cellWidth: 59 },
    },
    margin: { left: margin, right: margin },
  });

  // Section 2: Approval Table
  currentY = (doc as any).lastAutoTable.finalY + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('2. Review & Sign-Off Approvals', margin, currentY);

  autoTable(doc, {
    startY: currentY + 3,
    head: [['Role / Department', 'Name', 'Signature', 'Date', 'Status']],
    body: [
      ['ABAP Developer', spec.author, '', spec.created_date, 'Completed'],
      ['Functional Consultant', 'Process Owner', '', '', 'Approved'],
      ['Project Quality Assurance', 'QA Manager', '', '', 'Reviewed'],
    ],
    theme: 'grid',
    headStyles: {
      fillColor: [71, 85, 105],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    margin: { left: margin, right: margin },
  });

  // Section 3: Business Purpose & Scope
  currentY = (doc as any).lastAutoTable.finalY + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('3. Business Purpose & Scope', margin, currentY);

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, currentY + 3, contentWidth, 24, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);

  const purposeLines = doc.splitTextToSize(
    spec.business_purpose ||
      'This ABAP report provides comprehensive querying, filtering, and analysis capabilities for business operations with real-time ALV Grid integration.',
    contentWidth - 6
  );
  doc.text(purposeLines, margin + 3, currentY + 9);

  // ==========================================
  // PAGE 2: SELECTION SCREEN & FIELD CATALOG
  // ==========================================
  options?.onProgress?.({ percent: 55, step: 'Generating Selection Screen & Field Catalog tables...' });

  doc.addPage();
  drawRunningHeader(spec.title);

  // Section 4: Selection Screen (Dynpro 1000)
  currentY = 18;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('4. Selection Screen Specification (Dynpro 1000)', margin, currentY);

  const selectionRows = spec.selection_params.map((p) => [
    p.kind,
    p.name,
    p.text,
    `${p.datatype}(${p.length})`,
    p.obligatory ? 'Y' : 'N',
    p.default_val || '-',
    p.ref_table && p.ref_field ? `${p.ref_table}-${p.ref_field}` : '-',
    p.memory_id || '-',
  ]);

  autoTable(doc, {
    startY: currentY + 3,
    head: [['Kind', 'Parameter', 'Label / Description', 'Type(Len)', 'Req', 'Default', 'Ref Field', 'Memory ID']],
    body: selectionRows.length > 0 ? selectionRows : [['PARAM', 'P_NONE', 'None defined', 'CHAR(4)', 'N', '-', '-', '-']],
    theme: 'striped',
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 1.8,
      lineColor: [226, 232, 240],
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 22 },
      1: { fontStyle: 'bold', cellWidth: 26 },
      2: { cellWidth: 44 },
      3: { cellWidth: 20 },
      4: { halign: 'center', cellWidth: 12 },
      5: { cellWidth: 20 },
      6: { cellWidth: 24 },
      7: { cellWidth: 14 },
    },
    margin: { left: margin, right: margin },
  });

  // Section 5: ALV Grid Field Catalog (LVC_T_FCAT)
  currentY = (doc as any).lastAutoTable.finalY + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('5. ALV Grid Field Catalog Specification (LVC_T_FCAT)', margin, currentY);

  const fieldCatRows = spec.field_catalog.map((f) => [
    String(f.col_pos),
    f.fieldname,
    f.coltext,
    f.datatype,
    String(f.outputlen),
    f.just,
    f.key ? 'X' : '',
    f.hotspot ? 'X' : '',
    f.edit ? 'X' : '',
    f.do_sum ? 'X' : '',
    f.ref_table && f.ref_field ? `${f.ref_table}-${f.ref_field}` : '-',
    f.drilldown_tcode || '-',
  ]);

  autoTable(doc, {
    startY: currentY + 3,
    head: [['Pos', 'Fieldname', 'Column Text', 'Type', 'Len', 'Align', 'Key', 'Link', 'Edit', 'Sum', 'Ref Field', 'T-Code']],
    body: fieldCatRows,
    theme: 'striped',
    headStyles: {
      fillColor: [14, 116, 144],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 7,
      cellPadding: 1.5,
      lineColor: [226, 232, 240],
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { fontStyle: 'bold', cellWidth: 26 },
      2: { cellWidth: 34 },
      3: { cellWidth: 14 },
      4: { halign: 'center', cellWidth: 10 },
      5: { halign: 'center', cellWidth: 10 },
      6: { halign: 'center', cellWidth: 9 },
      7: { halign: 'center', cellWidth: 9 },
      8: { halign: 'center', cellWidth: 9 },
      9: { halign: 'center', cellWidth: 9 },
      10: { cellWidth: 24 },
      11: { cellWidth: 18 },
    },
    margin: { left: margin, right: margin },
  });

  // If Master-Detail, include Item ALV Grid Field Catalog
  if (spec.sample_type === '02' && spec.item_grid && spec.item_grid.field_catalog?.length > 0) {
    currentY = (doc as any).lastAutoTable.finalY + 8;
    if (currentY > pageHeight - 60) {
      doc.addPage();
      drawRunningHeader(spec.title);
      currentY = 18;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(`5.1 Item Detail ALV Grid Field Catalog (Foreign Key: ${spec.item_grid.foreign_key || 'VBELN'})`, margin, currentY);

    const itemFieldRows = spec.item_grid.field_catalog.map((f) => [
      String(f.col_pos),
      f.fieldname,
      f.coltext,
      f.datatype,
      String(f.outputlen),
      f.just,
      f.key ? 'X' : '',
      f.edit ? 'X' : '',
      f.do_sum ? 'X' : '',
      f.ref_table && f.ref_field ? `${f.ref_table}-${f.ref_field}` : '-',
      f.drilldown_tcode || '-',
    ]);

    autoTable(doc, {
      startY: currentY + 3,
      head: [['Pos', 'Fieldname', 'Column Text', 'Type', 'Len', 'Align', 'Key', 'Edit', 'Sum', 'Ref Field', 'T-Code']],
      body: itemFieldRows,
      theme: 'striped',
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontSize: 7.5,
        fontStyle: 'bold',
      },
      styles: {
        fontSize: 7,
        cellPadding: 1.5,
        lineColor: [226, 232, 240],
      },
      margin: { left: margin, right: margin },
    });
  }

  // ==========================================
  // PAGE 3: EXTRACTION LOGIC & TEST SCENARIOS
  // ==========================================
  options?.onProgress?.({ percent: 75, step: 'Documenting ABAP Logic & Test Scenarios...' });

  doc.addPage();
  drawRunningHeader(spec.title);

  // Section 6: Data Extraction & Processing Logic
  currentY = 18;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('6. Data Extraction & Business Processing Logic', margin, currentY);

  const logicText = spec.data_extraction_logic || 'SELECT * FROM VBAK INTO TABLE @DATA(LT_DATA).';
  const logicLines = doc.splitTextToSize(logicText, contentWidth - 8);

  const blockHeight = Math.min(Math.max(logicLines.length * 4 + 8, 24), 90);
  doc.setFillColor(15, 23, 42); // Dark slate terminal box
  doc.roundedRect(margin, currentY + 3, contentWidth, blockHeight, 1.5, 1.5, 'F');

  doc.setFont('courier', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(241, 245, 249);
  doc.text(logicLines.slice(0, 20), margin + 4, currentY + 9);

  // Section 7: Test Cases & Scenarios
  currentY = currentY + blockHeight + 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('7. Test Cases & Verification Scenarios', margin, currentY);

  const testRows = (spec.test_cases || []).map((tc, idx) => [
    String(idx + 1),
    tc.scenario,
    tc.condition,
    tc.expected,
  ]);

  autoTable(doc, {
    startY: currentY + 3,
    head: [['No', 'Test Scenario', 'Input Conditions', 'Expected Output']],
    body:
      testRows.length > 0
        ? testRows
        : [
            ['1', 'Normal Execution', 'Enter valid sales organization and dates', 'ALV Grid loads corresponding records'],
            ['2', 'Mandatory Check', 'Leave mandatory parameter blank', 'Display error message on status bar'],
          ],
    theme: 'grid',
    headStyles: {
      fillColor: [71, 85, 105],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      lineColor: [226, 232, 240],
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 12 },
      1: { fontStyle: 'bold', cellWidth: 50 },
      2: { cellWidth: 55 },
      3: { cellWidth: 65 },
    },
    margin: { left: margin, right: margin },
  });

  // Calculate total pages and stamp footers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawRunningFooter(i, totalPages);
  }

  options?.onProgress?.({ percent: 95, step: 'Finalizing PDF output...' });

  return doc;
}

/**
 * Build offscreen DOM pages with full Korean typography support.
 * This guarantees that when exporting to PDF from any view (Editor, Mockup, Split),
 * Korean characters are natively rasterized with zero glyph corruption.
 */
function buildOffscreenDocumentDom(spec: ProgramSpec): {
  container: HTMLElement;
  pages: HTMLElement[];
} {
  const container = document.createElement('div');
  container.id = 'offscreen-pdf-render-root';
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '820px';
  container.style.zIndex = '-9999';
  container.style.backgroundColor = '#ffffff';

  const isMasterDetail = spec.sample_type === '02' && !!spec.item_grid;
  const isPivot = spec.sample_type === '04';

  const baseFont =
    '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", "Segoe UI", sans-serif';

  const createSheet = (pageNum: number, totalPages: number): HTMLElement => {
    const sheet = document.createElement('div');
    sheet.className = 'sap-a4-sheet offscreen-sheet';
    sheet.style.width = '794px';
    sheet.style.minHeight = '1123px';
    sheet.style.padding = '44px 38px';
    sheet.style.boxSizing = 'border-box';
    sheet.style.backgroundColor = '#ffffff';
    sheet.style.color = '#0f172a';
    sheet.style.fontFamily = baseFont;
    sheet.style.position = 'relative';
    sheet.style.marginBottom = '20px';
    sheet.style.display = 'flex';
    sheet.style.flexDirection = 'column';
    sheet.style.justifyContent = 'space-between';

    return sheet;
  };

  const createRunningHeader = (title: string) => `
    <div style="border-bottom: 1.5px solid #cbd5e1; padding-bottom: 6px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; font-size: 11px; font-weight: bold; color: #1e3a8a;">
      <span>SAP S/4HANA ERP - FUNCTIONAL SPECIFICATION</span>
      <span style="color: #64748b; font-weight: normal; font-family: monospace;">[${spec.program_id}] ${title}</span>
    </div>
  `;

  const createRunningFooter = (pageNum: number, totalPages: number) => `
    <div style="border-top: 1px solid #e2e8f0; padding-top: 8px; margin-top: auto; display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #94a3b8;">
      <span>CONFIDENTIAL - FDD-${spec.module}-${spec.program_id}</span>
      <span style="font-weight: bold; color: #475569;">Page ${pageNum} of ${totalPages}</span>
    </div>
  `;

  const totalPages = isMasterDetail ? 5 : 4;
  const pages: HTMLElement[] = [];

  // ==========================================
  // PAGE 1: COVER & OVERVIEW
  // ==========================================
  const page1 = createSheet(1, totalPages);
  page1.innerHTML = `
    <div>
      ${createRunningHeader('Cover & Overview')}
      <div style="background-color: #1e3a8a; color: #ffffff; padding: 6px 12px; font-size: 11px; font-weight: bold; letter-spacing: 0.5px; border-radius: 4px; margin-bottom: 14px;">
        SAP S/4HANA ERP DEVELOPMENT | MODULE: ${spec.module}
      </div>

      <h1 style="font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 4px 0; line-height: 1.2;">
        ${spec.title || 'ABAP Program Specification'}
      </h1>
      <p style="font-size: 12px; color: #64748b; margin: 0 0 16px 0;">
        Program ID: <strong style="font-family: monospace; color: #1e3a8a;">${spec.program_id}</strong> &nbsp;|&nbsp;
        T-Code: <strong style="font-family: monospace; color: #0284c7;">${spec.tcode}</strong> &nbsp;|&nbsp;
        Release: ${spec.target_sap_release}
      </p>

      <!-- Document Control Metadata -->
      <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 18px; border: 1px solid #cbd5e1;">
        <tr style="background-color: #f8fafc;">
          <th style="padding: 6px 10px; border: 1px solid #cbd5e1; width: 18%; text-align: left; color: #475569;">작성자 (Author)</th>
          <td style="padding: 6px 10px; border: 1px solid #cbd5e1; width: 32%;">${spec.author}</td>
          <th style="padding: 6px 10px; border: 1px solid #cbd5e1; width: 18%; text-align: left; color: #475569;">작성일자 (Date)</th>
          <td style="padding: 6px 10px; border: 1px solid #cbd5e1; width: 32%; font-family: monospace;">${spec.created_date}</td>
        </tr>
        <tr>
          <th style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: left; color: #475569;">개발 유형 (Type)</th>
          <td style="padding: 6px 10px; border: 1px solid #cbd5e1;">${spec.program_type} (${spec.sample_type || '01'})</td>
          <th style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: left; color: #475569;">SAP 모듈 (Module)</th>
          <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-weight: bold; color: #1e3a8a;">${spec.module}</td>
        </tr>
      </table>

      <!-- Business Purpose Section -->
      <div style="margin-bottom: 18px;">
        <h2 style="font-size: 13px; font-weight: 700; color: #1e3a8a; border-left: 3.5px solid #1e3a8a; padding-left: 8px; margin: 0 0 8px 0;">
          1. Business Purpose & Scope (업무 목적 및 배경)
        </h2>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; font-size: 11.5px; line-height: 1.6; color: #1e293b; white-space: pre-wrap;">
${spec.business_purpose || '(업무 목적 미입력)'}
        </div>
      </div>

      <!-- Approvals Table -->
      <div style="margin-bottom: 16px;">
        <h2 style="font-size: 12px; font-weight: 700; color: #1e3a8a; border-left: 3.5px solid #1e3a8a; padding-left: 8px; margin: 0 0 6px 0;">
          2. Document Control & Approvals (문서 승인)
        </h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 10.5px; border: 1px solid #cbd5e1; text-align: center;">
          <thead style="background-color: #f1f5f9;">
            <tr>
              <th style="padding: 5px; border: 1px solid #cbd5e1;">Role (구분)</th>
              <th style="padding: 5px; border: 1px solid #cbd5e1;">Name (성명)</th>
              <th style="padding: 5px; border: 1px solid #cbd5e1;">Status (결재)</th>
              <th style="padding: 5px; border: 1px solid #cbd5e1;">Date (일자)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 5px; border: 1px solid #cbd5e1;">Consultant (작성자)</td>
              <td style="padding: 5px; border: 1px solid #cbd5e1;">${spec.author}</td>
              <td style="padding: 5px; border: 1px solid #cbd5e1; color: #16a34a; font-weight: bold;">Approved</td>
              <td style="padding: 5px; border: 1px solid #cbd5e1; font-family: monospace;">${spec.created_date}</td>
            </tr>
            <tr>
              <td style="padding: 5px; border: 1px solid #cbd5e1;">Lead ABAP Developer (개발리드)</td>
              <td style="padding: 5px; border: 1px solid #cbd5e1;">박개발 책임</td>
              <td style="padding: 5px; border: 1px solid #cbd5e1; color: #16a34a; font-weight: bold;">Approved</td>
              <td style="padding: 5px; border: 1px solid #cbd5e1; font-family: monospace;">${spec.created_date}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    ${createRunningFooter(1, totalPages)}
  `;
  pages.push(page1);
  container.appendChild(page1);

  // ==========================================
  // PAGE 2: SELECTION SCREEN & FIELD CATALOG
  // ==========================================
  const page2 = createSheet(2, totalPages);
  page2.innerHTML = `
    <div>
      ${createRunningHeader('Selection Screen & Field Catalog')}
      
      <!-- Selection Screen Parameters -->
      <div style="margin-bottom: 20px;">
        <h2 style="font-size: 13px; font-weight: 700; color: #1e3a8a; border-left: 3.5px solid #1e3a8a; padding-left: 8px; margin: 0 0 8px 0;">
          3. Selection Screen Definition (선택 화면 조건)
        </h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 10.5px; border: 1px solid #cbd5e1; text-align: left;">
          <thead style="background-color: #f1f5f9; font-weight: bold; color: #334155;">
            <tr>
              <th style="padding: 5px 8px; border: 1px solid #cbd5e1;">구분 (Kind)</th>
              <th style="padding: 5px 8px; border: 1px solid #cbd5e1;">필드명 (Name)</th>
              <th style="padding: 5px 8px; border: 1px solid #cbd5e1;">화면 텍스트 (Text)</th>
              <th style="padding: 5px 8px; border: 1px solid #cbd5e1;">유형 (Type)</th>
              <th style="padding: 5px 8px; border: 1px solid #cbd5e1;">길이</th>
              <th style="padding: 5px 8px; border: 1px solid #cbd5e1;">필수</th>
              <th style="padding: 5px 8px; border: 1px solid #cbd5e1;">기본값</th>
            </tr>
          </thead>
          <tbody>
            ${spec.selection_params
              .map(
                (p) => `
              <tr>
                <td style="padding: 4px 8px; border: 1px solid #cbd5e1; font-family: monospace;">${p.kind}</td>
                <td style="padding: 4px 8px; border: 1px solid #cbd5e1; font-family: monospace; font-weight: bold; color: #1e3a8a;">${p.name}</td>
                <td style="padding: 4px 8px; border: 1px solid #cbd5e1;">${p.text}</td>
                <td style="padding: 4px 8px; border: 1px solid #cbd5e1; font-family: monospace;">${p.datatype}</td>
                <td style="padding: 4px 8px; border: 1px solid #cbd5e1; text-align: center;">${p.length}</td>
                <td style="padding: 4px 8px; border: 1px solid #cbd5e1; text-align: center; color: ${p.obligatory ? '#e11d48' : '#64748b'}; font-weight: ${p.obligatory ? 'bold' : 'normal'};">${p.obligatory ? 'X' : ''}</td>
                <td style="padding: 4px 8px; border: 1px solid #cbd5e1; font-family: monospace;">${p.default_val || '-'}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>

      <!-- Field Catalog (FCAT) -->
      <div>
        <h2 style="font-size: 13px; font-weight: 700; color: #1e3a8a; border-left: 3.5px solid #1e3a8a; padding-left: 8px; margin: 0 0 8px 0;">
          4. ALV Grid Field Catalog (필드 카탈로그 구조)
        </h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 10px; border: 1px solid #cbd5e1; text-align: left;">
          <thead style="background-color: #f1f5f9; font-weight: bold; color: #334155;">
            <tr>
              <th style="padding: 5px; border: 1px solid #cbd5e1; text-align: center;">순번</th>
              <th style="padding: 5px; border: 1px solid #cbd5e1;">필드명 (Field)</th>
              <th style="padding: 5px; border: 1px solid #cbd5e1;">컬럼 텍스트 (Coltext)</th>
              <th style="padding: 5px; border: 1px solid #cbd5e1;">유형</th>
              <th style="padding: 5px; border: 1px solid #cbd5e1; text-align: center;">길이</th>
              <th style="padding: 5px; border: 1px solid #cbd5e1; text-align: center;">정렬</th>
              <th style="padding: 5px; border: 1px solid #cbd5e1; text-align: center;">KEY</th>
              <th style="padding: 5px; border: 1px solid #cbd5e1; text-align: center;">SUM</th>
            </tr>
          </thead>
          <tbody>
            ${spec.field_catalog
              .slice(0, 15)
              .map(
                (f) => `
              <tr style="${f.key ? 'background-color: #f0fdf4;' : ''}">
                <td style="padding: 4px; border: 1px solid #cbd5e1; text-align: center; font-family: monospace;">${f.col_pos}</td>
                <td style="padding: 4px; border: 1px solid #cbd5e1; font-family: monospace; font-weight: bold; color: #1e3a8a;">${f.fieldname}</td>
                <td style="padding: 4px; border: 1px solid #cbd5e1;">${f.coltext}</td>
                <td style="padding: 4px; border: 1px solid #cbd5e1; font-family: monospace;">${f.datatype}</td>
                <td style="padding: 4px; border: 1px solid #cbd5e1; text-align: center;">${f.outputlen}</td>
                <td style="padding: 4px; border: 1px solid #cbd5e1; text-align: center;">${f.just}</td>
                <td style="padding: 4px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; color: #16a34a;">${f.key ? 'X' : ''}</td>
                <td style="padding: 4px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; color: #d97706;">${f.do_sum ? 'Σ' : ''}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </div>
    ${createRunningFooter(2, totalPages)}
  `;
  pages.push(page2);
  container.appendChild(page2);

  // ==========================================
  // PAGE 3: LOGIC & FLOWCHART
  // ==========================================
  const page3 = createSheet(3, totalPages);
  page3.innerHTML = `
    <div>
      ${createRunningHeader('Data Extraction & Processing Logic')}
      
      <div style="margin-bottom: 22px;">
        <h2 style="font-size: 13px; font-weight: 700; color: #1e3a8a; border-left: 3.5px solid #1e3a8a; padding-left: 8px; margin: 0 0 8px 0;">
          5. Data Extraction & Business Logic (데이터베이스 추출 및 가공 로직)
        </h2>
        <div style="background-color: #0f172a; color: #f8fafc; font-family: monospace; font-size: 11px; line-height: 1.6; padding: 14px; border-radius: 6px; white-space: pre-wrap; box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);">
${spec.data_extraction_logic || '(추출 로직 미입력)'}
        </div>
      </div>

      <div>
        <h2 style="font-size: 13px; font-weight: 700; color: #1e3a8a; border-left: 3.5px solid #1e3a8a; padding-left: 8px; margin: 0 0 8px 0;">
          6. Status Indicator & Exception Traffic Lights (신호등 규칙)
        </h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 10.5px; border: 1px solid #cbd5e1;">
          <tr style="background-color: #f0fdf4;">
            <td style="padding: 6px 12px; border: 1px solid #cbd5e1; width: 25%; font-weight: bold; color: #166534;">🟢 1 (Green / 정상)</td>
            <td style="padding: 6px 12px; border: 1px solid #cbd5e1;">출하 완료 또는 승인 완료된 정상 오더 전표</td>
          </tr>
          <tr style="background-color: #fefce8;">
            <td style="padding: 6px 12px; border: 1px solid #cbd5e1; font-weight: bold; color: #854d0e;">🟡 2 (Yellow / 진행)</td>
            <td style="padding: 6px 12px; border: 1px solid #cbd5e1;">출하 준비 또는 결재 진행 중 상태</td>
          </tr>
          <tr style="background-color: #fff1f2;">
            <td style="padding: 6px 12px; border: 1px solid #cbd5e1; font-weight: bold; color: #9f1239;">🔴 3 (Red / 오류·지연)</td>
            <td style="padding: 6px 12px; border: 1px solid #cbd5e1;">미청구 지연 오더, 여신 한도 초과 또는 오류 발생</td>
          </tr>
        </table>
      </div>
    </div>
    ${createRunningFooter(3, totalPages)}
  `;
  pages.push(page3);
  container.appendChild(page3);

  // ==========================================
  // PAGE 4: TEST CASES & MOCK PREVIEW
  // ==========================================
  const page4 = createSheet(4, totalPages);
  page4.innerHTML = `
    <div>
      ${createRunningHeader('Test Scenarios & ALV Output')}
      
      <div style="margin-bottom: 20px;">
        <h2 style="font-size: 13px; font-weight: 700; color: #1e3a8a; border-left: 3.5px solid #1e3a8a; padding-left: 8px; margin: 0 0 8px 0;">
          7. Test Scenarios (테스트 시나리오 및 검증 조건)
        </h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 10.5px; border: 1px solid #cbd5e1; text-align: left;">
          <thead style="background-color: #f1f5f9;">
            <tr>
              <th style="padding: 6px; border: 1px solid #cbd5e1; width: 35%;">시나리오 설명 (Scenario)</th>
              <th style="padding: 6px; border: 1px solid #cbd5e1; width: 35%;">입력 조건 (Condition)</th>
              <th style="padding: 6px; border: 1px solid #cbd5e1; width: 30%;">예상 결과 (Expected)</th>
            </tr>
          </thead>
          <tbody>
            ${(spec.test_cases?.length
              ? spec.test_cases
              : [
                  { scenario: '기본 조회 검증', condition: 'P_VKORG = 1000 입력 후 F8 실행', expected: '정상 데이터 ALV Grid 출력' },
                  { scenario: '필수값 누락 점검', condition: 'P_VKORG 공란 후 실행', expected: 'SAP 오류 메시지 "회사코드를 입력하세요" 출력' },
                ]
            )
              .map(
                (tc) => `
              <tr>
                <td style="padding: 5px 8px; border: 1px solid #cbd5e1; font-weight: bold;">${tc.scenario}</td>
                <td style="padding: 5px 8px; border: 1px solid #cbd5e1;">${tc.condition}</td>
                <td style="padding: 5px 8px; border: 1px solid #cbd5e1; color: #166534;">${tc.expected}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>

      <!-- ALV Mock Output Table -->
      <div>
        <h2 style="font-size: 13px; font-weight: 700; color: #1e3a8a; border-left: 3.5px solid #1e3a8a; padding-left: 8px; margin: 0 0 8px 0;">
          8. ALV Output Mock Data Snapshot (화면 결과 시뮬레이션)
        </h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 9.5px; border: 1px solid #cbd5e1; font-family: monospace;">
          <thead style="background-color: #d8e4f0; color: #0f172a;">
            <tr>
              ${spec.field_catalog
                .slice(0, 8)
                .map((f) => `<th style="padding: 5px; border: 1px solid #9bbadb;">${f.coltext}</th>`)
                .join('')}
            </tr>
          </thead>
          <tbody>
            ${spec.mock_rows
              .slice(0, 8)
              .map(
                (row) => `
              <tr>
                ${spec.field_catalog
                  .slice(0, 8)
                  .map((f) => {
                    const val = row[f.fieldname];
                    return `<td style="padding: 4px; border: 1px solid #e2e8f0; text-align: ${f.just === 'R' ? 'right' : f.just === 'C' ? 'center' : 'left'};">${val !== undefined ? val : ''}</td>`;
                  })
                  .join('')}
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </div>
    ${createRunningFooter(4, totalPages)}
  `;
  pages.push(page4);
  container.appendChild(page4);

  return { container, pages };
}

/**
 * High-fidelity HTML to Canvas to jsPDF exporter.
 * Captures the exact formatted A4 pages with native Korean fonts into a multi-page PDF.
 */
export async function generateHighFidelityPdf(
  spec: ProgramSpec,
  options?: PdfExportOptions
): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Find all page elements in the DOM, or build offscreen if in editor view
  let pageElements = Array.from(document.querySelectorAll('.sap-a4-sheet')) as HTMLElement[];
  let cleanupOffscreen: (() => void) | null = null;

  if (pageElements.length === 0) {
    const offscreen = buildOffscreenDocumentDom(spec);
    document.body.appendChild(offscreen.container);
    pageElements = offscreen.pages;
    cleanupOffscreen = () => {
      offscreen.container.remove();
    };
  }

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  try {
    for (let i = 0; i < pageElements.length; i++) {
      const el = pageElements[i];

      options?.onProgress?.({
        percent: Math.round(((i + 0.2) / pageElements.length) * 90),
        step: `Capturing Page ${i + 1} of ${pageElements.length} (Korean UTF-8 High-Fidelity)...`,
      });

      // Temporarily ensure element is visible for capture
      const wasHidden = el.classList.contains('hidden');
      const prevDisplay = el.style.display;
      const prevPosition = el.style.position;
      const prevVisibility = el.style.visibility;

      if (wasHidden) {
        el.classList.remove('hidden');
        el.style.display = 'flex';
        el.style.visibility = 'visible';
      }

      try {
        const canvas = await html2canvas(el, {
          scale: 2, // 2x retina crispness
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          windowWidth: 1200,
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);

        if (i > 0) {
          doc.addPage();
        }

        // Add image to full A4 page with zero margins
        doc.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
      } finally {
        if (wasHidden) {
          el.classList.add('hidden');
          el.style.display = prevDisplay;
          el.style.position = prevPosition;
          el.style.visibility = prevVisibility;
        }
      }
    }
  } finally {
    if (cleanupOffscreen) {
      cleanupOffscreen();
    }
  }

  options?.onProgress?.({ percent: 98, step: 'Finalizing PDF document...' });
  return doc;
}

/**
 * Main export function: generates and triggers download of the specification PDF.
 * Defaults to high-fidelity capture so Korean text never corrupts.
 */
export async function exportSpecificationPdf(
  spec: ProgramSpec,
  options?: PdfExportOptions
): Promise<void> {
  const filename = `${spec.program_id || 'SAP_SPEC'}_SPECIFICATION.pdf`;

  let doc: jsPDF;
  try {
    // Always use high-fidelity Korean-safe DOM capture to prevent broken Hangul fonts
    doc = await generateHighFidelityPdf(spec, options);
  } catch (err) {
    console.warn('High fidelity PDF capture failed, falling back to structured vector PDF:', err);
    doc = await generateVectorPdf(spec, options);
  }

  options?.onProgress?.({ percent: 100, step: 'Downloading PDF file...' });
  doc.save(filename);
}

