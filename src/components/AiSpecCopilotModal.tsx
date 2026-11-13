import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Wand2,
  X,
  Loader2,
  CheckCircle2,
  Database,
  Sliders,
  Table,
  Layers,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { ProgramSpec, SapModule } from '../types/sap';
import { DEFAULT_ALV_TOOLBAR_BUTTONS } from '../data/defaultToolbarButtons';
import { requestAiFullSpecDraft, FullSpecDraftResponse } from '../utils/aiLogicGenerator';

interface AiSpecCopilotModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSpec: ProgramSpec;
  onApplySpec: (generatedSpec: ProgramSpec) => void;
}

const QUICK_PROMPTS: {
  label: string;
  module: SapModule;
  sampleType: string;
  prompt: string;
}[] = [
  {
    label: 'SD 판매오더 출하지연',
    module: 'SD',
    sampleType: '01',
    prompt:
      '영업조직, 전표일자, 판매오더 번호, 출하 상태(전체/미납만) 라디오 버튼으로 조회하여 고객별 판매오더 납품 진행 상태와 신호등(정상/진행/지연), 공급가액 합계를 표시하고 VA03으로 드릴다운하는 ALV 리포트',
  },
  {
    label: 'MM 구매오더 Master-Detail',
    module: 'MM',
    sampleType: '02',
    prompt:
      '회사코드, 플랜트, 발주일자 조건으로 구매오더 헤더(EKKO)를 상단 그리드에 표시하고, 행 클릭 시 하단 그리드에 구매오더 품목(EKPO)과 미입고 잔량, 입고처리(MIGO) 커스텀 툴바 버튼을 제공하는 Master-Detail 프로그램',
  },
  {
    label: 'FI 미결채권 Aging 분석',
    module: 'FI',
    sampleType: '01',
    prompt:
      '회사코드, 전기일자, 고객코드로 미결 회계전표(BSID/BKPF/KNA1)를 조회하여 연체 일수 기준 신호등 경고, 원화금액 합계, FB03 전표 드릴다운 및 일괄 반제 버튼을 제공하는 채권 관리 리포트',
  },
  {
    label: 'CO 코스트센터 실적 대비 계획',
    module: 'CO',
    sampleType: '04',
    prompt:
      '관리회계영역(KOKRS), 회계연도(GJAHR), 기간(PERIO) 조건으로 코스트센터별 원가요소(CSKS/COEP/COSP) 계획 대비 실적 금액 및 차이율을 다차원 피벗 그리드로 분석하는 리포트',
  },
];

