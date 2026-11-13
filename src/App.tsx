import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ProgramSpec, ProjectMeetingMinute } from './types/sap';
import { SAMPLE_SPECS } from './data/sampleSpecs';
import { TopNav, MainWorkspaceMode, DualSplitLayout } from './components/TopNav';
import { SpecEditor } from './components/SpecEditor';
import { SapGuiMockup } from './components/SapGuiMockup';
import { AbapCodeGenerator } from './components/AbapCodeGenerator';
import { SpecDocumentView } from './components/SpecDocumentView';
import { ProgramTemplateModal } from './components/ProgramTemplateModal';
import { PdfExportModal } from './components/PdfExportModal';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { ProjectOverviewDashboard } from './components/ProjectOverviewDashboard';
import { ProjectManagerModal } from './components/ProjectManagerModal';
import { CopySpecModal } from './components/CopySpecModal';
import { MeetingSpecWizardModal } from './components/MeetingSpecWizardModal';
import { MeetingMinutesPage } from './components/MeetingMinutesPage';
import { SapGuiTheme, DEFAULT_SAP_THEME } from './data/sapGuiThemes';
import { CurrentUser, getCurrentUser, PRESET_USERS } from './utils/authStorage';
import {
  COMMON_PROJECT_CODE,
  TEMP_PROJECT_CODE,
  getAccessibleProjectsForUser,
  isCommonProtectedSample,
} from './utils/projectStorage';
import {
  SavedProgramSpecItem,
  getSavedSpecList,
  upsertWorkingSpecQuietly,
} from './utils/specStorage';
import { deleteMeetingMinute } from './utils/meetingStorage';
import { CheckCircle2, Undo2, X } from 'lucide-react';

const DUAL_SPLIT_CYCLE: DualSplitLayout[] = [
  'top-bottom',
  'left-right',
  'bottom-top',
  'right-left',
];

