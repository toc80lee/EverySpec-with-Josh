import React, { useState, useRef, useEffect } from 'react';
import {
  Trash2,
  ArrowUp,
  ArrowDown,
  GripVertical,
  ArrowUpToLine,
  ArrowDownToLine,
  FileSpreadsheet,
  Copy,
} from 'lucide-react';
import { AlvField, ProgramSpec } from '../types/sap';
import {
  exportFieldCatalogToTsv,
  copyTsvToClipboard,
  parseSpreadsheetText,
  CellRange,
  isCellInRange,
  extractCellRangeTsv,
  isTruthy,
} from '../utils/spreadsheetClipboard';

interface AlvSortEditorProps {
  spec: ProgramSpec;
  onChange: (updatedCatalog: AlvField[], updatedMockRows?: Record<string, any>[]) => void;
  onReorder?: (fromIndex: number, toIndex: number) => void;
}

export const AlvSortEditor: React.FC<AlvSortEditorProps> = ({
  spec,
  onChange,
  onReorder,
}) => {
  // Cell range selection state
  const [selectedRange, setSelectedRange] = useState<CellRange | null>(null);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const dragAnchorRef = useRef<{ row: number; col: number } | null>(null);

  useEffect(() => {
    const handleMouseUp = () => {
      setIsMouseDown(false);
    };
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  // Columns for Sort view:
  // 0: ENABLE
  // 1: POS
  // 2: FIELDNAME
  // 3: COLTEXT
  const SORT_COL_COUNT = 4;

  const getSortCellValue = (rowIdx: number, colIdx: number): string => {
    const field = spec.field_catalog[rowIdx];
    if (!field) return '';
    switch (colIdx) {
      case 0: return field.sort_enable ? 'X' : '';
      case 1: return String(field.col_pos);
      case 2: return field.fieldname || '';
      case 3: return field.coltext || '';
      default: return '';
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

  // Keyboard shortcut listener for Ctrl+C (Copy selected cells as TSV)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
      // If user is selecting text in an input, let default copy happen
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
        const tsv = extractCellRangeTsv(selectedRange, getSortCellValue);
        if (tsv) {
          copyTsvToClipboard(tsv);
        }
      }
    }
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
      : (matrix[0].length === 1 ? 1 : 0);

    const pastedRowCount = matrix.length;
    const pastedColCount = Math.max(...matrix.map((r) => r.length));

    const updated = [...spec.field_catalog];
    const neededTotal = startR + pastedRowCount;

    if (neededTotal > updated.length) {
      const rowsToAdd = neededTotal - updated.length;
      for (let i = 0; i < rowsToAdd; i++) {
        const nextPos = updated.length + 1;
        const newF: AlvField = {
          id: `fld-paste-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
          col_pos: nextPos,
          fieldname: `FIELD_${nextPos}`,
          coltext: `Column ${nextPos}`,
          datatype: 'CHAR',
          outputlen: 10,
          just: 'C',
          key: false,
          hotspot: false,
          checkbox: false,
          edit: false,
          do_sum: false,
          emphasize: '',
          ref_table: '',
          ref_field: '',
          drilldown_tcode: '',
        };
        updated.push(newF);
      }
    }

    matrix.forEach((rowVals, rOffset) => {
      const targetRowIdx = startR + rOffset;
      if (!updated[targetRowIdx]) return;

      const targetField = { ...updated[targetRowIdx] };

      // Prevent editing ZICON
      if (targetField.fieldname === 'ZICON') {
        targetField.coltext = 'Status';
        targetField.key = true;
        updated[targetRowIdx] = targetField;
        return;
      }

      rowVals.forEach((val, cOffset) => {
        const targetColIdx = startC + cOffset;
        const trimmed = val.trim();

        switch (targetColIdx) {
          case 0:
            targetField.sort_enable = isTruthy(trimmed);
            break;
          case 1:
            // POS (order position)
            break;
          case 2:
            if (trimmed) targetField.fieldname = trimmed.toUpperCase();
            break;
          case 3:
            targetField.coltext = trimmed;
            break;
        }
      });

      updated[targetRowIdx] = targetField;
    });

    const reindexed = updated.map((f, idx) => ({ ...f, col_pos: idx + 1 }));
    onChange(reindexed);

    setSelectedRange({
      startRow: startR,
      startCol: startC,
      endRow: startR + pastedRowCount - 1,
      endCol: Math.min(startC + pastedColCount - 1, SORT_COL_COUNT - 1),
    });
  };

  const handleCopyTable = async () => {
    const lines = ['ENABLE\tPOS\tFIELDNAME\tCOLTEXT'];
    spec.field_catalog.forEach((f) => {
      lines.push(`${f.sort_enable ? 'X' : ''}\t${f.col_pos}\t${f.fieldname}\t${f.coltext}`);
    });
    await copyTsvToClipboard(lines.join('\n'));
  };

  const handleCellKeyDown = (e: React.KeyboardEvent, rowIndex: number, colKey: string) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextInput = document.querySelector(`[data-sortcell="${rowIndex + 1}-${colKey}"]`) as HTMLElement;
      if (nextInput) nextInput.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevInput = document.querySelector(`[data-sortcell="${rowIndex - 1}-${colKey}"]`) as HTMLElement;
      if (prevInput) prevInput.focus();
    }
  };

  // Drag and Drop States
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dragPosition, setDragPosition] = useState<'top' | 'bottom' | null>(null);

  const handleReorder = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || toIndex < 0 || toIndex >= spec.field_catalog.length) return;

    if (onReorder) {
      onReorder(fromIndex, toIndex);
    } else {
      const list = [...spec.field_catalog];
      const [movedItem] = list.splice(fromIndex, 1);
      list.splice(toIndex, 0, movedItem);

      const renumbered = list.map((field, idx) => ({
        ...field,
        col_pos: idx + 1,
      }));

      onChange(renumbered);
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIndex === null || draggedIndex === index) {
      setDragOverIndex(null);
      setDragPosition(null);
      return;
    }

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const pos: 'top' | 'bottom' = e.clientY < midY ? 'top' : 'bottom';

    setDragOverIndex(index);
    setDragPosition(pos);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      setDragPosition(null);
      return;
    }

    const pos = dragPosition || 'top';
    const targetSlot = pos === 'bottom' ? targetIndex + 1 : targetIndex;

    if (draggedIndex === targetSlot || draggedIndex === targetSlot - 1) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      setDragPosition(null);
      return;
    }

    const toIndex = draggedIndex < targetSlot ? targetSlot - 1 : targetSlot;
    const clampedTarget = Math.max(0, Math.min(spec.field_catalog.length - 1, toIndex));

    handleReorder(draggedIndex, clampedTarget);

    setDraggedIndex(null);
    setDragOverIndex(null);
    setDragPosition(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    setDragPosition(null);
  };

  const handleDeleteField = (index: number) => {
    const nextCatalog = spec.field_catalog
      .filter((_, i) => i !== index)
      .map((f, i) => ({ ...f, col_pos: i + 1 }));
    onChange(nextCatalog);
  };

  const handleUpdateField = (index: number, patch: Partial<AlvField>) => {
    const current = spec.field_catalog[index];
    if (current && current.fieldname === 'ZICON' && !('sort_enable' in patch)) {
      // Disallow editing ZICON text attributes
      return;
    }
    const nextCatalog = spec.field_catalog.map((f, i) => (i === index ? { ...f, ...patch } : f));
    onChange(nextCatalog);
  };

  const enabledCount = spec.field_catalog.filter((f) => !!f.sort_enable).length;

  return (
    <div
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="space-y-3 font-sans focus:outline-none"
    >
      {/* 1. Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="text-xs font-bold text-slate-800">Reorder & Sort ALV Columns:</span>
          <span className="text-xs text-slate-600">
            Drag the <strong>grip (↕)</strong> or change <strong>POS</strong> to arrange columns.
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Simple Icon Button with Tooltip for Copy Table */}
          <button
            type="button"
            onClick={handleCopyTable}
            disabled={spec.field_catalog.length === 0}
            title="Copy Table to Excel"
            aria-label="Copy Table to Excel"
            className="p-1.5 text-slate-700 bg-white hover:bg-slate-100 hover:text-blue-700 border border-slate-300 rounded-md transition-colors shadow-2xs cursor-pointer disabled:opacity-40"
          >
            <Copy className="w-4 h-4" />
          </button>

          <span className="font-mono text-xs text-blue-700 bg-white px-2.5 py-1 rounded border border-blue-200 font-semibold shadow-2xs">
            Enabled: {enabledCount} / Total {spec.field_catalog.length}
          </span>
        </div>
      </div>

      {/* Spreadsheet Grid */}
      <div
        onPaste={handleTablePaste}
        className="border border-slate-300 rounded-lg overflow-hidden bg-white shadow-xs focus:outline-none select-none"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse font-sans">
            <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 font-semibold text-[11px] select-none">
              <tr>
                <th className="py-2 px-1 text-center w-8 bg-slate-200 border-r border-slate-300 text-slate-500 font-mono text-[10px]" title="Spreadsheet Row Number">
                  fx
                </th>
                <th className="py-1 px-1 text-center w-8 border-r border-slate-200" title="Drag grip to reorder column sequence">
                  <div className="text-[9px] text-slate-400 font-mono">A</div>
                  <div>↕</div>
                </th>
                <th className="py-1 px-1.5 text-center w-16 border-r border-slate-200" title="Sort Enable Checkbox (정렬 참여 여부: ENABLE이 체크된 필드로만 Sort가 실행됩니다)">
                  <div className="text-[9px] text-slate-400 font-mono">B</div>
                  <div>ENABLE</div>
                </th>
                <th className="py-1 px-1.5 text-center w-14 border-r border-slate-200" title="Column Position (COL_POS)">
                  <div className="text-[9px] text-slate-400 font-mono">C</div>
                  <div>POS</div>
                </th>
                <th className="py-1 px-2 min-w-36 border-r border-slate-200 font-mono">
                  <div className="text-[9px] text-slate-400 font-mono">D</div>
                  <div>FIELDNAME</div>
                </th>
                <th className="py-1 px-2 min-w-44 border-r border-slate-200">
                  <div className="text-[9px] text-slate-400 font-mono">E</div>
                  <div>COLTEXT</div>
                </th>
                <th className="py-1 px-2 text-center w-36">
                  <div className="text-[9px] text-slate-400 font-mono">ACTIONS</div>
                  <div>MANAGE / ORDER</div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
              {spec.field_catalog.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400 font-sans">
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <FileSpreadsheet className="w-6 h-6 text-slate-300" />
                      <p className="font-medium">No fields registered.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                spec.field_catalog.map((field, idx) => {
                  const stableKey = field.id || `sort-pos-${idx}`;
                  const isDragging = draggedIndex === idx;
                  const isOver = dragOverIndex === idx;
                  const isDropTop = isOver && dragPosition === 'top';
                  const isDropBottom = isOver && dragPosition === 'bottom';
                  const isZicon = field.fieldname === 'ZICON';

                  const cellDropClasses = isDropTop
                    ? 'border-t-2 border-t-blue-600 bg-blue-50/70'
                    : isDropBottom
                    ? 'border-b-2 border-b-blue-600 bg-blue-50/70'
                    : isDragging
                    ? 'opacity-35 bg-slate-100'
                    : '';

                  const isSelectedRow =
                    selectedRange &&
                    idx >= Math.min(selectedRange.startRow, selectedRange.endRow) &&
                    idx <= Math.max(selectedRange.startRow, selectedRange.endRow);

                  return (
                    <tr
                      key={stableKey}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, idx)}
                      className={`transition-colors hover:bg-blue-50/20 ${
                        isDragging ? 'opacity-35 bg-slate-100' : ''
                      }`}
                    >
                      {/* fx / Row Number */}
                      <td
                        onClick={() => {
                          setSelectedRange({
                            startRow: idx,
                            startCol: 0,
                            endRow: idx,
                            endCol: SORT_COL_COUNT - 1,
                          });
                        }}
                        className={`py-1 px-1 text-center font-mono font-bold text-[10px] border-r border-slate-300 select-none cursor-pointer ${
                          isSelectedRow ? 'bg-blue-200 text-blue-900' : 'bg-slate-100 text-slate-500'
                        } ${cellDropClasses}`}
                      >
                        {idx + 1}
                      </td>

                      {/* Col A: Drag Handle */}
                      <td className={`py-1 px-1 text-center border-r border-slate-200 ${cellDropClasses}`}>
                        <div
                          draggable={true}
                          onDragStart={(e) => handleDragStart(e, idx)}
                          onDragEnd={handleDragEnd}
                          title="Drag grip to reorder column position (COL_POS)"
                          className="p-1 inline-flex items-center justify-center rounded cursor-grab active:cursor-grabbing text-slate-400 hover:text-blue-700 hover:bg-blue-100/60 transition-colors select-none"
                        >
                          <GripVertical className="w-4 h-4 mx-auto" />
                        </div>
                      </td>

                      {/* Col B: ENABLE */}
                      <td
                        onMouseDown={() => handleCellMouseDown(idx, 0)}
                        onMouseEnter={() => handleCellMouseEnter(idx, 0)}
                        onClick={() => handleUpdateField(idx, { sort_enable: !field.sort_enable })}
                        className={`py-1 px-1.5 text-center border-r border-slate-200 cursor-pointer select-none hover:bg-blue-50/50 ${cellDropClasses} ${
                          isCellInRange(selectedRange, idx, 0)
                            ? 'bg-blue-100 ring-1 ring-blue-500'
                            : ''
                        }`}
                        title="클릭하여 ENABLE 정렬 참여 토글"
                      >
                        <div className="flex items-center justify-center h-8">
                          <input
                            type="checkbox"
                            checked={!!field.sort_enable}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleUpdateField(idx, { sort_enable: e.target.checked });
                            }}
                            className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                            title="정렬 적용 (ENABLE)"
                          />
                        </div>
                      </td>

                      {/* Col C: POS */}
                      <td
                        onMouseDown={() => handleCellMouseDown(idx, 1)}
                        onMouseEnter={() => handleCellMouseEnter(idx, 1)}
                        className={`p-0 border-r border-slate-200 text-center font-bold ${cellDropClasses} ${
                          isCellInRange(selectedRange, idx, 1)
                            ? 'bg-blue-100 ring-1 ring-blue-500'
                            : ''
                        }`}
                      >
                        <div className="flex items-center justify-center h-8">
                          <select
                            value={field.col_pos}
                            onChange={(e) => {
                              const newPos = parseInt(e.target.value, 10);
                              if (!isNaN(newPos) && newPos >= 1 && newPos <= spec.field_catalog.length) {
                                handleReorder(idx, newPos - 1);
                              }
                            }}
                            className="bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded px-1.5 py-0.5 text-xs font-mono font-bold focus:bg-white focus:border-blue-500 cursor-pointer text-center"
                          >
                            {spec.field_catalog.map((_, pIdx) => (
                              <option key={pIdx + 1} value={pIdx + 1}>
                                {pIdx + 1}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>

                      {/* Col D: FIELDNAME */}
                      <td
                        onMouseDown={() => handleCellMouseDown(idx, 2)}
                        onMouseEnter={() => handleCellMouseEnter(idx, 2)}
                        className={`p-0 border-r border-slate-200 ${cellDropClasses} ${
                          isCellInRange(selectedRange, idx, 2)
                            ? 'bg-blue-100 ring-1 ring-blue-500'
                            : ''
                        }`}
                      >
                        <input
                          type="text"
                          value={field.fieldname}
                          disabled={isZicon}
                          data-sortcell={`${idx}-fieldname`}
                          onFocus={() => {
                            if (!selectedRange) {
                              setSelectedRange({ startRow: idx, startCol: 2, endRow: idx, endCol: 2 });
                            }
                          }}
                          onKeyDown={(e) => handleCellKeyDown(e, idx, 'fieldname')}
                          onChange={(e) =>
                            handleUpdateField(idx, { fieldname: e.target.value })
                          }
                          onBlur={(e) =>
                            handleUpdateField(idx, {
                              fieldname: e.target.value.trim().toUpperCase(),
                            })
                          }
                          className={`w-full h-8 px-2 bg-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 uppercase font-mono font-bold text-blue-950 ${
                            isZicon ? 'opacity-80 bg-slate-50 cursor-not-allowed' : ''
                          }`}
                        />
                      </td>

                      {/* Col E: COLTEXT */}
                      <td
                        onMouseDown={() => handleCellMouseDown(idx, 3)}
                        onMouseEnter={() => handleCellMouseEnter(idx, 3)}
                        className={`p-0 border-r border-slate-200 font-sans ${cellDropClasses} ${
                          isCellInRange(selectedRange, idx, 3)
                            ? 'bg-blue-100 ring-1 ring-blue-500'
                            : ''
                        }`}
                      >
                        <input
                          type="text"
                          value={isZicon ? 'Status' : field.coltext}
                          disabled={isZicon}
                          data-sortcell={`${idx}-coltext`}
                          onFocus={() => {
                            if (!selectedRange) {
                              setSelectedRange({ startRow: idx, startCol: 3, endRow: idx, endCol: 3 });
                            }
                          }}
                          onKeyDown={(e) => handleCellKeyDown(e, idx, 'coltext')}
                          onChange={(e) => handleUpdateField(idx, { coltext: e.target.value })}
                          className={`w-full h-8 px-2 bg-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-800 font-medium ${
                            isZicon ? 'opacity-80 bg-slate-50 cursor-not-allowed font-semibold' : ''
                          }`}
                        />
                      </td>

                      {/* Reorder Actions */}
                      <td className={`py-1 px-1 text-center ${cellDropClasses}`}>
                        <div className="flex items-center justify-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => handleReorder(idx, 0)}
                            disabled={idx === 0}
                            title="Move to Top (COL_POS 1)"
                            className="p-1 text-slate-400 hover:text-blue-700 hover:bg-blue-50 rounded disabled:opacity-20 cursor-pointer"
                          >
                            <ArrowUpToLine className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReorder(idx, idx - 1)}
                            disabled={idx === 0}
                            title="Move Up"
                            className="p-1 text-slate-400 hover:text-blue-700 hover:bg-blue-50 rounded disabled:opacity-20 cursor-pointer"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReorder(idx, idx + 1)}
                            disabled={idx === spec.field_catalog.length - 1}
                            title="Move Down"
                            className="p-1 text-slate-400 hover:text-blue-700 hover:bg-blue-50 rounded disabled:opacity-20 cursor-pointer"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReorder(idx, spec.field_catalog.length - 1)}
                            disabled={idx === spec.field_catalog.length - 1}
                            title="Move to Bottom"
                            className="p-1 text-slate-400 hover:text-blue-700 hover:bg-blue-50 rounded disabled:opacity-20 cursor-pointer"
                          >
                            <ArrowDownToLine className="w-3.5 h-3.5" />
                          </button>
                          <div className="h-4 w-px bg-slate-200 mx-0.5" />
                          <button
                            type="button"
                            onClick={() => handleDeleteField(idx)}
                            disabled={isZicon}
                            title={isZicon ? 'ZICON field cannot be deleted' : `Delete field '${field.fieldname}'`}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
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
    </div>
  );
};
