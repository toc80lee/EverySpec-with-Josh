import React from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, Sliders } from 'lucide-react';
import { SelectionParameter, SelectionKind, ProgramSpec } from '../types/sap';

interface SelectionScreenEditorProps {
  spec: ProgramSpec;
  onChange: (updatedParams: SelectionParameter[]) => void;
}

export const SelectionScreenEditor: React.FC<SelectionScreenEditorProps> = ({
  spec,
  onChange,
}) => {
  const handleAddParam = (kind: SelectionKind) => {
    const nextIdx = spec.selection_params.length + 1;
    const isParam = kind === 'PARAMETER';
    const newParam: SelectionParameter = {
      id: `param-${Date.now()}`,
      kind,
      name: isParam ? `P_FLD${nextIdx}` : `S_FLD${nextIdx}`,
      text: isParam ? `파라미터 항목 ${nextIdx}` : `범위 선택 항목 ${nextIdx}`,
      datatype: 'CHAR',
      length: 10,
      obligatory: false,
      default_val: '',
      low: '',
      high: '',
      sign: 'I',
      option: 'EQ',
    };
    onChange([...spec.selection_params, newParam]);
  };

  const handleDelete = (id: string) => {
    onChange(spec.selection_params.filter(p => p.id !== id));
  };

  const handleUpdate = (id: string, patch: Partial<SelectionParameter>) => {
    onChange(
      spec.selection_params.map(p => (p.id === id ? { ...p, ...patch } : p))
    );
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= spec.selection_params.length) return;

    const list = [...spec.selection_params];
    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;
    onChange(list);
  };

  return (
    <div className="space-y-4">
      {/* Top Bar */}
      <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
        <div className="text-xs text-slate-600 flex items-center gap-1.5">
          <Sliders className="w-4 h-4 text-blue-700" />
          <span>조회 조건 화면 (Selection Screen)의 PARAMETERS 및 SELECT-OPTIONS를 정의합니다.</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleAddParam('PARAMETER')}
            className="px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 rounded transition-colors flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            + PARAMETERS 추가
          </button>
          <button
            onClick={() => handleAddParam('SELECT_OPTION')}
            className="px-3 py-1.5 text-xs font-semibold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-300 rounded transition-colors flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5 text-blue-600" />
            + SELECT-OPTIONS 추가
          </button>
        </div>
      </div>

      {/* Parameters Table */}
      <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-xs">
        <table className="w-full text-xs text-left border-collapse">
          <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-2.5 px-3 w-12 text-center">구분</th>
              <th className="py-2.5 px-3 w-28">변수명</th>
              <th className="py-2.5 px-3 min-w-36">선택 화면 텍스트</th>
              <th className="py-2.5 px-3 w-24">참조 테이블</th>
              <th className="py-2.5 px-3 w-24">참조 필드</th>
              <th className="py-2.5 px-3 text-center w-16">필수(Obligatory)</th>
              <th className="py-2.5 px-3 w-24">기본값</th>
              <th className="py-2.5 px-3 w-24">메모리 ID</th>
              <th className="py-2.5 px-3 text-center w-20">순서/삭제</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
            {spec.selection_params.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-400 font-sans">
                  선택 조건이 없습니다. 위의 버튼을 눌러 파라미터를 추가하세요.
                </td>
              </tr>
            ) : (
              spec.selection_params.map((param, idx) => (
                <tr key={param.id} className="hover:bg-slate-50 transition-colors">
                  {/* Kind */}
                  <td className="py-2 px-3 text-center">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        param.kind === 'PARAMETER'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {param.kind === 'PARAMETER' ? 'PARAM' : 'S-OPT'}
                    </span>
                  </td>

                  {/* Name */}
                  <td className="py-1.5 px-3 font-bold text-slate-800">
                    <input
                      type="text"
                      value={param.name}
                      onChange={(e) =>
                        handleUpdate(param.id, { name: e.target.value })
                      }
                      onBlur={(e) =>
                        handleUpdate(param.id, { name: e.target.value.trim().toUpperCase() })
                      }
                      className="w-full bg-slate-50 border border-slate-200 px-2 py-1 rounded focus:bg-white focus:border-blue-500 uppercase"
                    />
                  </td>

                  {/* Text */}
                  <td className="py-1.5 px-3 font-sans">
                    <input
                      type="text"
                      value={param.text}
                      onChange={(e) => handleUpdate(param.id, { text: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 px-2 py-1 rounded focus:bg-white focus:border-blue-500 font-medium"
                    />
                  </td>

                  {/* Ref table */}
                  <td className="py-1.5 px-3">
                    <input
                      type="text"
                      value={param.ref_table || ''}
                      onChange={(e) =>
                        handleUpdate(param.id, { ref_table: e.target.value.toUpperCase() })
                      }
                      placeholder="VBAK"
                      className="w-full bg-slate-50 border border-slate-200 px-1.5 py-1 rounded focus:bg-white focus:border-blue-500 uppercase"
                    />
                  </td>

                  {/* Ref field */}
                  <td className="py-1.5 px-3">
                    <input
                      type="text"
                      value={param.ref_field || ''}
                      onChange={(e) =>
                        handleUpdate(param.id, { ref_field: e.target.value.toUpperCase() })
                      }
                      placeholder="VBELN"
                      className="w-full bg-slate-50 border border-slate-200 px-1.5 py-1 rounded focus:bg-white focus:border-blue-500 uppercase"
                    />
                  </td>

                  {/* Obligatory */}
                  <td className="py-1.5 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={param.obligatory}
                      onChange={(e) => handleUpdate(param.id, { obligatory: e.target.checked })}
                      className="w-4 h-4 accent-red-600 rounded cursor-pointer"
                    />
                  </td>

                  {/* Default val */}
                  <td className="py-1.5 px-3">
                    <input
                      type="text"
                      value={param.default_val || ''}
                      onChange={(e) => handleUpdate(param.id, { default_val: e.target.value })}
                      placeholder="1000"
                      className="w-full bg-slate-50 border border-slate-200 px-1.5 py-1 rounded focus:bg-white focus:border-blue-500"
                    />
                  </td>

                  {/* Memory ID */}
                  <td className="py-1.5 px-3">
                    <input
                      type="text"
                      value={param.memory_id || ''}
                      onChange={(e) =>
                        handleUpdate(param.id, { memory_id: e.target.value.toUpperCase() })
                      }
                      placeholder="VKO"
                      className="w-full bg-slate-50 border border-slate-200 px-1.5 py-1 rounded focus:bg-white focus:border-blue-500 uppercase"
                    />
                  </td>

                  {/* Actions */}
                  <td className="py-1.5 px-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleMove(idx, 'up')}
                        disabled={idx === 0}
                        title="위로"
                        className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-20"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMove(idx, 'down')}
                        disabled={idx === spec.selection_params.length - 1}
                        title="아래로"
                        className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-20"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(param.id)}
                        title="삭제"
                        className="p-1 text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
