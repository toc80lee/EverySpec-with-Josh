import React, { useState, useRef, useEffect } from 'react';
import {
  Layers,
  FileCode,
  FileText,
  SplitSquareVertical,
  Sparkles,
  Printer,
  FileDown,
  User,
  Palette,
  PanelTop,
  PanelLeft,
  PanelBottom,
  PanelRight,
  Keyboard,
  LayoutDashboard,
  List,
  FolderKanban,
  MessageSquareText,
  Star,
} from 'lucide-react';
import { ProgramSpec } from '../types/sap';
import { getCurrentUser, setCurrentUser, PRESET_USERS, CurrentUser } from '../utils/authStorage';
import { SapGuiTheme, SAP_GUI_THEMES } from '../data/sapGuiThemes';

export type MainWorkspaceMode =
  | 'overview'
  | 'program_list'
  | 'meeting_minutes'
  | 'meeting_wizard'
  | 'project_settings'
  | 'shortcuts'
  | 'split'
  | 'mockup_only'
  | 'editor_only'
  | 'abap_code'
  | 'document';
export type DualSplitLayout = 'top-bottom' | 'left-right' | 'bottom-top' | 'right-left';

interface TopNavProps {
  currentMode: MainWorkspaceMode;
  onSelectMode: (mode: MainWorkspaceMode) => void;
  currentSpec: ProgramSpec;
  onSelectTemplate: (spec: ProgramSpec) => void;
  onNewSpec: () => void;
  onTriggerPrint?: () => void;
  onOpenTemplates?: () => void;
  onExportPdf?: () => void;
  onGenerateMockData?: () => void;
  currentTheme?: SapGuiTheme;
  onSelectTheme?: (theme: SapGuiTheme) => void;
  splitLayout?: DualSplitLayout;
  onCycleSplitLayout?: () => void;
  onOpenShortcuts?: () => void;
  onOpenProjectManager?: () => void;
  onUserChanged?: (user: CurrentUser) => void;
  selectedProjectCode?: string;
  isCurrentSpecFavorite?: boolean;
  onToggleCurrentSpecFavorite?: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  currentMode,
  onSelectMode,
  currentSpec,
  onSelectTemplate,
  onNewSpec,
  onTriggerPrint,
  onOpenTemplates,
  onExportPdf,
  onGenerateMockData,
  currentTheme = 'blue_crystal',
  onSelectTheme,
  splitLayout = 'left-right',
  onCycleSplitLayout,
  onOpenShortcuts,
  onOpenProjectManager,
  onUserChanged,
  selectedProjectCode,
  isCurrentSpecFavorite = false,
  onToggleCurrentSpecFavorite,
}) => {
  const [user, setUser] = useState<CurrentUser>(getCurrentUser());
  const isOverviewOrList =
    currentMode === 'overview' ||
    currentMode === 'program_list' ||
    currentMode === 'meeting_minutes' ||
    currentMode === 'meeting_wizard' ||
    currentMode === 'project_settings' ||
    currentMode === 'shortcuts';
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const themeMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isUserMenuOpen && !isThemeMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target as Node)) {
        setIsThemeMenuOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsUserMenuOpen(false);
        setIsThemeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isUserMenuOpen, isThemeMenuOpen]);

  return (
    <header className="no-print flex items-center justify-between gap-4 px-5 py-3 bg-slate-900 border-b border-slate-800 text-white shrink-0">
      {/* Zone 1: Brand Wordmark (Clickable back to Overview) */}
      <div className="flex items-center gap-4 shrink-0">
        <button
          type="button"
          onClick={() => onSelectMode('overview')}
          className="flex items-center gap-3 text-left hover:opacity-90 transition-opacity cursor-pointer"
          title="Go to Project Overview"
        >
          <div className="w-8 h-8 rounded-lg bg-white p-0.5 flex items-center justify-center shadow-md border border-slate-700 overflow-hidden shrink-0">
            <img
              src="/assets/aistudio/Logo_436f33a7.png"
              alt="EverySpec with Josh Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="leading-tight">
            <div className="font-extrabold text-sm tracking-tight text-white whitespace-nowrap">
              EverySpec with Josh
            </div>
            <div className="text-[10px] text-blue-300 font-medium">
              ABAP Functional Specification & CL_GUI_ALV_GRID Simulator
            </div>
          </div>
        </button>

        {!isOverviewOrList && (
          <div className="hidden lg:flex items-center gap-1.5 pl-3 border-l border-slate-700 text-xs font-mono text-slate-300">
            <span className="text-blue-300 font-bold">
              {currentSpec.project_code || selectedProjectCode || 'TEMP'}
            </span>
            <span className="text-slate-500">/</span>
            <span className="font-bold text-white">{currentSpec.program_id}</span>
            {onToggleCurrentSpecFavorite && (
              <button
                type="button"
                onClick={onToggleCurrentSpecFavorite}
                title={isCurrentSpecFavorite ? '즐겨찾기 해제' : '즐겨찾기에 추가'}
                aria-label={isCurrentSpecFavorite ? 'Remove from favorites' : 'Add to favorites'}
                className="ml-1 p-0.5 rounded hover:bg-slate-700/80 transition-colors cursor-pointer"
              >
                <Star
                  className={`w-3.5 h-3.5 ${
                    isCurrentSpecFavorite
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-slate-400 hover:text-amber-300'
                  }`}
                />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Zone 2: Workspace View Modes & Quick Tools */}
      <nav className="flex items-center gap-1 bg-slate-800/90 p-1 rounded-lg border border-slate-700/60 text-xs">
        {/* 0a. Project Overview */}
        <button
          type="button"
          onClick={() => onSelectMode('overview')}
          className={`p-2 font-medium rounded-md transition-all flex items-center justify-center cursor-pointer ${
            currentMode === 'overview'
              ? 'bg-blue-600 text-white shadow-xs font-semibold'
              : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
          }`}
          title="Project Overview"
          aria-label="Project Overview"
        >
          <LayoutDashboard className="w-4 h-4" />
        </button>

        {/* 0b. Project Program List */}
        <button
          type="button"
          onClick={() => onSelectMode('program_list')}
          className={`p-2 font-medium rounded-md transition-all flex items-center justify-center cursor-pointer ${
            currentMode === 'program_list'
              ? 'bg-blue-600 text-white shadow-xs font-semibold'
              : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
          }`}
          title="Program List"
          aria-label="Program List"
        >
          <List className="w-4 h-4" />
        </button>

        {/* 0b2. Project Meeting Minutes Archive */}
        <button
          type="button"
          onClick={() => onSelectMode('meeting_minutes')}
          className={`p-2 font-medium rounded-md transition-all flex items-center justify-center cursor-pointer ${
            currentMode === 'meeting_minutes'
              ? 'bg-blue-600 text-white shadow-xs font-semibold'
              : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
          }`}
          title="프로젝트 회의록 이력"
          aria-label="Meeting Minutes"
        >
          <MessageSquareText className="w-4 h-4" />
        </button>

        {/* 0c. Project Settings */}
        {onOpenProjectManager && (
          <button
            type="button"
            onClick={onOpenProjectManager}
            className={`p-2 rounded-md transition-all flex items-center justify-center cursor-pointer ${
              currentMode === 'project_settings'
                ? 'bg-blue-600 text-white shadow-xs font-semibold'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
            }`}
            title="Project Settings"
            aria-label="Project Settings"
          >
            <FolderKanban className="w-4 h-4" />
          </button>
        )}

        {!isOverviewOrList && (
          <>
            <div className="h-4 w-px bg-slate-700 mx-0.5" />

            {/* 1. Dual View */}
            <button
              type="button"
              onClick={() => onSelectMode('split')}
              className={`p-2 font-medium rounded-md transition-all flex items-center justify-center cursor-pointer ${
                currentMode === 'split'
                  ? 'bg-blue-600 text-white shadow-xs font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
              title="Dual View (Alt+1)"
              aria-label="Dual View"
            >
              <SplitSquareVertical className="w-4 h-4" />
            </button>

        {/* Dual Screen 4-Way Layout Toggle: 상하 -> 좌우 -> 하상 -> 우좌 (Only visible in Dual Screen mode) */}
        {currentMode === 'split' && onCycleSplitLayout && (
          <button
            type="button"
            onClick={onCycleSplitLayout}
            className="p-2 text-cyan-300 hover:text-white hover:bg-slate-700/60 rounded-md transition-all flex items-center justify-center cursor-pointer border border-slate-700/80 bg-slate-800"
            title={
              splitLayout === 'top-bottom'
                ? 'Split Layout: Top / Bottom (Alt+L)'
                : splitLayout === 'left-right'
                ? 'Split Layout: Left / Right (Alt+L)'
                : splitLayout === 'bottom-top'
                ? 'Split Layout: Bottom / Top (Alt+L)'
                : 'Split Layout: Right / Left (Alt+L)'
            }
            aria-label="Dual Screen Layout Toggle"
          >
            {splitLayout === 'top-bottom' ? (
              <PanelTop className="w-4 h-4" />
            ) : splitLayout === 'left-right' ? (
              <PanelLeft className="w-4 h-4" />
            ) : splitLayout === 'bottom-top' ? (
              <PanelBottom className="w-4 h-4" />
            ) : (
              <PanelRight className="w-4 h-4" />
            )}
          </button>
        )}

            {/* 2. Simulation */}
            <button
              type="button"
              onClick={() => onSelectMode('mockup_only')}
              className={`p-2 font-medium rounded-md transition-all flex items-center justify-center cursor-pointer ${
                currentMode === 'mockup_only'
                  ? 'bg-blue-600 text-white shadow-xs font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
              title="Simulation (Alt+2)"
              aria-label="Simulation"
            >
              <Layers className="w-4 h-4" />
            </button>

            {/* 3. Spec Editor */}
            <button
              type="button"
              onClick={() => onSelectMode('editor_only')}
              className={`p-2 font-medium rounded-md transition-all flex items-center justify-center cursor-pointer ${
                currentMode === 'editor_only'
                  ? 'bg-blue-600 text-white shadow-xs font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
              title="Spec Editor (Alt+3)"
              aria-label="Spec Editor"
            >
              <FileText className="w-4 h-4" />
            </button>

            {/* 4. Source */}
            <button
              type="button"
              onClick={() => onSelectMode('abap_code')}
              className={`p-2 font-medium rounded-md transition-all flex items-center justify-center cursor-pointer ${
                currentMode === 'abap_code'
                  ? 'bg-blue-600 text-white shadow-xs font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
              title="Source (Alt+4)"
              aria-label="Source"
            >
              <FileCode className="w-4 h-4" />
            </button>

            <div className="h-4 w-px bg-slate-700 mx-0.5" />

            {/* 5. Mock Data */}
            {onGenerateMockData && (
              <button
                type="button"
                onClick={onGenerateMockData}
                className="p-2 text-amber-300 hover:text-amber-200 hover:bg-slate-700/60 rounded-md transition-all flex items-center justify-center cursor-pointer"
                title="Mock Data"
                aria-label="Mock Data"
              >
                <Sparkles className="w-4 h-4" />
              </button>
            )}

            {/* 6. Print */}
            <button
              type="button"
              onClick={() => onSelectMode('document')}
              className={`p-2 font-medium rounded-md transition-all flex items-center justify-center cursor-pointer ${
                currentMode === 'document'
                  ? 'bg-blue-600 text-white shadow-xs font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
              title="Print Document (Alt+5)"
              aria-label="Print"
            >
              <Printer className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Global SAP GUI Theme Picker (Quartz / Belize / Blue Crystal) */}
        {onSelectTheme && (
          <div className="relative" ref={themeMenuRef}>
            <button
              type="button"
              onClick={() => setIsThemeMenuOpen((prev) => !prev)}
              className={`p-2 rounded-md transition-all flex items-center justify-center cursor-pointer ${
                isThemeMenuOpen
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-blue-300 hover:text-white hover:bg-slate-700/60'
              }`}
              title={`SAP GUI 테마: ${SAP_GUI_THEMES[currentTheme]?.name || 'Blue Crystal'}`}
              aria-label="SAP GUI Theme"
              aria-expanded={isThemeMenuOpen}
            >
              <Palette className="w-4 h-4" />
            </button>

            {isThemeMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-2xl border border-slate-200 p-2 z-50 text-slate-800">
                <div className="px-2 py-1 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500">
                    SAP GUI 테마 선택
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">자동 저장</span>
                </div>
                <div className="py-1.5 space-y-1">
                  {(['quartz', 'belize', 'blue_crystal'] as SapGuiTheme[]).map((themeKey) => {
                    const info = SAP_GUI_THEMES[themeKey];
                    const active = currentTheme === themeKey;
                    return (
                      <button
                        key={themeKey}
                        type="button"
                        onClick={() => {
                          onSelectTheme(themeKey);
                          setIsThemeMenuOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                          active
                            ? 'bg-blue-50 text-blue-900 font-bold border border-blue-200'
                            : 'hover:bg-slate-100 text-slate-700 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="w-4 h-4 rounded-sm border border-slate-300 shrink-0"
                            style={{ backgroundColor: info.colors.header }}
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-semibold leading-tight truncate">
                              {info.name}
                            </div>
                            <div className="text-[10px] text-slate-500 leading-tight mt-0.5">
                              {info.releaseBadge}
                            </div>
                          </div>
                        </div>
                        {active && <span className="text-blue-600 font-bold text-xs shrink-0">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 7. Keyboard Shortcuts */}
        {onOpenShortcuts && (
          <button
            type="button"
            onClick={onOpenShortcuts}
            className={`p-2 rounded-md transition-all flex items-center justify-center cursor-pointer ${
              currentMode === 'shortcuts'
                ? 'bg-blue-600 text-white shadow-xs font-semibold'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
            }`}
            title="Keyboard Shortcuts (?)"
            aria-label="Keyboard Shortcuts"
          >
            <Keyboard className="w-4 h-4" />
          </button>
        )}
      </nav>

      {/* Zone 3: 1 Primary Action & User Profile */}
      <div className="flex items-center gap-2.5 shrink-0">

        <button
          onClick={onNewSpec}
          title="Create New Specification"
          className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors whitespace-nowrap shrink-0 shadow-xs flex items-center gap-1 cursor-pointer"
        >
          <span>+ New</span>
        </button>

        {/* User Login & Switcher */}
        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs flex items-center gap-2 transition-colors cursor-pointer"
            title="Switch Active User"
          >
            <div className="w-5 h-5 rounded-full bg-blue-500 text-white font-bold flex items-center justify-center text-[10px]">
              {user.name.charAt(0)}
            </div>
            <div className="text-left hidden xl:block">
              <div className="font-bold text-white text-[11px] leading-none">{user.name}</div>
              <div className="text-[9px] text-blue-300 leading-none mt-0.5">{user.role.split('/')[0]}</div>
            </div>
            <span className="text-[10px] text-slate-400">▼</span>
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-2xl border border-slate-200 p-2 z-50 text-slate-800">
              <div className="text-[11px] font-bold text-slate-500 px-2 py-1 border-b border-slate-100">
                로그인 사용자 계정
              </div>
              <div className="py-1 space-y-0.5">
                {PRESET_USERS.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => {
                      setCurrentUser(u);
                      setUser(u);
                      setIsUserMenuOpen(false);
                      onUserChanged?.(u);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                      user.name === u.name
                        ? 'bg-blue-50 text-blue-900 font-bold border border-blue-200'
                        : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-xs">{u.name}</div>
                      <div className="text-[10px] text-slate-500">{u.role}</div>
                    </div>
                    {user.name === u.name && (
                      <span className="text-blue-600 font-bold text-xs">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
