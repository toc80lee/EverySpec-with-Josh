import {
  DataFlowDiagramConfig,
  ProgramSpec,
  CanvasNode,
  CanvasEdge,
  FlowShapeType,
  PortPosition,
} from '../types/sap';

/**
 * Standard SAP Data Flow Template matching the user's reference diagram
 * Represented as customizable interactive Canvas nodes and connected edges
 */
export const DEFAULT_CANVAS_NODES: CanvasNode[] = [
  { id: 'node-start', type: 'start', label: 'Start', x: 270, y: 30, width: 120, height: 38 },
  { id: 'node-1', type: 'process', label: '1) Initialization', x: 270, y: 95, width: 120, height: 38, description: 'INITIALIZATION' },
  { id: 'node-2', type: 'process', label: '2) Selection Screen', x: 270, y: 165, width: 120, height: 38, description: 'AT SELECTION-SCREEN OUTPUT' },
  { id: 'node-3', type: 'process', label: '3) Validate Input', x: 270, y: 235, width: 120, height: 38, description: 'AT SELECTION-SCREEN' },
  { id: 'node-db1', type: 'database', label: 'T004\nT004T', x: 50, y: 185, width: 120, height: 60, description: 'Master Table' },
  { id: 'node-opt', type: 'decision', label: 'Processing Option', x: 275, y: 305, width: 110, height: 46, description: 'Query vs Create' },
  { id: 'node-4', type: 'process', label: '4) Query / Read', x: 175, y: 385, width: 110, height: 38, description: 'START-OF-SELECTION' },
  { id: 'node-5', type: 'process', label: '5) Create / Post', x: 355, y: 385, width: 110, height: 38, description: 'Creation Mode' },
  { id: 'node-5-1', type: 'process', label: '5-1) Excel Upload', x: 355, y: 455, width: 110, height: 38, description: 'Parse Excel data' },
  { id: 'node-db2', type: 'database', label: 'SETHEADER\nSETHEADERT\nSETNODE\nSETLEAF', x: 50, y: 485, width: 120, height: 85, description: 'Set Hierarchy Tables' },
  { id: 'node-6', type: 'process', label: '6) Data Transformation', x: 265, y: 545, width: 130, height: 40, description: 'END-OF-SELECTION' },
  { id: 'node-7', type: 'process', label: '7) Call Screen 100', x: 265, y: 620, width: 130, height: 38, description: 'CALL SCREEN 100' },
  { id: 'node-cmd', type: 'decision', label: 'User Command', x: 275, y: 695, width: 110, height: 46, description: 'PAI Event' },
  { id: 'node-7-1', type: 'process', label: '7-1) Exit', x: 175, y: 770, width: 110, height: 38, description: 'LEAVE TO SCREEN 0' },
  { id: 'node-7-2', type: 'process', label: '7-2) Save / Execute', x: 355, y: 770, width: 110, height: 38, description: 'BAPI Parameter Mapping' },
  { id: 'node-bapi', type: 'decision', label: 'BAPI Execution', x: 355, y: 840, width: 110, height: 46, description: 'Call BAPI' },
  { id: 'node-7-2-1', type: 'process', label: '7-2-1) Post Success', x: 260, y: 915, width: 120, height: 38, description: 'BAPI_COMMIT' },
  { id: 'node-7-2-2', type: 'process', label: '7-2-2) Post Failed', x: 420, y: 915, width: 120, height: 38, description: 'Error Rollback & Retry' },
  { id: 'node-end', type: 'end', label: 'End', x: 270, y: 995, width: 120, height: 38 },
];

