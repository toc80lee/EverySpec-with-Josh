import React, { useState, useRef, useEffect } from 'react';
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Link,
  DollarSign,
  CheckSquare,
  Key,
  GripVertical,
  ArrowUpToLine,
  ArrowDownToLine,
  Search,
  FileSpreadsheet,
  Copy,
} from 'lucide-react';
import { AlvField, ProgramSpec, SapDataType, TextAlignment } from '../types/sap';
import { SapSearchHelpModal } from './SapSearchHelpModal';
import {
  exportFieldCatalogToTsv,
  copyTsvToClipboard,
  parseSpreadsheetText,
  CellRange,
  isCellInRange,
  extractCellRangeTsv,
  normalizeDataType,
  defaultLengthForType,
  isTruthy,
} from '../utils/spreadsheetClipboard';

interface FieldCatalogEditorProps {
  spec: ProgramSpec;
  onChange: (updatedCatalog: AlvField[], updatedMockRows?: Record<string, any>[]) => void;
  onReorder?: (fromIndex: number, toIndex: number) => void;
}

export const FieldCatalogEditor: React.FC<FieldCatalogEditorProps> = ({
  spec,
  onChange,
  onReorder,
}) => {
  const [showSearchHelp, setShowSearchHelp] = useState(false);
  const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(null);

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

  // Total data columns in Fcat table = 14 (Col C to P)
  // 0: FIELDNAME
  // 1: COLTEXT
  // 2: TYPE
  // 3: LENGTH
  // 4: JUST
  // 5: COLOR
  // 6: KEY
  // 7: HOTSPOT
  // 8: CHK
  // 9: EDIT
  // 10: DO_SUM
  // 11: REF.TABLE
  // 12: REF.FIELD
  // 13: T-CODE
  const FCAT_COL_COUNT = 14;

  const getFcatCellValue = (rowIdx: number, colIdx: number): string => {
    const field = spec.field_catalog[rowIdx];
    if (!field) return '';
    const isZicon = field.fieldname === 'ZICON';

    switch (colIdx) {
      case 0: return field.fieldname || '';
      case 1: return isZicon ? 'Status' : (field.coltext || '');
      case 2: return isZicon ? 'CHAR' : (field.datatype || 'CHAR');
      case 3: return isZicon ? '4' : String(field.outputlen || 10);
      case 4: return isZicon ? 'C' : (field.just || 'L');
      case 5: return isZicon ? '' : (field.emphasize || '');
      case 6: return (isZicon || field.key) ? 'X' : '';
      case 7: return (!isZicon && field.hotspot) ? 'X' : '';
      case 8: return (!isZicon && field.checkbox) ? 'X' : '';
      case 9: return (!isZicon && field.edit) ? 'X' : '';
      case 10: return (!isZicon && field.do_sum) ? 'X' : '';
      case 11: return isZicon ? '' : (field.ref_table || '');
      case 12: return isZicon ? '' : (field.ref_field || '');
      case 13: return isZicon ? '' : (field.drilldown_tcode || '');
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
        const tsv = extractCellRangeTsv(selectedRange, getFcatCellValue);
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

    // Expand rows if needed!
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

    // Apply values to target fields
    matrix.forEach((rowVals, rOffset) => {
      const targetRowIdx = startR + rOffset;
      if (!updated[targetRowIdx]) return;

      const targetField = { ...updated[targetRowIdx] };

      // Prevent editing ZICON properties
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
          case 0: // FIELDNAME
            if (trimmed) targetField.fieldname = trimmed.toUpperCase();
            break;
          case 1: // COLTEXT
            targetField.coltext = trimmed;
            break;
          case 2: // TYPE
            if (trimmed) {
              const dt = normalizeDataType(trimmed);
              targetField.datatype = dt;
              if (!rowVals[cOffset + 1]) {
                targetField.outputlen = defaultLengthForType(dt);
              }
            }
            break;
          case 3: { // LENGTH
            const num = parseInt(trimmed, 10);
            if (!isNaN(num) && num > 0) targetField.outputlen = num;
            break;
          }
          case 4: // JUST
            if (trimmed) {
              const j = trimmed.toUpperCase().charAt(0);
              if (j === 'L' || j === 'R' || j === 'C') {
                targetField.just = j as TextAlignment;
              }
            }
            break;
          case 5: // COLOR (emphasize)
            targetField.emphasize = trimmed.toUpperCase();
            break;
          case 6: // KEY
            targetField.key = isTruthy(trimmed, false);
            break;
          case 7: // HOTSPOT
            targetField.hotspot = isTruthy(trimmed, false);
            break;
          case 8: // CHK - Only CHAR(1) allowed
            if (targetField.datatype === 'CHAR' && targetField.outputlen === 1) {
              targetField.checkbox = isTruthy(trimmed, false);
            } else {
              targetField.checkbox = false;
            }
            break;
          case 9: // EDIT
            targetField.edit = isTruthy(trimmed, false);
            break;
          case 10: // DO_SUM
            targetField.do_sum = isTruthy(trimmed, false);
            break;
          case 11: // REF.TABLE
            targetField.ref_table = trimmed.toUpperCase();
            break;
          case 12: // REF.FIELD
            targetField.ref_field = trimmed.toUpperCase();
            break;
          case 13: // T-CODE
            targetField.drilldown_tcode = trimmed.toUpperCase();
            break;
        }
      });

      // Enforce CHK rule: only CHAR(1) can be checkbox
      if (targetField.datatype !== 'CHAR' || targetField.outputlen !== 1) {
        targetField.checkbox = false;
      }

      updated[targetRowIdx] = targetField;
    });

    // Automatically re-index col_pos sequentially from 1 to N
    const reindexed = updated.map((f, idx) => ({ ...f, col_pos: idx + 1 }));
    onChange(reindexed);

    setSelectedRange({
      startRow: startR,
      startCol: startC,
      endRow: startR + pastedRowCount - 1,
      endCol: Math.min(startC + pastedColCount - 1, FCAT_COL_COUNT - 1),
    });
  };

  const handleCopyTable = async () => {
    const tsv = exportFieldCatalogToTsv(spec.field_catalog);
    await copyTsvToClipboard(tsv);
  };

  const handleCellKeyDown = (e: React.KeyboardEvent, rowIndex: number, colKey: string) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextInput = document.querySelector(`[data-fcell="${rowIndex + 1}-${colKey}"]`) as HTMLElement;
      if (nextInput) nextInput.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevInput = document.querySelector(`[data-fcell="${rowIndex - 1}-${colKey}"]`) as HTMLElement;
      if (prevInput) prevInput.focus();
    }
  };

  // Drag and Drop States
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dragPosition, setDragPosition] = useState<'top' | 'bottom' | null>(null);

  // Handle Search Help (F4) selection
  const handleSelectSearchHelp = (selected: {
    table: string;
    field: string;
    datatype: SapDataType;
    length: number;
    label: string;
  }) => {
    if (editingFieldIndex !== null && editingFieldIndex >= 0 && editingFieldIndex < spec.field_catalog.length) {
      handleUpdateField(editingFieldIndex, {
        ref_table: selected.table,
        ref_field: selected.field,
        fieldname: selected.field,
        coltext: selected.label,
        datatype: selected.datatype,
        outputlen: selected.length,
      });
    } else {
      const nextPos = spec.field_catalog.length + 1;
      const newField: AlvField = {
        id: `fcat-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        col_pos: nextPos,
        fieldname: selected.field,
        coltext: selected.label,
        datatype: selected.datatype,
        outputlen: selected.length,
        just: selected.datatype === 'CURR' || selected.datatype === 'DEC' || selected.datatype === 'INT4' ? 'R' : selected.datatype === 'DATS' ? 'C' : 'L',
        key: false,
        hotspot: false,
        checkbox: false,
        edit: false,
        do_sum: selected.datatype === 'CURR',
        emphasize: '',
        ref_table: selected.table,
        ref_field: selected.field,
      };
      onChange([...spec.field_catalog, newField]);
    }
    setEditingFieldIndex(null);
  };

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

  // Add custom new blank field with guaranteed stable ID
  const handleAddNewField = () => {
    const nextPos = spec.field_catalog.length + 1;
    const newField: AlvField = {
      id: `fld-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      col_pos: nextPos,
      fieldname: `FIELD_${nextPos}`,
      coltext: `항목_${nextPos}`,
      datatype: 'CHAR',
      outputlen: 12,
      just: 'L',
      key: false,
      hotspot: false,
      checkbox: false,
      edit: false,
      do_sum: false,
      emphasize: '',
    };
    const nextCatalog = [...spec.field_catalog, newField];
    onChange(nextCatalog);
  };

  // Delete field
  const handleDeleteField = (index: number) => {
    const current = spec.field_catalog[index];
    if (current && current.fieldname === 'ZICON') return;
    const nextCatalog = spec.field_catalog
      .filter((_, i) => i !== index)
      .map((f, i) => ({ ...f, col_pos: i + 1 }));
    onChange(nextCatalog);
  };

  // Update single field property
  const handleUpdateField = (index: number, patch: Partial<AlvField>) => {
    const current = spec.field_catalog[index];
    if (current && current.fieldname === 'ZICON') {
      // Disallow modifications to ZICON properties
      return;
    }

    const nextCatalog = spec.field_catalog.map((f, i) => {
      if (i !== index) return f;
      const updated = { ...f, ...patch };
      // Enforce CHK rule: only CHAR(1) can be checked
      if (updated.datatype !== 'CHAR' || updated.outputlen !== 1) {
        updated.checkbox = false;
      }
      return updated;
    });

    onChange(nextCatalog);
  };

  return (
    <div
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="space-y-3 font-sans focus:outline-none"
    >
      {/* 1. Top Controls Bar: Simplified with icon-only buttons with tooltips */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-200 shadow-2xs">
        {/* Left: Icon Actions (Add Field, Search Help, Copy to Excel) */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={handleAddNewField}
            title="+ Add Field"
            aria-label="Add Field"
            className="p-1.5 text-slate-700 bg-white hover:bg-slate-100 hover:text-blue-700 border border-slate-300 rounded-md transition-colors shadow-2xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingFieldIndex(null);
              setShowSearchHelp(true);
            }}
            title="Search Help (F4)"
            aria-label="Search Help (F4)"
            className="p-1.5 text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-300 rounded-md transition-colors shadow-2xs cursor-pointer"
          >
            <Search className="w-4 h-4" />
          </button>

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
        </div>

        {/* Right: Column Count */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-blue-700 bg-white px-2.5 py-1 rounded border border-blue-200 font-semibold shadow-2xs">
            Total {spec.field_catalog.length} Columns
          </span>
        </div>
      </div>

      {/* Spreadsheet Grid (LVC_T_FCAT) */}
      <div
        onPaste={handleTablePaste}
        className="border border-slate-300 rounded-lg overflow-hidden bg-white shadow-xs focus:outline-none select-none"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse font-sans">
            <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 font-semibold text-[11px] select-none">
              <tr>
                {/* fx / Corner Cell */}
                <th className="py-2 px-1 text-center w-8 bg-slate-200 border-r border-slate-300 text-slate-500 font-mono text-[10px]" title="Spreadsheet Row Number">
                  fx
                </th>
                <th className="py-1 px-1 text-center w-8 border-r border-slate-200" title="Drag grip to reorder column sequence">
                  <div className="text-[9px] text-slate-400 font-mono">A</div>
                  <div>↕</div>
                </th>
                <th className="py-1 px-1.5 text-center w-14 border-r border-slate-200" title="Column Position (COL_POS)">
                  <div className="text-[9px] text-slate-400 font-mono">B</div>
                  <div>POS</div>
                </th>
                <th className="py-1 px-2 min-w-32 border-r border-slate-200 font-mono">
                  <div className="text-[9px] text-slate-400 font-mono">C</div>
                  <div>FIELDNAME</div>
                </th>
                <th className="py-1 px-2 min-w-36 border-r border-slate-200">
                  <div className="text-[9px] text-slate-400 font-mono">D</div>
                  <div>COLTEXT</div>
                </th>
                <th className="py-1 px-2 w-20 text-center border-r border-slate-200">
                  <div className="text-[9px] text-slate-400 font-mono">E</div>
                  <div>TYPE</div>
                </th>
                <th className="py-1 px-2 w-16 text-center border-r border-slate-200">
                  <div className="text-[9px] text-slate-400 font-mono">F</div>
                  <div>LENGTH</div>
                </th>
                <th className="py-1 px-2 w-14 text-center border-r border-slate-200">
                  <div className="text-[9px] text-slate-400 font-mono">G</div>
                  <div>JUST</div>
                </th>
                <th
                  className="py-1 px-2 w-16 text-center border-r border-slate-200"
                  title="SAP ALV Color Code (e.g., C300, C100, C500, C600)"
                >
                  <div className="text-[9px] text-slate-400 font-mono">H</div>
                  <div>COLOR</div>
                </th>
                <th className="py-1 px-1.5 text-center w-12 border-r border-slate-200" title="Key Field (Fixed column)">
                  <div className="text-[9px] text-slate-400 font-mono">I</div>
                  <span className="flex items-center justify-center gap-0.5 text-blue-700">
                    <Key className="w-3 h-3" /> Key
                  </span>
                </th>
                <th className="py-1 px-1.5 text-center w-14 border-r border-slate-200" title="Hotspot (Clickable link / drilldown)">
                  <div className="text-[9px] text-slate-400 font-mono">J</div>
                  <span className="flex items-center justify-center gap-0.5 text-indigo-700">
                    <Link className="w-3 h-3" /> Hotspot
                  </span>
                </th>
                <th className="py-1 px-1 text-center w-12 border-r border-slate-200" title="Checkbox style (CHAR length 1 only)">
                  <div className="text-[9px] text-slate-400 font-mono">K</div>
                  <span className="flex items-center justify-center gap-0.5 text-slate-700">
                    <CheckSquare className="w-3 h-3" /> Chk
                  </span>
                </th>
                <th className="py-1 px-1 text-center w-12 border-r border-slate-200" title="Edit (Direct in-grid cell editing)">
                  <div className="text-[9px] text-slate-400 font-mono">L</div>
                  <div>EDIT</div>
                </th>
                <th
                  className="py-1 px-1 text-center w-12 border-r border-slate-200"
                  title="DO_SUM (Bottom total calculation - disabled for CHAR)"
                >
                  <div className="text-[9px] text-slate-400 font-mono">M</div>
                  <span className="flex items-center justify-center gap-0.5 text-emerald-700">
                    <DollarSign className="w-3 h-3" /> Σ
                  </span>
                </th>
                <th className="py-1 px-2 w-24 border-r border-slate-200">
                  <div className="text-[9px] text-slate-400 font-mono">N</div>
                  <div>REF.TABLE</div>
                </th>
                <th className="py-1 px-2 w-24 border-r border-slate-200">
                  <div className="text-[9px] text-slate-400 font-mono">O</div>
                  <div>REF.FIELD</div>
                </th>
                <th className="py-1 px-2 w-24 border-r border-slate-200">
                  <div className="text-[9px] text-slate-400 font-mono">P</div>
                  <div>T-CODE</div>
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
                  <td colSpan={18} className="py-10 text-center text-slate-400 font-sans">
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <FileSpreadsheet className="w-6 h-6 text-slate-300" />
                      <p className="font-medium">No fields registered in Field Catalog.</p>
                      <p className="text-xs text-slate-400">
                        Copy rows/columns from Excel or Google Sheets and paste directly with <strong>Ctrl+V</strong>.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                spec.field_catalog.map((field, idx) => {
                  const stableKey = field.id || `fld-pos-${idx}`;
                  const isDragging = draggedIndex === idx;
                  const isOver = dragOverIndex === idx;
                  const isDropTop = isOver && dragPosition === 'top';
                  const isDropBottom = isOver && dragPosition === 'bottom';
                  const isZicon = field.fieldname === 'ZICON';
                  const canBeCheckbox = !isZicon && field.datatype === 'CHAR' && field.outputlen === 1;

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
                      {/* Google Sheets Row Index (1, 2, 3...) */}
                      <td
                        onClick={() => {
                          setSelectedRange({
                            startRow: idx,
                            startCol: 0,
                            endRow: idx,
                            endCol: FCAT_COL_COUNT - 1,
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
                          title="Drag grip to reorder column sequence (COL_POS)"
                          className="p-1 inline-flex items-center justify-center rounded cursor-grab active:cursor-grabbing text-slate-400 hover:text-blue-700 hover:bg-blue-100/60 transition-colors select-none"
                        >
                          <GripVertical className="w-4 h-4 mx-auto" />
                        </div>
                      </td>

                      {/* Col B: Position (col_pos) */}
                      <td className={`p-0 border-r border-slate-200 text-center font-bold ${cellDropClasses}`}>
                        <div className="flex items-center justify-center h-8">
                          <select
                            value={field.col_pos}
                            onChange={(e) => {
                              const newPos = parseInt(e.target.value, 10);
                              if (!isNaN(newPos) && newPos >= 1 && newPos <= spec.field_catalog.length) {
                                handleReorder(idx, newPos - 1);
                              }
                            }}
                            title="Change column position (COL_POS) directly"
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

                      {/* Col C: Fieldname */}
                      <td
                        onMouseDown={() => handleCellMouseDown(idx, 0)}
                        onMouseEnter={() => handleCellMouseEnter(idx, 0)}
                        className={`p-0 border-r border-slate-200 ${cellDropClasses} ${
                          isCellInRange(selectedRange, idx, 0)
                            ? 'bg-blue-100 ring-1 ring-blue-500'
                            : ''
                        }`}
                      >
                        <input
                          type="text"
                          value={field.fieldname}
                          disabled={isZicon}
                          data-fcell={`${idx}-fieldname`}
                          onFocus={() => {
                            if (!selectedRange) {
                              setSelectedRange({ startRow: idx, startCol: 0, endRow: idx, endCol: 0 });
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

                      {/* Col D: Coltext */}
                      <td
                        onMouseDown={() => handleCellMouseDown(idx, 1)}
                        onMouseEnter={() => handleCellMouseEnter(idx, 1)}
                        className={`p-0 border-r border-slate-200 font-sans ${cellDropClasses} ${
                          isCellInRange(selectedRange, idx, 1)
                            ? 'bg-blue-100 ring-1 ring-blue-500'
                            : ''
                        }`}
                      >
                        <input
                          type="text"
                          value={isZicon ? 'Status' : field.coltext}
                          disabled={isZicon}
                          data-fcell={`${idx}-coltext`}
                          onFocus={() => {
                            if (!selectedRange) {
                              setSelectedRange({ startRow: idx, startCol: 1, endRow: idx, endCol: 1 });
                            }
                          }}
                          onKeyDown={(e) => handleCellKeyDown(e, idx, 'coltext')}
                          onChange={(e) => handleUpdateField(idx, { coltext: e.target.value })}
                          className={`w-full h-8 px-2 bg-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-800 font-medium ${
                            isZicon ? 'opacity-80 bg-slate-50 cursor-not-allowed font-semibold' : ''
                          }`}
                        />
                      </td>

                      {/* Col E: Data Type */}
                      <td
                        onMouseDown={() => handleCellMouseDown(idx, 2)}
                        onMouseEnter={() => handleCellMouseEnter(idx, 2)}
                        className={`p-0 border-r border-slate-200 text-center ${cellDropClasses} ${
                          isCellInRange(selectedRange, idx, 2)
                            ? 'bg-blue-100 ring-1 ring-blue-500'
                            : ''
                        }`}
                      >
                        <select
                          value={field.datatype}
                          disabled={isZicon}
                          data-fcell={`${idx}-datatype`}
                          onFocus={() => {
                            if (!selectedRange) {
                              setSelectedRange({ startRow: idx, startCol: 2, endRow: idx, endCol: 2 });
                            }
                          }}
                          onKeyDown={(e) => handleCellKeyDown(e, idx, 'datatype')}
                          onChange={(e) => {
                            const newType = e.target.value as SapDataType;
                            handleUpdateField(idx, {
                              datatype: newType,
                              ...(newType === 'CHAR' ? { do_sum: false } : {}),
                            });
                          }}
                          className={`w-full h-8 px-1 bg-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono text-[11px] text-slate-800 text-center cursor-pointer ${
                            isZicon ? 'opacity-80 bg-slate-50 cursor-not-allowed' : ''
                          }`}
                        >
                          <option value="CHAR">CHAR</option>
                          <option value="NUMC">NUMC</option>
                          <option value="DATS">DATS</option>
                          <option value="TIMS">TIMS</option>
                          <option value="CURR">CURR</option>
                          <option value="DEC">DEC</option>
                          <option value="UNIT">UNIT</option>
                          <option value="INT4">INT4</option>
                        </select>
                      </td>

                      {/* Col F: Output length */}
                      <td
                        onMouseDown={() => handleCellMouseDown(idx, 3)}
                        onMouseEnter={() => handleCellMouseEnter(idx, 3)}
                        className={`p-0 border-r border-slate-200 text-center ${cellDropClasses} ${
                          isCellInRange(selectedRange, idx, 3)
                            ? 'bg-blue-100 ring-1 ring-blue-500'
                            : ''
                        }`}
                      >
                        <input
                          type="number"
                          value={field.outputlen}
                          disabled={isZicon}
                          data-fcell={`${idx}-outputlen`}
                          onFocus={() => {
                            if (!selectedRange) {
                              setSelectedRange({ startRow: idx, startCol: 3, endRow: idx, endCol: 3 });
                            }
                          }}
                          onKeyDown={(e) => handleCellKeyDown(e, idx, 'outputlen')}
                          onChange={(e) =>
                            handleUpdateField(idx, {
                              outputlen: Number(e.target.value) || 10,
                            })
                          }
                          className={`w-full h-8 px-1 bg-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono text-[11px] text-center ${
                            isZicon ? 'opacity-80 bg-slate-50 cursor-not-allowed' : ''
                          }`}
                        />
                      </td>

                      {/* Col G: Justification (Just) */}
                      <td
                        onMouseDown={() => handleCellMouseDown(idx, 4)}
                        onMouseEnter={() => handleCellMouseEnter(idx, 4)}
                        className={`p-0 border-r border-slate-200 text-center ${cellDropClasses} ${
                          isCellInRange(selectedRange, idx, 4)
                            ? 'bg-blue-100 ring-1 ring-blue-500'
                            : ''
                        }`}
                      >
                        <select
                          value={field.just}
                          disabled={isZicon}
                          data-fcell={`${idx}-just`}
                          onFocus={() => {
                            if (!selectedRange) {
                              setSelectedRange({ startRow: idx, startCol: 4, endRow: idx, endCol: 4 });
                            }
                          }}
                          onKeyDown={(e) => handleCellKeyDown(e, idx, 'just')}
                          onChange={(e) =>
                            handleUpdateField(idx, { just: e.target.value as TextAlignment })
                          }
                          className={`w-full h-8 px-1 bg-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono text-[11px] font-bold text-center cursor-pointer ${
                            isZicon ? 'opacity-80 bg-slate-50 cursor-not-allowed' : ''
                          }`}
                        >
                          <option value="L">L</option>
                          <option value="C">C</option>
                          <option value="R">R</option>
                        </select>
                      </td>

                      {/* Col H: Color */}
                      <td
                        onMouseDown={() => handleCellMouseDown(idx, 5)}
                        onMouseEnter={() => handleCellMouseEnter(idx, 5)}
                        className={`p-0 border-r border-slate-200 text-center ${cellDropClasses} ${
                          isCellInRange(selectedRange, idx, 5)
                            ? 'bg-blue-100 ring-1 ring-blue-500'
                            : ''
                        }`}
                      >
                        <input
                          type="text"
                          value={field.emphasize || ''}
                          disabled={isZicon}
                          data-fcell={`${idx}-emphasize`}
                          onFocus={() => {
                            if (!selectedRange) {
                              setSelectedRange({ startRow: idx, startCol: 5, endRow: idx, endCol: 5 });
                            }
                          }}
                          onKeyDown={(e) => handleCellKeyDown(e, idx, 'emphasize')}
                          onChange={(e) =>
                            handleUpdateField(idx, {
                              emphasize: e.target.value.toUpperCase(),
                            })
                          }
                          placeholder={isZicon ? '' : 'C300'}
                          className={`w-full h-8 px-1 bg-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 uppercase text-center font-bold text-[10px] ${
                            isZicon ? 'opacity-80 bg-slate-50 cursor-not-allowed' : ''
                          }`}
                        />
                      </td>

                      {/* Col I: Key */}
                      <td
                        onMouseDown={() => handleCellMouseDown(idx, 6)}
                        onMouseEnter={() => handleCellMouseEnter(idx, 6)}
                        className={`p-0 border-r border-slate-200 text-center ${cellDropClasses} ${
                          isCellInRange(selectedRange, idx, 6)
                            ? 'bg-blue-100 ring-1 ring-blue-500'
                            : ''
                        }`}
                      >
                        <div className="flex items-center justify-center h-8">
                          <input
                            type="checkbox"
                            checked={isZicon ? true : field.key}
                            disabled={isZicon}
                            onChange={(e) => handleUpdateField(idx, { key: e.target.checked })}
                            className="w-4 h-4 accent-blue-600 rounded cursor-pointer disabled:cursor-not-allowed"
                          />
                        </div>
                      </td>

                      {/* Col J: Hotspot */}
                      <td
                        onMouseDown={() => handleCellMouseDown(idx, 7)}
                        onMouseEnter={() => handleCellMouseEnter(idx, 7)}
                        className={`p-0 border-r border-slate-200 text-center ${cellDropClasses} ${
                          isCellInRange(selectedRange, idx, 7)
                            ? 'bg-blue-100 ring-1 ring-blue-500'
                            : ''
                        }`}
                      >
                        <div className="flex items-center justify-center h-8">
                          <input
                            type="checkbox"
                            checked={isZicon ? false : field.hotspot}
                            disabled={isZicon}
                            onChange={(e) =>
                              handleUpdateField(idx, { hotspot: e.target.checked })
                            }
                            className="w-4 h-4 accent-indigo-600 rounded cursor-pointer disabled:cursor-not-allowed"
                          />
                        </div>
                      </td>

                      {/* Col K: Checkbox (CHK) - Only CHAR with length 1 */}
                      <td
                        onMouseDown={() => handleCellMouseDown(idx, 8)}
                        onMouseEnter={() => handleCellMouseEnter(idx, 8)}
                        className={`p-0 border-r border-slate-200 text-center ${cellDropClasses} ${
                          isCellInRange(selectedRange, idx, 8)
                            ? 'bg-blue-100 ring-1 ring-blue-500'
                            : ''
                        }`}
                      >
                        <div className="flex items-center justify-center h-8">
                          <input
                            type="checkbox"
                            checked={canBeCheckbox && field.checkbox}
                            disabled={!canBeCheckbox}
                            title={
                              canBeCheckbox
                                ? 'Enable ALV Checkbox style'
                                : 'Only CHAR type with LENGTH 1 can be configured as Checkbox (CHK)'
                            }
                            onChange={(e) =>
                              handleUpdateField(idx, { checkbox: e.target.checked })
                            }
                            className={`w-4 h-4 rounded ${
                              !canBeCheckbox
                                ? 'opacity-25 cursor-not-allowed bg-slate-200'
                                : 'accent-slate-700 cursor-pointer'
                            }`}
                          />
                        </div>
                      </td>

                      {/* Col L: Edit */}
                      <td
                        onMouseDown={() => handleCellMouseDown(idx, 9)}
                        onMouseEnter={() => handleCellMouseEnter(idx, 9)}
                        className={`p-0 border-r border-slate-200 text-center ${cellDropClasses} ${
                          isCellInRange(selectedRange, idx, 9)
                            ? 'bg-blue-100 ring-1 ring-blue-500'
                            : ''
                        }`}
                      >
                        <div className="flex items-center justify-center h-8">
                          <input
                            type="checkbox"
                            checked={isZicon ? false : field.edit}
                            disabled={isZicon}
                            onChange={(e) => handleUpdateField(idx, { edit: e.target.checked })}
                            className="w-4 h-4 accent-amber-600 rounded cursor-pointer disabled:cursor-not-allowed"
                          />
                        </div>
                      </td>

                      {/* Col M: Do Sum */}
                      <td
                        onMouseDown={() => handleCellMouseDown(idx, 10)}
                        onMouseEnter={() => handleCellMouseEnter(idx, 10)}
                        className={`p-0 border-r border-slate-200 text-center ${cellDropClasses} ${
                          isCellInRange(selectedRange, idx, 10)
                            ? 'bg-blue-100 ring-1 ring-blue-500'
                            : ''
                        }`}
                      >
                        <div className="flex items-center justify-center h-8">
                          <input
                            type="checkbox"
                            checked={isZicon ? false : field.datatype === 'CHAR' ? false : field.do_sum}
                            disabled={isZicon || field.datatype === 'CHAR'}
                            title={
                              isZicon || field.datatype === 'CHAR'
                                ? 'CHAR fields cannot have total sum (DO_SUM).'
                                : 'Calculate bottom sum (Σ)'
                            }
                            onChange={(e) =>
                              handleUpdateField(idx, { do_sum: e.target.checked })
                            }
                            className={`w-4 h-4 rounded ${
                              isZicon || field.datatype === 'CHAR'
                                ? 'opacity-25 cursor-not-allowed bg-slate-200'
                                : 'accent-emerald-600 cursor-pointer'
                            }`}
                          />
                        </div>
                      </td>

                      {/* Col N: Ref Table */}
                      <td
                        onMouseDown={() => handleCellMouseDown(idx, 11)}
                        onMouseEnter={() => handleCellMouseEnter(idx, 11)}
                        className={`p-0 border-r border-slate-200 ${cellDropClasses} ${
                          isCellInRange(selectedRange, idx, 11)
                            ? 'bg-blue-100 ring-1 ring-blue-500'
                            : ''
                        }`}
                      >
                        <input
                          type="text"
                          value={field.ref_table || ''}
                          disabled={isZicon}
                          data-fcell={`${idx}-ref_table`}
                          onFocus={() => {
                            if (!selectedRange) {
                              setSelectedRange({ startRow: idx, startCol: 11, endRow: idx, endCol: 11 });
                            }
                          }}
                          onKeyDown={(e) => handleCellKeyDown(e, idx, 'ref_table')}
                          onChange={(e) =>
                            handleUpdateField(idx, { ref_table: e.target.value.toUpperCase() })
                          }
                          placeholder={isZicon ? '' : 'VBAK'}
                          className={`w-full h-8 px-2 bg-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 uppercase text-[10px] ${
                            isZicon ? 'opacity-80 bg-slate-50 cursor-not-allowed' : ''
                          }`}
                        />
                      </td>

                      {/* Col O: Ref Field */}
                      <td
                        onMouseDown={() => handleCellMouseDown(idx, 12)}
                        onMouseEnter={() => handleCellMouseEnter(idx, 12)}
                        className={`p-0 border-r border-slate-200 relative ${cellDropClasses} ${
                          isCellInRange(selectedRange, idx, 12)
                            ? 'bg-blue-100 ring-1 ring-blue-500'
                            : ''
                        }`}
                      >
                        <div className="flex items-center h-8">
                          <input
                            type="text"
                            value={field.ref_field || ''}
                            disabled={isZicon}
                            data-fcell={`${idx}-ref_field`}
                            onFocus={() => {
                              if (!selectedRange) {
                                setSelectedRange({ startRow: idx, startCol: 12, endRow: idx, endCol: 12 });
                              }
                            }}
                            onKeyDown={(e) => handleCellKeyDown(e, idx, 'ref_field')}
                            onChange={(e) =>
                              handleUpdateField(idx, { ref_field: e.target.value.toUpperCase() })
                            }
                            placeholder={isZicon ? '' : 'VBELN'}
                            className={`w-full h-full px-2 pr-6 bg-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 uppercase text-[10px] ${
                              isZicon ? 'opacity-80 bg-slate-50 cursor-not-allowed' : ''
                            }`}
                          />
                          {!isZicon && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingFieldIndex(idx);
                                setShowSearchHelp(true);
                              }}
                              title="Search Help (F4)"
                              className="absolute right-1 text-slate-400 hover:text-blue-600 p-0.5 cursor-pointer"
                            >
                              <Search className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Col P: Drilldown T-Code */}
                      <td
                        onMouseDown={() => handleCellMouseDown(idx, 13)}
                        onMouseEnter={() => handleCellMouseEnter(idx, 13)}
                        className={`p-0 border-r border-slate-200 ${cellDropClasses} ${
                          isCellInRange(selectedRange, idx, 13)
                            ? 'bg-blue-100 ring-1 ring-blue-500'
                            : ''
                        }`}
                      >
                        <input
                          type="text"
                          value={field.drilldown_tcode || ''}
                          disabled={isZicon}
                          data-fcell={`${idx}-drilldown_tcode`}
                          onFocus={() => {
                            if (!selectedRange) {
                              setSelectedRange({ startRow: idx, startCol: 13, endRow: idx, endCol: 13 });
                            }
                          }}
                          onKeyDown={(e) => handleCellKeyDown(e, idx, 'drilldown_tcode')}
                          onChange={(e) =>
                            handleUpdateField(idx, {
                              drilldown_tcode: e.target.value.toUpperCase(),
                            })
                          }
                          placeholder={isZicon ? '' : 'VA03'}
                          className={`w-full h-8 px-2 bg-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 uppercase text-[10px] ${
                            isZicon ? 'opacity-80 bg-slate-50 cursor-not-allowed' : ''
                          }`}
                        />
                      </td>

                      {/* Col Q: Actions & Reordering Buttons */}
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
                          <button
                            type="button"
                            onClick={() => handleDeleteField(idx)}
                            disabled={isZicon}
                            title={isZicon ? 'ZICON field cannot be deleted' : 'Delete Field'}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer ml-0.5 disabled:opacity-20 disabled:cursor-not-allowed"
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

      {/* SAP Search Help (F4) Modal */}
      <SapSearchHelpModal
        isOpen={showSearchHelp}
        onClose={() => {
          setShowSearchHelp(false);
          setEditingFieldIndex(null);
        }}
        onSelect={handleSelectSearchHelp}
      />
    </div>
  );
};
