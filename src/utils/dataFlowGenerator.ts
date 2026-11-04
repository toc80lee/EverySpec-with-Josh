import {
  DataFlowDiagramConfig,
  ProgramSpec,
  CanvasNode,
  CanvasEdge,
  FlowShapeType,
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
