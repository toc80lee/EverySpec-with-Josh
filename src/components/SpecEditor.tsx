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
} from 'lucide-react';
import { ProgramSpec, SapModule, TestCase, AlvToolbarButton } from '../types/sap';
import { FieldCatalogEditor } from './FieldCatalogEditor';
import { SelectionScreenEditor } from './SelectionScreenEditor';
import { ToolbarEditor } from './ToolbarEditor';
import { DEFAULT_ALV_TOOLBAR_BUTTONS } from '../data/defaultToolbarButtons';

interface SpecEditorProps {
  spec: ProgramSpec;
  onChange: (updated: ProgramSpec) => void;
}

export const SpecEditor: React.FC<SpecEditorProps> = ({ spec, onChange }) => {
  // Main Tabs: 1. 프로그램 개요 & 로직 -> 2. Selection Screen -> 3. ALV 그리드
  const [mainTab, setMainTab] = useState<'info' | 'selection' | 'alv'>('info');

  // ALV 그리드 Sub Tabs: 1. Layout -> 2. Field Catalog -> 3. Toolbar -> 4. Test Case
  const [alvSubTab, setAlvSubTab] = useState<'layout' | 'fields' | 'toolbar' | 'tests'>('layout');

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

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                업무 개요 및 개발 목적 (Business Purpose)
              </label>
              <textarea
                rows={4}
                value={spec.business_purpose}
                onChange={(e) => onChange({ ...spec, business_purpose: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded p-2.5 text-xs leading-relaxed text-slate-800 focus:bg-white focus:border-blue-500"
                placeholder="개발 배경, 주요 사용자 및 목적을 기술합니다."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                데이터 추출 및 가공 로직 (Data Extraction & Logic)
              </label>
              <textarea
                rows={5}
                value={spec.data_extraction_logic}
                onChange={(e) => onChange({ ...spec, data_extraction_logic: e.target.value })}
                className="w-full bg-slate-900 text-slate-100 border border-slate-800 rounded p-2.5 font-mono text-xs leading-relaxed focus:border-blue-500"
                placeholder="테이블 조인 조건, WHERE 절 조건, 신호등 판정 로직 등을 작성합니다."
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
