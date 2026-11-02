import React, { useState } from 'react';
import {
  Workflow,
  Sparkles,
  RotateCcw,
  Plus,
  Trash2,
  Database,
  Layers,
  Columns,
  Eye,
  Check,
  Edit3,
} from 'lucide-react';
import {
  DataFlowDiagramConfig,
  DataFlowStep,
  DataFlowDatabase,
  ProgramSpec,
  FlowStepKind,
} from '../types/sap';
import { DataFlowViewer } from './DataFlowViewer';
import { DEFAULT_CO_DATA_FLOW, generateDataFlowFromSpec } from '../utils/dataFlowGenerator';

interface DataFlowEditorProps {
  spec: ProgramSpec;
  onChange: (updatedFlow: DataFlowDiagramConfig) => void;
}

export const DataFlowEditor: React.FC<DataFlowEditorProps> = ({ spec, onChange }) => {
  const currentFlow: DataFlowDiagramConfig =
    spec.data_flow && spec.data_flow.steps?.length > 0
      ? spec.data_flow
      : generateDataFlowFromSpec(spec);

  const [viewMode, setViewMode] = useState<'split' | 'visual' | 'table'>('split');
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Auto-generate from Program Spec Logic
  const handleAutoGenerate = () => {
    const generated = generateDataFlowFromSpec(spec);
    onChange(generated);
    setNotice('현재 프로그램 로직 및 모듈 정보를 기반으로 Data Flow 다이어그램이 자동 생성되었습니다.');
    setTimeout(() => setNotice(null), 5000);
  };

  // Reset to reference uploaded diagram standard
  const handleResetStandard = () => {
    const standard = JSON.parse(JSON.stringify(DEFAULT_CO_DATA_FLOW));
    onChange(standard);
    setNotice('사용자 사양서 표준 Data Flow 흐름도 템플릿으로 복원되었습니다.');
    setTimeout(() => setNotice(null), 5000);
  };

  // Update a single step
  const handleUpdateStep = (stepId: string, patch: Partial<DataFlowStep>) => {
    const updatedSteps = currentFlow.steps.map((s) => {
      if (s.id === stepId) {
        return { ...s, ...patch };
      }
      return s;
    });
    onChange({ ...currentFlow, steps: updatedSteps });
  };

  // Add step
  const handleAddStep = () => {
    const nextIdx = currentFlow.steps.length;
    const newStep: DataFlowStep = {
      id: `step-${Date.now()}`,
      step_no: `${nextIdx})`,
      label: `${nextIdx}) 신규 처리 단계`,
      kind: 'process',
      description: '추가 처리 단계 및 로직 설명',
    };
    onChange({ ...currentFlow, steps: [...currentFlow.steps, newStep] });
    setSelectedStepId(newStep.id);
  };

  // Delete step
  const handleDeleteStep = (stepId: string) => {
    const updated = currentFlow.steps.filter((s) => s.id !== stepId);
    onChange({ ...currentFlow, steps: updated });
    if (selectedStepId === stepId) setSelectedStepId(null);
  };

  // Update DB Cylinder
  const handleUpdateDb = (dbId: string, patch: Partial<DataFlowDatabase>) => {
    const updatedDbs = currentFlow.databases.map((db) => {
      if (db.id === dbId) {
        return { ...db, ...patch };
      }
      return db;
    });
    onChange({ ...currentFlow, databases: updatedDbs });
  };

  const selectedStep = currentFlow.steps.find((s) => s.id === selectedStepId);

  return (
    <div className="space-y-3 pt-4 border-t border-slate-200">
      {/* Header bar */}
      <div className="flex items-center justify-between flex-wrap gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
        <div className="flex items-center gap-2">
          <Workflow className="w-4 h-4 text-blue-700" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900">
                Data Flow (프로그램 처리 흐름도)
              </span>
              <span className="text-[10px] bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded-full">
                {currentFlow.steps.length} Steps
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              프로그램 시작부터 화면 호출, DB 조회, BAPI 실행 및 종료까지의 처리 흐름을 다이어그램으로 명세합니다.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-white border border-slate-300 rounded p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`px-2 py-1 rounded flex items-center gap-1 font-medium transition-colors ${
                viewMode === 'split' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="편집기 & 다이어그램 좌우 분할"
            >
              <Columns className="w-3 h-3" />
              <span>Split</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('visual')}
              className={`px-2 py-1 rounded flex items-center gap-1 font-medium transition-colors ${
                viewMode === 'visual' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="다이어그램만 크게 보기"
            >
              <Eye className="w-3 h-3" />
              <span>Diagram</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-2 py-1 rounded flex items-center gap-1 font-medium transition-colors ${
                viewMode === 'table' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="단계별 테이블 목록 편집"
            >
              <Layers className="w-3 h-3" />
              <span>Steps</span>
            </button>
          </div>

          {/* Auto Generate Button */}
          <button
            type="button"
            onClick={handleAutoGenerate}
            className="px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-300 rounded flex items-center gap-1 transition-colors cursor-pointer"
            title="프로그램 로직과 모듈 테이블을 분석하여 Data Flow를 자동 생성합니다"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>로직 기반 자동 생성</span>
          </button>

          {/* Reset Standard Template */}
          <button
            type="button"
            onClick={handleResetStandard}
            className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded flex items-center gap-1 transition-colors cursor-pointer"
            title="표준 12단계 흐름도 템플릿으로 복원"
          >
            <RotateCcw className="w-3 h-3 text-slate-500" />
            <span>표준 복원</span>
          </button>
        </div>
      </div>

      {notice && (
        <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded text-xs text-emerald-800 flex items-center gap-2 animate-fadeIn">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Side: Step List & DB Cylinder Editor (Visible in split & table modes) */}
        {(viewMode === 'split' || viewMode === 'table') && (
          <div
            className={`space-y-4 ${
              viewMode === 'split' ? 'lg:col-span-6' : 'lg:col-span-12'
            }`}
          >
            {/* Database Cylinders Configuration */}
            <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-amber-600" />
                  <span>데이터베이스 연계 실린더 (DB Tables)</span>
                </span>
                <span className="text-[11px] text-slate-400">다이어그램 좌측 원통형 표시</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {currentFlow.databases.map((db, idx) => (
                  <div
                    key={db.id || idx}
                    className="p-2.5 bg-slate-50 border border-slate-200 rounded text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between font-semibold text-slate-700 text-[11px]">
                      <span>{idx === 0 ? '상단 DB (마스터 테이블)' : '하단 DB (트랜잭션/세트 테이블)'}</span>
                      <span className="text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200 font-mono">
                        연결: {db.target_steps?.join(', ') || '-'}
                      </span>
                    </div>
                    <textarea
                      rows={idx === 0 ? 2 : 3}
                      value={db.name}
                      onChange={(e) => handleUpdateDb(db.id, { name: e.target.value.toUpperCase() })}
                      placeholder="테이블명을 줄바꿈으로 입력 (예: T004&#10;T004T)"
                      className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs font-mono font-bold text-slate-800 uppercase focus:border-blue-500"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Steps Flow Table */}
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
              <div className="flex items-center justify-between px-3 py-2 bg-slate-100 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Workflow className="w-3.5 h-3.5 text-blue-600" />
                  <span>흐름 단계 정의 (Flow Steps)</span>
                </span>
                <button
                  type="button"
                  onClick={handleAddStep}
                  className="px-2 py-1 text-[11px] font-semibold text-blue-700 bg-white hover:bg-blue-50 border border-blue-300 rounded flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>단계 추가</span>
                </button>
              </div>

              <div className="max-h-[500px] overflow-y-auto divide-y divide-slate-100">
                {currentFlow.steps.map((step) => {
                  const isSel = selectedStepId === step.id;
                  return (
                    <div
                      key={step.id}
                      onClick={() => setSelectedStepId(step.id)}
                      className={`p-2.5 transition-colors cursor-pointer text-xs ${
                        isSel ? 'bg-blue-50/70 border-l-4 border-l-blue-600' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            value={step.step_no}
                            onChange={(e) => handleUpdateStep(step.id, { step_no: e.target.value })}
                            className="w-14 px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono font-bold text-center text-[11px]"
                            title="단계 번호 (예: 1), 2), 5-1), 7-2-1))"
                          />
                          <input
                            type="text"
                            value={step.label}
                            onChange={(e) => handleUpdateStep(step.id, { label: e.target.value })}
                            className="flex-1 px-2 py-0.5 bg-white border border-slate-300 rounded font-semibold text-slate-800 text-xs focus:border-blue-500"
                            placeholder="단계명 (예: 1) 초기화)"
                          />
                        </div>

                        <select
                          value={step.kind}
                          onChange={(e) =>
                            handleUpdateStep(step.id, { kind: e.target.value as FlowStepKind })
                          }
                          className="px-1.5 py-0.5 text-[11px] bg-white border border-slate-300 rounded font-medium text-slate-700"
                        >
                          <option value="start">Start (시작)</option>
                          <option value="process">Process (처리)</option>
                          <option value="decision">Decision (분기 판정)</option>
                          <option value="screen">Screen (화면 호출)</option>
                          <option value="bapi">BAPI (함수 실행)</option>
                          <option value="end">End (종료)</option>
                        </select>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteStep(step.id);
                          }}
                          className="p-1 text-slate-400 hover:text-red-600"
                          title="삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Description / ABAP Event */}
                      <input
                        type="text"
                        value={step.description || ''}
                        onChange={(e) => handleUpdateStep(step.id, { description: e.target.value })}
                        placeholder="상세 ABAP 처리 로직 또는 이벤트 설명 (예: START-OF-SELECTION: 기존 계층구조 조회)"
                        className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-600 focus:bg-white focus:border-blue-500"
                      />

                      {/* Branch labels for decision kinds */}
                      {(step.kind === 'decision' || step.kind === 'bapi') && (
                        <div className="grid grid-cols-2 gap-2 mt-1.5 pt-1.5 border-t border-slate-200/60">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-500 shrink-0">좌측분기:</span>
                            <input
                              type="text"
                              value={step.branch_left || ''}
                              onChange={(e) =>
                                handleUpdateStep(step.id, { branch_left: e.target.value })
                              }
                              placeholder="예: 조회 / 성공"
                              className="w-full px-1.5 py-0.5 text-[11px] bg-white border border-slate-200 rounded font-medium"
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-500 shrink-0">우측분기:</span>
                            <input
                              type="text"
                              value={step.branch_right || ''}
                              onChange={(e) =>
                                handleUpdateStep(step.id, { branch_right: e.target.value })
                              }
                              placeholder="예: 생성 / 실패"
                              className="w-full px-1.5 py-0.5 text-[11px] bg-white border border-slate-200 rounded font-medium"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Right Side: Interactive SVG Visual Flowchart (Visible in split & visual modes) */}
        {(viewMode === 'split' || viewMode === 'visual') && (
          <div
            className={`flex flex-col ${
              viewMode === 'split' ? 'lg:col-span-6' : 'lg:col-span-12'
            }`}
          >
            <DataFlowViewer
              config={currentFlow}
              selectedStepId={selectedStepId}
              onSelectStep={(stepId) => setSelectedStepId(stepId)}
              className="h-[620px]"
            />
          </div>
        )}
      </div>
    </div>
  );
};
