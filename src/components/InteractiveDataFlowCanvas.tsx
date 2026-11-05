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
  X,
  Maximize2,
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

  // Dedicated Modals for Editing Node & Edge properties
  const [editingNode, setEditingNode] = useState<CanvasNode | null>(null);
  const [editingEdge, setEditingEdge] = useState<CanvasEdge | null>(null);

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

  // Auto-fit node width and height based on text content
  const autoFitNode = useCallback((node: CanvasNode): CanvasNode => {
    const lines = node.label.split('\n');
    const maxLineLen = Math.max(...lines.map((l) => l.length), 4);
    const isDb = node.type === 'database';
    const isDecision = node.type === 'decision';

    const newWidth = Math.max(
      isDecision ? 120 : isDb ? 120 : 110,
      Math.min(320, maxLineLen * (isDb ? 8.5 : 8) + 30)
    );
    const newHeight = Math.max(
      isDecision ? 48 : isDb ? 60 : 38,
      lines.length * 16 + (isDb ? 34 : 18)
    );

    return { ...node, width: Math.round(newWidth), height: Math.round(newHeight) };
  }, []);

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

  const handleSaveNode = useCallback(
    (updatedNode: CanvasNode) => {
      const updated = nodes.map((n) => (n.id === updatedNode.id ? updatedNode : n));
      updateGraph(updated, edges);
      setNotice(`Node '${updatedNode.label.split('\n')[0]}' updated.`);
      setTimeout(() => setNotice(null), 3000);
    },
    [nodes, edges, updateGraph]
  );

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      const updatedNodes = nodes.filter((n) => n.id !== nodeId);
      const updatedEdges = edges.filter((e) => e.from !== nodeId && e.to !== nodeId);
      updateGraph(updatedNodes, updatedEdges);
      if (selectedNodeId === nodeId) setSelectedNodeId(null);
      setNotice('Node and connected arrows deleted.');
      setTimeout(() => setNotice(null), 3000);
    },
    [nodes, edges, selectedNodeId, updateGraph]
  );

  const handleAutoFitNode = useCallback(
    (nodeId: string) => {
      const targetNode = nodes.find((n) => n.id === nodeId);
      if (!targetNode) return;
      const fitted = autoFitNode(targetNode);
      const updated = nodes.map((n) => (n.id === nodeId ? fitted : n));
      updateGraph(updated, edges);
      setNotice(`Auto-fitted size for '${fitted.label.split('\n')[0]}'.`);
      setTimeout(() => setNotice(null), 3000);
    },
    [nodes, edges, autoFitNode, updateGraph]
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
    setEditingNode(newNode);
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
      if (editingNode || editingEdge) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeId || selectedEdgeId) {
          handleDeleteSelected();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, selectedEdgeId, editingNode, editingEdge, handleDeleteSelected]);

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
    <div className={`space-y-3 ${readOnly ? '' : 'pt-3 border-t border-slate-200'} font-sans`}>
      {/* 1. Canvas Palette & Action Toolbar (Only in edit mode) */}
      {!readOnly && (
        <>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex items-center justify-between flex-wrap gap-2 shadow-2xs">
          {/* Left: Shape insertion palette */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1 mr-1">
              <Link2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Add Node:</span>
            </span>

          <button
            type="button"
            onClick={() => handleAddShape('start')}
            className="px-2 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded shadow-2xs flex items-center gap-1 cursor-pointer"
            title="Add Start node"
          >
            <Play className="w-3 h-3 text-emerald-600 fill-emerald-600" />
            <span>Start</span>
          </button>

          <button
            type="button"
            onClick={() => handleAddShape('process')}
            className="px-2 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded shadow-2xs flex items-center gap-1 cursor-pointer"
            title="Add Process box"
          >
            <Square className="w-3 h-3 text-blue-600" />
            <span>Process Box</span>
          </button>

          <button
            type="button"
            onClick={() => handleAddShape('decision')}
            className="px-2 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded shadow-2xs flex items-center gap-1 cursor-pointer"
            title="Add Decision (Branch) diamond"
          >
            <HelpCircle className="w-3 h-3 text-amber-600" />
            <span>Decision (Branch)</span>
          </button>

          <button
            type="button"
            onClick={() => handleAddShape('database')}
            className="px-2 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded shadow-2xs flex items-center gap-1 cursor-pointer"
            title="Add Database Cylinder node"
          >
            <Database className="w-3 h-3 text-purple-600" />
            <span>DB Table</span>
          </button>

          <button
            type="button"
            onClick={() => handleAddShape('end')}
            className="px-2 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded shadow-2xs flex items-center gap-1 cursor-pointer"
            title="Add End node"
          >
            <Square className="w-3 h-3 text-rose-600 fill-rose-600 rounded-sm" />
            <span>End</span>
          </button>
        </div>

        {/* Right: Actions (Template, Auto, Delete, Zoom) */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {selectedNodeId || selectedEdgeId ? (
            <button
              type="button"
              onClick={handleDeleteSelected}
              className="px-2 py-1 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-300 rounded flex items-center gap-1 cursor-pointer"
              title="Delete Selected Item (Delete key)"
            >
              <Trash2 className="w-3 h-3" />
              <span>Delete</span>
            </button>
          ) : null}

          <button
            type="button"
            onClick={handleAutoGenerate}
            className="px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-300 rounded flex items-center gap-1 cursor-pointer"
            title="Auto-generate flow from program logic"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Auto-Generate Flow</span>
          </button>

          <button
            type="button"
            onClick={handleLoadReferenceTemplate}
            className="px-2 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded flex items-center gap-1 cursor-pointer"
            title="Load standard reference flowchart template"
          >
            <RotateCcw className="w-3 h-3 text-slate-500" />
            <span>Standard Template</span>
          </button>

          <button
            type="button"
            onClick={handleClearCanvas}
            className="px-2 py-1 text-xs text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded cursor-pointer"
            title="Clear canvas"
          >
            Clear Canvas
          </button>

          {/* Zoom controls */}
          <div className="flex items-center bg-white border border-slate-300 rounded text-xs ml-1">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(z + 0.15, 2.0))}
              className="p-1 hover:bg-slate-100 text-slate-600 cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(z - 0.15, 0.5))}
              className="p-1 hover:bg-slate-100 text-slate-600 cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoom(1)}
              className="px-1.5 py-0.5 text-[11px] text-slate-600 font-mono hover:bg-slate-100 cursor-pointer"
              title="Reset 100%"
            >
              {Math.round(zoom * 100)}%
            </button>
          </div>

          <button
            type="button"
            onClick={handleDownloadSvg}
            className="p-1.5 hover:bg-slate-200 bg-white border border-slate-300 rounded text-slate-700 cursor-pointer"
            title="Export as SVG"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Helper guide banner */}
      <div className="px-3 py-1.5 bg-blue-50/70 border border-blue-200 rounded text-[11px] text-blue-900 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          <span className="font-bold">💡 Connection Guide:</span>
          <span>
            Hover over a node to reveal connection points (●), then <strong>drag from a point to another node to connect arrows automatically</strong>.
            Drag nodes to reposition, and double-click to edit text.
          </span>
        </div>
      </div>
      </>
      )}

      {notice && !readOnly && (
        <div className="p-2 bg-emerald-50 border border-emerald-300 rounded text-xs text-emerald-800 flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* 2. Interactive SVG Canvas Area */}
      <div
        className={
          readOnly
            ? 'relative flex justify-center bg-white p-1 overflow-visible'
            : 'relative border border-slate-300 rounded-lg overflow-auto bg-slate-100/60 shadow-inner h-[680px]'
        }
        onClick={() => {
          setSelectedNodeId(null);
          setSelectedEdgeId(null);
          setEditingNode(null);
          setEditingEdge(null);
        }}
      >
        <svg
          ref={canvasRef}
          width={readOnly ? '100%' : maxX * zoom}
          height={readOnly ? 'auto' : maxY * zoom}
          viewBox={`0 0 ${maxX} ${maxY}`}
          onMouseMove={readOnly ? undefined : handleCanvasMouseMove}
          onMouseUp={readOnly ? undefined : handleCanvasMouseUp}
          className="select-none cursor-default max-w-full"
          style={{
            backgroundColor: '#ffffff',
            maxHeight: readOnly ? '420px' : undefined,
          }}
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
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setEditingEdge(edge);
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
                  strokeWidth={isSelected ? '2.4' : '1.3'}
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

                {/* Quick Edit Chip for selected edge */}
                {isSelected && !readOnly && (
                  <g
                    transform={`translate(${labelPos.x}, ${labelPos.y - (edge.label ? 20 : 12)})`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingEdge(edge);
                    }}
                    className="cursor-pointer hover:opacity-90"
                  >
                    <rect x="-35" y="-10" width="70" height="20" rx="4" fill="#0f172a" fillOpacity="0.9" />
                    <text x="0" y="3.5" fill="#ffffff" fontSize="9.5" textAnchor="middle" fontWeight="bold">
                      ✏️ Edit Arrow
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
                  setEditingNode(node);
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

                {/* Node Label Text (support multiline for DB tables and detailed logic) */}
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

                {/* Quick Action Toolbar directly above selected node */}
                {isSelected && !readOnly && (
                  <g transform={`translate(${Math.max(0, (node.width - 105) / 2)}, -26)`} className="cursor-pointer">
                    <rect x="0" y="0" width="105" height="22" rx="4" fill="#0f172a" fillOpacity="0.9" />
                    {/* Edit Button */}
                    <g
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingNode(node);
                      }}
                      className="hover:opacity-85"
                    >
                      <rect x="2" y="2" width="31" height="18" rx="3" fill="#2563eb" />
                      <text x="17.5" y="14" fill="#ffffff" fontSize="9.5" textAnchor="middle" fontWeight="bold">
                        Edit
                      </text>
                    </g>
                    {/* Auto-Fit Button */}
                    <g
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAutoFitNode(node.id);
                      }}
                      className="hover:opacity-85"
                    >
                      <rect x="35" y="2" width="31" height="18" rx="3" fill="#475569" />
                      <text x="50.5" y="14" fill="#ffffff" fontSize="9.5" textAnchor="middle" fontWeight="bold">
                        Fit
                      </text>
                    </g>
                    {/* Delete Button */}
                    <g
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteNode(node.id);
                      }}
                      className="hover:opacity-85"
                    >
                      <rect x="68" y="2" width="35" height="18" rx="3" fill="#ef4444" />
                      <text x="85.5" y="14" fill="#ffffff" fontSize="9.5" textAnchor="middle" fontWeight="bold">
                        Del
                      </text>
                    </g>
                  </g>
                )}

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
      </div>

      {/* ========================================================================= */}
      {/* 3. DEDICATED NODE EDIT MODAL                                              */}
      {/* ========================================================================= */}
      {editingNode && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150 font-sans"
          onClick={() => setEditingNode(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold">Edit Flowchart Node</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingNode(null)}
                className="text-slate-400 hover:text-white p-1 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs">
              {/* Shape Type Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Node Shape & Role
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { type: 'start', label: 'Start (Capsule)', icon: Play },
                    { type: 'process', label: 'Process Box', icon: Square },
                    { type: 'decision', label: 'Decision (Diamond)', icon: HelpCircle },
                    { type: 'database', label: 'DB Table (Cylinder)', icon: Database },
                    { type: 'end', label: 'End (Capsule)', icon: Square },
                  ].map((item) => (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() =>
                        setEditingNode({ ...editingNode, type: item.type as FlowShapeType })
                      }
                      className={`p-2 rounded-lg border text-left flex items-center gap-2 transition-all cursor-pointer ${
                        editingNode.type === item.type
                          ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold ring-2 ring-blue-300'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <item.icon className="w-3.5 h-3.5 shrink-0 text-slate-600" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Node Label Text */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Node Label (Text Content)
                  </label>
                  <span className="text-[11px] text-slate-400 font-normal">
                    Enter for new line
                  </span>
                </div>
                <textarea
                  rows={editingNode.type === 'database' ? 4 : 3}
                  value={editingNode.label}
                  onChange={(e) => setEditingNode({ ...editingNode, label: e.target.value })}
                  placeholder="Enter step label or DB table names..."
                  className={`w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${
                    editingNode.type === 'database' ? 'font-mono uppercase font-bold' : 'font-medium'
                  }`}
                  autoFocus
                />
              </div>

              {/* Dimensions and Auto-Fit */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Dimensions (Width × Height)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const fitted = autoFitNode(editingNode);
                      setEditingNode(fitted);
                    }}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-0.5 rounded border border-blue-200 cursor-pointer flex items-center gap-1"
                  >
                    <Maximize2 className="w-3 h-3" />
                    <span>Auto-Fit Size to Text</span>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] text-slate-500">Width (px):</span>
                    <input
                      type="number"
                      value={editingNode.width}
                      min={70}
                      max={450}
                      onChange={(e) =>
                        setEditingNode({ ...editingNode, width: Math.max(60, Number(e.target.value)) })
                      }
                      className="w-full mt-1 p-1.5 border border-slate-300 rounded font-mono text-center"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500">Height (px):</span>
                    <input
                      type="number"
                      value={editingNode.height}
                      min={30}
                      max={350}
                      onChange={(e) =>
                        setEditingNode({ ...editingNode, height: Math.max(30, Number(e.target.value)) })
                      }
                      className="w-full mt-1 p-1.5 border border-slate-300 rounded font-mono text-center"
                    />
                  </div>
                </div>
              </div>

              {/* SAP Event Tag (Optional) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  SAP Event Tag / Notes (Optional)
                </label>
                <input
                  type="text"
                  value={editingNode.description || ''}
                  onChange={(e) => setEditingNode({ ...editingNode, description: e.target.value })}
                  placeholder="e.g. INITIALIZATION, AT SELECTION-SCREEN, START-OF-SELECTION"
                  className="w-full p-2 border border-slate-300 rounded text-xs font-mono"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  handleDeleteNode(editingNode.id);
                  setEditingNode(null);
                }}
                className="px-3 py-1.5 text-xs font-semibold text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Node</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingNode(null)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 bg-white border border-slate-300 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleSaveNode(editingNode);
                    setEditingNode(null);
                  }}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. DEDICATED EDGE / ARROW EDIT MODAL                                      */}
      {/* ========================================================================= */}
      {editingEdge && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150 font-sans"
          onClick={() => setEditingEdge(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold">Edit Connection Arrow</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingEdge(null)}
                className="text-slate-400 hover:text-white p-1 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Branch Label (Condition Text)
                </label>
                <input
                  type="text"
                  value={editingEdge.label || ''}
                  onChange={(e) => setEditingEdge({ ...editingEdge, label: e.target.value })}
                  placeholder="e.g. Query, Create, Success, Fail, Yes, No"
                  className="w-full p-2 border border-slate-300 rounded text-xs font-semibold focus:border-blue-500"
                  autoFocus
                />
              </div>

              <div>
                <span className="block text-[11px] text-slate-500 mb-1 font-semibold">
                  Quick Preset Labels:
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {['Query', 'Create', 'Success', 'Fail', 'Yes', 'No', 'Retry', 'Exit', 'Cancel'].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setEditingEdge({ ...editingEdge, label: tag })}
                      className="px-2 py-0.5 rounded bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-900 border border-slate-200 text-[11px] cursor-pointer"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  const updatedEdges = edges.filter((e) => e.id !== editingEdge.id);
                  updateGraph(nodes, updatedEdges);
                  setEditingEdge(null);
                  setSelectedEdgeId(null);
                }}
                className="px-2.5 py-1 text-xs font-semibold text-red-600 hover:text-red-800 hover:bg-red-50 rounded flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Arrow</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingEdge(null)}
                  className="px-3 py-1 text-xs text-slate-600 hover:text-slate-800 bg-white border border-slate-300 rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const updatedEdges = edges.map((e) =>
                      e.id === editingEdge.id ? { ...e, label: editingEdge.label } : e
                    );
                    updateGraph(nodes, updatedEdges);
                    setEditingEdge(null);
                  }}
                  className="px-3.5 py-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded shadow-xs cursor-pointer"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
