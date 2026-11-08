import React from 'react';
import { Workflow } from 'lucide-react';
import { DataFlowDiagramConfig, ProgramSpec } from '../types/sap';
import { InteractiveDataFlowCanvas } from './InteractiveDataFlowCanvas';

interface DataFlowEditorProps {
  spec: ProgramSpec;
  onChange: (updatedFlow: DataFlowDiagramConfig) => void;
}

export const DataFlowEditor: React.FC<DataFlowEditorProps> = ({ spec, onChange }) => {
  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <Workflow className="w-4 h-4 text-blue-600" />
            <span>Data Flow</span>
          </h3>
          <p className="text-xs text-slate-500">
            Add Start, Process Box, Decision (Branch), and DB Table nodes. Hover and drag connection ports (●) to connect arrows directly.
          </p>
        </div>
      </div>

      {/* Interactive Visual Drag & Connect Canvas */}
      <InteractiveDataFlowCanvas
        spec={spec}
        config={spec.data_flow}
        onChange={onChange}
      />
    </div>
  );
};
