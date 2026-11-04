import React, { useState } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, Sliders, Sparkles, X, Check, Search } from 'lucide-react';
import { SelectionParameter, SelectionKind, ProgramSpec, SapDataType } from '../types/sap';
import { SapSearchHelpModal } from './SapSearchHelpModal';

interface SelectionScreenEditorProps {
  spec: ProgramSpec;
  onChange: (updatedParams: SelectionParameter[]) => void;
  onAddParam?: (paramData: {
    kind: SelectionKind;
    name: string;
    datatype: SapDataType;
    length: number;
    text?: string;
    ref_table?: string;
    ref_field?: string;
    obligatory?: boolean;
    default_val?: string;
  }) => void;
}

const SAP_DATA_TYPES: { type: SapDataType; label: string; defaultLen: number }[] = [
  { type: 'CHAR', label: 'CHAR (Character String)', defaultLen: 10 },
  { type: 'NUMC', label: 'NUMC (Numeric Text)', defaultLen: 10 },
  { type: 'DATS', label: 'DATS (Date YYYYMMDD)', defaultLen: 8 },
  { type: 'TIMS', label: 'TIMS (Time HHMMSS)', defaultLen: 6 },
  { type: 'CURR', label: 'CURR (Currency Amount)', defaultLen: 15 },
  { type: 'DEC', label: 'DEC (Decimal Number)', defaultLen: 13 },
  { type: 'INT4', label: 'INT4 (4-byte Integer)', defaultLen: 10 },
  { type: 'UNIT', label: 'UNIT (Unit of Measure)', defaultLen: 3 },
  { type: 'STRING', label: 'STRING (Variable Length)', defaultLen: 255 },
];

