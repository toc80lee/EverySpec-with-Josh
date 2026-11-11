import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowUp,
  ArrowDown,
  GripVertical,
  ArrowUpToLine,
  ArrowDownToLine,
  FileSpreadsheet,
  Copy,
  AlertTriangle,
} from 'lucide-react';
import { AlvField, ProgramSpec } from '../types/sap';
import {
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

  // Columns for Sort view (LVC_T_SORT):
  // 0: ENABLE
  // 1: SPOS (Sort position)
  // 2: FIELDNAME
  // 3: COLTEXT (Read-only)
  // 4: UP (Ascending checkbox)
  // 5: DOWN (Descending checkbox)
  // 6: SUBTOT (Subtotal break)
  // 7: GROUP (Group/Page break)
  // 8: EXPA (Expand subtotal)
  const SORT_COL_COUNT = 9;

  const getSortCellValue = (rowIdx: number, colIdx: number): string => {
    const field = spec.field_catalog[rowIdx];
    if (!field) return '';
    switch (colIdx) {
      case 0:
        return field.sort_enable ? 'X' : '';
      case 1:
        return field.sort_enable && field.spos !== undefined && field.spos !== null
          ? String(field.spos)
          : '';
      case 2:
        return field.fieldname || '';
      case 3:
        return field.coltext || '';
      case 4:
        return field.sort_enable && field.sort_up ? 'X' : '';
      case 5:
        return field.sort_enable && field.sort_down ? 'X' : '';
      case 6:
        return field.sort_enable && (field.subtot || field.subtotal) ? 'X' : '';
      case 7:
        return field.sort_enable && field.group ? String(field.group) : '';
      case 8:
        return field.sort_enable && field.expa ? 'X' : '';
      default:
        return '';
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

  // Direct paste into selected cells
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

    matrix.forEach((rowVals, rOffset) => {
      const targetRowIdx = startR + rOffset;
      if (!updated[targetRowIdx]) return;

      const targetField = { ...updated[targetRowIdx] };

      rowVals.forEach((val, cOffset) => {
        const targetColIdx = startC + cOffset;
        const trimmed = val.trim();

        switch (targetColIdx) {
          case 0: { // ENABLE
            const enabled = isTruthy(trimmed);
            targetField.sort_enable = enabled;
            if (enabled && (!targetField.spos || targetField.spos < 1)) {
              targetField.spos = targetRowIdx + 1;
              targetField.sort_up = true;
              targetField.sort_down = false;
            }
            break;
          }
          case 1: { // SPOS
            if (targetField.sort_enable) {
              const num = parseInt(trimmed, 10);
              targetField.spos = !isNaN(num) && num > 0 ? num : undefined;
            }
            break;
          }
          case 2: // FIELDNAME
            if (trimmed && targetField.fieldname !== 'ZICON') {
              targetField.fieldname = trimmed.toUpperCase();
            }
            break;
          case 3: // COLTEXT is read-only in Sort tab
            break;
          case 4: { // UP
            if (targetField.sort_enable) {
              const isUp = isTruthy(trimmed);
              targetField.sort_up = isUp;
              if (isUp) targetField.sort_down = false;
            }
            break;
          }
          case 5: { // DOWN
            if (targetField.sort_enable) {
              const isDown = isTruthy(trimmed);
              targetField.sort_down = isDown;
              if (isDown) targetField.sort_up = false;
            }
            break;
          }
          case 6: { // SUBTOT
            if (targetField.sort_enable) {
              const isSubtot = isTruthy(trimmed);
              targetField.subtot = isSubtot;
              targetField.subtotal = isSubtot;
            }
            break;
          }
          case 7: { // GROUP
            if (targetField.sort_enable) {
              targetField.group = trimmed.toUpperCase();
            }
            break;
          }
          case 8: { // EXPA
            if (targetField.sort_enable) {
              targetField.expa = isTruthy(trimmed);
            }
            break;
          }
        }
      });

      updated[targetRowIdx] = targetField;
    });

    onChange(updated);

    setSelectedRange({
      startRow: startR,
      startCol: startC,
      endRow: Math.min(startR + pastedRowCount - 1, spec.field_catalog.length - 1),
      endCol: Math.min(startC + pastedColCount - 1, SORT_COL_COUNT - 1),
    });
  };

  const handleCopyTable = async () => {
    const lines = ['ENABLE\tSPOS\tFIELDNAME\tCOLTEXT\tUP\tDOWN\tSUBTOT\tGROUP\tEXPA'];
    spec.field_catalog.forEach((f) => {
      const sposVal = f.sort_enable ? (f.spos !== undefined && f.spos !== null ? String(f.spos) : '') : '';
      const upVal = f.sort_enable && f.sort_up ? 'X' : '';
      const downVal = f.sort_enable && f.sort_down ? 'X' : '';
      const subtotVal = f.sort_enable && (f.subtot || f.subtotal) ? 'X' : '';
      const groupVal = f.sort_enable && f.group ? String(f.group) : '';
      const expaVal = f.sort_enable && f.expa ? 'X' : '';
      lines.push(`${f.sort_enable ? 'X' : ''}\t${sposVal}\t${f.fieldname}\t${f.coltext}\t${upVal}\t${downVal}\t${subtotVal}\t${groupVal}\t${expaVal}`);
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

  // Drag and Drop States for column reordering
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

  const handleUpdateField = (index: number, patch: Partial<AlvField>) => {
    const nextCatalog = spec.field_catalog.map((f, i) => (i === index ? { ...f, ...patch } : f));
    onChange(nextCatalog);
  };

  // Toggle ENABLE handler: when checked, automatically defaults SPOS and UP='X'
  const handleToggleEnable = (idx: number, enable: boolean) => {
    const current = spec.field_catalog[idx];
    if (!current) return;

    if (enable) {
      // Find current max spos among enabled fields
      const currentMaxSpos = spec.field_catalog
        .filter((f) => f.sort_enable && typeof f.spos === 'number' && !isNaN(f.spos))
        .reduce((max, f) => Math.max(max, f.spos || 0), 0);
      const nextSpos = current.spos && current.spos > 0 ? current.spos : currentMaxSpos + 1;
      
      // Default to UP if neither is currently set
      const up = current.sort_down ? false : true;
      const down = current.sort_down ? true : false;

      handleUpdateField(idx, {
        sort_enable: true,
        spos: nextSpos,
        sort_up: up,
        sort_down: down,
      });
    } else {
      handleUpdateField(idx, {
        sort_enable: false,
      });
    }
  };

  // Toggle UP checkbox (mutually exclusive with DOWN)
  const handleToggleUp = (idx: number) => {
    const field = spec.field_catalog[idx];
    if (!field || !field.sort_enable) return;

    if (field.sort_up) {
      handleUpdateField(idx, { sort_up: false });
    } else {
      handleUpdateField(idx, { sort_up: true, sort_down: false });
    }
  };

  // Toggle DOWN checkbox (mutually exclusive with UP)
  const handleToggleDown = (idx: number) => {
    const field = spec.field_catalog[idx];
    if (!field || !field.sort_enable) return;

    if (field.sort_down) {
      handleUpdateField(idx, { sort_down: false });
    } else {
      handleUpdateField(idx, { sort_down: true, sort_up: false });
    }
  };

  // Toggle SUBTOT checkbox (subtotal break)
  const handleToggleSubtot = (idx: number) => {
    const field = spec.field_catalog[idx];
    if (!field || !field.sort_enable) return;
    const nextVal = !(field.subtot || field.subtotal);
    handleUpdateField(idx, { subtot: nextVal, subtotal: nextVal });
  };

  // Toggle EXPA checkbox (expand subtotal levels)
  const handleToggleExpa = (idx: number) => {
    const field = spec.field_catalog[idx];
    if (!field || !field.sort_enable) return;
    handleUpdateField(idx, { expa: !field.expa });
  };

  // Validation: Check if any ENABLED field has empty or invalid SPOS
  const emptySposFields = spec.field_catalog.filter(
    (f) => f.sort_enable && (f.spos === undefined || f.spos === null || isNaN(f.spos) || f.spos <= 0)
  );

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
            Drag the <strong>grip (↕)</strong> or set <strong>SPOS</strong> to arrange sort sequence.
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

      {/* Validation Warning Alert: SPOS is required when ENABLE is checked */}
      {emptySposFields.length > 0 && (
        <div className="flex items-center gap-2.5 p-2.5 bg-rose-50 border border-rose-300 rounded-lg text-rose-800 text-xs font-medium">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>
            <strong>SPOS 필수 입력 오류:</strong> ENABLE이 체크된 필드 (
            <span className="font-mono font-bold text-rose-900">
              {emptySposFields.map((f) => f.fieldname || f.coltext).join(', ')}
            </span>
            )의 SPOS(정렬 순서) 값이 비어 있습니다. 1 이상의 순서를 입력해 주세요.
          </span>
        </div>
      )}

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
                <th className="py-1 px-1.5 text-center w-16 border-r border-slate-200" title="Sort Enable Checkbox (ENABLE이 체크된 필드로만 Sort가 실행됩니다)">
                  <div className="text-[9px] text-slate-400 font-mono">B</div>
                  <div>ENABLE</div>
                </th>
                <th className="py-1 px-1.5 text-center w-16 border-r border-slate-200" title="SPOS (Sort Position): Specifies the numerical order of the sort (e.g., 1 for primary sort, 2 for secondary sort).">
                  <div className="text-[9px] text-slate-400 font-mono">C</div>
                  <div>SPOS</div>
                </th>
                <th className="py-1 px-2 min-w-36 border-r border-slate-200 font-mono" title="FIELDNAME: The technical name of the field/column in the output table to be sorted.">
                  <div className="text-[9px] text-slate-400 font-mono">D</div>
                  <div>FIELDNAME</div>
                </th>
                <th className="py-1 px-2 min-w-44 border-r border-slate-200" title="Sort 탭에서는 COLTEXT를 변경할 수 없습니다">
                  <div className="text-[9px] text-slate-400 font-mono">E</div>
                  <div>COLTEXT</div>
                </th>
                <th className="py-1 px-1.5 text-center w-14 border-r border-slate-200" title="UP: Set to 'X' for ascending (Up) sort order.">
                  <div className="text-[9px] text-slate-400 font-mono">F</div>
                  <div>UP</div>
                </th>
                <th className="py-1 px-1.5 text-center w-14 border-r border-slate-200" title="DOWN: Set to 'X' for descending (Down) sort order.">
                  <div className="text-[9px] text-slate-400 font-mono">G</div>
                  <div>DOWN</div>
                </th>
                <th className="py-1 px-1.5 text-center w-16 border-r border-slate-200" title="SUBTOT (Subtotal): Set to 'X' to calculate a subtotal break whenever the value of this sort field changes.">
                  <div className="text-[9px] text-slate-400 font-mono">H</div>
                  <div>SUBTOT</div>
                </th>
                <th className="py-1 px-1.5 text-center w-20 border-r border-slate-200" title="GROUP: Controls grouping or page-break options during sorting/printing.">
                  <div className="text-[9px] text-slate-400 font-mono">I</div>
                  <div>GROUP</div>
                </th>
                <th className="py-1 px-1.5 text-center w-16 border-r border-slate-200" title="EXPA (Expand): Set to 'X' to automatically expand subtotal levels when the ALV is displayed.">
                  <div className="text-[9px] text-slate-400 font-mono">J</div>
                  <div>EXPA</div>
                </th>
                <th className="py-1 px-2 text-center w-32">
                  <div className="text-[9px] text-slate-400 font-mono">ACTIONS</div>
                  <div>MANAGE / ORDER</div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
              {spec.field_catalog.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-10 text-center text-slate-400 font-sans">
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
                  const isEnabled = !!field.sort_enable;
                  const isSposInvalid = isEnabled && (field.spos === undefined || field.spos === null || isNaN(field.spos) || field.spos <= 0);

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
                          title="Drag grip to reorder column sequence"
                          className="p-1 inline-flex items-center justify-center rounded cursor-grab active:cursor-grabbing text-slate-400 hover:text-blue-700 hover:bg-blue-100/60 transition-colors select-none"
                        >
                          <GripVertical className="w-4 h-4 mx-auto" />
                        </div>
                      </td>

                      {/* Col B: ENABLE */}
                      <td
                        onMouseDown={() => handleCellMouseDown(idx, 0)}
                        onMouseEnter={() => handleCellMouseEnter(idx, 0)}
                        onClick={() => handleToggleEnable(idx, !field.sort_enable)}
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
                            checked={isEnabled}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleToggleEnable(idx, e.target.checked);
                            }}
                            className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                            title="정렬 적용 (ENABLE)"
                          />
                        </div>
                      </td>

                      {/* Col C: SPOS (Only editable when ENABLE is checked; Required when ENABLE is checked) */}
                      <td
                        onMouseDown={() => handleCellMouseDown(idx, 1)}
                        onMouseEnter={() => handleCellMouseEnter(idx, 1)}
                        className={`p-0 border-r border-slate-200 text-center font-bold ${cellDropClasses} ${
                          isSposInvalid
                            ? 'bg-rose-50 ring-2 ring-rose-500'
                            : isCellInRange(selectedRange, idx, 1)
                            ? 'bg-blue-100 ring-1 ring-blue-500'
                            : ''
                        }`}
                      >
                        <div className="flex items-center justify-center h-8 px-1">
                          {isEnabled ? (
                            <div className="relative w-full flex items-center justify-center">
                              <input
                                type="number"
                                min="1"
                                max="99"
                                value={field.spos !== undefined && field.spos !== null ? field.spos : ''}
                                data-sortcell={`${idx}-spos`}
                                onFocus={() => {
                                  if (!selectedRange) {
                                    setSelectedRange({ startRow: idx, startCol: 1, endRow: idx, endCol: 1 });
                                  }
                                }}
                                onKeyDown={(e) => handleCellKeyDown(e, idx, 'spos')}
                                onChange={(e) => {
                                  const val = e.target.value.trim();
                                  if (val === '') {
                                    handleUpdateField(idx, { spos: undefined });
                                  } else {
                                    const num = parseInt(val, 10);
                                    handleUpdateField(idx, { spos: isNaN(num) ? undefined : num });
                                  }
                                }}
                                placeholder="필수"
                                title={
                                  isSposInvalid
                                    ? 'SPOS는 필수 값입니다. 1 이상의 숫자를 입력하세요.'
                                    : '정렬 순서 번호 (SPOS: 1, 2, 3...)'
                                }
                                className={`w-14 h-7 text-center font-mono font-bold text-xs rounded border transition-all focus:bg-white focus:outline-none focus:ring-2 ${
                                  isSposInvalid
                                    ? 'border-rose-400 bg-rose-50 text-rose-700 placeholder:text-rose-400 focus:ring-rose-500'
                                    : 'border-blue-300 bg-blue-50/70 text-blue-900 focus:ring-blue-500'
                                }`}
                              />
                            </div>
                          ) : (
                            <span
                              className="text-slate-300 font-mono select-none text-xs"
                              title="ENABLE 체크 시에만 SPOS 수정이 가능합니다."
                            >
                              -
                            </span>
                          )}
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

                      {/* Col E: COLTEXT (Read-Only in Sort Tab per RFQ v1.16) */}
                      <td
                        onMouseDown={() => handleCellMouseDown(idx, 3)}
                        onMouseEnter={() => handleCellMouseEnter(idx, 3)}
                        className={`px-2 py-0 border-r border-slate-200 font-sans select-none ${cellDropClasses} ${
                          isCellInRange(selectedRange, idx, 3)
                            ? 'bg-blue-100 ring-1 ring-blue-500'
                            : 'bg-slate-50/40 text-slate-700'
                        }`}
                        title="Sort 탭에서는 COLTEXT를 변경할 수 없습니다 (Field Catalog 탭에서 수정)"
                      >
                        <div className="flex items-center h-8 font-medium truncate text-slate-700">
                          {isZicon ? 'Status' : field.coltext}
                        </div>
                      </td>

                      {/* Col F: UP (Ascending, 'X' or ' ', disabled when !sort_enable) */}
                      <td
                        onMouseDown={() => handleCellMouseDown(idx, 4)}
                        onMouseEnter={() => handleCellMouseEnter(idx, 4)}
                        onClick={() => isEnabled && handleToggleUp(idx)}
                        className={`py-1 px-1.5 text-center border-r border-slate-200 select-none ${cellDropClasses} ${
                          !isEnabled
                            ? 'bg-slate-50/60 cursor-not-allowed opacity-50'
                            : 'cursor-pointer hover:bg-blue-50/50'
                        } ${
                          isCellInRange(selectedRange, idx, 4)
                            ? 'bg-blue-100 ring-1 ring-blue-500'
                            : ''
                        }`}
                        title={
                          !isEnabled
                            ? 'ENABLE 체크 시 활성화됩니다'
                            : '오름차순 정렬 (UP: UP 선택 시 DOWN 자동 해제)'
                        }
                      >
                        <div className="flex items-center justify-center h-8">
                          <input
                            type="checkbox"
                            disabled={!isEnabled}
                            checked={isEnabled && !!field.sort_up}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleToggleUp(idx);
                            }}
                            className={`w-4 h-4 rounded border-slate-300 focus:ring-blue-500 ${
                              !isEnabled
                                ? 'cursor-not-allowed opacity-40'
                                : 'cursor-pointer text-blue-600'
                            }`}
                          />
                        </div>
                      </td>

                      {/* Col G: DOWN (Descending, 'X' or ' ', disabled when !sort_enable) */}
                      <td
                        onMouseDown={() => handleCellMouseDown(idx, 5)}
                        onMouseEnter={() => handleCellMouseEnter(idx, 5)}
                        onClick={() => isEnabled && handleToggleDown(idx)}
                        className={`py-1 px-1.5 text-center border-r border-slate-200 select-none ${cellDropClasses} ${
                          !isEnabled
                            ? 'bg-slate-50/60 cursor-not-allowed opacity-50'
                            : 'cursor-pointer hover:bg-blue-50/50'
                        } ${
                          isCellInRange(selectedRange, idx, 5)
                            ? 'bg-blue-100 ring-1 ring-blue-500'
                            : ''
                        }`}
                        title={
                          !isEnabled
                            ? 'ENABLE 체크 시 활성화됩니다'
                            : '내림차순 정렬 (DOWN: DOWN 선택 시 UP 자동 해제)'
                        }
                      >
                        <div className="flex items-center justify-center h-8">
                          <input
                            type="checkbox"
                            disabled={!isEnabled}
                            checked={isEnabled && !!field.sort_down}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleToggleDown(idx);
                            }}
                            className={`w-4 h-4 rounded border-slate-300 focus:ring-blue-500 ${
                              !isEnabled
                                ? 'cursor-not-allowed opacity-40'
                                : 'cursor-pointer text-blue-600'
                            }`}
                          />
                        </div>
                      </td>

                      {/* Col H: SUBTOT (LVC_S_SORT-SUBTOT: 'X' or ' ') */}
                      <td
                        onMouseDown={() => handleCellMouseDown(idx, 6)}
                        onMouseEnter={() => handleCellMouseEnter(idx, 6)}
                        onClick={() => isEnabled && handleToggleSubtot(idx)}
                        className={`py-1 px-1.5 text-center border-r border-slate-200 select-none ${cellDropClasses} ${
                          !isEnabled
                            ? 'bg-slate-50/60 cursor-not-allowed opacity-50'
                            : 'cursor-pointer hover:bg-blue-50/50'
                        } ${
                          isCellInRange(selectedRange, idx, 6)
                            ? 'bg-blue-100 ring-1 ring-blue-500'
                            : ''
                        }`}
                        title="SUBTOT (Subtotal): Set to 'X' to calculate a subtotal break whenever the value of this sort field changes."
                      >
                        <div className="flex items-center justify-center h-8">
                          <input
                            type="checkbox"
                            disabled={!isEnabled}
                            checked={isEnabled && !!(field.subtot || field.subtotal)}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleToggleSubtot(idx);
                            }}
                            className={`w-4 h-4 rounded border-slate-300 focus:ring-blue-500 ${
                              !isEnabled
                                ? 'cursor-not-allowed opacity-40'
                                : 'cursor-pointer text-blue-600'
                            }`}
                          />
                        </div>
                      </td>

                      {/* Col I: GROUP (LVC_S_SORT-GROUP: Controls grouping / page-break options) */}
                      <td
                        onMouseDown={() => handleCellMouseDown(idx, 7)}
                        onMouseEnter={() => handleCellMouseEnter(idx, 7)}
                        className={`p-0 border-r border-slate-200 text-center ${cellDropClasses} ${
                          isCellInRange(selectedRange, idx, 7)
                            ? 'bg-blue-100 ring-1 ring-blue-500'
                            : ''
                        }`}
                        title="GROUP: Controls grouping or page-break options during sorting/printing."
                      >
                        <div className="flex items-center justify-center h-8 px-1">
                          {isEnabled ? (
                            <select
                              value={field.group ? String(field.group) : ''}
                              disabled={!isEnabled}
                              onChange={(e) => {
                                handleUpdateField(idx, { group: e.target.value });
                              }}
                              className="w-16 h-7 text-center font-mono text-[11px] font-semibold bg-white border border-slate-300 rounded focus:border-blue-500 focus:outline-none"
                              title="GROUP: Controls grouping or page-break options during sorting/printing."
                            >
                              <option value="">-</option>
                              <option value="*">* (New Page)</option>
                              <option value="UL">UL (Underline)</option>
                            </select>
                          ) : (
                            <span className="text-slate-300 font-mono select-none text-xs">-</span>
                          )}
                        </div>
                      </td>

                      {/* Col J: EXPA (LVC_S_SORT-EXPA: 'X' or ' ') */}
                      <td
                        onMouseDown={() => handleCellMouseDown(idx, 8)}
                        onMouseEnter={() => handleCellMouseEnter(idx, 8)}
                        onClick={() => isEnabled && handleToggleExpa(idx)}
                        className={`py-1 px-1.5 text-center border-r border-slate-200 select-none ${cellDropClasses} ${
                          !isEnabled
                            ? 'bg-slate-50/60 cursor-not-allowed opacity-50'
                            : 'cursor-pointer hover:bg-blue-50/50'
                        } ${
                          isCellInRange(selectedRange, idx, 8)
                            ? 'bg-blue-100 ring-1 ring-blue-500'
                            : ''
                        }`}
                        title="EXPA (Expand): Set to 'X' to automatically expand subtotal levels when the ALV is displayed."
                      >
                        <div className="flex items-center justify-center h-8">
                          <input
                            type="checkbox"
                            disabled={!isEnabled}
                            checked={isEnabled && !!field.expa}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleToggleExpa(idx);
                            }}
                            className={`w-4 h-4 rounded border-slate-300 focus:ring-blue-500 ${
                              !isEnabled
                                ? 'cursor-not-allowed opacity-40'
                                : 'cursor-pointer text-blue-600'
                            }`}
                          />
                        </div>
                      </td>

                      {/* Reorder Actions (Field Deletion removed per RFQ v1.16) */}
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
