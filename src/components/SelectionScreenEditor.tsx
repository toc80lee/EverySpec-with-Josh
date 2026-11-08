import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Sliders,
  Sparkles,
  X,
  Check,
  Search,
  FileSpreadsheet,
  Copy,
  ClipboardPaste,
  Grid,
} from 'lucide-react';
import { SelectionParameter, SelectionKind, ProgramSpec, SapDataType } from '../types/sap';
import { SapSearchHelpModal } from './SapSearchHelpModal';
import {
  exportSelectionParamsToTsv,
  copyTsvToClipboard,
  parseSpreadsheetText,
  CellRange,
  isCellInRange,
  extractCellRangeTsv,
  normalizeDataType,
  defaultLengthForType,
  isTruthy,
} from '../utils/spreadsheetClipboard';

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

  // Cell range selection state
  const [selectedRange, setSelectedRange] = useState<CellRange | null>(null);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const dragAnchorRef = React.useRef<{ row: number; col: number } | null>(null);

  React.useEffect(() => {
    const handleMouseUp = () => {
      setIsMouseDown(false);
    };
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const COL_COUNT = 9;

  const getSelectionCellValue = (rowIdx: number, colIdx: number): string => {
    const p = spec.selection_params[rowIdx];
    if (!p) return '';
    switch (colIdx) {
      case 0: return p.kind === 'PARAMETER' ? 'PARAM' : 'S-OPT';
      case 1: return p.name || '';
      case 2: return p.text || '';
      case 3: return p.datatype || 'CHAR';
      case 4: return String(p.length || 10);
      case 5: return p.ref_table || '';
      case 6: return p.ref_field || '';
      case 7: return p.obligatory ? 'X' : '';
      case 8: return p.default_val || '';
      default: return '';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
      const activeEl = document.activeElement;
      if (
        activeEl instanceof HTMLInputElement &&
        activeEl.selectionStart !== null &&
        activeEl.selectionEnd !== null &&
        activeEl.selectionStart !== activeEl.selectionEnd
      ) {
        return;
      }
      if (selectedRange) {
        e.preventDefault();
        const tsv = extractCellRangeTsv(selectedRange, getSelectionCellValue);
        if (tsv) {
          copyTsvToClipboard(tsv);
        }
      }
    }
  };

  const handleCellMouseDown = (rowIdx: number, colIdx: number) => {
    setIsMouseDown(true);
    dragAnchorRef.current = { row: rowIdx, col: colIdx };
    setSelectedRange({
      startRow: rowIdx,
      startCol: colIdx,
      endRow: rowIdx,
      endCol: colIdx,
    });
  };

  const handleCellMouseEnter = (rowIdx: number, colIdx: number) => {
    if (!isMouseDown || !dragAnchorRef.current) return;
    setSelectedRange({
      startRow: dragAnchorRef.current.row,
      startCol: dragAnchorRef.current.col,
      endRow: rowIdx,
      endCol: colIdx,
    });
  };

  // Direct paste into selected cells and expand rows if needed
  const handleTablePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text/plain');
    if (!text) return;

    const matrix = parseSpreadsheetText(text);
    if (matrix.length === 0) return;

    e.preventDefault();

    const startR = selectedRange
      ? Math.min(selectedRange.startRow, selectedRange.endRow)
      : 0;
    const startC = selectedRange
      ? Math.min(selectedRange.startCol, selectedRange.endCol)
      : (matrix[0].length === 1 ? 2 : 0); // Default to Screen Text if single col

    const pastedRowCount = matrix.length;
    const pastedColCount = Math.max(...matrix.map((r) => r.length));

    const updated = [...spec.selection_params];
    const neededTotal = startR + pastedRowCount;

    // Expand rows if needed!
    if (neededTotal > updated.length) {
      const rowsToAdd = neededTotal - updated.length;
      for (let i = 0; i < rowsToAdd; i++) {
        const nextIdx = updated.length + 1;
        const newParam: SelectionParameter = {
          id: `param-paste-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
          kind: 'PARAMETER',
          name: `P_PARAM${nextIdx}`,
          text: `Parameter ${nextIdx}`,
          datatype: 'CHAR',
          length: 10,
          obligatory: false,
          default_val: '',
        };
        updated.push(newParam);
      }
    }

    // Apply cell values
    matrix.forEach((rowVals, rOffset) => {
      const targetRowIdx = startR + rOffset;
      if (!updated[targetRowIdx]) return;

      const targetParam = { ...updated[targetRowIdx] };

      rowVals.forEach((val, cOffset) => {
        const targetColIdx = startC + cOffset;
        const trimmed = val.trim();

        switch (targetColIdx) {
          case 0: { // KIND
            const up = trimmed.toUpperCase();
            if (up.includes('SELECT') || up.includes('S-OPT') || up.startsWith('S_')) {
              targetParam.kind = 'SELECT_OPTION';
            } else {
              targetParam.kind = 'PARAMETER';
            }
            break;
          }
          case 1: // NAME
            if (trimmed) targetParam.name = trimmed.toUpperCase();
            break;
          case 2: // SCREEN TEXT
            targetParam.text = trimmed;
            break;
          case 3: // TYPE
            if (trimmed) {
              const dt = normalizeDataType(trimmed);
              targetParam.datatype = dt;
              if (!rowVals[cOffset + 1]) {
                targetParam.length = defaultLengthForType(dt);
              }
            }
            break;
          case 4: { // LENGTH
            const num = parseInt(trimmed, 10);
            if (!isNaN(num) && num > 0) targetParam.length = num;
            break;
          }
          case 5: // REF TABLE
            targetParam.ref_table = trimmed.toUpperCase();
            break;
          case 6: // REF FIELD
            targetParam.ref_field = trimmed.toUpperCase();
            break;
          case 7: // OBLIGATORY
            targetParam.obligatory = isTruthy(trimmed, false);
            break;
          case 8: // DEFAULT VALUE
            targetParam.default_val = trimmed;
            break;
        }
      });

      updated[targetRowIdx] = targetParam;
    });

    onChange(updated);

    setSelectedRange({
      startRow: startR,
      startCol: startC,
      endRow: startR + pastedRowCount - 1,
      endCol: Math.min(startC + pastedColCount - 1, COL_COUNT - 1),
    });
  };

  const handleCopyTable = async () => {
    const tsv = exportSelectionParamsToTsv(spec.selection_params);
    await copyTsvToClipboard(tsv);
  };

  const handleCellKeyDown = (e: React.KeyboardEvent, rowIndex: number, colKey: string) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextInput = document.querySelector(`[data-cell="${rowIndex + 1}-${colKey}"]`) as HTMLElement;
      if (nextInput) nextInput.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevInput = document.querySelector(`[data-cell="${rowIndex - 1}-${colKey}"]`) as HTMLElement;
      if (prevInput) prevInput.focus();
    }
  };

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
    <div
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="space-y-4 font-sans focus:outline-none"
    >
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

      {/* Spreadsheet Quick Actions Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs shadow-2xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => handleOpenAdd('PARAMETER')}
            title="+ Add PARAM (Parameters - Single Value)"
            aria-label="Add PARAM"
            className="p-1.5 text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-md transition-colors shadow-2xs cursor-pointer flex items-center justify-center"
          >
            <Plus className="w-4 h-4 text-amber-600" />
          </button>
          <button
            type="button"
            onClick={() => handleOpenAdd('SELECT_OPTION')}
            title="+ Add S-OPT (Select-Options - Range Selection)"
            aria-label="Add S-OPT"
            className="p-1.5 text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-300 rounded-md transition-colors shadow-2xs cursor-pointer flex items-center justify-center"
          >
            <Sliders className="w-4 h-4 text-blue-600" />
          </button>
          <button
            type="button"
            onClick={handleCopyTable}
            disabled={spec.selection_params.length === 0}
            className="p-1.5 text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-md transition-colors shadow-2xs cursor-pointer disabled:opacity-40 flex items-center justify-center"
            title="Copy Table to Excel"
            aria-label="Copy Table to Excel"
          >
            <Copy className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Spreadsheet Hint */}
        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
          <span className="bg-white px-2 py-0.5 rounded border border-slate-200">
            <strong>Spreadsheet Mode:</strong> Drag to select cells · Ctrl+C copy · Ctrl+V paste
          </span>
          <span className="font-bold text-slate-700">
            {spec.selection_params.length} rows
          </span>
        </div>
      </div>

      {/* Google Sheets Styled Parameters Table */}
      <div
        onPaste={handleTablePaste}
        className="border border-slate-300 rounded-lg overflow-x-auto bg-white shadow-xs focus:outline-none select-none"
      >
        <table className="w-full text-xs text-left border-collapse font-sans">
          {/* Spreadsheet Header: Column Letters & Field Names */}
          <thead className="bg-slate-100 text-slate-700 font-semibold text-[11px] select-none border-b border-slate-300">
            <tr>
              {/* Row index corner cell */}
              <th className="py-2 px-2 text-center w-9 bg-slate-200 border-r border-slate-300 text-slate-500 font-mono text-[10px]">
                fx
              </th>
              <th className="py-1.5 px-2 w-16 text-center border-r border-slate-200">
                <div className="text-[9px] text-slate-400 font-mono">A</div>
                <div>KIND</div>
              </th>
              <th className="py-1.5 px-2 min-w-32 border-r border-slate-200 font-mono">
                <div className="text-[9px] text-slate-400 font-mono">B</div>
                <div>NAME (FIELD)</div>
              </th>
              <th className="py-1.5 px-2 min-w-44 border-r border-slate-200">
                <div className="text-[9px] text-slate-400 font-mono">C</div>
                <div>SCREEN TEXT (LABEL)</div>
              </th>
              <th className="py-1.5 px-2 w-24 text-center border-r border-slate-200">
                <div className="text-[9px] text-slate-400 font-mono">D</div>
                <div>TYPE</div>
              </th>
              <th className="py-1.5 px-2 w-16 text-center border-r border-slate-200">
                <div className="text-[9px] text-slate-400 font-mono">E</div>
                <div>LENGTH</div>
              </th>
              <th className="py-1.5 px-2 w-28 border-r border-slate-200">
                <div className="text-[9px] text-slate-400 font-mono">F</div>
                <div>REF TABLE</div>
              </th>
              <th className="py-1.5 px-2 w-28 border-r border-slate-200">
                <div className="text-[9px] text-slate-400 font-mono">G</div>
                <div>REF FIELD</div>
              </th>
              <th className="py-1.5 px-2 text-center w-16 border-r border-slate-200">
                <div className="text-[9px] text-slate-400 font-mono">H</div>
                <div>REQUIRED</div>
              </th>
              <th className="py-1.5 px-2 min-w-28 border-r border-slate-200">
                <div className="text-[9px] text-slate-400 font-mono">I</div>
                <div>DEFAULT VALUE</div>
              </th>
              <th className="py-1.5 px-2 text-center w-24">
                <div className="text-[9px] text-slate-400 font-mono">ACTIONS</div>
                <div>ORDER / DEL</div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
            {spec.selection_params.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-10 text-center text-slate-400 font-sans">
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <p className="font-medium">No selection parameters defined.</p>
                    <p className="text-xs text-slate-400">
                      Copy rows from Excel and paste directly with <strong>Ctrl+V</strong> (lines will be created automatically).
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              spec.selection_params.map((param, idx) => {
                const isSelectedRow =
                  selectedRange &&
                  idx >= Math.min(selectedRange.startRow, selectedRange.endRow) &&
                  idx <= Math.max(selectedRange.startRow, selectedRange.endRow);

                return (
                  <tr key={param.id} className="hover:bg-blue-50/30 transition-colors">
                    {/* Row index header (like Google Sheets) */}
                    <td
                      onClick={() => {
                        setSelectedRange({
                          startRow: idx,
                          startCol: 0,
                          endRow: idx,
                          endCol: COL_COUNT - 1,
                        });
                      }}
                      className={`py-1 px-1 text-center font-mono font-bold text-[10px] border-r border-slate-300 select-none cursor-pointer ${
                        isSelectedRow ? 'bg-blue-200 text-blue-900' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {idx + 1}
                    </td>

                    {/* Col A: Kind */}
                    <td
                      onMouseDown={() => handleCellMouseDown(idx, 0)}
                      onMouseEnter={() => handleCellMouseEnter(idx, 0)}
                      className={`p-0 border-r border-slate-200 text-center ${
                        isCellInRange(selectedRange, idx, 0)
                          ? 'bg-blue-100 ring-1 ring-blue-500'
                          : ''
                      }`}
                    >
                      <select
                        value={param.kind}
                        onChange={(e) =>
                          handleUpdate(param.id, { kind: e.target.value as SelectionKind })
                        }
                        data-cell={`${idx}-kind`}
                        onFocus={() => {
                          if (!selectedRange) {
                            setSelectedRange({ startRow: idx, startCol: 0, endRow: idx, endCol: 0 });
                          }
                        }}
                        onKeyDown={(e) => handleCellKeyDown(e, idx, 'kind')}
                        className={`w-full h-8 px-1 text-center font-bold text-[10px] focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white cursor-pointer ${
                          param.kind === 'PARAMETER'
                            ? 'bg-amber-50 text-amber-900'
                            : 'bg-blue-50 text-blue-900'
                        }`}
                      >
                        <option value="PARAMETER">PARAM</option>
                        <option value="SELECT_OPTION">S-OPT</option>
                      </select>
                    </td>

                    {/* Col B: Name (Field) */}
                    <td
                      onMouseDown={() => handleCellMouseDown(idx, 1)}
                      onMouseEnter={() => handleCellMouseEnter(idx, 1)}
                      className={`p-0 border-r border-slate-200 ${
                        isCellInRange(selectedRange, idx, 1)
                          ? 'bg-blue-100 ring-1 ring-blue-500'
                          : ''
                      }`}
                    >
                      <input
                        type="text"
                        value={param.name}
                        data-cell={`${idx}-name`}
                        onFocus={() => {
                          if (!selectedRange) {
                            setSelectedRange({ startRow: idx, startCol: 1, endRow: idx, endCol: 1 });
                          }
                        }}
                        onKeyDown={(e) => handleCellKeyDown(e, idx, 'name')}
                        onChange={(e) => handleUpdate(param.id, { name: e.target.value })}
                        onBlur={(e) =>
                          handleUpdate(param.id, { name: e.target.value.trim().toUpperCase() })
                        }
                        className="w-full h-8 px-2 bg-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 uppercase font-mono font-bold text-blue-950"
                      />
                    </td>

                    {/* Col C: Screen Text (Label) */}
                    <td
                      onMouseDown={() => handleCellMouseDown(idx, 2)}
                      onMouseEnter={() => handleCellMouseEnter(idx, 2)}
                      className={`p-0 border-r border-slate-200 font-sans ${
                        isCellInRange(selectedRange, idx, 2)
                          ? 'bg-blue-100 ring-1 ring-blue-500'
                          : ''
                      }`}
                    >
                      <input
                        type="text"
                        value={param.text}
                        data-cell={`${idx}-text`}
                        onFocus={() => {
                          if (!selectedRange) {
                            setSelectedRange({ startRow: idx, startCol: 2, endRow: idx, endCol: 2 });
                          }
                        }}
                        onKeyDown={(e) => handleCellKeyDown(e, idx, 'text')}
                        onChange={(e) => handleUpdate(param.id, { text: e.target.value })}
                        className="w-full h-8 px-2 bg-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium text-slate-800"
                      />
                    </td>

                    {/* Col D: Data Type */}
                    <td
                      onMouseDown={() => handleCellMouseDown(idx, 3)}
                      onMouseEnter={() => handleCellMouseEnter(idx, 3)}
                      className={`p-0 border-r border-slate-200 text-center ${
                        isCellInRange(selectedRange, idx, 3)
                          ? 'bg-blue-100 ring-1 ring-blue-500'
                          : ''
                      }`}
                    >
                      <select
                        value={param.datatype || 'CHAR'}
                        data-cell={`${idx}-datatype`}
                        onFocus={() => {
                          if (!selectedRange) {
                            setSelectedRange({ startRow: idx, startCol: 3, endRow: idx, endCol: 3 });
                          }
                        }}
                        onKeyDown={(e) => handleCellKeyDown(e, idx, 'datatype')}
                        onChange={(e) =>
                          handleUpdate(param.id, { datatype: e.target.value as SapDataType })
                        }
                        className="w-full h-8 px-1 bg-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono text-[11px] text-slate-800 text-center cursor-pointer"
                      >
                        {SAP_DATA_TYPES.map((dt) => (
                          <option key={dt.type} value={dt.type}>
                            {dt.type}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Col E: Length */}
                    <td
                      onMouseDown={() => handleCellMouseDown(idx, 4)}
                      onMouseEnter={() => handleCellMouseEnter(idx, 4)}
                      className={`p-0 border-r border-slate-200 text-center ${
                        isCellInRange(selectedRange, idx, 4)
                          ? 'bg-blue-100 ring-1 ring-blue-500'
                          : ''
                      }`}
                    >
                      <input
                        type="number"
                        min={1}
                        max={255}
                        value={param.length || 10}
                        data-cell={`${idx}-length`}
                        onFocus={() => {
                          if (!selectedRange) {
                            setSelectedRange({ startRow: idx, startCol: 4, endRow: idx, endCol: 4 });
                          }
                        }}
                        onKeyDown={(e) => handleCellKeyDown(e, idx, 'length')}
                        onChange={(e) =>
                          handleUpdate(param.id, {
                            length: Math.max(1, parseInt(e.target.value) || 1),
                          })
                        }
                        className="w-full h-8 px-1 bg-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono text-[11px] text-center"
                      />
                    </td>

                    {/* Col F: Ref Table */}
                    <td
                      onMouseDown={() => handleCellMouseDown(idx, 5)}
                      onMouseEnter={() => handleCellMouseEnter(idx, 5)}
                      className={`p-0 border-r border-slate-200 relative ${
                        isCellInRange(selectedRange, idx, 5)
                          ? 'bg-blue-100 ring-1 ring-blue-500'
                          : ''
                      }`}
                    >
                      <div className="flex items-center h-8">
                        <input
                          type="text"
                          value={param.ref_table || ''}
                          data-cell={`${idx}-ref_table`}
                          onFocus={() => {
                            if (!selectedRange) {
                              setSelectedRange({ startRow: idx, startCol: 5, endRow: idx, endCol: 5 });
                            }
                          }}
                          onKeyDown={(e) => handleCellKeyDown(e, idx, 'ref_table')}
                          onChange={(e) =>
                            handleUpdate(param.id, { ref_table: e.target.value.toUpperCase() })
                          }
                          placeholder="VBAK"
                          className="w-full h-full px-2 pr-6 bg-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 uppercase text-slate-800"
                        />
                        <button
                          type="button"
                          onClick={() => setSearchHelpTarget({ type: 'row', paramId: param.id })}
                          title="SAP Search Help (F4)"
                          className="absolute right-1 text-slate-400 hover:text-blue-600 p-1 cursor-pointer"
                        >
                          <Search className="w-3 h-3" />
                        </button>
                      </div>
                    </td>

                    {/* Col G: Ref Field */}
                    <td
                      onMouseDown={() => handleCellMouseDown(idx, 6)}
                      onMouseEnter={() => handleCellMouseEnter(idx, 6)}
                      className={`p-0 border-r border-slate-200 ${
                        isCellInRange(selectedRange, idx, 6)
                          ? 'bg-blue-100 ring-1 ring-blue-500'
                          : ''
                      }`}
                    >
                      <input
                        type="text"
                        value={param.ref_field || ''}
                        data-cell={`${idx}-ref_field`}
                        onFocus={() => {
                          if (!selectedRange) {
                            setSelectedRange({ startRow: idx, startCol: 6, endRow: idx, endCol: 6 });
                          }
                        }}
                        onKeyDown={(e) => handleCellKeyDown(e, idx, 'ref_field')}
                        onChange={(e) =>
                          handleUpdate(param.id, { ref_field: e.target.value.toUpperCase() })
                        }
                        placeholder="VBELN"
                        className="w-full h-8 px-2 bg-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 uppercase text-slate-800"
                      />
                    </td>

                    {/* Col H: Obligatory */}
                    <td
                      onMouseDown={() => handleCellMouseDown(idx, 7)}
                      onMouseEnter={() => handleCellMouseEnter(idx, 7)}
                      className={`p-0 border-r border-slate-200 text-center ${
                        isCellInRange(selectedRange, idx, 7)
                          ? 'bg-blue-100 ring-1 ring-blue-500'
                          : ''
                      }`}
                    >
                      <div className="flex items-center justify-center h-8">
                        <input
                          type="checkbox"
                          checked={param.obligatory}
                          data-cell={`${idx}-obligatory`}
                          onChange={(e) => handleUpdate(param.id, { obligatory: e.target.checked })}
                          className="w-4 h-4 accent-red-600 rounded cursor-pointer"
                        />
                      </div>
                    </td>

                    {/* Col I: Default Value */}
                    <td
                      onMouseDown={() => handleCellMouseDown(idx, 8)}
                      onMouseEnter={() => handleCellMouseEnter(idx, 8)}
                      className={`p-0 border-r border-slate-200 font-sans ${
                        isCellInRange(selectedRange, idx, 8)
                          ? 'bg-blue-100 ring-1 ring-blue-500'
                          : ''
                      }`}
                    >
                      <input
                        type="text"
                        value={param.default_val || ''}
                        data-cell={`${idx}-default_val`}
                        onFocus={() => {
                          if (!selectedRange) {
                            setSelectedRange({ startRow: idx, startCol: 8, endRow: idx, endCol: 8 });
                          }
                        }}
                        onKeyDown={(e) => handleCellKeyDown(e, idx, 'default_val')}
                        onChange={(e) => handleUpdate(param.id, { default_val: e.target.value })}
                        placeholder="1000"
                        className="w-full h-8 px-2 bg-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-800"
                      />
                    </td>

                    {/* Col J: Order & Delete Actions */}
                    <td className="py-1 px-1 text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => handleMove(idx, 'up')}
                          disabled={idx === 0}
                          title="Move Up"
                          className="p-1 text-slate-400 hover:text-blue-700 disabled:opacity-20 cursor-pointer"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMove(idx, 'down')}
                          disabled={idx === spec.selection_params.length - 1}
                          title="Move Down"
                          className="p-1 text-slate-400 hover:text-blue-700 disabled:opacity-20 cursor-pointer"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(param.id)}
                          title="Delete Row"
                          className="p-1 text-slate-400 hover:text-red-600 cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
