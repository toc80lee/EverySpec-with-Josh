import React, { useState, useMemo, useEffect } from 'react';
import { Search, Database, Table, Key, Check, X, Filter, Settings2 } from 'lucide-react';
import { SapDataType, SapDD02LTable, SapDD03LField } from '../types/sap';
import { getDD02LTables, getDD03LFields } from '../utils/sapDdicStorage';
import { SapDdicManagerModal } from './SapDdicManagerModal';

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
  const [selectedField, setSelectedField] = useState<SapDD03LField | null>(null);

  // DDIC manager modal state
  const [isDdicManagerOpen, setIsDdicManagerOpen] = useState(false);
  const [ddicVersion, setDdicVersion] = useState(0);

  // Load tables and fields from DDIC DB (DD02L and DD03L)
  const dd02lTables: SapDD02LTable[] = useMemo(() => {
    return getDD02LTables();
  }, [ddicVersion]);

  const dd03lFields: SapDD03LField[] = useMemo(() => {
    return getDD03LFields();
  }, [ddicVersion]);

  // Sync activeTable if not exists
  useEffect(() => {
    if (dd02lTables.length > 0 && !dd02lTables.some((t) => t.tabname === activeTable)) {
      setActiveTable(dd02lTables[0].tabname);
    }
  }, [dd02lTables, activeTable]);

  // Filter tables by module and search query
  const filteredTables = useMemo(() => {
    return dd02lTables.filter((t) => {
      const matchModule = selectedModule === 'ALL' || t.module === selectedModule;
      if (!matchModule) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchTable =
        t.tabname.toLowerCase().includes(q) ||
        t.ddtext.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q));

      const tableFields = dd03lFields.filter((f) => f.tabname === t.tabname);
      const matchAnyField = tableFields.some(
        (f) =>
          f.fieldname.toLowerCase().includes(q) ||
          f.scrtext_l.toLowerCase().includes(q) ||
          f.ddtext.toLowerCase().includes(q)
      );
      return matchTable || matchAnyField;
    });
  }, [dd02lTables, dd03lFields, selectedModule, searchQuery]);

  // Current active table object
  const currentTableObj: SapDD02LTable | undefined = useMemo(() => {
    return (
      filteredTables.find((t) => t.tabname === activeTable) ||
      filteredTables[0] ||
      dd02lTables.find((t) => t.tabname === activeTable) ||
      dd02lTables[0]
    );
  }, [filteredTables, activeTable, dd02lTables]);

  // Filter fields in current table by search query
  const visibleFields = useMemo(() => {
    if (!currentTableObj) return [];
    const fieldsInTable = dd03lFields.filter(
      (f) => f.tabname.toUpperCase() === currentTableObj.tabname.toUpperCase()
    );
    if (!searchQuery.trim()) return fieldsInTable;
    const q = searchQuery.toLowerCase();
    return fieldsInTable.filter(
      (f) =>
        f.fieldname.toLowerCase().includes(q) ||
        f.scrtext_l.toLowerCase().includes(q) ||
        f.ddtext.toLowerCase().includes(q) ||
        f.datatype.toLowerCase().includes(q)
    );
  }, [currentTableObj, dd03lFields, searchQuery]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!selectedField || !currentTableObj) return;
    onSelect({
      table: currentTableObj.tabname,
      field: selectedField.fieldname,
      label: selectedField.scrtext_l.replace(/\s*\([^)]*\)/g, '').trim(),
      datatype: selectedField.datatype,
      length: selectedField.leng,
      description: selectedField.ddtext || selectedField.scrtext_l,
    });
    onClose();
  };

  const handleFieldRowDoubleClick = (fld: SapDD03LField) => {
    if (!currentTableObj) return;
    onSelect({
      table: currentTableObj.tabname,
      field: fld.fieldname,
      label: fld.scrtext_l.replace(/\s*\([^)]*\)/g, '').trim(),
      datatype: fld.datatype,
      length: fld.leng,
      description: fld.ddtext || fld.scrtext_l,
    });
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5">
        <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-5xl h-[640px] max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 font-sans">
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
                  SAP 딕셔너리 DB(DD02L 테이블/DD03L 필드)를 검색하여 사양서 파라미터를 자동 완성합니다.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsDdicManagerOpen(true)}
                title="SAP 데이터 딕셔너리 테이블/필드 관리 (SE11)"
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Database className="w-3.5 h-3.5" />
                <span>DDIC 관리자 (DD02L/DD03L)</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Toolbar: Search & Module Filters */}
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
            {/* Module Tabs */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 px-2 flex items-center gap-1">
                <Filter className="w-3 h-3 text-slate-400" />
                Module:
              </span>
              {['ALL', 'SD', 'MM', 'FI', 'CO', 'PP', 'CUSTOM'].map((mod) => (
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
            <div className="relative flex-1 sm:max-w-xs min-w-48">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search table or field (e.g., VBAK, VBELN, Material)..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* Main 2-Column Split: Tables on Left, Fields on Right */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left Column: Tables List */}
            <div className="w-72 sm:w-80 border-r border-slate-200 flex flex-col bg-slate-50 shrink-0">
              <div className="px-3.5 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600 font-semibold">
                <span>Tables ({filteredTables.length})</span>
                <span className="text-[10px] text-slate-400">Select to view fields</span>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-slate-200/60">
                {filteredTables.length === 0 ? (
                  <div className="p-5 text-center text-xs text-slate-400">
                    No tables match your filter criteria.
                  </div>
                ) : (
                  filteredTables.map((t) => {
                    const isSelected = currentTableObj?.tabname === t.tabname;
                    return (
                      <button
                        key={t.tabname}
                        type="button"
                        onClick={() => {
                          setActiveTable(t.tabname);
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
                              {t.tabname}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200/80 font-mono text-slate-700 font-bold">
                              {t.module}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5" title={t.ddtext}>
                            {t.ddtext}
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
                      {currentTableObj.tabname}
                    </span>
                    <span className="text-xs text-slate-700 font-semibold">
                      {currentTableObj.ddtext}
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
                          selectedField?.fieldname === fld.fieldname &&
                          currentTableObj?.tabname === activeTable;

                        return (
                          <tr
                            key={fld.id || fld.fieldname}
                            onClick={() => setSelectedField(fld)}
                            onDoubleClick={() => handleFieldRowDoubleClick(fld)}
                            className={`cursor-pointer transition-colors ${
                              isChosen
                                ? 'bg-blue-100/80 text-blue-950 font-semibold'
                                : 'hover:bg-slate-50 text-slate-800'
                            }`}
                          >
                            <td className="py-2 px-3 text-center">
                              {fld.keyflag ? (
                                <Key className="w-3.5 h-3.5 text-blue-700 inline-block" />
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                            <td className="py-2 px-3 font-mono font-bold text-blue-900">
                              {fld.fieldname}
                            </td>
                            <td className="py-2 px-3 font-medium text-slate-800">
                              {fld.scrtext_l}
                            </td>
                            <td className="py-2 px-3 font-mono text-slate-600">
                              {fld.datatype}
                            </td>
                            <td className="py-2 px-3 text-center font-mono text-slate-600">
                              {fld.leng}
                            </td>
                            <td className="py-2 px-3 text-[11px] text-slate-500">
                              {fld.ddtext}
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
                      {currentTableObj.tabname}-{selectedField.fieldname}
                    </span>
                    <span className="text-slate-700 font-semibold">
                      {selectedField.scrtext_l}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      ({selectedField.datatype}, len: {selectedField.leng})
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

      {/* DDIC Manager Modal */}
      {isDdicManagerOpen && (
        <SapDdicManagerModal
          isOpen={isDdicManagerOpen}
          initialTabname={activeTable}
          onClose={() => setIsDdicManagerOpen(false)}
          onDataChanged={() => setDdicVersion((v) => v + 1)}
        />
      )}
    </>
  );
};
