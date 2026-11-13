export type SapGuiTheme = 'blue_crystal' | 'belize' | 'quartz';

export interface SapGuiThemeInfo {
  id: SapGuiTheme;
  name: string;
  releaseBadge: string;
  description: string;
  colors: {
    header: string;
    shell: string;
    toolbar: string;
    accent: string;
  };
  styles: {
    containerBorder: string;
    containerBg: string;
    titleBarBg: string;
    titleBarStyle?: React.CSSProperties;
    titleBarText: string;
    titleBarSubtext: string;
    titleBarBorder: string;
    subToolbarBg: string;
    subToolbarBorder: string;
    subToolbarText: string;
    switcherContainerBg: string;
    switcherActiveBg: string;
    switcherActiveText: string;
    alvToolbarBg: string;
    alvToolbarStyle?: React.CSSProperties;
    alvToolbarBorder: string;
    gridHeaderBg: string;
    gridHeaderText: string;
    gridHeaderBorder: string;
    gridCornerBg: string;
    gridZebraBg: string;
    gridHoverBg: string;
    gridBorderColor: string;
    totalRowBg: string;
    totalRowText: string;
    totalRowBorder: string;
    statusBarBg: string;
    statusBarBorder: string;
    statusBarText: string;
    statusIndicatorBg: string;
    selectionBoxBg: string;
    selectionBoxBorder: string;
    selectionBoxHeader: string;
  };
}

