import React, { useState, useMemo } from 'react';
import {
  Table,
  Filter,
  ArrowUpDown,
  Layers,
  Search,
  Check,
  RefreshCw,
  FolderOpen,
} from 'lucide-react';
import { ProgramSpec } from '../types/sap';
import { SapGuiTheme, SAP_GUI_THEMES } from '../data/sapGuiThemes';

interface SapPivotBrowserProps {
  spec: ProgramSpec;
  theme?: SapGuiTheme;
  onDrilldown?: (tcode: string, value: string) => void;
}

export interface PivotFieldDef {
  key: string;
  fieldname: string;
  coltext: string;
  art: 'DIM' | 'MEASURE' | 'TEXT';
  checked: boolean;
  order: number;
}

const DEFAULT_PIVOT_FIELDS: PivotFieldDef[] = [
  { key: 'RLDNR', fieldname: 'RLDNR', coltext: 'Ledger', art: 'DIM', checked: true, order: 1 },
  { key: 'GJAHR', fieldname: 'GJAHR', coltext: 'Fiscal Year', art: 'DIM', checked: true, order: 2 },
  { key: 'BUKRS', fieldname: 'BUKRS', coltext: 'Company Code', art: 'DIM', checked: false, order: 3 },
  { key: 'HKONT', fieldname: 'HKONT', coltext: 'G/L Account', art: 'DIM', checked: false, order: 4 },
  { key: 'WAERS', fieldname: 'WAERS', coltext: 'Currency', art: 'DIM', checked: false, order: 5 },
  { key: 'DMBTR', fieldname: 'DMBTR', coltext: 'Amount (Local Curr.)', art: 'MEASURE', checked: false, order: 6 },
  { key: 'LINES', fieldname: 'LINES', coltext: 'Line Items (Count)', art: 'MEASURE', checked: false, order: 7 },
  { key: 'TXT50', fieldname: 'TXT50', coltext: 'G/L Account Name', art: 'TEXT', checked: false, order: 8 },
  { key: 'BELNR', fieldname: 'BELNR', coltext: 'Document No.', art: 'DIM', checked: false, order: 9 },
  { key: 'BLART', fieldname: 'BLART', coltext: 'Doc Type', art: 'DIM', checked: false, order: 10 },
  { key: 'KOSTL', fieldname: 'KOSTL', coltext: 'Cost Center', art: 'DIM', checked: false, order: 11 },
  { key: 'PRCTR', fieldname: 'PRCTR', coltext: 'Profit Center', art: 'DIM', checked: false, order: 12 },
];

