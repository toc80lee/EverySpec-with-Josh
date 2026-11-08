import React, { useState, useMemo } from 'react';
import { Search, Database, Table, Key, Check, X, Filter } from 'lucide-react';
import { SAP_SEARCH_HELP_TABLES, SapTableHelp, SapTableFieldHelp } from '../data/sapSearchHelpData';
import { SapDataType } from '../types/sap';

interface SapSearchHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (selected: {
    table: string;
    field: string;
    label: string;
    datatype: SapDataType;
    length: number;
    description: string;
  }) => void;
  initialTable?: string;
  initialField?: string;
}

export const SapSearchHelpModal: React.FC<SapSearchHelpModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  initialTable = '',
  initialField = '',
}) => {
  const [selectedModule, setSelectedModule] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTable, setActiveTable] = useState<string>(
    initialTable.toUpperCase() || 'VBAK'
  );
  const [selectedField, setSelectedField] = useState<SapTableFieldHelp | null>(null);

  // Filter tables by module and search query
  const filteredTables = useMemo(() => {
    return SAP_SEARCH_HELP_TABLES.filter((t) => {
      const matchModule = selectedModule === 'ALL' || t.module === selectedModule;
      if (!matchModule) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchTable =
        t.table.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q);
      const matchAnyField = t.fields.some(
        (f) =>
          f.field.toLowerCase().includes(q) ||
          f.label.toLowerCase().includes(q) ||
          f.description.toLowerCase().includes(q)
      );
      return matchTable || matchAnyField;
    });
  }, [selectedModule, searchQuery]);

  // Current active table object
  const currentTableObj: SapTableHelp | undefined = useMemo(() => {
    return (
      filteredTables.find((t) => t.table === activeTable) ||
      filteredTables[0] ||
      SAP_SEARCH_HELP_TABLES.find((t) => t.table === activeTable) ||
      SAP_SEARCH_HELP_TABLES[0]
    );
  }, [filteredTables, activeTable]);

  // Filter fields in current table by search query
  const visibleFields = useMemo(() => {
    if (!currentTableObj) return [];
    if (!searchQuery.trim()) return currentTableObj.fields;
    const q = searchQuery.toLowerCase();
    return currentTableObj.fields.filter(
      (f) =>
        f.field.toLowerCase().includes(q) ||
        f.label.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q) ||
        f.datatype.toLowerCase().includes(q)
    );
  }, [currentTableObj, searchQuery]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!selectedField || !currentTableObj) return;
    onSelect({
      table: currentTableObj.table,
      field: selectedField.field,
      label: selectedField.label.replace(/\s*\([^)]*\)/g, '').trim(), // Clean label
      datatype: selectedField.datatype,
      length: selectedField.length,
      description: selectedField.description,
    });
    onClose();
  };

  const handleFieldRowDoubleClick = (fld: SapTableFieldHelp) => {
    if (!currentTableObj) return;
    onSelect({
      table: currentTableObj.table,
      field: fld.field,
      label: fld.label.replace(/\s*\([^)]*\)/g, '').trim(),
      datatype: fld.datatype,
      length: fld.length,
      description: fld.description,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-4xl h-[620px] max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 font-sans">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <Search className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">
                SAP Search Help (F4) — Reference Table & Field Selection
              </h3>
              <p className="text-[11px] text-slate-300">
                Browse standard SAP tables and fields by module, or search by keyword to auto-fill parameters.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toolbar: Search & Module Filters */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          {/* Module Tabs */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500 px-2 flex items-center gap-1">
              <Filter className="w-3 h-3 text-slate-400" />
              Module:
            </span>
            {['ALL', 'SD', 'MM', 'FI', 'CO', 'PP'].map((mod) => (
              <button
                key={mod}
                type="button"
                onClick={() => setSelectedModule(mod)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  selectedModule === mod
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {mod}
              </button>
            ))}
          </div>

          {/* Keyword Search Input */}
          <div className="relative min-w-[240px] flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search table or field (e.g., VBAK, VBELN, Material)..."
              className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Main Body: Master-Detail Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column: Tables List */}
          <div className="w-72 border-r border-slate-200 bg-slate-50 flex flex-col overflow-hidden shrink-0">
            <div className="p-2 border-b border-slate-200 bg-slate-100/80 text-[11px] font-bold text-slate-600 flex items-center justify-between">
              <span>Standard Tables ({filteredTables.length})</span>
              <span className="text-[10px] text-slate-400">Select to view fields</span>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-slate-200/60">
              {filteredTables.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  No tables match your filter.
                </div>
              ) : (
                filteredTables.map((t) => {
                  const isSelected = currentTableObj?.table === t.table;
                  return (
                    <button
                      key={t.table}
                      type="button"
                      onClick={() => {
                        setActiveTable(t.table);
                        setSelectedField(null);
                      }}
                      className={`w-full text-left p-2.5 transition-colors cursor-pointer flex items-start gap-2.5 ${
                        isSelected
                          ? 'bg-blue-50 border-l-4 border-blue-600 text-blue-950 font-semibold'
                          : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <Table className={`w-4 h-4 shrink-0 mt-0.5 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-mono text-xs font-bold text-slate-900">
                            {t.table}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200/80 font-mono text-slate-700 font-bold">
                            {t.module}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5" title={t.name}>
                          {t.name}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Fields in Selected Table */}
          <div className="flex-1 flex flex-col overflow-hidden bg-white">
            {/* Table Summary Bar */}
            {currentTableObj && (
              <div className="px-4 py-2 bg-blue-50/60 border-b border-blue-100 flex items-center justify-between">
                <div>
                  <span className="font-mono font-bold text-xs text-blue-900 mr-2">
                    {currentTableObj.table}
                  </span>
                  <span className="text-xs text-slate-700 font-semibold">
                    {currentTableObj.name}
                  </span>
                </div>
                <span className="text-[11px] text-blue-700 font-medium">
                  {visibleFields.length} fields available
                </span>
              </div>
            )}

            {/* Fields Table */}
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold sticky top-0 z-10 text-[11px]">
                  <tr>
                    <th className="py-2 px-3 w-10 text-center">Key</th>
                    <th className="py-2 px-3 min-w-28 font-mono">Field Name</th>
                    <th className="py-2 px-3 min-w-36">Field Label</th>
                    <th className="py-2 px-3 w-20">Type</th>
                    <th className="py-2 px-3 w-16 text-center">Length</th>
                    <th className="py-2 px-3">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleFields.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No fields found in this table matching the query.
                      </td>
                    </tr>
                  ) : (
                    visibleFields.map((fld) => {
                      const isChosen =
                        selectedField?.field === fld.field &&
                        currentTableObj?.table === activeTable;

                      return (
                        <tr
                          key={fld.field}
                          onClick={() => setSelectedField(fld)}
                          onDoubleClick={() => handleFieldRowDoubleClick(fld)}
                          className={`cursor-pointer transition-colors ${
                            isChosen
                              ? 'bg-blue-100/80 text-blue-950 font-semibold'
                              : 'hover:bg-slate-50 text-slate-800'
                          }`}
                        >
                          <td className="py-2 px-3 text-center">
                            {fld.isKey ? (
                              <Key className="w-3.5 h-3.5 text-blue-700 inline-block" />
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                          <td className="py-2 px-3 font-mono font-bold text-blue-900">
                            {fld.field}
                          </td>
                          <td className="py-2 px-3 font-medium text-slate-800">
                            {fld.label}
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-600">
                            {fld.datatype}
                          </td>
                          <td className="py-2 px-3 text-center font-mono text-slate-600">
                            {fld.length}
                          </td>
                          <td className="py-2 px-3 text-[11px] text-slate-500">
                            {fld.description}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Selected Field Confirmation Card */}
            {selectedField && currentTableObj && (
              <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-medium">Selected:</span>
                  <span className="font-mono font-bold text-blue-900 bg-white px-2 py-0.5 rounded border border-blue-200">
                    {currentTableObj.table}-{selectedField.field}
                  </span>
                  <span className="text-slate-700 font-semibold">
                    {selectedField.label}
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    ({selectedField.datatype}, len: {selectedField.length})
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">
                  Double-click row or click 'Apply Selection'
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            Tip: Selecting a field automatically sets Reference Table, Reference Field, Data Type, and Length.
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!selectedField}
              className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply Selection</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
