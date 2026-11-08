import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  Sparkles,
  Loader2,
  Palette,
  Settings,
} from 'lucide-react';
import { ProgramSpec, AlvField, SelectionParameter, AlvErrorLog } from '../types/sap';
import { SapMultipleSelectionModal } from './SapMultipleSelectionModal';
import { DrilldownModal } from './DrilldownModal';
import { AlvDetailModal } from './AlvDetailModal';
import { AlvToolbar } from './AlvToolbar';
import { SapPivotBrowser } from './SapPivotBrowser';
import { SapThemeSettingsModal } from './SapThemeSettingsModal';
import { SapGuiTheme, SAP_GUI_THEMES, DEFAULT_SAP_THEME } from '../data/sapGuiThemes';
import { DEFAULT_ALV_TOOLBAR_BUTTONS } from '../data/defaultToolbarButtons';
import { downloadFile } from '../utils/specExport';

interface SapGuiMockupProps {
  spec: ProgramSpec;
  onUpdateSpec?: (updated: ProgramSpec) => void;
  currentTheme?: SapGuiTheme;
  onSelectTheme?: (theme: SapGuiTheme) => void;
  mockDataTrigger?: number;
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
  isZebra = false,
  isEditable = false
) => {
  if (isSelected) {
    return { bg: 'bg-[#fff5cc]', text: 'text-slate-900 font-bold' };
  }
  // User request: 변경이 가능한 필드는 노란색 바탕이 아닌 그냥 흰색으로 처리해 주세요.
  if (isEditable) {
    return { bg: 'bg-white', text: 'text-slate-900' };
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

/**
 * Intelligent deterministic SAP mock data generator
 * Used as high-reliability fallback when offline or field types are updated
 */
const generateDeterministicSapMockRows = (fields: AlvField[], rowCount = 5): Record<string, any>[] => {
  const result: Record<string, any>[] = [];
  const partnerNames = [
    '(주)삼성전자 수원공장',
    '현대모비스 남양연구소',
    'LG에너지솔루션 오창공장',
    'SK하이닉스 이천캠퍼스',
    '포스코 포항제철소',
  ];
  const amounts = [45000000, 38200000, 19800000, 52400000, 14500000];

  for (let r = 0; r < rowCount; r++) {
    const row: Record<string, any> = {};
    fields.forEach((f) => {
      const fn = f.fieldname.toUpperCase();
      if (fn === 'ZICON' || fn === 'STATUS' || fn === 'LIGHTS') {
        row[f.fieldname] = r === 2 ? '2' : r === 4 ? '3' : '1';
      } else if (fn.includes('VBELN') || fn.includes('DOC_NO') || fn.includes('DOCNO')) {
        row[f.fieldname] = `00100000${45 + r}`;
      } else if (fn.includes('EBELN')) {
        row[f.fieldname] = `450001928${r}`;
      } else if (fn.includes('BELNR')) {
        row[f.fieldname] = `100000001${r}`;
      } else if (f.datatype === 'DATS' || fn.includes('DATE') || fn.includes('ERDAT') || fn.includes('BUDAT')) {
        row[f.fieldname] = `2026.10.${String(10 + r * 3).padStart(2, '0')}`;
      } else if (
        f.datatype === 'CURR' ||
        f.datatype === 'DEC' ||
        fn.includes('AMOUNT') ||
        fn.includes('NETWR') ||
        fn.includes('DMBTR') ||
        fn.includes('NETPR')
      ) {
        row[f.fieldname] = amounts[r % amounts.length];
      } else if (
        fn.includes('WAERK') ||
        fn.includes('WAERS') ||
        fn.includes('CURRENCY') ||
        fn.includes('HWAER')
      ) {
        row[f.fieldname] = 'KRW';
      } else if (
        fn.includes('NAME') ||
        fn.includes('PARTNER') ||
        fn.includes('KUNNR') ||
        fn.includes('LIFNR')
      ) {
        row[f.fieldname] = partnerNames[r % partnerNames.length];
      } else if (fn.includes('MATNR')) {
        row[f.fieldname] = `MAT-PART-00${r + 1}`;
      } else if (fn.includes('MENGE') || fn.includes('KWMENG')) {
        row[f.fieldname] = (r + 1) * 25;
      } else if (fn.includes('MEINS') || fn.includes('VRKME')) {
        row[f.fieldname] = 'EA';
      } else if (f.datatype === 'NUMC') {
        row[f.fieldname] = String(r + 1).padStart(f.outputlen || 4, '0');
      } else {
        row[f.fieldname] = `${f.coltext || f.fieldname} ${r + 1}`;
      }
    });
    result.push(row);
  }
  return result;
};

export const SapGuiMockup: React.FC<SapGuiMockupProps> = ({
  spec,
  onUpdateSpec,
  currentTheme: propTheme,
  onSelectTheme: propSelectTheme,
  mockDataTrigger,
}) => {
  // Screen mode: 'alv' (ALV 그리드 결과) or 'selection' (조회조건)
  const [screenMode, setScreenMode] = useState<'alv' | 'selection'>('alv');

  // Interactive Data & Filter state
  const [rows, setRows] = useState<Record<string, any>[]>(spec.mock_rows || []);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(0);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [filterQuery, setFilterQuery] = useState<string>('');
  const [showTotals, setShowTotals] = useState<boolean>(true);

  // Column Text Mode: 'coltext' (필드 카탈로그 텍스트) <-> 'fieldname' (내부 테이블 필드명)
  const [columnTextMode, setColumnTextMode] = useState<'coltext' | 'fieldname'>('coltext');

  // Multiple Column Selection for Excel-like contiguous dragging, Ctrl/Shift click, Multi-Sort, and &TOTAL (RFQ v1.10 Page 2)
  const [selectedColumnFields, setSelectedColumnFields] = useState<string[]>([]);
  const isDraggingColumnRef = useRef<boolean>(false);
  const dragAnchorFieldRef = useRef<string | null>(null);
  const lastClickedFieldRef = useRef<string | null>(null);

  // Multi-column sort state
  const [sortColumns, setSortColumns] = useState<{ fieldname: string; asc: boolean }[]>([]);

  // Cell selection state for SEL_MODE 'D'
  const [selectedCell, setSelectedCell] = useState<{ rIdx: number; fieldname: string } | null>(null);

  // Setup window mouseup listener to finish drag selection
  useEffect(() => {
    const handleWindowMouseUp = () => {
      isDraggingColumnRef.current = false;
    };
    window.addEventListener('mouseup', handleWindowMouseUp);
    return () => window.removeEventListener('mouseup', handleWindowMouseUp);
  }, []);

  // Column Width Optimization (gs_layo-cwidth_opt)
  const [isOptimizedWidth, setIsOptimizedWidth] = useState<boolean>(spec.layout?.cwidth_opt ?? true);

  // Synchronize Column Width Optimization with spec.layout in real-time
  useEffect(() => {
    if (spec.layout?.cwidth_opt !== undefined) {
      setIsOptimizedWidth(spec.layout.cwidth_opt);
    }
  }, [spec.layout?.cwidth_opt]);

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
          ? `Status [${statusKey}] filter removed.`
          : `Status [${statusKey}] filter applied.`,
        type: 'S',
      });
      return next;
    });
  };

  // Error Log sub-window visibility (defaults to true if spec has error_logs, exactly matching screenshot)
  const [showErrorLog, setShowErrorLog] = useState<boolean>(
    !!(spec.error_logs && spec.error_logs.length > 0)
  );

  // Status Bar message (displayed in bottom fixed status bar, preventing ALV Grid shifts)
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'S' | 'W' | 'E' }>({
    text: `Data loaded (${spec.mock_rows?.length || 0} rows displayed)`,
    type: 'S',
  });

  // SAP GUI Theme State (Blue Crystal, Belize, Quartz)
  const [localTheme, setLocalTheme] = useState<SapGuiTheme>(() => {
    try {
      const saved = localStorage.getItem('sap_gui_mockup_theme') as SapGuiTheme;
      if (saved && SAP_GUI_THEMES[saved]) return saved;
    } catch {
      // localStorage unavailable in some contexts
    }
    return DEFAULT_SAP_THEME;
  });

  const currentTheme = propTheme || localTheme;
  const [isThemeSettingsOpen, setIsThemeSettingsOpen] = useState<boolean>(false);

  const handleSelectTheme = (newTheme: SapGuiTheme) => {
    if (propSelectTheme) {
      propSelectTheme(newTheme);
    } else {
      setLocalTheme(newTheme);
    }
    try {
      localStorage.setItem('sap_gui_mockup_theme', newTheme);
    } catch {
      // localStorage error handling
    }
    setStatusMessage({
      text: `SAP GUI Theme changed to [${SAP_GUI_THEMES[newTheme].name}] (${SAP_GUI_THEMES[newTheme].releaseBadge}).`,
      type: 'S',
    });
  };

  const themeInfo = SAP_GUI_THEMES[currentTheme] || SAP_GUI_THEMES[DEFAULT_SAP_THEME];
  const themeStyles = themeInfo.styles;

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
  const [isGeneratingMockData, setIsGeneratingMockData] = useState<boolean>(false);

  // Generate realistic mock data using Gemini AI via server-side endpoint with smart fallback
  const handleGenerateAiMockData = async () => {
    if (!spec.field_catalog || spec.field_catalog.length === 0) {
      setStatusMessage({
        text: 'Warning: Field catalog is empty. Please configure fields first.',
        type: 'W',
      });
      return;
    }

    setIsGeneratingMockData(true);
    setStatusMessage({
      text: 'Requesting Gemini AI to generate realistic SAP records...',
      type: 'S',
    });

    try {
      const response = await fetch('/api/generate-mock-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field_catalog: spec.field_catalog,
          module: spec.module,
          title: spec.title,
          business_purpose: spec.business_purpose,
          count: 5,
        }),
      });

      const data = await response.json();
      if (data && Array.isArray(data.rows) && data.rows.length > 0) {
        setRows(data.rows);
        if (onUpdateSpec) {
          onUpdateSpec({
            ...spec,
            mock_rows: data.rows,
          });
        }
        setStatusMessage({
          text: `Success: Generated ${data.rows.length} realistic SAP records via Gemini AI.`,
          type: 'S',
        });
        return;
      }
      throw new Error(data?.error || 'Empty response from AI server');
    } catch (err: any) {
      console.warn('AI mock data generation fallback:', err);
      // Deterministic realistic SAP fallback based on field catalog
      const fallbackRows = generateDeterministicSapMockRows(spec.field_catalog, 5);
      setRows(fallbackRows);
      if (onUpdateSpec) {
        onUpdateSpec({
          ...spec,
          mock_rows: fallbackRows,
        });
      }
      setStatusMessage({
        text: `Populated ${fallbackRows.length} realistic SAP records based on field catalog types.`,
        type: 'S',
      });
    } finally {
      setIsGeneratingMockData(false);
    }
  };

  // Trigger AI Mock data generation when requested from TopNav
  const prevTriggerRef = useRef(mockDataTrigger);
  useEffect(() => {
    if (mockDataTrigger && mockDataTrigger > (prevTriggerRef.current || 0)) {
      handleGenerateAiMockData();
    }
    prevTriggerRef.current = mockDataTrigger;
  }, [mockDataTrigger]);

  // Sync rows when spec changes
  useEffect(() => {
    setRows(spec.mock_rows || []);
    if (spec.error_logs && spec.error_logs.length > 0) {
      setShowErrorLog(true);
    }
  }, [spec.mock_rows, spec.error_logs]);

  // Column Text Mode Toggle: Coltext <-> Fieldname (RFQ v1.09 Page 3)
  const handleToggleColumnText = () => {
    setColumnTextMode((prev) => {
      const next = prev === 'coltext' ? 'fieldname' : 'coltext';
      setStatusMessage({
        text: next === 'fieldname'
          ? 'ALV 열 헤더가 내부 테이블 필드명(Fieldname)으로 전환되었습니다.'
          : 'ALV 열 헤더가 필드 카탈로그 텍스트(Coltext)로 전환되었습니다.',
        type: 'S',
      });
      return next;
    });
  };

  // Column Selection Handlers (RFQ v1.10 Page 2):
  // Dragging across headers selects contiguous columns, Ctrl+Click toggles, Shift+Click ranges
  const handleColumnHeaderMouseDown = (fieldname: string, e: React.MouseEvent) => {
    e.preventDefault();
    const catalogFields = spec.field_catalog.map((f) => f.fieldname);

    // Single Click Header Sort (SGL_CLK_HD = 'X')
    if (spec.layout?.sgl_clk_hd && !e.ctrlKey && !e.shiftKey) {
      const fieldDef = spec.field_catalog.find((f) => f.fieldname === fieldname);
      if (!fieldDef?.sort_enable) {
        setStatusMessage({
          text: `[${fieldname}] 열은 Sort 설정에서 ENABLE이 체크되어 있지 않아 정렬할 수 없습니다.`,
          type: 'W',
        });
        return;
      }
      if (sortField === fieldname) {
        if (sortAsc) {
          setSortAsc(false);
          setSortColumns([{ fieldname, asc: false }]);
          setStatusMessage({
            text: `[SGL_CLK_HD] 열 [${fieldname}] 내림차순(Descending) 정렬 적용`,
            type: 'S',
          });
        } else {
          setSortField(null);
          setSortColumns([]);
          setStatusMessage({
            text: `[SGL_CLK_HD] 열 [${fieldname}] 정렬 해제`,
            type: 'S',
          });
        }
      } else {
        setSortField(fieldname);
        setSortAsc(true);
        setSortColumns([{ fieldname, asc: true }]);
        setStatusMessage({
          text: `[SGL_CLK_HD] 열 [${fieldname}] 오름차순(Ascending) 정렬 적용`,
          type: 'S',
        });
      }
    }

    // If SEL_MODE is 'B' (Row selection only), column selection is disabled
    if (spec.layout?.sel_mode === 'B') {
      return;
    }

    if (e.ctrlKey || e.metaKey) {
      // Ctrl + Click: toggle individual column
      setSelectedColumnFields((prev) => {
        const next = prev.includes(fieldname)
          ? prev.filter((k) => k !== fieldname)
          : [...prev, fieldname];
        setStatusMessage({
          text: `열 [${fieldname}] ${prev.includes(fieldname) ? '선택 해제' : '선택 추가'} (총 ${next.length}개 선택됨)`,
          type: 'S',
        });
        return next;
      });
      lastClickedFieldRef.current = fieldname;
      dragAnchorFieldRef.current = fieldname;
      isDraggingColumnRef.current = false;
    } else if (e.shiftKey && lastClickedFieldRef.current) {
      // Shift + Click: select contiguous range from last clicked column
      const idx1 = catalogFields.indexOf(lastClickedFieldRef.current);
      const idx2 = catalogFields.indexOf(fieldname);
      if (idx1 !== -1 && idx2 !== -1) {
        const start = Math.min(idx1, idx2);
        const end = Math.max(idx1, idx2);
        const range = catalogFields.slice(start, end + 1);
        setSelectedColumnFields(range);
        setStatusMessage({
          text: `열 범위 선택됨: ${catalogFields[start]} ~ ${catalogFields[end]} (총 ${range.length}개)`,
          type: 'S',
        });
      }
      isDraggingColumnRef.current = false;
    } else {
      // Regular Click or Drag Start
      setSelectedColumnFields([fieldname]);
      lastClickedFieldRef.current = fieldname;
      dragAnchorFieldRef.current = fieldname;
      isDraggingColumnRef.current = true;
      setStatusMessage({
        text: `열 [${fieldname}]이(가) 선택되었습니다. 드래그하여 다중 선택하거나 상단 툴바의 정렬/합계를 실행하세요.`,
        type: 'S',
      });
    }
  };

  const handleColumnHeaderMouseEnter = (fieldname: string) => {
    if (!isDraggingColumnRef.current || !dragAnchorFieldRef.current) return;
    const catalogFields = spec.field_catalog.map((f) => f.fieldname);
    const idx1 = catalogFields.indexOf(dragAnchorFieldRef.current);
    const idx2 = catalogFields.indexOf(fieldname);
    if (idx1 !== -1 && idx2 !== -1) {
      const start = Math.min(idx1, idx2);
      const end = Math.max(idx1, idx2);
      const range = catalogFields.slice(start, end + 1);
      setSelectedColumnFields(range);
    }
  };

  // Multi-column sorting helper
  const handleMultiSort = (fields: string[], asc: boolean) => {
    setSortColumns(fields.map((f) => ({ fieldname: f, asc })));
    setSortField(fields[0] || null);
    setSortAsc(asc);
  };

  // Column Width Optimization: gs_layo-cwidth_opt (RFQ v1.09 & v1.10 Page 1)
  const handleOptimizeWidth = () => {
    const nextVal = !isOptimizedWidth;
    setIsOptimizedWidth(nextVal);
    if (onUpdateSpec && spec.layout) {
      onUpdateSpec({
        ...spec,
        layout: {
          ...spec.layout,
          cwidth_opt: nextVal,
        },
      });
    }
    setStatusMessage({
      text: nextVal
        ? '열 너비 최적화(gs_layo-cwidth_opt = "X")가 적용되어 데이터와 헤더 길이에 맞게 축소되었습니다.'
        : '열 너비 최적화가 해제되고 기본 폭(outputlen)으로 복원되었습니다.',
      type: 'S',
    });
  };

  // &TOTAL Button: Calculate total for selected column(s) (RFQ v1.10 Page 2)
  const handleToggleTotals = () => {
    if (selectedColumnFields.length > 0) {
      const allSummed = selectedColumnFields.every(
        (fname) => spec.field_catalog.find((f) => f.fieldname === fname)?.do_sum
      );
      const nextDoSum = !allSummed;
      const updatedCatalog = spec.field_catalog.map((f) =>
        selectedColumnFields.includes(f.fieldname) ? { ...f, do_sum: nextDoSum } : f
      );
      if (onUpdateSpec) {
        onUpdateSpec({ ...spec, field_catalog: updatedCatalog });
      }
      setShowTotals(true);
      setStatusMessage({
        text: nextDoSum
          ? `선택된 ${selectedColumnFields.length}개 열의 합계 계산(&TOTAL)이 활성화되었습니다.`
          : `선택된 ${selectedColumnFields.length}개 열의 합계 계산(&TOTAL)이 해제되었습니다.`,
        type: 'S',
      });
      return;
    }
    setShowTotals((prev) => !prev);
    setStatusMessage({
      text: !showTotals ? 'ALV 합계 행이 표시됩니다.' : 'ALV 합계 행이 숨김 처리되었습니다.',
      type: 'S',
    });
  };

  // Visual character width helper to calculate tight, authentic SAP ALV column shrink widths (RFQ v1.10 Page 1)
  const getVisualWidth = (str: string) => {
    let w = 0;
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      // Hangul / CJK characters take ~12px
      if (
        (code >= 0x1100 && code <= 0x11ff) ||
        (code >= 0x3130 && code <= 0x318f) ||
        (code >= 0xac00 && code <= 0xd7af)
      ) {
        w += 12;
      } else {
        // ASCII, digits, punctuation take ~7.2px
        w += 7.2;
      }
    }
    return w;
  };

  // Calculate dynamic column width matching SAP ALV gs_layo-cwidth_opt
  const getColumnWidth = (field: AlvField, isItem = false) => {
    if (!isOptimizedWidth) {
      return Math.max(field.outputlen * 8 + 16, 45);
    }
    // Special compact width for icon / status / checkbox columns
    if (
      field.checkbox ||
      field.fieldname === 'ZICON' ||
      field.fieldname === 'LIGHTS' ||
      field.icon_type === 'LIGHTS' ||
      field.icon_type === 'DOC'
    ) {
      return 42;
    }

    const headerText =
      columnTextMode === 'fieldname' ? field.fieldname : field.coltext || field.fieldname;
    const targetRows = isItem ? itemRows : displayedRows;

    let maxVisual = getVisualWidth(headerText);
    const sampleLimit = Math.min(targetRows.length, 40);
    for (let i = 0; i < sampleLimit; i++) {
      const valStr = String(targetRows[i]?.[field.fieldname] ?? '');
      if (valStr) {
        const valWidth = getVisualWidth(valStr);
        if (valWidth > maxVisual) {
          maxVisual = valWidth;
        }
      }
    }
    // Also consider totals sum value if do_sum is active
    if (field.do_sum) {
      const sumVal = isItem ? itemTotals[field.fieldname] : totals[field.fieldname];
      if (sumVal !== undefined && sumVal !== null) {
        const sumStr = Number(sumVal || 0).toLocaleString();
        const sumWidth = getVisualWidth(sumStr);
        if (sumWidth > maxVisual) {
          maxVisual = sumWidth;
        }
      }
    }

    // Shrink tight to cell content and headers exactly matching content width (RFQ v1.12)
    return Math.max(Math.ceil(maxVisual + 20), 45);
  };

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
    setSortColumns([{ fieldname, asc }]);
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

    // Column sort: Only fields with ENABLE checked participate in Sort (RFQ v1.14 Page 3)
    const enabledSortFields = spec.field_catalog.filter(f => !!f.sort_enable);

    if (enabledSortFields.length > 0) {
      // Filter interactive sortColumns to only those enabled
      const activeSortCols = sortColumns.filter(sc =>
        enabledSortFields.some(ef => ef.fieldname === sc.fieldname)
      );

      if (activeSortCols.length > 0) {
        result.sort((a, b) => {
          for (const sc of activeSortCols) {
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
      } else if (sortField && enabledSortFields.some(ef => ef.fieldname === sortField)) {
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
      } else {
        // Multi-column sort by enabled fields ordered by SPOS and respecting UP/DOWN directions
        const sortedEnabledFields = [...enabledSortFields].sort((a, b) => {
          const sposA = typeof a.spos === 'number' && !isNaN(a.spos) ? a.spos : 999;
          const sposB = typeof b.spos === 'number' && !isNaN(b.spos) ? b.spos : 999;
          return sposA - sposB;
        });

        result.sort((a, b) => {
          for (const ef of sortedEnabledFields) {
            const valA = a[ef.fieldname];
            const valB = b[ef.fieldname];
            const isDesc = !!ef.sort_down;
            let cmp = 0;
            if (typeof valA === 'number' && typeof valB === 'number') {
              cmp = isDesc ? valB - valA : valA - valB;
            } else {
              cmp = isDesc
                ? String(valB ?? '').localeCompare(String(valA ?? ''))
                : String(valA ?? '').localeCompare(String(valB ?? ''));
            }
            if (cmp !== 0) return cmp;
          }
          return 0;
        });
      }
    }
    return result;
  }, [rows, selectedStatusFilters, statusField, filterQuery, sortField, sortAsc, sortColumns, spec.field_catalog]);

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

  const [itemSortField, setItemSortField] = useState<string | null>(null);
  const [itemSortAsc, setItemSortAsc] = useState<boolean>(true);
  const [itemFilterQuery, setItemFilterQuery] = useState<string>('');
  const [showItemTotals, setShowItemTotals] = useState<boolean>(true);
  const [selectedItemStatusFilters, setSelectedItemStatusFilters] = useState<string[]>(['1', '2', '3', 'DOC']);

  const itemStatusField = useMemo(() => {
    return spec.item_grid?.field_catalog?.find(
      (f) => f.fieldname === 'ZICON' || f.fieldname === 'STATUS' || f.icon_type === 'LIGHTS'
    );
  }, [spec.item_grid?.field_catalog]);

  const itemStatusSummaries = useMemo<StatusSummary[]>(() => {
    if (!itemStatusField || !spec.item_grid?.mock_rows) return [];
    const countsMap: Record<string, number> = {};

    itemRows.forEach((r) => {
      const raw = r[itemStatusField.fieldname];
      const val = raw !== undefined && raw !== null ? String(raw).trim() : '';
      if (!val) return;
      countsMap[val] = (countsMap[val] || 0) + 1;
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
      return { statusKey: key, count, label, iconType };
    });
  }, [itemStatusField, itemRows]);

  const displayedItemRows = useMemo(() => {
    let result = [...itemRows];

    if (itemStatusField && selectedItemStatusFilters.length > 0) {
      result = result.filter((row) => {
        const val = String(row[itemStatusField.fieldname] || '').trim();
        if (!val) return true;
        return selectedItemStatusFilters.includes(val);
      });
    }

    if (itemFilterQuery.trim()) {
      const q = itemFilterQuery.toLowerCase();
      result = result.filter((row) =>
        Object.values(row).some((v) => String(v).toLowerCase().includes(q))
      );
    }

    if (itemSortField) {
      result.sort((a, b) => {
        const va = a[itemSortField];
        const vb = b[itemSortField];
        if (typeof va === 'number' && typeof vb === 'number') {
          return itemSortAsc ? va - vb : vb - va;
        }
        return itemSortAsc
          ? String(va || '').localeCompare(String(vb || ''))
          : String(vb || '').localeCompare(String(va || ''));
      });
    }

    return result;
  }, [itemRows, itemStatusField, selectedItemStatusFilters, itemFilterQuery, itemSortField, itemSortAsc]);

  const handleExportItemCsv = () => {
    if (!spec.item_grid) return;
    const headers = spec.item_grid.field_catalog.map((f) => `"${f.coltext}"`).join(',');
    const dataRows = displayedItemRows.map((row) =>
      spec.item_grid!.field_catalog
        .map((f) => {
          const val = row[f.fieldname];
          return val !== undefined && val !== null ? `"${String(val).replace(/"/g, '""')}"` : '""';
        })
        .join(',')
    );
    const csvContent = '\uFEFF' + [headers, ...dataRows].join('\n');
    downloadFile(`${spec.program_id}_ITEMS.csv`, csvContent, 'text/csv;charset=utf-8;');
    setStatusMessage({ text: '품목 그리드 데이터가 CSV로 다운로드되었습니다.', type: 'S' });
  };

  const itemTotals = useMemo(() => {
    if (!spec.item_grid?.field_catalog) return {};
    const sumMap: Record<string, number> = {};
    spec.item_grid.field_catalog.forEach((f) => {
      if (f.do_sum) {
        sumMap[f.fieldname] = displayedItemRows.reduce((acc, row) => {
          const val = Number(row[f.fieldname]) || 0;
          return acc + val;
        }, 0);
      }
    });
    return sumMap;
  }, [spec.item_grid?.field_catalog, displayedItemRows]);

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
    <div className={`flex flex-col h-full rounded-xl overflow-hidden shadow-xl font-sans select-none relative border transition-colors duration-200 ${themeStyles.containerBg} ${themeStyles.containerBorder}`}>
      {/* 1. SAP GUI Titlebar with Dynamic Theme */}
      <div
        className={`flex items-center justify-between px-3 py-1.5 border-b shadow-xs transition-colors duration-200 ${themeStyles.titleBarBorder}`}
        style={themeStyles.titleBarStyle}
      >
        <div className="flex items-center gap-2">
          <span className={`font-bold italic text-sm tracking-tight drop-shadow-xs ${themeStyles.titleBarText}`}>
            {spec.title}
          </span>
        </div>

        <div className={`flex items-center gap-2 text-xs font-medium ${themeStyles.titleBarSubtext}`}>
          <span className="font-mono text-[11px] opacity-90">[{spec.program_id}]</span>
          <span className="opacity-40">|</span>
          <span>{spec.target_sap_release}</span>
        </div>
      </div>

      {/* 2. Standard Application Sub-Toolbar with Execute icon (Uncluttered per RFQ v1.09 Page 2) */}
      <div className={`flex items-center justify-between px-3 py-1 border-b gap-2 flex-wrap transition-colors duration-200 ${themeStyles.subToolbarBg} ${themeStyles.subToolbarBorder} ${themeStyles.subToolbarText}`}>
        <div className="flex items-center gap-2">
          {/* SAP Iconic Clock with Green Checkmark (Execute F8) */}
          <button
            onClick={() => {
              setScreenMode(screenMode === 'alv' ? 'selection' : 'alv');
              setStatusMessage({
                text: screenMode === 'alv' ? 'Switched to Selection Screen.' : 'ALV Grid Displayed.',
                type: 'S',
              });
            }}
            title={screenMode === 'alv' ? 'Go to Selection Screen (F3)' : 'Execute (F8)'}
            className="p-1 rounded bg-[#e8f1fa] hover:bg-white border border-[#9bbadb] text-slate-700 shadow-2xs flex items-center justify-center cursor-pointer"
          >
            <div className="relative w-4 h-4 flex items-center justify-center">
              <div className="w-3.5 h-3.5 rounded-full border border-slate-600 bg-white" />
              <Check className="w-4 h-4 text-emerald-600 font-extrabold absolute -top-0.5 -right-0.5 drop-shadow-xs" strokeWidth={3.5} />
            </div>
          </button>
        </div>

        {/* View Switcher: Selection vs ALV Grid */}
        <div className={`flex items-center gap-1 p-0.5 rounded border transition-colors duration-200 ${themeStyles.switcherContainerBg}`}>
          <button
            onClick={() => setScreenMode('selection')}
            className={`px-2.5 py-0.5 text-[11px] rounded transition-colors flex items-center gap-1 cursor-pointer ${
              screenMode === 'selection'
                ? `${themeStyles.switcherActiveBg} font-semibold shadow-xs`
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <SlidersHorizontal className="w-3 h-3" />
            Selection Screen
          </button>
          <button
            onClick={() => setScreenMode('alv')}
            className={`px-2.5 py-0.5 text-[11px] rounded transition-colors flex items-center gap-1 cursor-pointer ${
              screenMode === 'alv'
                ? `${themeStyles.switcherActiveBg} font-semibold shadow-xs`
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3 h-3 text-blue-700" />
            ALV Grid Result
          </button>
        </div>
      </div>

      {/* 3. Authentic SAP ALV Toolbar with Dynamic Theme & New RFQ v1.09 Handlers */}
      {screenMode === 'alv' && !spec.layout?.no_toolbar && (
        <AlvToolbar
          spec={spec}
          theme={currentTheme}
          statusSummaries={statusSummaries}
          selectedStatusFilters={selectedStatusFilters}
          onToggleStatusFilter={handleToggleStatusFilter}
          onOpenDetail={() => setIsDetailModalOpen(true)}
          onSort={(asc) => {
            const rawTargets = selectedColumnFields.length > 0
              ? selectedColumnFields
              : [sortField || spec.field_catalog[1]?.fieldname || 'DOC_NO'];
            
            // Only fields with ENABLE checked in Sort Grid can participate in Sort
            const validTargets = rawTargets.filter((t) =>
              spec.field_catalog.some((f) => f.fieldname === t && f.sort_enable)
            );

            if (validTargets.length === 0) {
              setStatusMessage({
                text: 'Sort 설정에서 ENABLE이 체크된 필드로만 정렬할 수 있습니다. [Sort] 탭에서 해당 필드의 ENABLE을 체크하세요.',
                type: 'W',
              });
              return;
            }

            handleMultiSort(validTargets, asc);
            setStatusMessage({
              text: `ENABLE 체크된 ${validTargets.length}개 열 [${validTargets.join(', ')}] 기준 ${
                asc ? '오름차순 (Ascending)' : '내림차순 (Descending)'
              } 정렬 완료`,
              type: 'S',
            });
          }}
          onFilter={() => {
            const q = prompt('Enter search filter for ALV Grid:', filterQuery);
            if (q !== null) setFilterQuery(q);
          }}
          filterQuery={filterQuery}
          onClearFilter={() => setFilterQuery('')}
          onToggleTotals={handleToggleTotals}
          onToggleColumnText={handleToggleColumnText}
          onOptimizeWidth={handleOptimizeWidth}
          onExport={handleExportCsv}
          onPrint={() => window.print()}
          onInfo={() =>
            setStatusMessage({
              text: `Program ID: ${spec.program_id} | T-Code: ${spec.tcode} | Author: ${spec.author} | Module: ${spec.module}`,
              type: 'S',
            })
          }
          onCustomAction={(btn) => {
            setStatusMessage({
              text: `Button [${btn.text}] (${btn.function}) executed`,
              type: 'S',
            });
          }}
          onGenerateMockData={handleGenerateAiMockData}
          isGeneratingMockData={isGeneratingMockData}
        />
      )}

      {/* 4. Main Body: ALV Grid or Selection Screen */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white relative">
        {screenMode === 'selection' ? (
          /* Selection Screen with Theme styling */
          <div className={`flex-1 p-5 overflow-y-auto space-y-4 transition-colors duration-200 ${themeStyles.selectionBoxBg}`}>
            <div className={`border rounded p-4 shadow-xs max-w-2xl bg-white ${themeStyles.selectionBoxBorder}`}>
              <div className={`font-semibold text-xs mb-3 border-b pb-1 flex items-center justify-between ${themeStyles.selectionBoxBorder} text-slate-800`}>
                <span className="font-bold">기본 조회 조건 (Selection Criteria)</span>
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
          /* ALV Grid Container: Master-Detail Split or Single ALV or 04 Pivot Browser */
          <div className="flex-1 flex flex-col overflow-hidden relative">
            {spec.sample_type === '04' ? (
              <SapPivotBrowser
                spec={spec}
                theme={currentTheme}
                onDrilldown={(tcode, val) => {
                  setDrilldownInfo({
                    tcode,
                    fieldValue: val,
                    fieldName: 'HKONT',
                    fieldLabel: '계정과목 (Hauptbuchkonto)',
                    rowRecord: { HKONT: val },
                  });
                }}
              />
            ) : isMasterDetail && spec.item_grid ? (
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
                  <div className="flex-1 overflow-auto bg-white">
                    <table className={`${isOptimizedWidth ? 'w-auto self-start' : 'w-full'} border-collapse text-xs font-sans whitespace-nowrap`}>
                      <thead className={`sticky top-0 z-10 ${themeStyles.gridHeaderBg} border-b ${themeStyles.gridHeaderBorder} ${themeStyles.gridHeaderText}`}>
                        <tr>
                          <th className={`w-8 px-1 py-1 border-r ${themeStyles.gridHeaderBorder} ${themeStyles.gridCornerBg} text-center`}>
                            <div className="w-3.5 h-3.5 mx-auto border border-slate-600 bg-white flex items-center justify-center">
                              <span className="text-[9px] text-blue-900 leading-none font-bold">▶</span>
                            </div>
                          </th>
                          {spec.field_catalog.map((field) => {
                            const isColSelected = selectedColumnFields.includes(field.fieldname);
                            const colWidth = getColumnWidth(field);
                            return (
                              <th
                                key={field.id || field.fieldname}
                                onMouseDown={(e) => handleColumnHeaderMouseDown(field.fieldname, e)}
                                onMouseEnter={() => handleColumnHeaderMouseEnter(field.fieldname)}
                                style={{ width: colWidth, minWidth: colWidth }}
                                className={`px-2 py-1.5 border-r ${themeStyles.gridHeaderBorder} text-left font-semibold text-xs cursor-pointer select-none transition-all ${
                                  isColSelected
                                    ? 'ring-2 ring-inset ring-blue-600 bg-blue-100 text-blue-950 font-bold'
                                    : field.key
                                    ? 'bg-[#bce0fd] text-slate-900'
                                    : `${themeStyles.gridHeaderBg} ${themeStyles.gridHeaderText}`
                                }`}
                                title="클릭/드래그 시 열 다중 선택 (정렬 및 합계 연동)"
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <span>{columnTextMode === 'fieldname' ? field.fieldname : (field.coltext || field.fieldname)}</span>
                                  {field.sort_enable && sortColumns.some((sc) => sc.fieldname === field.fieldname) ? (
                                    <span className="text-blue-800 font-bold text-[10px]">
                                      {sortColumns.find((sc) => sc.fieldname === field.fieldname)?.asc ? '▲' : '▼'}
                                    </span>
                                  ) : field.sort_enable && sortField === field.fieldname ? (
                                    <span className="text-blue-800 font-bold text-[10px]">
                                      {sortAsc ? '▲' : '▼'}
                                    </span>
                                  ) : null}
                                </div>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {displayedRows.length === 0 ? (
                          <tr>
                            <td colSpan={spec.field_catalog.length + 1} className="py-8 text-center text-slate-500">
                              <p className="mb-2">No header data available.</p>
                              <button
                                type="button"
                                onClick={handleGenerateAiMockData}
                                disabled={isGeneratingMockData}
                                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                                <span>Generate Mock Data</span>
                              </button>
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
                                className={`h-7 hover:bg-[#ebf3fb] cursor-pointer ${
                                  isSelected ? 'bg-[#fff5cc]' : isZebra ? 'bg-[#f4f7fb]' : 'bg-white'
                                }`}
                              >
                                <td className="w-8 px-1 py-1 h-7 text-center bg-[#d4d0c8] border-r border-[#9bbadb] border-t border-l border-[#f0ede6] border-b border-[#808080] font-mono text-[10px] text-slate-700 font-semibold select-none">
                                  {rIdx + 1}
                                </td>
                                {spec.field_catalog.map((field) => {
                                  const val = row[field.fieldname];
                                  const isKey = field.key;
                                  const isColSelected = selectedColumnFields.includes(field.fieldname);
                                  const colWidth = getColumnWidth(field);
                                  const isStatusCol =
                                    field.fieldname === 'ZICON' ||
                                    field.fieldname === 'STATUS' ||
                                    field.fieldname === 'LIGHTS' ||
                                    field.coltext === '상태';

                                  const cellStyle = getSapAlvCellStyle(
                                    field.emphasize,
                                    isKey,
                                    isSelected,
                                    isZebra,
                                    !!field.edit
                                  );

                                  const cellBg = isSelected
                                    ? 'bg-[#fff5cc]'
                                    : isColSelected
                                    ? 'bg-blue-50/80 font-medium'
                                    : cellStyle.bg;

                                  return (
                                    <td
                                      key={field.id || field.fieldname}
                                      style={{ width: colWidth, minWidth: colWidth }}
                                      onClick={(e) => {
                                        if (isStatusCol) {
                                          e.stopPropagation();
                                          handleCycleStatus(rIdx, field.fieldname);
                                        }
                                      }}
                                      className={`px-2 py-1 h-7 border-r border-[#d8d8d8] text-xs font-mono ${
                                        field.just === 'R'
                                          ? 'text-right'
                                          : field.just === 'C'
                                          ? 'text-center'
                                          : 'text-left'
                                      } ${cellBg} ${cellStyle.text} ${isColSelected && !isSelected ? 'border-x-blue-300' : ''}`}
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
                                      ) : field.edit ? (
                                        <input
                                          type="text"
                                          value={val !== undefined && val !== null ? String(val) : ''}
                                          onChange={(e) => handleCellEdit(rIdx, field.fieldname, e.target.value)}
                                          className="w-full bg-white border border-slate-300 focus:border-blue-500 focus:bg-white px-1 text-xs text-slate-900 rounded-none shadow-2xs"
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

                      {/* Header ALV Total Row: Yellow background (#ffffa0), height matching regular row h-7 (RFQ v1.12) */}
                      {showTotals && spec.field_catalog.some((f) => f.do_sum) && (
                        <tfoot className="sticky bottom-0 z-10 bg-[#ffffa0] border-t border-yellow-400 font-bold text-slate-900 shadow-xs">
                          <tr className="bg-[#ffffa0] text-slate-900 h-7">
                            <td className="w-8 px-1 py-1 h-7 text-center bg-yellow-200 border-r border-yellow-400 text-[10px] text-slate-900 font-bold select-none">
                              Σ
                            </td>
                            {spec.field_catalog.map((field) => {
                              const hasSum = !!field.do_sum;
                              const sumVal = totals[field.fieldname];
                              const colWidth = getColumnWidth(field);
                              const isColSelected = selectedColumnFields.includes(field.fieldname);
                              return (
                                <td
                                  key={field.id || field.fieldname}
                                  style={{ width: colWidth, minWidth: colWidth }}
                                  className={`px-2 py-1 h-7 border-r border-yellow-400 text-xs font-mono ${
                                    isColSelected ? 'bg-yellow-200 ring-1 ring-inset ring-blue-500' : 'bg-[#ffffa0]'
                                  } text-slate-900 ${
                                    hasSum ? 'text-right font-extrabold' : 'text-center'
                                  }`}
                                >
                                  {hasSum ? (
                                    <span className="font-extrabold text-slate-950">
                                      {Number(sumVal || 0).toLocaleString()}
                                    </span>
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

                  {/* Item Grid ALV Toolbar (RFQ v1.07 Page 2 & 3) */}
                  <AlvToolbar
                    spec={{
                      ...spec,
                      toolbar_buttons:
                        spec.item_grid.toolbar_buttons && spec.item_grid.toolbar_buttons.length > 0
                          ? spec.item_grid.toolbar_buttons
                          : DEFAULT_ALV_TOOLBAR_BUTTONS,
                      custom_toolbar: spec.item_grid.custom_toolbar || [],
                      field_catalog: spec.item_grid.field_catalog,
                      mock_rows: displayedItemRows,
                    }}
                    theme={currentTheme}
                    statusSummaries={itemStatusSummaries}
                    selectedStatusFilters={selectedItemStatusFilters}
                    onToggleStatusFilter={(key) => {
                      setSelectedItemStatusFilters((prev) =>
                        prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
                      );
                    }}
                    onOpenDetail={() => {
                      setIsDetailModalOpen(true);
                    }}
                    onSort={(asc) => {
                      const fld = spec.item_grid?.field_catalog[2]?.fieldname || 'POSNR';
                      setItemSortField(fld);
                      setItemSortAsc(asc);
                    }}
                    onFilter={() => {
                      const q = prompt('Enter search filter for Item Grid:', itemFilterQuery);
                      if (q !== null) setItemFilterQuery(q);
                    }}
                    filterQuery={itemFilterQuery}
                    onClearFilter={() => setItemFilterQuery('')}
                    onToggleTotals={() => setShowItemTotals(!showItemTotals)}
                    onExport={handleExportItemCsv}
                    onPrint={() => window.print()}
                    onInfo={() => {
                      setStatusMessage({
                        text: `Item Grid: ${spec.item_grid?.grid_name || 'Item ALV Grid'} | 연계키: ${foreignKey} | 건수: ${displayedItemRows.length}건`,
                        type: 'S',
                      });
                    }}
                    onCustomAction={(btn) => alert(`[Item ALV] ${btn.text} (${btn.function})`)}
                  />

                  {/* Item Grid Table */}
                  <div className="flex-1 overflow-auto bg-white">
                    <table className={`${isOptimizedWidth ? 'w-auto self-start' : 'w-full'} border-collapse text-xs font-sans whitespace-nowrap`}>
                      <thead className="sticky top-0 z-10 bg-[#d8e4f0] border-b border-[#9bbadb] text-slate-900">
                        <tr>
                          <th className="w-8 px-1 py-1 border-r border-[#9bbadb] bg-[#c8d8ea] text-center">
                            <div className="w-3.5 h-3.5 mx-auto border border-slate-600 bg-white flex items-center justify-center">
                              <span className="text-[9px] text-blue-900 leading-none font-bold">▶</span>
                            </div>
                          </th>
                          {spec.item_grid.field_catalog.map((field) => {
                            const colWidth = getColumnWidth(field, true);
                            return (
                              <th
                                key={field.id || field.fieldname}
                                style={{ width: colWidth, minWidth: colWidth }}
                                className={`px-2 py-1.5 border-r border-[#9bbadb] text-left font-semibold text-xs ${
                                  field.key ? 'bg-[#bce0fd] text-slate-900' : 'bg-[#d8e4f0] text-slate-900'
                                }`}
                              >
                                <span>{columnTextMode === 'fieldname' ? field.fieldname : (field.coltext || field.fieldname)}</span>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {displayedItemRows.length === 0 ? (
                          <tr>
                            <td colSpan={spec.item_grid.field_catalog.length + 1} className="py-8 text-center text-slate-400">
                              선택된 오더({selectedHeaderKey || '-'})에 해당하는 품목 데이터가 없습니다.
                            </td>
                          </tr>
                        ) : (
                          displayedItemRows.map((row, rIdx) => {
                            const isSelected = selectedItemRowIndex === rIdx;
                            const isZebra = !!spec.item_grid?.layout?.zebra && rIdx % 2 === 1;
                            return (
                              <tr
                                key={rIdx}
                                onClick={() => setSelectedItemRowIndex(rIdx)}
                                className={`h-7 hover:bg-[#ebf3fb] cursor-pointer ${
                                  isSelected ? 'bg-[#fff5cc]' : isZebra ? 'bg-[#f4f7fb]' : 'bg-white'
                                }`}
                              >
                                <td className="w-8 px-1 py-1 h-7 text-center bg-[#d4d0c8] border-r border-[#9bbadb] border-t border-l border-[#f0ede6] border-b border-[#808080] font-mono text-[10px] text-slate-700 font-semibold select-none">
                                  {rIdx + 1}
                                </td>
                                {spec.item_grid!.field_catalog.map((field) => {
                                  const val = row[field.fieldname];
                                  const isKey = field.key;
                                  const colWidth = getColumnWidth(field, true);
                                  const isStatusCol =
                                    field.fieldname === 'ZICON' ||
                                    field.fieldname === 'STATUS' ||
                                    field.fieldname === 'LIGHTS' ||
                                    field.coltext === '상태';

                                  const cellStyle = getSapAlvCellStyle(
                                    field.emphasize,
                                    isKey,
                                    isSelected,
                                    isZebra,
                                    !!field.edit
                                  );

                                  return (
                                    <td
                                      key={field.id || field.fieldname}
                                      style={{ width: colWidth, minWidth: colWidth }}
                                      className={`px-2 py-1 h-7 border-r border-[#d8d8d8] text-xs font-mono ${
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
                                      ) : field.edit ? (
                                        <input
                                          type="text"
                                          value={val !== undefined && val !== null ? String(val) : ''}
                                          readOnly
                                          className="w-full bg-white border border-slate-300 focus:border-blue-500 focus:bg-white px-1 text-xs text-slate-900 rounded-none shadow-2xs"
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

                      {/* Item Grid Total Row: Yellow background (#ffffa0), height matching regular row h-7 (RFQ v1.12) */}
                      {showItemTotals && spec.item_grid.field_catalog.some((f) => f.do_sum) && (
                        <tfoot className="sticky bottom-0 z-10 bg-[#ffffa0] border-t border-yellow-400 font-bold text-slate-900 shadow-xs">
                          <tr className="bg-[#ffffa0] text-slate-900 h-7">
                            <td className="w-8 px-1 py-1 h-7 text-center bg-yellow-200 border-r border-yellow-400 text-[10px] text-slate-900 font-bold select-none">
                              Σ
                            </td>
                            {spec.item_grid.field_catalog.map((field) => {
                              const hasSum = !!field.do_sum;
                              const sumVal = itemTotals[field.fieldname];
                              const colWidth = getColumnWidth(field, true);
                              return (
                                <td
                                  key={field.id || field.fieldname}
                                  style={{ width: colWidth, minWidth: colWidth }}
                                  className={`px-2 py-1 h-7 border-r border-yellow-400 text-xs font-mono bg-[#ffffa0] text-slate-900 ${
                                    hasSum ? 'text-right font-extrabold' : 'text-center'
                                  }`}
                                >
                                  {hasSum ? (
                                    <span className="font-extrabold text-slate-950">
                                      {Number(sumVal || 0).toLocaleString()}
                                    </span>
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
              <div className="flex-1 flex flex-col overflow-hidden relative">
                {/* Real-time Layout Grid Title & Options Indicator */}
                {spec.layout?.grid_title && (
                  <div
                    className={`bg-[#e4edf7] ${
                      spec.layout.smalltitle
                        ? 'px-2 py-1 text-[11px] font-semibold'
                        : 'px-3 py-1.5 text-xs font-bold'
                    } border-b border-[#9bbadb] text-slate-800 flex items-center justify-between shadow-2xs shrink-0`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Table className={spec.layout.smalltitle ? 'w-3 h-3 text-blue-800' : 'w-3.5 h-3.5 text-blue-800'} />
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

                {/* Scrollable table canvas - keeps table content fit without horizontal stretching (RFQ v1.13) */}
                <div className="flex-1 overflow-auto bg-white">
                  <table className={`${isOptimizedWidth ? 'w-auto self-start' : 'w-full'} border-collapse text-xs font-sans whitespace-nowrap`}>
                  {/* Header Row */}
                  {!spec.layout?.no_headers && (
                    <thead className={`sticky top-0 z-10 ${themeStyles.gridHeaderBg} border-b ${themeStyles.gridHeaderBorder} ${themeStyles.gridHeaderText}`}>
                      <tr>
                        {!spec.layout?.no_rowmark && (
                          <th className={`w-8 px-1 py-1 ${!spec.layout?.no_vgridln ? `border-r ${themeStyles.gridHeaderBorder}` : ''} ${themeStyles.gridCornerBg} text-center`}>
                            <div className="w-3.5 h-3.5 mx-auto border border-slate-600 bg-white flex items-center justify-center">
                              <span className="text-[9px] text-blue-900 leading-none font-bold">▶</span>
                            </div>
                          </th>
                        )}
                        {spec.field_catalog.map((field) => {
                          const isKey = field.key;
                          const isColSelected = selectedColumnFields.includes(field.fieldname);
                          const colWidth = getColumnWidth(field);
                          return (
                            <th
                              key={field.id || field.fieldname}
                              onMouseDown={(e) => handleColumnHeaderMouseDown(field.fieldname, e)}
                              onMouseEnter={() => handleColumnHeaderMouseEnter(field.fieldname)}
                              style={{
                                width: colWidth,
                                minWidth: colWidth,
                              }}
                              className={`px-2 py-1.5 ${!spec.layout?.no_vgridln ? `border-r ${themeStyles.gridHeaderBorder}` : ''} text-left font-semibold text-xs cursor-pointer select-none transition-all ${
                                isColSelected
                                  ? 'ring-2 ring-inset ring-blue-600 bg-blue-100 text-blue-950 font-bold'
                                  : isKey
                                  ? 'bg-[#bce0fd] text-slate-900'
                                  : `${themeStyles.gridHeaderBg} ${themeStyles.gridHeaderText}`
                              }`}
                              title="클릭/드래그 시 열 다중 선택 (정렬 및 합계 연동)"
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span>{columnTextMode === 'fieldname' ? field.fieldname : (field.coltext || field.fieldname)}</span>
                                {field.sort_enable && sortColumns.some((sc) => sc.fieldname === field.fieldname) ? (
                                  <span className="text-blue-800 font-bold text-[10px]">
                                    {sortColumns.find((sc) => sc.fieldname === field.fieldname)?.asc ? '▲' : '▼'}
                                  </span>
                                ) : field.sort_enable && sortField === field.fieldname ? (
                                  <span className="text-blue-800 font-bold text-[10px]">
                                    {sortAsc ? '▲' : '▼'}
                                  </span>
                                ) : null}
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                  )}

                  {/* Body */}
                  <tbody className={spec.layout?.no_hgridln ? '' : 'divide-y divide-slate-200'}>
                    {/* Top Totals Row: shown before data rows if totals_bef is active */}
                    {spec.layout?.totals_bef && !spec.layout?.no_totline && showTotals && spec.field_catalog.some((f) => f.do_sum) && (
                      <tr className="bg-[#ffffa0] text-slate-900 h-7 border-b-2 border-yellow-500 font-bold shadow-xs">
                        {!spec.layout?.no_rowmark && (
                          <td className={`w-8 px-1 py-1 h-7 text-center bg-yellow-200 ${!spec.layout?.no_vgridln ? 'border-r border-yellow-400' : ''} text-[10px] text-slate-900 font-bold select-none`}>
                            {!spec.layout?.no_totarr ? 'Σ' : ''}
                          </td>
                        )}
                        {spec.field_catalog.map((field) => {
                          const hasSum = !!field.do_sum;
                          const sumVal = totals[field.fieldname];
                          const colWidth = getColumnWidth(field);
                          const isColSelected = selectedColumnFields.includes(field.fieldname);
                          return (
                            <td
                              key={field.id || field.fieldname}
                              style={{ width: colWidth, minWidth: colWidth }}
                              className={`px-2 py-1 h-7 ${!spec.layout?.no_vgridln ? 'border-r border-yellow-400' : ''} text-xs font-mono ${
                                isColSelected ? 'bg-yellow-200 ring-1 ring-inset ring-blue-500' : 'bg-[#ffffa0]'
                              } text-slate-900 ${
                                hasSum ? 'text-right font-extrabold' : 'text-center'
                              }`}
                            >
                              {hasSum ? (
                                <span className="font-extrabold text-slate-950">
                                  {Number(sumVal || 0).toLocaleString()}
                                </span>
                              ) : (
                                ''
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    )}

                    {/* Data Rows: hidden if totals_only is active */}
                    {!spec.layout?.totals_only && (
                      displayedRows.length === 0 ? (
                        <tr>
                          <td colSpan={spec.field_catalog.length + (spec.layout?.no_rowmark ? 0 : 1)} className="py-12 text-center text-slate-500">
                            <p className="mb-2">No records found matching filters.</p>
                            <button
                              type="button"
                              onClick={handleGenerateAiMockData}
                              disabled={isGeneratingMockData}
                              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                              <span>Generate Mock Data</span>
                            </button>
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
                                if (spec.layout?.sel_mode !== 'D') {
                                  setSelectedRowIndex(rIdx);
                                }
                              }}
                              className={`h-7 hover:bg-[#ebf3fb] cursor-pointer ${
                                isSelected ? 'bg-[#fff5cc]' : isZebra ? 'bg-[#f4f7fb]' : 'bg-white'
                              }`}
                            >
                              {!spec.layout?.no_rowmark && (
                                <td className={`w-8 px-1 py-1 h-7 text-center bg-[#d4d0c8] ${!spec.layout?.no_vgridln ? 'border-r border-[#9bbadb]' : ''} border-t border-l border-[#f0ede6] border-b border-[#808080] font-mono text-[10px] text-slate-700 font-semibold select-none`}>
                                  {spec.layout?.show_row_numbers ? (
                                    rIdx + 1
                                  ) : (
                                    <div className="w-2.5 h-2 bg-[#d4d0c8] mx-auto" />
                                  )}
                                </td>
                              )}

                              {spec.field_catalog.map((field) => {
                                const val = row[field.fieldname];
                                const isKey = field.key;
                                const isColSelected = selectedColumnFields.includes(field.fieldname);
                                const isCellSelected = spec.layout?.sel_mode === 'D' && selectedCell?.rIdx === rIdx && selectedCell?.fieldname === field.fieldname;
                                const colWidth = getColumnWidth(field);
                                const isHotspot = field.hotspot || (spec.layout?.keyhot && field.key);
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
                                  isZebra,
                                  !!field.edit
                                );

                                const cellBg = isCellSelected
                                  ? 'bg-blue-100/90'
                                  : isSelected
                                  ? 'bg-[#fff5cc]'
                                  : isColSelected
                                  ? 'bg-blue-50/80 font-medium'
                                  : cellStyle.bg;

                                return (
                                  <td
                                    key={field.id || field.fieldname}
                                    style={{ width: colWidth, minWidth: colWidth }}
                                    onClick={(e) => {
                                      if (spec.layout?.sel_mode === 'D') {
                                        setSelectedCell({ rIdx, fieldname: field.fieldname });
                                      }
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
                                    className={`px-2 py-1 h-7 ${!spec.layout?.no_vgridln ? 'border-r border-[#d8d8d8]' : ''} text-xs font-mono ${alignClass} ${cellBg} ${cellStyle.text} ${
                                      isStatusCol ? 'cursor-pointer hover:brightness-95' : ''
                                    } ${isColSelected && !isSelected ? 'border-x-blue-300' : ''} ${
                                      isCellSelected ? 'ring-2 ring-inset ring-blue-600 font-bold' : ''
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
                                    ) : isHotspot ? (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setDrilldownInfo({
                                            tcode: field.drilldown_tcode || (field.key ? 'VA03' : 'KAH3'),
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
                                        className="w-full bg-white border border-slate-300 focus:border-blue-500 focus:bg-white px-1 text-xs text-slate-900 rounded-none shadow-2xs"
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
                      )
                    )}
                  </tbody>

                  {/* Single ALV Total Row: Sticky bottom if !totals_bef. Height exactly matching regular row h-7 (RFQ v1.12) */}
                  {!spec.layout?.totals_bef && !spec.layout?.no_totline && showTotals && spec.field_catalog.some((f) => f.do_sum) && (
                    <tfoot className="sticky bottom-0 z-10 bg-[#ffffa0] border-t border-yellow-400 font-bold text-slate-900 shadow-xs">
                      <tr className="bg-[#ffffa0] text-slate-900 h-7">
                        {!spec.layout?.no_rowmark && (
                          <td className={`w-8 px-1 py-1 h-7 text-center bg-yellow-200 ${!spec.layout?.no_vgridln ? 'border-r border-yellow-400' : ''} text-[10px] text-slate-900 font-bold select-none`}>
                            {!spec.layout?.no_totarr ? 'Σ' : ''}
                          </td>
                        )}
                        {spec.field_catalog.map((field) => {
                          const hasSum = !!field.do_sum;
                          const sumVal = totals[field.fieldname];
                          const colWidth = getColumnWidth(field);
                          const isColSelected = selectedColumnFields.includes(field.fieldname);
                          return (
                            <td
                              key={field.id || field.fieldname}
                              style={{ width: colWidth, minWidth: colWidth }}
                              className={`px-2 py-1 h-7 ${!spec.layout?.no_vgridln ? 'border-r border-yellow-400' : ''} text-xs font-mono ${
                                isColSelected ? 'bg-yellow-200 ring-1 ring-inset ring-blue-500' : 'bg-[#ffffa0]'
                              } text-slate-900 ${
                                hasSum ? 'text-right font-extrabold' : 'text-center'
                              }`}
                            >
                              {hasSum ? (
                                <span className="font-extrabold text-slate-950">
                                  {Number(sumVal || 0).toLocaleString()}
                                </span>
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

      {/* 6. SAP Status Bar with Dynamic Theme */}
      <div className={`flex items-center justify-between px-3 py-1 border-t text-xs transition-colors duration-200 ${themeStyles.statusBarBg} ${themeStyles.statusBarBorder} ${themeStyles.statusBarText}`}>
        <div className="flex items-center gap-2">
          {statusMessage.type === 'S' ? (
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-emerald-700 inline-block shadow-2xs" />
          ) : (
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 border border-rose-700 inline-block shadow-2xs" />
          )}
          <span className="font-medium">{statusMessage.text}</span>
        </div>

        <div className="flex items-center gap-3 text-[11px] font-mono opacity-80">
          <span>PRD (100)</span>
          <span className="opacity-40">|</span>
          <button
            type="button"
            onClick={() => setIsThemeSettingsOpen(true)}
            className="hover:underline cursor-pointer flex items-center gap-1 font-sans"
            title="Click to open SAP GUI Theme Settings"
          >
            <Palette className="w-3 h-3" />
            <span>Theme: {themeInfo.name}</span>
          </button>
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

      {/* SAP GUI Theme Settings Modal */}
      <SapThemeSettingsModal
        isOpen={isThemeSettingsOpen}
        onClose={() => setIsThemeSettingsOpen(false)}
        currentTheme={currentTheme}
        onSelectTheme={handleSelectTheme}
      />
    </div>
  );
};
