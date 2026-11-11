import React from 'react';
import { DataFlowDiagramConfig, ProgramSpec } from '../types/sap';
import { MermaidDataFlowEditor } from './MermaidDataFlowEditor';

interface DataFlowEditorProps {
  spec: ProgramSpec;
  onChange: (updatedFlow: DataFlowDiagramConfig) => void;
}

export const DataFlowEditor: React.FC<DataFlowEditorProps> = ({ spec, onChange }) => {
  return (
    <MermaidDataFlowEditor
      spec={spec}
      config={spec.data_flow}
      onChange={onChange}
    />
  );
};
