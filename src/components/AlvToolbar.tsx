import React from 'react';
import { AlvToolbarButton, ProgramSpec } from '../types/sap';
import { DEFAULT_ALV_TOOLBAR_BUTTONS } from '../data/defaultToolbarButtons';

interface AlvToolbarProps {
  spec: ProgramSpec;
  statusSummaries: {
    statusKey: string;
    count: number;
    label: string;
    iconType: 'DOC' | 'GREEN' | 'YELLOW' | 'RED' | 'FOLDER' | 'OTHER';
  }[];
  selectedStatusFilters: string[];
  onToggleStatusFilter: (statusKey: string) => void;
  onOpenDetail: () => void;
  onSort: (asc: boolean) => void;
  onFilter: () => void;
  filterQuery: string;
  onClearFilter: () => void;
  onToggleTotals: () => void;
  onExport: () => void;
  onPrint: () => void;
  onInfo: () => void;
  onCustomAction?: (btn: AlvToolbarButton) => void;
}

/**
 * High-fidelity SAP Classic Icons matching the user's uploaded screenshot
 */
export const SapToolbarIcon: React.FC<{ func: string; iconName?: string }> = ({ func, iconName }) => {
  switch (func) {
    case '&DETAIL':
      // 1. Magnifying glass over document sheet
      return (
        <svg viewBox="0 0 16 16" className="w-4 h-4 drop-shadow-2xs" fill="none">
          {/* Document Sheet */}
          <path d="M2.5 1.5h6l3 3v10h-9v-13z" fill="#ffffff" stroke="#334155" strokeWidth="1" strokeLinejoin="round" />
          <path d="M8.5 1.5v3h3" fill="#cbd5e1" stroke="#334155" strokeWidth="0.8" />
          <line x1="4.5" y1="6.5" x2="9.5" y2="6.5" stroke="#94a3b8" strokeWidth="1" />
          <line x1="4.5" y1="8.5" x2="8" y2="8.5" stroke="#94a3b8" strokeWidth="1" />
          {/* Magnifying Glass */}
          <circle cx="10" cy="9.5" r="3.2" fill="#e0f2fe" stroke="#1e3a8a" strokeWidth="1.2" />
          <line x1="12.3" y1="11.8" x2="14.5" y2="14" stroke="#1e3a8a" strokeWidth="1.8" strokeLinecap="round" />
          {/* Glass reflection */}
          <path d="M8.5 8.5a2 2 0 0 1 2-1" stroke="#38bdf8" strokeWidth="0.8" strokeLinecap="round" />
        </svg>
      );

    case '&GRAPHIC':
      // 2. PC Monitor with stand and vertical colored bar chart
      return (
        <svg viewBox="0 0 16 16" className="w-4 h-4 drop-shadow-2xs" fill="none">
          {/* Monitor Frame */}
          <rect x="1.5" y="1.5" width="13" height="9.5" rx="1" fill="#1e293b" stroke="#0f172a" strokeWidth="1" />
          {/* Screen */}
          <rect x="2.5" y="2.5" width="11" height="7.5" fill="#f8fafc" />
          {/* Bar Chart Bars: Red, Green, Blue */}
          <rect x="4" y="6" width="1.8" height="3" fill="#ef4444" />
          <rect x="7" y="4" width="1.8" height="5" fill="#10b981" />
          <rect x="10" y="5" width="1.8" height="4" fill="#3b82f6" />
          {/* Stand */}
          <path d="M6.5 11h3v2h-3z" fill="#64748b" />
          <path d="M4.5 13h7v1.5h-7z" fill="#475569" />
        </svg>
      );

    case '&SELECT_MODE':
      // 3. Two overlapping window panes / layout mode
      return (
        <svg viewBox="0 0 16 16" className="w-4 h-4 drop-shadow-2xs" fill="none">
          {/* Back Window */}
          <rect x="4.5" y="1.5" width="9.5" height="9.5" fill="#f1f5f9" stroke="#1e3a8a" strokeWidth="0.9" />
          <rect x="4.5" y="1.5" width="9.5" height="2.5" fill="#2563eb" />
          {/* Front Window */}
          <rect x="1.5" y="4.5" width="9.5" height="9.5" fill="#ffffff" stroke="#0f172a" strokeWidth="1" />
          <rect x="1.5" y="4.5" width="9.5" height="2.5" fill="#38bdf8" />
          {/* Front window split / grid */}
          <line x1="1.5" y1="9" x2="11" y2="9" stroke="#cbd5e1" strokeWidth="0.8" />
          <line x1="5.5" y1="7" x2="5.5" y2="14" stroke="#cbd5e1" strokeWidth="0.8" />
        </svg>
      );

    case '&HIERARCHY':
      // 4. Yellow 3D isometric cube matching screenshot
      return (
        <svg viewBox="0 0 16 16" className="w-4 h-4 drop-shadow-2xs" fill="none">
          {/* Isometric Cube: Top diamond, Left facet, Right facet */}
          {/* Top Face */}
          <polygon points="8,1.5 13.5,4.5 8,7.5 2.5,4.5" fill="#fde047" stroke="#854d0e" strokeWidth="0.9" strokeLinejoin="round" />
          {/* Left Face */}
          <polygon points="2.5,4.5 8,7.5 8,14 2.5,11" fill="#eab308" stroke="#854d0e" strokeWidth="0.9" strokeLinejoin="round" />
          {/* Right Face */}
          <polygon points="8,7.5 13.5,4.5 13.5,11 8,14" fill="#ca8a04" stroke="#854d0e" strokeWidth="0.9" strokeLinejoin="round" />
        </svg>
      );

    case '&SORT_ASC':
      // 5. Stacked horizontal bars with green arrow pointing UP
      return (
        <svg viewBox="0 0 16 16" className="w-4 h-4 drop-shadow-2xs" fill="none">
          {/* 3 horizontal bars */}
          <rect x="1.5" y="3.5" width="6" height="2" fill="#0284c7" rx="0.5" />
          <rect x="1.5" y="7" width="4.5" height="2" fill="#0284c7" rx="0.5" />
          <rect x="1.5" y="10.5" width="3" height="2" fill="#0284c7" rx="0.5" />
          {/* Green Arrow UP with dark outline */}
          <polygon points="12,2 8.5,7 10.5,7 10.5,13.5 13.5,13.5 13.5,7 15.5,7" fill="#16a34a" stroke="#14532d" strokeWidth="0.8" strokeLinejoin="round" />
        </svg>
      );

    case '&SORT_DESC':
      // 6. Stacked horizontal bars with green arrow pointing DOWN
      return (
        <svg viewBox="0 0 16 16" className="w-4 h-4 drop-shadow-2xs" fill="none">
          {/* 3 horizontal bars */}
          <rect x="1.5" y="3.5" width="3" height="2" fill="#0284c7" rx="0.5" />
          <rect x="1.5" y="7" width="4.5" height="2" fill="#0284c7" rx="0.5" />
          <rect x="1.5" y="10.5" width="6" height="2" fill="#0284c7" rx="0.5" />
          {/* Green Arrow DOWN with dark outline */}
          <polygon points="12,14 8.5,9 10.5,9 10.5,2.5 13.5,2.5 13.5,9 15.5,9" fill="#16a34a" stroke="#14532d" strokeWidth="0.8" strokeLinejoin="round" />
        </svg>
      );

    case '&FIND':
      // 7. Twin Binoculars (쌍안경)
      return (
        <svg viewBox="0 0 16 16" className="w-4 h-4 drop-shadow-2xs" fill="none">
          {/* Left Cylinder */}
          <path d="M2.5 4h3.5l1 7h-4.5z" fill="#38bdf8" stroke="#0369a1" strokeWidth="0.9" />
          <ellipse cx="4" cy="4" rx="1.8" ry="1.2" fill="#bae6fd" stroke="#0369a1" strokeWidth="0.9" />
          <ellipse cx="3.5" cy="11" rx="2" ry="1.4" fill="#0284c7" stroke="#0c4a6e" strokeWidth="0.9" />
          {/* Right Cylinder */}
          <path d="M10 4h3.5l1 7h-4.5z" fill="#38bdf8" stroke="#0369a1" strokeWidth="0.9" />
          <ellipse cx="12" cy="4" rx="1.8" ry="1.2" fill="#bae6fd" stroke="#0369a1" strokeWidth="0.9" />
          <ellipse cx="12.5" cy="11" rx="2" ry="1.4" fill="#0284c7" stroke="#0c4a6e" strokeWidth="0.9" />
          {/* Connecting Bridge */}
          <rect x="6" y="5.5" width="4" height="2" fill="#475569" stroke="#1e293b" strokeWidth="0.8" rx="0.5" />
        </svg>
      );

    case '&FIND_MORE':
      // 8. Binoculars with small green plus / continue arrow
      return (
        <svg viewBox="0 0 16 16" className="w-4 h-4 drop-shadow-2xs" fill="none">
          {/* Small Binoculars */}
          <path d="M2 3h3l0.8 5.5h-3.8z" fill="#38bdf8" stroke="#0369a1" strokeWidth="0.8" />
          <ellipse cx="3.5" cy="3" rx="1.5" ry="1" fill="#bae6fd" stroke="#0369a1" strokeWidth="0.8" />
          <path d="M8 3h3l0.8 5.5h-3.8z" fill="#38bdf8" stroke="#0369a1" strokeWidth="0.8" />
          <ellipse cx="9.5" cy="3" rx="1.5" ry="1" fill="#bae6fd" stroke="#0369a1" strokeWidth="0.8" />
          <rect x="5" y="4.5" width="3" height="1.5" fill="#475569" />
          {/* Green plus / arrow at bottom right */}
          <circle cx="12.5" cy="11.5" r="3" fill="#22c55e" stroke="#15803d" strokeWidth="0.8" />
          <line x1="12.5" y1="9.5" x2="12.5" y2="13.5" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" />
          <line x1="10.5" y1="11.5" x2="14.5" y2="11.5" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" />
        </svg>
      );

    case '&FILTER':
      // 9. Classic SAP blue funnel
      return (
        <svg viewBox="0 0 16 16" className="w-4 h-4 drop-shadow-2xs" fill="none">
          {/* Funnel Body */}
          <polygon points="1.5,2.5 14.5,2.5 10,8.5 10,13.5 6,14.5 6,8.5" fill="#0284c7" stroke="#0369a1" strokeWidth="1" strokeLinejoin="round" />
          {/* Top Ellipse Rim */}
          <ellipse cx="8" cy="2.5" rx="6.5" ry="1.5" fill="#38bdf8" stroke="#0369a1" strokeWidth="0.9" />
          {/* Filter Fluid highlight */}
          <polygon points="4,4.5 12,4.5 9,8 7,8" fill="#bae6fd" />
        </svg>
      );

    case '&TOTAL':
      // 10. Green square frame with Sigma Σ
      return (
        <svg viewBox="0 0 16 16" className="w-4 h-4 drop-shadow-2xs" fill="none">
          <rect x="1.5" y="1.5" width="13" height="13" rx="1" fill="#ecfdf5" stroke="#059669" strokeWidth="1.2" />
          {/* Capital Greek Sigma Σ in bold green */}
          <path d="M12 4.2H4.5L8.5 8L4.5 11.8H12" stroke="#047857" strokeWidth="1.8" strokeLinecap="square" strokeLinejoin="miter" />
        </svg>
      );

    case '&SUBTOTAL':
      // 11. Subtotal: Sigma Σ with stacked sub-line / fraction
      return (
        <svg viewBox="0 0 16 16" className="w-4 h-4 drop-shadow-2xs" fill="none">
          <rect x="1.5" y="1.5" width="13" height="13" rx="1" fill="#fffbeb" stroke="#d97706" strokeWidth="1" />
          <path d="M9.5 4H4L7 7L4 10H9.5" stroke="#b45309" strokeWidth="1.4" strokeLinecap="square" strokeLinejoin="miter" />
          {/* Subtotal slash & dot */}
          <line x1="11" y1="4" x2="8" y2="12" stroke="#b45309" strokeWidth="1" />
          <circle cx="12" cy="11" r="1" fill="#b45309" />
        </svg>
      );

    case '&PRINT':
      // 12. Office desktop printer with paper
      return (
        <svg viewBox="0 0 16 16" className="w-4 h-4 drop-shadow-2xs" fill="none">
          {/* Top Paper */}
          <path d="M4 1.5h8v4h-8z" fill="#ffffff" stroke="#475569" strokeWidth="0.8" />
          <line x1="5.5" y1="3" x2="10.5" y2="3" stroke="#94a3b8" strokeWidth="0.8" />
          {/* Printer Body */}
          <path d="M2 5.5h12a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-1v-2H3v2H2a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1z" fill="#cbd5e1" stroke="#334155" strokeWidth="0.9" />
          <circle cx="12.5" cy="8" r="0.8" fill="#22c55e" />
          {/* Bottom Paper Tray */}
          <path d="M4 9h8v5.5h-8z" fill="#ffffff" stroke="#475569" strokeWidth="0.8" />
          <line x1="5.5" y1="11" x2="10.5" y2="11" stroke="#3b82f6" strokeWidth="0.8" />
          <line x1="5.5" y1="12.8" x2="9" y2="12.8" stroke="#64748b" strokeWidth="0.8" />
        </svg>
      );

    case '&EXPORT':
      // 13. Spreadsheet / Excel table
      return (
        <svg viewBox="0 0 16 16" className="w-4 h-4 drop-shadow-2xs" fill="none">
          {/* Table Outline */}
          <rect x="1.5" y="1.5" width="13" height="13" rx="1" fill="#ffffff" stroke="#15803d" strokeWidth="1" />
          {/* Header Row */}
          <rect x="1.5" y="1.5" width="13" height="3.5" fill="#16a34a" />
          {/* Grid lines */}
          <line x1="1.5" y1="8.5" x2="14.5" y2="8.5" stroke="#86efac" strokeWidth="0.8" />
          <line x1="1.5" y1="11.5" x2="14.5" y2="11.5" stroke="#86efac" strokeWidth="0.8" />
          <line x1="5.5" y1="5" x2="5.5" y2="14.5" stroke="#86efac" strokeWidth="0.8" />
          <line x1="10" y1="5" x2="10" y2="14.5" stroke="#86efac" strokeWidth="0.8" />
          {/* Mini cell data colors */}
          <rect x="6.5" y="6" width="2.5" height="1.5" fill="#fde047" />
          <rect x="11" y="6" width="2.5" height="1.5" fill="#93c5fd" />
        </svg>
      );

    case '&SEND':
      // 14. Document with green curved arrow flying out to right
      return (
        <svg viewBox="0 0 16 16" className="w-4 h-4 drop-shadow-2xs" fill="none">
          {/* Document Sheet */}
          <path d="M2.5 1.5h6l3 3v9.5h-9v-12.5z" fill="#ffffff" stroke="#475569" strokeWidth="0.9" />
          <line x1="4.5" y1="6" x2="8.5" y2="6" stroke="#cbd5e1" strokeWidth="1" />
          <line x1="4.5" y1="8" x2="7" y2="8" stroke="#cbd5e1" strokeWidth="1" />
          {/* Green curved arrow flying out right */}
          <path d="M6 13c1-4 4-4.5 8-4.5" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" />
          <polygon points="15.5,8.5 12,6 12,11" fill="#16a34a" stroke="#15803d" strokeWidth="0.6" />
        </svg>
      );

    case '&LAYOUT':
      // 15. 3x3 Rubik style colored mosaic grid matching screenshot
      return (
        <svg viewBox="0 0 16 16" className="w-4 h-4 drop-shadow-2xs" fill="none">
          <rect x="1.5" y="1.5" width="13" height="13" rx="1" fill="#334155" stroke="#1e293b" strokeWidth="0.8" />
          {/* 3x3 colored tiles */}
          {/* Row 1 */}
          <rect x="2.5" y="2.5" width="3" height="3" fill="#facc15" />
          <rect x="6.5" y="2.5" width="3" height="3" fill="#38bdf8" />
          <rect x="10.5" y="2.5" width="3" height="3" fill="#f97316" />
          {/* Row 2 */}
          <rect x="2.5" y="6.5" width="3" height="3" fill="#3b82f6" />
          <rect x="6.5" y="6.5" width="3" height="3" fill="#ef4444" />
          <rect x="10.5" y="6.5" width="3" height="3" fill="#22c55e" />
          {/* Row 3 */}
          <rect x="2.5" y="10.5" width="3" height="3" fill="#10b981" />
          <rect x="6.5" y="10.5" width="3" height="3" fill="#f59e0b" />
          <rect x="10.5" y="10.5" width="3" height="3" fill="#6366f1" />
        </svg>
      );

    case '&INFO':
      // 16. Blue rounded rectangle with white lowercase serif 'i'
      return (
        <svg viewBox="0 0 16 16" className="w-4 h-4 drop-shadow-2xs" fill="none">
          <rect x="1.5" y="1.5" width="13" height="13" rx="2" fill="#2563eb" stroke="#1d4ed8" strokeWidth="1" />
          {/* White 'i' */}
          <circle cx="8" cy="4.8" r="1.1" fill="#ffffff" />
          <rect x="7.1" y="7.2" width="1.8" height="5" rx="0.5" fill="#ffffff" />
          <rect x="6.2" y="7.2" width="1.5" height="1" fill="#ffffff" />
          <rect x="6.2" y="11.2" width="3.6" height="1" fill="#ffffff" />
        </svg>
      );

    default:
      // Custom user button icon
      return (
        <svg viewBox="0 0 16 16" className="w-4 h-4 drop-shadow-2xs" fill="none">
          <circle cx="8" cy="8" r="6" fill="#3b82f6" stroke="#1d4ed8" strokeWidth="1" />
          <polygon points="6,4.5 12,8 6,11.5" fill="#ffffff" />
        </svg>
      );
  }
};