export const DEFAULT_CANVAS_EDGES: CanvasEdge[] = [
  { id: 'e1', from: 'node-start', to: 'node-1', fromPort: 'bottom', toPort: 'top' },
  { id: 'e2', from: 'node-1', to: 'node-2', fromPort: 'bottom', toPort: 'top' },
  { id: 'e3', from: 'node-2', to: 'node-3', fromPort: 'bottom', toPort: 'top' },
  { id: 'e4', from: 'node-3', to: 'node-opt', fromPort: 'bottom', toPort: 'top' },
  { id: 'e-db1-2', from: 'node-db1', to: 'node-2', fromPort: 'right', toPort: 'left' },
  { id: 'e-db1-3', from: 'node-db1', to: 'node-3', fromPort: 'right', toPort: 'left' },
  { id: 'e-opt-4', from: 'node-opt', to: 'node-4', fromPort: 'left', toPort: 'top', label: 'Query' },
  { id: 'e-opt-5', from: 'node-opt', to: 'node-5', fromPort: 'right', toPort: 'top', label: 'Create' },
  { id: 'e-5-51', from: 'node-5', to: 'node-5-1', fromPort: 'bottom', toPort: 'top' },
  { id: 'e-db2-4', from: 'node-db2', to: 'node-4', fromPort: 'top', toPort: 'left' },
  { id: 'e-db2-6', from: 'node-db2', to: 'node-6', fromPort: 'right', toPort: 'left' },
  { id: 'e-4-6', from: 'node-4', to: 'node-6', fromPort: 'bottom', toPort: 'top' },
  { id: 'e-51-6', from: 'node-5-1', to: 'node-6', fromPort: 'bottom', toPort: 'top' },
  { id: 'e-6-7', from: 'node-6', to: 'node-7', fromPort: 'bottom', toPort: 'top' },
  { id: 'e-7-cmd', from: 'node-7', to: 'node-cmd', fromPort: 'bottom', toPort: 'top' },
  { id: 'e-cmd-71', from: 'node-cmd', to: 'node-7-1', fromPort: 'left', toPort: 'top', label: 'Exit' },
  { id: 'e-cmd-72', from: 'node-cmd', to: 'node-7-2', fromPort: 'right', toPort: 'top', label: 'Create' },
  { id: 'e-72-bapi', from: 'node-7-2', to: 'node-bapi', fromPort: 'bottom', toPort: 'top' },
  { id: 'e-bapi-ok', from: 'node-bapi', to: 'node-7-2-1', fromPort: 'left', toPort: 'top', label: 'Success' },
  { id: 'e-bapi-fail', from: 'node-bapi', to: 'node-7-2-2', fromPort: 'right', toPort: 'top', label: 'Fail' },
  { id: 'e-71-end', from: 'node-7-1', to: 'node-end', fromPort: 'bottom', toPort: 'left' },
  { id: 'e-ok-end', from: 'node-7-2-1', to: 'node-end', fromPort: 'bottom', toPort: 'top' },
  { id: 'e-fail-loop', from: 'node-7-2-2', to: 'node-6', fromPort: 'right', toPort: 'right', label: 'Retry', style: 'orthogonal' },
];

export const DEFAULT_CO_DATA_FLOW: DataFlowDiagramConfig = {
  title: 'Data Flow Diagram (Program Execution Flowchart)',
  nodes: DEFAULT_CANVAS_NODES,
  edges: DEFAULT_CANVAS_EDGES,
};

/**
 * Automatically builds or personalizes a Data Flow diagram from a ProgramSpec
 */
export function generateDataFlowFromSpec(spec: ProgramSpec): DataFlowDiagramConfig {
  const module = spec.module || 'CO';

  // Extract custom referenced tables
  const detectedTables = new Set<string>();
  spec.selection_params?.forEach((p) => {
    if (p.ref_table) detectedTables.add(p.ref_table);
  });
  spec.field_catalog?.forEach((f) => {
    if (f.ref_table) detectedTables.add(f.ref_table);
  });

  const tableList = Array.from(detectedTables);

  let db1Tables = 'T004\nT004T';
  let db2Tables = 'SETHEADER\nSETHEADERT\nSETNODE\nSETLEAF';

  if (module === 'SD') {
    db1Tables = 'TVKO\nTVTW';
    db2Tables = 'VBAK\nVBAP\nVBRK\nVBRP';
  } else if (module === 'MM') {
    db1Tables = 'T001W\nT001L';
    db2Tables = 'MARA\nMAKT\nEKKO\nEKPO';
  } else if (module === 'CO') {
    db1Tables = 'T004\nT004T';
    db2Tables = 'SETHEADER\nSETHEADERT\nSETNODE\nSETLEAF';
  } else if (module === 'FI') {
    db1Tables = 'T001\nSKA1\nSKB1';
    db2Tables = 'BKPF\nBSEG\nBSIS\nBSAS';
  } else if (tableList.length > 0) {
    db1Tables = tableList.slice(0, 2).join('\n') || 'T001\nT001W';
    db2Tables = tableList.slice(2, 6).join('\n') || 'VBAK\nVBAP';
  }

  // Clone nodes and update DB cylinder table labels
  const nodes = JSON.parse(JSON.stringify(DEFAULT_CANVAS_NODES)) as CanvasNode[];
  const edges = JSON.parse(JSON.stringify(DEFAULT_CANVAS_EDGES)) as CanvasEdge[];

  const db1Node = nodes.find((n) => n.id === 'node-db1');
  if (db1Node) db1Node.label = db1Tables;

  const db2Node = nodes.find((n) => n.id === 'node-db2');
  if (db2Node) db2Node.label = db2Tables;

  return {
    title: `${spec.program_id || 'ALV'} 처리 흐름도 (Data Flow Diagram)`,
    nodes,
    edges,
  };
}

/**
 * Automatically calculates neat vertical/horizontal hierarchical layout for canvas nodes and routes orthogonal edges
 */
