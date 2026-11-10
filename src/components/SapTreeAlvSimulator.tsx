import React, { useState, useMemo } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Plane,
  Folder,
  FolderOpen,
  ArrowUpDown,
  Search,
  Filter,
  Download,
  Printer,
  Info,
  Maximize2,
  Table as TableIcon,
  RefreshCw,
  Sigma,
} from 'lucide-react';
import { ProgramSpec, AlvField } from '../types/sap';
import { SapGuiTheme } from '../data/sapGuiThemes';
import { getSapColorHex } from './SapColorSearchHelpModal';
import { AlvToolbar } from './AlvToolbar';

interface SapTreeAlvSimulatorProps {
  spec: ProgramSpec;
  theme: SapGuiTheme;
  onDrilldown?: (tcode: string, val: string) => void;
}

export const SapTreeAlvSimulator: React.FC<SapTreeAlvSimulatorProps> = ({
  spec,
  theme,
  onDrilldown,
}) => {
  // Tree state
  const [selectedCarrier, setSelectedCarrier] = useState<string>('AA');
  const [isRootExpanded, setIsRootExpanded] = useState<boolean>(true);
  const [isCarridExpanded, setIsCarridExpanded] = useState<boolean>(true);

  // Right ALV Grid state
  const [selectedColumnFields, setSelectedColumnFields] = useState<string[]>(['CONNID']);
  const [sortColumns, setSortColumns] = useState<{ fieldname: string; asc: boolean }[]>([
    { fieldname: 'CONNID', asc: true },
  ]);
  const [filterQuery, setFilterQuery] = useState<string>('');
  const [showTotals, setShowTotals] = useState<boolean>(true);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(0);
  const [detailModalRow, setDetailModalRow] = useState<Record<string, any> | null>(null);
  const [columnTextMode, setColumnTextMode] = useState<'coltext' | 'fieldname'>('coltext');

  // Flight schedule fields and rows from item_grid
  const itemCatalog: AlvField[] = useMemo(() => {
    if (spec.item_grid?.field_catalog && spec.item_grid.field_catalog.length > 0) {
      return spec.item_grid.field_catalog;
    }
    return [
      { id: 'f1', col_pos: 1, fieldname: 'CARRID', coltext: 'ID', datatype: 'CHAR', outputlen: 3, just: 'C', key: true, hotspot: false, checkbox: false, edit: false, do_sum: false, emphasize: 'C100' },
      { id: 'f2', col_pos: 2, fieldname: 'CONNID', coltext: 'No.', datatype: 'NUMC', outputlen: 4, just: 'C', key: true, hotspot: true, checkbox: false, edit: false, do_sum: false, emphasize: '' },
      { id: 'f3', col_pos: 3, fieldname: 'FLDATE', coltext: 'Flight Date', datatype: 'DATS', outputlen: 10, just: 'C', key: false, hotspot: false, checkbox: false, edit: false, do_sum: false, emphasize: '' },
      { id: 'f4', col_pos: 4, fieldname: 'PRICE', coltext: 'Airfare', datatype: 'CURR', outputlen: 15, decimals: 2, just: 'R', key: false, hotspot: false, checkbox: false, edit: false, do_sum: true, emphasize: '' },
      { id: 'f5', col_pos: 5, fieldname: 'CURRENCY', coltext: 'Curr.', datatype: 'CUKY', outputlen: 5, just: 'C', key: false, hotspot: false, checkbox: false, edit: false, do_sum: false, emphasize: '' },
      { id: 'f6', col_pos: 6, fieldname: 'PLANETYPE', coltext: 'Plane Type', datatype: 'CHAR', outputlen: 10, just: 'L', key: false, hotspot: false, checkbox: false, edit: false, do_sum: false, emphasize: '' },
      { id: 'f7', col_pos: 7, fieldname: 'SEATSMAX', coltext: 'Capacity', datatype: 'INT4', outputlen: 6, just: 'R', key: false, hotspot: false, checkbox: false, edit: false, do_sum: true, emphasize: '' },
      { id: 'f8', col_pos: 8, fieldname: 'SEATSOCC', coltext: 'Occupied', datatype: 'INT4', outputlen: 6, just: 'R', key: false, hotspot: false, checkbox: false, edit: false, do_sum: true, emphasize: '' },
    ];
  }, [spec.item_grid?.field_catalog]);

  const rawItemRows = useMemo(() => {
    return (
      spec.item_grid?.mock_rows || [
        { CARRID: 'AA', CONNID: '0017', FLDATE: '2015.01.15', PRICE: 422.94, CURRENCY: 'USD', PLANETYPE: '747-400', SEATSMAX: 385, SEATSOCC: 370 },
        { CARRID: 'AA', CONNID: '0064', FLDATE: '2015.01.20', PRICE: 422.94, CURRENCY: 'USD', PLANETYPE: 'A310-300', SEATSMAX: 280, SEATSOCC: 255 },
        { CARRID: 'AA', CONNID: '0555', FLDATE: '2015.02.01', PRICE: 380.0, CURRENCY: 'USD', PLANETYPE: '747-400', SEATSMAX: 385, SEATSOCC: 380 },
        { CARRID: 'AA', CONNID: '0788', FLDATE: '2015.02.14', PRICE: 450.5, CURRENCY: 'USD', PLANETYPE: 'A310-300', SEATSMAX: 280, SEATSOCC: 270 },
        { CARRID: 'AZ', CONNID: '0788', FLDATE: '2015.03.01', PRICE: 650.0, CURRENCY: 'EUR', PLANETYPE: '747-400', SEATSMAX: 385, SEATSOCC: 310 },
        { CARRID: 'AZ', CONNID: '0789', FLDATE: '2015.03.15', PRICE: 620.0, CURRENCY: 'EUR', PLANETYPE: 'A310-300', SEATSMAX: 280, SEATSOCC: 260 },
        { CARRID: 'DL', CONNID: '0106', FLDATE: '2015.01.10', PRICE: 890.0, CURRENCY: 'USD', PLANETYPE: '747-400', SEATSMAX: 385, SEATSOCC: 375 },
        { CARRID: 'DL', CONNID: '0107', FLDATE: '2015.01.22', PRICE: 910.0, CURRENCY: 'USD', PLANETYPE: '747-400', SEATSMAX: 385, SEATSOCC: 360 },
      ]
    );
  }, [spec.item_grid?.mock_rows]);

  // Carriers for tree
  const carriers = [
    { id: 'AA', name: 'American Airlines', curr: 'USD', count: 4 },
    { id: 'AZ', name: 'Alitalia', curr: 'EUR', count: 2 },
    { id: 'DL', name: 'Delta Air Lines', curr: 'USD', count: 2 },
  ];

  // Filtered rows
  const displayedFlightRows = useMemo(() => {
    let list = [...rawItemRows];

    // Filter by selected carrier node
    if (selectedCarrier !== 'ALL') {
      list = list.filter((r) => r.CARRID === selectedCarrier);
    }

    // Filter by search query
    if (filterQuery.trim()) {
      const q = filterQuery.toLowerCase();
      list = list.filter((r) => Object.values(r).some((v) => String(v).toLowerCase().includes(q)));
    }

    // Interactive Column Sort
    if (sortColumns.length > 0) {
      list.sort((a, b) => {
        for (const sc of sortColumns) {
          const valA = a[sc.fieldname];
          const valB = b[sc.fieldname];
          let cmp = 0;
          if (typeof valA === 'number' && typeof valB === 'number') {
            cmp = sc.asc ? valA - valB : valB - valA;
          } else {
            cmp = sc.asc
              ? String(valA ?? '').localeCompare(String(valB ?? ''))
              : String(valB ?? '').localeCompare(String(valA ?? ''));
          }
          if (cmp !== 0) return cmp;
        }
        return 0;
      });
    }

    return list;
  }, [rawItemRows, selectedCarrier, filterQuery, sortColumns]);

  // Handle Sort
  const handleSort = (asc: boolean) => {
    const targets = selectedColumnFields.length > 0 ? selectedColumnFields : ['CONNID'];
    const newSorts = targets.map((f) => ({ fieldname: f, asc }));
    setSortColumns(newSorts);
  };

  // Toggle column selection
  const handleToggleColumn = (fieldname: string, isShift: boolean) => {
    if (isShift) {
      setSelectedColumnFields((prev) =>
        prev.includes(fieldname) ? prev.filter((f) => f !== fieldname) : [...prev, fieldname]
      );
    } else {
      setSelectedColumnFields([fieldname]);
    }
  };

  // Totals
  const totals = useMemo(() => {
    const sumMap: Record<string, number> = {};
    itemCatalog.forEach((f) => {
      if (f.do_sum) {
        sumMap[f.fieldname] = displayedFlightRows.reduce((acc, row) => {
          const val = Number(row[f.fieldname]) || 0;
          return acc + val;
        }, 0);
      }
    });
    return sumMap;
  }, [itemCatalog, displayedFlightRows]);

  // CSV Export for SFLIGHT ALV Grid
  const handleExportCsv = () => {
    if (displayedFlightRows.length === 0) return;
    const headers = itemCatalog.map((c) => (columnTextMode === 'coltext' ? c.coltext || c.fieldname : c.fieldname));
    const csvLines = [headers.join(',')];
    displayedFlightRows.forEach((r) => {
      const rowValues = itemCatalog.map((c) => {
        const val = r[c.fieldname] ?? '';
        return `"${String(val).replace(/"/g, '""')}"`;
      });
      csvLines.push(rowValues.join(','));
    });
    const blob = new Blob(['\uFEFF' + csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${spec.program_id || 'SFLIGHT'}_flight_schedule.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-[#f4f7fb] text-slate-800 font-sans text-xs select-none">
      {/* ========================================================================= */}
      {/* LEFT PANE: SAP Tree Control (CL_GUI_ALV_TREE)                              */}
      {/* ========================================================================= */}
      <div className="w-72 shrink-0 border-r-2 border-[#9bbadb] bg-white flex flex-col overflow-hidden">
        {/* Tree Title Bar */}
        <div className="px-3 py-2 bg-[#d7e4f2] border-b border-[#9bbadb] flex items-center justify-between font-bold text-slate-800 text-[11px] shrink-0">
          <div className="flex items-center gap-1.5">
            <Folder className="w-3.5 h-3.5 text-blue-700" />
            <span>ALV Tree Hierarchy</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setIsRootExpanded(true);
                setIsCarridExpanded(true);
              }}
              title="Expand All"
              className="px-1.5 py-0.5 bg-white border border-[#9bbadb] hover:bg-blue-50 text-[10px] rounded cursor-pointer"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => {
                setIsCarridExpanded(false);
              }}
              title="Collapse"
              className="px-1.5 py-0.5 bg-white border border-[#9bbadb] hover:bg-blue-50 text-[10px] rounded cursor-pointer"
            >
              -
            </button>
          </div>
        </div>

        {/* Tree Nodes Area */}
        <div className="flex-1 overflow-y-auto p-2 bg-[#fafbfd] font-mono text-[11px]">
          {/* Level 0: Root AIRPLANE */}
          <div className="mb-1">
            <div
              onClick={() => {
                setIsRootExpanded(!isRootExpanded);
                setSelectedCarrier('ALL');
              }}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded cursor-pointer transition-colors ${
                selectedCarrier === 'ALL'
                  ? 'bg-[#bce0fd] font-bold text-blue-950 border border-blue-400'
                  : 'hover:bg-slate-100 text-slate-800'
              }`}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsRootExpanded(!isRootExpanded);
                }}
                className="p-0.5 text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                {isRootExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </button>
              <Plane className="w-4 h-4 text-blue-700 shrink-0" />
              <span className="font-bold">AIRPLANE</span>
              <span className="text-[10px] text-slate-500 font-sans ml-auto">({rawItemRows.length})</span>
            </div>

            {/* Level 1: CARRID Group */}
            {isRootExpanded && (
              <div className="ml-4 pl-2 border-l border-slate-300 mt-1 space-y-1">
                <div
                  onClick={() => setIsCarridExpanded(!isCarridExpanded)}
                  className="flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer hover:bg-slate-100 text-slate-700 font-semibold"
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsCarridExpanded(!isCarridExpanded);
                    }}
                    className="p-0.5 text-slate-500 cursor-pointer"
                  >
                    {isCarridExpanded ? (
                      <ChevronDown className="w-3 h-3" />
                    ) : (
                      <ChevronRight className="w-3 h-3" />
                    )}
                  </button>
                  {isCarridExpanded ? (
                    <FolderOpen className="w-3.5 h-3.5 text-amber-600" />
                  ) : (
                    <Folder className="w-3.5 h-3.5 text-amber-600" />
                  )}
                  <span>CARRID</span>
                </div>

                {/* Level 2: Specific Airlines (AA, AZ, DL) */}
                {isCarridExpanded && (
                  <div className="ml-4 pl-2 border-l border-slate-300 space-y-0.5">
                    {carriers.map((c) => {
                      const isSelected = selectedCarrier === c.id;
                      return (
                        <div
                          key={c.id}
                          onClick={() => setSelectedCarrier(c.id)}
                          className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-[11px] transition-all ${
                            isSelected
                              ? 'bg-[#005a9c] text-white font-bold shadow-xs'
                              : 'hover:bg-blue-50 text-slate-800'
                          }`}
                        >
                          <Plane className={`w-3 h-3 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
                          <span className="font-bold tracking-wider">{c.id}</span>
                          <span className={`text-[10px] truncate ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                            {c.name}
                          </span>
                          <span
                            className={`ml-auto text-[9px] px-1 py-0.2 rounded ${
                              isSelected ? 'bg-blue-900 text-white' : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {c.count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Tree Footer / Quick Info */}
        <div className="p-2 bg-[#f0f4f8] border-t border-[#9bbadb] text-[10px] text-slate-600 shrink-0">
          <div className="flex items-center justify-between">
            <span>선택 노드:</span>
            <span className="font-bold font-mono text-blue-900">
              {selectedCarrier === 'ALL' ? 'ALL (전체 항공사)' : selectedCarrier}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RIGHT PANE: Flight Schedule ALV Grid (SFLIGHT)                            */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white">
        {/* Right ALV Header Titlebar */}
        <div className="px-3 py-1.5 bg-[#e4edf7] border-b border-[#9bbadb] flex items-center justify-between text-xs font-bold text-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <TableIcon className="w-3.5 h-3.5 text-blue-800" />
            <span>Flight Schedule ALV Grid (SFLIGHT)</span>
            <span className="px-1.5 py-0.2 bg-blue-100 text-blue-900 rounded-full font-mono text-[10px]">
              {selectedCarrier === 'ALL' ? 'All Carriers' : `Carrier: ${selectedCarrier}`}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-600 font-normal">
            <span>출력: {displayedFlightRows.length}건</span>
            <span>|</span>
            <span>정렬 열: {selectedColumnFields.join(', ') || '-'}</span>
          </div>
        </div>

        {/* Standard SAP ALV Toolbar for Flight Schedule Grid */}
        <div className="shrink-0 border-b border-[#9bbadb]">
          <AlvToolbar
            spec={{
              ...spec,
              field_catalog: itemCatalog,
              layout: spec.item_grid?.layout || spec.layout,
              toolbar_buttons: spec.item_grid?.toolbar_buttons || spec.toolbar_buttons,
            }}
            theme={theme}
            statusSummaries={[]}
            selectedStatusFilters={[]}
            onToggleStatusFilter={() => {}}
            onOpenDetail={() => {
              if (selectedRowIndex !== null && displayedFlightRows[selectedRowIndex]) {
                setDetailModalRow(displayedFlightRows[selectedRowIndex]);
              }
            }}
            onSort={(asc) => handleSort(asc)}
            onFilter={() => {
              const q = window.prompt('항공편 검색 필터를 입력하세요:', filterQuery);
              if (q !== null) setFilterQuery(q);
            }}
            filterQuery={filterQuery}
            onClearFilter={() => setFilterQuery('')}
            onToggleTotals={() => setShowTotals(!showTotals)}
            onExport={handleExportCsv}
            onPrint={() => window.print()}
            onInfo={() => {
              alert(`Flight Schedule ALV Grid\nCarrier: ${selectedCarrier}\n총 데이터: ${displayedFlightRows.length}건`);
            }}
            onToggleColumnText={() =>
              setColumnTextMode((prev) => (prev === 'coltext' ? 'fieldname' : 'coltext'))
            }
            onOptimizeWidth={() => {}}
          />
        </div>

        {/* ALV Grid Table */}
        <div className="flex-1 overflow-auto bg-white">
          <table className="w-full border-collapse font-sans text-[11px]">
            <thead>
              <tr className="sticky top-0 z-10 bg-[#e4edf7] border-b-2 border-[#9bbadb] divide-x divide-[#9bbadb]">
                <th className="w-10 px-1 py-1.5 text-center font-bold text-slate-700 bg-[#d7e4f2]">#</th>
                {itemCatalog.map((col) => {
                  const isSelected = selectedColumnFields.includes(col.fieldname);
                  const isSorted = sortColumns.some((s) => s.fieldname === col.fieldname);
                  const sortInfo = sortColumns.find((s) => s.fieldname === col.fieldname);
                  const headerTitle =
                    columnTextMode === 'coltext' ? col.coltext || col.fieldname : col.fieldname;

                  return (
                    <th
                      key={col.fieldname}
                      onClick={(e) => handleToggleColumn(col.fieldname, e.shiftKey)}
                      className={`px-3 py-1.5 font-bold cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-blue-100 text-blue-950 ring-2 ring-inset ring-blue-600'
                          : col.key
                          ? 'bg-[#bce0fd] text-slate-900'
                          : 'bg-[#e4edf7] text-slate-800 hover:bg-blue-50'
                      }`}
                      style={{
                        textAlign: col.just === 'R' ? 'right' : col.just === 'C' ? 'center' : 'left',
                      }}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span>{headerTitle}</span>
                        {isSorted && (
                          <span className="text-blue-800 font-bold text-[10px]">
                            {sortInfo?.asc ? '▲' : '▼'}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {displayedFlightRows.length === 0 ? (
                <tr>
                  <td colSpan={itemCatalog.length + 1} className="py-12 text-center text-slate-400">
                    선택된 조건에 해당하는 운항 스케줄 데이터가 없습니다.
                  </td>
                </tr>
              ) : (
                displayedFlightRows.map((row, rIdx) => {
                  const isRowSelected = selectedRowIndex === rIdx;

                  return (
                    <tr
                      key={`${row.CARRID}-${row.CONNID}-${rIdx}`}
                      onClick={() => setSelectedRowIndex(rIdx)}
                      onDoubleClick={() => setDetailModalRow(row)}
                      className={`cursor-pointer transition-colors divide-x divide-slate-200 ${
                        isRowSelected
                          ? 'bg-[#fff5cc]'
                          : rIdx % 2 === 1
                          ? 'bg-[#f4f7fb]'
                          : 'bg-white hover:bg-blue-50/50'
                      }`}
                    >
                      {/* Row index */}
                      <td className="w-10 px-1 py-1 text-center font-mono text-[10px] text-slate-500 bg-[#e4edf7]/50">
                        {rIdx + 1}
                      </td>

                      {/* Columns */}
                      {itemCatalog.map((col) => {
                        const val = row[col.fieldname];
                        const isColSelected = selectedColumnFields.includes(col.fieldname);
                        const isHotspot = col.hotspot;
                        const colorHex = col.emphasize ? getSapColorHex(col.emphasize) : null;

                        const alignClass =
                          col.just === 'R'
                            ? 'text-right'
                            : col.just === 'C'
                            ? 'text-center'
                            : 'text-left';

                        return (
                          <td
                            key={col.fieldname}
                            style={
                              !isRowSelected && !isColSelected && colorHex && colorHex.bg !== 'transparent'
                                ? { backgroundColor: colorHex.bg, color: colorHex.text }
                                : undefined
                            }
                            className={`px-3 py-1 font-mono ${alignClass} ${
                              isRowSelected
                                ? 'bg-[#fff5cc] text-slate-900 font-medium'
                                : isColSelected
                                ? 'bg-blue-50/80 font-medium'
                                : col.key
                                ? 'bg-[#bce0fd]/40 font-semibold'
                                : ''
                            }`}
                          >
                            {isHotspot ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDetailModalRow(row);
                                }}
                                className="underline text-blue-700 font-bold hover:text-blue-900 cursor-pointer"
                              >
                                {val}
                              </button>
                            ) : typeof val === 'number' && col.decimals !== undefined ? (
                              val.toLocaleString(undefined, {
                                minimumFractionDigits: col.decimals,
                                maximumFractionDigits: col.decimals,
                              })
                            ) : (
                              String(val ?? '')
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Totals Row */}
            {showTotals && displayedFlightRows.length > 0 && (
              <tfoot>
                <tr className="sticky bottom-0 z-10 bg-[#e0ecf8] font-bold border-t-2 border-[#9bbadb] divide-x divide-[#9bbadb]">
                  <td className="px-1 py-1.5 text-center text-blue-900 font-bold bg-[#d7e4f2]">∑</td>
                  {itemCatalog.map((col) => {
                    const alignClass =
                      col.just === 'R'
                        ? 'text-right'
                        : col.just === 'C'
                        ? 'text-center'
                        : 'text-left';

                    if (col.do_sum && totals[col.fieldname] !== undefined) {
                      const sumVal = totals[col.fieldname];
                      return (
                        <td key={col.fieldname} className={`px-3 py-1.5 font-mono text-blue-900 ${alignClass}`}>
                          {col.decimals !== undefined
                            ? sumVal.toLocaleString(undefined, {
                                minimumFractionDigits: col.decimals,
                                maximumFractionDigits: col.decimals,
                              })
                            : sumVal.toLocaleString()}
                        </td>
                      );
                    }
                    if (col.fieldname === 'CARRID') {
                      return (
                        <td key={col.fieldname} className="px-3 py-1.5 text-blue-900 font-bold">
                          합계 ({displayedFlightRows.length}건)
                        </td>
                      );
                    }
                    return <td key={col.fieldname} className="px-3 py-1.5 text-slate-400"></td>;
                  })}
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* ALV Footer Status */}
        <div className="px-3 py-1 bg-[#d7e4f2] border-t border-[#9bbadb] text-[10px] text-slate-700 flex items-center justify-between shrink-0 font-sans">
          <span>
            {selectedCarrier === 'ALL'
              ? '전체 항공사 운항 일정 표시 중'
              : `항공사 [${selectedCarrier}] 운항 스케줄 ${displayedFlightRows.length}건이 로드되었습니다.`}
          </span>
          <span className="font-mono text-slate-600">Double click row to view flight detail</span>
        </div>
      </div>

      {/* Flight Detail Modal (Double click on row) */}
      {detailModalRow && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl border border-slate-300 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-4 py-2.5 bg-[#005a9c] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plane className="w-4 h-4" />
                <span className="font-bold text-xs">
                  Flight Detail: {detailModalRow.CARRID} {detailModalRow.CONNID}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setDetailModalRow(null)}
                className="text-white/80 hover:text-white text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-3 font-sans text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded border border-slate-200">
                <div>
                  <span className="text-slate-500 text-[10px]">Carrier ID</span>
                  <p className="font-bold font-mono text-blue-900">{detailModalRow.CARRID}</p>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px]">Flight No.</span>
                  <p className="font-bold font-mono text-blue-900">{detailModalRow.CONNID}</p>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px]">Flight Date</span>
                  <p className="font-bold font-mono">{detailModalRow.FLDATE}</p>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px]">Airfare</span>
                  <p className="font-bold font-mono text-emerald-700">
                    {detailModalRow.PRICE} {detailModalRow.CURRENCY}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px]">Plane Type</span>
                  <p className="font-bold font-mono">{detailModalRow.PLANETYPE}</p>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px]">Occupancy</span>
                  <p className="font-bold font-mono">
                    {detailModalRow.SEATSOCC} / {detailModalRow.SEATSMAX} seats
                  </p>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setDetailModalRow(null)}
                  className="px-4 py-1.5 bg-[#005a9c] text-white rounded font-bold hover:bg-blue-800 cursor-pointer text-xs"
                >
                  확인 (Close)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