export const AiSpecCopilotModal: React.FC<AiSpecCopilotModalProps> = ({
  isOpen,
  onClose,
  currentSpec,
  onApplySpec,
}) => {
  const [requirementPrompt, setRequirementPrompt] = useState('');
  const [selectedModule, setSelectedModule] = useState<SapModule | 'AUTO'>('AUTO');
  const [sampleType, setSampleType] = useState<string>(currentSpec.sample_type || '01');
  const [programId, setProgramId] = useState('');
  const [tcode, setTcode] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [draftResult, setDraftResult] = useState<FullSpecDraftResponse | null>(null);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setSampleType(currentSpec.sample_type || '01');
    }
  }, [isOpen, currentSpec.sample_type]);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!requirementPrompt.trim()) {
      setErrorMsg('생성할 SAP 프로그램의 업무 요구사항을 입력해 주세요.');
      return;
    }
    setIsGenerating(true);
    setErrorMsg(null);
    try {
      const res = await requestAiFullSpecDraft({
        requirementPrompt: requirementPrompt.trim(),
        module: selectedModule,
        sampleType,
        targetSapRelease: currentSpec.target_sap_release || 'SAP S/4HANA 2023 / ECC 6.0',
        programId: programId.trim() || undefined,
        tcode: tcode.trim() || undefined,
      });
      setDraftResult(res);
    } catch (err: any) {
      setErrorMsg(err?.message || '사양서 초안 생성 중 오류가 발생했습니다.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplyDraft = () => {
    if (!draftResult?.spec) return;
    const d = draftResult.spec;
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const mergedSpec: ProgramSpec = {
      ...d,
      id: currentSpec.id,
      author: currentSpec.author || d.author,
      toolbar_buttons:
        d.toolbar_buttons && d.toolbar_buttons.length > 0
          ? d.toolbar_buttons
          : DEFAULT_ALV_TOOLBAR_BUTTONS.map((b) => ({ ...b })),
      source_code: undefined, // Reset stale source code so ABAP tabs regenerate cleanly from new spec
      change_history: [
        ...(currentSpec.change_history || []),
        {
          id: `hist-ai-${Date.now()}`,
          version: `v${((currentSpec.change_history?.length || 0) + 1).toFixed(1)}`,
          changed_at: nowStr,
          author: currentSpec.author || 'Josh Lee',
          comment: `AI Spec Copilot 초안 생성 (${d.program_id} / ${d.module})`,
        },
      ],
    };
    onApplySpec(mergedSpec);
    onClose();
  };

  const draft = draftResult?.spec;
  const distinctBoxes = draft
    ? Array.from(new Set(draft.selection_params.map((p) => p.block_title).filter(Boolean)))
    : [];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center">
              <Wand2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold leading-tight">
                AI Spec Copilot (요구사항 → 전체 사양서 자동 생성)
              </h3>
              <p className="text-[11px] text-slate-300">
                업무 요구사항을 입력하면 선택화면, 필드 카탈로그, 데이터 추출 로직, Data Flow 및 Mock 데이터를 즉시 생성합니다.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded cursor-pointer"
            title="Close"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
          {/* Quick Presets */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
            <div className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>빠른 요구사항 예시 (클릭 시 자동 입력)</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_PROMPTS.map((q) => (
                <button
                  key={q.label}
                  type="button"
                  onClick={() => {
                    setRequirementPrompt(q.prompt);
                    setSelectedModule(q.module);
                    setSampleType(q.sampleType);
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-blue-50 hover:border-blue-300 border border-slate-200 rounded text-[11px] font-semibold text-slate-700 transition-colors cursor-pointer"
                >
                  [{q.module}] {q.label}
                </button>
              ))}
            </div>
          </div>

          {/* Requirement Input + Options */}
          <div className="space-y-3">
            <div>
              <label className="block font-bold text-slate-800 mb-1">
                비즈니스 요구사항 (Natural Language Requirement) <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={4}
                value={requirementPrompt}
                onChange={(e) => setRequirementPrompt(e.target.value)}
                placeholder="예: 회사코드, 플랜트, 발주일자 기준으로 구매오더 입고 지연 현황을 조회하고, 지연 건은 빨간색 신호등으로 표시하며 구매오더 번호 클릭 시 ME23N으로 이동하는 ALV 리포트를 설계해 주세요."
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">SAP Module</label>
                <select
                  value={selectedModule}
                  onChange={(e) => setSelectedModule(e.target.value as SapModule | 'AUTO')}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-semibold text-slate-800 focus:bg-white focus:border-blue-500 cursor-pointer"
                >
                  <option value="AUTO">자동 감지 (Auto)</option>
                  <option value="SD">SD (Sales & Distribution)</option>
                  <option value="MM">MM (Materials Management)</option>
                  <option value="FI">FI (Financial Accounting)</option>
                  <option value="CO">CO (Controlling)</option>
                  <option value="PP">PP (Production Planning)</option>
                  <option value="HR">HR (Human Resources)</option>
                  <option value="QM">QM (Quality Management)</option>
                  <option value="PM">PM (Plant Maintenance)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Screen Pattern</label>
                <select
                  value={sampleType}
                  onChange={(e) => setSampleType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-semibold text-slate-800 focus:bg-white focus:border-blue-500 cursor-pointer"
                >
                  <option value="01">01 (Single ALV Grid)</option>
                  <option value="02">02 (Master-Detail ALV)</option>
                  <option value="03">03 (Tree ALV Grid)</option>
                  <option value="04">04 (Pivot Browser)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Program ID (Optional)</label>
                <input
                  type="text"
                  value={programId}
                  onChange={(e) => setProgramId(e.target.value.toUpperCase())}
                  placeholder="자동 생성 (Z...)"
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-mono font-bold uppercase text-blue-900 focus:bg-white focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">T-Code (Optional)</label>
                <input
                  type="text"
                  value={tcode}
                  onChange={(e) => setTcode(e.target.value.toUpperCase())}
                  placeholder="자동 생성 (Z...)"
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-mono font-bold uppercase text-blue-900 focus:bg-white focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-500">
                현재 작업 중인 프로그램에 덮어쓰기 전에 아래에서 생성된 구성을 미리 확인할 수 있습니다.
              </span>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg font-bold shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>SAP 사양서 초안 생성 중...</span>
                  </>
                ) : draft ? (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>초안 다시 생성</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    <span>전체 사양서 초안 생성</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Generated Draft Preview */}
          {draft && (
            <div className="border border-blue-200 bg-blue-50/30 rounded-xl p-4 space-y-3 animate-in fade-in duration-150">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-200/80 pb-2.5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold text-slate-900 text-sm">{draft.title}</span>
                  <span className="font-mono text-[11px] font-bold px-2 py-0.5 bg-white border border-slate-300 rounded text-blue-900">
                    {draft.program_id} / {draft.tcode}
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 bg-blue-600 text-white rounded">
                    {draft.module} · Type {draft.sample_type}
                  </span>
                </div>
                {draftResult.detectedTables.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap">
                    <Database className="w-3.5 h-3.5 text-slate-500" />
                    {draftResult.detectedTables.map((t) => (
                      <span
                        key={t}
                        className="font-mono text-[10px] font-bold px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-700"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-white border border-slate-200 rounded-lg p-2.5">
                  <div className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
                    <Sliders className="w-3 h-3 text-blue-600" />
                    <span>Selection Screen</span>
                  </div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {draft.selection_params.length}개 필드 ({distinctBoxes.length} Box)
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-lg p-2.5">
                  <div className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
                    <Table className="w-3 h-3 text-indigo-600" />
                    <span>ALV Field Catalog</span>
                  </div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {draft.field_catalog.length}개 컬럼
                    {draft.item_grid ? ` + 품목 ${draft.item_grid.field_catalog.length}개` : ''}
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-lg p-2.5">
                  <div className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
                    <Layers className="w-3 h-3 text-emerald-600" />
                    <span>Mock Data & Tests</span>
                  </div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {draft.mock_rows.length}행 · TC {draft.test_cases.length}건
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-lg p-2.5">
                  <div className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    <span>Custom Toolbar</span>
                  </div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {draft.custom_toolbar.length}개 사용자 버튼
                  </div>
                </div>
              </div>

              {/* Detail Preview Columns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-white border border-slate-200 rounded-lg p-3">
                  <div className="text-[11px] font-bold text-slate-700 mb-1.5">
                    생성된 선택화면 (Selection Parameters)
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                    {draft.selection_params.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between text-[11px] px-2 py-1 bg-slate-50 rounded border border-slate-100"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-mono text-[10px] font-bold px-1 py-0.2 rounded bg-blue-100 text-blue-800 shrink-0">
                            {p.kind === 'SELECT_OPTION'
                              ? 'S-OPT'
                              : p.kind === 'RADIOBUTTON'
                              ? 'RADIO'
                              : p.kind === 'CHECKBOX'
                              ? 'CHK'
                              : 'PARAM'}
                          </span>
                          <span className="font-mono font-bold text-slate-900 shrink-0">{p.name}</span>
                          <span className="text-slate-600 truncate">{p.text}</span>
                        </div>
                        {p.block_title && (
                          <span className="text-[10px] text-slate-400 shrink-0 ml-2">{p.block_title}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-3">
                  <div className="text-[11px] font-bold text-slate-700 mb-1.5">
                    생성된 ALV 컬럼 (Field Catalog)
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                    {draft.field_catalog.map((f) => (
                      <div
                        key={f.id}
                        className="flex items-center justify-between text-[11px] px-2 py-1 bg-slate-50 rounded border border-slate-100"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-mono text-[10px] text-slate-400 w-4 shrink-0">
                            {f.col_pos}
                          </span>
                          <span className="font-mono font-bold text-slate-900 shrink-0">
                            {f.fieldname}
                          </span>
                          <span className="text-slate-600 truncate">{f.coltext}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 ml-2 font-mono text-[10px]">
                          {f.key && <span className="px-1 bg-amber-100 text-amber-800 rounded font-bold">KEY</span>}
                          {f.hotspot && (
                            <span className="px-1 bg-indigo-100 text-indigo-800 rounded font-bold">
                              {f.drilldown_tcode || 'HOT'}
                            </span>
                          )}
                          {f.do_sum && <span className="px-1 bg-emerald-100 text-emerald-800 rounded font-bold">Σ</span>}
                          <span className="text-slate-500">{f.datatype}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0 text-xs">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-md font-semibold cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!draft}
            onClick={handleApplyDraft}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-md font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>현재 사양서에 초안 적용</span>
          </button>
        </div>
      </div>
    </div>
  );
};