export function autoLayoutFlowchart(
  nodes: CanvasNode[],
  edges: CanvasEdge[]
): { nodes: CanvasNode[]; edges: CanvasEdge[] } {
  if (nodes.length === 0) return { nodes, edges };

  // 1. Separate DB cylinder nodes from flow nodes
  const dbNodes = nodes.filter((n) => n.type === 'database');
  const flowNodes = nodes.filter((n) => n.type !== 'database');

  // 2. Identify in-degree among flow nodes
  const incomingCount: Record<string, number> = {};
  flowNodes.forEach((n) => {
    incomingCount[n.id] = 0;
  });
  edges.forEach((e) => {
    if (incomingCount[e.to] !== undefined && e.from !== e.to) {
      incomingCount[e.to] = (incomingCount[e.to] || 0) + 1;
    }
  });

  const startNode = flowNodes.find((n) => n.type === 'start');
  const roots = startNode
    ? [startNode, ...flowNodes.filter((n) => n.id !== startNode.id && incomingCount[n.id] === 0)]
    : flowNodes.filter((n) => incomingCount[n.id] === 0);

  const levels: CanvasNode[][] = [];
  const visited = new Set<string>();

  const initialLevel = roots.length > 0 ? roots : [flowNodes[0]];
  initialLevel.forEach((n) => visited.add(n.id));
  levels.push(initialLevel);

  let currentLevel = initialLevel;
  while (currentLevel.length > 0 && visited.size < flowNodes.length) {
    const nextLevel: CanvasNode[] = [];
    currentLevel.forEach((parent) => {
      const childEdges = edges.filter((e) => e.from === parent.id);
      childEdges.forEach((e) => {
        const child = flowNodes.find((n) => n.id === e.to);
        if (child && !visited.has(child.id)) {
          visited.add(child.id);
          nextLevel.push(child);
        }
      });
    });

    if (nextLevel.length === 0) {
      const unvisited = flowNodes.filter((n) => !visited.has(n.id));
      if (unvisited.length > 0) {
        visited.add(unvisited[0].id);
        nextLevel.push(unvisited[0]);
      }
    }

    if (nextLevel.length > 0) {
      levels.push(nextLevel);
      currentLevel = nextLevel;
    } else {
      break;
    }
  }

  // Position flowNodes based on levels
  const layoutedNodes: CanvasNode[] = [];
  const mainCenterX = 300;
  let currentY = 35;

  levels.forEach((levelNodes) => {
    const count = levelNodes.length;
    let maxH = 38;

    if (count === 1) {
      const node = levelNodes[0];
      const w = node.width || 120;
      const h = node.height || 38;
      maxH = Math.max(maxH, h);
      layoutedNodes.push({
        ...node,
        x: Math.round(mainCenterX - w / 2),
        y: currentY,
      });
    } else if (count === 2) {
      const [leftNode, rightNode] = levelNodes;
      const w1 = leftNode.width || 110;
      const h1 = leftNode.height || 38;
      const w2 = rightNode.width || 110;
      const h2 = rightNode.height || 38;
      maxH = Math.max(maxH, h1, h2);

      layoutedNodes.push({
        ...leftNode,
        x: Math.round(mainCenterX - w1 - 25),
        y: currentY,
      });
      layoutedNodes.push({
        ...rightNode,
        x: Math.round(mainCenterX + 25),
        y: currentY,
      });
    } else {
      const spacing = 135;
      const totalWidth = count * spacing;
      const startX = mainCenterX - totalWidth / 2 + spacing / 2;

      levelNodes.forEach((node, idx) => {
        const w = node.width || 110;
        const h = node.height || 38;
        maxH = Math.max(maxH, h);
        layoutedNodes.push({
          ...node,
          x: Math.round(startX + idx * spacing - w / 2),
          y: currentY,
        });
      });
    }

    currentY += maxH + 40;
  });

  // Position DB cylinder nodes on the left column (x = 45)
  let dbY = 160;
  dbNodes.forEach((dbNode) => {
    const connectedEdges = edges.filter((e) => e.from === dbNode.id || e.to === dbNode.id);
    const targetFlowId =
      connectedEdges.find((e) => e.from === dbNode.id)?.to ||
      connectedEdges.find((e) => e.to === dbNode.id)?.from;
    const targetNode = targetFlowId ? layoutedNodes.find((n) => n.id === targetFlowId) : null;

    const finalY = targetNode ? Math.max(30, targetNode.y - 10) : dbY;

    layoutedNodes.push({
      ...dbNode,
      x: 45,
      y: finalY,
    });
    dbY = finalY + (dbNode.height || 60) + 40;
  });

  // Re-route edge ports intelligently
  const updatedEdges = edges.map((e) => {
    const fromN = layoutedNodes.find((n) => n.id === e.from);
    const toN = layoutedNodes.find((n) => n.id === e.to);
    if (!fromN || !toN) return e;

    if (fromN.type === 'database') {
      return { ...e, fromPort: 'right' as PortPosition, toPort: 'left' as PortPosition };
    }
    if (toN.type === 'database') {
      return { ...e, fromPort: 'left' as PortPosition, toPort: 'right' as PortPosition };
    }

    // Loopback edge (child above parent)
    if (toN.y < fromN.y) {
      return { ...e, fromPort: 'right' as PortPosition, toPort: 'right' as PortPosition };
    }

    // Branching:
    if (fromN.x < toN.x - 30) {
      return { ...e, fromPort: 'right' as PortPosition, toPort: 'top' as PortPosition };
    }
    if (fromN.x > toN.x + 30) {
      return { ...e, fromPort: 'left' as PortPosition, toPort: 'top' as PortPosition };
    }

    return { ...e, fromPort: 'bottom' as PortPosition, toPort: 'top' as PortPosition };
  });

  return { nodes: layoutedNodes, edges: updatedEdges };
}

