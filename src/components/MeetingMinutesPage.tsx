import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileCode,
  Layers,
  Loader2,
  MessageSquareText,
  Mic,
  Plus,
  Save,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  MeetingMinuteStatus,
  ProgramSpec,
  ProjectMeetingMinute,
  SapModule,
  SapProject,
} from '../types/sap';
import { CurrentUser } from '../utils/authStorage';
import { COMMON_PROJECT_CODE, TEMP_PROJECT_CODE } from '../utils/projectStorage';
import {
  formatNowDateTime,
  getVisibleMinutesForProject,
  saveMeetingMinute,
} from '../utils/meetingStorage';
import { SavedProgramSpecItem } from '../utils/specStorage';
import { MarkdownFieldEditor } from './MarkdownFieldEditor';
import { requestAiMeetingMinutes } from '../utils/aiLogicGenerator';

const STATUS_META: Record<
  MeetingMinuteStatus,
  { label: string; textColor: string; dotColor: string }
> = {
  recording: {
    label: '녹음/작성 중',
    textColor: 'text-amber-700',
    dotColor: 'bg-amber-500',
  },
  minutes_ready: {
    label: '회의록 완료',
    textColor: 'text-slate-700',
    dotColor: 'bg-slate-500',
  },
  recommended: {
    label: '유형 추천 완료',
    textColor: 'text-blue-700',
    dotColor: 'bg-blue-600',
  },
  spec_generated: {
    label: '스펙 생성 완료',
    textColor: 'text-emerald-700',
    dotColor: 'bg-emerald-600',
  },
};

const SAMPLE_TYPE_NAMES: Record<string, string> = {
  '01': '01 · Single ALV Grid (ZRALV0010)',
  '02': '02 · Master-Detail 2-Grid (ZRALV0020)',
  '03': '03 · Tree ALV Grid (ZRALV0030)',
  '04': '04 · Pivot Browser (ZRALV0040)',
};

interface MeetingMinutesPageProps {
  currentUser: CurrentUser;
  accessibleProjects: SapProject[];
  selectedProjectCode: string;
  onSelectProject: (code: string) => void;
  allSpecs: SavedProgramSpecItem[];
  initialSelectedMinuteId?: string | null;
  meetingRefreshKey: number;
  onMinutesChanged: () => void;
  onBackToOverview: () => void;
  onStartNewMeeting: () => void;
  onResumeWizard: (minute: ProjectMeetingMinute) => void;
  onEnterSpecGeneration: (minute: ProjectMeetingMinute) => void;
  onDeleteMinute: (id: string) => void;
  onOpenProgram: (spec: ProgramSpec) => void;
  onNotify?: (msg: string) => void;
}

