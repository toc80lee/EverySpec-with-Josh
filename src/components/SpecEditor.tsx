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
} from 'lucide-react';
import { ProgramSpec, SapModule, TestCase, AlvToolbarButton } from '../types/sap';
import { FieldCatalogEditor } from './FieldCatalogEditor';
import { SelectionScreenEditor } from './SelectionScreenEditor';
import { ToolbarEditor } from './ToolbarEditor';
import { DEFAULT_ALV_TOOLBAR_BUTTONS } from '../data/defaultToolbarButtons';
import { useVoiceInput } from '../hooks/useVoiceInput';
import { requestAiLogicGeneration } from '../utils/aiLogicGenerator';

interface SpecEditorProps {
  spec: ProgramSpec;
  onChange: (updated: ProgramSpec) => void;
}

export const SpecEditor: React.FC<SpecEditorProps> = ({ spec, onChange }) => {
  // Main Tabs: 1. Program Spec -> 2. Selection Screen -> 3. ALV Grid
  const [mainTab, setMainTab] = useState<'info' | 'selection' | 'alv'>('info');

  // ALV Grid Sub Tabs: 1. Layout -> 2. Field Catalog -> 3. Toolbar -> 4. Test Case
  const [alvSubTab, setAlvSubTab] = useState<'layout' | 'fields' | 'toolbar' | 'tests'>('layout');

  const [isGeneratingLogic, setIsGeneratingLogic] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

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

  // Add test case
  const handleAddTestCase = () => {
    const nextIdx = spec.test_cases.length + 1;
    const newTc: TestCase = {
      id: `tc-${Date.now()}`,
      scenario: `시나리오 ${nextIdx}: 정상 데이터 검증`,
      condition: '입력 조건 설정',
      expected: '예상 결과 확인',
    };
    onChange({
      ...spec,
      test_cases: [...spec.test_cases, newTc],
    });
  };

  const toolbarButtonsCount = (spec.toolbar_buttons && spec.toolbar_buttons.length > 0)
    ? spec.toolbar_buttons.filter(b => b.visible !== false).length
    : DEFAULT_ALV_TOOLBAR_BUTTONS.length;

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
              <h3 className="text-sm font-bold text-slate-900">기본 정보 및 업무 사양 명세</h3>
              <p className="text-xs text-slate-500">
                SAP 표준 개발 문서 양식에 포함될 프로그램 ID, T-Code, 담당자 및 업무 배경을 입력합니다.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  프로그램 ID (Program Name)
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
                  트랜잭션 코드 (T-Code)
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
                  SAP 모듈 (Module)
                </label>
                <select
                  value={spec.module}
                  onChange={(e) => onChange({ ...spec, module: e.target.value as SapModule })}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-xs font-semibold text-slate-800 focus:bg-white focus:border-blue-500"
                >
                  <option value="SD">SD (영업 및 유통 - Sales & Distribution)</option>
                  <option value="MM">MM (구매 및 자재관리 - Materials Management)</option>
                  <option value="FI">FI (재무회계 - Financial Accounting)</option>
                  <option value="CO">CO (관리회계 - Controlling)</option>
                  <option value="PP">PP (생산관리 - Production Planning)</option>
                  <option value="HR">HR (인사관리 - Human Resources)</option>
                  <option value="QM">QM (품질관리 - Quality Management)</option>
                  <option value="PM">PM (설비관리 - Plant Maintenance)</option>
                  <option value="BC">BC (베이시스 - Basis & System)</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  프로그램 타이틀 (Description / Title)
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
                  작성자 (Author / Consultant)
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
                  대상 SAP 시스템 버전
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
                  업무 개요 및 개발 목적 (Business Purpose)
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
                        ? '음성 녹음 완료 및 변환'
                        : businessVoice.isTranscribing
                        ? '음성 변환 처리 중...'
                        : '마이크로 업무 개요 말하기 (음성 인식)'
                    }
                  >
                    {businessVoice.isListening ? (
                      <>
                        <MicOff className="w-3.5 h-3.5 text-white animate-bounce" />
                        <span>녹음 완료 (클릭 시 텍스트 변환)</span>
                      </>
                    ) : businessVoice.isTranscribing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                        <span>AI 음성 변환 중...</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-3.5 h-3.5 text-blue-600" />
                        <span>음성 입력</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      businessVoice.insertSimulatedVoiceText(
                        '당월 판매 오더 및 출하 실적을 기준으로 미청구 및 미수금 현황을 모니터링하여 여신 초과 위험을 사전에 방지하는 목적의 ALV 그리드 레포트 개발.'
                      )
                    }
                    className="px-2 py-1 text-[11px] text-slate-500 hover:text-blue-700 hover:bg-blue-50 border border-slate-200 rounded transition-colors"
                    title="마이크가 없거나 권한이 차단된 경우 예시 음성 텍스트를 즉시 입력합니다"
                  >
                    예시 음성 텍스트
                  </button>
                </div>
              </div>

              {businessVoice.isListening && (
                <div className="mb-2 p-2.5 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800 flex items-center justify-between flex-wrap gap-2 animate-fadeIn">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping shrink-0" />
                    <span>🎙️ 실시간 음성 듣는 중... 말씀이 끝나면 <strong>[녹음 완료]</strong> 버튼을 누르세요.</span>
                  </div>
                  {businessVoice.transcript && (
                    <span className="font-semibold text-rose-950 italic">"{businessVoice.transcript}"</span>
                  )}
                </div>
              )}

              {businessVoice.isTranscribing && (
                <div className="mb-2 p-2.5 bg-indigo-50 border border-indigo-200 rounded text-xs text-indigo-800 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-indigo-600 animate-spin shrink-0" />
                  <span>Gemini AI가 고음질로 음성을 분석하여 텍스트로 변환 중입니다...</span>
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
                    닫기
                  </button>
                </div>
              )}

              <textarea
                rows={4}
                value={spec.business_purpose}
                onChange={(e) => onChange({ ...spec, business_purpose: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded p-2.5 text-xs leading-relaxed text-slate-800 focus:bg-white focus:border-blue-500 shadow-inner"
                placeholder="개발 배경, 주요 사용자 및 목적을 기술합니다. (키보드로 직접 입력하거나 상단 '음성 입력' 버튼으로 말씀하세요. 음성 변환된 텍스트는 언제든 자유롭게 수정할 수 있습니다)"
              />
            </div>

            {/* Data Extraction & Logic with Voice Input and AI Proposal */}
            <div>
              <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                <label className="block text-xs font-semibold text-slate-700">
                  데이터 추출 및 가공 로직 (Data Extraction & Logic)
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
                        ? '음성 녹음 완료 및 변환'
                        : logicVoice.isTranscribing
                        ? '음성 변환 처리 중...'
                        : '마이크로 데이터 추출 로직 말하기'
                    }
                  >
                    {logicVoice.isListening ? (
                      <>
                        <MicOff className="w-3.5 h-3.5 text-white animate-bounce" />
                        <span>녹음 완료 (클릭 시 텍스트 변환)</span>
                      </>
                    ) : logicVoice.isTranscribing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                        <span>AI 음성 변환 중...</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-3.5 h-3.5 text-blue-600" />
                        <span>음성 입력</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      logicVoice.insertSimulatedVoiceText(
                        '1. VBAK/VBAP 테이블에서 수주 번호 및 품목 정보를 조회하고,\n2. VBRK/VBRP 테이블과 조인하여 청구 현황을 확인한 후,\n3. 미청구 잔액 발생 건에 대해 빨간색 신호등(LIGHTS=3)으로 세팅한다.'
                      )
                    }
                    className="px-2 py-1 text-[11px] text-slate-500 hover:text-blue-700 hover:bg-blue-50 border border-slate-200 rounded transition-colors"
                    title="마이크가 없거나 권한이 차단된 경우 예시 로직 음성 텍스트를 즉시 입력합니다"
                  >
                    예시 로직 텍스트
                  </button>

                  {/* AI Suggest Logic Button */}
                  <button
                    type="button"
                    onClick={handleSuggestLogic}
                    disabled={isGeneratingLogic}
                    className="px-3 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-300 rounded-md flex items-center gap-1.5 transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
                    title="입력된 '업무 개요 및 개발 목적'을 바탕으로 SAP 표준 테이블 조인 및 추출 로직을 AI로 자동 제안합니다."
                  >
                    {isGeneratingLogic ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                        <span>AI 로직 제안 생성 중...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        <span>✨ 업무개요 기반 로직 자동 제안</span>
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
                    <span>🎙️ 실시간 로직 음성 듣는 중... 말씀이 끝나면 <strong>[녹음 완료]</strong> 버튼을 누르세요.</span>
                  </div>
                  {logicVoice.transcript && (
                    <span className="font-semibold text-rose-950 italic">"{logicVoice.transcript}"</span>
                  )}
                </div>
              )}

              {logicVoice.isTranscribing && (
                <div className="mb-2 p-2.5 bg-indigo-50 border border-indigo-200 rounded text-xs text-indigo-800 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-indigo-600 animate-spin shrink-0" />
                  <span>Gemini AI가 고음질로 로직 음성을 분석하여 텍스트로 변환 중입니다...</span>
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
                    닫기
                  </button>
                </div>
              )}

              <textarea
                rows={7}
                value={spec.data_extraction_logic}
                onChange={(e) => onChange({ ...spec, data_extraction_logic: e.target.value })}
                className="w-full bg-slate-900 text-slate-100 border border-slate-800 rounded p-2.5 font-mono text-xs leading-relaxed focus:border-blue-500 shadow-inner"
                placeholder="테이블 조인 조건, WHERE 절 조건, 신호등 판정 로직 등을 작성하거나 상단의 '✨ 업무개요 기반 로직 자동 제안' 버튼을 눌러 AI 추천 로직을 받아보세요. 변환된 텍스트는 언제든 자유롭게 수정할 수 있습니다."
              />
            </div>
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
                  {spec.field_catalog.length}
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
                  {spec.test_cases.length}
                </span>
              </button>
            </div>

            {/* Sub-Tab 1: Layout */}
            {alvSubTab === 'layout' && (
              <div className="space-y-6 max-w-3xl">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Layout (ALV 그리드 레이아웃 설정: LVC_S_LAYO)</h3>
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
                      value={spec.layout.grid_title}
                      onChange={(e) =>
                        onChange({
                          ...spec,
                          layout: { ...spec.layout, grid_title: e.target.value },
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
                      value={spec.layout.sel_mode}
                      onChange={(e) =>
                        onChange({
                          ...spec,
                          layout: {
                            ...spec.layout,
                            sel_mode: e.target.value as 'A' | 'B' | 'C' | 'D',
                          },
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

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      예외 신호등 필드명 (EXCP_FNAME)
                    </label>
                    <input
                      type="text"
                      value={spec.layout.excp_fname || ''}
                      onChange={(e) =>
                        onChange({
                          ...spec,
                          layout: { ...spec.layout, excp_fname: e.target.value.toUpperCase() },
                        })
                      }
                      placeholder="LIGHTS"
                      className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs font-mono uppercase focus:border-blue-500"
                    />
                  </div>

                  <div className="flex flex-col justify-center space-y-2 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800">
                      <input
                        type="checkbox"
                        checked={spec.layout.zebra}
                        onChange={(e) =>
                          onChange({
                            ...spec,
                            layout: { ...spec.layout, zebra: e.target.checked },
                          })
                        }
                        className="w-4 h-4 accent-blue-600 rounded"
                      />
                      <span>줄무늬 패턴 적용 (gs_layo-zebra = 'X')</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800">
                      <input
                        type="checkbox"
                        checked={spec.layout.cwidth_opt}
                        onChange={(e) =>
                          onChange({
                            ...spec,
                            layout: { ...spec.layout, cwidth_opt: e.target.checked },
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
                    <h3 className="text-sm font-bold text-slate-900">Field Catalog (LVC_T_FCAT)</h3>
                    <p className="text-xs text-slate-500">
                      보고자 하는 필드를 추가하고 속성(키, 핫스팟 링크, 체크박스, 수정 가능 여부, 합계 등)을 설정하면 우측 ALV 화면에 즉시 반영됩니다.
                    </p>
                  </div>
                </div>

                <FieldCatalogEditor
                  spec={spec}
                  onChange={(updatedCatalog, updatedMockRows) => {
                    onChange({
                      ...spec,
                      field_catalog: updatedCatalog,
                      ...(updatedMockRows ? { mock_rows: updatedMockRows } : {}),
                    });
                  }}
                />
              </div>
            )}

            {/* Sub-Tab 3: Toolbar */}
            {alvSubTab === 'toolbar' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Toolbar (LVC_T_STB)</h3>
                  <p className="text-xs text-slate-500">
                    업로드하신 SAP 화면의 ALV Toolbar 버튼을 분석한 기본 16개 표준 버튼 및 사용자 정의 커스텀 버튼을 구성합니다.
                    표시 체크박스 및 아이콘 그림을 확인하고 설정할 수 있습니다.
                  </p>
                </div>

                <ToolbarEditor
                  spec={spec}
                  onChange={(updatedButtons) => {
                    onChange({
                      ...spec,
                      toolbar_buttons: updatedButtons,
                    });
                  }}
                />
              </div>
            )}

            {/* Sub-Tab 4: Test Case */}
            {alvSubTab === 'tests' && (
              <div className="space-y-4 max-w-4xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Test Case (단위 및 통합 테스트 케이스 명세)</h3>
                    <p className="text-xs text-slate-500">
                      사양서 제출 및 인도 전 검증해야 할 테스트 항목들을 기록합니다.
                    </p>
                  </div>
                  <button
                    onClick={handleAddTestCase}
                    className="px-3 py-1.5 text-xs font-semibold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-300 rounded flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> 테스트 항목 추가
                  </button>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-xs">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-700 font-semibold text-[11px]">
                      <tr>
                        <th className="p-2.5 w-12 text-center">No</th>
                        <th className="p-2.5 w-48">시나리오 (Scenario)</th>
                        <th className="p-2.5">입력 조건 (Condition)</th>
                        <th className="p-2.5">예상 결과 (Expected Result)</th>
                        <th className="p-2.5 w-16 text-center">삭제</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11px]">
                      {spec.test_cases.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-slate-400">
                            등록된 테스트 케이스가 없습니다.
                          </td>
                        </tr>
                      ) : (
                        spec.test_cases.map((tc, idx) => (
                          <tr key={tc.id}>
                            <td className="p-2 text-center text-slate-500 font-mono font-bold">
                              {idx + 1}
                            </td>
                            <td className="p-1.5">
                              <input
                                type="text"
                                value={tc.scenario}
                                onChange={(e) => {
                                  const next = [...spec.test_cases];
                                  next[idx] = { ...next[idx], scenario: e.target.value };
                                  onChange({ ...spec, test_cases: next });
                                }}
                                className="w-full bg-slate-50 border border-slate-200 px-2 py-1 rounded focus:bg-white focus:border-blue-500"
                              />
                            </td>
                            <td className="p-1.5">
                              <input
                                type="text"
                                value={tc.condition}
                                onChange={(e) => {
                                  const next = [...spec.test_cases];
                                  next[idx] = { ...next[idx], condition: e.target.value };
                                  onChange({ ...spec, test_cases: next });
                                }}
                                className="w-full bg-slate-50 border border-slate-200 px-2 py-1 rounded focus:bg-white focus:border-blue-500"
                              />
                            </td>
                            <td className="p-1.5">
                              <input
                                type="text"
                                value={tc.expected}
                                onChange={(e) => {
                                  const next = [...spec.test_cases];
                                  next[idx] = { ...next[idx], expected: e.target.value };
                                  onChange({ ...spec, test_cases: next });
                                }}
                                className="w-full bg-slate-50 border border-slate-200 px-2 py-1 rounded font-medium text-emerald-900 focus:bg-white focus:border-blue-500"
                              />
                            </td>
                            <td className="p-1.5 text-center">
                              <button
                                onClick={() => {
                                  onChange({
                                    ...spec,
                                    test_cases: spec.test_cases.filter((_, i) => i !== idx),
                                  });
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
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
