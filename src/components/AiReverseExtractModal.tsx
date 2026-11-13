import React, { useState, useEffect } from 'react';
import {
  GitPullRequestCreate,
  X,
  Loader2,
  Check,
  Database,
  Sliders,
  Table,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { AlvField, ProgramSpec, SelectionParameter } from '../types/sap';
import {
  requestAiReverseExtract,
  SuggestedFieldCatalogItem,
  SuggestedSelectionParamItem,
} from '../utils/aiLogicGenerator';

interface AiReverseExtractModalProps {
  isOpen: boolean;
  onClose: () => void;
  spec: ProgramSpec;
  activeFieldCatalog: AlvField[];
  initialFocus?: 'all' | 'selection' | 'fields';
  onApply: (selectedParams: SelectionParameter[], selectedFields: AlvField[]) => void;
}

export const AiReverseExtractModal: React.FC<AiReverseExtractModalProps> = ({
  isOpen,
  onClose,
  spec,
  activeFieldCatalog,
  initialFocus = 'all',
  onApply,
}) => {
  const [logicInput, setLogicInput] = useState(spec.data_extraction_logic || '');
  const [purposeInput, setPurposeInput] = useState(spec.business_purpose || '');
  const [showEditor, setShowEditor] = useState(false);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [detectedTables, setDetectedTables] = useState<string[]>([]);
  const [paramSuggestions, setParamSuggestions] = useState<SuggestedSelectionParamItem[]>([]);
  const [fieldSuggestions, setFieldSuggestions] = useState<SuggestedFieldCatalogItem[]>([]);

  const [selectedParamNames, setSelectedParamNames] = useState<Set<string>>(new Set());
  const [selectedFieldNames, setSelectedFieldNames] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'all' | 'selection' | 'fields'>(initialFocus);

  const runAnalysis = async (purposeText: string, logicText: string) => {
    if (!purposeText.trim() && !logicText.trim()) {
      setErrorMsg('분석할 Business Purpose 또는 Data Extraction & Logic 내용이 필요합니다.');
      return;
    }
    setIsAnalyzing(true);
    setErrorMsg(null);
    try {
      const result = await requestAiReverseExtract({
        businessPurpose: purposeText,
        dataExtractionLogic: logicText,
        module: spec.module,
        sampleType: spec.sample_type || '01',
        existingSelectionParams: spec.selection_params || [],
        existingFieldCatalog: activeFieldCatalog || [],
      });
      setDetectedTables(result.detectedTables || []);
      setParamSuggestions(result.suggestedSelectionParams || []);
      setFieldSuggestions(result.suggestedFieldCatalog || []);
      setSelectedParamNames(new Set(result.suggestedSelectionParams.map((p) => p.name)));
      setSelectedFieldNames(new Set(result.suggestedFieldCatalog.map((f) => f.fieldname)));
    } catch (err: any) {
      setErrorMsg(err?.message || '사양서 역추출 분석 중 오류가 발생했습니다.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const p = spec.business_purpose || '';
      const l = spec.data_extraction_logic || '';
      setPurposeInput(p);
      setLogicInput(l);
      setActiveTab(initialFocus);
      setShowEditor(!p.trim() && !l.trim());
      if (p.trim() || l.trim()) {
        runAnalysis(p, l);
      } else {
        setDetectedTables([]);
        setParamSuggestions([]);
        setFieldSuggestions([]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialFocus]);

  if (!isOpen) return null;

  const toggleParam = (name: string) => {
    setSelectedParamNames((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const toggleField = (fieldname: string) => {
    setSelectedFieldNames((prev) => {
      const next = new Set(prev);
      if (next.has(fieldname)) next.delete(fieldname);
      else next.add(fieldname);
      return next;
    });
  };

  const handleApply = () => {
    const nowTs = Date.now();
    // Resolve box IDs consistently against existing selection_params
    const existingBoxMap = new Map<string, string>();
    (spec.selection_params || []).forEach((p) => {
      if (p.block_title && p.block_id) {
        existingBoxMap.set(p.block_title.trim().toLowerCase(), p.block_id);
      }
    });
    let nextBoxIdx = existingBoxMap.size + 1;

    const chosenParams: SelectionParameter[] = paramSuggestions
      .filter((p) => selectedParamNames.has(p.name))
      .map((p, idx) => {
        const cleanTitle = (p.block_title || '기본 조회 조건').trim();
        const titleKey = cleanTitle.toLowerCase();
        let resolvedBlockId = existingBoxMap.get(titleKey);
        if (!resolvedBlockId) {
          resolvedBlockId = `b${nextBoxIdx++}`;
          existingBoxMap.set(titleKey, resolvedBlockId);
        }
        return {
          id: `ext-p-${nowTs}-${idx}`,
          kind: p.kind,
          name: p.name,
          text: p.text,
          ref_table: p.ref_table || '',
          ref_field: p.ref_field || '',
          datatype: p.datatype,
          length: p.length,
          obligatory: p.obligatory,
          default_val: p.default_val || '',
          block_title: cleanTitle,
          block_id: resolvedBlockId,
          radio_group: p.radio_group,
          low: p.default_val || '',
          high: '',
          sign: 'I',
          option: 'EQ',
        };
      });

    const startPos = activeFieldCatalog.length + 1;
    const chosenFields: AlvField[] = fieldSuggestions
      .filter((f) => selectedFieldNames.has(f.fieldname))
      .map((f, idx) => ({
        id: `ext-f-${nowTs}-${idx}`,
        col_pos: startPos + idx,
        fieldname: f.fieldname,
        coltext: f.coltext,
        datatype: f.datatype,
        outputlen: f.outputlen,
        just: f.just,
        key: f.key,
        hotspot: f.hotspot,
        checkbox: false,
        edit: false,
        do_sum: f.do_sum,
        emphasize: f.emphasize || '',
        cfieldname: f.cfieldname,
        qfieldname: f.qfieldname,
        ref_table: f.ref_table,
        ref_field: f.ref_field,
        drilldown_tcode: f.drilldown_tcode,
      }));

    onApply(chosenParams, chosenFields);
    onClose();
  };

  const showSelection = activeTab === 'all' || activeTab === 'selection';
  const showFields = activeTab === 'all' || activeTab === 'fields';
  const totalSelectedCount = selectedParamNames.size + selectedFieldNames.size;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-indigo-600 flex items-center justify-center">
              <GitPullRequestCreate className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold leading-tight">
                AI 사양서 역추출 (Logic ↔ Selection Screen & Field Catalog 추천)
              </h3>
              <p className="text-[11px] text-slate-300">
                업무 목적 및 데이터 추출 로직을 분석하여 누락된 선택화면 파라미터와 ALV 출력 컬럼을 자동 추천합니다.
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
          {/* Context Strip & Toggleable Logic Text */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-slate-700 flex items-center gap-1">
                  <Database className="w-3.5 h-3.5 text-blue-600" />
                  <span>감지된 SAP 테이블:</span>
                </span>
                {detectedTables.length > 0 ? (
                  detectedTables.map((tbl) => (
                    <span
                      key={tbl}
                      className="font-mono text-[11px] font-bold px-2 py-0.5 bg-white border border-blue-200 text-blue-900 rounded"
                    >
                      {tbl}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-400">분석 대기 중</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditor((v) => !v)}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded text-[11px] font-semibold text-slate-700 cursor-pointer"
                >
                  {showEditor ? '분석 텍스트 접기' : '분석 텍스트 편집'}
                </button>
                <button
                  type="button"
                  disabled={isAnalyzing}
                  onClick={() => runAnalysis(purposeInput, logicInput)}
                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  {isAnalyzing ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3 h-3" />
                  )}
                  <span>다시 분석</span>
                </button>
              </div>
            </div>

            {showEditor && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Business Purpose
                  </label>
                  <textarea
                    rows={4}
                    value={purposeInput}
                    onChange={(e) => setPurposeInput(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Data Extraction & Logic
                  </label>
                  <textarea
                    rows={4}
                    value={logicInput}
                    onChange={(e) => setLogicInput(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs font-mono text-slate-800 focus:border-blue-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Focus Filter Tabs */}
          <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              전체 ({paramSuggestions.length + fieldSuggestions.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('selection')}
              className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'selection'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Selection Screen ({paramSuggestions.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('fields')}
              className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'fields'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Field Catalog ({fieldSuggestions.length})</span>
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {isAnalyzing ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-500 gap-2">
              <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
              <p className="font-semibold text-slate-700">
                SAP 테이블, WHERE 조건 및 출력 컬럼을 역추출 분석하고 있습니다...
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Section 1: Selection Screen Parameters */}
              {showSelection && (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="px-3.5 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-slate-800">
                      <Sliders className="w-3.5 h-3.5 text-blue-600" />
                      <span>추천 Selection Screen 항목 ({paramSuggestions.length}건)</span>
                    </div>
                    {paramSuggestions.length > 0 && (
                      <div className="flex items-center gap-2 text-[11px]">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedParamNames(new Set(paramSuggestions.map((p) => p.name)))
                          }
                          className="text-blue-700 hover:underline font-semibold cursor-pointer"
                        >
                          전체 선택
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={() => setSelectedParamNames(new Set())}
                          className="text-slate-600 hover:underline cursor-pointer"
                        >
                          선택 해제
                        </button>
                      </div>
                    )}
                  </div>

                  {paramSuggestions.length === 0 ? (
                    <div className="p-4 text-center text-slate-400">
                      현재 로직 기준으로 추가로 추천할 누락 선택화면 항목이 없습니다.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {paramSuggestions.map((item) => {
                        const checked = selectedParamNames.has(item.name);
                        return (
                          <label
                            key={item.name}
                            className={`flex items-start gap-3 px-3.5 py-2.5 cursor-pointer transition-colors ${
                              checked ? 'bg-blue-50/60' : 'hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleParam(item.name)}
                              className="mt-0.5 w-4 h-4 accent-blue-600 rounded shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                    item.kind === 'SELECT_OPTION'
                                      ? 'bg-blue-100 text-blue-800'
                                      : item.kind === 'RADIOBUTTON'
                                      ? 'bg-indigo-100 text-indigo-800'
                                      : item.kind === 'CHECKBOX'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {item.kind === 'SELECT_OPTION'
                                    ? 'S-OPT'
                                    : item.kind === 'RADIOBUTTON'
                                    ? 'RADIO'
                                    : item.kind === 'CHECKBOX'
                                    ? 'CHK'
                                    : 'PARAM'}
                                </span>
                                <span className="font-mono font-bold text-slate-900">
                                  {item.name}
                                </span>
                                <span className="font-semibold text-slate-700">{item.text}</span>
                                <span className="font-mono text-[10px] text-slate-500 bg-white border border-slate-200 px-1.5 py-0.2 rounded">
                                  {item.datatype}({item.length})
                                </span>
                                {item.ref_table && (
                                  <span className="font-mono text-[10px] text-blue-800 bg-blue-50 px-1.5 py-0.2 rounded">
                                    {item.ref_table}-{item.ref_field}
                                  </span>
                                )}
                                {item.block_title && (
                                  <span className="text-[10px] text-slate-500">
                                    [Box: {item.block_title}]
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">{item.reason}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Section 2: Field Catalog Columns */}
              {showFields && (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="px-3.5 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-slate-800">
                      <Table className="w-3.5 h-3.5 text-indigo-600" />
                      <span>추천 ALV Field Catalog 컬럼 ({fieldSuggestions.length}건)</span>
                    </div>
                    {fieldSuggestions.length > 0 && (
                      <div className="flex items-center gap-2 text-[11px]">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedFieldNames(
                              new Set(fieldSuggestions.map((f) => f.fieldname))
                            )
                          }
                          className="text-indigo-700 hover:underline font-semibold cursor-pointer"
                        >
                          전체 선택
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={() => setSelectedFieldNames(new Set())}
                          className="text-slate-600 hover:underline cursor-pointer"
                        >
                          선택 해제
                        </button>
                      </div>
                    )}
                  </div>

                  {fieldSuggestions.length === 0 ? (
                    <div className="p-4 text-center text-slate-400">
                      현재 로직 기준으로 추가로 추천할 누락 ALV 컬럼이 없습니다.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {fieldSuggestions.map((item) => {
                        const checked = selectedFieldNames.has(item.fieldname);
                        return (
                          <label
                            key={item.fieldname}
                            className={`flex items-start gap-3 px-3.5 py-2.5 cursor-pointer transition-colors ${
                              checked ? 'bg-indigo-50/60' : 'hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleField(item.fieldname)}
                              className="mt-0.5 w-4 h-4 accent-indigo-600 rounded shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono font-bold text-slate-900">
                                  {item.fieldname}
                                </span>
                                <span className="font-semibold text-slate-700">{item.coltext}</span>
                                <span className="font-mono text-[10px] text-slate-500 bg-white border border-slate-200 px-1.5 py-0.2 rounded">
                                  {item.datatype}({item.outputlen}) · {item.just}
                                </span>
                                {item.key && (
                                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded">
                                    KEY
                                  </span>
                                )}
                                {item.hotspot && (
                                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 bg-indigo-100 text-indigo-800 rounded">
                                    HOTSPOT {item.drilldown_tcode ? `→ ${item.drilldown_tcode}` : ''}
                                  </span>
                                )}
                                {item.do_sum && (
                                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded">
                                    Σ DO_SUM
                                  </span>
                                )}
                                {item.ref_table && (
                                  <span className="font-mono text-[10px] text-blue-800 bg-blue-50 px-1.5 py-0.2 rounded">
                                    {item.ref_table}-{item.ref_field}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">{item.reason}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0 text-xs">
          <div className="text-slate-600">
            선택됨:{' '}
            <strong className="text-blue-700">Selection {selectedParamNames.size}건</strong>
            {' · '}
            <strong className="text-indigo-700">Field Catalog {selectedFieldNames.size}건</strong>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-md font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={totalSelectedCount === 0 || isAnalyzing}
              onClick={handleApply}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-md font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>선택 항목 반영 ({totalSelectedCount})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
