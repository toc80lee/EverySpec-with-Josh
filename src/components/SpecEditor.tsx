import React, { useState, useMemo, useEffect } from 'react';
import {
  FileText,
  Database,
  Sliders,
  Layout,
  CheckCircle,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Info,
  Plus,
  Trash2,
  Table,
  Mic,
  MicOff,
  Sparkles,
  Loader2,
  Check,
  Download,
  Upload,
  Layers,
  Printer,
  X,
  Search,
  ListOrdered,
  FileDown,
  FolderOpen,
  Code,
} from 'lucide-react';
import { PdfExportModal } from './PdfExportModal';
import { SpecManagerModal } from './SpecManagerModal';
import { SourceCodeEditor } from './SourceCodeEditor';
import {
  ProgramSpec,
  SapModule,
  TestCase,
  AlvToolbarButton,
  AlvLayout,
  AlvField,
  SelectionParameter,
  SelectionKind,
  SapDataType,
} from '../types/sap';
import { FieldCatalogEditor } from './FieldCatalogEditor';
import { AlvSortEditor } from './AlvSortEditor';
import { AlvLayoutSpreadsheet } from './AlvLayoutSpreadsheet';
import { SelectionScreenEditor } from './SelectionScreenEditor';
import { ToolbarEditor } from './ToolbarEditor';
import { DataFlowEditor } from './DataFlowEditor';
import { MarkdownFieldEditor } from './MarkdownFieldEditor';
import { SapSearchHelpModal } from './SapSearchHelpModal';
import { DEFAULT_ALV_TOOLBAR_BUTTONS } from '../data/defaultToolbarButtons';
import { SAMPLE_SPECS } from '../data/sampleSpecs';
import { useVoiceInput } from '../hooks/useVoiceInput';
import { requestAiLogicGeneration } from '../utils/aiLogicGenerator';
import { downloadExcelTemplate, parseUploadedExcelOrCsv } from '../utils/excelTemplateHelper';
import { validateSapTCode, suggestCustomerTCode } from '../utils/sapValidation';

interface SpecEditorProps {
  spec: ProgramSpec;
  onChange: (updated: ProgramSpec) => void;
  onTriggerPrint?: () => void;
  onOpenTemplates?: () => void;
}

