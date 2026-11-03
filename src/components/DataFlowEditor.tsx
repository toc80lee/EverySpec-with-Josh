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
    <div className="space-y-2 pt-5 border-t border-slate-200">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <Workflow className="w-4 h-4 text-blue-600" />
            <span>Data Flow Diagram (프로그램 처리 흐름도 직접 작성)</span>
          </h3>
          <p className="text-xs text-slate-500">
            시작, 박스(처리), 처리 옵션(분기), DB 실린더를 추가하고, 도형의 연결 포인트(●)를 드래그하여 화살표로 직접 이어주세요.
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
