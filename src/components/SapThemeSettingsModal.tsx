import React from 'react';
import { X, Check, Palette, Sparkles, Monitor } from 'lucide-react';
import { SapGuiTheme, SAP_GUI_THEMES, DEFAULT_SAP_THEME } from '../data/sapGuiThemes';

interface SapThemeSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: SapGuiTheme;
  onSelectTheme: (theme: SapGuiTheme) => void;
}

export const SapThemeSettingsModal: React.FC<SapThemeSettingsModalProps> = ({
  isOpen,
  onClose,
  currentTheme,
  onSelectTheme,
}) => {
  if (!isOpen) return null;

  const themes: SapGuiTheme[] = ['blue_crystal', 'belize', 'quartz'];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scaleUp font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 via-blue-50/40 to-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                SAP GUI Theme Settings
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold">
                  Standard Themes
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Switch between standard SAP GUI themes (Blue Crystal, Belize, Quartz) for the mockup preview.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Theme Cards */}
        <div className="p-6 space-y-4 overflow-y-auto">
          <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center justify-between">
            <span>Available GUI Themes ({themes.length})</span>
            <span className="text-[11px] font-normal text-slate-500">
              Active: <strong className="text-blue-700 font-bold">{SAP_GUI_THEMES[currentTheme].name}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {themes.map((themeKey) => {
              const theme = SAP_GUI_THEMES[themeKey];
              const isSelected = currentTheme === themeKey;

              return (
                <div
                  key={themeKey}
                  onClick={() => onSelectTheme(themeKey)}
                  className={`group relative rounded-xl border-2 p-3.5 transition-all cursor-pointer flex flex-col justify-between text-left ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/30 shadow-md ring-2 ring-blue-600/20'
                      : 'border-slate-200 hover:border-slate-400 hover:bg-slate-50/70 shadow-2xs'
                  }`}
                >
                  {/* Active Badge */}
                  {isSelected && (
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-xs">
                      <Check className="w-3 h-3 stroke-[3]" />
                      <span>Active</span>
                    </div>
                  )}

                  {/* Header info */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-900">
                        {theme.name}
                      </h3>
                    </div>
                    <span className="inline-block text-[10px] font-medium font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 mb-2">
                      {theme.releaseBadge}
                    </span>
                    <p className="text-[11px] text-slate-600 leading-snug line-clamp-3 mb-3">
                      {theme.description}
                    </p>
                  </div>

                  {/* Color Swatches */}
                  <div className="mt-auto pt-2.5 border-t border-slate-100">
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1.5 font-medium">
                      <span>Palette</span>
                      <div className="flex items-center gap-1">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/15 shadow-2xs"
                          style={{ backgroundColor: theme.colors.header }}
                          title={`Header: ${theme.colors.header}`}
                        />
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/15 shadow-2xs"
                          style={{ backgroundColor: theme.colors.shell }}
                          title={`Shell: ${theme.colors.shell}`}
                        />
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/15 shadow-2xs"
                          style={{ backgroundColor: theme.colors.toolbar }}
                          title={`Toolbar: ${theme.colors.toolbar}`}
                        />
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/15 shadow-2xs"
                          style={{ backgroundColor: theme.colors.accent }}
                          title={`Accent: ${theme.colors.accent}`}
                        />
                      </div>
                    </div>

                    {/* Mini Visual Preview Frame */}
                    <div className="rounded border border-slate-300 overflow-hidden text-[9px] shadow-2xs">
                      {/* Mini Titlebar */}
                      <div
                        className="px-2 py-1 font-bold text-slate-900 flex items-center justify-between"
                        style={theme.styles.titleBarStyle}
                      >
                        <span className={`truncate text-[9px] ${theme.styles.titleBarText}`}>
                          ZREPORT
                        </span>
                        <span className={`text-[8px] opacity-75 ${theme.styles.titleBarSubtext}`}>
                          7.50
                        </span>
                      </div>
                      {/* Mini Toolbar */}
                      <div
                        className={`px-1.5 py-0.5 flex items-center gap-1 border-b ${
                          themeKey === 'blue_crystal'
                            ? 'bg-[#e4eff9] border-[#a4bedb]'
                            : themeKey === 'belize'
                            ? 'bg-white border-[#d9e2ec]'
                            : 'bg-white border-[#e5e7eb]'
                        }`}
                      >
                        <div
                          className="w-3 h-3 rounded-xs border shadow-2xs flex items-center justify-center text-[7px]"
                          style={
                            themeKey === 'blue_crystal'
                              ? {
                                  background: 'linear-gradient(to bottom, #fffdf2, #f4d983)',
                                  borderColor: '#c0a662',
                                }
                              : themeKey === 'belize'
                              ? { backgroundColor: '#f0f3f6', borderColor: '#cbd5e1' }
                              : { backgroundColor: '#ffffff', borderColor: '#d1d5db' }
                          }
                        >
                          ▶
                        </div>
                        <div
                          className="w-3 h-3 rounded-xs border shadow-2xs flex items-center justify-center text-[7px]"
                          style={
                            themeKey === 'blue_crystal'
                              ? {
                                  background: 'linear-gradient(to bottom, #fffdf2, #f4d983)',
                                  borderColor: '#c0a662',
                                }
                              : themeKey === 'belize'
                              ? { backgroundColor: '#f0f3f6', borderColor: '#cbd5e1' }
                              : { backgroundColor: '#ffffff', borderColor: '#d1d5db' }
                          }
                        >
                          Σ
                        </div>
                        <div className="h-2 w-px bg-slate-300 mx-0.5" />
                        <div
                          className="h-2.5 px-1 rounded-xs text-[8px] font-bold flex items-center text-white"
                          style={{ backgroundColor: theme.colors.accent }}
                        >
                          ALV
                        </div>
                      </div>
                      {/* Mini Grid Header */}
                      <div
                        className={`px-1.5 py-1 flex items-center justify-between border-t border-slate-200 ${
                          themeKey === 'blue_crystal'
                            ? 'bg-[#d8e4f0] text-slate-900'
                            : themeKey === 'belize'
                            ? 'bg-[#edf2f7] text-slate-800'
                            : 'bg-[#f8fafc] text-slate-900'
                        }`}
                      >
                        <span className="font-semibold text-[8px]">POS</span>
                        <span className="font-semibold text-[8px]">DOC_NO</span>
                        <span className="font-semibold text-[8px]">AMOUNT</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Explanation note */}
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600 flex items-start gap-2.5">
            <Monitor className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <span className="font-semibold text-slate-800">Theme persistence:</span> Your selected SAP GUI theme is automatically saved to browser <code className="bg-slate-200/70 px-1 py-0.5 rounded font-mono text-[10px]">localStorage</code> and applies across all program previews, ALV tables, selection screens, and status indicators.
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={() => onSelectTheme(DEFAULT_SAP_THEME)}
            className="text-xs text-slate-600 hover:text-slate-900 font-medium underline underline-offset-2 cursor-pointer"
          >
            Reset to Default (Blue Crystal)
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
