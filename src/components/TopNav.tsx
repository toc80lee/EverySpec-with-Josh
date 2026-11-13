import React, { useState } from 'react';
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
} from 'lucide-react';
import { ProgramSpec } from '../types/sap';
import { getCurrentUser, setCurrentUser, PRESET_USERS, CurrentUser } from '../utils/authStorage';
import { SapGuiTheme, SAP_GUI_THEMES } from '../data/sapGuiThemes';

export type MainWorkspaceMode = 'split' | 'mockup_only' | 'editor_only' | 'abap_code' | 'document';
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
}) => {
  const [user, setUser] = useState<CurrentUser>(getCurrentUser());
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  return (
    <header className="no-print flex items-center justify-between gap-6 px-5 py-3 bg-slate-900 border-b border-slate-800 text-white shrink-0">
      {/* Zone 1: Brand Wordmark (Single text element) */}
      <div className="flex items-center gap-3 shrink-0">
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
      </div>

      {/* Zone 2: Workspace View Modes & Quick Tools (Icon-only with tooltips per RFQ v1.09 Page 2) */}
      <nav className="flex items-center gap-1 bg-slate-800/90 p-1 rounded-lg border border-slate-700/60 text-xs">
        {/* 1. Dual View */}
        <button
          type="button"
          onClick={() => onSelectMode('split')}
          className={`p-2 font-medium rounded-md transition-all flex items-center justify-center cursor-pointer ${
            currentMode === 'split'
              ? 'bg-blue-600 text-white shadow-xs font-semibold'
              : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
          }`}
          title="Dual View"
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
                ? '화면 전환 (현재: 상하 → 다음: 좌우)'
                : splitLayout === 'left-right'
                ? '화면 전환 (현재: 좌우 → 다음: 하상)'
                : splitLayout === 'bottom-top'
                ? '화면 전환 (현재: 하상 → 다음: 우좌)'
                : '화면 전환 (현재: 우좌 → 다음: 상하)'
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
          title="Simulation"
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
          title="Spec Editor"
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
          title="Source"
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

        {/* 6. Theme */}
        {onSelectTheme && (
          <button
            type="button"
            onClick={() => {
              const themes: SapGuiTheme[] = ['blue_crystal', 'belize', 'quartz'];
              const nextIdx = (themes.indexOf(currentTheme) + 1) % themes.length;
              onSelectTheme(themes[nextIdx]);
            }}
            className="p-2 text-blue-300 hover:text-white hover:bg-slate-700/60 rounded-md transition-all flex items-center justify-center cursor-pointer"
            title="Theme"
            aria-label="Theme"
          >
            <Palette className="w-4 h-4" />
          </button>
        )}

        {/* 7. Print */}
        <button
          type="button"
          onClick={() => onSelectMode('document')}
          className={`p-2 font-medium rounded-md transition-all flex items-center justify-center cursor-pointer ${
            currentMode === 'document'
              ? 'bg-blue-600 text-white shadow-xs font-semibold'
              : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
          }`}
          title="Print"
          aria-label="Print"
        >
          <Printer className="w-4 h-4" />
        </button>
      </nav>

      {/* Zone 3: 1 Primary Action & User Profile */}
      <div className="flex items-center gap-2.5 shrink-0">

        <button
          onClick={onNewSpec}
          className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors whitespace-nowrap shrink-0 shadow-xs flex items-center gap-1 cursor-pointer"
        >
          <span>+ New</span>
        </button>

        {/* User Login & Switcher */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs flex items-center gap-2 transition-colors cursor-pointer"
            title="현재 로그인 사용자 변경"
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
