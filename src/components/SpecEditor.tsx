import React, { useState } from 'react';
import {
  FileText,
  Database,
  Sliders,
  Layout,
  CheckCircle,
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
} from 'lucide-react';
import { ProgramSpec, SapModule, TestCase, AlvToolbarButton, AlvLayout, AlvField } from '../types/sap';
import { FieldCatalogEditor } from './FieldCatalogEditor';
import { SelectionScreenEditor } from './SelectionScreenEditor';
import { ToolbarEditor } from './ToolbarEditor';
import { DataFlowEditor } from './DataFlowEditor';
import { DEFAULT_ALV_TOOLBAR_BUTTONS } from '../data/defaultToolbarButtons';
import { SAMPLE_SPECS } from '../data/sampleSpecs';
import { useVoiceInput } from '../hooks/useVoiceInput';
import { requestAiLogicGeneration } from '../utils/aiLogicGenerator';
import { downloadExcelTemplate, parseUploadedExcelOrCsv } from '../utils/excelTemplateHelper';

interface SpecEditorProps {
  spec: ProgramSpec;
  onChange: (updated: ProgramSpec) => void;
}

export const SpecEditor: React.FC<SpecEditorProps> = ({ spec, onChange }) => {
  // Main Tabs: 1. Program Spec -> 2. Selection Screen -> 3. ALV Grid
  const [mainTab, setMainTab] = useState<'info' | 'selection' | 'alv'>('info');

  // Master-Detail ALV Sub-Grid Selector: Header ALV Grid vs Item ALV Grid
  const [activeGridTab, setActiveGridTab] = useState<'header' | 'item'>('header');

  // ALV Grid Sub Tabs: 1. Layout -> 2. Field Catalog -> 3. Toolbar -> 4. Test Case
  const [alvSubTab, setAlvSubTab] = useState<'layout' | 'fields' | 'toolbar' | 'tests'>('layout');

  const [isGeneratingLogic, setIsGeneratingLogic] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);

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

  // Master-Detail ALV resolution (Sample Type 02)
  const isMasterDetail = spec.sample_type === '02';
  const activeIsItem = isMasterDetail && activeGridTab === 'item';

  const defaultItemLayout: AlvLayout = {
    zebra: true,
    grid_title: '영업 오더 품목 ALV Grid (VBAP)',
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
            grid_name: 'Item ALV Grid',
            layout: defaultItemLayout,
            field_catalog: [],
            mock_rows: [],
            foreign_key: 'VBELN',
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
          {/* Main Tab 1: Program Spec (가장 첫 번째 탭!) */}
          <button
            onClick={() => setMainTab('info')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              mainTab === 'info'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Program Spec</span>
          </button>

          {/* Main Tab 2: Selection Screen (선택 화면) */}
          <button
            onClick={() => setMainTab('selection')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              mainTab === 'selection'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Selection Screen</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                mainTab === 'selection' ? 'bg-blue-700 text-blue-100' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {spec.selection_params.length}
            </span>
          </button>

          {/* Main Tab 3: ALV Grid (내부에 Layout, Field Catalog, Toolbar, Test Case 포함) */}
          <button
            onClick={() => setMainTab('alv')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              mainTab === 'alv'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>ALV Grid</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                mainTab === 'alv' ? 'bg-blue-700 text-blue-100' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {spec.field_catalog.length}
            </span>
          </button>
        </div>
      </div>

      {/* Editor Content Area */}
      <div className="flex-1 p-5 overflow-y-auto">
        {/* ========================================================================= */}
        {/* MAIN TAB 1: 프로그램 개요 & 로직 (Program Info & Logic)                    */}
        {/* ========================================================================= */}
        {mainTab === 'info' && (
          <div className="space-y-5 max-w-4xl">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Basic Information & Specification</h3>
              <p className="text-xs text-slate-500">
                Define program identification, transaction code, author, and technical specifications.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Program ID
                </label>
                <input
                  type="text"
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
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Transaction Code
                </label>
                <input
                  type="text"
                  value={spec.tcode}
                  onChange={(e) => onChange({ ...spec, tcode: e.target.value })}
                  onBlur={(e) => onChange({ ...spec, tcode: e.target.value.trim().toUpperCase() })}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-xs font-mono font-bold text-blue-900 uppercase focus:bg-white focus:border-blue-500"
                />
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

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Program Title
                </label>
                <input
                  type="text"
                  value={spec.title}
                  onChange={(e) => onChange({ ...spec, title: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-xs font-medium text-slate-800 focus:bg-white focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Author
                </label>
                <input
                  type="text"
                  value={spec.author}
                  onChange={(e) => onChange({ ...spec, author: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-xs font-medium text-slate-800 focus:bg-white focus:border-blue-500"
                />
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
            </div>

            {/* Business Purpose with Voice Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Business Purpose
                </label>

                {/* Voice Input Button & Action Bar */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={businessVoice.toggleListening}
                    disabled={businessVoice.isTranscribing}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer ${
                      businessVoice.isListening
                        ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse ring-2 ring-rose-400'
                        : businessVoice.isTranscribing
                        ? 'bg-indigo-600 text-white cursor-wait'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                    }`}
                    title={
                      businessVoice.isListening
                        ? 'Finish Recording & Transcribe'
                        : businessVoice.isTranscribing
                        ? 'Transcribing...'
                        : 'Speak Business Purpose (Voice Input)'
                    }
                  >
                    {businessVoice.isListening ? (
                      <>
                        <MicOff className="w-3.5 h-3.5 text-white animate-bounce" />
                        <span>Stop (Transcribing...)</span>
                      </>
                    ) : businessVoice.isTranscribing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                        <span>AI Transcribing...</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-3.5 h-3.5 text-blue-600" />
                        <span>Voice Input</span>
                      </>
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

              <textarea
                rows={4}
                value={spec.business_purpose}
                onChange={(e) => onChange({ ...spec, business_purpose: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded p-2.5 text-xs leading-relaxed text-slate-800 focus:bg-white focus:border-blue-500 shadow-inner"
                placeholder="Describe business background, target users, and key objectives. (Type directly or use Voice Input above. Generated text can be freely edited)"
              />
            </div>

            {/* Data Extraction & Logic with Voice Input and AI Proposal */}
            <div>
              <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Data Extraction & Logic
                </label>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Voice input button */}
                  <button
                    type="button"
                    onClick={logicVoice.toggleListening}
                    disabled={logicVoice.isTranscribing}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer ${
                      logicVoice.isListening
                        ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse ring-2 ring-rose-400'
                        : logicVoice.isTranscribing
                        ? 'bg-indigo-600 text-white cursor-wait'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                    }`}
                    title={
                      logicVoice.isListening
                        ? 'Finish Recording & Transcribe'
                        : logicVoice.isTranscribing
                        ? 'Transcribing...'
                        : 'Speak Data Extraction Logic (Voice Input)'
                    }
                  >
                    {logicVoice.isListening ? (
                      <>
                        <MicOff className="w-3.5 h-3.5 text-white animate-bounce" />
                        <span>Stop (Transcribing...)</span>
                      </>
                    ) : logicVoice.isTranscribing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                        <span>AI Transcribing...</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-3.5 h-3.5 text-blue-600" />
                        <span>Voice Input</span>
                      </>
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

              <textarea
                rows={7}
                value={spec.data_extraction_logic}
                onChange={(e) => onChange({ ...spec, data_extraction_logic: e.target.value })}
                className="w-full bg-slate-900 text-slate-100 border border-slate-800 rounded p-2.5 font-mono text-xs leading-relaxed focus:border-blue-500 shadow-inner"
                placeholder="Define database tables, JOIN and WHERE conditions, status traffic lights logic (LIGHTS=1/2/3), or click '✨ Propose Logic with AI' above to receive recommendations. Transcribed text can be edited freely at any time."
              />
            </div>

            {/* Data Flow Diagram & Editor (Located directly below Data Extraction & Logic) */}
            <DataFlowEditor
              spec={spec}
              onChange={(updatedFlow) => onChange({ ...spec, data_flow: updatedFlow })}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* MAIN TAB 2: Selection Screen (선택 화면)                                   */}
        {/* ========================================================================= */}
        {mainTab === 'selection' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Selection Screen (선택 화면 파라미터 정의)</h3>
              <p className="text-xs text-slate-500">
                사용자가 프로그램을 실행하기 전 조회 조건을 입력하는 화면의 PARAMETERS 및 SELECT-OPTIONS 항목들을 명세합니다.
              </p>
            </div>

            <SelectionScreenEditor
              spec={spec}
              onChange={(updatedParams) => {
                onChange({ ...spec, selection_params: updatedParams });
              }}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* MAIN TAB 3: ALV 그리드 (Layout -> Field Catalog -> Toolbar -> Test Case)  */}
        {/* ========================================================================= */}
        {mainTab === 'alv' && (
          <div className="space-y-5">
            {/* Master-Detail ALV Sub-Grid Selector (Sample Type 02) */}
            {isMasterDetail && (
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-gradient-to-r from-blue-50 to-indigo-50/60 border border-blue-200 rounded-lg shadow-2xs">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-2 py-1 text-xs font-bold text-blue-950">
                    <Layers className="w-4 h-4 text-blue-600" />
                    <span>ALV Grid 대상 선택:</span>
                  </div>
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
                      <span>Header ALV Grid (헤더)</span>
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
                      <span>Item ALV Grid (아이템/품목)</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                          activeGridTab === 'item' ? 'bg-blue-700 text-blue-100' : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {spec.item_grid?.field_catalog?.length || 0}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="text-[11px] text-blue-900 font-medium px-2">
                  {activeGridTab === 'header' ? '현재 [Header ALV Grid] 편집 중' : '현재 [Item ALV Grid] 편집 중 (헤더 연계 필드: VBELN)'}
                </div>
              </div>
            )}

            {/* Sub-Tab Navigation Header */}
            <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2.5 bg-slate-50 p-1.5 rounded-lg overflow-x-auto">
              {/* 1. Layout (그리드 레이아웃 먼저) */}
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

              {/* 2. Field Catalog (그다음에 필드 카탈로그) */}
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

              {/* 3. Toolbar (그다음에 툴바) */}
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

              {/* 4. Test Case (그다음에 테스트 케이스) */}
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

            {/* Sub-Tab 1: Layout */}
            {alvSubTab === 'layout' && (
              <div className="space-y-6 max-w-3xl">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Layout ({activeIsItem ? 'Item ALV Grid' : 'Header ALV Grid'} 레이아웃 설정: LVC_S_LAYO)
                  </h3>
                  <p className="text-xs text-slate-500">
                    CL_GUI_ALV_GRID의 시각적 형태 및 동작 모드를 정의합니다.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      그리드 상단 헤더 타이틀 (GRID_TITLE)
                    </label>
                    <input
                      type="text"
                      value={activeLayout.grid_title}
                      onChange={(e) =>
                        updateActiveLayout({
                          ...activeLayout,
                          grid_title: e.target.value,
                        })
                      }
                      className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs font-medium focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      선택 모드 (SEL_MODE)
                    </label>
                    <select
                      value={activeLayout.sel_mode}
                      onChange={(e) =>
                        updateActiveLayout({
                          ...activeLayout,
                          sel_mode: e.target.value as 'A' | 'B' | 'C' | 'D',
                        })
                      }
                      className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs font-medium focus:border-blue-500"
                    >
                      <option value="A">A: 복수 행 및 열 선택 (Multiple rows/columns)</option>
                      <option value="B">B: 단일 행 선택 (Single row)</option>
                      <option value="C">C: 복수 행 선택 (Multiple rows)</option>
                      <option value="D">D: 셀 단위 선택 (Cell selection)</option>
                    </select>
                  </div>

                  <div className="flex flex-col justify-center space-y-2 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800">
                      <input
                        type="checkbox"
                        checked={activeLayout.zebra}
                        onChange={(e) =>
                          updateActiveLayout({
                            ...activeLayout,
                            zebra: e.target.checked,
                          })
                        }
                        className="w-4 h-4 accent-blue-600 rounded"
                      />
                      <span>줄무늬 패턴 적용 (gs_layo-zebra = 'X')</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800">
                      <input
                        type="checkbox"
                        checked={activeLayout.cwidth_opt}
                        onChange={(e) =>
                          updateActiveLayout({
                            ...activeLayout,
                            cwidth_opt: e.target.checked,
                          })
                        }
                        className="w-4 h-4 accent-blue-600 rounded"
                      />
                      <span>컬럼 폭 자동 최적화 (gs_layo-cwidth_opt = 'X')</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Sub-Tab 2: Field Catalog */}
            {alvSubTab === 'fields' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Field Catalog ({activeIsItem ? 'Item Grid: LVC_T_FCAT' : 'Header Grid: LVC_T_FCAT'})
                    </h3>
                    <p className="text-xs text-slate-500">
                      보고자 하는 필드를 추가하고 속성(키, 핫스팟 링크, 수정 가능 여부, 합계 등)을 설정하면 우측 ALV 화면에 즉시 반영됩니다.
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
                />
              </div>
            )}

            {/* Sub-Tab 3: Toolbar */}
            {alvSubTab === 'toolbar' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Toolbar ({activeIsItem ? 'Item Grid: LVC_T_STB' : 'Header Grid: LVC_T_STB'})
                  </h3>
                  <p className="text-xs text-slate-500">
                    ALV Toolbar 표준 버튼 및 사용자 정의 커스텀 버튼을 구성합니다.
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
                      Test Case ({activeIsItem ? 'Item ALV Grid' : 'Header ALV Grid'} 검증 및 테스트 데이터)
                    </h3>
                    <p className="text-xs text-slate-500">
                      사양서 검증용 테스트 시나리오를 작성하거나, 엑셀/CSV 템플릿을 다운로드 및 업로드하여 ALV 화면에 즉시 반영할 수 있습니다.
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
                      title="현재 필드 카탈로그 구조에 맞춘 엑셀/CSV 템플릿 양식을 다운로드합니다."
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>양식 다운로드</span>
                    </button>

                    {/* Excel / CSV Upload Button */}
                    <label
                      className="px-3 py-1.5 text-xs font-bold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-300 rounded flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                      title="작성된 엑셀/CSV 데이터를 업로드하여 ALV 그리드에 반영합니다. (상태 필드는 모두 녹색 '1'로 지정)"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>엑셀/CSV 업로드</span>
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
                      <span>테스트 항목 추가</span>
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
                    <span>테스트 시나리오 목록</span>
                    <span className="text-[11px] font-normal text-slate-500">
                      총 {activeTestCases.length}건
                    </span>
                  </div>
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-700 font-semibold text-[11px] border-b border-slate-200">
                      <tr>
                        <th className="p-2.5 w-12 text-center">No</th>
                        <th className="p-2.5 w-48">시나리오 (Scenario)</th>
                        <th className="p-2.5">입력 조건 (Condition)</th>
                        <th className="p-2.5">예상 결과 (Expected Result)</th>
                        <th className="p-2.5 w-16 text-center">삭제</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11px]">
                      {activeTestCases.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-slate-400">
                            등록된 테스트 시나리오가 없습니다. 상단 '테스트 항목 추가' 버튼을 눌러 추가하세요.
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
                        ALV Grid 테스트 데이터 ({activeIsItem ? 'Item Grid' : 'Header Grid'}: {activeMockRows.length}건)
                      </span>
                    </div>
                    <span className="text-[11px] text-blue-700 font-normal">
                      우측 Simulate 화면에 실시간 렌더링됩니다
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
                              테스트 데이터가 없습니다. 상단의 '양식 다운로드' 후 '엑셀/CSV 업로드'를 실행해보세요.
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
                                          {val === '1' ? '정상(1)' : val === '2' ? '경고(2)' : '오류(3)'}
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
      </div>
    </div>
  );
};