export const SpecEditor: React.FC<SpecEditorProps> = ({
  spec,
  onChange,
  onTriggerPrint,
  onOpenTemplates,
}) => {
  // Main Tabs: 1. Program Spec -> 2. Selection Screen -> 3. Main Screen -> 4. Source Code (RFQ v1.19)
  const [mainTab, setMainTab] = useState<'info' | 'selection' | 'alv' | 'source'>('info');

  // Subtabs for Program Spec (RFQ v1.07 Page 3 & 4):
  // 1. Basic Information & Specification
  // 2. Data Flow Diagram (Visual Program Flowchart)
  const [specSubTab, setSpecSubTab] = useState<'basic' | 'flow'>('basic');
  const [isSpecManagerOpen, setIsSpecManagerOpen] = useState(false);

  // Master-Detail ALV Sub-Grid Selector: Header ALV Grid vs Item ALV Grid
  const [activeGridTab, setActiveGridTab] = useState<'header' | 'item'>('header');

  const [alvSubTab, setAlvSubTab] = useState<'layout' | 'fields' | 'sort' | 'toolbar' | 'tests'>('layout');

  // RFQ v1.18: In Sample Type 03, Tree tab hides Sort sub-tab
  const isTreeTab = spec.sample_type === '03' && activeGridTab === 'header';

  useEffect(() => {
    if (isTreeTab && alvSubTab === 'sort') {
      setAlvSubTab('fields');
    }
  }, [isTreeTab, alvSubTab]);

  const [isGeneratingLogic, setIsGeneratingLogic] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);

  // SAP T-Code Naming Standard Validation (Customer Namespace: Z... or Y...)
  const tcodeValidation = useMemo(() => validateSapTCode(spec.tcode), [spec.tcode]);
  const [tcodeAlertNotice, setTcodeAlertNotice] = useState<string | null>(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  // Dynamic Selection Param Addition State & Function
  const [showAddParamModal, setShowAddParamModal] = useState(false);
  const [showParamSearchHelp, setShowParamSearchHelp] = useState(false);
  const [newParamForm, setNewParamForm] = useState<{
    kind: SelectionKind;
    name: string;
    datatype: SapDataType;
    length: number;
    text: string;
    ref_table: string;
    ref_field: string;
    obligatory: boolean;
    default_val: string;
  }>({
    kind: 'PARAMETER',
    name: 'P_BUKRS',
    datatype: 'CHAR',
    length: 4,
    text: '회사코드',
    ref_table: 'T001',
    ref_field: 'BUKRS',
    obligatory: true,
    default_val: '1000',
  });

  /**
   * Dynamically adds a new input field (Parameters or Select-Options) to the selection_params array,
   * including inputs for field name, data type, and length.
   */
  const handleAddSelectionParam = (paramData?: {
    kind?: SelectionKind;
    name?: string;
    datatype?: SapDataType;
    length?: number;
    text?: string;
    ref_table?: string;
    ref_field?: string;
    obligatory?: boolean;
    default_val?: string;
  }): SelectionParameter => {
    const kind: SelectionKind = paramData?.kind || 'PARAMETER';
    const isParam = kind === 'PARAMETER';
    const nextIdx = spec.selection_params.length + 1;

    // Field Name: e.g. P_BUKRS, S_VBELN
    const defaultName = isParam ? `P_FLD${nextIdx}` : `S_FLD${nextIdx}`;
    const name = (paramData?.name || defaultName).trim().toUpperCase();

    // Data Type: e.g. CHAR, DATS, CURR, etc.
    const datatype: SapDataType = paramData?.datatype || 'CHAR';

    // Length: e.g. 10, 4, 18, 8
    const length =
      Number(paramData?.length) > 0
        ? Number(paramData?.length)
        : datatype === 'DATS'
        ? 8
        : datatype === 'TIMS'
        ? 6
        : 10;

    const newParam: SelectionParameter = {
      id: `param-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      kind,
      name,
      datatype,
      length,
      text: paramData?.text?.trim() || (isParam ? `파라미터 항목 ${nextIdx}` : `선택 범위 항목 ${nextIdx}`),
      ref_table: paramData?.ref_table?.trim().toUpperCase() || '',
      ref_field: paramData?.ref_field?.trim().toUpperCase() || '',
      obligatory: !!paramData?.obligatory,
      default_val: paramData?.default_val?.trim() || '',
      low: '',
      high: '',
      sign: 'I',
      option: 'EQ',
    };

    const updated = [...spec.selection_params, newParam];
    onChange({ ...spec, selection_params: updated });
    return newParam;
  };

  // Voice input for Business Purpose
  const businessVoice = useVoiceInput({
    lang: 'ko-KR',
    onResult: (finalText) => {
      const prev = spec.business_purpose || '';
      const updated = prev ? `${prev} ${finalText}` : finalText;
      onChange({ ...spec, business_purpose: updated });
    },
  });

  // Voice input for Extraction Logic
  const logicVoice = useVoiceInput({
    lang: 'ko-KR',
    onResult: (finalText) => {
      const prev = spec.data_extraction_logic || '';
      const updated = prev ? `${prev}\n${finalText}` : finalText;
      onChange({ ...spec, data_extraction_logic: updated });
    },
  });

  // Handle AI Logic Proposal
  const handleSuggestLogic = async () => {
    if (!spec.business_purpose?.trim()) {
      setAiError("먼저 '업무 개요 및 개발 목적'을 텍스트 또는 상단 '음성 입력'으로 입력해주세요.");
      setTimeout(() => setAiError(null), 6000);
      return;
    }

    setIsGeneratingLogic(true);
    setAiMessage(null);
    setAiError(null);
    try {
      const res = await requestAiLogicGeneration({
        business_purpose: spec.business_purpose,
        module: spec.module,
        program_id: spec.program_id,
        title: spec.title,
        existing_fields: spec.field_catalog.map(f => f.fieldname),
      });

      onChange({
        ...spec,
        data_extraction_logic: res.logic,
      });

      setAiMessage(
        res.source === 'ai'
          ? 'Gemini AI가 제안한 데이터 추출 및 가공 로직이 적용되었습니다. 필요에 맞게 자유롭게 수정하세요.'
          : 'SAP 모듈 표준 추출 로직이 제안되었습니다. 필요에 맞게 자유롭게 수정하세요.'
      );
      setTimeout(() => setAiMessage(null), 7000);
    } catch (err: any) {
      setAiError(`로직 생성 중 오류가 발생했습니다: ${err.message}`);
      setTimeout(() => setAiError(null), 7000);
    } finally {
      setIsGeneratingLogic(false);
    }
  };

  // Switch or configure sample type (01: Single ALV, 02: Master-Detail, 03: Tree ALV)
  const handleSampleTypeChange = (newType: string) => {
    const foundSample = SAMPLE_SPECS.find(s => s.sample_type === newType);
    if (foundSample) {
      onChange({
        ...foundSample,
        id: spec.id,
        sample_type: newType,
      });
    } else {
      onChange({
        ...spec,
        sample_type: newType,
      });
    }
  };

  // Master-Detail / Dual ALV resolution (Sample Type 02 & Sample Type 03)
  const isMasterDetail = spec.sample_type === '02' || spec.sample_type === '03';
  const activeIsItem = isMasterDetail && activeGridTab === 'item';

  const defaultItemLayout: AlvLayout = {
    zebra: true,
    grid_title: spec.sample_type === '03' ? 'Flight Schedule ALV Grid' : '영업 오더 품목 ALV Grid (VBAP)',
    sel_mode: 'A',
    cwidth_opt: true,
    totals_only: false,
    excp_fname: 'ZICON',
    excp_led: true,
    show_row_numbers: true,
  };

  const activeLayout = activeIsItem
    ? (spec.item_grid?.layout || defaultItemLayout)
    : spec.layout;

  const activeFieldCatalog = activeIsItem
    ? (spec.item_grid?.field_catalog || [])
    : spec.field_catalog;

  const activeToolbarButtons = activeIsItem
    ? (spec.item_grid?.toolbar_buttons || DEFAULT_ALV_TOOLBAR_BUTTONS)
    : (spec.toolbar_buttons || DEFAULT_ALV_TOOLBAR_BUTTONS);

  const activeTestCases = activeIsItem
    ? (spec.item_grid?.test_cases || [])
    : spec.test_cases;

  const activeMockRows = activeIsItem
    ? (spec.item_grid?.mock_rows || [])
    : (spec.mock_rows || []);

  const updateActiveLayout = (newLayout: AlvLayout) => {
    if (activeIsItem) {
      onChange({
        ...spec,
        item_grid: {
          ...(spec.item_grid || {
            grid_name: 'Item ALV Grid',
            layout: newLayout,
            field_catalog: [],
            mock_rows: [],
            foreign_key: 'VBELN',
          }),
          layout: newLayout,
        },
      });
    } else {
      onChange({ ...spec, layout: newLayout });
    }
  };

  const updateActiveFieldCatalog = (newCatalog: AlvField[], newMockRows?: Record<string, any>[]) => {
    if (activeIsItem) {
      onChange({
        ...spec,
        item_grid: {
          ...(spec.item_grid || {
            grid_name: spec.sample_type === '03' ? 'Flight Schedule Grid' : 'Item ALV Grid',
            layout: defaultItemLayout,
            field_catalog: [],
            mock_rows: [],
            foreign_key: spec.sample_type === '03' ? 'CARRID' : 'VBELN',
          }),
          field_catalog: newCatalog,
          ...(newMockRows ? { mock_rows: newMockRows } : {}),
        },
      });
    } else {
      onChange({
        ...spec,
        field_catalog: newCatalog,
        ...(newMockRows ? { mock_rows: newMockRows } : {}),
      });
    }
  };

  const handleReorderFieldCatalog = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || toIndex < 0 || toIndex >= activeFieldCatalog.length) return;
    const list = [...activeFieldCatalog];
    const [movedItem] = list.splice(fromIndex, 1);
    list.splice(toIndex, 0, movedItem);

    // Automatically update col_pos for each field accordingly (1-indexed sequential: 1, 2, 3...)
    const renumbered = list.map((field, idx) => ({
      ...field,
      col_pos: idx + 1,
    }));

    updateActiveFieldCatalog(renumbered);
  };

  const updateActiveToolbarButtons = (newButtons: AlvToolbarButton[]) => {
    if (activeIsItem) {
      onChange({
        ...spec,
        item_grid: {
          ...(spec.item_grid || {
            grid_name: 'Item ALV Grid',
            layout: defaultItemLayout,
            field_catalog: [],
            mock_rows: [],
            foreign_key: 'VBELN',
          }),
          toolbar_buttons: newButtons,
        },
      });
    } else {
      onChange({ ...spec, toolbar_buttons: newButtons });
    }
  };

  const updateActiveTestCases = (newTestCases: TestCase[]) => {
    if (activeIsItem) {
      onChange({
        ...spec,
        item_grid: {
          ...(spec.item_grid || {
            grid_name: 'Item ALV Grid',
            layout: defaultItemLayout,
            field_catalog: [],
            mock_rows: [],
            foreign_key: 'VBELN',
          }),
          test_cases: newTestCases,
        },
      });
    } else {
      onChange({ ...spec, test_cases: newTestCases });
    }
  };

  const updateActiveMockRows = (newRows: Record<string, any>[]) => {
    if (activeIsItem) {
      onChange({
        ...spec,
        item_grid: {
          ...(spec.item_grid || {
            grid_name: 'Item ALV Grid',
            layout: defaultItemLayout,
            field_catalog: [],
            mock_rows: [],
            foreign_key: 'VBELN',
          }),
          mock_rows: newRows,
        },
      });
    } else {
      onChange({ ...spec, mock_rows: newRows });
    }
  };

  // Add test case for active grid
  const handleAddTestCase = () => {
    const nextIdx = activeTestCases.length + 1;
    const newTc: TestCase = {
      id: `tc-${Date.now()}`,
      scenario: `시나리오 ${nextIdx}: 정상 데이터 검증`,
      condition: '입력 조건 설정',
      expected: '예상 결과 확인',
    };
    updateActiveTestCases([...activeTestCases, newTc]);
  };

  // Excel / CSV File Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const parsed = parseUploadedExcelOrCsv(text, activeFieldCatalog);
      if (parsed.errors && parsed.errors.length > 0) {
        setUploadNotice(`업로드 오류: ${parsed.errors.join(', ')}`);
        setTimeout(() => setUploadNotice(null), 6000);
        return;
      }

      if (parsed.rows.length === 0) {
        setUploadNotice('업로드된 파일에 유효한 데이터 행이 없습니다.');
        setTimeout(() => setUploadNotice(null), 6000);
        return;
      }

      updateActiveMockRows(parsed.rows);
      setUploadNotice(
        `총 ${parsed.rows.length}건의 테스트 데이터가 ALV Grid에 반영되었습니다. 모든 상태 필드가 정상(녹색 '1')으로 지정되었습니다.`
      );
      setTimeout(() => setUploadNotice(null), 7000);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const toolbarButtonsCount = activeToolbarButtons.filter(b => b.visible !== false).length;

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden font-sans">
      {/* 1. Main Tab Navigation */}
      <div className="flex items-center justify-between border-b border-slate-200 px-4 bg-slate-50 overflow-x-auto">
        <div className="flex items-center gap-1 py-1.5">
          {/* Main Tab 1: Program Spec */}
          <button
            type="button"
            onClick={() => setMainTab('info')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 relative cursor-pointer ${
              mainTab === 'info'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
            title="Program Spec"
            aria-label="Program Spec"
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span>Program Spec</span>
            {!tcodeValidation.isValid && (
              <span
                className="w-2 h-2 rounded-full bg-amber-400 ring-2 ring-white animate-pulse shrink-0"
                title={`SAP T-Code 표준 위반: ${tcodeValidation.message}`}
              />
            )}
          </button>

          {/* Main Tab 2: Selection Screen */}
          <button
            type="button"
            onClick={() => setMainTab('selection')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 relative cursor-pointer ${
              mainTab === 'selection'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
            title="Selection Screen"
            aria-label="Selection Screen"
          >
            <Sliders className="w-4 h-4 shrink-0" />
            <span>Selection Screen</span>
          </button>

          {/* Main Tab 3: Main Screen */}
          <button
            type="button"
            onClick={() => setMainTab('alv')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 relative cursor-pointer ${
              mainTab === 'alv'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
            title="Main Screen"
            aria-label="Main Screen"
          >
            <Table className="w-4 h-4 shrink-0" />
            <span>Main Screen</span>
          </button>

          {/* Main Tab 4: Source Code (RFQ v1.19) */}
          <button
            type="button"
            onClick={() => setMainTab('source')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 relative cursor-pointer ${
              mainTab === 'source'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
            title="Source Code"
            aria-label="Source Code"
          >
            <Code className="w-4 h-4 shrink-0" />
            <span>Source Code</span>
          </button>
        </div>

        {/* Right side quick actions: Spec List, Export PDF & Templates (Icon only per RFQ v1.10 Page 1 & 2) */}
        <div className="flex items-center gap-1.5 py-1.5">
          {/* Spec List Button (Icon only) */}
          <button
            type="button"
            onClick={() => setIsSpecManagerOpen(true)}
            className="p-2 text-slate-700 bg-white hover:bg-slate-100 hover:text-blue-700 border border-slate-300 rounded-md transition-colors flex items-center justify-center shadow-2xs cursor-pointer"
            title="Spec List"
            aria-label="Spec List"
          >
            <FolderOpen className="w-4 h-4 text-blue-600" />
          </button>

          {/* Export PDF Button (Icon only) */}
          <button
            type="button"
            onClick={() => setIsPdfModalOpen(true)}
            className="p-2 text-slate-700 bg-white hover:bg-slate-100 hover:text-blue-700 border border-slate-300 rounded-md transition-colors flex items-center justify-center shadow-2xs cursor-pointer"
            title="Export PDF"
            aria-label="Export PDF"
          >
            <FileDown className="w-4 h-4 text-blue-600" />
          </button>

          {/* Templates Button (Icon only) */}
          {onOpenTemplates && (
            <button
              type="button"
              onClick={onOpenTemplates}
              className="p-2 text-slate-700 bg-white hover:bg-slate-100 hover:text-blue-700 border border-slate-300 rounded-md transition-colors flex items-center justify-center shadow-2xs cursor-pointer"
              title="Templates"
              aria-label="Templates"
            >
              <Layers className="w-4 h-4 text-blue-600" />
            </button>
          )}
        </div>
      </div>

      {/* Editor Content Area */}
      <div className="flex-1 p-5 overflow-y-auto">
        {/* ========================================================================= */}
        {/* MAIN TAB 1: 프로그램 개요 & 로직 (Program Info & Logic)                    */}
        {/* ========================================================================= */}
        {mainTab === 'info' && (
          <div className="space-y-4 max-w-4xl">
            {/* Program Spec Sub-Tab Navigation (RFQ v1.07 Page 3 & RFQ v1.09 Page 1) */}
            <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2.5">
              <button
                type="button"
                onClick={() => setSpecSubTab('basic')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  specSubTab === 'basic'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>General Info</span>
              </button>
              <button
                type="button"
                onClick={() => setSpecSubTab('flow')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  specSubTab === 'flow'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Data Flow</span>
              </button>
            </div>

            {specSubTab === 'basic' && (
              <div className="space-y-5">
                {/* Top Header & Alert Notices */}
                <div>
                  <h3 className="text-sm font-bold text-slate-900">General Info</h3>
                  <p className="text-xs text-slate-500">
                    Define program identification, transaction code, author, and technical specifications according to SAP corporate standards.
                  </p>
                </div>

            {/* Corporate Governance Standard Deviation Alert Banner */}
            {!tcodeValidation.isValid && (
              <div
                className={`p-3.5 rounded-lg border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-in fade-in slide-in-from-top-1 duration-200 ${
                  tcodeValidation.severity === 'error'
                    ? 'bg-rose-50 border-rose-300 text-rose-950'
                    : 'bg-amber-50/90 border-amber-300 text-amber-950'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <ShieldAlert
                    className={`w-4 h-4 shrink-0 mt-0.5 ${
                      tcodeValidation.severity === 'error' ? 'text-rose-600' : 'text-amber-600'
                    }`}
                  />
                  <div>
                    <div className="font-bold flex items-center gap-2">
                      <span>SAP Corporate Governance Alert: Custom T-Code Deviation</span>
                      <span className="text-[10px] px-1.5 py-0.2 bg-white/90 border rounded font-mono font-bold text-slate-700">
                        {tcodeValidation.ruleName}
                      </span>
                    </div>
                    <p className="text-[11px] mt-0.5 leading-snug">
                      Current T-Code <strong>'{spec.tcode || '(blank)'}'</strong> deviates from standard SAP corporate conventions: custom development must start with <strong>'Z'</strong> or <strong>'Y'</strong>.
                    </p>
                  </div>
                </div>

                {tcodeValidation.suggestedTCode && (
                  <button
                    type="button"
                    onClick={() => {
                      const fixed = tcodeValidation.suggestedTCode!;
                      onChange({ ...spec, tcode: fixed });
                      setTcodeAlertNotice(`Transaction Code updated to compliant '${fixed}' (Customer Namespace).`);
                      setTimeout(() => setTcodeAlertNotice(null), 4500);
                    }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-md shadow-xs flex items-center justify-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                    title="Click to automatically apply the standard-compliant Customer Namespace T-Code"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Auto-Fix to '{tcodeValidation.suggestedTCode}'</span>
                  </button>
                )}
              </div>
            )}

            {/* Alert Notification Toast/Notice */}
            {tcodeAlertNotice && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-lg text-xs text-emerald-900 flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-medium">{tcodeAlertNotice}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setTcodeAlertNotice(null)}
                  className="text-emerald-700 hover:text-emerald-950 font-bold px-1"
                >
                  ✕
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Program ID <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={spec.program_id}
                  onChange={(e) => onChange({ ...spec, program_id: e.target.value })}
                  onBlur={(e) => onChange({ ...spec, program_id: e.target.value.trim().toUpperCase() })}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-xs font-mono font-bold text-blue-900 uppercase focus:bg-white focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sample Type
                </label>
                <select
                  value={spec.sample_type || '01'}
                  onChange={(e) => handleSampleTypeChange(e.target.value)}
                  className="w-full bg-blue-50/70 border border-blue-300 rounded px-2.5 py-1.5 text-xs font-semibold text-blue-950 focus:bg-white focus:border-blue-500 shadow-xs cursor-pointer"
                >
                  <option value="01">01 (Single ALV Grid)</option>
                  <option value="02">02 (Master-Detail ALV)</option>
                  <option value="03">03 (Tree ALV Grid)</option>
                  <option value="04">04 (Pivot Browser)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Module
                </label>
                <select
                  value={spec.module}
                  onChange={(e) => onChange({ ...spec, module: e.target.value as SapModule })}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-xs font-semibold text-slate-800 focus:bg-white focus:border-blue-500"
                >
                  <option value="SD">SD (Sales & Distribution)</option>
                  <option value="MM">MM (Materials Management)</option>
                  <option value="FI">FI (Financial Accounting)</option>
                  <option value="CO">CO (Controlling)</option>
                  <option value="PP">PP (Production Planning)</option>
                  <option value="HR">HR (Human Resources)</option>
                  <option value="QM">QM (Quality Management)</option>
                  <option value="PM">PM (Plant Maintenance)</option>
                  <option value="BC">BC (Basis & System)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target SAP Release
                </label>
                <input
                  type="text"
                  value={spec.target_sap_release}
                  onChange={(e) => onChange({ ...spec, target_sap_release: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-xs font-medium text-slate-800 focus:bg-white focus:border-blue-500"
                />
              </div>

              {/* Transaction Code Field with Standard Validation & Live Alert Box */}
              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Transaction Code (T-Code) <span className="text-red-500 font-bold">*</span>
                  </label>
                  {tcodeValidation.isValid ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>SAP 표준 준수 (Z/Y 네임스페이스)</span>
                    </span>
                  ) : (
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        tcodeValidation.severity === 'error'
                          ? 'text-rose-700 bg-rose-50 border-rose-300'
                          : 'text-amber-800 bg-amber-50 border-amber-300'
                      }`}
                    >
                      <AlertTriangle className="w-3 h-3" />
                      <span>표준 규칙 위반 경고</span>
                    </span>
                  )}
                </div>

                <div className="relative">
                  <input
                    type="text"
                    required
                    value={spec.tcode}
                    onChange={(e) => {
                      onChange({ ...spec, tcode: e.target.value });
                    }}
                    onBlur={(e) => {
                      const formatted = e.target.value.trim().toUpperCase();
                      onChange({ ...spec, tcode: formatted });
                      const check = validateSapTCode(formatted);
                      if (!check.isValid) {
                        setTcodeAlertNotice(check.message);
                      }
                    }}
                    className={`w-full rounded px-3 py-1.5 text-xs font-mono font-bold uppercase transition-colors pr-8 ${
                      !tcodeValidation.isValid
                        ? tcodeValidation.severity === 'error'
                          ? 'bg-rose-50/70 border-2 border-rose-400 text-rose-950 focus:bg-white focus:border-rose-600'
                          : 'bg-amber-50/70 border-2 border-amber-400 text-amber-950 focus:bg-white focus:border-amber-600'
                        : 'bg-slate-50 border border-slate-300 text-blue-900 focus:bg-white focus:border-blue-500'
                    }`}
                    placeholder="예: ZSD01, YMM01"
                  />
                  <div className="absolute right-2.5 top-2 pointer-events-none">
                    {tcodeValidation.isValid ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <AlertTriangle
                        className={`w-3.5 h-3.5 ${
                          tcodeValidation.severity === 'error' ? 'text-rose-600' : 'text-amber-600'
                        }`}
                      />
                    )}
                  </div>
                </div>

                {/* Deviation Alert & Auto-Fix Card */}
                {!tcodeValidation.isValid && (
                  <div
                    className={`mt-1.5 p-2.5 rounded-lg text-xs border space-y-1.5 shadow-2xs ${
                      tcodeValidation.severity === 'error'
                        ? 'bg-rose-50 border-rose-300 text-rose-950'
                        : 'bg-amber-50 border-amber-300 text-amber-950'
                    }`}
                  >
                    <div className="flex items-start gap-1.5">
                      <AlertTriangle
                        className={`w-4 h-4 shrink-0 mt-0.5 ${
                          tcodeValidation.severity === 'error' ? 'text-rose-600' : 'text-amber-600'
                        }`}
                      />
                      <div className="flex-1">
                        <div className="font-bold flex items-center justify-between text-xs">
                          <span>SAP 명명 규칙 위반 경고</span>
                          <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-white border border-amber-300 font-semibold text-slate-700">
                            {tcodeValidation.ruleName}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11px] leading-tight font-medium">
                          {tcodeValidation.message}
                        </p>
                        <p className="mt-1 text-[10px] text-slate-600 leading-normal">
                          {tcodeValidation.details}
                        </p>
                      </div>
                    </div>

                    {tcodeValidation.suggestedTCode && (
                      <div className="pt-1.5 border-t border-amber-200 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[11px] text-slate-700 font-medium">
                          추천 표준 T-Code:{' '}
                          <strong className="font-mono text-blue-900 bg-white px-1.5 py-0.5 rounded border border-slate-300">
                            {tcodeValidation.suggestedTCode}
                          </strong>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const fixed = tcodeValidation.suggestedTCode!;
                            onChange({ ...spec, tcode: fixed });
                            setTcodeAlertNotice(`Transaction Code가 표준 '${fixed}'로 자동 변경되었습니다.`);
                            setTimeout(() => setTcodeAlertNotice(null), 4000);
                          }}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold shadow-2xs flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>표준 T-Code로 자동 변경</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Program Title <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={spec.title}
                  onChange={(e) => onChange({ ...spec, title: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-xs font-medium text-slate-800 focus:bg-white focus:border-blue-500"
                />
              </div>

              <div className={spec.sample_type === '04' ? 'md:col-span-2' : 'md:col-span-2'}>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Author <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={spec.author}
                  onChange={(e) => onChange({ ...spec, author: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-xs font-medium text-slate-800 focus:bg-white focus:border-blue-500"
                />
              </div>

              {/* Sample Type 04 only: CDS View/Table required field (RFQ v1.20 Page 3 & v1.21) */}
              {spec.sample_type === '04' && (
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    CDS View/Table <span className="text-red-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={spec.cds_view_table || ''}
                    onChange={(e) => onChange({ ...spec, cds_view_table: e.target.value.toUpperCase() })}
                    placeholder="예: ACDOCA, BSEG, I_JournalEntryItem"
                    className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-xs font-mono font-bold uppercase text-blue-900 focus:bg-white focus:border-blue-500"
                  />
                </div>
              )}
            </div>

            {/* Business Purpose with Voice Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Business Purpose
                </label>

                {/* Voice Input Button & Action Bar (Icon-only with tooltip, RFQ v1.07 Page 4 & 5) */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={businessVoice.toggleListening}
                    disabled={businessVoice.isTranscribing}
                    className={`p-1.5 text-xs font-semibold rounded-md flex items-center justify-center transition-all shadow-2xs cursor-pointer ${
                      businessVoice.isListening
                        ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse ring-2 ring-rose-400'
                        : businessVoice.isTranscribing
                        ? 'bg-indigo-600 text-white cursor-wait'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                    }`}
                    title={
                      businessVoice.isListening
                        ? '음성 녹음 중... 클릭하여 녹음 완료 및 텍스트 변환'
                        : businessVoice.isTranscribing
                        ? 'Gemini AI 음성 변환 중...'
                        : 'Voice Input: 음성으로 업무 목적(Business Purpose) 입력하기'
                    }
                    aria-label="Voice Input (Speech-to-Text)"
                  >
                    {businessVoice.isListening ? (
                      <MicOff className="w-3.5 h-3.5 text-white animate-bounce" />
                    ) : businessVoice.isTranscribing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                    ) : (
                      <Mic className="w-3.5 h-3.5 text-blue-600" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      businessVoice.insertSimulatedVoiceText(
                        'Monitor monthly sales orders and billing status against credit limits to identify delinquent accounts and revenue risks via an ALV grid report.'
                      )
                    }
                    className="px-2 py-1 text-[11px] text-slate-500 hover:text-blue-700 hover:bg-blue-50 border border-slate-200 rounded transition-colors"
                    title="Insert sample voice text directly"
                  >
                    Voice Sample
                  </button>
                </div>
              </div>

              {businessVoice.isListening && (
                <div className="mb-2 p-2.5 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800 flex items-center justify-between flex-wrap gap-2 animate-fadeIn">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping shrink-0" />
                    <span>🎙️ Listening to speech... Click <strong>[Stop]</strong> when finished speaking.</span>
                  </div>
                  {businessVoice.transcript && (
                    <span className="font-semibold text-rose-950 italic">"{businessVoice.transcript}"</span>
                  )}
                </div>
              )}

              {businessVoice.isTranscribing && (
                <div className="mb-2 p-2.5 bg-indigo-50 border border-indigo-200 rounded text-xs text-indigo-800 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-indigo-600 animate-spin shrink-0" />
                  <span>Gemini AI is analyzing and transcribing speech to text...</span>
                </div>
              )}

              {businessVoice.errorMessage && (
                <div className="mb-2 p-2.5 bg-amber-50 border border-amber-300 rounded text-xs text-amber-900 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="shrink-0 font-bold">⚠️</span>
                    <span>{businessVoice.errorMessage}</span>
                  </div>
                  <button
                    type="button"
                    onClick={businessVoice.clearError}
                    className="text-[11px] text-amber-700 hover:underline shrink-0"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              <MarkdownFieldEditor
                value={spec.business_purpose}
                onChange={(val) => onChange({ ...spec, business_purpose: val })}
                rows={4}
                minHeight="120px"
                placeholder="업무 배경, 개발 목적, 대상 사용자 및 기대 효과를 마크다운(# 제목, - 목록, **굵게**, `코드`) 형식으로 입력해 주세요. (음성 입력 기능 및 직접 편집 지원)"
              />
            </div>

            {/* Data Extraction & Logic with Voice Input and AI Proposal */}
            <div>
              <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Data Extraction & Logic
                </label>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Voice input button - Icon only with tooltip (RFQ v1.07 Page 4 & 5) */}
                  <button
                    type="button"
                    onClick={logicVoice.toggleListening}
                    disabled={logicVoice.isTranscribing}
                    className={`p-1.5 text-xs font-semibold rounded-md flex items-center justify-center transition-all shadow-2xs cursor-pointer ${
                      logicVoice.isListening
                        ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse ring-2 ring-rose-400'
                        : logicVoice.isTranscribing
                        ? 'bg-indigo-600 text-white cursor-wait'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                    }`}
                    title={
                      logicVoice.isListening
                        ? '음성 녹음 중... 클릭하여 녹음 완료 및 텍스트 변환'
                        : logicVoice.isTranscribing
                        ? 'Gemini AI 음성 변환 중...'
                        : 'Voice Input: 음성으로 추출 로직(Data Extraction & Logic) 입력하기'
                    }
                    aria-label="Voice Input (Speech-to-Text)"
                  >
                    {logicVoice.isListening ? (
                      <MicOff className="w-3.5 h-3.5 text-white animate-bounce" />
                    ) : logicVoice.isTranscribing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                    ) : (
                      <Mic className="w-3.5 h-3.5 text-blue-600" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      logicVoice.insertSimulatedVoiceText(
                        '1. Query VBAK/VBAP for sales order headers and items,\n2. Join with VBRK/VBRP to evaluate billing status,\n3. Set status lights (LIGHTS=3 Red) for unbilled overdue orders.'
                      )
                    }
                    className="px-2 py-1 text-[11px] text-slate-500 hover:text-blue-700 hover:bg-blue-50 border border-slate-200 rounded transition-colors"
                    title="Insert sample logic text directly"
                  >
                    Sample Logic
                  </button>

                  {/* AI Suggest Logic Button */}
                  <button
                    type="button"
                    onClick={handleSuggestLogic}
                    disabled={isGeneratingLogic}
                    className="px-3 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-300 rounded-md flex items-center gap-1.5 transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
                    title="Automatically propose SAP standard table joins and extraction logic using Gemini AI based on Business Purpose."
                  >
                    {isGeneratingLogic ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                        <span>Generating Logic...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        <span>✨ Propose Logic with AI</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {aiMessage && (
                <div className="mb-2 p-2.5 bg-emerald-50 border border-emerald-300 rounded text-xs text-emerald-800 flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{aiMessage}</span>
                </div>
              )}

              {aiError && (
                <div className="mb-2 p-2.5 bg-rose-50 border border-rose-300 rounded text-xs text-rose-800 flex items-center gap-2">
                  <span className="font-bold text-rose-600">⚠️</span>
                  <span>{aiError}</span>
                </div>
              )}

              {logicVoice.isListening && (
                <div className="mb-2 p-2.5 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800 flex items-center justify-between flex-wrap gap-2 animate-fadeIn">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping shrink-0" />
                    <span>🎙️ Listening to logic speech... Click <strong>[Stop]</strong> when finished speaking.</span>
                  </div>
                  {logicVoice.transcript && (
                    <span className="font-semibold text-rose-950 italic">"{logicVoice.transcript}"</span>
                  )}
                </div>
              )}

              {logicVoice.isTranscribing && (
                <div className="mb-2 p-2.5 bg-indigo-50 border border-indigo-200 rounded text-xs text-indigo-800 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-indigo-600 animate-spin shrink-0" />
                  <span>Gemini AI is analyzing and transcribing logic speech to text...</span>
                </div>
              )}

              {logicVoice.errorMessage && (
                <div className="mb-2 p-2.5 bg-amber-50 border border-amber-300 rounded text-xs text-amber-900 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="shrink-0 font-bold">⚠️</span>
                    <span>{logicVoice.errorMessage}</span>
                  </div>
                  <button
                    type="button"
                    onClick={logicVoice.clearError}
                    className="text-[11px] text-amber-700 hover:underline shrink-0"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              <MarkdownFieldEditor
                value={spec.data_extraction_logic}
                onChange={(val) => onChange({ ...spec, data_extraction_logic: val })}
                rows={7}
                minHeight="180px"
                placeholder="원천 DB 테이블, JOIN 및 WHERE 조건, 신호등 상태 로직(LIGHTS=1/2/3), 집계 기준 등을 마크다운(# 제목, - 목록, `테이블/필드명`) 형식으로 입력해 주세요. 상단 '✨ Propose Logic with AI' 버튼을 클릭하여 자동 제안받을 수도 있습니다."
              />
            </div>

              </div>
            )}

            {/* Sub-Tab 2: Data Flow Diagram (Visual Program Flowchart) (RFQ v1.07 Page 3 & 4) */}
            {specSubTab === 'flow' && (
              <div className="space-y-4">
                <DataFlowEditor
                  spec={spec}
                  onChange={(updatedFlow) => onChange({ ...spec, data_flow: updatedFlow })}
                />
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* MAIN TAB 2: Selection Screen (선택 화면)                                   */}
        {/* ========================================================================= */}
        {mainTab === 'selection' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-blue-600" />
                  <span>Selection Screen (Selection Parameters Definition)</span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 font-bold">
                    Total {spec.selection_params.length} items
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Define input criteria (PARAMETERS & SELECT-OPTIONS) with field names, data types, lengths, and reference tables.
                </p>
              </div>
            </div>

            <SelectionScreenEditor
              spec={spec}
              onChange={(updatedParams) => {
                onChange({ ...spec, selection_params: updatedParams });
              }}
              onAddParam={handleAddSelectionParam}
            />
          </div>
        )}

        {/* Modal for Dynamically Adding Selection Parameter with Field Name, Data Type, and Length */}
        {showAddParamModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-blue-400" />
                  <h4 className="text-sm font-bold">
                    Add {newParamForm.kind === 'PARAMETER' ? 'Parameters (Single Value)' : 'Select-options (Range)'} Field
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddParamModal(false)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Quick SAP Field Presets */}
              <div className="px-5 pt-3 pb-1 bg-slate-50 border-b border-slate-200 text-xs">
                <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">
                  Quick Preset Application:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: 'P_BUKRS (Company Code)', kind: 'PARAMETER' as SelectionKind, name: 'P_BUKRS', datatype: 'CHAR' as SapDataType, length: 4, text: 'Company Code', ref_table: 'T001', ref_field: 'BUKRS', obligatory: true, default_val: '1000' },
                    { label: 'S_ERDAT (Doc Date)', kind: 'SELECT_OPTION' as SelectionKind, name: 'S_ERDAT', datatype: 'DATS' as SapDataType, length: 8, text: 'Document Date', ref_table: 'VBAK', ref_field: 'ERDAT', obligatory: false, default_val: '' },
                    { label: 'S_VBELN (Sales Order)', kind: 'SELECT_OPTION' as SelectionKind, name: 'S_VBELN', datatype: 'CHAR' as SapDataType, length: 10, text: 'Sales Order Number', ref_table: 'VBAK', ref_field: 'VBELN', obligatory: false, default_val: '' },
                    { label: 'P_WERKS (Plant)', kind: 'PARAMETER' as SelectionKind, name: 'P_WERKS', datatype: 'CHAR' as SapDataType, length: 4, text: 'Plant', ref_table: 'T001W', ref_field: 'WERKS', obligatory: true, default_val: '1000' },
                    { label: 'S_MATNR (Material)', kind: 'SELECT_OPTION' as SelectionKind, name: 'S_MATNR', datatype: 'CHAR' as SapDataType, length: 18, text: 'Material Number', ref_table: 'MARA', ref_field: 'MATNR', obligatory: false, default_val: '' },
                    { label: 'P_VKORG (Sales Org)', kind: 'PARAMETER' as SelectionKind, name: 'P_VKORG', datatype: 'CHAR' as SapDataType, length: 4, text: 'Sales Organization', ref_table: 'VBAK', ref_field: 'VKORG', obligatory: true, default_val: '1000' },
                  ].map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => setNewParamForm({ ...preset })}
                      className="px-2 py-0.5 bg-white hover:bg-blue-50 hover:border-blue-300 border border-slate-200 rounded text-[11px] font-mono text-slate-700 transition-colors cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAddSelectionParam(newParamForm);
                  setShowAddParamModal(false);
                }}
                className="p-5 space-y-4 text-xs"
              >
                {/* Kind Toggle */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kind</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setNewParamForm((f) => ({
                          ...f,
                          kind: 'PARAMETER',
                          name: f.name.startsWith('S_') ? f.name.replace(/^S_/, 'P_') : f.name,
                        }));
                      }}
                      className={`py-1.5 px-3 rounded border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                        newParamForm.kind === 'PARAMETER'
                          ? 'bg-amber-100 border-amber-400 text-amber-900 ring-1 ring-amber-400'
                          : 'bg-slate-50 border-slate-300 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <span>PARAMETERS (Single Input)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewParamForm((f) => ({
                          ...f,
                          kind: 'SELECT_OPTION',
                          name: f.name.startsWith('P_') ? f.name.replace(/^P_/, 'S_') : f.name,
                        }));
                      }}
                      className={`py-1.5 px-3 rounded border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                        newParamForm.kind === 'SELECT_OPTION'
                          ? 'bg-blue-100 border-blue-400 text-blue-900 ring-1 ring-blue-400'
                          : 'bg-slate-50 border-slate-300 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <span>SELECT-OPTIONS (Range Input)</span>
                    </button>
                  </div>
                </div>

                {/* Field Name & Data Type & Length */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Field Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={newParamForm.name}
                      onChange={(e) =>
                        setNewParamForm({ ...newParamForm, name: e.target.value.toUpperCase() })
                      }
                      placeholder={newParamForm.kind === 'PARAMETER' ? 'P_BUKRS' : 'S_VBELN'}
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-mono font-bold text-blue-950 uppercase focus:bg-white focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Data Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={newParamForm.datatype}
                      onChange={(e) => {
                        const dt = e.target.value as SapDataType;
                        const defaultLen = dt === 'DATS' ? 8 : dt === 'TIMS' ? 6 : dt === 'UNIT' ? 3 : dt === 'CURR' ? 15 : dt === 'STRING' ? 255 : 10;
                        setNewParamForm({
                          ...newParamForm,
                          datatype: dt,
                          length: defaultLen,
                        });
                      }}
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1.5 font-mono text-slate-800 focus:bg-white focus:border-blue-500"
                    >
                      <option value="CHAR">CHAR (Character String)</option>
                      <option value="NUMC">NUMC (Numeric Text)</option>
                      <option value="DATS">DATS (Date YYYYMMDD)</option>
                      <option value="TIMS">TIMS (Time HHMMSS)</option>
                      <option value="CURR">CURR (Currency Amount)</option>
                      <option value="DEC">DEC (Decimal Number)</option>
                      <option value="INT4">INT4 (4-byte Integer)</option>
                      <option value="UNIT">UNIT (Unit of Measure)</option>
                      <option value="STRING">STRING (Variable Length)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Length <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={255}
                      required
                      value={newParamForm.length}
                      onChange={(e) =>
                        setNewParamForm({
                          ...newParamForm,
                          length: Math.max(1, parseInt(e.target.value) || 1),
                        })
                      }
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-mono text-center text-slate-800 focus:bg-white focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Screen Text */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Screen Text (Label) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newParamForm.text}
                    onChange={(e) => setNewParamForm({ ...newParamForm, text: e.target.value })}
                    placeholder="e.g., Company Code, Document Date, Sales Order"
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 focus:bg-white focus:border-blue-500"
                  />
                </div>

                {/* Reference Table & Field with Search Help (F4) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-700">Reference Table & Field</span>
                    <button
                      type="button"
                      onClick={() => setShowParamSearchHelp(true)}
                      className="text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Search className="w-3 h-3 text-blue-600" />
                      <span>Search Help (F4)</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <input
                        type="text"
                        value={newParamForm.ref_table}
                        onChange={(e) =>
                          setNewParamForm({ ...newParamForm, ref_table: e.target.value.toUpperCase() })
                        }
                        placeholder="Ref Table (e.g., VBAK)"
                        className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-mono uppercase text-slate-800 focus:bg-white focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={newParamForm.ref_field}
                        onChange={(e) =>
                          setNewParamForm({ ...newParamForm, ref_field: e.target.value.toUpperCase() })
                        }
                        placeholder="Ref Field (e.g., VBELN)"
                        className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-mono uppercase text-slate-800 focus:bg-white focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Obligatory & Default Value */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Default Value
                    </label>
                    <input
                      type="text"
                      value={newParamForm.default_val}
                      onChange={(e) =>
                        setNewParamForm({ ...newParamForm, default_val: e.target.value })
                      }
                      placeholder="e.g., 1000, 2026.01.01"
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 focus:bg-white focus:border-blue-500"
                    />
                  </div>
                  <div className="flex items-center pt-6">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-800 font-semibold select-none">
                      <input
                        type="checkbox"
                        checked={newParamForm.obligatory}
                        onChange={(e) =>
                          setNewParamForm({ ...newParamForm, obligatory: e.target.checked })
                        }
                        className="w-4 h-4 accent-red-600 rounded"
                      />
                      <span>OBLIGATORY (Required)</span>
                    </label>
                  </div>
                </div>

                {/* Modal Buttons */}
                <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddParamModal(false)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Add Field</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Search Help (F4) Modal for Selection Parameters */}
        <SapSearchHelpModal
          isOpen={showParamSearchHelp}
          onClose={() => setShowParamSearchHelp(false)}
          onSelect={(selected) => {
            setNewParamForm((prev) => ({
              ...prev,
              ref_table: selected.table,
              ref_field: selected.field,
              datatype: selected.datatype,
              length: selected.length,
              text: selected.label,
              name: prev.kind === 'PARAMETER' ? `P_${selected.field}` : `S_${selected.field}`,
            }));
          }}
        />

        {/* ========================================================================= */}
        {/* MAIN TAB 3: ALV 그리드 (Layout -> Field Catalog -> Toolbar -> Test Case)  */}
        {/* ========================================================================= */}
        {mainTab === 'alv' && (
          <div className="space-y-5">
            {/* Master-Detail ALV Sub-Grid Selector (Sample Type 02) */}
            {isMasterDetail && (
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-gradient-to-r from-blue-50 to-indigo-50/60 border border-blue-200 rounded-lg shadow-2xs">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveGridTab('header')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                      activeGridTab === 'header'
                        ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-400/30'
                        : 'bg-white text-slate-700 hover:bg-blue-100/70 border border-slate-300'
                    }`}
                  >
                    <span>{spec.sample_type === '03' ? 'Tree' : 'Header'}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        activeGridTab === 'header' ? 'bg-blue-700 text-blue-100' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {spec.field_catalog.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveGridTab('item')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                      activeGridTab === 'item'
                        ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-400/30'
                        : 'bg-white text-slate-700 hover:bg-blue-100/70 border border-slate-300'
                    }`}
                  >
                    <span>{spec.sample_type === '03' ? 'Grid' : 'Item'}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        activeGridTab === 'item' ? 'bg-blue-700 text-blue-100' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {spec.item_grid?.field_catalog?.length || 0}
                    </span>
                  </button>
                </div>

                <div className="text-[11px] text-blue-900 font-medium px-2">
                  {spec.sample_type === '03'
                    ? activeGridTab === 'header'
                      ? 'Editing [Tree] (Carrier Hierarchy)'
                      : 'Editing [Grid] (Flight Schedule)'
                    : activeGridTab === 'header'
                    ? 'Editing [Header]'
                    : `Editing [Item] (Header Key: ${spec.item_grid?.foreign_key || 'VBELN'})`}
                </div>
              </div>
            )}

            {/* Sub-Tab Navigation Header */}
            <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2.5 bg-slate-50 p-1.5 rounded-lg overflow-x-auto">
              {/* 1. Layout */}
              <button
                onClick={() => setAlvSubTab('layout')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  alvSubTab === 'layout'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Layout className="w-3.5 h-3.5" />
                <span>Layout</span>
              </button>

              {/* 2. Field Catalog */}
              <button
                onClick={() => setAlvSubTab('fields')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  alvSubTab === 'fields'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>Field Catalog</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    alvSubTab === 'fields' ? 'bg-blue-700 text-blue-100' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {activeFieldCatalog.length}
                </span>
              </button>

              {/* 3. Sort (Tree 설정에서는 삭제 per RFQ v1.18) */}
              {!isTreeTab && (
                <button
                  onClick={() => setAlvSubTab('sort')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                    alvSubTab === 'sort'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                  <span>Sort</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      alvSubTab === 'sort' ? 'bg-blue-700 text-blue-100' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {activeFieldCatalog.length}
                  </span>
                </button>
              )}

              {/* 4. Toolbar */}
              <button
                onClick={() => setAlvSubTab('toolbar')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  alvSubTab === 'toolbar'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Toolbar</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    alvSubTab === 'toolbar' ? 'bg-blue-700 text-blue-100' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {toolbarButtonsCount}
                </span>
              </button>

              {/* 4. Test Case */}
              <button
                onClick={() => setAlvSubTab('tests')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  alvSubTab === 'tests'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Test Case</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    alvSubTab === 'tests' ? 'bg-blue-700 text-blue-100' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {activeTestCases.length}
                </span>
              </button>
            </div>

            {/* Sub-Tab 1: Layout (LVC_S_LAYO Full Configuration - Spreadsheet Format with Direct Excel Paste) */}
            {alvSubTab === 'layout' && (
              <AlvLayoutSpreadsheet
                layout={activeLayout}
                onChange={(updatedLayout) => updateActiveLayout(updatedLayout)}
              />
            )}

            {/* Sub-Tab 2: Field Catalog */}
            {alvSubTab === 'fields' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Configure the Field catalog
                    </h3>
                    <p className="text-xs text-slate-500">
                      Add fields and configure properties (Key, Hotspot Link, Editable, Sum, etc.) to immediately reflect on the ALV grid (LVC_T_FCAT).
                    </p>
                  </div>
                </div>

                <FieldCatalogEditor
                  spec={{
                    ...spec,
                    field_catalog: activeFieldCatalog,
                    mock_rows: activeMockRows,
                  }}
                  onChange={(updatedCatalog, updatedMockRows) => {
                    updateActiveFieldCatalog(updatedCatalog, updatedMockRows);
                  }}
                  onReorder={handleReorderFieldCatalog}
                />
              </div>
            )}

            {/* Sub-Tab 3: Sort */}
            {alvSubTab === 'sort' && !isTreeTab && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Configure the Sort
                  </h3>
                  <p className="text-xs text-slate-500">
                    Reorder ALV column positions (COL_POS) and manage field order (LVC_T_SORT).
                  </p>
                </div>

                <AlvSortEditor
                  spec={{
                    ...spec,
                    field_catalog: activeFieldCatalog,
                    mock_rows: activeMockRows,
                  }}
                  onChange={(updatedCatalog, updatedMockRows) => {
                    updateActiveFieldCatalog(updatedCatalog, updatedMockRows);
                  }}
                  onReorder={handleReorderFieldCatalog}
                />
              </div>
            )}

            {/* Sub-Tab 4: Toolbar */}
            {alvSubTab === 'toolbar' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Configure the Toolbar
                  </h3>
                  <p className="text-xs text-slate-500">
                    Configure ALV standard toolbar buttons and custom user-defined buttons (LVC_T_STB).
                  </p>
                </div>

                <ToolbarEditor
                  spec={{
                    ...spec,
                    toolbar_buttons: activeToolbarButtons,
                  }}
                  onChange={(updatedButtons) => {
                    updateActiveToolbarButtons(updatedButtons);
                  }}
                />
              </div>
            )}

            {/* Sub-Tab 4: Test Case */}
            {alvSubTab === 'tests' && (
              <div className="space-y-5 max-w-5xl">
                {/* Header & Excel Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Make the Test Case
                    </h3>
                    <p className="text-xs text-slate-500">
                      Write test scenarios for specification verification, or download/upload CSV templates to immediately reflect on the ALV grid.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Excel Template Download Button */}
                    <button
                      type="button"
                      onClick={() => {
                        downloadExcelTemplate(
                          activeFieldCatalog,
                          `${spec.program_id}_${activeIsItem ? 'ITEM' : 'HEADER'}`
                        );
                      }}
                      className="px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                      title="Download CSV template format configured for current field catalog."
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Template</span>
                    </button>

                    {/* Excel / CSV Upload Button */}
                    <label
                      className="px-3 py-1.5 text-xs font-bold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-300 rounded flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                      title="Upload prepared CSV test data to render in the ALV grid."
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload CSV</span>
                      <input
                        type="file"
                        accept=".csv,.txt"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                    </label>

                    {/* Add Test Scenario */}
                    <button
                      type="button"
                      onClick={handleAddTestCase}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Test Scenario</span>
                    </button>
                  </div>
                </div>

                {/* Upload Notification Banner */}
                {uploadNotice && (
                  <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-lg text-xs font-medium flex items-center gap-2 shadow-xs">
                    <Check className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>{uploadNotice}</span>
                  </div>
                )}

                {/* 1. Test Scenarios Table */}
                <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-xs">
                  <div className="px-3 py-2 bg-slate-100 border-b border-slate-200 font-bold text-xs text-slate-800 flex items-center justify-between">
                    <span>Test Scenario List</span>
                    <span className="text-[11px] font-normal text-slate-500">
                      Total {activeTestCases.length} items
                    </span>
                  </div>
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-700 font-semibold text-[11px] border-b border-slate-200">
                      <tr>
                        <th className="p-2.5 w-12 text-center">No</th>
                        <th className="p-2.5 w-48">Scenario (Description)</th>
                        <th className="p-2.5">Input Condition</th>
                        <th className="p-2.5">Expected Result</th>
                        <th className="p-2.5 w-16 text-center">Delete</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11px]">
                      {activeTestCases.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-slate-400">
                            No test scenarios registered. Click 'Add Test Scenario' above to add one.
                          </td>
                        </tr>
                      ) : (
                        activeTestCases.map((tc, idx) => (
                          <tr key={tc.id}>
                            <td className="p-2 text-center text-slate-500 font-mono font-bold">
                              {idx + 1}
                            </td>
                            <td className="p-1.5">
                              <input
                                type="text"
                                value={tc.scenario}
                                onChange={(e) => {
                                  const next = [...activeTestCases];
                                  next[idx] = { ...next[idx], scenario: e.target.value };
                                  updateActiveTestCases(next);
                                }}
                                className="w-full bg-slate-50 border border-slate-200 px-2 py-1 rounded focus:bg-white focus:border-blue-500"
                              />
                            </td>
                            <td className="p-1.5">
                              <input
                                type="text"
                                value={tc.condition}
                                onChange={(e) => {
                                  const next = [...activeTestCases];
                                  next[idx] = { ...next[idx], condition: e.target.value };
                                  updateActiveTestCases(next);
                                }}
                                className="w-full bg-slate-50 border border-slate-200 px-2 py-1 rounded focus:bg-white focus:border-blue-500"
                              />
                            </td>
                            <td className="p-1.5">
                              <input
                                type="text"
                                value={tc.expected}
                                onChange={(e) => {
                                  const next = [...activeTestCases];
                                  next[idx] = { ...next[idx], expected: e.target.value };
                                  updateActiveTestCases(next);
                                }}
                                className="w-full bg-slate-50 border border-slate-200 px-2 py-1 rounded font-medium text-emerald-900 focus:bg-white focus:border-blue-500"
                              />
                            </td>
                            <td className="p-1.5 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  updateActiveTestCases(activeTestCases.filter((_, i) => i !== idx));
                                }}
                                className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* 2. Uploaded Mock Data Preview for ALV Grid */}
                <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-xs">
                  <div className="px-3 py-2 bg-blue-50 border-b border-blue-200 font-bold text-xs text-blue-950 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Table className="w-3.5 h-3.5 text-blue-700" />
                      <span>
                        ALV Grid Test Data ({activeIsItem ? 'Item Grid' : 'Header Grid'}: {activeMockRows.length} rows)
                      </span>
                    </div>
                    <span className="text-[11px] text-blue-700 font-normal">
                      Rendered in real-time in the Simulate screen on the right
                    </span>
                  </div>

                  <div className="overflow-x-auto max-h-60">
                    <table className="w-full text-xs text-left border-collapse whitespace-nowrap">
                      <thead className="bg-slate-100 text-slate-700 font-semibold text-[11px] sticky top-0 border-b border-slate-200">
                        <tr>
                          <th className="p-2 w-10 text-center">#</th>
                          {activeFieldCatalog.map((f) => (
                            <th key={f.fieldname} className="p-2 border-r border-slate-200">
                              {f.coltext} <span className="font-mono text-[10px] text-slate-500">[{f.fieldname}]</span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[11px]">
                        {activeMockRows.length === 0 ? (
                          <tr>
                            <td colSpan={activeFieldCatalog.length + 1} className="p-6 text-center text-slate-400">
                              No test data available. Download the template above and upload CSV, or generate mock data.
                            </td>
                          </tr>
                        ) : (
                          activeMockRows.map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-blue-50/40">
                              <td className="p-2 text-center text-slate-400 font-mono font-semibold">
                                {rIdx + 1}
                              </td>
                              {activeFieldCatalog.map((f) => {
                                const val = row[f.fieldname];
                                const isStatusField =
                                  f.fieldname === 'ZICON' ||
                                  f.fieldname === 'STATUS' ||
                                  f.fieldname === 'LIGHTS';

                                return (
                                  <td key={f.fieldname} className="p-2 border-r border-slate-100 font-mono">
                                    {isStatusField ? (
                                      <div className="flex items-center gap-1.5">
                                        {val === '1' || val === 1 ? (
                                          <span className="w-3 h-3 rounded-full bg-emerald-500 border border-emerald-700 inline-block" />
                                        ) : val === '2' || val === 2 ? (
                                          <span className="w-3 h-3 rounded-full bg-amber-400 border border-amber-600 inline-block" />
                                        ) : (
                                          <span className="w-3 h-3 rounded-full bg-rose-500 border border-rose-700 inline-block" />
                                        )}
                                        <span className="text-[10px] text-slate-600 font-bold">
                                          {val === '1' ? 'Normal(1)' : val === '2' ? 'Warning(2)' : 'Error(3)'}
                                        </span>
                                      </div>
                                    ) : (
                                      <span>{val !== undefined && val !== null ? String(val) : ''}</span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* MAIN TAB 4: 소스 코드 (Source Code Editor - Program, TOP, S01, etc.)      */}
        {/* ========================================================================= */}
        {mainTab === 'source' && (
          <div className="h-full min-h-[600px] flex flex-col">
            <SourceCodeEditor spec={spec} onChange={onChange} />
          </div>
        )}
      </div>

      {/* jsPDF Specification Export Modal */}
      <PdfExportModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        spec={spec}
      />

      {/* Program Spec Manager Modal (RFQ v1.07 Page 1) */}
      <SpecManagerModal
        currentSpec={spec}
        isOpen={isSpecManagerOpen}
        onClose={() => setIsSpecManagerOpen(false)}
        onSelectSpec={(newSpec) => onChange(newSpec)}
      />
    </div>
  );
};
