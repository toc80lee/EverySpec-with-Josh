import React, { useState, useMemo, useEffect } from 'react';
import {
  Printer,
  Download,
  Share2,
  Upload,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Check,
  FileText,
  Sliders,
  Table,
  FileDown,
} from 'lucide-react';
import { ProgramSpec, AlvField, TestCase } from '../types/sap';
import { generateSpecMarkdown, downloadFile, exportFieldCatalogCsv } from '../utils/specExport';
import { InteractiveDataFlowCanvas } from './InteractiveDataFlowCanvas';
import { getSapAlvCellStyle } from './SapGuiMockup';
import { validateSapTCode } from '../utils/sapValidation';
import { PdfExportModal } from './PdfExportModal';

interface SpecDocumentViewProps {
  spec: ProgramSpec;
  onImportSpec?: (imported: ProgramSpec) => void;
  onReturnToWorkspace?: () => void;
}

export const SpecDocumentView: React.FC<SpecDocumentViewProps> = ({
  spec,
  onImportSpec,
  onReturnToWorkspace,
}) => {
  // Document customization & display toggles
  const [includeApproval, setIncludeApproval] = useState(true);
  const [includeRevision, setIncludeRevision] = useState(true);
  const [includeDataFlow, setIncludeDataFlow] = useState(true);
  const [includeMockSnapshot, setIncludeMockSnapshot] = useState(true);
  const [includeItemGrid, setIncludeItemGrid] = useState(true);
  const [copiedNotice, setCopiedNotice] = useState<string | null>(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  // Pagination & Page-flipping state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [viewMode, setViewMode] = useState<'flip' | 'all'>('flip'); // 'flip': single page turn, 'all': continuous pages
  const [zoomScale, setZoomScale] = useState<number>(1.0);

  const isMasterDetail = spec.sample_type === '02' && !!spec.item_grid;
  // Total pages: Master-Detail has 5 pages, Single ALV has 4 pages
  const totalPages = isMasterDetail ? 5 : 4;

  const tcodeValidation = useMemo(() => validateSapTCode(spec.tcode), [spec.tcode]);

  // Page titles for quick jump navigation
  const pageDefinitions = useMemo(() => {
    if (isMasterDetail) {
      return [
        { page: 1, title: 'Cover & Overview', sub: 'Basic Info · Approval · Revision' },
        { page: 2, title: 'Selection Screen & Header ALV', sub: 'Selection Screen · Header FCAT' },
        { page: 3, title: 'Item ALV Grid Spec', sub: 'Item Grid FCAT · Foreign Key (VBELN)' },
        { page: 4, title: 'Logic & Flowchart', sub: 'Extraction Logic · Data Flow Diagram' },
        { page: 5, title: 'Test Cases & Mock Preview', sub: 'Test Scenarios · ALV Mock Data' },
      ];
    }
    return [
      { page: 1, title: 'Cover & Overview', sub: 'Basic Info · Approval · Revision' },
      { page: 2, title: 'Screen & Field Catalog', sub: 'Selection Screen · ALV FCAT · Toolbar' },
      { page: 3, title: 'Logic & Flowchart', sub: 'Extraction Logic · Data Flow Diagram' },
      { page: 4, title: 'Test Cases & Mock Preview', sub: 'Test Scenarios · ALV Mock Data' },
    ];
  }, [isMasterDetail]);

  // Keyboard navigation for page flipping (ArrowLeft / ArrowRight / PageUp / PageDown)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in form inputs
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        setCurrentPage((prev) => Math.max(1, prev - 1));
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        setCurrentPage((prev) => Math.min(totalPages, prev + 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [totalPages]);

  // Header Total calculations (DO_SUM)
  const headerTotals = useMemo(() => {
    const sumMap: Record<string, number> = {};
    spec.field_catalog.forEach((f) => {
      if (f.do_sum) {
        sumMap[f.fieldname] = (spec.mock_rows || []).reduce((acc, row) => {
          const val = Number(row[f.fieldname]) || 0;
          return acc + val;
        }, 0);
      }
    });
    return sumMap;
  }, [spec.field_catalog, spec.mock_rows]);

  // Item Total calculations (DO_SUM)
  const itemTotals = useMemo(() => {
    if (!spec.item_grid?.field_catalog) return {};
    const sumMap: Record<string, number> = {};
    spec.item_grid.field_catalog.forEach((f) => {
      if (f.do_sum) {
        sumMap[f.fieldname] = (spec.item_grid?.mock_rows || []).reduce((acc, row) => {
          const val = Number(row[f.fieldname]) || 0;
          return acc + val;
        }, 0);
      }
    });
    return sumMap;
  }, [spec.item_grid]);

  // Active toolbar buttons
  const activeToolbarButtons =
    spec.toolbar_buttons && spec.toolbar_buttons.length > 0
      ? spec.toolbar_buttons.filter((b) => b.visible !== false)
      : [];

  // Download Markdown
  const handleDownloadMarkdown = () => {
    const md = generateSpecMarkdown(spec);
    downloadFile(`${spec.program_id}_SPECIFICATION.md`, md, 'text/markdown;charset=utf-8;');
  };

  // Download Field Catalog CSV
  const handleDownloadCsv = () => {
    const csv = exportFieldCatalogCsv(spec);
    downloadFile(`${spec.program_id}_FIELDCATALOG.csv`, '\uFEFF' + csv, 'text/csv;charset=utf-8;');
  };

  // Export JSON
  const handleExportJson = () => {
    const jsonStr = JSON.stringify(spec, null, 2);
    downloadFile(`${spec.program_id}_SPEC.json`, jsonStr, 'application/json');
  };

  // Import JSON
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onImportSpec) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.program_id && parsed.field_catalog) {
          onImportSpec(parsed);
          setCopiedNotice('사양서 JSON 파일이 성공적으로 로드되었습니다.');
          setTimeout(() => setCopiedNotice(null), 4000);
        }
      } catch (err) {
        console.warn('Invalid specification JSON file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Trigger Print to PDF
  const handlePrint = () => {
    window.print();
  };

  // Reusable Running Header for Pages 2+
  const renderRunningHeader = (pageNo: number) => (
    <div className="flex items-center justify-between text-[11px] text-slate-500 pb-2 border-b-2 border-slate-900 mb-4 font-mono shrink-0">
      <div className="flex items-center gap-2">
        <span className="font-bold text-blue-900 uppercase">SAP S/4HANA ERP IMPLEMENTATION</span>
        <span>|</span>
        <span className="font-semibold text-slate-800">
          [{spec.program_id}] {spec.title}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-900 text-[10px] font-bold">
          {spec.module} MODULE
        </span>
        <span className="text-[10px] text-slate-500">DOC-ID: FDD-{spec.module}-{spec.program_id}</span>
      </div>
    </div>
  );

  // Reusable Running Footer with accurate Page X of Y
  const renderRunningFooter = (pageNo: number) => (
    <footer className="border-t border-slate-300 pt-3 mt-4 text-[10px] text-slate-500 flex items-center justify-between font-mono shrink-0">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-slate-700">SAP Functional Specification</span>
        <span>|</span>
        <span>FDD-{spec.module}-{spec.program_id}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          - {pageNo} / {totalPages} -
        </span>
      </div>
      <div>
        <span>CONFIDENTIAL - FOR INTERNAL USE ONLY</span>
      </div>
    </footer>
  );

  // Check if a page should be displayed on screen
  const isPageVisibleOnScreen = (pageNo: number) => {
    if (viewMode === 'all') return true;
    return currentPage === pageNo;
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-900 font-sans select-text">
      {/* ========================================================================= */}
      {/* 1. TOP CONTROL BAR (Hidden during Print)                                  */}
      {/* ========================================================================= */}
      <div className="no-print bg-slate-900 border-b border-slate-800 text-white px-4 py-2.5 shrink-0 flex flex-wrap items-center justify-between gap-3 shadow-md z-30">
        <div className="flex items-center gap-3">
          {onReturnToWorkspace && (
            <button
              onClick={onReturnToWorkspace}
              className="px-2.5 py-1 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="이전 워크스페이스로 복귀"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Dual View</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
              {spec.module}
            </span>
            <div>
              <h2 className="text-xs font-bold text-white flex items-center gap-2">
                <span>SAP 공식 기능 사양서 (Functional Specification)</span>
                <span className="text-[11px] font-mono text-slate-400">[{spec.program_id}]</span>
              </h2>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Section Visibility Toggles */}
          <div className="hidden 2xl:flex items-center gap-2 bg-slate-800/80 px-2.5 py-1 rounded border border-slate-700/60 text-[11px] text-slate-300">
            <span className="text-slate-400 font-medium">포함 항목:</span>
            <label className="flex items-center gap-1 cursor-pointer hover:text-white">
              <input
                type="checkbox"
                checked={includeApproval}
                onChange={(e) => setIncludeApproval(e.target.checked)}
                className="w-3 h-3 accent-blue-600 rounded"
              />
              <span>결재란</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer hover:text-white">
              <input
                type="checkbox"
                checked={includeRevision}
                onChange={(e) => setIncludeRevision(e.target.checked)}
                className="w-3 h-3 accent-blue-600 rounded"
              />
              <span>개정이력</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer hover:text-white">
              <input
                type="checkbox"
                checked={includeDataFlow}
                onChange={(e) => setIncludeDataFlow(e.target.checked)}
                className="w-3 h-3 accent-blue-600 rounded"
              />
              <span>흐름도</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer hover:text-white">
              <input
                type="checkbox"
                checked={includeMockSnapshot}
                onChange={(e) => setIncludeMockSnapshot(e.target.checked)}
                className="w-3 h-3 accent-blue-600 rounded"
              />
              <span>모의스냅샷</span>
            </label>
          </div>

          {/* Primary Action: jsPDF Export */}
          <button
            onClick={() => setIsPdfModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-blue-900/40 cursor-pointer border border-blue-400/30"
            title="jsPDF를 사용하여 사양서를 전문적으로 포맷팅된 PDF 파일로 즉시 내보냅니다."
          >
            <FileDown className="w-3.5 h-3.5 text-blue-200" />
            <span>PDF 내보내기 (jsPDF)</span>
          </button>

          {/* Secondary Action: Browser Print */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
            title="브라우저 인쇄 대화상자를 열어 인쇄합니다 (단축키: Ctrl + P / Cmd + P)"
          >
            <Printer className="w-3.5 h-3.5 text-slate-400" />
            <span>인쇄 (Print)</span>
          </button>

          {/* Markdown Download */}
          <button
            onClick={handleDownloadMarkdown}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
            title="Markdown 포맷 사양서 다운로드"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Markdown</span>
          </button>

          {/* Field Catalog CSV */}
          <button
            onClick={handleDownloadCsv}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 rounded text-xs font-medium border border-emerald-700/50 transition-colors cursor-pointer"
            title="필드 카탈로그 CSV 다운로드"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">CSV</span>
          </button>

          {/* JSON Export */}
          <button
            onClick={handleExportJson}
            title="사양서 원본 JSON 백업 저장"
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>

          {/* JSON Import */}
          {onImportSpec && (
            <label
              title="사양서 JSON 불러오기"
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <input
                type="file"
                accept=".json"
                onChange={handleImportJson}
                className="hidden"
              />
            </label>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. INTERACTIVE PAGE NAVIGATION & FLIPPING TOOLBAR (User Request Focus)    */}
      {/* ========================================================================= */}
      <div className="no-print bg-slate-850 bg-[#162032] border-b border-slate-800 px-4 py-2 shrink-0 flex flex-wrap items-center justify-between gap-3 shadow-inner z-20 text-slate-200">
        {/* Left: View Mode Toggle (Page Flip vs All Pages) */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-700/80 text-xs">
            <button
              onClick={() => setViewMode('flip')}
              className={`px-3 py-1 rounded-md font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'flip'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="한 페이지씩 넘겨보는 슬라이드/책넘김 모드"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>페이지 넘겨보기 (Page Flip)</span>
            </button>
            <button
              onClick={() => setViewMode('all')}
              className={`px-3 py-1 rounded-md font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="모든 A4 페이지를 세로로 이어서 보는 모드"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>전체 페이지 연속 보기</span>
            </button>
          </div>

          <span className="hidden lg:inline text-[11px] text-slate-400 font-mono">
            단축키: <kbd className="bg-slate-800 px-1 py-0.5 rounded text-slate-300">←</kbd>{' '}
            <kbd className="bg-slate-800 px-1 py-0.5 rounded text-slate-300">→</kbd> 로 페이지 전환
          </span>
        </div>

        {/* Center: Interactive Page Turner (Prev / Page Buttons / Next) */}
        <div className="flex items-center gap-1.5">
          {/* Previous Page Button */}
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className={`px-2.5 py-1 text-xs font-semibold rounded flex items-center gap-1 transition-all cursor-pointer ${
              currentPage <= 1
                ? 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-800'
                : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 hover:border-slate-500'
            }`}
            title="이전 페이지 (단축키: ←)"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">이전</span>
          </button>

          {/* Quick Page Jump Buttons */}
          <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-lg border border-slate-700/80">
            {pageDefinitions.map((pDef) => {
              const isActive = currentPage === pDef.page;
              return (
                <button
                  key={pDef.page}
                  onClick={() => {
                    setCurrentPage(pDef.page);
                    if (viewMode === 'all') {
                      const el = document.getElementById(`sap-page-${pDef.page}`);
                      el?.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  className={`px-2.5 py-1 text-xs font-mono font-bold rounded transition-all cursor-pointer flex items-center gap-1 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs ring-1 ring-blue-400'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                  title={`${pDef.page}페이지: ${pDef.title} (${pDef.sub})`}
                >
                  <span>{pDef.page}</span>
                  <span className="hidden xl:inline font-sans font-normal text-[10px] opacity-80">
                    {pDef.title}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Next Page Button */}
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className={`px-2.5 py-1 text-xs font-semibold rounded flex items-center gap-1 transition-all cursor-pointer ${
              currentPage >= totalPages
                ? 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-800'
                : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 hover:border-slate-500'
            }`}
            title="다음 페이지 (단축키: →)"
          >
            <span className="hidden sm:inline">다음</span>
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Page Counter Badge */}
          <div className="ml-1 px-2.5 py-1 bg-slate-900 border border-slate-700 rounded text-xs font-mono font-semibold text-slate-300">
            <span className="text-blue-400">{currentPage}</span> / {totalPages}
          </div>
        </div>

        {/* Right: Zoom Scale Controls */}
        <div className="flex items-center gap-1.5 text-xs">
          <div className="flex items-center bg-slate-900 border border-slate-700 rounded p-0.5">
            <button
              onClick={() => setZoomScale((z) => Math.max(0.7, Number((z - 0.1).toFixed(1))))}
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
              title="축소"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-1.5 font-mono text-[11px] text-slate-300 min-w-10 text-center">
              {Math.round(zoomScale * 100)}%
            </span>
            <button
              onClick={() => setZoomScale((z) => Math.min(1.4, Number((z + 0.1).toFixed(1))))}
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
              title="확대"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomScale(1.0)}
              className="px-1.5 py-0.5 text-[10px] text-slate-400 hover:text-white hover:bg-slate-800 rounded font-mono"
              title="100% 초기화"
            >
              100%
            </button>
          </div>
        </div>
      </div>

      {/* Notice Banner */}
      {copiedNotice && (
        <div className="no-print bg-emerald-600 text-white text-xs px-4 py-2 font-medium flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>{copiedNotice}</span>
          </div>
          <button onClick={() => setCopiedNotice(null)} className="text-white hover:opacity-80">
            ✕
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. A4 PAGINATED VIEWPORT (Clean, separated A4 pages)                       */}
      {/* ========================================================================= */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-[#0a0f1d] flex flex-col items-center print:p-0 print:bg-white print:overflow-visible">
        <div
          className="transition-transform duration-200 origin-top flex flex-col items-center w-full print:transform-none"
          style={{ transform: `scale(${zoomScale})` }}
        >
          {/* ========================================================================= */}
          {/* PAGE 1: 표지, 결재선, 개정이력, 프로그램 기본 정보, 업무 개요           */}
          {/* ========================================================================= */}
          <div
            id="sap-page-1"
            className={`${
              isPageVisibleOnScreen(1) ? 'sap-a4-sheet' : 'hidden print:sap-a4-sheet'
            } ${viewMode === 'all' ? 'mb-8 print:mb-0' : ''}`}
          >
            {/* Top Page Content */}
            <div className="space-y-6">
              {/* Cover Document Header */}
              <header className="border-b-2 border-slate-900 pb-5">
                {/* Top Corporate Line */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-blue-900 tracking-wider uppercase font-mono">
                      SAP S/4HANA ERP IMPLEMENTATION
                    </span>
                    <span>|</span>
                    <span>PROJECT DELIVERABLE</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[10px]">
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 font-bold text-slate-700 border border-slate-300">
                      CONFIDENTIAL / 사외비
                    </span>
                    <span>DOC-ID: FDD-{spec.module}-{spec.program_id}</span>
                  </div>
                </div>

                {/* Document Title & Subtitle */}
                <div className="mt-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 text-xs font-bold font-mono">
                        {spec.module} MODULE
                      </span>
                      <span className="text-xs font-semibold text-slate-500">
                        {spec.program_type === 'REPORT' ? 'ALV 그리드 레포트' : '온라인 트랜잭션'}
                      </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
                      프로그램 기능 개발 사양서
                    </h1>
                    <p className="text-sm font-semibold text-blue-900 mt-1 font-mono">
                      [{spec.program_id}] {spec.title}
                    </p>
                  </div>

                  {/* Official 4-Tier Approval Sign-Off Matrix */}
                  {includeApproval && (
                    <div className="print-avoid-break shrink-0">
                      <table className="border-collapse border border-slate-600 text-center text-[10px] w-64 shadow-2xs font-sans">
                        <thead>
                          <tr className="bg-[#e9f0f8] border-b border-slate-600 text-slate-800 font-bold">
                            <th className="p-1 border-r border-slate-400 w-16">작성 (FS)</th>
                            <th className="p-1 border-r border-slate-400 w-16">검토 (Lead)</th>
                            <th className="p-1 border-r border-slate-400 w-16">품질 (QA)</th>
                            <th className="p-1 w-16">승인 (PM)</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="h-12 border-b border-slate-300 bg-white">
                            <td className="p-1 border-r border-slate-400 align-bottom text-[11px] font-bold text-slate-800">
                              {spec.author.split(' ')[0] || '작성'}
                            </td>
                            <td className="p-1 border-r border-slate-400 align-bottom text-[10px] text-slate-600 font-medium">
                              수석
                            </td>
                            <td className="p-1 border-r border-slate-400 align-bottom text-[10px] text-slate-600 font-medium">
                              QA팀
                            </td>
                            <td className="p-1 align-bottom text-[10px] text-emerald-700 font-bold">
                              승인완료
                            </td>
                          </tr>
                          <tr className="bg-slate-50 text-[9px] text-slate-500 font-mono">
                            <td className="p-0.5 border-r border-slate-300">{spec.created_date}</td>
                            <td className="p-0.5 border-r border-slate-300">{spec.created_date}</td>
                            <td className="p-0.5 border-r border-slate-300">{spec.created_date}</td>
                            <td className="p-0.5">{spec.created_date}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </header>

              {/* Revision History */}
              {includeRevision && (
                <section className="print-avoid-break space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-blue-700 rounded-full" />
                      문서 개정 및 변경 이력 (Revision History)
                    </span>
                    <span className="text-[10px] text-slate-500 font-normal">기준 버전: v1.0</span>
                  </div>
                  <table className="w-full text-xs text-left border-collapse border border-slate-300">
                    <thead className="bg-[#f1f5f9] border-b border-slate-300 text-slate-700 font-semibold text-[11px]">
                      <tr>
                        <th className="p-1.5 border-r border-slate-300 w-16 text-center">버전</th>
                        <th className="p-1.5 border-r border-slate-300 w-24 text-center">개정일자</th>
                        <th className="p-1.5 border-r border-slate-300 w-28">작성/개정자</th>
                        <th className="p-1.5">개정 및 변경 내용 요약</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-[11px]">
                      <tr>
                        <td className="p-1.5 border-r border-slate-300 text-center font-mono font-bold text-blue-900">
                          v1.0
                        </td>
                        <td className="p-1.5 border-r border-slate-300 text-center font-mono text-slate-600">
                          {spec.created_date}
                        </td>
                        <td className="p-1.5 border-r border-slate-300 font-semibold text-slate-800">
                          {spec.author}
                        </td>
                        <td className="p-1.5 text-slate-700">
                          초기 기능 사양서 작성 및 ALV Grid 레이아웃/필드 카탈로그/데이터 흐름 설계 완료
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </section>
              )}

              {/* SECTION 1: 프로그램 기본 정보 (General Program Information) */}
              <section className="print-avoid-break space-y-2">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-1 border-b-2 border-slate-800">
                  <span className="px-1.5 py-0.5 rounded bg-blue-800 text-white font-mono text-[10px]">
                    01
                  </span>
                  <span>1. 프로그램 기본 정보 (General Program Information)</span>
                </h2>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-[#f8fafc] p-3 rounded border border-slate-300 text-xs">
                  <div className="border-r border-slate-200 pr-2">
                    <span className="text-slate-500 block text-[10px] font-semibold">
                      프로그램 ID (Program)
                    </span>
                    <span className="font-mono font-bold text-blue-900 text-xs">
                      {spec.program_id}
                    </span>
                  </div>
                  <div className="border-r border-slate-200 pr-2">
                    <span className="text-slate-500 block text-[10px] font-semibold">
                      트랜잭션 코드 (T-Code)
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono font-bold text-blue-900 text-xs">{spec.tcode}</span>
                      {tcodeValidation.isValid ? (
                        <span className="text-[9px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 font-sans font-semibold">
                          ✓ SAP 표준
                        </span>
                      ) : (
                        <span
                          className="text-[9px] text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-300 font-sans font-semibold"
                          title={tcodeValidation.message}
                        >
                          ⚠️ 표준규칙 이탈
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="border-r border-slate-200 pr-2">
                    <span className="text-slate-500 block text-[10px] font-semibold">
                      SAP 업무 모듈
                    </span>
                    <span className="font-bold text-slate-800 text-xs">{spec.module} 모듈</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] font-semibold">
                      프로그램 유형
                    </span>
                    <span className="font-bold text-slate-800 text-xs">
                      {spec.program_type === 'REPORT'
                        ? 'ALV Report (OOP: CL_GUI_ALV_GRID)'
                        : '온라인 대화형'}
                    </span>
                  </div>

                  <div className="border-r border-slate-200 pr-2 pt-2 border-t border-slate-200">
                    <span className="text-slate-500 block text-[10px] font-semibold">
                      작성자 / 담당 컨설턴트
                    </span>
                    <span className="font-semibold text-slate-800 text-xs">{spec.author}</span>
                  </div>
                  <div className="border-r border-slate-200 pr-2 pt-2 border-t border-slate-200">
                    <span className="text-slate-500 block text-[10px] font-semibold">작성 일자</span>
                    <span className="font-mono text-slate-800 text-xs">{spec.created_date}</span>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-slate-200">
                    <span className="text-slate-500 block text-[10px] font-semibold">
                      대상 SAP 시스템 버전
                    </span>
                    <span className="font-semibold text-slate-800 text-xs">
                      {spec.target_sap_release}
                    </span>
                  </div>
                </div>
              </section>

              {/* SECTION 2: 업무 배경 및 개발 목적 (Business Requirements & Purpose) */}
              <section className="print-avoid-break space-y-2">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-1 border-b-2 border-slate-800">
                  <span className="px-1.5 py-0.5 rounded bg-blue-800 text-white font-mono text-[10px]">
                    02
                  </span>
                  <span>2. 업무 배경 및 개발 목적 (Business Requirements & Purpose)</span>
                </h2>
                <div className="p-4 bg-slate-50 rounded border border-slate-300 text-xs leading-relaxed whitespace-pre-line text-slate-800 shadow-2xs">
                  {spec.business_purpose}
                </div>
              </section>
            </div>

            {/* Page 1 Footer */}
            {renderRunningFooter(1)}
          </div>

          {/* ========================================================================= */}
          {/* PAGE 2: 선택 화면 명세 & ALV 헤더 레이아웃 / 필드 카탈로그 / 툴바        */}
          {/* ========================================================================= */}
          <div
            id="sap-page-2"
            className={`${
              isPageVisibleOnScreen(2) ? 'sap-a4-sheet' : 'hidden print:sap-a4-sheet'
            } ${viewMode === 'all' ? 'mb-8 print:mb-0' : ''}`}
          >
            <div className="space-y-6">
              {renderRunningHeader(2)}

              {/* SECTION 3: 선택 화면 설계 (Selection Screen) */}
              <section className="print-avoid-break space-y-2">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-1 border-b-2 border-slate-800">
                  <span className="px-1.5 py-0.5 rounded bg-blue-800 text-white font-mono text-[10px]">
                    03
                  </span>
                  <span>3. 선택 화면 (Selection Screen) 명세</span>
                </h2>

                <div className="border border-slate-300 rounded overflow-hidden">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-[#e4edf7] border-b border-slate-300 text-slate-800 font-semibold text-[11px]">
                      <tr>
                        <th className="p-2 border-r border-slate-300 w-24">구분</th>
                        <th className="p-2 border-r border-slate-300 w-28">변수명</th>
                        <th className="p-2 border-r border-slate-300">선택 화면 텍스트</th>
                        <th className="p-2 border-r border-slate-300 w-24 text-center">타입/길이</th>
                        <th className="p-2 border-r border-slate-300 w-28">참조 테이블/필드</th>
                        <th className="p-2 border-r border-slate-300 w-16 text-center">필수</th>
                        <th className="p-2 w-24">기본값</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                      {spec.selection_params.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="p-2 border-r border-slate-200 font-sans font-medium text-slate-600">
                            {p.kind === 'PARAMETER' ? 'PARAMETERS' : 'SELECT-OPTIONS'}
                          </td>
                          <td className="p-2 border-r border-slate-200 font-bold text-blue-900">
                            {p.name}
                          </td>
                          <td className="p-2 border-r border-slate-200 font-sans text-slate-800">
                            {p.text}
                          </td>
                          <td className="p-2 border-r border-slate-200 text-center text-slate-700">
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-[10px]">
                              {p.datatype || 'CHAR'}({p.length || 10})
                            </span>
                          </td>
                          <td className="p-2 border-r border-slate-200 text-slate-600">
                            {p.ref_table ? `${p.ref_table}-${p.ref_field}` : '-'}
                          </td>
                          <td className="p-2 border-r border-slate-200 text-center font-bold">
                            {p.obligatory ? (
                              <span className="text-red-600">Y</span>
                            ) : (
                              <span className="text-slate-400">N</span>
                            )}
                          </td>
                          <td className="p-2 text-slate-700">{p.default_val || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* SECTION 4: ALV 그리드 레이아웃 및 필드 카탈로그 명세 */}
              <section className="space-y-4 print-avoid-break">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-1 border-b-2 border-slate-800">
                  <span className="px-1.5 py-0.5 rounded bg-blue-800 text-white font-mono text-[10px]">
                    04
                  </span>
                  <span>
                    4. ALV 그리드 레이아웃 및 필드 카탈로그 명세 (ALV Grid Specification)
                  </span>
                </h2>

                {/* 4.1 Header ALV Grid */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-blue-600 rounded-xs" />
                      <span>
                        4.1{' '}
                        {isMasterDetail
                          ? 'Header ALV Grid (헤더 그리드 명세: VBAK)'
                          : 'ALV 그리드 필드 카탈로그 (LVC_T_FCAT)'}
                      </span>
                    </h3>
                    <span className="text-[10px] font-mono text-slate-500">
                      총 {spec.field_catalog.length}개 필드 | 레이아웃:{' '}
                      {spec.layout?.grid_title}
                    </span>
                  </div>

                  {/* Layout Properties Summary */}
                  <div className="bg-[#f8fafc] border border-slate-300 rounded p-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-500 block text-[10px]">
                        그리드 타이틀 (GRID_TITLE)
                      </span>
                      <span className="font-bold text-slate-800">
                        {spec.layout?.grid_title || '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">
                        선택 모드 (SEL_MODE)
                      </span>
                      <span className="font-mono font-bold text-blue-900">
                        {spec.layout?.sel_mode || 'A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">
                        줄무늬 패턴 (ZEBRA)
                      </span>
                      <span className="font-bold text-slate-800">
                        {spec.layout?.zebra ? '적용 (X)' : '미적용'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">
                        열 너비 최적화 (CWIDTH_OPT)
                      </span>
                      <span className="font-bold text-slate-800">
                        {spec.layout?.cwidth_opt ? '적용 (X)' : '미적용'}
                      </span>
                    </div>
                  </div>

                  {/* Field Catalog Table */}
                  <div className="border border-slate-300 rounded overflow-x-auto print-avoid-break">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="bg-[#e4edf7] border-b border-slate-300 text-slate-800 font-semibold text-[11px]">
                        <tr>
                          <th className="p-1.5 border-r border-slate-300 text-center w-8">No</th>
                          <th className="p-1.5 border-r border-slate-300 min-w-24">필드명</th>
                          <th className="p-1.5 border-r border-slate-300 min-w-28">컬럼명 (라벨)</th>
                          <th className="p-1.5 border-r border-slate-300 w-16">타입</th>
                          <th className="p-1.5 border-r border-slate-300 text-center w-10">길이</th>
                          <th className="p-1.5 border-r border-slate-300 text-center w-10">정렬</th>
                          <th className="p-1.5 border-r border-slate-300 text-center w-10">Key</th>
                          <th className="p-1.5 border-r border-slate-300 text-center w-10">Link</th>
                          <th className="p-1.5 border-r border-slate-300 text-center w-10">Edit</th>
                          <th className="p-1.5 border-r border-slate-300 text-center w-10">Sum</th>
                          <th className="p-1.5 border-r border-slate-300 text-center w-14">Color</th>
                          <th className="p-1.5 border-r border-slate-300 min-w-24">
                            참조 테이블/필드
                          </th>
                          <th className="p-1.5 min-w-20">드릴다운</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                        {spec.field_catalog.map((f) => (
                          <tr key={f.fieldname} className="hover:bg-slate-50">
                            <td className="p-1.5 border-r border-slate-200 text-center text-slate-500 font-bold">
                              {f.col_pos}
                            </td>
                            <td className="p-1.5 border-r border-slate-200 font-bold text-slate-900">
                              {f.fieldname}
                            </td>
                            <td className="p-1.5 border-r border-slate-200 font-sans text-slate-800">
                              {f.coltext}
                            </td>
                            <td className="p-1.5 border-r border-slate-200 text-slate-600">
                              {f.datatype}
                            </td>
                            <td className="p-1.5 border-r border-slate-200 text-center">
                              {f.outputlen}
                            </td>
                            <td className="p-1.5 border-r border-slate-200 text-center">
                              {f.just}
                            </td>
                            <td className="p-1.5 border-r border-slate-200 text-center font-bold text-blue-700">
                              {f.key ? 'O' : '-'}
                            </td>
                            <td className="p-1.5 border-r border-slate-200 text-center font-bold text-indigo-700">
                              {f.hotspot ? 'O' : '-'}
                            </td>
                            <td className="p-1.5 border-r border-slate-200 text-center">
                              {f.edit ? 'O' : '-'}
                            </td>
                            <td className="p-1.5 border-r border-slate-200 text-center font-bold text-emerald-700">
                              {f.do_sum ? 'O' : '-'}
                            </td>
                            <td className="p-1.5 border-r border-slate-200 text-center text-[10px]">
                              {f.emphasize ? (
                                <span className="font-bold text-amber-800">{f.emphasize}</span>
                              ) : (
                                '-'
                              )}
                            </td>
                            <td className="p-1.5 border-r border-slate-200 text-[10px] text-slate-500">
                              {f.ref_table ? `${f.ref_table}-${f.ref_field}` : '-'}
                            </td>
                            <td className="p-1.5 text-[10px] text-blue-700">
                              {f.drilldown_tcode || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 4.3 ALV Toolbar Buttons (LVC_T_STB) */}
                {activeToolbarButtons.length > 0 && (
                  <div className="space-y-1.5 pt-2 print-avoid-break">
                    <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-slate-600 rounded-xs" />
                      <span>4.3 ALV 툴바 기능 명세 (LVC_T_STB Toolbar Functions)</span>
                    </h3>
                    <div className="border border-slate-300 rounded overflow-hidden">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead className="bg-[#f1f5f9] border-b border-slate-300 text-slate-700 font-semibold text-[11px]">
                          <tr>
                            <th className="p-1.5 border-r border-slate-300 w-12 text-center">No</th>
                            <th className="p-1.5 border-r border-slate-300 w-32 font-mono">
                              기능 코드 (Function)
                            </th>
                            <th className="p-1.5 border-r border-slate-300 w-36">
                              버튼 텍스트 (Text)
                            </th>
                            <th className="p-1.5 border-r border-slate-300">
                              툴팁 설명 (Quickinfo)
                            </th>
                            <th className="p-1.5 w-24 text-center">버튼 유형</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-[11px]">
                          {activeToolbarButtons.map((btn, idx) => (
                            <tr key={btn.id || idx}>
                              <td className="p-1.5 border-r border-slate-200 text-center font-mono text-slate-500">
                                {idx + 1}
                              </td>
                              <td className="p-1.5 border-r border-slate-200 font-mono font-bold text-blue-900">
                                {btn.function}
                              </td>
                              <td className="p-1.5 border-r border-slate-200 font-semibold text-slate-800">
                                {btn.text}
                              </td>
                              <td className="p-1.5 border-r border-slate-200 text-slate-600">
                                {btn.quickinfo || '-'}
                              </td>
                              <td className="p-1.5 text-center font-mono text-[10px]">
                                {btn.is_standard ? (
                                  <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                                    SAP 표준
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">
                                    커스텀
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </section>
            </div>

            {renderRunningFooter(2)}
          </div>

          {/* ========================================================================= */}
          {/* PAGE 3 (Only when Master-Detail 02 is active): ITEM ALV GRID SPECIFICATION*/}
          {/* ========================================================================= */}
          {isMasterDetail && spec.item_grid && (
            <div
              id="sap-page-3"
              className={`${
                isPageVisibleOnScreen(3) ? 'sap-a4-sheet' : 'hidden print:sap-a4-sheet'
              } ${viewMode === 'all' ? 'mb-8 print:mb-0' : ''}`}
            >
              <div className="space-y-6">
                {renderRunningHeader(3)}

                <section className="space-y-4 print-avoid-break">
                  <h2 className="text-sm font-bold text-indigo-950 flex items-center gap-2 pb-1 border-b-2 border-indigo-900">
                    <span className="px-1.5 py-0.5 rounded bg-indigo-900 text-white font-mono text-[10px]">
                      04.2
                    </span>
                    <span>
                      4.2 Item ALV Grid 품목 그리드 상세 명세 (VBAP Detail Specification)
                    </span>
                  </h2>

                  <div className="bg-indigo-50/70 border border-indigo-200 rounded p-3 text-xs space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-indigo-900">외래키(Foreign Key) 연계:</span>
                      <span className="font-mono px-2 py-0.5 bg-indigo-100 text-indigo-900 rounded font-bold">
                        {spec.item_grid.foreign_key || 'VBELN'}
                      </span>
                      <span className="text-slate-600 text-[11px]">
                        (헤더 ALV 행 클릭 시 해당 오더 번호의 하위 품목을 필터링하여 출력)
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600">
                      레이아웃:{' '}
                      <span className="font-bold text-slate-800">
                        {spec.item_grid.layout?.grid_title || '품목 상세 ALV 그리드'}
                      </span>{' '}
                      | 총 {spec.item_grid.field_catalog.length}개 필드 카탈로그
                    </div>
                  </div>

                  <div className="border border-indigo-200 rounded overflow-x-auto print-avoid-break">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="bg-[#eef2ff] border-b border-indigo-300 text-indigo-950 font-semibold text-[11px]">
                        <tr>
                          <th className="p-1.5 border-r border-indigo-200 text-center w-8">No</th>
                          <th className="p-1.5 border-r border-indigo-200 min-w-24">필드명</th>
                          <th className="p-1.5 border-r border-indigo-200 min-w-28">컬럼명 (라벨)</th>
                          <th className="p-1.5 border-r border-indigo-200 w-16">타입</th>
                          <th className="p-1.5 border-r border-indigo-200 text-center w-10">길이</th>
                          <th className="p-1.5 border-r border-indigo-200 text-center w-10">정렬</th>
                          <th className="p-1.5 border-r border-indigo-200 text-center w-10">Key</th>
                          <th className="p-1.5 border-r border-indigo-200 text-center w-10">Sum</th>
                          <th className="p-1.5 min-w-28">참조 테이블/필드</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-indigo-100 font-mono text-[11px]">
                        {spec.item_grid.field_catalog.map((f) => (
                          <tr key={f.fieldname} className="hover:bg-indigo-50/40">
                            <td className="p-1.5 border-r border-indigo-100 text-center text-slate-500 font-bold">
                              {f.col_pos}
                            </td>
                            <td className="p-1.5 border-r border-indigo-100 font-bold text-indigo-950">
                              {f.fieldname}
                            </td>
                            <td className="p-1.5 border-r border-indigo-100 font-sans text-slate-800">
                              {f.coltext}
                            </td>
                            <td className="p-1.5 border-r border-indigo-100 text-slate-600">
                              {f.datatype}
                            </td>
                            <td className="p-1.5 border-r border-indigo-100 text-center">
                              {f.outputlen}
                            </td>
                            <td className="p-1.5 border-r border-indigo-100 text-center">
                              {f.just}
                            </td>
                            <td className="p-1.5 border-r border-indigo-100 text-center font-bold text-blue-700">
                              {f.key ? 'O' : '-'}
                            </td>
                            <td className="p-1.5 border-r border-indigo-100 text-center font-bold text-emerald-700">
                              {f.do_sum ? 'O' : '-'}
                            </td>
                            <td className="p-1.5 text-[10px] text-slate-500">
                              {f.ref_table ? `${f.ref_table}-${f.ref_field}` : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>

              {renderRunningFooter(3)}
            </div>
          )}

          {/* ========================================================================= */}
          {/* LOGIC & FLOWCHART PAGE (Page 3 for Single ALV, Page 4 for Master-Detail)   */}
          {/* ========================================================================= */}
          {(() => {
            const pageNo = isMasterDetail ? 4 : 3;
            return (
              <div
                id={`sap-page-${pageNo}`}
                className={`${
                  isPageVisibleOnScreen(pageNo) ? 'sap-a4-sheet' : 'hidden print:sap-a4-sheet'
                } ${viewMode === 'all' ? 'mb-8 print:mb-0' : ''}`}
              >
                <div className="space-y-5">
                  {renderRunningHeader(pageNo)}

                  {/* SECTION 5: 데이터 추출 및 업무 처리 로직 명세 */}
                  <section className="space-y-3 print-avoid-break">
                    <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-1 border-b-2 border-slate-800">
                      <span className="px-1.5 py-0.5 rounded bg-blue-800 text-white font-mono text-[10px]">
                        05
                      </span>
                      <span>
                        5. 데이터 추출 및 업무 처리 로직 명세 (Data Extraction & Processing Logic)
                      </span>
                    </h2>

                    {/* Code / Logic box: High contrast light format optimized for print ink */}
                    <div className="p-3.5 bg-slate-50 text-slate-900 rounded border border-slate-300 font-mono text-xs leading-relaxed whitespace-pre-line shadow-2xs">
                      {spec.data_extraction_logic}
                    </div>

                    {/* 5.1 Program Process Flow Diagram */}
                    {includeDataFlow && (
                      <div className="space-y-2 pt-1 print-avoid-break">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <span className="w-2 h-2 bg-blue-600 rounded-xs" />
                            <span>5.1 프로그램 처리 흐름도 (Data Flow Diagram)</span>
                          </h3>
                          <span className="text-[10px] font-mono text-slate-500">
                            표준 순서도 다이어그램 벡터 뷰
                          </span>
                        </div>
                        <div className="border border-slate-300 rounded-lg p-2 bg-white flex justify-center overflow-visible">
                          <InteractiveDataFlowCanvas
                            spec={spec}
                            config={spec.data_flow}
                            onChange={() => {}}
                            readOnly
                          />
                        </div>
                      </div>
                    )}
                  </section>
                </div>

                {renderRunningFooter(pageNo)}
              </div>
            );
          })()}

          {/* ========================================================================= */}
          {/* TESTING & MOCK RESULT PAGE (Page 4 for Single ALV, Page 5 for Master-Detail)*/}
          {/* ========================================================================= */}
          {(() => {
            const pageNo = isMasterDetail ? 5 : 4;
            return (
              <div
                id={`sap-page-${pageNo}`}
                className={`${
                  isPageVisibleOnScreen(pageNo) ? 'sap-a4-sheet' : 'hidden print:sap-a4-sheet'
                } ${viewMode === 'all' ? 'mb-8 print:mb-0' : ''}`}
              >
                <div className="space-y-5">
                  {renderRunningHeader(pageNo)}

                  {/* SECTION 6: 테스트 케이스 명세 */}
                  <section className="space-y-2 print-avoid-break">
                    <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-1 border-b-2 border-slate-800">
                      <span className="px-1.5 py-0.5 rounded bg-blue-800 text-white font-mono text-[10px]">
                        06
                      </span>
                      <span>
                        6. 단위 및 통합 테스트 케이스 명세 (Test Cases & Verification Scenarios)
                      </span>
                    </h2>
                    <div className="border border-slate-300 rounded overflow-hidden">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead className="bg-[#e4edf7] border-b border-slate-300 text-slate-800 font-semibold text-[11px]">
                          <tr>
                            <th className="p-2 border-r border-slate-300 text-center w-10">No</th>
                            <th className="p-2 border-r border-slate-300 w-44">시나리오 (Scenario)</th>
                            <th className="p-2 border-r border-slate-300">입력 조건 (Condition)</th>
                            <th className="p-2">예상 결과 (Expected Result)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-[11px]">
                          {spec.test_cases.map((tc, idx) => (
                            <tr key={tc.id}>
                              <td className="p-2 border-r border-slate-200 text-center font-mono font-bold text-slate-500">
                                {idx + 1}
                              </td>
                              <td className="p-2 border-r border-slate-200 font-semibold text-slate-900">
                                {tc.scenario}
                              </td>
                              <td className="p-2 border-r border-slate-200 text-slate-700">
                                {tc.condition}
                              </td>
                              <td className="p-2 font-semibold text-emerald-800">
                                {tc.expected}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  {/* SECTION 7: ALV 그리드 모의 출력 데이터 스냅샷 (Mock Data Snapshot) */}
                  {includeMockSnapshot && (
                    <section className="space-y-3 print-avoid-break">
                      <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-1 border-b-2 border-slate-800">
                        <span className="px-1.5 py-0.5 rounded bg-blue-800 text-white font-mono text-[10px]">
                          07
                        </span>
                        <span>
                          7. ALV Grid 실제 화면 모의 출력 데이터 검증 (Mock Data Snapshot)
                        </span>
                      </h2>

                      {/* 7.1 Header Mock Data Table */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                          <span>
                            7.1{' '}
                            {isMasterDetail
                              ? 'Header ALV Grid 모의 데이터'
                              : 'ALV 그리드 출력 결과'}{' '}
                            (총 {spec.mock_rows?.length || 0}건)
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">
                            상태(ZICON) 및 합계(DO_SUM) 연동 검증
                          </span>
                        </div>

                        <div className="border border-slate-300 rounded overflow-x-auto print-avoid-break">
                          <table className="w-full text-xs text-left border-collapse whitespace-nowrap">
                            <thead className="bg-[#d8e4f0] border-b border-slate-300 text-slate-900 font-semibold text-[11px]">
                              <tr>
                                <th className="p-1.5 border-r border-slate-300 w-8 text-center bg-[#c8d8ea]">
                                  #
                                </th>
                                {spec.field_catalog.map((f) => (
                                  <th
                                    key={f.fieldname}
                                    className="p-1.5 border-r border-slate-300"
                                  >
                                    {f.coltext}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                              {(spec.mock_rows || []).slice(0, 8).map((row, rIdx) => {
                                const isZebra = !!spec.layout?.zebra && rIdx % 2 === 1;
                                return (
                                  <tr
                                    key={rIdx}
                                    className={isZebra ? 'bg-[#f8fafc]' : 'bg-white'}
                                  >
                                    <td className="p-1.5 border-r border-slate-200 text-center text-slate-500 font-semibold bg-slate-100">
                                      {rIdx + 1}
                                    </td>
                                    {spec.field_catalog.map((f) => {
                                      const val = row[f.fieldname];
                                      const isStatusField =
                                        f.fieldname === 'ZICON' ||
                                        f.fieldname === 'STATUS' ||
                                        f.fieldname === 'LIGHTS' ||
                                        f.coltext === '상태';

                                      const cellStyle = getSapAlvCellStyle(
                                        f.emphasize,
                                        f.key,
                                        false,
                                        isZebra
                                      );

                                      return (
                                        <td
                                          key={f.fieldname}
                                          className={`p-1.5 border-r border-slate-200 ${
                                            f.just === 'R'
                                              ? 'text-right'
                                              : f.just === 'C'
                                              ? 'text-center'
                                              : 'text-left'
                                          } ${cellStyle.bg} ${cellStyle.text}`}
                                        >
                                          {isStatusField ||
                                          val === '1' ||
                                          val === '2' ||
                                          val === '3' ? (
                                            <div className="flex items-center justify-center">
                                              {val === '1' || val === 1 ? (
                                                <span className="w-3 h-3 rounded-full bg-emerald-500 border border-emerald-700 shadow-xs inline-block" />
                                              ) : val === '2' || val === 2 ? (
                                                <span className="w-3 h-3 rounded-full bg-amber-400 border border-amber-600 shadow-xs inline-block" />
                                              ) : (
                                                <span className="w-3 h-3 rounded-full bg-rose-500 border border-rose-700 shadow-xs inline-block" />
                                              )}
                                            </div>
                                          ) : (
                                            <span>
                                              {typeof val === 'number'
                                                ? val.toLocaleString()
                                                : val !== undefined && val !== null
                                                ? String(val)
                                                : ''}
                                            </span>
                                          )}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                );
                              })}
                            </tbody>

                            {/* Header Total Row */}
                            {spec.field_catalog.some((f) => f.do_sum) && (
                              <tfoot className="bg-[#e4edf7] border-t-2 border-slate-400 font-bold text-slate-900">
                                <tr>
                                  <td className="p-1.5 border-r border-slate-300 text-center font-bold bg-[#c8d8ea]">
                                    Σ
                                  </td>
                                  {spec.field_catalog.map((f, idx) => {
                                    const hasSum = !!f.do_sum;
                                    const sumVal = headerTotals[f.fieldname];
                                    const isFirstCol =
                                      idx === 0 ||
                                      (idx === 1 &&
                                        (spec.field_catalog[0].fieldname === 'ZICON' ||
                                          spec.field_catalog[0].fieldname === 'STATUS'));
                                    return (
                                      <td
                                        key={f.fieldname}
                                        className={`p-1.5 border-r border-slate-300 font-mono ${
                                          hasSum
                                            ? 'text-right text-blue-900 font-extrabold bg-[#dbeafe]'
                                            : isFirstCol
                                            ? 'text-left text-slate-800'
                                            : 'text-center text-slate-400'
                                        }`}
                                      >
                                        {hasSum ? (
                                          <span>
                                            {Number(sumVal || 0).toLocaleString()}
                                          </span>
                                        ) : isFirstCol ? (
                                          <span>* 합계 (Total)</span>
                                        ) : (
                                          ''
                                        )}
                                      </td>
                                    );
                                  })}
                                </tr>
                              </tfoot>
                            )}
                          </table>
                        </div>
                      </div>

                      {/* 7.2 Item Mock Data Table (Master-Detail) */}
                      {isMasterDetail &&
                        spec.item_grid &&
                        spec.item_grid.mock_rows && (
                          <div className="space-y-1.5 pt-2 print-avoid-break">
                            <div className="flex items-center justify-between text-xs font-bold text-indigo-950">
                              <span>
                                7.2 Item ALV Grid 모의 데이터 (총{' '}
                                {spec.item_grid.mock_rows.length}건)
                              </span>
                              <span className="text-[10px] font-mono text-indigo-700">
                                헤더 오더(VBELN)별 품목 내역
                              </span>
                            </div>

                            <div className="border border-indigo-200 rounded overflow-x-auto">
                              <table className="w-full text-xs text-left border-collapse whitespace-nowrap">
                                <thead className="bg-[#e0e7ff] border-b border-indigo-200 text-indigo-950 font-semibold text-[11px]">
                                  <tr>
                                    <th className="p-1.5 border-r border-indigo-200 w-8 text-center bg-[#c7d2fe]">
                                      #
                                    </th>
                                    {spec.item_grid.field_catalog.map((f) => (
                                      <th
                                        key={f.fieldname}
                                        className="p-1.5 border-r border-indigo-200"
                                      >
                                        {f.coltext}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-indigo-100 font-mono text-[11px]">
                                  {spec.item_grid.mock_rows.slice(0, 6).map((row, rIdx) => {
                                    const isZebra =
                                      !!spec.item_grid?.layout?.zebra && rIdx % 2 === 1;
                                    return (
                                      <tr
                                        key={rIdx}
                                        className={isZebra ? 'bg-indigo-50/30' : 'bg-white'}
                                      >
                                        <td className="p-1.5 border-r border-indigo-100 text-center text-slate-500 font-semibold bg-indigo-50/60">
                                          {rIdx + 1}
                                        </td>
                                        {spec.item_grid!.field_catalog.map((f) => {
                                          const val = row[f.fieldname];
                                          const isStatusField =
                                            f.fieldname === 'ZICON' ||
                                            f.fieldname === 'STATUS' ||
                                            f.fieldname === 'LIGHTS' ||
                                            f.coltext === '상태';

                                          return (
                                            <td
                                              key={f.fieldname}
                                              className={`p-1.5 border-r border-indigo-100 ${
                                                f.just === 'R'
                                                  ? 'text-right'
                                                  : f.just === 'C'
                                                  ? 'text-center'
                                                  : 'text-left'
                                              }`}
                                            >
                                              {isStatusField ||
                                              val === '1' ||
                                              val === '2' ||
                                              val === '3' ? (
                                                <div className="flex items-center justify-center">
                                                  {val === '1' || val === 1 ? (
                                                    <span className="w-3 h-3 rounded-full bg-emerald-500 border border-emerald-700 shadow-xs inline-block" />
                                                  ) : val === '2' || val === 2 ? (
                                                    <span className="w-3 h-3 rounded-full bg-amber-400 border border-amber-600 shadow-xs inline-block" />
                                                  ) : (
                                                    <span className="w-3 h-3 rounded-full bg-rose-500 border border-rose-700 shadow-xs inline-block" />
                                                  )}
                                                </div>
                                              ) : (
                                                <span>
                                                  {typeof val === 'number'
                                                    ? val.toLocaleString()
                                                    : val !== undefined && val !== null
                                                    ? String(val)
                                                    : ''}
                                                </span>
                                              )}
                                            </td>
                                          );
                                        })}
                                      </tr>
                                    );
                                  })}
                                </tbody>

                                {/* Item Total Row */}
                                {spec.item_grid.field_catalog.some((f) => f.do_sum) && (
                                  <tfoot className="bg-[#e0e7ff] border-t-2 border-indigo-300 font-bold text-indigo-950">
                                    <tr>
                                      <td className="p-1.5 border-r border-indigo-200 text-center font-bold bg-[#c7d2fe]">
                                        Σ
                                      </td>
                                      {spec.item_grid.field_catalog.map((f, idx) => {
                                        const hasSum = !!f.do_sum;
                                        const sumVal = itemTotals[f.fieldname];
                                        const isFirstCol =
                                          idx === 0 ||
                                          (idx === 1 &&
                                            (spec.item_grid!.field_catalog[0].fieldname ===
                                              'ZICON' ||
                                              spec.item_grid!.field_catalog[0].fieldname ===
                                                'STATUS'));
                                        return (
                                          <td
                                            key={f.fieldname}
                                            className={`p-1.5 border-r border-indigo-200 font-mono ${
                                              hasSum
                                                ? 'text-right text-indigo-950 font-extrabold bg-[#c7d2fe]'
                                                : isFirstCol
                                                ? 'text-left text-slate-800'
                                                : 'text-center text-slate-400'
                                            }`}
                                          >
                                            {hasSum ? (
                                              <span>
                                                {Number(sumVal || 0).toLocaleString()}
                                              </span>
                                            ) : isFirstCol ? (
                                              <span>* 합계 (Total)</span>
                                            ) : (
                                              ''
                                            )}
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  </tfoot>
                                )}
                              </table>
                            </div>
                          </div>
                        )}
                    </section>
                  )}

                  {/* DOCUMENT COMPLIANCE & SIGN-OFF STATEMENT */}
                  <div className="border border-slate-300 bg-slate-50 p-3 rounded text-[11px] text-slate-600 space-y-1 print-avoid-break">
                    <p className="font-bold text-slate-800">
                      ■ 본 기능 개발 사양서는 SAP S/4HANA 표준 개발 규정 및 단위 테스트 가이드라인을 준수합니다.
                    </p>
                    <p>
                      모든 ALV 필드 속성(LVC_T_FCAT) 및 도메인 데이터 타입은 SAP Data Dictionary(SE11)와의 정합성을 보증하며, 승인 완료 후 운영 환경으로 이행 대상이 됩니다.
                    </p>
                  </div>
                </div>

                {renderRunningFooter(pageNo)}
              </div>
            );
          })()}
        </div>
      </div>

      {/* jsPDF Specification Export Modal */}
      <PdfExportModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        spec={spec}
      />
    </div>
  );
};