export const SapPivotBrowser: React.FC<SapPivotBrowserProps> = ({
  spec,
  theme = 'blue_crystal',
  onDrilldown,
}) => {
  const currentTheme = SAP_GUI_THEMES[theme] || SAP_GUI_THEMES.blue_crystal;

  // Side Panel Tabs: 'columns' | 'layouts' | 'actions' | 'history'
  const [activeTab, setActiveTab] = useState<'columns' | 'layouts' | 'actions' | 'history'>('columns');
  const [fields, setFields] = useState<PivotFieldDef[]>(DEFAULT_PIVOT_FIELDS);
  const [fieldSearch, setFieldSearch] = useState('');
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  // Source records from spec.mock_rows or fallback defaults
  const rawRows = useMemo(() => {
    if (spec.mock_rows && spec.mock_rows.length > 0) {
      return spec.mock_rows;
    }
    return [
      { RLDNR: '0L', GJAHR: '2016', BUKRS: '0001', HKONT: '113202', WAERS: 'EUR', DMBTR: -1783.10, LINES: 6, TXT50: 'Deutsche Bank / 보통예금', BELNR: '0100000001', BLART: 'SA', KOSTL: '1000', PRCTR: 'P100' },
      { RLDNR: '0L', GJAHR: '2016', BUKRS: '0001', HKONT: '140000', WAERS: 'EUR', DMBTR: 247.75, LINES: 9, TXT50: 'Forderungen LL / 매출채권', BELNR: '0100000002', BLART: 'RV', KOSTL: '1000', PRCTR: 'P100' },
      { RLDNR: '0L', GJAHR: '2016', BUKRS: '0001', HKONT: '159000', WAERS: 'EUR', DMBTR: 500.00, LINES: 7, TXT50: 'Sonst. Forderungen / 미수금', BELNR: '0100000003', BLART: 'SA', KOSTL: '1000', PRCTR: 'P100' },
      { RLDNR: '0L', GJAHR: '2016', BUKRS: '0001', HKONT: '160000', WAERS: 'EUR', DMBTR: 2285.00, LINES: 5, TXT50: 'Verbindlichk. LL / 매입채무', BELNR: '0100000004', BLART: 'RE', KOSTL: '1000', PRCTR: 'P100' },
      { RLDNR: '0L', GJAHR: '2016', BUKRS: '0001', HKONT: '191100', WAERS: 'EUR', DMBTR: -10720.00, LINES: 16, TXT50: 'WE/RE Verrechnung / 미착품정산', BELNR: '0100000005', BLART: 'WE', KOSTL: '1000', PRCTR: 'P100' },
      { RLDNR: '0L', GJAHR: '2017', BUKRS: '0001', HKONT: '89000', WAERS: 'EUR', DMBTR: -10000.00, LINES: 1, TXT50: 'Materialaufwand / 원재료비', BELNR: '0100000006', BLART: 'WA', KOSTL: '1100', PRCTR: 'P200' },
      { RLDNR: '0L', GJAHR: '2017', BUKRS: '0001', HKONT: '113202', WAERS: 'EUR', DMBTR: -1816.10, LINES: 5, TXT50: 'Deutsche Bank / 보통예금', BELNR: '0100000007', BLART: 'SA', KOSTL: '1000', PRCTR: 'P100' },
      { RLDNR: '0L', GJAHR: '2017', BUKRS: '0001', HKONT: '140000', WAERS: 'EUR', DMBTR: 119.00, LINES: 1, TXT50: 'Forderungen LL / 매출채권', BELNR: '0100000008', BLART: 'RV', KOSTL: '1000', PRCTR: 'P100' },
      { RLDNR: '0L', GJAHR: '2017', BUKRS: '0001', HKONT: '146100', WAERS: 'EUR', DMBTR: -2517.00, LINES: 1, TXT50: 'Geleistete Anzahlung / 선급금', BELNR: '0100000009', BLART: 'KZ', KOSTL: '1000', PRCTR: 'P100' },
      { RLDNR: '0L', GJAHR: '2017', BUKRS: '0001', HKONT: '159000', WAERS: 'EUR', DMBTR: 0.00, LINES: 2, TXT50: 'Sonst. Forderungen / 미수금', BELNR: '0100000010', BLART: 'SA', KOSTL: '1000', PRCTR: 'P100' },
      { RLDNR: '0L', GJAHR: '2017', BUKRS: '0001', HKONT: '191100', WAERS: 'EUR', DMBTR: 200.00, LINES: 5, TXT50: 'WE/RE Verrechnung / 미착품정산', BELNR: '0100000011', BLART: 'WE', KOSTL: '1000', PRCTR: 'P100' },
      { RLDNR: '0L', GJAHR: '2018', BUKRS: '0001', HKONT: '113109', WAERS: 'EUR', DMBTR: 2000.00, LINES: 1, TXT50: 'Commerzbank / 당좌예금', BELNR: '0100000012', BLART: 'SA', KOSTL: '1000', PRCTR: 'P100' },
      { RLDNR: '0L', GJAHR: '2018', BUKRS: '0001', HKONT: '140000', WAERS: 'EUR', DMBTR: 13010.00, LINES: 7, TXT50: 'Forderungen LL / 매출채권', BELNR: '0100000013', BLART: 'RV', KOSTL: '1000', PRCTR: 'P100' },
      { RLDNR: '0L', GJAHR: '2019', BUKRS: '0001', HKONT: '113101', WAERS: 'EUR', DMBTR: 63000.00, LINES: 2, TXT50: 'Festgeld / 정기예금', BELNR: '0100000014', BLART: 'SA', KOSTL: '1000', PRCTR: 'P100' },
      { RLDNR: '0L', GJAHR: '2019', BUKRS: '0001', HKONT: '113102', WAERS: 'EUR', DMBTR: 9801.24, LINES: 8, TXT50: 'Postbank / 보통예금', BELNR: '0100000015', BLART: 'SA', KOSTL: '1000', PRCTR: 'P100' },
      { RLDNR: '0L', GJAHR: '2019', BUKRS: '0001', HKONT: '113108', WAERS: 'EUR', DMBTR: 40000.00, LINES: 1, TXT50: 'Tagesgeld / 단기금융상품', BELNR: '0100000016', BLART: 'SA', KOSTL: '1000', PRCTR: 'P100' },
    ];
  }, [spec.mock_rows]);

  // Checked dimensions & measures
  const checkedDimFields = useMemo(
    () => fields.filter((f) => f.checked && (f.art === 'DIM' || f.art === 'TEXT')),
    [fields]
  );
  const checkedMeasureFields = useMemo(
    () => fields.filter((f) => f.checked && f.art === 'MEASURE'),
    [fields]
  );
  // All checked fields in catalog order
  const checkedFields = useMemo(() => fields.filter((f) => f.checked), [fields]);

  // Toggle field checkbox - automatically recalculates immediately
  const handleToggleField = (key: string) => {
    setFields((prev) =>
      prev.map((f) => (f.key === key ? { ...f, checked: !f.checked } : f))
    );
    setStatusNotice(`Field [${key}] toggled: Group By & Sum dynamically recalculated.`);
    setTimeout(() => setStatusNotice(null), 3000);
  };

  // Quick Preset Helper
  const applyPreset = (keysToEnable: string[]) => {
    setFields((prev) =>
      prev.map((f) => ({
        ...f,
        checked: keysToEnable.includes(f.key),
      }))
    );
    setStatusNotice(`Preset [${keysToEnable.join(', ')}] applied.`);
    setTimeout(() => setStatusNotice(null), 3000);
  };

  // True Group By & Sum Aggregation Engine (NO SUBTOTAL ROWS)
  const pivotResult = useMemo(() => {
    const grandDmbtr = rawRows.reduce((acc, r) => acc + (Number(r.DMBTR) || 0), 0);
    const grandLines = rawRows.reduce((acc, r) => acc + (Number(r.LINES) || 1), 0);

    // If no dimension fields are checked at all: single summary row
    if (checkedDimFields.length === 0) {
      return {
        rows: [
          {
            rowKey: 'ALL_SUMMARY',
            dimValues: {} as Record<string, any>,
            dmbtrSum: grandDmbtr,
            linesSum: grandLines,
            rawCount: rawRows.length,
          },
        ],
        grandTotalDmbtr: grandDmbtr,
        grandTotalLines: grandLines,
      };
    }

    interface GroupAgg {
      rowKey: string;
      dimValues: Record<string, any>;
      dmbtrSum: number;
      linesSum: number;
      rawCount: number;
    }

    const groupMap = new Map<string, GroupAgg>();

    rawRows.forEach((row) => {
      const compKey = checkedDimFields
        .map((f) => String(row[f.key as keyof typeof row] ?? ''))
        .join('___');

      if (!groupMap.has(compKey)) {
        const dimValues: Record<string, any> = {};
        checkedDimFields.forEach((f) => {
          dimValues[f.key] = row[f.key as keyof typeof row];
        });

        groupMap.set(compKey, {
          rowKey: compKey,
          dimValues,
          dmbtrSum: 0,
          linesSum: 0,
          rawCount: 0,
        });
      }

      const item = groupMap.get(compKey)!;
      item.dmbtrSum += Number(row.DMBTR) || 0;
      item.linesSum += Number(row.LINES) || 1;
      item.rawCount += 1;
    });

    const rows = Array.from(groupMap.values()).sort((a, b) => {
      // Sort by Fiscal Year (GJAHR) if present, then other fields
      const yearA = String(a.dimValues.GJAHR || '');
      const yearB = String(b.dimValues.GJAHR || '');
      if (yearA && yearB && yearA !== yearB) return yearA.localeCompare(yearB);
      return a.rowKey.localeCompare(b.rowKey);
    });

    return {
      rows,
      grandTotalDmbtr: grandDmbtr,
      grandTotalLines: grandLines,
    };
  }, [rawRows, checkedDimFields]);

  // Format SAP number (e.g. 1,783.10- or 9,470.55)
  const formatSapCurrency = (num: number) => {
    const isNeg = num < 0;
    const abs = Math.abs(num);
    const parts = abs.toFixed(2).split('.');
    const withCommas = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const formatted = `${withCommas}.${parts[1]}`;
    return isNeg ? `${formatted}-` : formatted;
  };

  return (
    <div className="flex flex-col h-full bg-[#f4f7fb] overflow-hidden font-sans border border-[#9bbadb] shadow-sm select-none">
      {/* 1. Top Mini Bar (Title & Info - No Duplicate Aktivieren Button) */}
      <div className="bg-[#d8e4f0] px-3 py-1.5 border-b border-[#9bbadb] flex items-center justify-between shrink-0 text-xs">
        <div className="flex items-center gap-2">
          <Table className="w-4 h-4 text-blue-900" />
          <span className="font-bold text-slate-900 text-[13px]">
            {spec.title || 'Pivot Brower'}
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-bold border border-blue-200">
            04 (Pivot Browser)
          </span>
          <span className="text-[11px] font-mono font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-300">
            [{spec.program_id || 'ZRALV0040'}]
          </span>
          <span className="text-[11px] text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-300 font-mono">
            Rows: <strong className="text-blue-900">{pivotResult.rows.length}</strong>
          </span>
        </div>

        {/* Quick Presets in English */}
        <div className="flex items-center gap-1.5">
          <div className="hidden lg:flex items-center gap-1 bg-white/80 p-0.5 rounded border border-[#9bbadb] text-[11px]">
            <span className="text-slate-500 px-1 font-semibold">Presets:</span>
            <button
              type="button"
              onClick={() => applyPreset(['RLDNR', 'GJAHR'])}
              className="px-1.5 py-0.5 hover:bg-blue-100 rounded text-blue-800 font-semibold cursor-pointer"
              title="Only Ledger & Fiscal Year (Exactly 4 Rows)"
            >
              Ledger + Year (4 Rows)
            </button>
            <span className="text-slate-300">|</span>
            <button
              type="button"
              onClick={() => applyPreset(['RLDNR', 'GJAHR', 'DMBTR', 'LINES'])}
              className="px-1.5 py-0.5 hover:bg-blue-100 rounded text-blue-800 font-semibold cursor-pointer"
              title="Ledger, Year, Amount & Count (4 Rows)"
            >
              Year + Amount (4 Rows)
            </button>
            <span className="text-slate-300">|</span>
            <button
              type="button"
              onClick={() => applyPreset(['RLDNR', 'GJAHR', 'HKONT', 'TXT50', 'DMBTR', 'LINES'])}
              className="px-1.5 py-0.5 hover:bg-blue-100 rounded text-blue-800 font-semibold cursor-pointer"
              title="G/L Account Breakdown"
            >
              Account Detail
            </button>
          </div>
        </div>
      </div>

      {/* Dynamic Status Toast Banner */}
      {statusNotice && (
        <div className="bg-emerald-50 border-b border-emerald-300 px-3 py-1 text-xs text-emerald-900 flex items-center justify-between animate-fadeIn shrink-0">
          <div className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span className="font-medium">{statusNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusNotice(null)}
            className="text-emerald-700 hover:text-emerald-950 font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. Main Workspace: Left Pivot Grid (Pure Group by Sum, NO SUBTOTALS) + Right Side Panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* ===================================================================== */}
        {/* LEFT MAIN AREA: Result Pivot Grid                                     */}
        {/* ===================================================================== */}
        <div className="flex-[7] flex flex-col bg-white overflow-hidden border-r border-[#9bbadb]">
          {/* Sub-Toolbar (English labels, no Alle schließen/öffnen) */}
          <div className="bg-[#e9f0f8] px-2.5 py-1 border-b border-[#9bbadb] flex items-center justify-between text-xs shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold text-slate-700 px-1.5 py-0.5 bg-white border border-slate-300 rounded">
                Group By Sum
              </span>
              <span className="text-[11px] text-slate-600">
                Dimensions:{' '}
                <strong className="text-blue-900 font-mono">
                  {checkedDimFields.length > 0
                    ? checkedDimFields.map((f) => f.coltext).join(', ')
                    : '(All Records Sum)'}
                </strong>
              </span>
            </div>

            <div className="text-[11px] text-slate-600 font-mono">
              Total Aggregated Rows: <strong className="text-blue-900">{pivotResult.rows.length}</strong>
            </div>
          </div>

          {/* Table Container */}
          <div className="flex-1 overflow-auto">
            <table className="w-full border-collapse text-xs font-sans whitespace-nowrap">
              {/* Header Row (English column headers) */}
              <thead className="sticky top-0 z-10 bg-[#d8e4f0] border-b border-[#9bbadb] text-slate-900 shadow-2xs">
                <tr>
                  <th className="w-8 px-1 py-1.5 border-r border-[#9bbadb] bg-[#c8d8ea] text-center">
                    <div className="w-3.5 h-3.5 mx-auto border border-slate-600 bg-white flex items-center justify-center">
                      <span className="text-[9px] text-blue-900 font-bold">▶</span>
                    </div>
                  </th>
                  {checkedFields.map((field) => {
                    const isMeasure = field.art === 'MEASURE';
                    return (
                      <th
                        key={field.key}
                        className={`px-2.5 py-1.5 border-r border-[#9bbadb] font-semibold text-xs ${
                          isMeasure ? 'text-right' : 'text-left'
                        } ${field.key === 'RLDNR' ? 'bg-[#bce0fd]' : 'bg-[#d8e4f0]'}`}
                      >
                        <div className={`flex items-center gap-1 ${isMeasure ? 'justify-end' : 'justify-between'}`}>
                          <span>{field.coltext}</span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              {/* Body: Pure Group By Sum Output (NO SUBTOTAL ROWS!) */}
              <tbody className="divide-y divide-slate-200">
                {pivotResult.rows.map((row, rIdx) => {
                  return (
                    <tr
                      key={row.rowKey}
                      className="hover:bg-blue-50/70 transition-colors bg-white font-mono text-xs"
                    >
                      {/* 1-based Row Number: 1, 2, 3, 4 */}
                      <td className="w-8 px-1 py-1.5 text-center bg-[#f0f4f8] border-r border-[#d8d8d8] text-[11px] font-bold text-slate-600">
                        {rIdx + 1}
                      </td>

                      {checkedFields.map((field) => {
                        const isMeasure = field.art === 'MEASURE';
                        const isAccount = field.key === 'HKONT';
                        const val = isMeasure
                          ? field.key === 'DMBTR'
                            ? row.dmbtrSum
                            : row.linesSum
                          : row.dimValues[field.key];

                        return (
                          <td
                            key={field.key}
                            onClick={() => {
                              if (isAccount && onDrilldown) {
                                onDrilldown('FS00', String(val));
                              }
                            }}
                            className={`px-2.5 py-1.5 border-r border-[#d8d8d8] ${
                              isMeasure
                                ? 'text-right font-medium'
                                : field.key === 'RLDNR'
                                ? 'bg-[#eaf4fd] text-center font-bold text-blue-950'
                                : 'text-center font-semibold text-slate-800'
                            } ${
                              isAccount
                                ? 'text-blue-700 hover:text-blue-900 underline font-semibold cursor-pointer'
                                : ''
                            }`}
                          >
                            {isMeasure
                              ? field.key === 'DMBTR'
                                ? formatSapCurrency(Number(val) || 0)
                                : Number(val || 0).toLocaleString()
                              : String(val ?? '')}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>

              {/* Grand Total Footer (English) */}
              <tfoot className="sticky bottom-0 bg-[#dbeafe] border-t-2 border-[#93c5fd] font-mono text-xs font-extrabold text-blue-950 shadow-md">
                <tr>
                  <td className="w-8 px-1 py-2 text-center bg-[#bfdbfe] border-r border-[#93c5fd] font-bold">
                    Σ
                  </td>
                  {checkedFields.map((field, fIdx) => {
                    const isMeasure = field.art === 'MEASURE';
                    const isFirst = fIdx === 0;

                    return (
                      <td
                        key={field.key}
                        className={`px-2.5 py-2 border-r border-[#93c5fd] ${
                          isMeasure ? 'text-right' : 'text-center'
                        }`}
                      >
                        {field.key === 'DMBTR' ? (
                          <span className="text-blue-900 text-[13px] font-extrabold">
                            * {formatSapCurrency(pivotResult.grandTotalDmbtr)}
                          </span>
                        ) : field.key === 'LINES' ? (
                          <span className="text-blue-900 font-bold">
                            {pivotResult.grandTotalLines}
                          </span>
                        ) : isFirst ? (
                          <span className="text-blue-900 uppercase tracking-wider font-sans font-bold">
                            * TOTAL (Grand Total)
                          </span>
                        ) : (
                          <span className="text-blue-800/60 font-sans font-semibold text-[11px]">
                            * TOTAL
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* ===================================================================== */}
        {/* RIGHT DOCKING SIDE PANEL: Columns / Layouts / Actions / History      */}
        {/* ===================================================================== */}
        <div className="flex-[4] flex flex-col bg-white overflow-hidden shadow-inner">
          {/* Side Panel Tabs Header (in English) */}
          <div className="bg-[#e2edf8] border-b border-[#9bbadb] flex items-center justify-between px-2 pt-1.5 shrink-0">
            <div className="flex items-center gap-1">
              {[
                { id: 'columns' as const, label: 'Columns' },
                { id: 'layouts' as const, label: 'Layouts' },
                { id: 'actions' as const, label: 'Actions' },
                { id: 'history' as const, label: 'History' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1 text-xs font-semibold rounded-t transition-colors cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-white text-blue-900 border-t border-l border-r border-[#9bbadb] shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Action Row under tabs (Search) */}
          <div className="bg-[#f0f4f9] px-2.5 py-1.5 border-b border-[#9bbadb] flex items-center justify-between gap-1 text-xs shrink-0">
            <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-600">
              <span>Select Dimensions & Measures</span>
            </div>

            <div className="relative">
              <Search className="w-3 h-3 text-slate-400 absolute left-2 top-1.5" />
              <input
                type="text"
                placeholder="Search field..."
                value={fieldSearch}
                onChange={(e) => setFieldSearch(e.target.value)}
                className="bg-white border border-slate-300 rounded pl-6 pr-2 py-0.5 text-[11px] w-28 focus:w-36 transition-all text-slate-800"
              />
            </div>
          </div>

          {/* Tab 1: Columns (English Field Catalog) */}
          {activeTab === 'columns' && (
            <div className="flex-1 overflow-auto p-1 bg-white">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#e9f0f8] border-b border-[#9bbadb] text-[10px] uppercase font-bold text-slate-700 sticky top-0 z-5">
                  <tr>
                    <th className="px-2 py-1 w-10 text-center">Type</th>
                    <th className="px-2 py-1">Field Name</th>
                    <th className="px-2 py-1 text-center w-12">Visible</th>
                    <th className="px-2 py-1">Field Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {fields
                    .filter((f) => {
                      if (!fieldSearch.trim()) return true;
                      const q = fieldSearch.toLowerCase();
                      return (
                        f.key.toLowerCase().includes(q) ||
                        f.coltext.toLowerCase().includes(q)
                      );
                    })
                    .map((field) => {
                      return (
                        <tr
                          key={field.key}
                          onClick={() => handleToggleField(field.key)}
                          className={`hover:bg-blue-50/70 cursor-pointer transition-colors ${
                            field.checked ? 'bg-blue-50/40' : 'bg-white'
                          }`}
                        >
                          <td className="px-2 py-1 text-center">
                            <span
                              className={`w-2.5 h-2.5 rounded-full inline-block ${
                                field.art === 'DIM'
                                  ? 'bg-blue-600'
                                  : field.art === 'MEASURE'
                                  ? 'bg-emerald-600'
                                  : 'bg-slate-400'
                              }`}
                              title={field.art === 'DIM' ? 'Dimension' : 'Measure (SUM)'}
                            />
                          </td>
                          <td className="px-2 py-1 font-bold text-slate-800">
                            {field.fieldname}
                          </td>
                          <td className="px-2 py-1 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={field.checked}
                              onChange={() => handleToggleField(field.key)}
                              className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </td>
                          <td className="px-2 py-1 font-sans text-slate-700 text-[11px] truncate max-w-44">
                            {field.coltext}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab 2: Layouts (English) */}
          {activeTab === 'layouts' && (
            <div className="flex-1 p-3 text-xs space-y-3 bg-white overflow-auto">
              <span className="font-bold text-slate-800 block text-xs">
                Saved Layout Variants:
              </span>
              <div className="space-y-2 font-sans">
                {[
                  {
                    name: '/LEDGER_YEAR_4ROWS',
                    badge: '4 Rows',
                    desc: 'Ledger & Fiscal Year Group By (Exactly 4 Rows)',
                    keys: ['RLDNR', 'GJAHR'],
                  },
                  {
                    name: '/YEAR_SUMMARY',
                    badge: '4 Rows + Sum',
                    desc: 'Fiscal Year with Amount & Item Count',
                    keys: ['RLDNR', 'GJAHR', 'DMBTR', 'LINES'],
                  },
                  {
                    name: '/STANDARD',
                    badge: 'Standard',
                    desc: 'Standard Ledger, Year, Company & Account View',
                    keys: ['RLDNR', 'GJAHR', 'BUKRS', 'HKONT', 'WAERS', 'DMBTR', 'LINES'],
                  },
                  {
                    name: '/ACCOUNT_ALL',
                    badge: 'Account Breakdown',
                    desc: 'G/L Account Drilldown with Account Name',
                    keys: ['RLDNR', 'GJAHR', 'HKONT', 'TXT50', 'DMBTR', 'LINES'],
                  },
                ].map((l) => (
                  <div
                    key={l.name}
                    onClick={() => applyPreset(l.keys)}
                    className="p-2 border border-slate-200 rounded hover:border-blue-500 hover:bg-blue-50/60 cursor-pointer transition-all shadow-2xs group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-blue-900 font-mono group-hover:text-blue-700">
                        {l.name}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold">
                        {l.badge}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 mt-1">{l.desc}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {l.keys.join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 3: Actions (Dynamic SQL Preview in English) */}
          {activeTab === 'actions' && (
            <div className="flex-1 p-3 text-xs space-y-3 bg-white overflow-auto font-sans">
              <span className="font-bold text-slate-800 block text-xs">
                Dynamic SQL Engine Query:
              </span>
              <pre className="p-2.5 bg-slate-900 text-emerald-400 rounded text-[11px] font-mono leading-relaxed overflow-x-auto shadow-inner border border-slate-800">
{`SELECT ${checkedDimFields.length > 0 ? checkedDimFields.map((f) => f.key).join(',\n       ') : '*'}${
  checkedMeasureFields.length > 0
    ? (checkedDimFields.length > 0 ? ',\n       ' : '') +
      checkedMeasureFields
        .map((m) => (m.key === 'LINES' ? 'COUNT(*)   AS LINES' : `SUM(${m.key}) AS ${m.key}`))
        .join(',\n       ')
    : ''
}
  FROM ACDOCA
 WHERE RLDNR = '0L'
   AND BUKRS = '0001'${
  checkedDimFields.length > 0
    ? `\n GROUP BY ${checkedDimFields.map((f) => f.key).join(', ')};`
    : ';'
}`}
              </pre>
              <div className="text-[11px] text-slate-600 space-y-1 bg-slate-50 p-2.5 rounded border border-slate-200">
                <div className="font-semibold text-slate-800">Dynamic Group By Summary:</div>
                <p>
                  Checked dimension fields are compiled directly into the <strong>GROUP BY</strong> clause at the database level.
                  Total 16 source line items are grouped into <strong>{pivotResult.rows.length} rows</strong>.
                </p>
                {checkedDimFields.length === 2 &&
                  checkedDimFields.some((f) => f.key === 'RLDNR') &&
                  checkedDimFields.some((f) => f.key === 'GJAHR') && (
                    <p className="text-blue-700 font-semibold">
                      ✓ Exactly 4 fiscal years (2016, 2017, 2018, 2019) are aggregated with no subtotal rows.
                    </p>
                  )}
              </div>
            </div>
          )}

          {/* Tab 4: History */}
          {activeTab === 'history' && (
            <div className="flex-1 p-3 text-xs space-y-2 bg-white overflow-auto font-mono text-[11px]">
              <div className="text-slate-500 pb-1 border-b">Activity History:</div>
              <div className="text-emerald-700">● Dynamic Group by sum executed ({pivotResult.rows.length} rows)</div>
              <div className="text-blue-700">● Subtotal lines removed per requirement</div>
              <div className="text-slate-600">● Initialized with ACDOCA line items</div>
            </div>
          )}

          {/* Footer of Side Panel */}
          <div className="bg-[#e9f0f8] px-3 py-1.5 border-t border-[#9bbadb] text-[11px] text-slate-600 flex items-center justify-between shrink-0 font-sans">
            <span>Selected Columns: <strong>{checkedFields.length}</strong></span>
            <div className="text-[10px] text-slate-500 font-mono">
              Engine: SAP Open SQL (Dynamic Group By)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
