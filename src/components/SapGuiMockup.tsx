import React, { useState, useMemo } from 'react';
import {
  Play,
  ArrowLeft,
  Search,
  Filter,
  FileSpreadsheet,
  Printer,
  X,
  ChevronDown,
  Info,
  Layers,
  SlidersHorizontal,
  Table,
  Check,
  Plus,
} from 'lucide-react';
import { ProgramSpec, AlvField, SelectionParameter, AlvErrorLog } from '../types/sap';
import { SapMultipleSelectionModal } from './SapMultipleSelectionModal';
import { DrilldownModal } from './DrilldownModal';
import { AlvDetailModal } from './AlvDetailModal';
import { AlvToolbar } from './AlvToolbar';
import { downloadFile } from '../utils/specExport';

interface SapGuiMockupProps {
  spec: ProgramSpec;
  onUpdateSpec?: (updated: ProgramSpec) => void;
}

interface StatusSummary {
  statusKey: string;
  count: number;
  label: string;
  iconType: 'DOC' | 'GREEN' | 'YELLOW' | 'RED' | 'FOLDER' | 'OTHER';
}

/**
 * SAP ALV Color Code interpreter
 * Format: C<color><intensified><inverse>
 * e.g., C300: yellow bg, C310: light yellow bg, C301: yellow text, C100: key blue
 */
export const getSapAlvCellStyle = (
  emphasize?: string,
  isKey = false,
  isSelected = false,
  isZebra = false
) => {
  if (isSelected) {
    return { bg: 'bg-[#fff5cc]', text: 'text-slate-900 font-bold' };
  }
  if (isKey) {
    return { bg: 'bg-[#bce0fd]', text: 'text-slate-900 font-semibold' };
  }
  if (!emphasize || !emphasize.startsWith('C')) {
    return {
      bg: isZebra ? 'bg-[#f4f7fb]' : 'bg-white',
      text: 'text-slate-800',
    };
  }

  const code = emphasize.toUpperCase();
  const colorNum = code.charAt(1);
  const intensified = code.charAt(2); // '1' or '0'
  const inverse = code.charAt(3);    // '1' or '0'

  switch (colorNum) {
    case '1': // Blue (Key / information)
      return {
        bg: intensified === '1' ? 'bg-blue-100' : 'bg-blue-200/70',
        text: 'text-blue-950 font-semibold',
      };
    case '2': // Gray
      return {
        bg: intensified === '1' ? 'bg-slate-200' : 'bg-slate-100',
        text: 'text-slate-900',
      };
    case '3': // Yellow (C300, C310, C301)
      if (intensified === '1') {
        return { bg: 'bg-[#fefce8]', text: 'text-[#854d0e] font-medium' }; // C310 Light yellow
      }
      if (inverse === '1') {
        return { bg: 'bg-white', text: 'text-[#b45309] font-bold' }; // C301 Yellow text
      }
      return { bg: 'bg-[#fef08a]', text: 'text-[#713f12] font-semibold' }; // C300 Yellow background
    case '4': // Cyan
      return {
        bg: intensified === '1' ? 'bg-cyan-100' : 'bg-cyan-200/70',
        text: 'text-cyan-950 font-medium',
      };
    case '5': // Green
      return {
        bg: intensified === '1' ? 'bg-emerald-100' : 'bg-emerald-200/70',
        text: 'text-emerald-950 font-semibold',
      };
    case '6': // Red
      return {
        bg: intensified === '1' ? 'bg-rose-100' : 'bg-rose-200/70',
        text: 'text-rose-950 font-semibold',
      };
    case '7': // Orange
      return {
        bg: intensified === '1' ? 'bg-orange-100' : 'bg-orange-200/70',
        text: 'text-orange-950 font-semibold',
      };
    default:
      return {
        bg: isZebra ? 'bg-[#f4f7fb]' : 'bg-white',
        text: 'text-slate-800',
      };
  }
};


