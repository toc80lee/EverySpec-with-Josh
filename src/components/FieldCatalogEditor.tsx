import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Database,
  Sparkles,
  Link,
  DollarSign,
  CheckSquare,
  Key,
  GripVertical,
  ArrowUpToLine,
  ArrowDownToLine,
  ListOrdered,
  Table as TableIcon,
  Check,
  Search,
} from 'lucide-react';
import { AlvField, ProgramSpec, SapDataType, TextAlignment } from '../types/sap';
import { SAP_DICTIONARY_PRESETS, presetToAlvField } from '../data/sapDictionary';
import { SapSearchHelpModal } from './SapSearchHelpModal';

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
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<string>('');
  const [viewMode, setViewMode] = useState<'table' | 'sortable_list'>('table');
  const [reorderNotice, setReorderNotice] = useState<string | null>(null);
  const [showSearchHelp, setShowSearchHelp] = useState(false);
  const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(null);

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
      // Add as new field from search help
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

  // Reorder field catalog and automatically update col_pos for each field
  // Reorder field catalog and automatically update col_pos for each field
  const handleReorder = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || toIndex < 0 || toIndex >= spec.field_catalog.length) return;

    if (onReorder) {
      onReorder(fromIndex, toIndex);
    } else {
      const list = [...spec.field_catalog];
      const [movedItem] = list.splice(fromIndex, 1);
      list.splice(toIndex, 0, movedItem);

      // Automatically update col_pos for each field accordingly (1-indexed sequential: 1, 2, 3...)
      const renumbered = list.map((field, idx) => ({
        ...field,
        col_pos: idx + 1,
      }));

      onChange(renumbered);
    }

    const fieldName = spec.field_catalog[fromIndex]?.fieldname || 'Field';
    setReorderNotice(`Field '${fieldName}' moved to position ${toIndex + 1}. (COL_POS automatically re-indexed)`);
    setTimeout(() => setReorderNotice(null), 3000);
  };

  // Drag and Drop Event Handlers
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
    // Only reset if leaving current target
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

    // Dropped right before or after itself means no change
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

  // Add from SAP Dictionary preset
  const handleAddPreset = () => {
    if (!selectedPresetIndex) return;
    const preset = SAP_DICTIONARY_PRESETS[Number(selectedPresetIndex)];
    if (!preset) return;

    // Check if field already exists
    const exists = spec.field_catalog.some((f) => f.fieldname === preset.field);
    const nextPos = spec.field_catalog.length + 1;
    const newField = presetToAlvField(preset, nextPos);
    if (exists) {
      newField.fieldname = `${preset.field}_${nextPos}`;
    }

    const nextCatalog = [...spec.field_catalog, newField];
    onChange(nextCatalog);
    setSelectedPresetIndex('');
  };

  // Delete field
  const handleDeleteField = (index: number) => {
    const deletedName = spec.field_catalog[index]?.fieldname || 'Field';
    const nextCatalog = spec.field_catalog
      .filter((_, i) => i !== index)
      .map((f, i) => ({ ...f, col_pos: i + 1 }));
    onChange(nextCatalog);
    setReorderNotice(`Field '${deletedName}' deleted. (COL_POS automatically re-indexed 1 to ${nextCatalog.length})`);
    setTimeout(() => setReorderNotice(null), 3000);
  };

  // Update single field property with stable in-place mutation
  const handleUpdateField = (index: number, patch: Partial<AlvField>) => {
    const nextCatalog = spec.field_catalog.map((f, i) => (i === index ? { ...f, ...patch } : f));
    onChange(nextCatalog);
  };

  // Generate realistic mock data rows based on current fields
  const handleGenerateMockData = () => {
    const newRows: Record<string, any>[] = [];
    const count = 5;

    for (let i = 0; i < count; i++) {
      const row: Record<string, any> = {};

      spec.field_catalog.forEach((f) => {
        if (f.fieldname === 'ZICON' || f.fieldname === 'STATUS' || f.fieldname === 'LIGHTS') {
          row[f.fieldname] = String((i % 3) + 1);
        } else if (f.fieldname === 'CHECKBOX') {
          row[f.fieldname] = i === 1 ? 'X' : ' ';
        } else if (f.datatype === 'CURR' || f.datatype === 'DEC') {
          row[f.fieldname] = (i + 1) * 1250000;
        } else if (f.datatype === 'DATS') {
          row[f.fieldname] = `2026.10.${String(i + 10).padStart(2, '0')}`;
        } else if (f.datatype === 'TIMS') {
          row[f.fieldname] = `09:30:${String(i * 12).padStart(2, '0')}`;
        } else if (f.datatype === 'UNIT') {
          row[f.fieldname] = 'EA';
        } else if (f.fieldname.includes('VBELN') || f.fieldname.includes('DOC_NO')) {
          row[f.fieldname] = `DOC-${String(2026001 + i)}`;
        } else if (f.fieldname.includes('KUNNR') || f.fieldname.includes('PARTNER')) {
          const partners = [
            '삼성전자 화성사업장',
            '현대자동차 남양연구소',
            'LG에너지솔루션 오창',
            'SK하이닉스 이천공장',
            '포스코 광양제철소',
          ];
          row[f.fieldname] = partners[i % partners.length];
        } else {
          row[f.fieldname] = `VAL_${f.fieldname}_${i + 1}`;
        }
      });

      newRows.push(row);
    }

    onChange(spec.field_catalog, newRows);
  };

  return (
    <div className="space-y-3 font-sans">
      {/* 1. Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 shadow-2xs">
        {/* Left: Add Preset & Manual */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-md p-1 shadow-2xs">
            <Database className="w-3.5 h-3.5 text-blue-700 ml-1 shrink-0" />
            <select
              value={selectedPresetIndex}
              onChange={(e) => setSelectedPresetIndex(e.target.value)}
              className="text-xs bg-transparent text-slate-800 focus:outline-none font-sans cursor-pointer"
            >
              <option value="">Select SAP Standard Dictionary Preset...</option>
              {SAP_DICTIONARY_PRESETS.map((p, idx) => (
                <option key={`${p.table}-${p.field}-${idx}`} value={idx}>
                  [{p.module}] {p.table}-{p.field}: {p.label} ({p.type})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleAddPreset}
              disabled={!selectedPresetIndex}
              className="px-2.5 py-1 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-40 rounded transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Preset</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleAddNewField}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-md transition-colors flex items-center gap-1 shrink-0 shadow-2xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-slate-500" />
            <span>Add Field</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingFieldIndex(null);
              setShowSearchHelp(true);
            }}
            className="px-3 py-1.5 text-xs font-semibold text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-300 rounded-md transition-colors flex items-center gap-1.5 shrink-0 shadow-2xs cursor-pointer"
            title="Open SAP Dictionary Search Help (F4) by module"
          >
            <Search className="w-3.5 h-3.5 text-blue-600" />
            <span>Search Help (F4)</span>
          </button>
        </div>

        {/* Right: View Mode Toggle & Mock Data */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Toggle: Table View vs Sortable List View */}
          <div className="flex items-center bg-white border border-slate-300 rounded-lg p-0.5 shadow-2xs text-xs">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1 rounded-md font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Table Grid View (Drag & drop support)"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Table View</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('sortable_list')}
              className={`px-2.5 py-1 rounded-md font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'sortable_list'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Sortable Card List (Drag & drop and quick shift)"
            >
              <ListOrdered className="w-3.5 h-3.5" />
              <span>Sortable List Mode</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleGenerateMockData}
            title="Automatically generate realistic mock data rows for the ALV grid"
            className="px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-md transition-colors flex items-center gap-1.5 shrink-0 shadow-2xs cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Generate Mock Data</span>
          </button>
        </div>
      </div>

      {/* Helpful Drag-and-Drop Guide Banner */}
      <div className="px-3.5 py-2 bg-gradient-to-r from-blue-50 to-indigo-50/60 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-center justify-between flex-wrap gap-2 shadow-2xs">
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="font-bold">Reorder ALV Columns:</span>
          <span className="text-blue-800">
            Drag the <strong>grip handle (⋮⋮)</strong> up or down, or choose a number in the <strong>POS</strong> selector to easily change column positions.
            All <strong>`COL_POS`</strong> values are automatically re-indexed from 1 to {spec.field_catalog.length}.
          </span>
        </div>
        <span className="font-mono text-xs text-blue-700 bg-white px-2.5 py-0.5 rounded border border-blue-200 font-semibold shadow-2xs">
          Total {spec.field_catalog.length} Columns
        </span>
      </div>

      {/* Reorder Success Feedback Toast */}
      {reorderNotice && (
        <div className="px-3 py-1.5 bg-emerald-600 text-white text-xs rounded-md font-medium flex items-center gap-2 shadow-sm animate-in fade-in duration-150">
          <Check className="w-3.5 h-3.5" />
          <span>{reorderNotice}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW MODE 1: SORTABLE CARD LIST (Reorder Mode)                            */}
      {/* ========================================================================= */}
      {viewMode === 'sortable_list' && (
        <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 pb-2 border-b border-slate-200">
            <span>Field Order Card List (Drag & Drop or Click to Reorder)</span>
            <span className="text-[11px] text-slate-500 font-normal">
              Drag cards or use buttons to automatically re-index COL_POS.
            </span>
          </div>

          <div className="space-y-1.5 max-h-[520px] overflow-y-auto pr-1">
            {spec.field_catalog.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No fields registered. Please add fields above.
              </div>
            ) : (
              spec.field_catalog.map((field, idx) => {
                const isDragging = draggedIndex === idx;
                const isOver = dragOverIndex === idx;
                const isDropTop = isOver && dragPosition === 'top';
                const isDropBottom = isOver && dragPosition === 'bottom';

                return (
                  <div
                    key={field.id || field.fieldname}
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, idx)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center justify-between p-2.5 rounded-lg border transition-all cursor-move select-none relative ${
                      isDragging
                        ? 'opacity-40 bg-blue-50 border-2 border-dashed border-blue-500 shadow-md'
                        : isDropTop
                        ? 'bg-blue-50/90 border-slate-200 border-t-4 border-t-blue-600 shadow-md'
                        : isDropBottom
                        ? 'bg-blue-50/90 border-slate-200 border-b-4 border-b-blue-600 shadow-md'
                        : 'bg-white hover:bg-slate-50 border-slate-200 shadow-2xs'
                    }`}
                  >
                    {/* Left: Drag Grip Handle & Sequence Info */}
                    <div className="flex items-center gap-3">
                      <div
                        title="Drag to reorder column"
                        className="p-1 text-slate-400 hover:text-blue-700 cursor-grab active:cursor-grabbing"
                      >
                        <GripVertical className="w-4 h-4" />
                      </div>

                      {/* COL_POS Badge & Selector */}
                      <select
                        value={field.col_pos}
                        onChange={(e) => {
                          const newPos = parseInt(e.target.value, 10);
                          if (!isNaN(newPos) && newPos >= 1 && newPos <= spec.field_catalog.length) {
                            handleReorder(idx, newPos - 1);
                          }
                        }}
                        title="Change column position (COL_POS) directly"
                        className="w-10 h-8 rounded-md bg-blue-100 hover:bg-blue-200 text-blue-900 font-mono font-bold text-xs border border-blue-200 shadow-2xs text-center cursor-pointer focus:bg-white focus:border-blue-500"
                      >
                        {spec.field_catalog.map((_, pIdx) => (
                          <option key={pIdx + 1} value={pIdx + 1}>
                            {pIdx + 1}
                          </option>
                        ))}
                      </select>

                      {/* Field Identity */}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900 text-xs">
                            {field.fieldname}
                          </span>
                          <span className="text-slate-700 text-xs font-semibold">
                            {field.coltext}
                          </span>
                          {field.key && (
                            <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.2 rounded">
                              KEY
                            </span>
                          )}
                          {field.hotspot && (
                            <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-1.5 py-0.2 rounded">
                              HOTSPOT
                            </span>
                          )}
                          {field.do_sum && (
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                              SUM (Σ)
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2 mt-0.5">
                          <span>
                            Type: {field.datatype}({field.outputlen})
                          </span>
                          <span>|</span>
                          <span>Align: {field.just}</span>
                          {field.ref_table && (
                            <>
                              <span>|</span>
                              <span>
                                Ref: {field.ref_table}-{field.ref_field}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Quick Reorder Buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleReorder(idx, 0)}
                        disabled={idx === 0}
                        title="Move to Top (COL_POS 1)"
                        className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded disabled:opacity-20 cursor-pointer"
                      >
                        <ArrowUpToLine className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReorder(idx, idx - 1)}
                        disabled={idx === 0}
                        title="Move Up (Auto-updates COL_POS)"
                        className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded disabled:opacity-20 cursor-pointer"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReorder(idx, idx + 1)}
                        disabled={idx === spec.field_catalog.length - 1}
                        title="Move Down (Auto-updates COL_POS)"
                        className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded disabled:opacity-20 cursor-pointer"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReorder(idx, spec.field_catalog.length - 1)}
                        disabled={idx === spec.field_catalog.length - 1}
                        title="Move to Bottom (COL_POS Last)"
                        className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded disabled:opacity-20 cursor-pointer"
                      >
                        <ArrowDownToLine className="w-3.5 h-3.5" />
                      </button>
                      <div className="h-4 w-px bg-slate-200 mx-0.5" />
                      <button
                        type="button"
                        onClick={() => handleDeleteField(idx)}
                        title={`Delete field '${field.fieldname}' (Auto-updates COL_POS)`}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW MODE 2: FULL TABLE WITH DRAG AND DROP HANDLES                         */}
      {/* ========================================================================= */}
      {viewMode === 'table' && (
        <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-2.5 px-2 text-center w-8" title="Drag grip to reorder column sequence">
                    ↕
                  </th>
                  <th className="py-2.5 px-2 text-center w-14" title="Column Position (COL_POS)">
                    POS
                  </th>
                  <th className="py-2.5 px-2 min-w-32">FIELDNAME</th>
                  <th className="py-2.5 px-2 min-w-36">COLTEXT</th>
                  <th className="py-2.5 px-2 w-24">Type</th>
                  <th className="py-2.5 px-2 w-16 text-center">Length</th>
                  <th className="py-2.5 px-2 w-16 text-center">Just</th>
                  <th
                    className="py-2.5 px-2 w-16 text-center"
                    title="SAP ALV Color Code (e.g., C300, C100, C500, C600)"
                  >
                    Color
                  </th>
                  <th className="py-2.5 px-2 text-center w-12" title="Key Field (Fixed column)">
                    <span className="flex items-center justify-center gap-0.5 text-blue-700">
                      <Key className="w-3 h-3" /> Key
                    </span>
                  </th>
                  <th className="py-2.5 px-2 text-center w-14" title="Hotspot (Clickable link / drilldown)">
                    <span className="flex items-center justify-center gap-0.5 text-indigo-700">
                      <Link className="w-3 h-3" /> Hotspot
                    </span>
                  </th>
                  <th className="py-2.5 px-2 text-center w-12" title="Checkbox style">
                    <span className="flex items-center justify-center gap-0.5 text-slate-700">
                      <CheckSquare className="w-3 h-3" /> Chk
                    </span>
                  </th>
                  <th className="py-2.5 px-2 text-center w-12" title="Edit (Direct in-grid cell editing)">
                    Edit
                  </th>
                  <th
                    className="py-2.5 px-2 text-center w-12"
                    title="DO_SUM (Bottom total calculation - disabled for CHAR)"
                  >
                    <span className="flex items-center justify-center gap-0.5 text-emerald-700">
                      <DollarSign className="w-3 h-3" /> Σ
                    </span>
                  </th>
                  <th className="py-2.5 px-2 w-24">Ref.Table</th>
                  <th className="py-2.5 px-2 w-24">Ref.Field</th>
                  <th className="py-2.5 px-2 w-24">T-Code</th>
                  <th className="py-2.5 px-2 text-center w-36">Manage / Order</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {spec.field_catalog.length === 0 ? (
                  <tr>
                    <td colSpan={17} className="py-8 text-center text-slate-400 font-sans">
                      No fields configured. Select from SAP standard presets above or add fields directly.
                    </td>
                  </tr>
                ) : (
                  spec.field_catalog.map((field, idx) => {
                    const stableKey = field.id || `fld-pos-${idx}`;
                    const isDragging = draggedIndex === idx;
                    const isOver = dragOverIndex === idx;
                    const isDropTop = isOver && dragPosition === 'top';
                    const isDropBottom = isOver && dragPosition === 'bottom';

                    const cellDropClasses = isDropTop
                      ? 'border-t-2 border-t-blue-600 bg-blue-50/70'
                      : isDropBottom
                      ? 'border-b-2 border-b-blue-600 bg-blue-50/70'
                      : isDragging
                      ? 'opacity-35 bg-slate-100'
                      : '';

                    return (
                      <tr
                        key={stableKey}
                        onDragOver={(e) => handleDragOver(e, idx)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, idx)}
                        className={`transition-colors ${
                          isDragging ? 'opacity-35 bg-slate-100' : 'hover:bg-slate-50/80'
                        }`}
                      >
                        {/* Drag Handle Column */}
                        <td className={`py-2 px-1 text-center ${cellDropClasses}`}>
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

                        {/* Position (col_pos) */}
                        <td className={`py-1.5 px-1.5 text-center font-bold ${cellDropClasses}`}>
                          <div className="flex items-center justify-center">
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

                        {/* Fieldname */}
                        <td className={`py-1.5 px-2 ${cellDropClasses}`}>
                          <input
                            type="text"
                            value={field.fieldname}
                            onChange={(e) =>
                              handleUpdateField(idx, { fieldname: e.target.value })
                            }
                            onBlur={(e) =>
                              handleUpdateField(idx, {
                                fieldname: e.target.value.trim().toUpperCase(),
                              })
                            }
                            className="w-full bg-slate-50 border border-slate-200 px-2 py-1 rounded focus:bg-white focus:border-blue-500 uppercase font-bold text-slate-800"
                          />
                        </td>

                        {/* Coltext */}
                        <td className={`py-1.5 px-2 font-sans ${cellDropClasses}`}>
                          <input
                            type="text"
                            value={field.coltext}
                            onChange={(e) => handleUpdateField(idx, { coltext: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 px-2 py-1 rounded focus:bg-white focus:border-blue-500 text-slate-800 font-medium"
                          />
                        </td>

                        {/* Data Type */}
                        <td className={`py-1.5 px-2 ${cellDropClasses}`}>
                          <select
                            value={field.datatype}
                            onChange={(e) => {
                              const newType = e.target.value as SapDataType;
                              handleUpdateField(idx, {
                                datatype: newType,
                                ...(newType === 'CHAR' ? { do_sum: false } : {}),
                              });
                            }}
                            className="w-full bg-slate-50 border border-slate-200 px-1 py-1 rounded focus:bg-white focus:border-blue-500 text-slate-700"
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

                        {/* Output length */}
                        <td className={`py-1.5 px-2 ${cellDropClasses}`}>
                          <input
                            type="number"
                            value={field.outputlen}
                            onChange={(e) =>
                              handleUpdateField(idx, {
                                outputlen: Number(e.target.value) || 10,
                              })
                            }
                            className="w-full bg-slate-50 border border-slate-200 px-1.5 py-1 rounded focus:bg-white focus:border-blue-500 text-center"
                          />
                        </td>

                        {/* Justification (Just) */}
                        <td className={`py-1.5 px-2 ${cellDropClasses}`}>
                          <select
                            value={field.just}
                            onChange={(e) =>
                              handleUpdateField(idx, { just: e.target.value as TextAlignment })
                            }
                            className="w-full bg-slate-50 border border-slate-200 px-1 py-1 rounded focus:bg-white focus:border-blue-500 text-center font-bold"
                          >
                            <option value="L">L</option>
                            <option value="C">C</option>
                            <option value="R">R</option>
                          </select>
                        </td>

                        {/* Color */}
                        <td className={`py-1.5 px-2 ${cellDropClasses}`}>
                          <input
                            type="text"
                            value={field.emphasize || ''}
                            onChange={(e) =>
                              handleUpdateField(idx, {
                                emphasize: e.target.value.toUpperCase(),
                              })
                            }
                            placeholder="C300"
                            title="SAP ALV 색상코드 (예: C300, C310, C100, C500, C600)"
                            className="w-full bg-slate-50 border border-slate-200 px-1 py-1 rounded focus:bg-white focus:border-blue-500 uppercase text-center font-bold text-[10px]"
                          />
                        </td>

                        {/* Key */}
                        <td className={`py-1.5 px-2 text-center ${cellDropClasses}`}>
                          <input
                            type="checkbox"
                            checked={field.key}
                            onChange={(e) => handleUpdateField(idx, { key: e.target.checked })}
                            className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                          />
                        </td>

                        {/* Hotspot */}
                        <td className={`py-1.5 px-2 text-center ${cellDropClasses}`}>
                          <input
                            type="checkbox"
                            checked={field.hotspot}
                            onChange={(e) =>
                              handleUpdateField(idx, { hotspot: e.target.checked })
                            }
                            className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                          />
                        </td>

                        {/* Checkbox */}
                        <td className={`py-1.5 px-2 text-center ${cellDropClasses}`}>
                          <input
                            type="checkbox"
                            checked={field.checkbox}
                            onChange={(e) =>
                              handleUpdateField(idx, { checkbox: e.target.checked })
                            }
                            className="w-4 h-4 accent-slate-700 rounded cursor-pointer"
                          />
                        </td>

                        {/* Edit */}
                        <td className={`py-1.5 px-2 text-center ${cellDropClasses}`}>
                          <input
                            type="checkbox"
                            checked={field.edit}
                            onChange={(e) => handleUpdateField(idx, { edit: e.target.checked })}
                            className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                          />
                        </td>

                        {/* Do Sum */}
                        <td className={`py-1.5 px-2 text-center ${cellDropClasses}`}>
                          <input
                            type="checkbox"
                            checked={field.datatype === 'CHAR' ? false : field.do_sum}
                            disabled={field.datatype === 'CHAR'}
                            title={
                              field.datatype === 'CHAR'
                                ? 'CHAR fields cannot have total sum (DO_SUM).'
                                : 'Calculate bottom sum (Σ)'
                            }
                            onChange={(e) =>
                              handleUpdateField(idx, { do_sum: e.target.checked })
                            }
                            className={`w-4 h-4 rounded ${
                              field.datatype === 'CHAR'
                                ? 'opacity-25 cursor-not-allowed bg-slate-200'
                                : 'accent-emerald-600 cursor-pointer'
                            }`}
                          />
                        </td>

                        {/* Ref Table */}
                        <td className={`py-1.5 px-2 ${cellDropClasses}`}>
                          <input
                            type="text"
                            value={field.ref_table || ''}
                            onChange={(e) =>
                              handleUpdateField(idx, { ref_table: e.target.value.toUpperCase() })
                            }
                            placeholder="VBAK"
                            className="w-full bg-slate-50 border border-slate-200 px-1.5 py-1 rounded focus:bg-white focus:border-blue-500 uppercase text-[10px]"
                          />
                        </td>

                        {/* Ref Field */}
                        <td className={`py-1.5 px-2 ${cellDropClasses}`}>
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={field.ref_field || ''}
                              onChange={(e) =>
                                handleUpdateField(idx, { ref_field: e.target.value.toUpperCase() })
                              }
                              placeholder="VBELN"
                              className="w-full bg-slate-50 border border-slate-200 px-1.5 py-1 rounded focus:bg-white focus:border-blue-500 uppercase text-[10px]"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setEditingFieldIndex(idx);
                                setShowSearchHelp(true);
                              }}
                              title="Search Help (F4)"
                              className="p-1 text-slate-400 hover:text-blue-600 cursor-pointer"
                            >
                              <Search className="w-3 h-3" />
                            </button>
                          </div>
                        </td>

                        {/* Drilldown T-Code */}
                        <td className={`py-1.5 px-2 ${cellDropClasses}`}>
                          <input
                            type="text"
                            value={field.drilldown_tcode || ''}
                            onChange={(e) =>
                              handleUpdateField(idx, {
                                drilldown_tcode: e.target.value.toUpperCase(),
                              })
                            }
                            placeholder="VA03"
                            className="w-full bg-slate-50 border border-slate-200 px-1.5 py-1 rounded focus:bg-white focus:border-blue-500 uppercase text-[10px]"
                          />
                        </td>

                        {/* Actions & Reordering Buttons */}
                        <td className={`py-1.5 px-2 text-center ${cellDropClasses}`}>
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
                              title="Move Up (Auto-updates COL_POS)"
                              className="p-1 text-slate-400 hover:text-blue-700 hover:bg-blue-50 rounded disabled:opacity-20 cursor-pointer"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReorder(idx, idx + 1)}
                              disabled={idx === spec.field_catalog.length - 1}
                              title="Move Down (Auto-updates COL_POS)"
                              className="p-1 text-slate-400 hover:text-blue-700 hover:bg-blue-50 rounded disabled:opacity-20 cursor-pointer"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReorder(idx, spec.field_catalog.length - 1)}
                              disabled={idx === spec.field_catalog.length - 1}
                              title="Move to Bottom (COL_POS Last)"
                              className="p-1 text-slate-400 hover:text-blue-700 hover:bg-blue-50 rounded disabled:opacity-20 cursor-pointer"
                            >
                              <ArrowDownToLine className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteField(idx)}
                              title="Delete Field"
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer ml-0.5"
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
      )}

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