export const AlvToolbar: React.FC<AlvToolbarProps> = ({
  spec,
  statusSummaries,
  selectedStatusFilters,
  onToggleStatusFilter,
  onOpenDetail,
  onSort,
  onFilter,
  filterQuery,
  onClearFilter,
  onToggleTotals,
  onExport,
  onPrint,
  onInfo,
  onCustomAction,
}) => {
  const buttons: AlvToolbarButton[] = (spec.toolbar_buttons && spec.toolbar_buttons.length > 0)
    ? spec.toolbar_buttons
    : DEFAULT_ALV_TOOLBAR_BUTTONS;

  const visibleButtons = buttons.filter(b => b.visible !== false);

  const handleButtonClick = (btn: AlvToolbarButton) => {
    if (btn.disabled) return;

    switch (btn.function) {
      case '&DETAIL':
        onOpenDetail();
        break;
      case '&GRAPHIC':
        alert('비즈니스 그래픽 모드가 선택되었습니다.');
        break;
      case '&SELECT_MODE':
        alert('선택 모드: 다중 행 및 분할 뷰 모드');
        break;
      case '&HIERARCHY':
        alert('원가요소 그룹 세트 노드 계층구조 트리 및 집계');
        break;
      case '&SORT_ASC':
        onSort(true);
        break;
      case '&SORT_DESC':
        onSort(false);
        break;
      case '&FIND':
      case '&FIND_MORE':
      case '&FILTER':
        onFilter();
        break;
      case '&TOTAL':
      case '&SUBTOTAL':
        onToggleTotals();
        break;
      case '&PRINT':
        onPrint();
        break;
      case '&EXPORT':
      case '&SEND':
        onExport();
        break;
      case '&LAYOUT':
        alert('ALV 레이아웃 설정 (LVC_S_LAYO): 현재 레이아웃 저장 및 변형 선택');
        break;
      case '&INFO':
        onInfo();
        break;
      default:
        if (onCustomAction) {
          onCustomAction(btn);
        } else {
          alert(`사용자 기능 실행: [${btn.text}] (${btn.function})\n${btn.quickinfo}`);
        }
        break;
    }
  };

  // Render Sta. Icon in Toolbar
  const renderStaIcon = (iconType: 'DOC' | 'GREEN' | 'YELLOW' | 'RED' | 'FOLDER' | 'OTHER') => {
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
    <div className="flex items-center justify-between bg-[#e4eff9] px-2 py-1 border-b border-[#a4bedb] gap-1 flex-wrap overflow-x-auto shadow-xs">
      {/* 1. ALV Toolbar Buttons (Analyzed 16 standard buttons + custom buttons) */}
      <div className="flex items-center gap-1 flex-wrap">
        {visibleButtons.map((btn) => (
          <React.Fragment key={btn.id}>
            {/* Optional Separator Before Button */}
            {btn.separator_before && (
              <div className="h-4 w-px bg-[#a4bedb] mx-0.5" />
            )}

            {/* Raised SAP GUI Classic Yellow Button */}
            <button
              onClick={() => handleButtonClick(btn)}
              disabled={btn.disabled}
              title={`${btn.text} (${btn.function})\n${btn.quickinfo}`}
              className={`h-6 px-1 rounded flex items-center justify-center border transition-all shadow-2xs select-none ${
                btn.disabled
                  ? 'opacity-40 border-[#d1c29b] cursor-not-allowed'
                  : 'border-[#c0a662] hover:brightness-105 active:scale-95 cursor-pointer'
              }`}
              style={{
                minWidth: '24px',
                background: btn.disabled
                  ? '#ede4cc'
                  : 'linear-gradient(to bottom, #fffdf2 0%, #fae6a6 50%, #f4d983 100%)',
              }}
            >
              <SapToolbarIcon func={btn.function} iconName={btn.icon} />
              {!btn.is_standard && btn.text && (
                <span className="text-[11px] font-medium text-slate-800 ml-1 font-sans">
                  {btn.text}
                </span>
              )}
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* 2. Right Section: Sta. Status Count Filter Buttons at the VERY END! */}
      <div className="flex items-center gap-1.5 ml-auto pl-2 border-l border-[#b0c8e0]">
        {/* Active text filter badge */}
        {filterQuery && (
          <div className="flex items-center gap-1 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded text-[10px] text-amber-900">
            <span>필터: "{filterQuery}"</span>
            <button onClick={onClearFilter} className="font-bold hover:text-red-700 cursor-pointer">×</button>
          </div>
        )}

        {/* Dynamic Status (Sta.) Multi-Select Filter Buttons - Default: all selected */}
        {statusSummaries.length > 0 && (
          <div className="flex items-center gap-1" title="Sta. 신호등 상태 필터 (다중 선택 지원: 클릭 시 해당 상태 표시/숨김 토글)">
            {statusSummaries.map((s) => {
              const isSelected = selectedStatusFilters.includes(s.statusKey);
              return (
                <button
                  key={s.statusKey}
                  onClick={() => onToggleStatusFilter(s.statusKey)}
                  title={`Sta. [${s.label}] 필터: ${s.count}건 (${
                    isSelected ? '선택됨 (출력 중) - 클릭시 숨김' : '해제됨 (숨겨짐) - 클릭시 출력'
                  })`}
                  className={`h-6 px-1.5 rounded flex items-center gap-1 border transition-all cursor-pointer shadow-2xs select-none ${
                    isSelected
                      ? 'border-[#7a5814] font-extrabold text-slate-900 ring-1 ring-amber-500 scale-100'
                      : 'border-slate-300 opacity-40 hover:opacity-75 grayscale text-slate-400 scale-95'
                  }`}
                  style={{
                    background: isSelected
                      ? 'linear-gradient(to bottom, #fffdf2 0%, #fae6a6 50%, #f4d983 100%)'
                      : '#e2e8f0',
                  }}
                >
                  {/* Exact Sta. Icon */}
                  {renderStaIcon(s.iconType)}
                  {/* Count of rows with this Sta. */}
                  <span className={`text-[11px] font-bold font-mono leading-none ${isSelected ? 'text-slate-900' : 'text-slate-500'}`}>
                    {s.count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