export const SapGuiMockup: React.FC<SapGuiMockupProps> = ({ spec, onUpdateSpec }) => {
  // Screen mode: 'alv' (ALV 그리드 결과) or 'selection' (조회조건)
  const [screenMode, setScreenMode] = useState<'alv' | 'selection'>('alv');

  // Interactive Data & Filter state
  const [rows, setRows] = useState<Record<string, any>[]>(spec.mock_rows || []);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(0);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [filterQuery, setFilterQuery] = useState<string>('');
  const [showTotals, setShowTotals] = useState<boolean>(true);

  // Status (Sta.) Active Multi-Select Filters: default state has all statuses selected
  const [selectedStatusFilters, setSelectedStatusFilters] = useState<string[]>([
    '1',
    '2',
    '3',
    'DOC',
    'FOLDER',
  ]);

  // Toggle single status filter in multi-select mode
  const handleToggleStatusFilter = (statusKey: string) => {
    setSelectedStatusFilters((prev) => {
      const exists = prev.includes(statusKey);
      const next = exists ? prev.filter((k) => k !== statusKey) : [...prev, statusKey];
      setStatusMessage({
        text: exists
          ? `상태 [${statusKey}] 필터 해제(숨김)되었습니다.`
          : `상태 [${statusKey}] 필터 선택(출력)되었습니다.`,
        type: 'S',
      });
      return next;
    });
  };


  // Error Log sub-window visibility (defaults to true if spec has error_logs, exactly matching screenshot)
  const [showErrorLog, setShowErrorLog] = useState<boolean>(
    !!(spec.error_logs && spec.error_logs.length > 0)
  );

  // Status Bar message
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'S' | 'W' | 'E' }>({
    text: `데이터 조회 완료 (${spec.mock_rows?.length || 0}건 출력됨)`,
    type: 'S',
  });

  // Modals
  const [activeParamForMulti, setActiveParamForMulti] = useState<SelectionParameter | null>(null);
  const [drilldownInfo, setDrilldownInfo] = useState<{
    tcode: string;
    fieldValue: string;
    fieldName: string;
    fieldLabel: string;
    rowRecord: Record<string, any>;
  } | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);

  // Sync rows when spec changes
  React.useEffect(() => {
    setRows(spec.mock_rows || []);
    if (spec.error_logs && spec.error_logs.length > 0) {
      setShowErrorLog(true);
    }
  }, [spec.mock_rows, spec.error_logs]);

  // Find the Sta. (Status / 상태) field in Field Catalog
  const statusField = useMemo(() => {
    return spec.field_catalog.find(f =>
      f.fieldname === 'ZICON' ||
      f.fieldname === 'STATUS' ||
      f.fieldname === 'LIGHTS' ||
      f.coltext === '상태' ||
      f.coltext.toLowerCase().includes('sta') ||
      f.icon_type === 'DOC' ||
      f.icon_type === 'LIGHTS'
    );
  }, [spec.field_catalog]);

  // Calculate unique Sta. status counts dynamically from current grid rows
  const statusSummaries = useMemo<StatusSummary[]>(() => {
    if (!statusField) return [];
    const countsMap: Record<string, number> = {};

    rows.forEach(r => {
      const raw = r[statusField.fieldname];
      if (raw !== undefined && raw !== null && String(raw).trim() !== '') {
        const val = String(raw).trim();
        countsMap[val] = (countsMap[val] || 0) + 1;
      }
    });

    return Object.entries(countsMap).map(([key, count]) => {
      let iconType: StatusSummary['iconType'] = 'OTHER';
      let label = key;

      if (key === 'DOC') {
        iconType = 'DOC';
        label = '문서';
      } else if (key === '1' || key.toLowerCase() === 'green') {
        iconType = 'GREEN';
        label = '정상';
      } else if (key === '2' || key.toLowerCase() === 'yellow') {
        iconType = 'YELLOW';
        label = '경고/진행';
      } else if (key === '3' || key.toLowerCase() === 'red') {
        iconType = 'RED';
        label = '오류';
      } else if (key === 'FOLDER') {
        iconType = 'FOLDER';
        label = '폴더';
      }

      return {
        statusKey: key,
        count,
        label,
        iconType,
      };
    });
  }, [statusField, rows]);

  // Sorting
  const handleSort = (fieldname: string, asc = true) => {
    setSortField(fieldname);
    setSortAsc(asc);
  };

  // Filter & Sorted rows
  const displayedRows = useMemo(() => {
    let result = [...rows];

    // Sta. status multi-select filter: only rows matching one of the selected statuses are shown
    if (statusField && selectedStatusFilters) {
      result = result.filter(row => {
        const val = String(row[statusField.fieldname] || '').trim();
        if (!val) return true;
        return selectedStatusFilters.includes(val);
      });
    }

    // Text filter query
    if (filterQuery.trim()) {
      const q = filterQuery.toLowerCase();
      result = result.filter(row =>
        Object.values(row).some(v => String(v).toLowerCase().includes(q))
      );
    }

    // Column sort
    if (sortField) {
      result.sort((a, b) => {
        const valA = a[sortField];
        const valB = b[sortField];
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortAsc ? valA - valB : valB - valA;
        }
        return sortAsc
          ? String(valA || '').localeCompare(String(valB || ''))
          : String(valB || '').localeCompare(String(valA || ''));
      });
    }
    return result;
  }, [rows, selectedStatusFilters, statusField, filterQuery, sortField, sortAsc]);

  // Totals calculations for DO_SUM fields
  const totals = useMemo(() => {
    const sumMap: Record<string, number> = {};
    spec.field_catalog.forEach(f => {
      if (f.do_sum) {
        sumMap[f.fieldname] = displayedRows.reduce((acc, row) => {
          const val = Number(row[f.fieldname]) || 0;
          return acc + val;
        }, 0);
      }
    });
    return sumMap;
  }, [spec.field_catalog, displayedRows]);

  // Master-Detail ALV Resolution (Sample Type 02)
  const isMasterDetail = spec.sample_type === '02' && !!spec.item_grid;
  const foreignKey = spec.item_grid?.foreign_key || 'VBELN';
  const selectedHeaderRow =
    selectedRowIndex !== null && displayedRows[selectedRowIndex]
      ? displayedRows[selectedRowIndex]
      : displayedRows[0];
  const selectedHeaderKey = selectedHeaderRow
    ? selectedHeaderRow[foreignKey] || selectedHeaderRow.DOC_NO || selectedHeaderRow.VBELN
    : null;

  const [selectedItemRowIndex, setSelectedItemRowIndex] = useState<number | null>(0);

  const itemRows = useMemo(() => {
    if (!spec.item_grid?.mock_rows) return [];
    if (!selectedHeaderKey) return spec.item_grid.mock_rows;
    const filtered = spec.item_grid.mock_rows.filter(
      (r) => String(r[foreignKey] || '').trim() === String(selectedHeaderKey).trim()
    );
    return filtered.length > 0 ? filtered : spec.item_grid.mock_rows;
  }, [spec.item_grid?.mock_rows, foreignKey, selectedHeaderKey]);

  const itemTotals = useMemo(() => {
    if (!spec.item_grid?.field_catalog) return {};
    const sumMap: Record<string, number> = {};
    spec.item_grid.field_catalog.forEach((f) => {
      if (f.do_sum) {
        sumMap[f.fieldname] = itemRows.reduce((acc, row) => {
          const val = Number(row[f.fieldname]) || 0;
          return acc + val;
        }, 0);
      }
    });
    return sumMap;
  }, [spec.item_grid?.field_catalog, itemRows]);

  // Cycle Sta. status on click to test dynamic button generation
  const handleCycleStatus = (rowIndex: number, fieldname: string) => {
    const current = String(rows[rowIndex][fieldname] || '');
    let nextVal = '';
    if (current === '') nextVal = 'DOC';
    else if (current === 'DOC') nextVal = '1';
    else if (current === '1') nextVal = '2';
    else if (current === '2') nextVal = '3';
    else if (current === '3') nextVal = '';
    else nextVal = 'DOC';

    const updated = [...rows];
    updated[rowIndex] = { ...updated[rowIndex], [fieldname]: nextVal };
    setRows(updated);
    if (onUpdateSpec) {
      onUpdateSpec({ ...spec, mock_rows: updated });
    }
    setStatusMessage({
      text: `행 ${rowIndex + 1}의 Sta.가 [${nextVal || '없음'}]로 변경되었습니다. (툴바 버튼 수 자동 갱신)`,
      type: 'S',
    });
  };

  // Cell editing
  const handleCellEdit = (rowIndex: number, fieldname: string, newVal: any) => {
    const updated = [...rows];
    updated[rowIndex] = { ...updated[rowIndex], [fieldname]: newVal };
    setRows(updated);
    if (onUpdateSpec) {
      onUpdateSpec({ ...spec, mock_rows: updated });
    }
  };

  // Checkbox toggle
  const handleCheckboxToggle = (rowIndex: number) => {
    const updated = [...rows];
    updated[rowIndex] = {
      ...updated[rowIndex],
      CHECKBOX: !updated[rowIndex].CHECKBOX,
    };
    setRows(updated);
  };

  // Export ALV to CSV / Excel
  const handleExportCsv = () => {
    const headers = spec.field_catalog.map(f => `"${f.coltext}"`).join(',');
    const dataRows = displayedRows.map(row => {
      return spec.field_catalog
        .map(f => {
          const val = row[f.fieldname];
          return val !== undefined && val !== null ? `"${String(val).replace(/"/g, '""')}"` : '""';
        })
        .join(',');
    });
    const csvContent = '\uFEFF' + [headers, ...dataRows].join('\n');
    downloadFile(`${spec.program_id}_DATA.csv`, csvContent, 'text/csv;charset=utf-8;');
    setStatusMessage({ text: '스프레드시트 CSV 파일로 다운로드되었습니다.', type: 'S' });
  };

  // Render Sta. Icon in Toolbar or Cell
  const renderStatusIcon = (iconType: StatusSummary['iconType']) => {
    if (iconType === 'DOC') {
      return (
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-slate-700 fill-white stroke-slate-700 stroke-1 drop-shadow-2xs">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      );
    }
    if (iconType === 'GREEN') {
      return <span className="w-3 h-3 rounded-full bg-emerald-500 border border-emerald-700 shadow-xs inline-block" />;
    }
    if (iconType === 'YELLOW') {
      return <span className="w-3 h-3 rounded-full bg-amber-400 border border-amber-600 shadow-xs inline-block" />;
    }
    if (iconType === 'RED') {
      return <span className="w-3 h-3 rounded-full bg-rose-500 border border-rose-700 shadow-xs inline-block" />;
    }
    if (iconType === 'FOLDER') {
      return (
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-[#f6c342] stroke-[#c98e16] stroke-1 drop-shadow-2xs">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
      );
    }
    return <span className="text-[10px] font-bold text-slate-700 font-mono">●</span>;
  };

  return (
    <div className="flex flex-col h-full bg-[#dbe7f5] rounded-xl overflow-hidden border border-[#9bbadb] shadow-xl font-sans select-none relative">
      {/* 1. SAP GUI Classic Sky Blue Gradient Titlebar */}
      <div
        className="flex items-center justify-between px-3 py-1.5 text-slate-900 border-b border-[#9bbadb] shadow-xs"
        style={{
          background: 'linear-gradient(to bottom, #d8e8f8 0%, #b8d4f0 40%, #c8ddf4 100%)',
        }}
      >
        <div className="flex items-center gap-2">
          <span className="font-bold italic text-sm text-[#0f2238] tracking-tight drop-shadow-xs">
            {spec.title}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-700 font-medium">
          <span className="font-mono text-[11px] opacity-80">[{spec.program_id}]</span>
          <span className="opacity-40">|</span>
          <span>{spec.target_sap_release}</span>
        </div>
      </div>

      {/* 2. Standard Application Sub-Toolbar with side-pane toggle & Execute icon */}
      <div className="flex items-center justify-between bg-[#dbe7f5] px-3 py-1 border-b border-[#a4bedb] gap-2">
        <div className="flex items-center gap-2">
          {/* Dual-pane / side panel toggle icon */}
          <button
            title="화면 분할 / 레이아웃 토글"
            className="p-1 rounded bg-[#e8f1fa] hover:bg-white border border-[#9bbadb] text-slate-700 shadow-2xs"
          >
            <div className="w-3.5 h-3.5 border border-slate-600 flex">
              <div className="w-1.5 h-full bg-slate-500 border-r border-slate-600" />
              <div className="flex-1 bg-white" />
            </div>
          </button>

          {/* SAP Iconic Clock with Green Checkmark (Execute F8) */}
          <button
            onClick={() => {
              setScreenMode(screenMode === 'alv' ? 'selection' : 'alv');
              setStatusMessage({
                text: screenMode === 'alv' ? '선택 화면으로 전환되었습니다.' : 'ALV Grid 조회 완료',
                type: 'S',
              });
            }}
            title={screenMode === 'alv' ? '선택 화면으로 이동 (F3)' : '실행 (F8 / Execute)'}
            className="p-1 rounded bg-[#e8f1fa] hover:bg-white border border-[#9bbadb] text-slate-700 shadow-2xs flex items-center justify-center cursor-pointer"
          >
            <div className="relative w-4 h-4 flex items-center justify-center">
              <div className="w-3.5 h-3.5 rounded-full border border-slate-600 bg-white" />
              <Check className="w-4 h-4 text-emerald-600 font-extrabold absolute -top-0.5 -right-0.5 drop-shadow-xs" strokeWidth={3.5} />
            </div>
          </button>

        </div>

        {/* View Switcher: Selection vs ALV Grid */}
        <div className="flex items-center gap-1 bg-[#cbdcf0] p-0.5 rounded border border-[#a4bedb]">
          <button
            onClick={() => setScreenMode('selection')}
            className={`px-2.5 py-0.5 text-[11px] rounded transition-colors flex items-center gap-1 ${
              screenMode === 'selection'
                ? 'bg-white text-slate-900 font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <SlidersHorizontal className="w-3 h-3" />
            선택 화면
          </button>
          <button
            onClick={() => setScreenMode('alv')}
            className={`px-2.5 py-0.5 text-[11px] rounded transition-colors flex items-center gap-1 ${
              screenMode === 'alv'
                ? 'bg-white text-slate-900 font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3 h-3 text-blue-700" />
            ALV Grid 결과
          </button>
        </div>
      </div>

      {/* 3. Authentic SAP Classic Yellow / Amber ALV Toolbar */}
      {screenMode === 'alv' && (
        <AlvToolbar
          spec={spec}
          statusSummaries={statusSummaries}
          selectedStatusFilters={selectedStatusFilters}
          onToggleStatusFilter={handleToggleStatusFilter}
          onOpenDetail={() => setIsDetailModalOpen(true)}
          onSort={(asc) => handleSort(sortField || spec.field_catalog[2]?.fieldname || 'SET_NAME', asc)}
          onFilter={() => {
            const q = prompt('ALV 필터링할 검색어를 입력하세요:', filterQuery);
            if (q !== null) setFilterQuery(q);
          }}
          filterQuery={filterQuery}
          onClearFilter={() => setFilterQuery('')}
          onToggleTotals={() => setShowTotals(!showTotals)}
          onExport={handleExportCsv}
          onPrint={() => window.print()}
          onInfo={() =>
            setStatusMessage({
              text: `프로그램 ID: ${spec.program_id} | 트랜잭션: ${spec.tcode} | 작성자: ${spec.author} | 모듈: ${spec.module}`,
              type: 'S',
            })
          }
          onCustomAction={(btn) => {
            setStatusMessage({
              text: `버튼 [${btn.text}] (${btn.function}) 실행됨`,
              type: 'S',
            });
          }}
        />
      )}

      {/* 4. Main Body: ALV Grid or Selection Screen */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white relative">
        {screenMode === 'selection' ? (
          /* Selection Screen */
          <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-[#ece9d8]">
            <div className="border border-slate-400 bg-[#f4f2e6] rounded p-4 shadow-xs max-w-2xl">
              <div className="font-semibold text-xs text-slate-800 mb-3 border-b border-slate-300 pb-1 flex items-center justify-between">
                <span>기본 조회 조건 (Selection Criteria)</span>
                <span className="font-mono text-[10px] text-slate-500">
                  BLOCK b1 WITH FRAME TITLE TEXT-001
                </span>
              </div>

              <div className="space-y-2.5">
                {spec.selection_params.map((param) => (
                  <div key={param.id} className="flex items-center text-xs gap-3">
                    <div className="w-48 text-right font-medium text-slate-700 flex items-center justify-end gap-1">
                      {param.obligatory && <span className="text-red-600 font-bold">*</span>}
                      <span>{param.text}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={param.low || ''}
                        onChange={(e) => {
                          const updatedParams = spec.selection_params.map(p =>
                            p.id === param.id ? { ...p, low: e.target.value } : p
                          );
                          if (onUpdateSpec) onUpdateSpec({ ...spec, selection_params: updatedParams });
                        }}
                        placeholder={param.default_val || ''}
                        className="w-32 bg-white border border-slate-400 px-2 py-0.5 text-xs font-mono focus:outline-none focus:border-blue-600 shadow-inner"
                      />
                      {param.kind === 'SELECT_OPTION' && (
                        <>
                          <span className="text-slate-500">~</span>
                          <input
                            type="text"
                            value={param.high || ''}
                            onChange={(e) => {
                              const updatedParams = spec.selection_params.map(p =>
                                p.id === param.id ? { ...p, high: e.target.value } : p
                              );
                              if (onUpdateSpec) onUpdateSpec({ ...spec, selection_params: updatedParams });
                            }}
                            placeholder="To"
                            className="w-32 bg-white border border-slate-400 px-2 py-0.5 text-xs font-mono focus:outline-none focus:border-blue-600 shadow-inner"
                          />
                          <button
                            onClick={() => setActiveParamForMulti(param)}
                            className="px-2 py-0.5 bg-[#ece9d8] border border-slate-400 hover:bg-white text-emerald-700 font-bold text-xs"
                          >
                            ▶
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* ALV Grid Container: Master-Detail Split or Single ALV */
          <div className="flex-1 flex flex-col overflow-hidden relative">
            {isMasterDetail && spec.item_grid ? (
              /* ============================================================= */
              /* MASTER-DETAIL ALV: TOP (HEADER) + BOTTOM (ITEM) PANE           */
              /* ============================================================= */
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* 1. TOP PANE: Header ALV Grid */}
                <div className="flex-[5] flex flex-col overflow-hidden border-b-2 border-[#9bbadb]">
                  {/* Header Grid Titlebar */}
                  <div className="bg-[#e4edf7] px-3 py-1.5 border-b border-[#9bbadb] text-xs font-bold text-slate-800 flex items-center justify-between shadow-2xs shrink-0">
                    <div className="flex items-center gap-1.5">
                      <Table className="w-3.5 h-3.5 text-blue-800" />
                      <span>{spec.layout?.grid_title || 'Header ALV Grid (오더 헤더)'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-slate-600 font-normal">
                      <span>SEL_MODE: {spec.layout?.sel_mode || 'A'}</span>
                      <span>|</span>
                      <span>총 {displayedRows.length}건</span>
                      <span>|</span>
                      <span className="font-bold text-blue-800">선택 오더: {selectedHeaderKey || '-'}</span>
                    </div>
                  </div>

                  {/* Header Grid Table */}
                  <div className="flex-1 overflow-auto">
                    <table className="w-full border-collapse text-xs font-sans whitespace-nowrap">
                      <thead className="sticky top-0 z-10 bg-[#d8e4f0] border-b border-[#9bbadb] text-slate-900">
                        <tr>
                          <th className="w-8 px-1 py-1 border-r border-[#9bbadb] bg-[#c8d8ea] text-center">
                            <div className="w-3.5 h-3.5 mx-auto border border-slate-600 bg-white flex items-center justify-center">
                              <span className="text-[9px] text-blue-900 leading-none font-bold">▶</span>
                            </div>
                          </th>
                          {spec.field_catalog.map((field) => (
                            <th
                              key={field.id || field.fieldname}
                              style={{ minWidth: Math.max(field.outputlen * 9, 65) }}
                              className={`px-2 py-1.5 border-r border-[#9bbadb] text-left font-semibold text-xs ${
                                field.key ? 'bg-[#bce0fd] text-slate-900' : 'bg-[#d8e4f0] text-slate-900'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span>{field.coltext}</span>
                                {sortField === field.fieldname && (
                                  <span className="text-blue-800 font-bold text-[10px]">
                                    {sortAsc ? '▲' : '▼'}
                                  </span>
                                )}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {displayedRows.length === 0 ? (
                          <tr>
                            <td colSpan={spec.field_catalog.length + 1} className="py-8 text-center text-slate-400">
                              헤더 데이터가 없습니다.
                            </td>
                          </tr>
                        ) : (
                          displayedRows.map((row, rIdx) => {
                            const isSelected = selectedRowIndex === rIdx;
                            const isZebra = !!spec.layout?.zebra && rIdx % 2 === 1;
                            return (
                              <tr
                                key={rIdx}
                                onClick={() => {
                                  setSelectedRowIndex(rIdx);
                                  setStatusMessage({
                                    text: `헤더 오더 [${row[foreignKey] || row.DOC_NO || rIdx + 1}] 선택됨 (하단 품목 그리드 자동 연동)`,
                                    type: 'S',
                                  });
                                }}
                                className={`hover:bg-[#ebf3fb] cursor-pointer ${
                                  isSelected ? 'bg-[#fff5cc]' : isZebra ? 'bg-[#f4f7fb]' : 'bg-white'
                                }`}
                              >
                                <td className="w-8 px-1 py-1 text-center bg-[#d4d0c8] border-r border-[#9bbadb] border-t border-l border-[#f0ede6] border-b border-[#808080] font-mono text-[10px] text-slate-700 font-semibold select-none">
                                  {rIdx + 1}
                                </td>
                                {spec.field_catalog.map((field) => {
                                  const val = row[field.fieldname];
                                  const isKey = field.key;
                                  const isStatusCol =
                                    field.fieldname === 'ZICON' ||
                                    field.fieldname === 'STATUS' ||
                                    field.fieldname === 'LIGHTS' ||
                                    field.coltext === '상태';

                                  const cellStyle = getSapAlvCellStyle(
                                    field.emphasize,
                                    isKey,
                                    isSelected,
                                    isZebra
                                  );

                                  return (
                                    <td
                                      key={field.id || field.fieldname}
                                      onClick={(e) => {
                                        if (isStatusCol) {
                                          e.stopPropagation();
                                          handleCycleStatus(rIdx, field.fieldname);
                                        }
                                      }}
                                      className={`px-2 py-1 border-r border-[#d8d8d8] text-xs font-mono ${
                                        field.just === 'R'
                                          ? 'text-right'
                                          : field.just === 'C'
                                          ? 'text-center'
                                          : 'text-left'
                                      } ${cellStyle.bg} ${cellStyle.text}`}
                                    >
                                      {isStatusCol || val === '1' || val === '2' || val === '3' ? (
                                        <div className="flex items-center justify-center">
                                          {val === '1' || val === 1 ? (
                                            <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 border border-emerald-700 shadow-xs inline-block" />
                                          ) : val === '2' || val === 2 ? (
                                            <span className="w-3.5 h-3.5 rounded-full bg-amber-400 border border-amber-600 shadow-xs inline-block" />
                                          ) : (
                                            <span className="w-3.5 h-3.5 rounded-full bg-rose-500 border border-rose-700 shadow-xs inline-block" />
                                          )}
                                        </div>
                                      ) : field.hotspot ? (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setDrilldownInfo({
                                              tcode: field.drilldown_tcode || 'VA03',
                                              fieldValue: String(val),
                                              fieldName: field.fieldname,
                                              fieldLabel: field.coltext,
                                              rowRecord: row,
                                            })
                                          }
                                          className="text-blue-700 hover:text-blue-900 underline font-semibold cursor-pointer"
                                        >
                                          {val !== undefined && val !== null ? String(val) : ''}
                                        </button>
                                      ) : (
                                        <span>{val !== undefined && val !== null ? String(val) : ''}</span>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })
                        )}
                      </tbody>

                      {/* Header ALV Total Row (DO_SUM) */}
                      {spec.field_catalog.some((f) => f.do_sum) && (
                        <tfoot className="sticky bottom-0 z-10 bg-[#e4edf7] border-t-2 border-[#8ba9cb] font-bold text-slate-900 shadow-xs">
                          <tr className="bg-[#e0ecf8]">
                            <td className="w-8 px-1 py-1 text-center bg-[#c8d8ea] border-r border-[#9bbadb] text-[10px] text-blue-900 font-bold select-none">
                              Σ
                            </td>
                            {spec.field_catalog.map((field, idx) => {
                              const hasSum = !!field.do_sum;
                              const sumVal = totals[field.fieldname];
                              const isFirstTextCol = idx === 0 || (idx === 1 && (spec.field_catalog[0].fieldname === 'ZICON' || spec.field_catalog[0].fieldname === 'STATUS'));
                              return (
                                <td
                                  key={field.id || field.fieldname}
                                  className={`px-2 py-1.5 border-r border-[#9bbadb] text-xs font-mono ${
                                    hasSum ? 'text-right text-blue-950 bg-[#d5e6f7]' : isFirstTextCol ? 'text-left text-slate-800' : 'text-center text-slate-400'
                                  }`}
                                >
                                  {hasSum ? (
                                    <span className="font-extrabold text-blue-900">
                                      {Number(sumVal || 0).toLocaleString()}
                                    </span>
                                  ) : isFirstTextCol ? (
                                    <span className="font-bold text-slate-700">* Total (합계)</span>
                                  ) : (
                                    ''
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>

                {/* 2. BOTTOM PANE: Item ALV Grid */}
                <div className="flex-[5] flex flex-col overflow-hidden bg-white">
                  {/* Item Grid Titlebar */}
                  <div className="bg-[#e9f0f8] px-3 py-1.5 border-b border-[#9bbadb] text-xs font-bold text-slate-800 flex items-center justify-between shadow-2xs shrink-0">
                    <div className="flex items-center gap-1.5">
                      <Table className="w-3.5 h-3.5 text-indigo-700" />
                      <span>{spec.item_grid.layout?.grid_title || 'Item ALV Grid (오더 품목)'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-slate-600 font-normal">
                      <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-semibold border border-blue-200">
                        연계 오더: {selectedHeaderKey || '전체'} ({itemRows.length}건)
                      </span>
                      <span>|</span>
                      <span>SEL_MODE: {spec.item_grid.layout?.sel_mode || 'A'}</span>
                    </div>
                  </div>

                  {/* Item Grid Table */}
                  <div className="flex-1 overflow-auto">
                    <table className="w-full border-collapse text-xs font-sans whitespace-nowrap">
                      <thead className="sticky top-0 z-10 bg-[#d8e4f0] border-b border-[#9bbadb] text-slate-900">
                        <tr>
                          <th className="w-8 px-1 py-1 border-r border-[#9bbadb] bg-[#c8d8ea] text-center">
                            <div className="w-3.5 h-3.5 mx-auto border border-slate-600 bg-white flex items-center justify-center">
                              <span className="text-[9px] text-blue-900 leading-none font-bold">▶</span>
                            </div>
                          </th>
                          {spec.item_grid.field_catalog.map((field) => (
                            <th
                              key={field.id || field.fieldname}
                              style={{ minWidth: Math.max(field.outputlen * 9, 65) }}
                              className={`px-2 py-1.5 border-r border-[#9bbadb] text-left font-semibold text-xs ${
                                field.key ? 'bg-[#bce0fd] text-slate-900' : 'bg-[#d8e4f0] text-slate-900'
                              }`}
                            >
                              <span>{field.coltext}</span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {itemRows.length === 0 ? (
                          <tr>
                            <td colSpan={spec.item_grid.field_catalog.length + 1} className="py-8 text-center text-slate-400">
                              선택된 오더({selectedHeaderKey || '-'})에 해당하는 품목 데이터가 없습니다.
                            </td>
                          </tr>
                        ) : (
                          itemRows.map((row, rIdx) => {
                            const isSelected = selectedItemRowIndex === rIdx;
                            const isZebra = !!spec.item_grid?.layout?.zebra && rIdx % 2 === 1;
                            return (
                              <tr
                                key={rIdx}
                                onClick={() => setSelectedItemRowIndex(rIdx)}
                                className={`hover:bg-[#ebf3fb] cursor-pointer ${
                                  isSelected ? 'bg-[#fff5cc]' : isZebra ? 'bg-[#f4f7fb]' : 'bg-white'
                                }`}
                              >
                                <td className="w-8 px-1 py-1 text-center bg-[#d4d0c8] border-r border-[#9bbadb] border-t border-l border-[#f0ede6] border-b border-[#808080] font-mono text-[10px] text-slate-700 font-semibold select-none">
                                  {rIdx + 1}
                                </td>
                                {spec.item_grid!.field_catalog.map((field) => {
                                  const val = row[field.fieldname];
                                  const isKey = field.key;
                                  const isStatusCol =
                                    field.fieldname === 'ZICON' ||
                                    field.fieldname === 'STATUS' ||
                                    field.fieldname === 'LIGHTS' ||
                                    field.coltext === '상태';

                                  const cellStyle = getSapAlvCellStyle(
                                    field.emphasize,
                                    isKey,
                                    isSelected,
                                    isZebra
                                  );

                                  return (
                                    <td
                                      key={field.id || field.fieldname}
                                      className={`px-2 py-1 border-r border-[#d8d8d8] text-xs font-mono ${
                                        field.just === 'R'
                                          ? 'text-right'
                                          : field.just === 'C'
                                          ? 'text-center'
                                          : 'text-left'
                                      } ${cellStyle.bg} ${cellStyle.text}`}
                                    >
                                      {isStatusCol || val === '1' || val === '2' || val === '3' ? (
                                        <div className="flex items-center justify-center">
                                          {val === '1' || val === 1 ? (
                                            <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 border border-emerald-700 shadow-xs inline-block" />
                                          ) : val === '2' || val === 2 ? (
                                            <span className="w-3.5 h-3.5 rounded-full bg-amber-400 border border-amber-600 shadow-xs inline-block" />
                                          ) : (
                                            <span className="w-3.5 h-3.5 rounded-full bg-rose-500 border border-rose-700 shadow-xs inline-block" />
                                          )}
                                        </div>
                                      ) : field.hotspot ? (
                                        <span className="text-blue-700 underline font-semibold">
                                          {val !== undefined && val !== null ? String(val) : ''}
                                        </span>
                                      ) : (
                                        <span>{val !== undefined && val !== null ? String(val) : ''}</span>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })
                        )}
                      </tbody>

                      {/* Item Grid Total Row (DO_SUM) */}
                      {spec.item_grid.field_catalog.some((f) => f.do_sum) && (
                        <tfoot className="sticky bottom-0 z-10 bg-[#e4edf7] border-t-2 border-[#8ba9cb] font-bold text-slate-900 shadow-xs">
                          <tr className="bg-[#e0ecf8]">
                            <td className="w-8 px-1 py-1 text-center bg-[#c8d8ea] border-r border-[#9bbadb] text-[10px] text-blue-900 font-bold select-none">
                              Σ
                            </td>
                            {spec.item_grid.field_catalog.map((field, idx) => {
                              const hasSum = !!field.do_sum;
                              const sumVal = itemTotals[field.fieldname];
                              const isFirstTextCol = idx === 0 || (idx === 1 && (spec.item_grid!.field_catalog[0].fieldname === 'ZICON' || spec.item_grid!.field_catalog[0].fieldname === 'STATUS'));
                              return (
                                <td
                                  key={field.id || field.fieldname}
                                  className={`px-2 py-1.5 border-r border-[#9bbadb] text-xs font-mono ${
                                    hasSum ? 'text-right text-blue-950 bg-[#d5e6f7]' : isFirstTextCol ? 'text-left text-slate-800' : 'text-center text-slate-400'
                                  }`}
                                >
                                  {hasSum ? (
                                    <span className="font-extrabold text-blue-900">
                                      {Number(sumVal || 0).toLocaleString()}
                                    </span>
                                  ) : isFirstTextCol ? (
                                    <span className="font-bold text-slate-700">* Total (합계)</span>
                                  ) : (
                                    ''
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              /* ============================================================= */
              /* STANDARD SINGLE ALV GRID                                      */
              /* ============================================================= */
              <div className="flex-1 flex flex-col overflow-auto relative">
                {/* Real-time Layout Grid Title & Options Indicator */}
                {spec.layout?.grid_title && (
                  <div className="bg-[#e4edf7] px-3 py-1.5 border-b border-[#9bbadb] text-xs font-bold text-slate-800 flex items-center justify-between shadow-2xs shrink-0">
                    <div className="flex items-center gap-1.5">
                      <Table className="w-3.5 h-3.5 text-blue-800" />
                      <span>{spec.layout.grid_title}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-slate-600 font-normal">
                      <span>SEL_MODE: {spec.layout.sel_mode || 'A'}</span>
                      <span>|</span>
                      <span>줄무늬(Zebra): {spec.layout.zebra ? 'ON' : 'OFF'}</span>
                      <span>|</span>
                      <span>총 {displayedRows.length}건</span>
                    </div>
                  </div>
                )}

                <table className="w-full border-collapse text-xs font-sans whitespace-nowrap">
                  {/* Header Row */}
                  <thead className="sticky top-0 z-10 bg-[#d8e4f0] border-b border-[#9bbadb] text-slate-900">
                    <tr>
                      <th className="w-8 px-1 py-1 border-r border-[#9bbadb] bg-[#c8d8ea] text-center">
                        <div className="w-3.5 h-3.5 mx-auto border border-slate-600 bg-white flex items-center justify-center">
                          <span className="text-[9px] text-blue-900 leading-none font-bold">▶</span>
                        </div>
                      </th>
                      {spec.field_catalog.map((field) => {
                        const isKey = field.key;
                        return (
                          <th
                            key={field.id || field.fieldname}
                            style={{
                              minWidth: Math.max(field.outputlen * 9, 65),
                            }}
                            className={`px-2 py-1.5 border-r border-[#9bbadb] text-left font-semibold text-xs ${
                              isKey ? 'bg-[#bce0fd] text-slate-900' : 'bg-[#d8e4f0] text-slate-900'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span>{field.coltext}</span>
                              {sortField === field.fieldname && (
                                <span className="text-blue-800 font-bold text-[10px]">
                                  {sortAsc ? '▲' : '▼'}
                                </span>
                              )}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>

                  {/* Body */}
                  <tbody className="divide-y divide-slate-200">
                    {displayedRows.length === 0 ? (
                      <tr>
                        <td colSpan={spec.field_catalog.length + 1} className="py-12 text-center text-slate-400">
                          데이터가 없습니다. (툴바 신호등 필터 상태를 확인하세요)
                        </td>
                      </tr>
                    ) : (
                      displayedRows.map((row, rIdx) => {
                        const isSelected = selectedRowIndex === rIdx;
                        const isZebra = !!spec.layout?.zebra && rIdx % 2 === 1;
                        return (
                          <tr
                            key={rIdx}
                            onClick={() => setSelectedRowIndex(rIdx)}
                            className={`hover:bg-[#ebf3fb] cursor-pointer ${
                              isSelected ? 'bg-[#fff5cc]' : isZebra ? 'bg-[#f4f7fb]' : 'bg-white'
                            }`}
                          >
                            <td className="w-8 px-1 py-1 text-center bg-[#d4d0c8] border-r border-[#9bbadb] border-t border-l border-[#f0ede6] border-b border-[#808080] font-mono text-[10px] text-slate-700 font-semibold select-none">
                              {spec.layout?.show_row_numbers ? (
                                rIdx + 1
                              ) : (
                                <div className="w-2.5 h-2 bg-[#d4d0c8] mx-auto" />
                              )}
                            </td>

                            {spec.field_catalog.map((field) => {
                              const val = row[field.fieldname];
                              const isKey = field.key;
                              const isStatusCol =
                                field.fieldname === 'ZICON' ||
                                field.fieldname === 'STATUS' ||
                                field.fieldname === 'LIGHTS' ||
                                field.coltext === '상태' ||
                                field.icon_type === 'DOC';

                              const alignClass =
                                field.just === 'R'
                                  ? 'text-right'
                                  : field.just === 'C'
                                  ? 'text-center'
                                  : 'text-left';

                              const cellStyle = getSapAlvCellStyle(
                                field.emphasize,
                                isKey,
                                isSelected,
                                isZebra
                              );

                              return (
                                <td
                                  key={field.id || field.fieldname}
                                  onClick={(e) => {
                                    if (isStatusCol) {
                                      e.stopPropagation();
                                      handleCycleStatus(rIdx, field.fieldname);
                                    }
                                  }}
                                  title={
                                    isStatusCol
                                      ? '클릭 시 Sta. 상태가 변경되며, 툴바 필터가 자동 갱신됩니다.'
                                      : field.emphasize
                                      ? `SAP 컬러: ${field.emphasize}`
                                      : undefined
                                  }
                                  className={`px-2 py-1 border-r border-[#d8d8d8] text-xs font-mono ${alignClass} ${cellStyle.bg} ${cellStyle.text} ${
                                    isStatusCol ? 'cursor-pointer hover:brightness-95' : ''
                                  }`}
                                >
                                  {field.icon_type === 'DOC' || val === 'DOC' ? (
                                    <div className="flex items-center justify-center">
                                      <svg viewBox="0 0 24 24" className="w-4 h-4 text-slate-700 fill-white stroke-slate-700 stroke-1 drop-shadow-2xs">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                        <polyline points="14 2 14 8 20 8" />
                                      </svg>
                                    </div>
                                  ) : field.icon_type === 'FOLDER' || val === 'FOLDER' ? (
                                    <div className="flex items-center justify-center">
                                      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#f6c342] stroke-[#c98e16] stroke-1 drop-shadow-2xs">
                                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                                      </svg>
                                    </div>
                                  ) : field.fieldname === 'ZICON' || field.fieldname === 'LIGHTS' || field.fieldname === 'STATUS' || val === '1' || val === '2' || val === '3' ? (
                                    <div className="flex items-center justify-center">
                                      {val === '1' || val === 1 ? (
                                        <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 border border-emerald-700 shadow-xs inline-block" />
                                      ) : val === '2' || val === 2 ? (
                                        <span className="w-3.5 h-3.5 rounded-full bg-amber-400 border border-amber-600 shadow-xs inline-block" />
                                      ) : (
                                        <span className="w-3.5 h-3.5 rounded-full bg-rose-500 border border-rose-700 shadow-xs inline-block" />
                                      )}
                                    </div>
                                  ) : field.checkbox ? (
                                    <input
                                      type="checkbox"
                                      checked={!!val}
                                      onChange={() => handleCheckboxToggle(rIdx)}
                                      className="accent-blue-600"
                                    />
                                  ) : field.hotspot ? (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setDrilldownInfo({
                                          tcode: field.drilldown_tcode || 'KAH3',
                                          fieldValue: String(val),
                                          fieldName: field.fieldname,
                                          fieldLabel: field.coltext,
                                          rowRecord: row,
                                        })
                                      }
                                      className="text-blue-700 hover:text-blue-900 underline font-semibold cursor-pointer"
                                    >
                                      {val !== undefined && val !== null ? String(val) : ''}
                                    </button>
                                  ) : field.edit ? (
                                    <input
                                      type="text"
                                      value={val !== undefined && val !== null ? String(val) : ''}
                                      onChange={(e) => handleCellEdit(rIdx, field.fieldname, e.target.value)}
                                      className="w-full bg-yellow-50 border border-yellow-300 px-1 text-xs"
                                    />
                                  ) : (
                                    <span>{val !== undefined && val !== null ? String(val) : ''}</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })
                    )}
                  </tbody>

                  {/* Single ALV Total Row (DO_SUM) */}
                  {spec.field_catalog.some((f) => f.do_sum) && (
                    <tfoot className="sticky bottom-0 z-10 bg-[#e4edf7] border-t-2 border-[#8ba9cb] font-bold text-slate-900 shadow-xs">
                      <tr className="bg-[#e0ecf8]">
                        <td className="w-8 px-1 py-1 text-center bg-[#c8d8ea] border-r border-[#9bbadb] text-[10px] text-blue-900 font-bold select-none">
                          Σ
                        </td>
                        {spec.field_catalog.map((field, idx) => {
                          const hasSum = !!field.do_sum;
                          const sumVal = totals[field.fieldname];
                          const isFirstTextCol = idx === 0 || (idx === 1 && (spec.field_catalog[0].fieldname === 'ZICON' || spec.field_catalog[0].fieldname === 'STATUS'));
                          return (
                            <td
                              key={field.id || field.fieldname}
                              className={`px-2 py-1.5 border-r border-[#9bbadb] text-xs font-mono ${
                                hasSum ? 'text-right text-blue-950 bg-[#d5e6f7]' : isFirstTextCol ? 'text-left text-slate-800' : 'text-center text-slate-400'
                              }`}
                            >
                              {hasSum ? (
                                <span className="font-extrabold text-blue-900">
                                  {Number(sumVal || 0).toLocaleString()}
                                </span>
                              ) : isFirstTextCol ? (
                                <span className="font-bold text-slate-700">* Total (합계)</span>
                              ) : (
                                ''
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
          </div>
        )}

        {/* 5. [오류 로그] (Error Log ALV Sub-Window) - 100% Exact match to Screenshot! */}
        {showErrorLog && spec.error_logs && spec.error_logs.length > 0 && (
          <div className="absolute bottom-4 left-6 right-6 max-w-xl z-30 rounded border-2 border-red-500/80 shadow-2xl overflow-hidden bg-white">
            {/* Dark Blue Header matching screenshot */}
            <div
              className="flex items-center justify-between px-3 py-1.5 text-white"
              style={{
                background: 'linear-gradient(to right, #113366 0%, #1e4a88 100%)',
              }}
            >
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <div className="w-3.5 h-3.5 border border-white/80 rounded-2xs flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-white/60" />
                </div>
                <span>오류 로그</span>
              </div>
              <button
                onClick={() => setShowErrorLog(false)}
                className="hover:bg-white/20 p-0.5 rounded text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Error Log Table with Red Selection Box */}
            <div className="overflow-x-auto border-t border-slate-300">
              <table className="w-full text-xs font-sans border-collapse">
                <thead className="bg-[#e4edf7] border-b border-[#a4bedb] text-slate-800 font-semibold text-[11px]">
                  <tr>
                    <th className="py-1 px-3 w-16 text-center border-r border-[#a4bedb] bg-[#e4edf7]">
                      유형
                    </th>
                    <th className="py-1 px-3 w-28 text-left border-r border-[#a4bedb] bg-[#e4edf7]">
                      열 이름
                    </th>
                    <th className="py-1 px-3 text-left bg-[#e4edf7]">
                      메시지 텍스트
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {spec.error_logs.map((err, idx) => (
                    <tr key={err.id || idx} className="hover:bg-red-50/50">
                      {/* 유형: Red circular target error symbol */}
                      <td className="py-1 px-3 text-center border-r border-[#a4bedb] bg-white">
                        <div className="relative w-4 h-4 mx-auto flex items-center justify-center">
                          <div className="w-3.5 h-3.5 rounded-full border-2 border-red-700 bg-red-600 flex items-center justify-center shadow-xs">
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          </div>
                        </div>
                      </td>

                      {/* 열 이름: Yellow/Amber highlighted background with red outline box! */}
                      <td
                        className="py-1 px-3 border-r border-[#a4bedb] font-medium text-slate-900"
                        style={{
                          backgroundColor: '#ffde7a',
                        }}
                      >
                        {err.col_name}
                      </td>

                      {/* 메시지 텍스트 */}
                      <td className="py-1 px-3 text-slate-900 font-normal">
                        {err.message}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 6. SAP Classic Status Bar */}
      <div className="flex items-center justify-between bg-[#dbe7f5] px-3 py-1 border-t border-[#a4bedb] text-xs text-slate-700">
        <div className="flex items-center gap-2">
          {statusMessage.type === 'S' ? (
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-emerald-700 inline-block" />
          ) : (
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 border border-rose-700 inline-block" />
          )}
          <span className="font-medium text-slate-800">{statusMessage.text}</span>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-slate-600 font-mono">
          <span>PRD (100)</span>
          <span className="opacity-40">|</span>
          <span>cl_gui_alv_grid</span>
          <span className="opacity-40">|</span>
          <span>100%</span>
        </div>
      </div>

      {/* Modals */}
      {activeParamForMulti && (
        <SapMultipleSelectionModal
          param={activeParamForMulti}
          isOpen={!!activeParamForMulti}
          onClose={() => setActiveParamForMulti(null)}
          onApply={(low, high) => {
            const updated = spec.selection_params.map(p =>
              p.id === activeParamForMulti.id ? { ...p, low, high } : p
            );
            if (onUpdateSpec) onUpdateSpec({ ...spec, selection_params: updated });
            setStatusMessage({
              text: `[${activeParamForMulti.text}] 다중 조건 설정 완료`,
              type: 'S',
            });
          }}
        />
      )}

      {drilldownInfo && (
        <DrilldownModal
          isOpen={!!drilldownInfo}
          onClose={() => setDrilldownInfo(null)}
          tcode={drilldownInfo.tcode}
          fieldValue={drilldownInfo.fieldValue}
          fieldName={drilldownInfo.fieldName}
          fieldLabel={drilldownInfo.fieldLabel}
          rowRecord={drilldownInfo.rowRecord}
        />
      )}

      {isDetailModalOpen && (
        <AlvDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          record={displayedRows[selectedRowIndex || 0] || null}
          fieldCatalog={spec.field_catalog}
          rowIndex={selectedRowIndex || 0}
          totalRows={displayedRows.length}
          onPrevRow={() => setSelectedRowIndex(prev => Math.max(0, (prev || 0) - 1))}
          onNextRow={() => setSelectedRowIndex(prev => Math.min(displayedRows.length - 1, (prev || 0) + 1))}
        />
      )}
    </div>
  );
};
