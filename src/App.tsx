import React, { useState, useRef, useEffect } from 'react';
import { ProgramSpec } from './types/sap';
import { SAMPLE_SPECS } from './data/sampleSpecs';
import { TopNav, MainWorkspaceMode, DualSplitLayout } from './components/TopNav';
import { SpecEditor } from './components/SpecEditor';
import { SapGuiMockup } from './components/SapGuiMockup';
import { AbapCodeGenerator } from './components/AbapCodeGenerator';
import { SpecDocumentView } from './components/SpecDocumentView';
import { ProgramTemplateModal } from './components/ProgramTemplateModal';
import { PdfExportModal } from './components/PdfExportModal';
import { SapGuiTheme, DEFAULT_SAP_THEME } from './data/sapGuiThemes';
import { getCurrentUser, PRESET_USERS } from './utils/authStorage';

const DUAL_SPLIT_CYCLE: DualSplitLayout[] = [
  'top-bottom',
  'left-right',
  'bottom-top',
  'right-left',
];

export default function App() {
  const [currentSpec, setCurrentSpec] = useState<ProgramSpec>(SAMPLE_SPECS[0]);
  const [workspaceMode, setWorkspaceMode] = useState<MainWorkspaceMode>('split');
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isPdfExportModalOpen, setIsPdfExportModalOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<SapGuiTheme>(() => {
    try {
      const saved = localStorage.getItem('sap_gui_mockup_theme') as SapGuiTheme;
      if (saved) return saved;
    } catch {
      // ignore
    }
    return DEFAULT_SAP_THEME;
  });
  const [mockDataTrigger, setMockDataTrigger] = useState<number>(0);

  // Dual Screen Split Layout (상하, 좌우, 하상, 우좌) & Resizable Divider Ratio
  const [splitLayout, setSplitLayout] = useState<DualSplitLayout>(() => {
    try {
      const saved = localStorage.getItem('sap_spec_dual_split_layout') as DualSplitLayout;
      if (DUAL_SPLIT_CYCLE.includes(saved)) return saved;
    } catch {
      // ignore
    }
    return 'left-right';
  });
  const isVerticalSplit = splitLayout === 'top-bottom' || splitLayout === 'bottom-top';
  const isReversedSplit = splitLayout === 'bottom-top' || splitLayout === 'right-left';

  const [splitRatio, setSplitRatio] = useState<number>(() => {
    try {
      const saved = Number(localStorage.getItem('sap_spec_dual_split_ratio'));
      if (!isNaN(saved) && saved >= 20 && saved <= 80) return saved;
    } catch {
      // ignore
    }
    return 50;
  });
  const [isResizingSplit, setIsResizingSplit] = useState(false);
  const splitContainerRef = useRef<HTMLDivElement | null>(null);
  const splitRatioRef = useRef<number>(splitRatio);
  splitRatioRef.current = splitRatio;

  useEffect(() => {
    if (!isResizingSplit) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!splitContainerRef.current) return;
      const rect = splitContainerRef.current.getBoundingClientRect();
      let nextRatio = 50;
      if (!isVerticalSplit) {
        if (rect.width <= 0) return;
        nextRatio = ((e.clientX - rect.left) / rect.width) * 100;
      } else {
        if (rect.height <= 0) return;
        nextRatio = ((e.clientY - rect.top) / rect.height) * 100;
      }
      const clamped = Math.min(80, Math.max(20, Math.round(nextRatio * 10) / 10));
      splitRatioRef.current = clamped;
      setSplitRatio(clamped);
    };

    const handleMouseUp = () => {
      setIsResizingSplit(false);
      document.body.style.cursor = '';
      try {
        localStorage.setItem('sap_spec_dual_split_ratio', String(splitRatioRef.current));
      } catch {
        // ignore
      }
    };

    document.body.style.cursor = !isVerticalSplit ? 'col-resize' : 'row-resize';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.body.style.cursor = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingSplit, isVerticalSplit]);

  const handleCycleSplitLayout = () => {
    setSplitLayout((prev) => {
      const idx = DUAL_SPLIT_CYCLE.indexOf(prev);
      const next = DUAL_SPLIT_CYCLE[(idx + 1) % DUAL_SPLIT_CYCLE.length];
      try {
        localStorage.setItem('sap_spec_dual_split_layout', next);
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Create new blank specification
  const handleNewSpec = () => {
    const activeUser = getCurrentUser();
    const registeredAuthor = PRESET_USERS.some((u) => u.name === activeUser.name)
      ? activeUser.name
      : PRESET_USERS[0].name;

    const blankSpec: ProgramSpec = {
      id: `spec-custom-${Date.now()}`,
      program_id: 'ZR_CUSTOM_REPORT',
      tcode: 'ZREP01',
      title: '신규 ALV 그리드 레포트 프로그램',
      module: 'SD',
      author: registeredAuthor,
      created_date: new Date().toISOString().split('T')[0],
      target_sap_release: 'SAP S/4HANA 2023',
      program_type: 'REPORT',
      business_purpose: '신규 비즈니스 프로세스 데이터 조회를 위한 ALV 리포트입니다.',
      data_extraction_logic: '1. 조회 조건 및 데이터베이스 추출 로직을 정의하세요.',
      selection_params: [
        {
          id: 'p_bukrs',
          kind: 'PARAMETER',
          name: 'P_BUKRS',
          text: '회사코드 (Company Code)',
          ref_table: 'T001',
          ref_field: 'BUKRS',
          datatype: 'CHAR',
          length: 4,
          obligatory: true,
          default_val: '1000',
          low: '1000',
        },
        {
          id: 's_date',
          kind: 'SELECT_OPTION',
          name: 'S_DATE',
          text: '조회일자 (Posting Date)',
          datatype: 'DATS',
          length: 10,
          obligatory: true,
          default_val: 'SY-DATUM',
          low: '2026.10.01',
          high: '2026.10.31',
          sign: 'I',
          option: 'BT',
        },
      ],
      field_catalog: [
        {
          id: 'custom-f1',
          col_pos: 1,
          fieldname: 'ZICON',
          coltext: 'Status',
          datatype: 'CHAR',
          outputlen: 5,
          just: 'C',
          key: true,
          hotspot: false,
          checkbox: false,
          edit: false,
          do_sum: false,
          emphasize: '',
        },
        {
          id: 'custom-f2',
          col_pos: 2,
          fieldname: 'DOC_NO',
          coltext: '문서번호',
          datatype: 'CHAR',
          outputlen: 12,
          just: 'C',
          key: true,
          hotspot: true,
          checkbox: false,
          edit: false,
          do_sum: false,
          emphasize: '',
          drilldown_tcode: 'VA03',
        },
        {
          id: 'custom-f3',
          col_pos: 3,
          fieldname: 'DOC_DATE',
          coltext: '전기일자',
          datatype: 'DATS',
          outputlen: 10,
          just: 'C',
          key: false,
          hotspot: false,
          checkbox: false,
          edit: false,
          do_sum: false,
          emphasize: '',
        },
        {
          id: 'custom-f4',
          col_pos: 4,
          fieldname: 'PARTNER_NAME',
          coltext: '거래처명',
          datatype: 'CHAR',
          outputlen: 25,
          just: 'L',
          key: false,
          hotspot: false,
          checkbox: false,
          edit: false,
          do_sum: false,
          emphasize: '',
        },
        {
          id: 'custom-f5',
          col_pos: 5,
          fieldname: 'AMOUNT',
          coltext: '공급가액',
          datatype: 'CURR',
          outputlen: 15,
          just: 'R',
          key: false,
          hotspot: false,
          checkbox: false,
          edit: false,
          do_sum: true,
          emphasize: '',
        },
        {
          id: 'custom-f6',
          col_pos: 6,
          fieldname: 'CURRENCY',
          coltext: '통화',
          datatype: 'CHAR',
          outputlen: 5,
          just: 'C',
          key: false,
          hotspot: false,
          checkbox: false,
          edit: false,
          do_sum: false,
          emphasize: '',
        },
      ],
      layout: {
        zebra: true,
        grid_title: '신규 사용자 정의 레포트 ALV',
        sel_mode: 'A',
        cwidth_opt: true,
        totals_only: false,
        excp_fname: 'ZICON',
        excp_led: true,
        show_row_numbers: true,
      },
      custom_toolbar: [],
      test_cases: [
        {
          id: 'tc-new-1',
          scenario: '정상 데이터 조회',
          condition: '회사코드=1000 입력',
          expected: '그리드 정상 출력 확인',
        },
      ],
      mock_rows: [
        {
          ZICON: '1',
          DOC_NO: 'DOC-2026-001',
          DOC_DATE: '2026.10.10',
          PARTNER_NAME: '(주)삼성전자 수원공장',
          AMOUNT: 45000000,
          CURRENCY: 'KRW',
        },
        {
          ZICON: '2',
          DOC_NO: 'DOC-2026-002',
          DOC_DATE: '2026.10.15',
          PARTNER_NAME: '현대자동차 남양연구소',
          AMOUNT: 38200000,
          CURRENCY: 'KRW',
        },
        {
          ZICON: '3',
          DOC_NO: 'DOC-2026-003',
          DOC_DATE: '2026.10.22',
          PARTNER_NAME: 'LG에너지솔루션 오창',
          AMOUNT: 19800000,
          CURRENCY: 'KRW',
        },
      ],
    };

    setCurrentSpec(blankSpec);
    setWorkspaceMode('split');
  };

  // Trigger print-friendly view and PDF export
  const handleTriggerPrint = () => {
    setWorkspaceMode('document');
    setTimeout(() => {
      window.print();
    }, 280);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-900 text-slate-900 print:h-auto print:min-h-screen print:overflow-visible print:bg-white">
      {/* 1. Header Navigation Bar */}
      <TopNav
        currentMode={workspaceMode}
        onSelectMode={setWorkspaceMode}
        currentSpec={currentSpec}
        onSelectTemplate={(s) => setCurrentSpec(s)}
        onNewSpec={handleNewSpec}
        onTriggerPrint={handleTriggerPrint}
        onOpenTemplates={() => setIsTemplateModalOpen(true)}
        onExportPdf={() => setIsPdfExportModalOpen(true)}
        currentTheme={currentTheme}
        onSelectTheme={(t) => {
          setCurrentTheme(t);
          try {
            localStorage.setItem('sap_gui_mockup_theme', t);
          } catch {
            // ignore
          }
        }}
        onGenerateMockData={() => setMockDataTrigger((prev) => prev + 1)}
        splitLayout={splitLayout}
        onCycleSplitLayout={handleCycleSplitLayout}
      />

      {/* 2. Main Workspace Viewport */}
      <main className="flex-1 overflow-hidden p-3 bg-slate-950 print:p-0 print:bg-white print:overflow-visible print:h-auto">
        {workspaceMode === 'split' && (
          <div
            ref={splitContainerRef}
            className={`flex h-full overflow-hidden ${
              isVerticalSplit ? 'flex-col' : 'flex-row'
            } ${isResizingSplit ? 'select-none' : ''}`}
          >
            {/* SpecEditor Pane */}
            <div
              style={
                !isReversedSplit
                  ? !isVerticalSplit
                    ? { width: `calc(${splitRatio}% - 6px)` }
                    : { height: `calc(${splitRatio}% - 6px)` }
                  : undefined
              }
              className={`${
                isReversedSplit ? 'order-3 flex-1' : 'order-1 shrink-0'
              } ${isVerticalSplit ? 'w-full' : 'h-full'} overflow-hidden min-w-0 min-h-0`}
            >
              <SpecEditor
                spec={currentSpec}
                onChange={(updated) => setCurrentSpec(updated)}
                onTriggerPrint={handleTriggerPrint}
                onOpenTemplates={() => setIsTemplateModalOpen(true)}
              />
            </div>

            {/* Interactive Resizable Divider */}
            <div
              role="separator"
              aria-orientation={!isVerticalSplit ? 'vertical' : 'horizontal'}
              aria-label="창 크기 조절 경계선"
              title="드래그하여 창 크기 조절 (더블클릭: 50:50 초기화)"
              onMouseDown={(e) => {
                e.preventDefault();
                setIsResizingSplit(true);
              }}
              onDoubleClick={() => {
                setSplitRatio(50);
                try {
                  localStorage.setItem('sap_spec_dual_split_ratio', '50');
                } catch {
                  // ignore
                }
              }}
              className={`order-2 shrink-0 flex items-center justify-center group transition-colors ${
                !isVerticalSplit
                  ? 'w-3 h-full cursor-col-resize'
                  : 'h-3 w-full cursor-row-resize'
              }`}
            >
              <div
                className={`rounded-full transition-colors ${
                  isResizingSplit
                    ? 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]'
                    : 'bg-slate-700 group-hover:bg-blue-400'
                } ${
                  !isVerticalSplit
                    ? 'w-1 h-12 group-hover:h-20'
                    : 'h-1 w-12 group-hover:w-20'
                }`}
              />
            </div>

            {/* Real-time Interactive SAP GUI Mockup Pane */}
            <div
              style={
                isReversedSplit
                  ? !isVerticalSplit
                    ? { width: `calc(${splitRatio}% - 6px)` }
                    : { height: `calc(${splitRatio}% - 6px)` }
                  : undefined
              }
              className={`${
                isReversedSplit ? 'order-1 shrink-0' : 'order-3 flex-1'
              } ${isVerticalSplit ? 'w-full' : 'h-full'} overflow-hidden min-w-0 min-h-0`}
            >
              <SapGuiMockup
                spec={currentSpec}
                onUpdateSpec={(updated) => setCurrentSpec(updated)}
                currentTheme={currentTheme}
                onSelectTheme={setCurrentTheme}
                mockDataTrigger={mockDataTrigger}
              />
            </div>
          </div>
        )}

        {workspaceMode === 'mockup_only' && (
          <div className="h-full max-w-7xl mx-auto overflow-hidden">
            <SapGuiMockup
              spec={currentSpec}
              onUpdateSpec={(updated) => setCurrentSpec(updated)}
              currentTheme={currentTheme}
              onSelectTheme={setCurrentTheme}
              mockDataTrigger={mockDataTrigger}
            />
          </div>
        )}

        {workspaceMode === 'editor_only' && (
          <div className="h-full max-w-6xl mx-auto overflow-hidden">
            <SpecEditor
              spec={currentSpec}
              onChange={(updated) => setCurrentSpec(updated)}
              onTriggerPrint={handleTriggerPrint}
              onOpenTemplates={() => setIsTemplateModalOpen(true)}
            />
          </div>
        )}

        {workspaceMode === 'abap_code' && (
          <div className="h-full max-w-6xl mx-auto overflow-hidden">
            <AbapCodeGenerator spec={currentSpec} />
          </div>
        )}

        {workspaceMode === 'document' && (
          <div className="h-full w-full overflow-hidden print:overflow-visible print:h-auto">
            <SpecDocumentView
              spec={currentSpec}
              onImportSpec={(imported) => setCurrentSpec(imported)}
              onReturnToWorkspace={() => setWorkspaceMode('split')}
            />
          </div>
        )}
      </main>

      {/* Program Templates Management Modal */}
      <ProgramTemplateModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        currentSpec={currentSpec}
        onSelectTemplate={(s) => {
          setCurrentSpec(s);
          setIsTemplateModalOpen(false);
        }}
      />

      {/* jsPDF Specification Export Modal */}
      <PdfExportModal
        isOpen={isPdfExportModalOpen}
        onClose={() => setIsPdfExportModalOpen(false)}
        spec={currentSpec}
      />
    </div>
  );
}
