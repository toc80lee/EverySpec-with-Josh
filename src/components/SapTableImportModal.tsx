import React, { useState, useMemo, useEffect } from 'react';
import {
  Database,
  Search,
  Check,
  X,
  Filter,
  CheckSquare,
  Square,
  Key,
  Download,
  Loader2,
  AlertCircle,
  Layers,
  Sparkles,
} from 'lucide-react';
import { SAP_SEARCH_HELP_TABLES, SapTableHelp, SapTableFieldHelp } from '../data/sapSearchHelpData';
import { AlvField, SapDataType } from '../types/sap';

interface SapTableImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCatalog: AlvField[];
  onImport: (newFields: AlvField[]) => void;
}

export const SapTableImportModal: React.FC<SapTableImportModalProps> = ({
  isOpen,
  onClose,
  currentCatalog,
  onImport,
}) => {
  const [selectedModule, setSelectedModule] = useState<string>('ALL');
  const [tableSearchInput, setTableSearchInput] = useState<string>('');
  const [activeTableName, setActiveTableName] = useState<string>('MARA');
  const [fieldFilterText, setFieldFilterText] = useState<string>('');
  
  // Custom fetched tables cache
  const [fetchedTables, setFetchedTables] = useState<Record<string, SapTableHelp>>({});
  const [isLoadingSchema, setIsLoadingSchema] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Set of selected field names for the active table
  const [selectedFieldNames, setSelectedFieldNames] = useState<Set<string>>(new Set());
  const [skipExistingFields, setSkipExistingFields] = useState<boolean>(true);

  // Existing fieldnames in current ALV field catalog (uppercased)
  const existingFieldNames = useMemo(() => {
    return new Set(currentCatalog.map((f) => f.fieldname.trim().toUpperCase()));
  }, [currentCatalog]);

  // Combined available tables: built-in standard tables + any fetched tables
  const allKnownTables = useMemo(() => {
    const tableMap = new Map<string, SapTableHelp>();
    SAP_SEARCH_HELP_TABLES.forEach((t) => tableMap.set(t.table.toUpperCase(), t));
    Object.values(fetchedTables).forEach((t) => tableMap.set(t.table.toUpperCase(), t));
    return Array.from(tableMap.values());
  }, [fetchedTables]);

  // Filtered tables list for left-side / quick selector
  const filteredTablesList = useMemo(() => {
    return allKnownTables.filter((t) => {
      const matchMod = selectedModule === 'ALL' || t.module === selectedModule;
      if (!matchMod) return false;
      if (!tableSearchInput.trim()) return true;
      const q = tableSearchInput.trim().toUpperCase();
      return (
        t.table.toUpperCase().includes(q) ||
        t.name.toUpperCase().includes(q) ||
        t.description.toUpperCase().includes(q)
      );
    });
  }, [allKnownTables, selectedModule, tableSearchInput]);

  // Active table metadata
  const activeTableObj: SapTableHelp | undefined = useMemo(() => {
    const upper = activeTableName.trim().toUpperCase();
    return (
      fetchedTables[upper] ||
      allKnownTables.find((t) => t.table.toUpperCase() === upper) ||
      allKnownTables[0]
    );
  }, [activeTableName, fetchedTables, allKnownTables]);

  // When active table changes, default-select non-existing fields or all fields
  useEffect(() => {
    if (activeTableObj) {
      const initialSelected = new Set<string>();
      activeTableObj.fields.forEach((f) => {
        const fn = f.field.toUpperCase();
        if (!existingFieldNames.has(fn)) {
          initialSelected.add(fn);
        }
      });
      // If all were existing or empty, select all as default
      if (initialSelected.size === 0) {
        activeTableObj.fields.forEach((f) => initialSelected.add(f.field.toUpperCase()));
      }
      setSelectedFieldNames(initialSelected);
      setFieldFilterText('');
      setFetchError(null);
    }
  }, [activeTableName, activeTableObj, existingFieldNames]);

  // Fetch schema dynamically from server if not found or requested
  const handleFetchSchema = async (tableNameToFetch: string) => {
    const cleanName = tableNameToFetch.trim().toUpperCase();
    if (!cleanName) return;

    setActiveTableName(cleanName);

    // If already in local memory, no need to call API
    if (fetchedTables[cleanName] || SAP_SEARCH_HELP_TABLES.some((t) => t.table.toUpperCase() === cleanName)) {
      setFetchError(null);
      return;
    }

    setIsLoadingSchema(true);
    setFetchError(null);

    try {
      const res = await fetch('/api/fetch-sap-table-schema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableName: cleanName }),
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch schema (status ${res.status})`);
      }

      const data = await res.json();
      if (data && data.schema && Array.isArray(data.schema.fields)) {
        setFetchedTables((prev) => ({
          ...prev,
          [cleanName]: data.schema,
        }));
      } else {
        throw new Error('Invalid schema format received.');
      }
    } catch (err: any) {
      console.error('Error fetching SAP table schema:', err);
      setFetchError(`Could not fetch schema for '${cleanName}'. Created a template schema.`);
    } finally {
      setIsLoadingSchema(false);
    }
  };

  // Filter fields inside active table by search term
  const displayedFields = useMemo(() => {
    if (!activeTableObj) return [];
    if (!fieldFilterText.trim()) return activeTableObj.fields;
    const q = fieldFilterText.toLowerCase();
    return activeTableObj.fields.filter(
      (f) =>
        f.field.toLowerCase().includes(q) ||
        f.label.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q) ||
        f.datatype.toLowerCase().includes(q)
    );
  }, [activeTableObj, fieldFilterText]);

  // Toggle single field selection
  const handleToggleField = (fieldName: string) => {
    const upper = fieldName.toUpperCase();
    const next = new Set(selectedFieldNames);
    if (next.has(upper)) {
      next.delete(upper);
    } else {
      next.add(upper);
    }
    setSelectedFieldNames(next);
  };

  // Select all displayed fields
  const handleSelectAll = () => {
    const next = new Set(selectedFieldNames);
    displayedFields.forEach((f) => next.add(f.field.toUpperCase()));
    setSelectedFieldNames(next);
  };

  // Deselect all displayed fields
  const handleDeselectAll = () => {
    const next = new Set(selectedFieldNames);
    displayedFields.forEach((f) => next.delete(f.field.toUpperCase()));
    setSelectedFieldNames(next);
  };

  // Select key fields only
  const handleSelectKeysOnly = () => {
    const next = new Set<string>();
    displayedFields.forEach((f) => {
      if (f.isKey) next.add(f.field.toUpperCase());
    });
    setSelectedFieldNames(next);
  };

  // Compute fields ready to import
  const fieldsToImport = useMemo(() => {
    if (!activeTableObj) return [];
    return activeTableObj.fields.filter((f) => {
      const upper = f.field.toUpperCase();
      if (!selectedFieldNames.has(upper)) return false;
      if (skipExistingFields && existingFieldNames.has(upper)) return false;
      return true;
    });
  }, [activeTableObj, selectedFieldNames, skipExistingFields, existingFieldNames]);

  // Perform import
  const handleConfirmImport = () => {
    if (!activeTableObj || fieldsToImport.length === 0) return;

    let nextColPos = currentCatalog.length + 1;

    const newAlvFields: AlvField[] = fieldsToImport.map((sf) => {
      const isCur = sf.datatype === 'CURR';
      const isNum = sf.datatype === 'DEC' || sf.datatype === 'INT4';
      const isDate = sf.datatype === 'DATS';

      // Clean label (remove parenthesized Korean subtitle if already in name or keep clean)
      const cleanLabel = sf.label.trim();

      const alvField: AlvField = {
        id: `fcat-sap-${activeTableObj.table}-${sf.field}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        col_pos: nextColPos++,
        fieldname: sf.field.toUpperCase(),
        coltext: cleanLabel,
        datatype: sf.datatype,
        outputlen: sf.length || 10,
        just: isCur || isNum ? 'R' : isDate ? 'C' : 'L',
        key: Boolean(sf.isKey),
        hotspot: false,
        checkbox: false,
        edit: false,
        do_sum: isCur,
        emphasize: sf.isKey ? 'C100' : '',
        ref_table: activeTableObj.table.toUpperCase(),
        ref_field: sf.field.toUpperCase(),
        drilldown_tcode: activeTableObj.table === 'VBAK' || activeTableObj.table === 'VBAP' ? 'VA03' :
                         activeTableObj.table === 'EKKO' || activeTableObj.table === 'EKPO' ? 'ME23N' :
                         activeTableObj.table === 'BKPF' || activeTableObj.table === 'BSEG' ? 'FB03' :
                         activeTableObj.table === 'MARA' || activeTableObj.table === 'MARC' ? 'MM03' : '',
      };
      return alvField;
    });

    onImport(newAlvFields);
    onClose();
  };

  if (!isOpen) return null;

  // Shortcut pills for the most popular tables
  const popularTables = [
    { table: 'MARA', desc: 'Material Master' },
    { table: 'MAKT', desc: 'Material Text' },
    { table: 'VBAK', desc: 'Sales Header' },
    { table: 'VBAP', desc: 'Sales Item' },
    { table: 'EKKO', desc: 'PO Header' },
    { table: 'EKPO', desc: 'PO Item' },
    { table: 'BKPF', desc: 'FI Header' },
    { table: 'BSEG', desc: 'FI Item' },
    { table: 'KNA1', desc: 'Customer' },
    { table: 'LFA1', desc: 'Vendor' },
    { table: 'LIKP', desc: 'Delivery Header' },
    { table: 'LIPS', desc: 'Delivery Item' },
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-5xl h-[680px] max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 font-sans">
        {/* Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold tracking-tight">
                  Import SAP Table Metadata & Schema
                </h3>
                <span className="text-[10px] bg-blue-500/30 text-blue-200 border border-blue-400/30 px-2 py-0.5 rounded-full font-mono">
                  DDIC Schema Fetcher
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Search standard SAP tables (e.g. MARA, VBAK, EKKO) or custom tables to batch import fields into the ALV Field Catalog.
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

        {/* Popular Quick Table Pills */}
        <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 flex items-center gap-2 overflow-x-auto shrink-0 text-xs">
          <span className="text-[11px] font-bold text-slate-500 shrink-0 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            Common Tables:
          </span>
          <div className="flex items-center gap-1.5 flex-nowrap">
            {popularTables.map((pt) => {
              const isCurrent = activeTableObj?.table.toUpperCase() === pt.table;
              return (
                <button
                  key={pt.table}
                  type="button"
                  onClick={() => handleFetchSchema(pt.table)}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                    isCurrent
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-300'
                  }`}
                  title={`${pt.desc} (${pt.table})`}
                >
                  <span>{pt.table}</span>
                  <span className={`text-[10px] font-sans font-normal ${isCurrent ? 'text-blue-100' : 'text-slate-500'}`}>
                    · {pt.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Table Search / Fetch Input */}
          <div className="flex items-center gap-2 flex-1 min-w-[280px] max-w-md">
            <div className="relative flex-1">
              <Database className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={tableSearchInput}
                onChange={(e) => setTableSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && tableSearchInput.trim()) {
                    handleFetchSchema(tableSearchInput);
                  }
                }}
                placeholder="Enter SAP Table (e.g., MARA, VBAK, EKKO, BSEG, Z*)..."
                className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-xs font-mono uppercase text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold shadow-2xs"
              />
            </div>
            <button
              type="button"
              onClick={() => handleFetchSchema(tableSearchInput || activeTableName)}
              disabled={isLoadingSchema || !tableSearchInput.trim()}
              className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs shrink-0 cursor-pointer"
            >
              {isLoadingSchema ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Fetching...</span>
                </>
              ) : (
                <>
                  <Search className="w-3.5 h-3.5" />
                  <span>Fetch Schema</span>
                </>
              )}
            </button>
          </div>

          {/* Module Selector */}
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
        </div>

        {/* Error notification if any */}
        {fetchError && (
          <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 text-amber-800 text-xs flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{fetchError}</span>
          </div>
        )}

        {/* Main Body: Master-Detail Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column: Tables List */}
          <div className="w-64 border-r border-slate-200 bg-slate-50 flex flex-col overflow-hidden shrink-0">
            <div className="p-2 border-b border-slate-200 bg-slate-100/90 text-[11px] font-bold text-slate-600 flex items-center justify-between">
              <span>SAP Tables ({filteredTablesList.length})</span>
              <span className="text-[10px] text-slate-400 font-normal">Click to load</span>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-slate-200/60">
              {filteredTablesList.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  No tables found. Type table name and click 'Fetch Schema'.
                </div>
              ) : (
                filteredTablesList.map((t) => {
                  const isSelected = activeTableObj?.table.toUpperCase() === t.table.toUpperCase();
                  return (
                    <button
                      key={t.table}
                      type="button"
                      onClick={() => {
                        setActiveTableName(t.table);
                        setFetchError(null);
                      }}
                      className={`w-full text-left p-2.5 transition-colors cursor-pointer flex items-start gap-2.5 ${
                        isSelected
                          ? 'bg-blue-50 border-l-4 border-blue-600 text-blue-950 font-semibold shadow-2xs'
                          : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <Layers className={`w-4 h-4 shrink-0 mt-0.5 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-mono text-xs font-bold text-slate-900">
                            {t.table}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200/90 font-mono text-slate-700 font-bold">
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
            {/* Active Table Summary Header */}
            {activeTableObj && (
              <div className="px-4 py-2.5 bg-gradient-to-r from-blue-50/80 to-slate-50 border-b border-blue-100 flex items-center justify-between flex-wrap gap-2 shrink-0">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono font-bold text-sm text-blue-900 bg-white px-2 py-0.5 rounded border border-blue-200 shadow-2xs">
                    {activeTableObj.table}
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">
                      {activeTableObj.name}
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      {activeTableObj.description} · Module: <strong className="text-slate-700">{activeTableObj.module}</strong>
                    </p>
                  </div>
                </div>

                {/* Field Selection Controls */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Field Search Filter */}
                  <div className="relative">
                    <Search className="w-3 h-3 absolute left-2.5 top-2 text-slate-400" />
                    <input
                      type="text"
                      value={fieldFilterText}
                      onChange={(e) => setFieldFilterText(e.target.value)}
                      placeholder="Filter fields..."
                      className="bg-white border border-slate-300 rounded pl-7 pr-2 py-1 text-xs text-slate-700 focus:outline-none focus:border-blue-500 w-36 shadow-2xs"
                    />
                  </div>

                  <div className="flex items-center gap-1 text-xs">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded font-semibold text-slate-700 text-[11px] cursor-pointer shadow-2xs"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={handleSelectKeysOnly}
                      className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded font-semibold text-blue-700 text-[11px] cursor-pointer shadow-2xs"
                    >
                      Keys Only
                    </button>
                    <button
                      type="button"
                      onClick={handleDeselectAll}
                      className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded font-semibold text-slate-600 text-[11px] cursor-pointer shadow-2xs"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Field Table */}
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold sticky top-0 z-10 text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          const allSelected = displayedFields.every((f) =>
                            selectedFieldNames.has(f.field.toUpperCase())
                          );
                          if (allSelected) {
                            handleDeselectAll();
                          } else {
                            handleSelectAll();
                          }
                        }}
                        className="cursor-pointer"
                        title="Toggle selection for all displayed fields"
                      >
                        {displayedFields.length > 0 &&
                        displayedFields.every((f) => selectedFieldNames.has(f.field.toUpperCase())) ? (
                          <CheckSquare className="w-4 h-4 text-blue-600 mx-auto" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400 mx-auto" />
                        )}
                      </button>
                    </th>
                    <th className="py-2.5 px-2 w-10 text-center">Key</th>
                    <th className="py-2.5 px-3 min-w-32 font-mono">FIELDNAME</th>
                    <th className="py-2.5 px-3 min-w-44">Field Label (COLTEXT)</th>
                    <th className="py-2.5 px-2 w-20">Type</th>
                    <th className="py-2.5 px-2 w-16 text-center">Length</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-2 w-20 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {displayedFields.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 font-sans">
                        {isLoadingSchema ? (
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                            <span>Fetching SAP DDIC table schema...</span>
                          </div>
                        ) : (
                          'No fields match your filter.'
                        )}
                      </td>
                    </tr>
                  ) : (
                    displayedFields.map((fld) => {
                      const upper = fld.field.toUpperCase();
                      const isSelected = selectedFieldNames.has(upper);
                      const isAlreadyInAlv = existingFieldNames.has(upper);

                      return (
                        <tr
                          key={fld.field}
                          onClick={() => handleToggleField(fld.field)}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-blue-50/70 font-semibold'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          {/* Checkbox */}
                          <td
                            className="py-2 px-3 text-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleField(fld.field)}
                              className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                            />
                          </td>

                          {/* Key indicator */}
                          <td className="py-2 px-2 text-center">
                            {fld.isKey ? (
                              <span title="Primary Key Field" className="inline-flex items-center justify-center">
                                <Key className="w-3.5 h-3.5 text-blue-700 inline-block" />
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>

                          {/* Field name */}
                          <td className="py-2 px-3 font-bold text-slate-900">
                            {fld.field}
                          </td>

                          {/* Field Label */}
                          <td className="py-2 px-3 font-sans text-slate-800">
                            {fld.label}
                          </td>

                          {/* Data Type */}
                          <td className="py-2 px-2 text-slate-600">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              fld.datatype === 'CURR' || fld.datatype === 'DEC' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              fld.datatype === 'DATS' || fld.datatype === 'TIMS' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {fld.datatype}
                            </span>
                          </td>

                          {/* Length */}
                          <td className="py-2 px-2 text-center text-slate-600">
                            {fld.length}
                          </td>

                          {/* Description */}
                          <td className="py-2 px-3 font-sans text-[11px] text-slate-500 truncate max-w-xs" title={fld.description}>
                            {fld.description}
                          </td>

                          {/* Status */}
                          <td className="py-2 px-2 text-center font-sans">
                            {isAlreadyInAlv ? (
                              <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-1.5 py-0.5 rounded" title="This field already exists in your ALV Field Catalog">
                                In ALV
                              </span>
                            ) : (
                              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                                New
                              </span>
                            )}
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

        {/* Footer & Actions */}
        <div className="px-5 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between flex-wrap gap-3 shrink-0">
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Selected for Import:</span>
              <span className="font-mono font-bold text-blue-900 bg-white px-2 py-0.5 rounded border border-blue-200 shadow-2xs">
                {fieldsToImport.length} fields
              </span>
              <span className="text-slate-400">
                (Starting at COL_POS {currentCatalog.length + 1})
              </span>
            </div>

            <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 select-none">
              <input
                type="checkbox"
                checked={skipExistingFields}
                onChange={(e) => setSkipExistingFields(e.target.checked)}
                className="w-3.5 h-3.5 accent-blue-600 rounded cursor-pointer"
              />
              <span className="text-[11px]">Skip fields already present in ALV</span>
            </label>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer shadow-2xs"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={fieldsToImport.length === 0}
              className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Import {fieldsToImport.length} Fields into ALV Grid</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
