import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Play,
  Square,
  HelpCircle,
  Database,
  ArrowRight,
  Plus,
  Trash2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  Edit2,
  Download,
  Check,
  Move,
  Link2,
} from 'lucide-react';
import {
  CanvasNode,
  CanvasEdge,
  FlowShapeType,
  PortPosition,
  DataFlowDiagramConfig,
  ProgramSpec,
} from '../types/sap';
import {
  DEFAULT_CANVAS_NODES,
  DEFAULT_CANVAS_EDGES,
  generateDataFlowFromSpec,
} from '../utils/dataFlowGenerator';

interface InteractiveDataFlowCanvasProps {
  spec: ProgramSpec;
  config?: DataFlowDiagramConfig;
  onChange: (updated: DataFlowDiagramConfig) => void;
  readOnly?: boolean;
}

export const InteractiveDataFlowCanvas: React.FC<InteractiveDataFlowCanvasProps> = ({
  spec,
  config,
  onChange,
  readOnly = false,
}) => {
  // Ensure we have nodes and edges
  const nodes: CanvasNode[] =
    config?.nodes && config.nodes.length > 0
      ? config.nodes
      : DEFAULT_CANVAS_NODES;

  const edges: CanvasEdge[] =
    config?.edges && config.edges.length > 0
      ? config.edges
      : DEFAULT_CANVAS_EDGES;

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [editingEdgeLabel, setEditingEdgeLabel] = useState('');

  // Dragging node state
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Creating connection (화살표 연결 드래그)
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionSource, setConnectionSource] = useState<{
    nodeId: string;
    port: PortPosition;
    x: number;
    y: number;
  } | null>(null);
  const [connectionTargetPos, setConnectionTargetPos] = useState<{ x: number; y: number } | null>(
    null
  );
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Zoom & Pan state
  const [zoom, setZoom] = useState(1);
  const [notice, setNotice] = useState<string | null>(null);

  const canvasRef = useRef<SVGSVGElement>(null);

  // Save changes to parent spec
  const updateGraph = useCallback(
    (newNodes: CanvasNode[], newEdges: CanvasEdge[]) => {
      onChange({
        title: config?.title || 'Data Flow Diagram',
        nodes: newNodes,
        edges: newEdges,
      });
    },
    [config?.title, onChange]
  );

  // Get port coordinates for a node
  const getPortCoord = useCallback(
    (node: CanvasNode, port: PortPosition = 'bottom') => {
      const cx = node.x + node.width / 2;
      const cy = node.y + node.height / 2;

      switch (port) {
        case 'top':
          return { x: cx, y: node.y };
        case 'bottom':
          return { x: cx, y: node.y + node.height };
        case 'left':
          return { x: node.x, y: cy };
        case 'right':
          return { x: node.x + node.width, y: cy };
        default:
          return { x: cx, y: node.y + node.height };
      }
    },
    []
  );

  // Auto pick best ports between two nodes if not explicit
  const getAutoPorts = useCallback((fromNode: CanvasNode, toNode: CanvasNode) => {
    const fromCenter = { x: fromNode.x + fromNode.width / 2, y: fromNode.y + fromNode.height / 2 };
    const toCenter = { x: toNode.x + toNode.width / 2, y: toNode.y + toNode.height / 2 };

    const dx = toCenter.x - fromCenter.x;
    const dy = toCenter.y - fromCenter.y;

    if (Math.abs(dy) >= Math.abs(dx)) {
      if (dy > 0) return { fromPort: 'bottom' as PortPosition, toPort: 'top' as PortPosition };
      return { fromPort: 'top' as PortPosition, toPort: 'bottom' as PortPosition };
    } else {
      if (dx > 0) return { fromPort: 'right' as PortPosition, toPort: 'left' as PortPosition };
      return { fromPort: 'left' as PortPosition, toPort: 'right' as PortPosition };
    }
  }, []);

  // Compute SVG path for an edge
  const computeEdgePath = useCallback(
    (edge: CanvasEdge) => {
      const fromNode = nodes.find((n) => n.id === edge.from);
      const toNode = nodes.find((n) => n.id === edge.to);

      if (!fromNode || !toNode) return '';

      // Special loopback edge (e.g. failure branch looping back up right side)
      if (edge.fromPort === 'right' && edge.toPort === 'right') {
        const p1 = getPortCoord(fromNode, 'right');
        const p2 = getPortCoord(toNode, 'right');
        const outerX = Math.max(p1.x, p2.x) + 40;
        return `M ${p1.x} ${p1.y} L ${outerX} ${p1.y} L ${outerX} ${p2.y} L ${p2.x} ${p2.y}`;
      }

      const ports =
        edge.fromPort && edge.toPort && edge.fromPort !== 'auto' && edge.toPort !== 'auto'
          ? { fromPort: edge.fromPort, toPort: edge.toPort }
          : getAutoPorts(fromNode, toNode);

      const p1 = getPortCoord(fromNode, ports.fromPort);
      const p2 = getPortCoord(toNode, ports.toPort);

      // Orthogonal step routing
      if (ports.fromPort === 'bottom' && ports.toPort === 'top') {
        const midY = (p1.y + p2.y) / 2;
        return `M ${p1.x} ${p1.y} L ${p1.x} ${midY} L ${p2.x} ${midY} L ${p2.x} ${p2.y}`;
      } else if (ports.fromPort === 'bottom' && ports.toPort === 'left') {
        return `M ${p1.x} ${p1.y} L ${p1.x} ${p2.y} L ${p2.x} ${p2.y}`;
      } else if (ports.fromPort === 'right' && ports.toPort === 'left') {
        const midX = (p1.x + p2.x) / 2;
        return `M ${p1.x} ${p1.y} L ${midX} ${p1.y} L ${midX} ${p2.y} L ${p2.x} ${p2.y}`;
      } else if (ports.fromPort === 'left' && ports.toPort === 'top') {
        return `M ${p1.x} ${p1.y} L ${p2.x} ${p1.y} L ${p2.x} ${p2.y}`;
      } else if (ports.fromPort === 'right' && ports.toPort === 'top') {
        return `M ${p1.x} ${p1.y} L ${p2.x} ${p1.y} L ${p2.x} ${p2.y}`;
      }

      // Default smooth or orthogonal path
      const midY = (p1.y + p2.y) / 2;
      return `M ${p1.x} ${p1.y} C ${p1.x} ${midY}, ${p2.x} ${midY}, ${p2.x} ${p2.y}`;
    },
    [nodes, getPortCoord, getAutoPorts]
  );

  // Compute label position for an edge
  const getEdgeLabelPos = useCallback(
    (edge: CanvasEdge) => {
      const fromNode = nodes.find((n) => n.id === edge.from);
      const toNode = nodes.find((n) => n.id === edge.to);
      if (!fromNode || !toNode) return { x: 0, y: 0 };

      const p1 = getPortCoord(fromNode, edge.fromPort || 'bottom');
      const p2 = getPortCoord(toNode, edge.toPort || 'top');
      return {
        x: (p1.x + p2.x) / 2,
        y: (p1.y + p2.y) / 2 - 8,
      };
    },
    [nodes, getPortCoord]
  );

  // Add new shape to canvas
  const handleAddShape = (type: FlowShapeType) => {
    const nextIdx = nodes.length + 1;
    let label = '';
    let width = 120;
    let height = 38;

    if (type === 'start') {
      label = '시작';
    } else if (type === 'end') {
      label = '종료';
    } else if (type === 'process') {
      label = `${nextIdx}) 신규 처리 박스`;
    } else if (type === 'decision') {
      label = '처리 옵션';
      width = 110;
      height = 46;
    } else if (type === 'database') {
      label = 'TABLE_NAME';
      width = 120;
      height = 60;
    }

    // Place staggered or near center
    const lastNode = nodes[nodes.length - 1];
    const newX = lastNode ? Math.min(lastNode.x, 380) : 260;
    const newY = lastNode ? lastNode.y + 70 : 100;

    const newNode: CanvasNode = {
      id: `node-${Date.now()}`,
      type,
      label,
      x: newX,
      y: newY,
      width,
      height,
    };

    updateGraph([...nodes, newNode], edges);
    setSelectedNodeId(newNode.id);
  };

  // Start dragging a node
  const handleNodeMouseDown = (e: React.MouseEvent, node: CanvasNode) => {
    if (readOnly) return;
    if (isConnecting) return; // if in connect mode, don't drag
    e.stopPropagation();

    setSelectedNodeId(node.id);
    setSelectedEdgeId(null);
    setDraggingNodeId(node.id);

    const svgRect = canvasRef.current?.getBoundingClientRect();
    if (svgRect) {
      const mouseX = (e.clientX - svgRect.left) / zoom;
      const mouseY = (e.clientY - svgRect.top) / zoom;
      setDragOffset({
        x: mouseX - node.x,
        y: mouseY - node.y,
      });
    }
  };

  // Start connecting from an anchor port
  const handlePortMouseDown = (e: React.MouseEvent, node: CanvasNode, port: PortPosition) => {
    if (readOnly) return;
    e.stopPropagation();

    const coord = getPortCoord(node, port);
    setIsConnecting(true);
    setConnectionSource({
      nodeId: node.id,
      port,
      x: coord.x,
      y: coord.y,
    });
    setConnectionTargetPos({ x: coord.x, y: coord.y });
  };

  // Canvas Mouse Move (handles dragging node or drawing connecting arrow)
  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const svgRect = canvasRef.current.getBoundingClientRect();
    const mouseX = (e.clientX - svgRect.left) / zoom;
    const mouseY = (e.clientY - svgRect.top) / zoom;

    // Handle node dragging
    if (draggingNodeId) {
      const updatedNodes = nodes.map((n) => {
        if (n.id === draggingNodeId) {
          const snappedX = Math.round((mouseX - dragOffset.x) / 5) * 5;
          const snappedY = Math.round((mouseY - dragOffset.y) / 5) * 5;
          return {
            ...n,
            x: Math.max(10, snappedX),
            y: Math.max(10, snappedY),
          };
        }
        return n;
      });
      updateGraph(updatedNodes, edges);
    }

    // Handle arrow drawing
    if (isConnecting && connectionSource) {
      setConnectionTargetPos({ x: mouseX, y: mouseY });
    }
  };

  // Canvas Mouse Up (finish dragging or drop connection)
  const handleCanvasMouseUp = () => {
    if (draggingNodeId) {
      setDraggingNodeId(null);
    }

    if (isConnecting && connectionSource) {
      if (hoveredNodeId && hoveredNodeId !== connectionSource.nodeId) {
        // Complete connection!
        const existing = edges.some(
          (e) => e.from === connectionSource.nodeId && e.to === hoveredNodeId
        );
        if (!existing) {
          const newEdge: CanvasEdge = {
            id: `edge-${Date.now()}`,
            from: connectionSource.nodeId,
            to: hoveredNodeId,
            fromPort: connectionSource.port,
            toPort: 'top',
          };
          updateGraph(nodes, [...edges, newEdge]);
          setNotice('화살표 연결이 완료되었습니다. 화살표를 클릭하여 라벨(조건명)을 입력할 수 있습니다.');
          setTimeout(() => setNotice(null), 4000);
        }
      }
      setIsConnecting(false);
      setConnectionSource(null);
      setConnectionTargetPos(null);
    }
  };

  // Delete selected node or edge
  const handleDeleteSelected = () => {
    if (selectedNodeId) {
      const updatedNodes = nodes.filter((n) => n.id !== selectedNodeId);
      const updatedEdges = edges.filter(
        (e) => e.from !== selectedNodeId && e.to !== selectedNodeId
      );
      updateGraph(updatedNodes, updatedEdges);
      setSelectedNodeId(null);
    } else if (selectedEdgeId) {
      const updatedEdges = edges.filter((e) => e.id !== selectedEdgeId);
      updateGraph(nodes, updatedEdges);
      setSelectedEdgeId(null);
    }
  };

  // Keyboard shortcut for Delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingNodeId || editingEdgeId) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeId || selectedEdgeId) {
          handleDeleteSelected();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, selectedEdgeId, editingNodeId, editingEdgeId, handleDeleteSelected]);

  // Load Reference Template
  const handleLoadReferenceTemplate = () => {
    updateGraph(
      JSON.parse(JSON.stringify(DEFAULT_CANVAS_NODES)),
      JSON.parse(JSON.stringify(DEFAULT_CANVAS_EDGES))
    );
    setNotice('참조 표준 19개 노드와 연결 화살표 템플릿이 로드되었습니다.');
    setTimeout(() => setNotice(null), 4000);
  };

  // Auto-generate from Spec
  const handleAutoGenerate = () => {
    const generated = generateDataFlowFromSpec(spec);
    updateGraph(generated.nodes || DEFAULT_CANVAS_NODES, generated.edges || DEFAULT_CANVAS_EDGES);
    setNotice('현재 모듈 및 테이블 로직에 맞춰 다이어그램이 자동 재배치되었습니다.');
    setTimeout(() => setNotice(null), 4000);
  };

  // Clear Canvas
  const handleClearCanvas = () => {
    if (confirm('캔버스를 모두 지우시겠습니까?')) {
      updateGraph([], []);
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
    }
  };

  // Download SVG
  const handleDownloadSvg = () => {
    if (!canvasRef.current) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(canvasRef.current);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${spec.program_id || 'ALV'}_Data_Flow_Diagram.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Compute maximum canvas bounds to fit all nodes comfortably
  const maxX = Math.max(650, ...nodes.map((n) => n.x + n.width + 60));
  const maxY = Math.max(1050, ...nodes.map((n) => n.y + n.height + 80));

  return (
    <div className="space-y-3 pt-3 border-t border-slate-200 font-sans">
      {/* 1. Canvas Palette & Action Toolbar */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex items-center justify-between flex-wrap gap-2 shadow-2xs">
        {/* Left: Shape insertion palette */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1 mr-1">
            <Link2 className="w-3.5 h-3.5 text-blue-600" />
            <span>직접 그리기:</span>
          </span>

          <button
            type="button"
            onClick={() => handleAddShape('start')}
            className="px-2 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded shadow-2xs flex items-center gap-1"
            title="시작 캡슐 노드 추가"
          >
            <Play className="w-3 h-3 text-emerald-600 fill-emerald-600" />
            <span>시작</span>
          </button>

          <button
            type="button"
            onClick={() => handleAddShape('process')}
            className="px-2 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded shadow-2xs flex items-center gap-1"
            title="처리 프로세스 박스 추가"
          >
            <Square className="w-3 h-3 text-blue-600" />
            <span>박스 (처리)</span>
          </button>

          <button
            type="button"
            onClick={() => handleAddShape('decision')}
            className="px-2 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded shadow-2xs flex items-center gap-1"
            title="처리 옵션 마름모 추가"
          >
            <HelpCircle className="w-3 h-3 text-amber-600" />
            <span>처리 옵션 (분기)</span>
          </button>

          <button
            type="button"
            onClick={() => handleAddShape('database')}
            className="px-2 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded shadow-2xs flex items-center gap-1"
            title="데이터베이스 실린더 추가"
          >
            <Database className="w-3 h-3 text-purple-600" />
            <span>DB 실린더</span>
          </button>

          <button
            type="button"
            onClick={() => handleAddShape('end')}
            className="px-2 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded shadow-2xs flex items-center gap-1"
            title="종료 캡슐 노드 추가"
          >
            <Square className="w-3 h-3 text-rose-600 fill-rose-600 rounded-sm" />
            <span>종료</span>
          </button>
        </div>

        {/* Right: Actions (Template, Auto, Delete, Zoom) */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {selectedNodeId || selectedEdgeId ? (
            <button
              type="button"
              onClick={handleDeleteSelected}
              className="px-2 py-1 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-300 rounded flex items-center gap-1"
              title="선택된 항목 삭제 (Delete 키)"
            >
              <Trash2 className="w-3 h-3" />
              <span>선택 삭제</span>
            </button>
          ) : null}

          <button
            type="button"
            onClick={handleAutoGenerate}
            className="px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-300 rounded flex items-center gap-1"
            title="프로그램 로직 기반 자동 배치"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>로직 자동 생성</span>
          </button>

          <button
            type="button"
            onClick={handleLoadReferenceTemplate}
            className="px-2 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded flex items-center gap-1"
            title="참조 그림과 동일한 표준 템플릿 불러오기"
          >
            <RotateCcw className="w-3 h-3 text-slate-500" />
            <span>표준 템플릿</span>
          </button>

          <button
            type="button"
            onClick={handleClearCanvas}
            className="px-2 py-1 text-xs text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded"
            title="캔버스 비우기"
          >
            지우기
          </button>

          {/* Zoom controls */}
          <div className="flex items-center bg-white border border-slate-300 rounded text-xs ml-1">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(z + 0.15, 2.0))}
              className="p-1 hover:bg-slate-100 text-slate-600"
              title="확대"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(z - 0.15, 0.5))}
              className="p-1 hover:bg-slate-100 text-slate-600"
              title="축소"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoom(1)}
              className="px-1.5 py-0.5 text-[11px] text-slate-600 font-mono hover:bg-slate-100"
              title="100% 리셋"
            >
              {Math.round(zoom * 100)}%
            </button>
          </div>

          <button
            type="button"
            onClick={handleDownloadSvg}
            className="p-1.5 hover:bg-slate-200 bg-white border border-slate-300 rounded text-slate-700"
            title="SVG 이미지로 내보내기"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Helper guide banner */}
      <div className="px-3 py-1.5 bg-blue-50/70 border border-blue-200 rounded text-[11px] text-blue-900 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          <span className="font-bold">💡 직접 연결 방법:</span>
          <span>
            도형에 마우스를 올리면 나타나는 <strong>원형 포인트(●)를 드래그하여 다른 도형으로 이어주면 화살표가 자동 연결</strong>됩니다.
            도형을 드래그하여 자유롭게 배치하고, 더블클릭하여 텍스트를 수정할 수 있습니다.
          </span>
        </div>
      </div>

      {notice && (
        <div className="p-2 bg-emerald-50 border border-emerald-300 rounded text-xs text-emerald-800 flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* 2. Interactive SVG Canvas Area */}
      <div
        className="relative border border-slate-300 rounded-lg overflow-auto bg-slate-100/60 shadow-inner h-[680px]"
        onClick={() => {
          setSelectedNodeId(null);
          setSelectedEdgeId(null);
          setEditingNodeId(null);
          setEditingEdgeId(null);
        }}
      >
        <svg
          ref={canvasRef}
          width={maxX * zoom}
          height={maxY * zoom}
          viewBox={`0 0 ${maxX} ${maxY}`}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          className="select-none cursor-default"
          style={{ backgroundColor: '#ffffff' }}
        >
          {/* Subtle Grid Pattern */}
          <defs>
            <pattern id="flow-grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f1f5f9" strokeWidth="1" />
            </pattern>

            <marker
              id="canvas-arrow"
              viewBox="0 0 10 10"
              refX="7"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#0f172a" />
            </marker>

            <marker
              id="canvas-arrow-selected"
              viewBox="0 0 10 10"
              refX="7"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#2563eb" />
            </marker>
          </defs>

          {/* Canvas Background Grid */}
          <rect width={maxX} height={maxY} fill="url(#flow-grid)" />

          {/* ========================================================================= */}
          {/* EDGES / ARROWS LAYER                                                      */}
          {/* ========================================================================= */}
          {edges.map((edge) => {
            const pathData = computeEdgePath(edge);
            const isSelected = selectedEdgeId === edge.id;
            const labelPos = getEdgeLabelPos(edge);

            return (
              <g
                key={edge.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedEdgeId(edge.id);
                  setSelectedNodeId(null);
                }}
                className="cursor-pointer group"
              >
                {/* Thick invisible stroke for easier clicking */}
                <path d={pathData} fill="none" stroke="transparent" strokeWidth="12" />

                {/* Visible Arrow Line */}
                <path
                  d={pathData}
                  fill="none"
                  stroke={isSelected ? '#2563eb' : '#0f172a'}
                  strokeWidth={isSelected ? '2.2' : '1.3'}
                  markerEnd={isSelected ? 'url(#canvas-arrow-selected)' : 'url(#canvas-arrow)'}
                />

                {/* Edge Label (if present) */}
                {edge.label && (
                  <g transform={`translate(${labelPos.x}, ${labelPos.y})`}>
                    <rect
                      x="-25"
                      y="-9"
                      width="50"
                      height="18"
                      rx="3"
                      fill="#ffffff"
                      stroke={isSelected ? '#2563eb' : '#cbd5e1'}
                      strokeWidth="1"
                    />
                    <text
                      x="0"
                      y="4"
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight="bold"
                      fill={isSelected ? '#1d4ed8' : '#334155'}
                    >
                      {edge.label}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Live Connecting Rubber-band Arrow */}
          {isConnecting && connectionSource && connectionTargetPos && (
            <line
              x1={connectionSource.x}
              y1={connectionSource.y}
              x2={connectionTargetPos.x}
              y2={connectionTargetPos.y}
              stroke="#2563eb"
              strokeWidth="2"
              strokeDasharray="4 4"
              markerEnd="url(#canvas-arrow-selected)"
            />
          )}

          {/* ========================================================================= */}
          {/* NODES LAYER                                                               */}
          {/* ========================================================================= */}
          {nodes.map((node) => {
            const isSelected = selectedNodeId === node.id;
            const isHovered = hoveredNodeId === node.id;
            const cx = node.x + node.width / 2;
            const cy = node.y + node.height / 2;

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onMouseDown={(e) => handleNodeMouseDown(e, node)}
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setEditingNodeId(node.id);
                  setEditingText(node.label);
                }}
                className="cursor-move group"
              >
                {/* Node Shape rendering according to type */}
                {node.type === 'start' || node.type === 'end' ? (
                  // Pill Capsule (시작 / 종료)
                  <rect
                    x="0"
                    y="0"
                    width={node.width}
                    height={node.height}
                    rx="19"
                    fill={isSelected ? '#eff6ff' : '#ffffff'}
                    stroke={isSelected ? '#2563eb' : '#000000'}
                    strokeWidth={isSelected ? '2' : '1.2'}
                  />
                ) : node.type === 'decision' ? (
                  // Diamond (처리 옵션 / 분기 판정)
                  <polygon
                    points={`${node.width / 2},0 ${node.width},${node.height / 2} ${node.width / 2},${node.height} 0,${node.height / 2}`}
                    fill={isSelected ? '#eff6ff' : '#ffffff'}
                    stroke={isSelected ? '#2563eb' : '#000000'}
                    strokeWidth={isSelected ? '2' : '1.2'}
                  />
                ) : node.type === 'database' ? (
                  // Database Cylinder (원통형 DB 테이블)
                  <g>
                    <ellipse
                      cx={node.width / 2}
                      cy="10"
                      rx={node.width / 2}
                      ry="8"
                      fill="#ffffff"
                      stroke={isSelected ? '#2563eb' : '#000000'}
                      strokeWidth={isSelected ? '2' : '1.2'}
                    />
                    <rect
                      x="0"
                      y="10"
                      width={node.width}
                      height={node.height - 20}
                      fill={isSelected ? '#eff6ff' : '#ffffff'}
                    />
                    <line
                      x1="0"
                      y1="10"
                      x2="0"
                      y2={node.height - 10}
                      stroke={isSelected ? '#2563eb' : '#000000'}
                      strokeWidth={isSelected ? '2' : '1.2'}
                    />
                    <line
                      x1={node.width}
                      y1="10"
                      x2={node.width}
                      y2={node.height - 10}
                      stroke={isSelected ? '#2563eb' : '#000000'}
                      strokeWidth={isSelected ? '2' : '1.2'}
                    />
                    <ellipse
                      cx={node.width / 2}
                      cy={node.height - 10}
                      rx={node.width / 2}
                      ry="8"
                      fill={isSelected ? '#eff6ff' : '#ffffff'}
                      stroke={isSelected ? '#2563eb' : '#000000'}
                      strokeWidth={isSelected ? '2' : '1.2'}
                    />
                  </g>
                ) : (
                  // Process Box (박스)
                  <rect
                    x="0"
                    y="0"
                    width={node.width}
                    height={node.height}
                    fill={isSelected ? '#eff6ff' : '#ffffff'}
                    stroke={isSelected ? '#2563eb' : '#000000'}
                    strokeWidth={isSelected ? '2' : '1.2'}
                  />
                )}

                {/* Node Label Text (support multiline for DB tables) */}
                {node.label.split('\n').map((line, idx, arr) => {
                  const lineOffset = (idx - (arr.length - 1) / 2) * 14;
                  return (
                    <text
                      key={idx}
                      x={node.width / 2}
                      y={node.height / 2 + lineOffset + 4}
                      textAnchor="middle"
                      fontSize={node.type === 'database' ? '10' : '11.5'}
                      fontWeight={node.type === 'start' || node.type === 'end' ? 'bold' : '500'}
                      fill="#0f172a"
                      fontFamily={node.type === 'database' ? 'monospace' : 'sans-serif'}
                      pointerEvents="none"
                    >
                      {line}
                    </text>
                  );
                })}

                {/* Connection Anchor Ports (4 visible points on hover / selection to connect arrows!) */}
                {(isSelected || isHovered || isConnecting) && !readOnly && (
                  <g className="cursor-crosshair">
                    {/* Top Port */}
                    <circle
                      cx={node.width / 2}
                      cy="0"
                      r="5"
                      fill="#2563eb"
                      stroke="#ffffff"
                      strokeWidth="1.5"
                      onMouseDown={(e) => handlePortMouseDown(e, node, 'top')}
                      className="hover:scale-150 transition-transform"
                    />
                    {/* Bottom Port */}
                    <circle
                      cx={node.width / 2}
                      cy={node.height}
                      r="5"
                      fill="#2563eb"
                      stroke="#ffffff"
                      strokeWidth="1.5"
                      onMouseDown={(e) => handlePortMouseDown(e, node, 'bottom')}
                      className="hover:scale-150 transition-transform"
                    />
                    {/* Left Port */}
                    <circle
                      cx="0"
                      cy={node.height / 2}
                      r="5"
                      fill="#2563eb"
                      stroke="#ffffff"
                      strokeWidth="1.5"
                      onMouseDown={(e) => handlePortMouseDown(e, node, 'left')}
                      className="hover:scale-150 transition-transform"
                    />
                    {/* Right Port */}
                    <circle
                      cx={node.width}
                      cy={node.height / 2}
                      r="5"
                      fill="#2563eb"
                      stroke="#ffffff"
                      strokeWidth="1.5"
                      onMouseDown={(e) => handlePortMouseDown(e, node, 'right')}
                      className="hover:scale-150 transition-transform"
                    />
                  </g>
                )}
              </g>
            );
          })}
        </svg>

        {/* Floating Node Editor Popover when node is selected */}
        {selectedNodeId && !readOnly && (
          <div className="absolute bottom-3 left-3 bg-white border border-slate-300 rounded-lg shadow-lg p-3 text-xs space-y-2 z-20 w-80">
            {(() => {
              const selNode = nodes.find((n) => n.id === selectedNodeId);
              if (!selNode) return null;
              return (
                <>
                  <div className="flex items-center justify-between font-bold text-slate-800 border-b pb-1.5">
                    <span>도형 속성 편집</span>
                    <button
                      type="button"
                      onClick={handleDeleteSelected}
                      className="text-red-600 hover:text-red-800 flex items-center gap-1 text-[11px]"
                    >
                      <Trash2 className="w-3 h-3" /> 삭제
                    </button>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      라벨 텍스트:
                    </label>
                    <textarea
                      rows={selNode.type === 'database' ? 3 : 2}
                      value={selNode.label}
                      onChange={(e) => {
                        const updated = nodes.map((n) =>
                          n.id === selNode.id ? { ...n, label: e.target.value } : n
                        );
                        updateGraph(updated, edges);
                      }}
                      className="w-full p-1.5 border border-slate-300 rounded text-xs font-semibold focus:border-blue-500"
                      placeholder="도형 텍스트 입력 (줄바꿈 가능)"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500">도형 유형:</span>
                    <select
                      value={selNode.type}
                      onChange={(e) => {
                        const newType = e.target.value as FlowShapeType;
                        const updated = nodes.map((n) =>
                          n.id === selNode.id ? { ...n, type: newType } : n
                        );
                        updateGraph(updated, edges);
                      }}
                      className="px-1.5 py-0.5 border border-slate-300 rounded text-xs"
                    >
                      <option value="start">시작 (Start)</option>
                      <option value="process">박스 (Process)</option>
                      <option value="decision">처리 옵션 (Decision)</option>
                      <option value="database">DB 실린더 (Database)</option>
                      <option value="end">종료 (End)</option>
                    </select>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* Floating Edge Editor Popover when edge is selected */}
        {selectedEdgeId && !readOnly && (
          <div className="absolute bottom-3 right-3 bg-white border border-slate-300 rounded-lg shadow-lg p-3 text-xs space-y-2 z-20 w-72">
            {(() => {
              const selEdge = edges.find((e) => e.id === selectedEdgeId);
              if (!selEdge) return null;
              return (
                <>
                  <div className="flex items-center justify-between font-bold text-slate-800 border-b pb-1.5">
                    <span>화살표(연결선) 편집</span>
                    <button
                      type="button"
                      onClick={handleDeleteSelected}
                      className="text-red-600 hover:text-red-800 flex items-center gap-1 text-[11px]"
                    >
                      <Trash2 className="w-3 h-3" /> 삭제
                    </button>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      분기 라벨 (조건명):
                    </label>
                    <input
                      type="text"
                      value={selEdge.label || ''}
                      onChange={(e) => {
                        const updated = edges.map((ed) =>
                          ed.id === selEdge.id ? { ...ed, label: e.target.value } : ed
                        );
                        updateGraph(nodes, updated);
                      }}
                      className="w-full p-1.5 border border-slate-300 rounded text-xs font-semibold focus:border-blue-500"
                      placeholder="예: 조회, 생성, 성공, 실패, Yes, No"
                    />
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
};