export const MeetingMinutesPage: React.FC<MeetingMinutesPageProps> = ({
  currentUser,
  accessibleProjects,
  selectedProjectCode,
  onSelectProject,
  allSpecs,
  initialSelectedMinuteId,
  meetingRefreshKey,
  onMinutesChanged,
  onBackToOverview,
  onStartNewMeeting,
  onResumeWizard,
  onEnterSpecGeneration,
  onDeleteMinute,
  onOpenProgram,
  onNotify,
}) => {
  const nonCommonProjects = useMemo(
    () => accessibleProjects.filter((p) => p.code !== COMMON_PROJECT_CODE),
    [accessibleProjects]
  );

  // If user came from COMMON project, default to first non-COMMON project (or TEMP)
  const activeProjectCode = useMemo(() => {
    const clean = (selectedProjectCode || '').toUpperCase();
    if (clean && clean !== COMMON_PROJECT_CODE && nonCommonProjects.some((p) => p.code === clean)) {
      return clean;
    }
    return nonCommonProjects[0]?.code || TEMP_PROJECT_CODE;
  }, [selectedProjectCode, nonCommonProjects]);

  const activeProject = useMemo(
    () => nonCommonProjects.find((p) => p.code === activeProjectCode) || nonCommonProjects[0],
    [nonCommonProjects, activeProjectCode]
  );

  const projectMinutes = useMemo(() => {
    return getVisibleMinutesForProject(activeProjectCode, currentUser.name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProjectCode, currentUser.name, meetingRefreshKey]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | MeetingMinuteStatus>('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedMinuteId || null);

  // Sync external initialSelectedMinuteId when passed
  useEffect(() => {
    if (initialSelectedMinuteId) {
      setSelectedId(initialSelectedMinuteId);
    }
  }, [initialSelectedMinuteId]);

  const filteredMinutes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return projectMinutes.filter((m) => {
      if (statusFilter !== 'ALL' && m.status !== statusFilter) return false;
      if (!q) return true;
      return (
        m.title.toLowerCase().includes(q) ||
        (m.minutes_markdown || '').toLowerCase().includes(q) ||
        (m.author || '').toLowerCase().includes(q) ||
        (m.generated_program_id || '').toLowerCase().includes(q) ||
        (m.suggested_program_id || '').toLowerCase().includes(q)
      );
    });
  }, [projectMinutes, statusFilter, searchQuery]);

  // Keep selectedId valid
  useEffect(() => {
    if (filteredMinutes.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !filteredMinutes.some((m) => m.id === selectedId)) {
      setSelectedId(filteredMinutes[0].id);
    }
  }, [filteredMinutes, selectedId]);

  const selectedMinute = useMemo(
    () => projectMinutes.find((m) => m.id === selectedId) || null,
    [projectMinutes, selectedId]
  );

  // Detail pane local editable state
  const [detailTab, setDetailTab] = useState<'minutes' | 'transcript'>('minutes');
  const [draftTitle, setDraftTitle] = useState('');
  const [draftModule, setDraftModule] = useState<SapModule>('SD');
  const [draftMarkdown, setDraftMarkdown] = useState('');
  const [supplementInput, setSupplementInput] = useState('');
  const [isEnriching, setIsEnriching] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (!selectedMinute) return;
    setDraftTitle(selectedMinute.title || '');
    setDraftModule(selectedMinute.suggested_module || 'SD');
    setDraftMarkdown(selectedMinute.minutes_markdown || '');
    setSupplementInput('');
    setIsDirty(false);
  }, [selectedMinute?.id, selectedMinute?.updated_at]);

  const statusCounts = useMemo(() => {
    const counts: Record<'ALL' | MeetingMinuteStatus, number> = {
      ALL: projectMinutes.length,
      recording: 0,
      minutes_ready: 0,
      recommended: 0,
      spec_generated: 0,
    };
    projectMinutes.forEach((m) => {
      if (counts[m.status] !== undefined) counts[m.status] += 1;
    });
    return counts;
  }, [projectMinutes]);

  const buildUpdatedRecord = (overrides: Partial<ProjectMeetingMinute> = {}): ProjectMeetingMinute | null => {
    if (!selectedMinute) return null;
    return {
      ...selectedMinute,
      title: draftTitle.trim() || selectedMinute.title,
      suggested_module: draftModule,
      minutes_markdown: draftMarkdown,
      status:
        selectedMinute.status === 'recording' && draftMarkdown.trim()
          ? 'minutes_ready'
          : selectedMinute.status,
      updated_at: formatNowDateTime(),
      ...overrides,
    };
  };

  const handleSaveDetail = () => {
    const updated = buildUpdatedRecord();
    if (!updated) return;
    saveMeetingMinute(updated);
    setIsDirty(false);
    onMinutesChanged();
    onNotify?.(`회의록 '${updated.title}' 변경사항이 저장되었습니다.`);
  };

  const handleEnrichWithSupplement = async () => {
    if (!selectedMinute || !supplementInput.trim()) return;
    setIsEnriching(true);
    try {
      const res = await requestAiMeetingMinutes({
        mode: 'enrich',
        rawTranscript: selectedMinute.raw_transcript || '',
        existingMinutes: draftMarkdown,
        supplementalNotes: supplementInput.trim(),
        projectName: activeProject?.name || activeProjectCode,
        targetRelease: activeProject?.target_sap_release || 'SAP S/4HANA 2023',
      });
      setDraftMarkdown(res.minutesMarkdown);
      setDraftModule(res.detectedModule);
      if (res.title && !isDirty) {
        setDraftTitle(res.title);
      }
      const updated = buildUpdatedRecord({
        title: draftTitle.trim() || res.title,
        suggested_module: res.detectedModule,
        minutes_markdown: res.minutesMarkdown,
        status:
          selectedMinute.status === 'recording' ? 'minutes_ready' : selectedMinute.status,
      });
      if (updated) {
        saveMeetingMinute(updated);
        onMinutesChanged();
      }
      setSupplementInput('');
      setIsDirty(false);
      onNotify?.('보충 내용이 AI 회의록 본문에 반영되어 저장되었습니다.');
    } catch (err: any) {
      onNotify?.(err?.message || '보충 내용 반영 중 오류가 발생했습니다.');
    } finally {
      setIsEnriching(false);
    }
  };

  const handleLaunchSpecGeneration = () => {
    const updated = buildUpdatedRecord();
    if (!updated) return;
    if (isDirty) {
      saveMeetingMinute(updated);
      setIsDirty(false);
      onMinutesChanged();
    }
    onEnterSpecGeneration(updated);
  };

  const linkedSpecItem = useMemo(() => {
    if (!selectedMinute?.generated_program_id) return undefined;
    return allSpecs.find(
      (s) => s.program_id.toUpperCase() === selectedMinute.generated_program_id!.toUpperCase()
    );
  }, [allSpecs, selectedMinute?.generated_program_id]);

  return (
    <div className="h-full flex flex-col bg-slate-50 text-slate-900 overflow-hidden">
      {/* Top Page Header */}
      <header className="px-6 py-4 bg-white border-b border-slate-200 shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-blue-400 flex items-center justify-center shrink-0">
              <MessageSquareText className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-mono font-semibold text-blue-700 flex items-center gap-2">
                <span>PROJECT MEETING ARCHIVE</span>
                <span aria-hidden="true">·</span>
                <span>{activeProjectCode}</span>
                {activeProjectCode === TEMP_PROJECT_CODE && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{currentUser.name} 전용</span>
                  </>
                )}
              </div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                프로젝트 회의록 이력 및 상세 관리
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              aria-label="대상 프로젝트 선택"
              value={activeProjectCode}
              onChange={(e) => onSelectProject(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 cursor-pointer"
            >
              {nonCommonProjects.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.code} — {p.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={onStartNewMeeting}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-blue-300" />
              <span>새 회의 녹음 시작</span>
            </button>

            <button
              type="button"
              onClick={onBackToOverview}
              className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>오버뷰로 돌아가기</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main 2-Pane Split Body */}
      <div className="flex-1 overflow-hidden">
        <div className="max-w-7xl mx-auto h-full px-6 py-5 flex flex-col lg:flex-row gap-5 overflow-hidden">
          {/* LEFT PANE: Filterable Meeting History List */}
          <aside className="w-full lg:w-[360px] shrink-0 bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden max-h-[340px] lg:max-h-full">
            <div className="p-4 border-b border-slate-200 space-y-3 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="회의록 제목, 내용, 작성자, Program ID 검색..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white focus:border-blue-500"
                />
              </div>

              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    { key: 'ALL', label: '전체' },
                    { key: 'recording', label: '작성중' },
                    { key: 'minutes_ready', label: '회의록' },
                    { key: 'recommended', label: '유형추천' },
                    { key: 'spec_generated', label: '스펙완료' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setStatusFilter(tab.key)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                      statusFilter === tab.key
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tab.label} ({statusCounts[tab.key]})
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {filteredMinutes.length === 0 ? (
                <div className="p-8 text-center space-y-3">
                  <p className="text-xs text-slate-500">
                    {projectMinutes.length === 0
                      ? `'${activeProject?.name || activeProjectCode}' 프로젝트에 저장된 회의록이 없습니다.`
                      : '검색 또는 상태 조건에 맞는 회의록이 없습니다.'}
                  </p>
                  <button
                    type="button"
                    onClick={onStartNewMeeting}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span>새 회의 녹음 시작</span>
                  </button>
                </div>
              ) : (
                filteredMinutes.map((item) => {
                  const isSelected = selectedMinute?.id === item.id;
                  const meta = STATUS_META[item.status] || STATUS_META.minutes_ready;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      className={`w-full text-left px-4 py-3.5 transition-colors cursor-pointer border-l-4 ${
                        isSelected
                          ? 'bg-blue-50/70 border-l-blue-600'
                          : 'bg-white hover:bg-slate-50 border-l-transparent'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-bold text-slate-900 line-clamp-2">
                          {item.title}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px]">
                        <span className={`inline-flex items-center gap-1 font-semibold ${meta.textColor}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${meta.dotColor}`} />
                          {meta.label}
                        </span>
                        {item.suggested_module && (
                          <span className="font-mono font-bold text-slate-700">
                            · {item.suggested_module}
                          </span>
                        )}
                        {item.generated_program_id && (
                          <span className="font-mono font-semibold text-blue-700">
                            · {item.generated_program_id}
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-1 font-mono tabular-nums">
                        <span className="font-sans">{item.author}</span>
                        <span aria-hidden="true">·</span>
                        <span>{item.updated_at}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          {/* RIGHT PANE: Meeting Minute Detail Page */}
          <section className="flex-1 bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden min-w-0">
            {!selectedMinute ? (
              <div className="flex-1 flex flex-col items-center justify-center p-10 text-center space-y-3">
                <MessageSquareText className="w-10 h-10 text-slate-300" />
                <div className="text-sm font-bold text-slate-700">
                  상세 내용을 확인할 회의록을 선택해 주세요
                </div>
                <p className="text-xs text-slate-500 max-w-md">
                  좌측 이력에서 회의록을 선택하면 내용을 검토·보충하고 바로{' '}
                  <strong>프로그램 스펙 생성</strong> 모드로 진입할 수 있습니다.
                </p>
              </div>
            ) : (
              <>
                {/* Detail Header with Primary '프로그램 스펙 생성' Button */}
                <div className="px-6 py-4 border-b border-slate-200 bg-white shrink-0 space-y-3">
                  <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                        <span className="font-mono font-bold text-blue-700">
                          {selectedMinute.project_code}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={`font-semibold ${
                            (STATUS_META[selectedMinute.status] || STATUS_META.minutes_ready).textColor
                          }`}
                        >
                          {(STATUS_META[selectedMinute.status] || STATUS_META.minutes_ready).label}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>작성자: {selectedMinute.author}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          수정 {selectedMinute.updated_at}
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <input
                          type="text"
                          value={draftTitle}
                          onChange={(e) => {
                            setDraftTitle(e.target.value);
                            setIsDirty(true);
                          }}
                          aria-label="회의록 제목"
                          className="flex-1 px-3 py-1.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-500 rounded-lg text-base font-bold text-slate-900"
                        />
                        <select
                          aria-label="SAP 모듈"
                          value={draftModule}
                          onChange={(e) => {
                            setDraftModule(e.target.value as SapModule);
                            setIsDirty(true);
                          }}
                          className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-800 cursor-pointer"
                        >
                          {(['SD', 'MM', 'FI', 'CO', 'PP', 'HR', 'QM', 'PM', 'BC'] as SapModule[]).map(
                            (m) => (
                              <option key={m} value={m}>
                                {m}
                              </option>
                            )
                          )}
                        </select>
                      </div>
                    </div>

                    {/* Action Buttons inside Meeting Detail Page */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={handleLaunchSpecGeneration}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>프로그램 스펙 생성</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onResumeWizard(selectedMinute)}
                        className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Mic className="w-3.5 h-3.5 text-blue-300" />
                        <span>녹음·단계 마법사 열기</span>
                      </button>

                      <button
                        type="button"
                        disabled={!isDirty}
                        onClick={handleSaveDetail}
                        className="px-3 py-2 bg-white hover:bg-slate-100 disabled:opacity-45 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>저장</span>
                      </button>

                      {selectedMinute.author === currentUser.name && (
                        <button
                          type="button"
                          onClick={() => onDeleteMinute(selectedMinute.id)}
                          className="p-2 text-rose-600 hover:bg-rose-50 border border-slate-200 rounded-lg cursor-pointer"
                          title="회의록 삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Recommendation / Linked Program Banner */}
                  {(selectedMinute.recommended_sample_type || selectedMinute.generated_program_id) && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 font-semibold text-slate-800">
                          <Layers className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          {selectedMinute.recommended_sample_type && (
                            <span>
                              추천 COMMON 유형:{' '}
                              <strong className="font-mono text-blue-700">
                                {SAMPLE_TYPE_NAMES[selectedMinute.recommended_sample_type] ||
                                  selectedMinute.recommended_sample_type}
                              </strong>
                            </span>
                          )}
                          {selectedMinute.suggested_program_id && (
                            <span className="font-mono text-slate-600">
                              · 제안 ID: {selectedMinute.suggested_program_id} (
                              {selectedMinute.suggested_tcode || '-'})
                            </span>
                          )}
                        </div>
                        {selectedMinute.recommendation_reason && (
                          <p className="text-[11px] text-slate-600 line-clamp-2">
                            {selectedMinute.recommendation_reason}
                          </p>
                        )}
                      </div>

                      {linkedSpecItem && (
                        <button
                          type="button"
                          onClick={() => onOpenProgram(linkedSpecItem.spec)}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-md text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <FileCode className="w-3.5 h-3.5" />
                          <span className="font-mono">{linkedSpecItem.program_id} 열기</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Detail Sub-tabs */}
                <div className="px-6 border-b border-slate-200 bg-slate-50/70 flex items-center gap-4 shrink-0">
                  <button
                    type="button"
                    onClick={() => setDetailTab('minutes')}
                    className={`py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                      detailTab === 'minutes'
                        ? 'border-blue-600 text-blue-700'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    회의록 본문 검토 · 보충 편집
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetailTab('transcript')}
                    className={`py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                      detailTab === 'transcript'
                        ? 'border-blue-600 text-blue-700'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    원본 녹음 · 메모 기록 ({selectedMinute.segments?.length || 0}건)
                  </button>
                </div>

                {/* Scrollable Detail Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                  {detailTab === 'minutes' ? (
                    <>
                      <MarkdownFieldEditor
                        value={draftMarkdown}
                        onChange={(val) => {
                          setDraftMarkdown(val);
                          setIsDirty(true);
                        }}
                        rows={11}
                        minHeight="260px"
                        placeholder="회의록 본문이 비어 있습니다. 내용을 입력하거나 녹음 마법사에서 AI 회의록을 생성하세요..."
                      />

                      {/* Quick AI Supplement Box right inside Detail Page */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
                        <div className="text-xs font-bold text-slate-800">
                          추가 논의 사항 보충 후 AI 회의록 업데이트
                        </div>
                        <textarea
                          rows={2}
                          value={supplementInput}
                          onChange={(e) => setSupplementInput(e.target.value)}
                          placeholder="회의 후 추가된 요구사항이나 변경된 조회 조건을 입력하면 기존 회의록에 자동 반영합니다..."
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:border-blue-500"
                        />
                        <div className="flex items-center justify-end">
                          <button
                            type="button"
                            disabled={!supplementInput.trim() || isEnriching}
                            onClick={handleEnrichWithSupplement}
                            className="px-3.5 py-1.5 bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                          >
                            {isEnriching ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Sparkles className="w-3.5 h-3.5" />
                            )}
                            <span>보충 내용 AI 반영 및 저장</span>
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-3">
                      {!selectedMinute.segments || selectedMinute.segments.length === 0 ? (
                        <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-xl">
                          기록된 음성/메모 세그먼트가 없습니다.
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl">
                          {selectedMinute.segments.map((seg) => (
                            <div key={seg.id} className="p-4 space-y-1">
                              <div className="text-[11px] font-mono text-slate-500 flex items-center gap-2">
                                <span>{seg.timestamp}</span>
                                <span aria-hidden="true">·</span>
                                <span className="font-sans font-semibold text-slate-700">
                                  {seg.speaker || '참석자'}
                                </span>
                                <span aria-hidden="true">·</span>
                                <span>
                                  {seg.kind === 'voice'
                                    ? '음성 녹음'
                                    : seg.kind === 'supplement'
                                    ? '추가 보충'
                                    : '직접 메모'}
                                </span>
                              </div>
                              <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                                {seg.text}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Sticky Detail Bottom Footer */}
                <footer className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-[11px] text-slate-500">
                    {isDirty
                      ? '저장되지 않은 변경사항이 있습니다. 스펙 생성 시 자동 저장됩니다.'
                      : '이 회의록을 기반으로 COMMON 샘플 유형을 매칭해 프로그램 스펙을 생성할 수 있습니다.'}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={!isDirty}
                      onClick={handleSaveDetail}
                      className="px-3.5 py-2 bg-white hover:bg-slate-100 disabled:opacity-45 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>변경사항 저장</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleLaunchSpecGeneration}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>프로그램 스펙 생성</span>
                    </button>
                  </div>
                </footer>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