export default function App() {
  const [currentUser, setCurrentUserState] = useState<CurrentUser>(() => getCurrentUser());
  const [projectRefreshKey, setProjectRefreshKey] = useState(0);
  const [allSavedSpecs, setAllSavedSpecs] = useState<SavedProgramSpecItem[]>(() => getSavedSpecList());

  const accessibleProjects = useMemo(
    () => getAccessibleProjectsForUser(currentUser.name),
    [currentUser.name, projectRefreshKey]
  );

  const [selectedProjectCode, setSelectedProjectCode] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('sap_spec_selected_project_v1');
      if (saved) return saved;
    } catch {
      // ignore
    }
    return COMMON_PROJECT_CODE;
  });

  useEffect(() => {
    if (
      accessibleProjects.length > 0 &&
      !accessibleProjects.some((p) => p.code === selectedProjectCode)
    ) {
      const fallback = accessibleProjects[0].code;
      setSelectedProjectCode(fallback);
    }
  }, [accessibleProjects, selectedProjectCode]);

  const handleSelectProject = (code: string) => {
    setSelectedProjectCode(code);
    try {
      localStorage.setItem('sap_spec_selected_project_v1', code);
    } catch {
      // ignore
    }
  };

  const refreshAllSpecs = () => {
    setAllSavedSpecs(getSavedSpecList());
  };

  const [currentSpec, setCurrentSpec] = useState<ProgramSpec>(SAMPLE_SPECS[0]);
  const [historyPast, setHistoryPast] = useState<ProgramSpec[]>([]);
  const [historyFuture, setHistoryFuture] = useState<ProgramSpec[]>([]);
  const lastEditTimestampRef = useRef<number>(0);

  // Default entry screen is now Project Overview Dashboard
  const [workspaceMode, setWorkspaceMode] = useState<MainWorkspaceMode>('overview');
  const returnFromPageModeRef = useRef<MainWorkspaceMode>('overview');
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isPdfExportModalOpen, setIsPdfExportModalOpen] = useState(false);
  const [copyingSpec, setCopyingSpec] = useState<ProgramSpec | null>(null);
  const [editingMeetingMinute, setEditingMeetingMinute] = useState<ProjectMeetingMinute | null>(null);
  const [selectedMinuteDetailId, setSelectedMinuteDetailId] = useState<string | null>(null);
  const [wizardStartInSpecGen, setWizardStartInSpecGen] = useState<boolean>(false);
  const [meetingRefreshKey, setMeetingRefreshKey] = useState(0);

  const openFullPageMode = (target: 'meeting_wizard' | 'project_settings' | 'shortcuts') => {
    if (
      workspaceMode !== 'meeting_wizard' &&
      workspaceMode !== 'project_settings' &&
      workspaceMode !== 'shortcuts'
    ) {
      returnFromPageModeRef.current = workspaceMode;
    }
    setWorkspaceMode(target);
  };

  const closeFullPageMode = () => {
    const back = returnFromPageModeRef.current || 'overview';
    setWorkspaceMode(back);
  };
  const [workspaceToast, setWorkspaceToast] = useState<{
    message: string;
    actionLabel?: string;
    onAction?: () => void;
  } | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const showWorkspaceToast = (
    message: string,
    actionLabel?: string,
    onAction?: () => void
  ) => {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    setWorkspaceToast({ message, actionLabel, onAction });
    toastTimerRef.current = window.setTimeout(() => {
      setWorkspaceToast(null);
    }, 3600);
  };

  const applySpecChange = (updated: ProgramSpec, forceNewHistoryStep = false) => {
    const now = Date.now();
    const isRapidContinuousEdit =
      !forceNewHistoryStep &&
      now - lastEditTimestampRef.current < 700 &&
      updated.id === currentSpec.id &&
      updated.selection_params.length === currentSpec.selection_params.length &&
      updated.field_catalog.length === currentSpec.field_catalog.length &&
      updated.sample_type === currentSpec.sample_type;

    lastEditTimestampRef.current = now;

    if (!isRapidContinuousEdit) {
      setHistoryPast((prev) => [...prev.slice(-29), currentSpec]);
    }
    setHistoryFuture([]);
    setCurrentSpec(updated);

    if (!isCommonProtectedSample(updated)) {
      upsertWorkingSpecQuietly(updated);
      refreshAllSpecs();
    }
  };

  const handleOpenProgramFromProject = (spec: ProgramSpec) => {
    setHistoryPast([]);
    setHistoryFuture([]);
    setCurrentSpec(spec);
    if (spec.project_code) {
      handleSelectProject(spec.project_code);
    }
    setWorkspaceMode('split');
  };

  const handleUndo = () => {
    if (historyPast.length === 0) return;
    const previous = historyPast[historyPast.length - 1];
    setHistoryPast((prev) => prev.slice(0, -1));
    setHistoryFuture((prev) => [currentSpec, ...prev.slice(0, 29)]);
    setCurrentSpec(previous);
    showWorkspaceToast(`이전 사양 상태로 되돌렸습니다 (${previous.program_id})`);
  };

  const handleRedo = () => {
    if (historyFuture.length === 0) return;
    const next = historyFuture[0];
    setHistoryFuture((prev) => prev.slice(1));
    setHistoryPast((prev) => [...prev.slice(-29), currentSpec]);
    setCurrentSpec(next);
    showWorkspaceToast(`다시 실행했습니다 (${next.program_id})`);
  };
  const [currentTheme, setCurrentTheme] = useState<SapGuiTheme>(() => {
    try {
      const saved = localStorage.getItem('sap_gui_mockup_theme') as SapGuiTheme;
      if (saved) return saved;
    } catch {
      // ignore
    }
    return DEFAULT_SAP_THEME;
  });
  const [mockDataTrigger, setMockDataTrigger] = useState<number>(0);

  // Dual Screen Split Layout (상하, 좌우, 하상, 우좌) & Resizable Divider Ratio
  const [splitLayout, setSplitLayout] = useState<DualSplitLayout>(() => {
    try {
      const saved = localStorage.getItem('sap_spec_dual_split_layout') as DualSplitLayout;
      if (DUAL_SPLIT_CYCLE.includes(saved)) return saved;
    } catch {
      // ignore
    }
    return 'left-right';
  });
  const isVerticalSplit = splitLayout === 'top-bottom' || splitLayout === 'bottom-top';
  const isReversedSplit = splitLayout === 'bottom-top' || splitLayout === 'right-left';

  const [splitRatio, setSplitRatio] = useState<number>(() => {
    try {
      const saved = Number(localStorage.getItem('sap_spec_dual_split_ratio'));
      if (!isNaN(saved) && saved >= 20 && saved <= 80) return saved;
    } catch {
      // ignore
    }
    return 50;
  });
  const [isResizingSplit, setIsResizingSplit] = useState(false);
  const splitContainerRef = useRef<HTMLDivElement | null>(null);
  const splitRatioRef = useRef<number>(splitRatio);
  splitRatioRef.current = splitRatio;

  useEffect(() => {
    if (!isResizingSplit) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!splitContainerRef.current) return;
      const rect = splitContainerRef.current.getBoundingClientRect();
      let nextRatio = 50;
      if (!isVerticalSplit) {
        if (rect.width <= 0) return;
        nextRatio = ((e.clientX - rect.left) / rect.width) * 100;
      } else {
        if (rect.height <= 0) return;
        nextRatio = ((e.clientY - rect.top) / rect.height) * 100;
      }
      const clamped = Math.min(80, Math.max(20, Math.round(nextRatio * 10) / 10));
      splitRatioRef.current = clamped;
      setSplitRatio(clamped);
    };

    const handleMouseUp = () => {
      setIsResizingSplit(false);
      document.body.style.cursor = '';
      try {
        localStorage.setItem('sap_spec_dual_split_ratio', String(splitRatioRef.current));
      } catch {
        // ignore
      }
    };

    document.body.style.cursor = !isVerticalSplit ? 'col-resize' : 'row-resize';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.body.style.cursor = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingSplit, isVerticalSplit]);

  const handleCycleSplitLayout = () => {
    setSplitLayout((prev) => {
      const idx = DUAL_SPLIT_CYCLE.indexOf(prev);
      const next = DUAL_SPLIT_CYCLE[(idx + 1) % DUAL_SPLIT_CYCLE.length];
      try {
        localStorage.setItem('sap_spec_dual_split_layout', next);
      } catch {
        // ignore
      }
      const labels: Record<DualSplitLayout, string> = {
        'top-bottom': '상하 분할 (Top / Bottom)',
        'left-right': '좌우 분할 (Left / Right)',
        'bottom-top': '하상 분할 (Bottom / Top)',
        'right-left': '우좌 분할 (Right / Left)',
      };
      showWorkspaceToast(`화면 배치: ${labels[next]}`);
      return next;
    });
  };

  // Global keyboard shortcuts (Alt+1..5 views, Alt+L layout, Ctrl+Z/Y undo/redo, ? help)
  useEffect(() => {
    const onGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTextInput =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        Boolean(target?.isContentEditable);

      // View mode switching: Alt + 1..5
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        if (e.key === '1') {
          e.preventDefault();
          setWorkspaceMode('split');
          return;
        }
        if (e.key === '2') {
          e.preventDefault();
          setWorkspaceMode('mockup_only');
          return;
        }
        if (e.key === '3') {
          e.preventDefault();
          setWorkspaceMode('editor_only');
          return;
        }
        if (e.key === '4') {
          e.preventDefault();
          setWorkspaceMode('abap_code');
          return;
        }
        if (e.key === '5') {
          e.preventDefault();
          setWorkspaceMode('document');
          return;
        }
        if (e.key.toLowerCase() === 'l' && workspaceMode === 'split') {
          e.preventDefault();
          handleCycleSplitLayout();
          return;
        }
      }

      if (isTextInput) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          if (historyFuture.length > 0) {
            e.preventDefault();
            handleRedo();
          }
        } else if (historyPast.length > 0) {
          e.preventDefault();
          handleUndo();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        if (historyFuture.length > 0) {
          e.preventDefault();
          handleRedo();
        }
        return;
      }

      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        if (workspaceMode === 'shortcuts') {
          closeFullPageMode();
        } else {
          openFullPageMode('shortcuts');
        }
      }
    };

    window.addEventListener('keydown', onGlobalKeyDown);
    return () => window.removeEventListener('keydown', onGlobalKeyDown);
  });

  // Create new blank specification (assigned to current non-COMMON project or TEMP)
  const handleNewSpec = (explicitProjectCode?: string) => {
    const activeUser = getCurrentUser();
    const registeredAuthor = PRESET_USERS.some((u) => u.name === activeUser.name)
      ? activeUser.name
      : PRESET_USERS[0].name;

    const targetProject =
      explicitProjectCode && explicitProjectCode !== COMMON_PROJECT_CODE
        ? explicitProjectCode
        : selectedProjectCode && selectedProjectCode !== COMMON_PROJECT_CODE
        ? selectedProjectCode
        : TEMP_PROJECT_CODE;

    const existingIds = new Set(allSavedSpecs.map((s) => s.program_id.toUpperCase()));
    let suffix = 1;
    let nextProgramId = 'ZR_CUSTOM_001';
    while (existingIds.has(nextProgramId)) {
      suffix += 1;
      nextProgramId = `ZR_CUSTOM_${String(suffix).padStart(3, '0')}`;
    }

    const blankSpec: ProgramSpec = {
      id: `spec-custom-${Date.now()}`,
      project_code: targetProject,
      program_id: nextProgramId,
      tcode: `ZC${String(suffix).padStart(3, '0')}`,
      title: '신규 ALV 그리드 레포트 프로그램',
      module: 'SD',
      author: registeredAuthor,
      created_date: new Date().toISOString().split('T')[0],
      target_sap_release: 'SAP S/4HANA 2023',
      program_type: 'REPORT',
      business_purpose: '신규 비즈니스 프로세스 데이터 조회를 위한 ALV 리포트입니다.',
      data_extraction_logic: '1. 조회 조건 및 데이터베이스 추출 로직을 정의하세요.',
      selection_params: [
        {
          id: 'p_bukrs',
          kind: 'PARAMETER',
          name: 'P_BUKRS',
          text: '회사코드 (Company Code)',
          ref_table: 'T001',
          ref_field: 'BUKRS',
          datatype: 'CHAR',
          length: 4,
          obligatory: true,
          default_val: '1000',
          low: '1000',
        },
        {
          id: 's_date',
          kind: 'SELECT_OPTION',
          name: 'S_DATE',
          text: '조회일자 (Posting Date)',
          datatype: 'DATS',
          length: 10,
          obligatory: true,
          default_val: 'SY-DATUM',
          low: '2026.10.01',
          high: '2026.10.31',
          sign: 'I',
          option: 'BT',
        },
      ],
      field_catalog: [
        {
          id: 'custom-f1',
          col_pos: 1,
          fieldname: 'ZICON',
          coltext: 'Status',
          datatype: 'CHAR',
          outputlen: 5,
          just: 'C',
          key: true,
          hotspot: false,
          checkbox: false,
          edit: false,
          do_sum: false,
          emphasize: '',
        },
        {
          id: 'custom-f2',
          col_pos: 2,
          fieldname: 'DOC_NO',
          coltext: '문서번호',
          datatype: 'CHAR',
          outputlen: 12,
          just: 'C',
          key: true,
          hotspot: true,
          checkbox: false,
          edit: false,
          do_sum: false,
          emphasize: '',
          drilldown_tcode: 'VA03',
        },
        {
          id: 'custom-f3',
          col_pos: 3,
          fieldname: 'DOC_DATE',
          coltext: '전기일자',
          datatype: 'DATS',
          outputlen: 10,
          just: 'C',
          key: false,
          hotspot: false,
          checkbox: false,
          edit: false,
          do_sum: false,
          emphasize: '',
        },
        {
          id: 'custom-f4',
          col_pos: 4,
          fieldname: 'PARTNER_NAME',
          coltext: '거래처명',
          datatype: 'CHAR',
          outputlen: 25,
          just: 'L',
          key: false,
          hotspot: false,
          checkbox: false,
          edit: false,
          do_sum: false,
          emphasize: '',
        },
        {
          id: 'custom-f5',
          col_pos: 5,
          fieldname: 'AMOUNT',
          coltext: '공급가액',
          datatype: 'CURR',
          outputlen: 15,
          just: 'R',
          key: false,
          hotspot: false,
          checkbox: false,
          edit: false,
          do_sum: true,
          emphasize: '',
        },
        {
          id: 'custom-f6',
          col_pos: 6,
          fieldname: 'CURRENCY',
          coltext: '통화',
          datatype: 'CHAR',
          outputlen: 5,
          just: 'C',
          key: false,
          hotspot: false,
          checkbox: false,
          edit: false,
          do_sum: false,
          emphasize: '',
        },
      ],
      layout: {
        zebra: true,
        grid_title: '신규 사용자 정의 레포트 ALV',
        sel_mode: 'A',
        cwidth_opt: true,
        totals_only: false,
        excp_fname: 'ZICON',
        excp_led: true,
        show_row_numbers: true,
      },
      custom_toolbar: [],
      test_cases: [
        {
          id: 'tc-new-1',
          scenario: '정상 데이터 조회',
          condition: '회사코드=1000 입력',
          expected: '그리드 정상 출력 확인',
        },
      ],
      mock_rows: [
        {
          ZICON: '1',
          DOC_NO: 'DOC-2026-001',
          DOC_DATE: '2026.10.10',
          PARTNER_NAME: '(주)삼성전자 수원공장',
          AMOUNT: 45000000,
          CURRENCY: 'KRW',
        },
        {
          ZICON: '2',
          DOC_NO: 'DOC-2026-002',
          DOC_DATE: '2026.10.15',
          PARTNER_NAME: '현대자동차 남양연구소',
          AMOUNT: 38200000,
          CURRENCY: 'KRW',
        },
        {
          ZICON: '3',
          DOC_NO: 'DOC-2026-003',
          DOC_DATE: '2026.10.22',
          PARTNER_NAME: 'LG에너지솔루션 오창',
          AMOUNT: 19800000,
          CURRENCY: 'KRW',
        },
      ],
    };

    applySpecChange(blankSpec, true);
    handleSelectProject(targetProject);
    setWorkspaceMode('split');
    showWorkspaceToast(`[${targetProject}] 새 프로그램 사양서(${nextProgramId})가 생성되었습니다.`, '되돌리기', () => {
      setHistoryPast((prev) => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1];
        setCurrentSpec(last);
        return prev.slice(0, -1);
      });
    });
  };

  // Trigger print-friendly view and PDF export
  const handleTriggerPrint = () => {
    setWorkspaceMode('document');
    setTimeout(() => {
      window.print();
    }, 280);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-900 text-slate-900 print:h-auto print:min-h-screen print:overflow-visible print:bg-white">
      {/* 1. Header Navigation Bar */}
      <TopNav
        currentMode={workspaceMode}
        onSelectMode={(mode) => {
          if (mode === 'overview' || mode === 'program_list') {
            refreshAllSpecs();
          }
          setWorkspaceMode(mode);
        }}
        currentSpec={currentSpec}
        onSelectTemplate={(s) => applySpecChange(s, true)}
        onNewSpec={() => handleNewSpec()}
        onTriggerPrint={handleTriggerPrint}
        onOpenTemplates={() => setIsTemplateModalOpen(true)}
        onExportPdf={() => setIsPdfExportModalOpen(true)}
        currentTheme={currentTheme}
        onSelectTheme={(t) => {
          setCurrentTheme(t);
          try {
            localStorage.setItem('sap_gui_mockup_theme', t);
          } catch {
            // ignore
          }
          const themeNames: Record<SapGuiTheme, string> = {
            blue_crystal: 'SAP Blue Crystal',
            belize: 'SAP Belize',
            quartz: 'SAP Quartz Light',
          };
          showWorkspaceToast(`시뮬레이터 테마: ${themeNames[t]}`);
        }}
        onGenerateMockData={() => {
          setMockDataTrigger((prev) => prev + 1);
          showWorkspaceToast('Mock 데이터를 새로 생성하고 있습니다...');
        }}
        splitLayout={splitLayout}
        onCycleSplitLayout={handleCycleSplitLayout}
        onOpenShortcuts={() => {
          if (workspaceMode === 'shortcuts') {
            closeFullPageMode();
          } else {
            openFullPageMode('shortcuts');
          }
        }}
        onOpenProjectManager={() => {
          if (workspaceMode === 'project_settings') {
            closeFullPageMode();
          } else {
            openFullPageMode('project_settings');
          }
        }}
        selectedProjectCode={selectedProjectCode}
        onUserChanged={(u) => {
          setCurrentUserState(u);
          setProjectRefreshKey((k) => k + 1);
          refreshAllSpecs();
          showWorkspaceToast(`로그인 사용자 전환: ${u.name}`);
        }}
      />

      {/* 2. Main Workspace Viewport */}
      <main
        className={`flex-1 overflow-hidden ${
          workspaceMode === 'overview' ||
          workspaceMode === 'program_list' ||
          workspaceMode === 'meeting_minutes' ||
          workspaceMode === 'meeting_wizard' ||
          workspaceMode === 'project_settings' ||
          workspaceMode === 'shortcuts'
            ? 'p-0 bg-slate-50'
            : 'p-3 bg-slate-950'
        } print:p-0 print:bg-white print:overflow-visible print:h-auto`}
      >
        {(workspaceMode === 'overview' || workspaceMode === 'program_list') && (
          <ProjectOverviewDashboard
            viewMode={workspaceMode}
            currentUser={currentUser}
            accessibleProjects={accessibleProjects}
            selectedProjectCode={selectedProjectCode}
            onSelectProject={handleSelectProject}
            allSpecs={allSavedSpecs}
            onSpecsChanged={refreshAllSpecs}
            onChangeViewMode={(m) => {
              refreshAllSpecs();
              setWorkspaceMode(m);
            }}
            onOpenProgram={handleOpenProgramFromProject}
            onCreateNewProgram={(projCode) => handleNewSpec(projCode)}
            onOpenProjectManager={() => openFullPageMode('project_settings')}
            onRequestCopySpec={(spec) => setCopyingSpec(spec)}
            meetingRefreshKey={meetingRefreshKey}
            onOpenMeetingWizard={(minute) => {
              setEditingMeetingMinute(minute || null);
              setWizardStartInSpecGen(false);
              openFullPageMode('meeting_wizard');
            }}
            onOpenMeetingArchive={(minuteId) => {
              setSelectedMinuteDetailId(minuteId || null);
              setWorkspaceMode('meeting_minutes');
            }}
            onEnterSpecGenFromMinute={(minute) => {
              setEditingMeetingMinute(minute);
              setWizardStartInSpecGen(true);
              openFullPageMode('meeting_wizard');
            }}
            onDeleteMeetingMinute={(id) => {
              deleteMeetingMinute(id);
              setMeetingRefreshKey((k) => k + 1);
              showWorkspaceToast('회의록 이력이 삭제되었습니다.');
            }}
            onNotify={(msg) => showWorkspaceToast(msg)}
          />
        )}

        {workspaceMode === 'meeting_minutes' && (
          <MeetingMinutesPage
            currentUser={currentUser}
            accessibleProjects={accessibleProjects}
            selectedProjectCode={selectedProjectCode}
            onSelectProject={handleSelectProject}
            allSpecs={allSavedSpecs}
            initialSelectedMinuteId={selectedMinuteDetailId}
            meetingRefreshKey={meetingRefreshKey}
            onMinutesChanged={() => setMeetingRefreshKey((k) => k + 1)}
            onBackToOverview={() => setWorkspaceMode('overview')}
            onStartNewMeeting={() => {
              setEditingMeetingMinute(null);
              setWizardStartInSpecGen(false);
              openFullPageMode('meeting_wizard');
            }}
            onResumeWizard={(minute) => {
              setEditingMeetingMinute(minute);
              setWizardStartInSpecGen(false);
              openFullPageMode('meeting_wizard');
            }}
            onEnterSpecGeneration={(minute) => {
              setEditingMeetingMinute(minute);
              setWizardStartInSpecGen(true);
              openFullPageMode('meeting_wizard');
            }}
            onDeleteMinute={(id) => {
              deleteMeetingMinute(id);
              setMeetingRefreshKey((k) => k + 1);
              showWorkspaceToast('회의록 이력이 삭제되었습니다.');
            }}
            onOpenProgram={handleOpenProgramFromProject}
            onNotify={(msg) => showWorkspaceToast(msg)}
          />
        )}

        {workspaceMode === 'meeting_wizard' && (
          <MeetingSpecWizardModal
            isOpen={true}
            startInSpecGen={wizardStartInSpecGen}
            onClose={() => {
              setEditingMeetingMinute(null);
              setWizardStartInSpecGen(false);
              closeFullPageMode();
            }}
            currentUser={currentUser}
            accessibleProjects={accessibleProjects}
            defaultProjectCode={selectedProjectCode}
            existingProgramIds={allSavedSpecs.map((s) => s.program_id)}
            initialMinute={editingMeetingMinute}
            onMinutesSaved={() => setMeetingRefreshKey((k) => k + 1)}
            onSpecFinalized={(generatedSpec) => {
              applySpecChange(generatedSpec, true);
              if (generatedSpec.project_code) {
                handleSelectProject(generatedSpec.project_code);
              }
              setMeetingRefreshKey((k) => k + 1);
              setEditingMeetingMinute(null);
              setWizardStartInSpecGen(false);
              setWorkspaceMode('split');
              showWorkspaceToast(
                `[${generatedSpec.project_code}] '${generatedSpec.program_id}' 사양서가 생성되었습니다. 상세 내용을 자유롭게 수정하세요.`
              );
            }}
          />
        )}

        {workspaceMode === 'project_settings' && (
          <ProjectManagerModal
            isOpen={true}
            initialProjectCode={selectedProjectCode}
            onClose={closeFullPageMode}
            onProjectsChanged={(nextSelected) => {
              setProjectRefreshKey((k) => k + 1);
              refreshAllSpecs();
              if (nextSelected) {
                handleSelectProject(nextSelected);
              }
            }}
          />
        )}

        {workspaceMode === 'shortcuts' && (
          <KeyboardShortcutsModal
            isOpen={true}
            onClose={closeFullPageMode}
          />
        )}

        {workspaceMode === 'split' && (
          <div
            ref={splitContainerRef}
            className={`flex h-full overflow-hidden ${
              isVerticalSplit ? 'flex-col' : 'flex-row'
            } ${isResizingSplit ? 'select-none' : ''}`}
          >
            {/* SpecEditor Pane */}
            <div
              style={
                !isReversedSplit
                  ? !isVerticalSplit
                    ? { width: `calc(${splitRatio}% - 6px)` }
                    : { height: `calc(${splitRatio}% - 6px)` }
                  : undefined
              }
              className={`${
                isReversedSplit ? 'order-3 flex-1' : 'order-1 shrink-0'
              } ${isVerticalSplit ? 'w-full' : 'h-full'} overflow-hidden min-w-0 min-h-0`}
            >
              <SpecEditor
                spec={currentSpec}
                onChange={(updated) => applySpecChange(updated)}
                onTriggerPrint={handleTriggerPrint}
                onOpenTemplates={() => setIsTemplateModalOpen(true)}
                canUndo={historyPast.length > 0}
                canRedo={historyFuture.length > 0}
                onUndo={handleUndo}
                onRedo={handleRedo}
                onNotify={(msg) => showWorkspaceToast(msg)}
              />
            </div>

            {/* Interactive Resizable Divider */}
            <div
              role="separator"
              aria-orientation={!isVerticalSplit ? 'vertical' : 'horizontal'}
              aria-label="창 크기 조절 경계선"
              title="Drag to resize panes (Double-click: 50:50 reset)"
              onMouseDown={(e) => {
                e.preventDefault();
                setIsResizingSplit(true);
              }}
              onDoubleClick={() => {
                setSplitRatio(50);
                try {
                  localStorage.setItem('sap_spec_dual_split_ratio', '50');
                } catch {
                  // ignore
                }
                showWorkspaceToast('화면 분할 비율이 50% : 50%로 초기화되었습니다.');
              }}
              className={`order-2 shrink-0 relative flex items-center justify-center group transition-colors ${
                !isVerticalSplit
                  ? 'w-3 h-full cursor-col-resize'
                  : 'h-3 w-full cursor-row-resize'
              }`}
            >
              <div
                className={`rounded-full transition-colors ${
                  isResizingSplit
                    ? 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]'
                    : 'bg-slate-700 group-hover:bg-blue-400'
                } ${
                  !isVerticalSplit
                    ? 'w-1 h-12 group-hover:h-20'
                    : 'h-1 w-12 group-hover:w-20'
                }`}
              />
              {isResizingSplit && (
                <div className="absolute z-40 px-2 py-0.5 rounded bg-slate-900/95 border border-blue-400 text-white font-mono text-[10px] font-bold whitespace-nowrap shadow-lg pointer-events-none">
                  {Math.round(splitRatio)}% : {Math.round(100 - splitRatio)}%
                </div>
              )}
            </div>

            {/* Real-time Interactive SAP GUI Mockup Pane */}
            <div
              style={
                isReversedSplit
                  ? !isVerticalSplit
                    ? { width: `calc(${splitRatio}% - 6px)` }
                    : { height: `calc(${splitRatio}% - 6px)` }
                  : undefined
              }
              className={`${
                isReversedSplit ? 'order-1 shrink-0' : 'order-3 flex-1'
              } ${isVerticalSplit ? 'w-full' : 'h-full'} overflow-hidden min-w-0 min-h-0`}
            >
              <SapGuiMockup
                spec={currentSpec}
                onUpdateSpec={(updated) => applySpecChange(updated)}
                currentTheme={currentTheme}
                onSelectTheme={setCurrentTheme}
                mockDataTrigger={mockDataTrigger}
              />
            </div>
          </div>
        )}

        {workspaceMode === 'mockup_only' && (
          <div className="h-full max-w-7xl mx-auto overflow-hidden">
            <SapGuiMockup
              spec={currentSpec}
              onUpdateSpec={(updated) => applySpecChange(updated)}
              currentTheme={currentTheme}
              onSelectTheme={setCurrentTheme}
              mockDataTrigger={mockDataTrigger}
            />
          </div>
        )}

        {workspaceMode === 'editor_only' && (
          <div className="h-full max-w-6xl mx-auto overflow-hidden">
            <SpecEditor
              spec={currentSpec}
              onChange={(updated) => applySpecChange(updated)}
              onTriggerPrint={handleTriggerPrint}
              onOpenTemplates={() => setIsTemplateModalOpen(true)}
              canUndo={historyPast.length > 0}
              canRedo={historyFuture.length > 0}
              onUndo={handleUndo}
              onRedo={handleRedo}
              onNotify={(msg) => showWorkspaceToast(msg)}
            />
          </div>
        )}

        {workspaceMode === 'abap_code' && (
          <div className="h-full max-w-6xl mx-auto overflow-hidden">
            <AbapCodeGenerator spec={currentSpec} />
          </div>
        )}

        {workspaceMode === 'document' && (
          <div className="h-full w-full overflow-hidden print:overflow-visible print:h-auto">
            <SpecDocumentView
              spec={currentSpec}
              onImportSpec={(imported) => {
                applySpecChange(imported, true);
                showWorkspaceToast(`사양서를 불러왔습니다 (${imported.program_id})`);
              }}
              onReturnToWorkspace={() => setWorkspaceMode('split')}
            />
          </div>
        )}
      </main>

      {/* Non-intrusive Workspace Toast Notification */}
      {workspaceToast && (
        <div
          role="status"
          aria-live="polite"
          className="no-print fixed bottom-4 right-4 z-50 bg-slate-900/95 text-white border border-slate-700 shadow-2xl rounded-lg px-3.5 py-2.5 text-xs flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-150"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium">{workspaceToast.message}</span>
          {workspaceToast.actionLabel && workspaceToast.onAction && (
            <button
              type="button"
              onClick={() => {
                workspaceToast.onAction?.();
                setWorkspaceToast(null);
              }}
              className="px-2 py-0.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer"
            >
              <Undo2 className="w-3 h-3" />
              <span>{workspaceToast.actionLabel}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setWorkspaceToast(null)}
            className="text-slate-400 hover:text-white cursor-pointer"
            aria-label="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Program Templates Management Modal */}
      <ProgramTemplateModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        currentSpec={currentSpec}
        onSelectTemplate={(s) => {
          const targetProj =
            selectedProjectCode && selectedProjectCode !== COMMON_PROJECT_CODE
              ? selectedProjectCode
              : TEMP_PROJECT_CODE;
          applySpecChange(
            {
              ...s,
              project_code: targetProj,
              is_system: false,
            },
            true
          );
          setIsTemplateModalOpen(false);
          showWorkspaceToast(`템플릿 '${s.title}'이(가) '${targetProj}' 프로젝트에 적용됨`);
        }}
      />

      {/* Copy Spec to Target Project Modal (from Overview / List) */}
      <CopySpecModal
        isOpen={copyingSpec !== null}
        sourceSpec={copyingSpec}
        defaultTargetProject={selectedProjectCode !== COMMON_PROJECT_CODE ? selectedProjectCode : TEMP_PROJECT_CODE}
        onClose={() => setCopyingSpec(null)}
        onCopied={(newSpec) => {
          refreshAllSpecs();
          handleOpenProgramFromProject(newSpec);
          showWorkspaceToast(`'${newSpec.project_code}' 프로젝트로 '${newSpec.program_id}' 복사 완료`);
        }}
      />

      {/* jsPDF Specification Export Modal */}
      <PdfExportModal
        isOpen={isPdfExportModalOpen}
        onClose={() => setIsPdfExportModalOpen(false)}
        spec={currentSpec}
      />
    </div>
  );
}