export const SelectionScreenEditor: React.FC<SelectionScreenEditorProps> = ({
  spec,
  onChange,
  onAddParam,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchHelpTarget, setSearchHelpTarget] = useState<{
    type: 'modal' | 'row';
    paramId?: string;
  } | null>(null);

  const [addForm, setAddForm] = useState<{
    kind: SelectionKind;
    name: string;
    datatype: SapDataType;
    length: number;
    text: string;
    ref_table: string;
    ref_field: string;
    obligatory: boolean;
    default_val: string;
  }>({
    kind: 'PARAMETER',
    name: 'P_BUKRS',
    datatype: 'CHAR',
    length: 4,
    text: 'Company Code',
    ref_table: 'T001',
    ref_field: 'BUKRS',
    obligatory: true,
    default_val: '1000',
  });

  const handleOpenAdd = (kind: SelectionKind) => {
    const nextIdx = spec.selection_params.length + 1;
    const isParam = kind === 'PARAMETER';
    setAddForm({
      kind,
      name: isParam ? `P_FIELD${nextIdx}` : `S_FIELD${nextIdx}`,
      datatype: 'CHAR',
      length: 10,
      text: isParam ? `Parameter Item ${nextIdx}` : `Selection Range ${nextIdx}`,
      ref_table: '',
      ref_field: '',
      obligatory: false,
      default_val: '',
    });
    setShowAddModal(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onAddParam) {
      onAddParam(addForm);
    } else {
      const nextIdx = spec.selection_params.length + 1;
      const newParam: SelectionParameter = {
        id: `param-${Date.now()}`,
        kind: addForm.kind,
        name: addForm.name.trim().toUpperCase() || (addForm.kind === 'PARAMETER' ? `P_FLD${nextIdx}` : `S_FLD${nextIdx}`),
        text: addForm.text.trim() || `Field ${nextIdx}`,
        datatype: addForm.datatype,
        length: Number(addForm.length) > 0 ? Number(addForm.length) : 10,
        ref_table: addForm.ref_table.trim().toUpperCase() || '',
        ref_field: addForm.ref_field.trim().toUpperCase() || '',
        obligatory: addForm.obligatory,
        default_val: addForm.default_val.trim(),
        low: '',
        high: '',
        sign: 'I',
        option: 'EQ',
      };
      onChange([...spec.selection_params, newParam]);
    }
    setShowAddModal(false);
  };

  const handleDelete = (id: string) => {
    onChange(spec.selection_params.filter((p) => p.id !== id));
  };

  const handleUpdate = (id: string, patch: Partial<SelectionParameter>) => {
    onChange(spec.selection_params.map((p) => (p.id === id ? { ...p, ...patch } : p)));
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

  const handleApplySearchHelp = (selected: {
    table: string;
    field: string;
    label: string;
    datatype: SapDataType;
    length: number;
    description: string;
  }) => {
    if (!searchHelpTarget) return;

    if (searchHelpTarget.type === 'modal') {
      setAddForm((prev) => ({
        ...prev,
        ref_table: selected.table,
        ref_field: selected.field,
        datatype: selected.datatype,
        length: selected.length,
        text: selected.label,
        name: prev.kind === 'PARAMETER' ? `P_${selected.field}` : `S_${selected.field}`,
      }));
    } else if (searchHelpTarget.type === 'row' && searchHelpTarget.paramId) {
      handleUpdate(searchHelpTarget.paramId, {
        ref_table: selected.table,
        ref_field: selected.field,
        datatype: selected.datatype,
        length: selected.length,
      });
    }

    setSearchHelpTarget(null);
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Search Help (F4) Modal */}
      <SapSearchHelpModal
        isOpen={searchHelpTarget !== null}
        onClose={() => setSearchHelpTarget(null)}
        onSelect={handleApplySearchHelp}
      />

      {/* Dynamic Add Field Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-400" />
                <h4 className="text-sm font-bold">
                  Add {addForm.kind === 'PARAMETER' ? 'Parameters (Single Value)' : 'Select-options (Range)'} Field
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-5 space-y-4 text-xs">
              {/* Kind Toggle */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kind</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAddForm((f) => ({
                        ...f,
                        kind: 'PARAMETER',
                        name: f.name.startsWith('S_') ? f.name.replace(/^S_/, 'P_') : f.name,
                      }));
                    }}
                    className={`py-1.5 px-3 rounded border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                      addForm.kind === 'PARAMETER'
                        ? 'bg-amber-100 border-amber-400 text-amber-900 ring-1 ring-amber-400'
                        : 'bg-slate-50 border-slate-300 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span>PARAMETERS (Single Input)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAddForm((f) => ({
                        ...f,
                        kind: 'SELECT_OPTION',
                        name: f.name.startsWith('P_') ? f.name.replace(/^P_/, 'S_') : f.name,
                      }));
                    }}
                    className={`py-1.5 px-3 rounded border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                      addForm.kind === 'SELECT_OPTION'
                        ? 'bg-blue-100 border-blue-400 text-blue-900 ring-1 ring-blue-400'
                        : 'bg-slate-50 border-slate-300 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span>SELECT-OPTIONS (Range Input)</span>
                  </button>
                </div>
              </div>

              {/* Field Name & Data Type & Length */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Field Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={addForm.name}
                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value.toUpperCase() })}
                    placeholder={addForm.kind === 'PARAMETER' ? 'P_BUKRS' : 'S_VBELN'}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-mono font-bold text-blue-950 uppercase focus:bg-white focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Data Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={addForm.datatype}
                    onChange={(e) => {
                      const dt = e.target.value as SapDataType;
                      const found = SAP_DATA_TYPES.find((s) => s.type === dt);
                      setAddForm({
                        ...addForm,
                        datatype: dt,
                        length: found ? found.defaultLen : addForm.length,
                      });
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1.5 font-mono text-slate-800 focus:bg-white focus:border-blue-500"
                  >
                    {SAP_DATA_TYPES.map((dt) => (
                      <option key={dt.type} value={dt.type}>
                        {dt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Length <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={255}
                    required
                    value={addForm.length}
                    onChange={(e) =>
                      setAddForm({ ...addForm, length: Math.max(1, parseInt(e.target.value) || 1) })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-mono text-center text-slate-800 focus:bg-white focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Screen Text */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Screen Text (Label) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={addForm.text}
                  onChange={(e) => setAddForm({ ...addForm, text: e.target.value })}
                  placeholder="e.g., Company Code, Document Date, Sales Order"
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 focus:bg-white focus:border-blue-500"
                />
              </div>

              {/* Reference Table & Field with Search Help Button */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-700">Reference Table & Field</span>
                  <button
                    type="button"
                    onClick={() => setSearchHelpTarget({ type: 'modal' })}
                    className="text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Search className="w-3 h-3 text-blue-600" />
                    <span>Search Help (F4)</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      type="text"
                      value={addForm.ref_table}
                      onChange={(e) =>
                        setAddForm({ ...addForm, ref_table: e.target.value.toUpperCase() })
                      }
                      placeholder="Ref Table (e.g., VBAK)"
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-mono uppercase text-slate-800 focus:bg-white focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={addForm.ref_field}
                      onChange={(e) =>
                        setAddForm({ ...addForm, ref_field: e.target.value.toUpperCase() })
                      }
                      placeholder="Ref Field (e.g., VBELN)"
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-mono uppercase text-slate-800 focus:bg-white focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Obligatory & Default Val */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Default Value
                  </label>
                  <input
                    type="text"
                    value={addForm.default_val}
                    onChange={(e) => setAddForm({ ...addForm, default_val: e.target.value })}
                    placeholder="e.g., 1000, 2026.01.01"
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 focus:bg-white focus:border-blue-500"
                  />
                </div>
                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-800 font-semibold select-none">
                    <input
                      type="checkbox"
                      checked={addForm.obligatory}
                      onChange={(e) => setAddForm({ ...addForm, obligatory: e.target.checked })}
                      className="w-4 h-4 accent-red-600 rounded"
                    />
                    <span>OBLIGATORY (Required)</span>
                  </label>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Add Field</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Parameters Table */}
      <div className="border border-slate-200 rounded-lg overflow-x-auto bg-white shadow-xs">
        <table className="w-full text-xs text-left border-collapse">
          <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-2.5 px-2.5 w-14 text-center">Kind</th>
              <th className="py-2.5 px-2.5 w-28">Name (FIELD)</th>
              <th className="py-2.5 px-2.5 min-w-36">Screen Text (Label)</th>
              <th className="py-2.5 px-2 w-20 text-center">Type</th>
              <th className="py-2.5 px-2 w-14 text-center">Length</th>
              <th className="py-2.5 px-2.5 w-28">Ref Table</th>
              <th className="py-2.5 px-2.5 w-28">Ref Field</th>
              <th className="py-2.5 px-2 text-center w-14">Obligatory</th>
              <th className="py-2.5 px-2.5 w-24">Default Value</th>
              <th className="py-2.5 px-2 text-center w-20">Order / Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
            {spec.selection_params.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-8 text-center text-slate-400 font-sans">
                  No selection parameters defined. Click 'Parameters' or 'Select-options' to add fields.
                </td>
              </tr>
            ) : (
              spec.selection_params.map((param, idx) => (
                <tr key={param.id} className="hover:bg-slate-50 transition-colors">
                  {/* Kind */}
                  <td className="py-2 px-2 text-center">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        param.kind === 'PARAMETER'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-blue-100 text-blue-900 border border-blue-300'
                      }`}
                    >
                      {param.kind === 'PARAMETER' ? 'PARAM' : 'S-OPT'}
                    </span>
                  </td>

                  {/* Name */}
                  <td className="py-1.5 px-2 font-bold text-slate-800">
                    <input
                      type="text"
                      value={param.name}
                      onChange={(e) => handleUpdate(param.id, { name: e.target.value })}
                      onBlur={(e) =>
                        handleUpdate(param.id, { name: e.target.value.trim().toUpperCase() })
                      }
                      className="w-full bg-slate-50 border border-slate-200 px-2 py-1 rounded focus:bg-white focus:border-blue-500 uppercase font-mono font-bold text-blue-900"
                    />
                  </td>

                  {/* Text */}
                  <td className="py-1.5 px-2 font-sans">
                    <input
                      type="text"
                      value={param.text}
                      onChange={(e) => handleUpdate(param.id, { text: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 px-2 py-1 rounded focus:bg-white focus:border-blue-500 font-medium text-slate-800"
                    />
                  </td>

                  {/* Data Type */}
                  <td className="py-1.5 px-1.5 text-center">
                    <select
                      value={param.datatype || 'CHAR'}
                      onChange={(e) =>
                        handleUpdate(param.id, { datatype: e.target.value as SapDataType })
                      }
                      className="w-full bg-slate-50 border border-slate-200 px-1 py-1 rounded font-mono text-[11px] text-slate-800 focus:bg-white focus:border-blue-500 text-center"
                    >
                      {SAP_DATA_TYPES.map((dt) => (
                        <option key={dt.type} value={dt.type}>
                          {dt.type}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Length */}
                  <td className="py-1.5 px-1.5 text-center">
                    <input
                      type="number"
                      min={1}
                      max={255}
                      value={param.length || 10}
                      onChange={(e) =>
                        handleUpdate(param.id, {
                          length: Math.max(1, parseInt(e.target.value) || 1),
                        })
                      }
                      className="w-full bg-slate-50 border border-slate-200 px-1 py-1 rounded font-mono text-[11px] text-center focus:bg-white focus:border-blue-500"
                    />
                  </td>

                  {/* Ref table with F4 helper */}
                  <td className="py-1.5 px-2">
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        value={param.ref_table || ''}
                        onChange={(e) =>
                          handleUpdate(param.id, { ref_table: e.target.value.toUpperCase() })
                        }
                        placeholder="VBAK"
                        className="w-full bg-slate-50 border border-slate-200 px-1.5 py-1 pr-6 rounded focus:bg-white focus:border-blue-500 uppercase"
                      />
                      <button
                        type="button"
                        onClick={() => setSearchHelpTarget({ type: 'row', paramId: param.id })}
                        title="SAP Search Help (F4)"
                        className="absolute right-1 text-slate-400 hover:text-blue-600 p-0.5"
                      >
                        <Search className="w-3 h-3" />
                      </button>
                    </div>
                  </td>

                  {/* Ref field */}
                  <td className="py-1.5 px-2">
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
                  <td className="py-1.5 px-2 text-center">
                    <input
                      type="checkbox"
                      checked={param.obligatory}
                      onChange={(e) => handleUpdate(param.id, { obligatory: e.target.checked })}
                      className="w-4 h-4 accent-red-600 rounded cursor-pointer"
                    />
                  </td>

                  {/* Default val */}
                  <td className="py-1.5 px-2">
                    <input
                      type="text"
                      value={param.default_val || ''}
                      onChange={(e) => handleUpdate(param.id, { default_val: e.target.value })}
                      placeholder="1000"
                      className="w-full bg-slate-50 border border-slate-200 px-1.5 py-1 rounded focus:bg-white focus:border-blue-500"
                    />
                  </td>

                  {/* Actions */}
                  <td className="py-1.5 px-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleMove(idx, 'up')}
                        disabled={idx === 0}
                        title="Move Up"
                        className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-20 cursor-pointer"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMove(idx, 'down')}
                        disabled={idx === spec.selection_params.length - 1}
                        title="Move Down"
                        className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-20 cursor-pointer"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(param.id)}
                        title="Delete"
                        className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
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