export const SAP_GUI_THEMES: Record<SapGuiTheme, SapGuiThemeInfo> = {
  blue_crystal: {
    id: 'blue_crystal',
    name: 'Blue Crystal',
    releaseBadge: 'SAP GUI 7.40 / 7.50',
    description: 'Classic enterprise blue steel gradient with signature amber toolbar and sky blue chrome.',
    colors: {
      header: '#b8d4f0',
      shell: '#dbe7f5',
      toolbar: '#f4d983',
      accent: '#2563eb',
    },
    styles: {
      containerBorder: 'border-[#9bbadb]',
      containerBg: 'bg-[#dbe7f5]',
      titleBarBg: 'bg-[#b8d4f0]',
      titleBarStyle: {
        background: 'linear-gradient(to bottom, #d8e8f8 0%, #b8d4f0 40%, #c8ddf4 100%)',
      },
      titleBarText: 'text-[#0f2238]',
      titleBarSubtext: 'text-slate-700',
      titleBarBorder: 'border-[#9bbadb]',
      subToolbarBg: 'bg-[#dbe7f5]',
      subToolbarBorder: 'border-[#a4bedb]',
      subToolbarText: 'text-slate-700',
      switcherContainerBg: 'bg-[#cbdcf0] border-[#a4bedb]',
      switcherActiveBg: 'bg-white text-slate-900',
      switcherActiveText: 'text-slate-900',
      alvToolbarBg: 'bg-[#fae6a6]',
      alvToolbarStyle: {
        background: 'linear-gradient(to bottom, #fffdf2 0%, #fae6a6 50%, #f4d983 100%)',
      },
      alvToolbarBorder: 'border-[#c0a662]',
      gridHeaderBg: 'bg-[#d8e4f0]',
      gridHeaderText: 'text-slate-900',
      gridHeaderBorder: 'border-[#9bbadb]',
      gridCornerBg: 'bg-[#c8d8ea]',
      gridZebraBg: 'bg-[#f4f7fb]',
      gridHoverBg: 'hover:bg-blue-100/40',
      gridBorderColor: '#d8d8d8',
      totalRowBg: 'bg-[#ffffa0]',
      totalRowText: 'text-slate-900',
      totalRowBorder: 'border-yellow-400',
      statusBarBg: 'bg-[#dbe7f5]',
      statusBarBorder: 'border-[#a4bedb]',
      statusBarText: 'text-slate-700',
      statusIndicatorBg: 'bg-[#c8d8ea] border-[#9bbadb]',
      selectionBoxBg: 'bg-[#dbe7f5]',
      selectionBoxBorder: 'border-[#c4d7ec]',
      selectionBoxHeader: 'bg-gradient-to-r from-blue-900 to-indigo-900 text-white',
    },
  },
  belize: {
    id: 'belize',
    name: 'Belize',
    releaseBadge: 'S/4HANA Fiori 2.0',
    description: 'Deep petrol titlebar with modern flat pearl neutral surfaces and clean Fiori 2.0 layout.',
    colors: {
      header: '#354a5f',
      shell: '#f0f3f6',
      toolbar: '#ffffff',
      accent: '#0070f2',
    },
    styles: {
      containerBorder: 'border-[#cbd5e1]',
      containerBg: 'bg-[#f0f3f6]',
      titleBarBg: 'bg-[#354a5f]',
      titleBarStyle: {
        background: '#354a5f',
      },
      titleBarText: 'text-white',
      titleBarSubtext: 'text-slate-300',
      titleBarBorder: 'border-[#273747]',
      subToolbarBg: 'bg-white',
      subToolbarBorder: 'border-[#d9e2ec]',
      subToolbarText: 'text-slate-700',
      switcherContainerBg: 'bg-[#edf2f7] border-[#cbd5e1]',
      switcherActiveBg: 'bg-white text-slate-900 shadow-xs',
      switcherActiveText: 'text-slate-900',
      alvToolbarBg: 'bg-white',
      alvToolbarStyle: {
        background: '#ffffff',
      },
      alvToolbarBorder: 'border-[#d9e2ec]',
      gridHeaderBg: 'bg-[#edf2f7]',
      gridHeaderText: 'text-[#1e293b]',
      gridHeaderBorder: 'border-[#cbd5e1]',
      gridCornerBg: 'bg-[#e2e8f0]',
      gridZebraBg: 'bg-[#f8fafc]',
      gridHoverBg: 'hover:bg-slate-100/80',
      gridBorderColor: '#e2e8f0',
      totalRowBg: 'bg-[#ffffa0]',
      totalRowText: 'text-slate-900',
      totalRowBorder: 'border-yellow-400',
      statusBarBg: 'bg-[#354a5f]',
      statusBarBorder: 'border-[#273747]',
      statusBarText: 'text-slate-200',
      statusIndicatorBg: 'bg-[#2b3e51] border-[#1d2a37]',
      selectionBoxBg: 'bg-[#f8fafc]',
      selectionBoxBorder: 'border-[#e2e8f0]',
      selectionBoxHeader: 'bg-[#354a5f] text-white',
    },
  },
  quartz: {
    id: 'quartz',
    name: 'Quartz',
    releaseBadge: 'S/4HANA Fiori 3.0',
    description: 'Contemporary dark charcoal shell with Quartz Light surfaces and SAP Horizon blue accents.',
    colors: {
      header: '#1d2d3e',
      shell: '#f5f6f7',
      toolbar: '#ffffff',
      accent: '#0a6ed1',
    },
    styles: {
      containerBorder: 'border-[#d1d5db]',
      containerBg: 'bg-[#f5f6f7]',
      titleBarBg: 'bg-[#1d2d3e]',
      titleBarStyle: {
        background: '#1d2d3e',
      },
      titleBarText: 'text-white',
      titleBarSubtext: 'text-slate-300',
      titleBarBorder: 'border-[#15222f]',
      subToolbarBg: 'bg-white',
      subToolbarBorder: 'border-[#e5e7eb]',
      subToolbarText: 'text-slate-700',
      switcherContainerBg: 'bg-[#f1f5f9] border-[#e2e8f0]',
      switcherActiveBg: 'bg-[#0a6ed1] text-white shadow-xs',
      switcherActiveText: 'text-white',
      alvToolbarBg: 'bg-white',
      alvToolbarStyle: {
        background: '#ffffff',
      },
      alvToolbarBorder: 'border-[#e5e7eb]',
      gridHeaderBg: 'bg-[#f8fafc]',
      gridHeaderText: 'text-[#0f172a]',
      gridHeaderBorder: 'border-[#e2e8f0]',
      gridCornerBg: 'bg-[#f1f5f9]',
      gridZebraBg: 'bg-[#fafafa]',
      gridHoverBg: 'hover:bg-blue-50/50',
      gridBorderColor: '#e5e7eb',
      totalRowBg: 'bg-[#ffffa0]',
      totalRowText: 'text-slate-900',
      totalRowBorder: 'border-yellow-400',
      statusBarBg: 'bg-[#1d2d3e]',
      statusBarBorder: 'border-[#15222f]',
      statusBarText: 'text-slate-200',
      statusIndicatorBg: 'bg-[#27384c] border-[#182635]',
      selectionBoxBg: 'bg-white',
      selectionBoxBorder: 'border-[#e5e7eb]',
      selectionBoxHeader: 'bg-[#1d2d3e] text-white',
    },
  },
};

export const DEFAULT_SAP_THEME: SapGuiTheme = 'blue_crystal';
export const SAP_THEME_STORAGE_KEY = 'sap_gui_mockup_theme';

export function isValidSapGuiTheme(value: unknown): value is SapGuiTheme {
  return value === 'blue_crystal' || value === 'belize' || value === 'quartz';
}

export function loadSavedSapTheme(): SapGuiTheme {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return DEFAULT_SAP_THEME;
    }
    const saved = window.localStorage.getItem(SAP_THEME_STORAGE_KEY);
    if (isValidSapGuiTheme(saved)) {
      return saved;
    }
  } catch {
    // localStorage unavailable (e.g., restricted iframe or privacy mode)
  }
  return DEFAULT_SAP_THEME;
}

export function saveSapTheme(theme: SapGuiTheme): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    if (isValidSapGuiTheme(theme)) {
      window.localStorage.setItem(SAP_THEME_STORAGE_KEY, theme);
    }
  } catch {
    // Ignore storage quota or security errors
  }
}
