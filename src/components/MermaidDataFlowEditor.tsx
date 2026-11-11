import React, { useState, useMemo, useEffect } from 'react';
import {
  Workflow,
  Sparkles,
  FileCode,
  RotateCcw,
  Copy,
  Info,
  Maximize2,
  Minimize2,
  Check,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { DataFlowDiagramConfig, ProgramSpec } from '../types/sap';
import { MarkdownFieldEditor } from './MarkdownFieldEditor';
import {
  MermaidFlowChartSvg,
  MERMAID_TEMPLATES,
  parseMermaidCode,
  layoutMermaidDiagram,
  ParsedMermaidNode,
  ParsedMermaidEdge,
  LayoutedNode,
} from './MermaidFlowChartSvg';

export {
  MERMAID_TEMPLATES,
  parseMermaidCode,
  layoutMermaidDiagram,
};
export type { ParsedMermaidNode, ParsedMermaidEdge, LayoutedNode };

interface MermaidDataFlowEditorProps {
  spec: ProgramSpec;
  config?: DataFlowDiagramConfig;
  onChange: (updated: DataFlowDiagramConfig) => void;
}

export const MermaidDataFlowEditor: React.FC<MermaidDataFlowEditorProps> = ({
  spec,
  config,
  onChange,
}) => {
  // Initial default Mermaid code
  const initialCode = useMemo(() => {
    if (config?.mermaid_code && config.mermaid_code.trim()) {
      return config.mermaid_code;
    }
    if (spec.sample_type === '02') {
      return MERMAID_TEMPLATES.sample_02_master_detail.code;
    }
    if (spec.sample_type === '04') {
      return MERMAID_TEMPLATES.sample_04_cds_pivot.code;
    }
    return MERMAID_TEMPLATES.basic_condition.code;
  }, [config?.mermaid_code, spec.sample_type]);

  const [mermaidText, setMermaidText] = useState<string>(initialCode);
  const [selectedNodeId, setSelectedNodeId] = useState<string>(
    config?.active_node_id || 'A'
  );
  const [copiedNotification, setCopiedNotification] = useState<boolean>(false);

  // Box Collapse/Expand states (RFQ v1.23: applied to all 3 sections)
  const [isCodeCollapsed, setIsCodeCollapsed] = useState<boolean>(false);
  const [isFlowChartCollapsed, setIsFlowChartCollapsed] = useState<boolean>(false);
  const [isDetailCollapsed, setIsDetailCollapsed] = useState<boolean>(false);

  // Full Screen Modal State (RFQ v1.23)
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [zoomScale, setZoomScale] = useState<number>(1);

  // ESC key handler for full screen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Parse Mermaid code
  const parsed = useMemo(() => {
    return parseMermaidCode(mermaidText);
  }, [mermaidText]);

  // Layout nodes
  const layoutedNodes = useMemo(() => {
    return layoutMermaidDiagram(parsed.nodes, parsed.edges, parsed.direction);
  }, [parsed]);

  // Ensure active node exists, default to first node if selected one is deleted
  const activeNode = useMemo(() => {
    const found = layoutedNodes.find((n) => n.id === selectedNodeId);
    if (found) return found;
    return layoutedNodes[0] || null;
  }, [layoutedNodes, selectedNodeId]);

  // Node details map (ID -> { label, markdown })
  const nodeDetails: Record<string, { label?: string; markdown: string }> = useMemo(() => {
    return (config?.node_details ||
      (spec.sample_type === '02'
        ? MERMAID_TEMPLATES.sample_02_master_detail.node_details
        : spec.sample_type === '04'
        ? MERMAID_TEMPLATES.sample_04_cds_pivot.node_details
        : MERMAID_TEMPLATES.basic_condition.node_details)) as Record<
      string,
      { label?: string; markdown: string }
    >;
  }, [config?.node_details, spec.sample_type]);

  // Sync changes up to parent ProgramSpec
  const handleMermaidCodeChange = (newCode: string) => {
    setMermaidText(newCode);
    onChange({
      ...(config || {}),
      mermaid_code: newCode,
      active_node_id: selectedNodeId,
    });
  };

  // Node Markdown update
  const handleNodeMarkdownChange = (nodeId: string, newMarkdown: string) => {
    const node = layoutedNodes.find((n) => n.id === nodeId);
    const updatedDetails = {
      ...nodeDetails,
      [nodeId]: {
        label: node?.label || nodeId,
        markdown: newMarkdown,
      },
    };

    onChange({
      ...(config || {}),
      mermaid_code: mermaidText,
      node_details: updatedDetails,
      active_node_id: nodeId,
    });
  };

  // Select a preset template
  const applyTemplate = (templateKey: keyof typeof MERMAID_TEMPLATES) => {
    const tpl = MERMAID_TEMPLATES[templateKey];
    setMermaidText(tpl.code);
    const firstNodeId = Object.keys(tpl.node_details)[0] || 'A';
    setSelectedNodeId(firstNodeId);

    onChange({
      ...(config || {}),
      mermaid_code: tpl.code,
      node_details: tpl.node_details,
      active_node_id: firstNodeId,
    });
  };

  // Quick append snippet
  const insertSnippet = (snippet: string) => {
    const updated = mermaidText.trim() ? `${mermaidText}\n  ${snippet}` : snippet;
    handleMermaidCodeChange(updated);
  };

  // Copy Mermaid text to clipboard
  const handleCopyCode = () => {
    navigator.clipboard.writeText(mermaidText);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2500);
  };

  const currentNodeMarkdown =
    activeNode && nodeDetails[activeNode.id]?.markdown !== undefined
      ? nodeDetails[activeNode.id].markdown
      : `### ${activeNode?.label || activeNode?.id || '단계'} 상세 사양\n- **목적**: 해당 단계의 비즈니스 목적 및 처리 내용 기술\n- **입력 데이터**: 참조 파라미터 또는 선행 데이터\n- **출력/결과**: 후속 단계 전달 데이터 또는 화면 반영 결과`;

  return (
    <div className="space-y-3">
      {/* ========================================================================= */}
      {/* 1. Editor Box (RFQ v1.23: Title renamed to 'Editor', with Collapse/Expand) */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-300 rounded-lg shadow-2xs overflow-hidden">
        {/* Unified Header */}
        <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCodeCollapsed(!isCodeCollapsed)}
              className="w-7 h-7 rounded bg-blue-600 hover:bg-blue-700 active:scale-95 text-white flex items-center justify-center font-bold text-xs shadow-xs transition-all cursor-pointer group"
              title={isCodeCollapsed ? 'Editor 펼치기 (클릭)' : 'Editor 접기 (클릭)'}
            >
              <FileCode className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
            </button>
            <div
              onClick={() => setIsCodeCollapsed(!isCodeCollapsed)}
              className="flex items-center gap-1.5 cursor-pointer select-none group"
              title={isCodeCollapsed ? 'Editor 펼치기 (클릭)' : 'Editor 접기 (클릭)'}
            >
              <h3 className="text-xs font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                Editor
              </h3>
              <span className="text-[11px] text-slate-500 font-normal">
                ({layoutedNodes.length}개 노드, {parsed.edges.length}개 연결)
              </span>
            </div>
          </div>

          {/* Templates & Action Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-slate-600 mr-0.5">템플릿:</span>
            <button
              type="button"
              onClick={() => applyTemplate('basic_condition')}
              className="px-2 py-0.5 text-xs font-medium bg-white hover:bg-blue-50 hover:text-blue-700 border border-slate-300 rounded transition-colors shadow-2xs cursor-pointer"
            >
              기본 조건 분기
            </button>
            <button
              type="button"
              onClick={() => applyTemplate('sample_01_standard')}
              className="px-2 py-0.5 text-xs font-medium bg-white hover:bg-blue-50 hover:text-blue-700 border border-slate-300 rounded transition-colors shadow-2xs cursor-pointer"
            >
              Type 01 (10단계)
            </button>
            <button
              type="button"
              onClick={() => applyTemplate('sample_02_master_detail')}
              className="px-2 py-0.5 text-xs font-medium bg-white hover:bg-blue-50 hover:text-blue-700 border border-slate-300 rounded transition-colors shadow-2xs cursor-pointer"
            >
              Type 02 (헤더/품목)
            </button>
            {spec.sample_type === '04' && (
              <button
                type="button"
                onClick={() => applyTemplate('sample_04_cds_pivot')}
                className="px-2 py-0.5 text-xs font-medium bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-300 rounded transition-colors shadow-2xs cursor-pointer"
              >
                Type 04 (CDS피벗)
              </button>
            )}

            <div className="h-3.5 w-px bg-slate-300 mx-0.5" />

            {/* Copy Code */}
            <button
              type="button"
              onClick={handleCopyCode}
              className="px-2 py-0.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded flex items-center gap-1 transition-colors shadow-2xs cursor-pointer"
              title="Mermaid 코드 클립보드 복사"
            >
              {copiedNotification ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span className="text-emerald-700 font-semibold">복사됨!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>코드 복사</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Collapsible Editor Body */}
        {!isCodeCollapsed && (
          <>
            {/* Quick Syntax Toolbar */}
            <div className="px-3 py-1.5 bg-slate-50/60 border-b border-slate-200 flex items-center gap-1.5 flex-wrap text-slate-700">
              <span className="text-[11px] font-semibold text-slate-400">빠른 삽입:</span>
              <button
                type="button"
                onClick={() => insertSnippet('A([시작])')}
                className="px-1.5 py-0.5 text-[11px] font-mono bg-white hover:bg-slate-100 border border-slate-200 rounded shadow-2xs cursor-pointer"
                title="시작/종료 타원 노드"
              >
                + 타원([시작])
              </button>
              <button
                type="button"
                onClick={() => insertSnippet('B[작업 수행]')}
                className="px-1.5 py-0.5 text-[11px] font-mono bg-white hover:bg-slate-100 border border-slate-200 rounded shadow-2xs cursor-pointer"
                title="기본 사각형 처리 노드"
              >
                + 사각[작업]
              </button>
              <button
                type="button"
                onClick={() => insertSnippet('C{조건 확인} -->|참| D[성공]')}
                className="px-1.5 py-0.5 text-[11px] font-mono bg-white hover:bg-slate-100 border border-slate-200 rounded shadow-2xs cursor-pointer"
                title="마름모 조건 분기 노드"
              >
                + 마름모&#123;조건&#125;
              </button>
              <button
                type="button"
                onClick={() => insertSnippet('E[(DB 테이블)]')}
                className="px-1.5 py-0.5 text-[11px] font-mono bg-white hover:bg-slate-100 border border-slate-200 rounded shadow-2xs cursor-pointer"
                title="원통 DB 테이블 노드"
              >
                + 원통[(DB)]
              </button>
              <button
                type="button"
                onClick={() => insertSnippet('-->|결과| ')}
                className="px-1.5 py-0.5 text-[11px] font-mono bg-white hover:bg-slate-100 border border-slate-200 rounded shadow-2xs cursor-pointer"
                title="화살표 라벨"
              >
                + 화살표(--&gt;)
              </button>
            </div>

            {/* Monospace Pure White Textarea */}
            <div className="p-2.5 bg-white">
              <textarea
                value={mermaidText}
                onChange={(e) => handleMermaidCodeChange(e.target.value)}
                rows={5}
                className="w-full bg-white text-slate-800 font-mono text-xs leading-relaxed p-2.5 border border-slate-200 rounded focus:border-blue-500 focus:outline-none resize-y selection:bg-blue-100 shadow-inner"
                placeholder="graph TD;&#10;  A[시작] --> B{조건 확인};&#10;  B -->|참| C[작업 수행];&#10;  B -->|거짓| D[다른 작업 수행];&#10;  C --> E[종료];&#10;  D --> E;"
              />
            </div>
          </>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. Flow Chart Diagram (RFQ v1.23: Icon, Full Screen View & Collapse/Expand) */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-300 rounded-lg shadow-2xs overflow-hidden">
        <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
          {/* Left Title with Icon */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsFlowChartCollapsed(!isFlowChartCollapsed)}
              className="w-7 h-7 rounded bg-blue-600 hover:bg-blue-700 active:scale-95 text-white flex items-center justify-center font-bold text-xs shadow-xs transition-all cursor-pointer group"
              title={isFlowChartCollapsed ? 'Flow Chart 펼치기 (클릭)' : 'Flow Chart 접기 (클릭)'}
            >
              <Workflow className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
            </button>
            <div
              onClick={() => setIsFlowChartCollapsed(!isFlowChartCollapsed)}
              className="flex items-center gap-1.5 cursor-pointer select-none group"
              title={isFlowChartCollapsed ? 'Flow Chart 펼치기 (클릭)' : 'Flow Chart 접기 (클릭)'}
            >
              <span className="text-xs font-bold text-slate-800 group-hover:text-blue-700 transition-colors">
                Flow Chart
              </span>
              <span className="text-[11px] text-slate-500 font-normal">
                ({layoutedNodes.length}개 단계)
              </span>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-1.5">
            {/* Full Screen Button */}
            <button
              type="button"
              onClick={() => {
                setZoomScale(1);
                setIsFullscreen(true);
              }}
              className="px-2 py-0.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded flex items-center gap-1 transition-colors shadow-2xs cursor-pointer"
              title="Flow Chart 전체 화면 보기"
            >
              <Maximize2 className="w-3.5 h-3.5 text-blue-600" />
              <span>전체 화면</span>
            </button>
          </div>
        </div>

        {/* SVG Canvas Area (Collapsible) */}
        {!isFlowChartCollapsed && (
          <div className="p-3 bg-[#fdfdfd] overflow-auto min-h-[360px] max-h-[500px]">
            <MermaidFlowChartSvg
              mermaidCode={mermaidText}
              nodeDetails={nodeDetails}
              selectedNodeId={selectedNodeId}
              onSelectNode={(nodeId) => setSelectedNodeId(nodeId)}
            />
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. Detailed Specification Box (RFQ v1.23: Collapse/Expand)                */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-300 rounded-lg shadow-2xs overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-3.5 py-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsDetailCollapsed(!isDetailCollapsed)}
              className="w-7 h-7 rounded bg-blue-600 hover:bg-blue-700 active:scale-95 text-white flex items-center justify-center font-mono font-bold text-xs shadow-xs transition-all cursor-pointer group"
              title={isDetailCollapsed ? '상세 사양서 펼치기 (클릭)' : '상세 사양서 접기 (클릭)'}
            >
              <span className="group-hover:scale-110 transition-transform">
                {activeNode?.id || 'A'}
              </span>
            </button>
            <div
              onClick={() => setIsDetailCollapsed(!isDetailCollapsed)}
              className="cursor-pointer select-none group"
              title={isDetailCollapsed ? '상세 사양서 펼치기 (클릭)' : '상세 사양서 접기 (클릭)'}
            >
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                  노드 [{activeNode?.id || 'A'}] 상세 사양서
                </h4>
                <span className="text-[10px] font-semibold bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded border border-blue-200">
                  마크다운
                </span>
              </div>
              <p className="text-[11px] text-slate-600 font-medium truncate max-w-[220px]">
                {activeNode?.label || '선택된 단계'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Quick SAP Event Template button */}
            <button
              type="button"
              onClick={() => {
                if (!activeNode) return;
                const template = `### [${activeNode.id}] ${activeNode.label} 처리 사양서\n\n#### 1. 이벤트/처리 목적\n- ${activeNode.label} 단계의 주요 실행 조건 및 비즈니스 목적 기술\n\n#### 2. 사용 데이터베이스 및 내부 테이블\n- 참조 테이블: \`VBAK\`, \`VBAP\`\n- 타겟 내부 테이블: \`GT_DATA\`\n\n#### 3. 입력 점검 및 예외 처리\n- 필수 조건 미충족 시 에러 메시지(\`MESSAGE E001\`) 발생\n- 화면 커서 위치 지정: \`SET CURSOR FIELD 'PA_BUKRS'\``;
                handleNodeMarkdownChange(activeNode.id, template);
              }}
              className="px-2 py-1 text-[11px] font-bold text-indigo-700 bg-white hover:bg-indigo-50 border border-indigo-200 rounded flex items-center gap-1 shadow-2xs cursor-pointer transition-colors"
              title="SAP 이벤트 처리 표준 사양 템플릿 삽입"
            >
              <Sparkles className="w-3 h-3 text-indigo-600" />
              <span>표준 템플릿 삽입</span>
            </button>
          </div>
        </div>

        {/* Collapsible content */}
        {!isDetailCollapsed && (
          <>
            {/* Description banner */}
            <div className="px-3 py-1.5 bg-blue-50/60 border-b border-blue-100 flex items-center gap-1.5 text-[11px] text-blue-900">
              <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>
                상단 다이어그램의 선택된 노드와 연동되어 해당 단계의 로직 사양을 독립적으로 작성합니다.
              </span>
            </div>

            {/* Markdown Field Editor with 100% White Background */}
            <div className="p-3 bg-white flex-1 min-h-[380px]">
              {activeNode ? (
                <MarkdownFieldEditor
                  key={activeNode.id}
                  value={currentNodeMarkdown}
                  onChange={(newVal) => handleNodeMarkdownChange(activeNode.id, newVal)}
                  rows={12}
                  minHeight="320px"
                  placeholder={`노드 [${activeNode.id}] ${activeNode.label}의 비즈니스 로직, 사용 테이블, 예외 처리 규칙을 마크다운(# 제목, - 목록, **굵게**, \`코드\`)으로 상세히 작성하세요...`}
                />
              ) : (
                <div className="text-center py-12 text-slate-400 text-xs">
                  다이어그램에서 노드를 선택해 주세요.
                </div>
              )}
            </div>

            {/* Footer note */}
            <div className="px-3 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
              <span>💾 노드별 사양서는 실시간으로 Program Spec에 자동 저장됩니다.</span>
              <span className="font-medium text-slate-700">
                {Object.keys(nodeDetails).length}개 노드 사양 작성됨
              </span>
            </div>
          </>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 4. Fullscreen Flow Chart Modal (RFQ v1.23)                                 */}
      {/* ========================================================================= */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full h-full max-w-[96vw] max-h-[94vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <Workflow className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span>Flow Chart</span>
                    <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                      전체 화면 모드
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    노드를 클릭하여 선택하거나 사양서를 확인할 수 있습니다. (ESC 키 또는 우측 버튼으로 닫기)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Zoom Controls */}
                <div className="flex items-center bg-white border border-slate-300 rounded-md px-1.5 py-0.5 shadow-2xs text-xs">
                  <button
                    type="button"
                    onClick={() => setZoomScale((s) => Math.max(0.5, +(s - 0.15).toFixed(2)))}
                    className="p-1 hover:bg-slate-100 rounded text-slate-600 transition-colors cursor-pointer"
                    title="축소"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-2 font-mono text-[11px] font-semibold text-slate-700 min-w-[50px] text-center">
                    {Math.round(zoomScale * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setZoomScale((s) => Math.min(2.5, +(s + 0.15).toFixed(2)))}
                    className="p-1 hover:bg-slate-100 rounded text-slate-600 transition-colors cursor-pointer"
                    title="확대"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomScale(1)}
                    className="p-1 hover:bg-slate-100 rounded text-slate-600 ml-1 border-l border-slate-200 transition-colors cursor-pointer"
                    title="100% 원본 크기 초기화"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                </div>

                {/* Close Fullscreen Button */}
                <button
                  type="button"
                  onClick={() => setIsFullscreen(false)}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white text-xs font-semibold rounded-md flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>전체 화면 닫기</span>
                </button>
              </div>
            </div>

            {/* Modal Body: Large Scrollable Canvas */}
            <div className="flex-1 bg-[#fcfcfc] overflow-auto p-8 flex justify-center items-start">
              <MermaidFlowChartSvg
                mermaidCode={mermaidText}
                nodeDetails={nodeDetails}
                selectedNodeId={selectedNodeId}
                onSelectNode={(nodeId) => setSelectedNodeId(nodeId)}
                scale={zoomScale}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
