import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Copy,
  FileCode,
  FolderKanban,
  Lock,
  Mic,
  Plus,
  Search,
  Settings,
  Star,
  Trash2,
} from 'lucide-react';
import { ProgramSpec, ProjectMeetingMinute, SapModule, SapProject } from '../types/sap';
import { CurrentUser } from '../utils/authStorage';
import {
  COMMON_PROJECT_CODE,
  TEMP_PROJECT_CODE,
  isCommonProtectedSample,
  isSpecVisibleInProject,
} from '../utils/projectStorage';
import { SavedProgramSpecItem, deleteSpecFromStorage } from '../utils/specStorage';

const SAP_MODULES: { code: SapModule; label: string }[] = [
  { code: 'SD', label: '영업·출하' },
  { code: 'MM', label: '구매·자재' },
  { code: 'FI', label: '재무회계' },
  { code: 'CO', label: '관리회계' },
  { code: 'PP', label: '생산관리' },
  { code: 'HR', label: '인사관리' },
  { code: 'QM', label: '품질관리' },
  { code: 'PM', label: '설비보전' },
  { code: 'BC', label: 'Basis·시스템' },
  { code: 'CM', label: '공통 영역' },
];

interface ProjectOverviewDashboardProps {
  viewMode: 'overview' | 'program_list';
  currentUser: CurrentUser;
  accessibleProjects: SapProject[];
  selectedProjectCode: string;
  onSelectProject: (code: string) => void;
  allSpecs: SavedProgramSpecItem[];
  favoriteProgramIds: string[];
  onToggleFavorite: (programId: string) => void;
  onSpecsChanged: (deletedProgramId?: string) => void;
  onChangeViewMode: (mode: 'overview' | 'program_list') => void;
  onOpenProgram: (spec: ProgramSpec) => void;
  onCreateNewProgram: (projectCode: string) => void;
  onOpenProjectManager: () => void;
  onRequestCopySpec: (spec: ProgramSpec) => void;
  onOpenMeetingWizard: (minute?: ProjectMeetingMinute) => void;
  onNotify?: (message: string) => void;
}

export const ProjectOverviewDashboard: React.FC<ProjectOverviewDashboardProps> = ({
  viewMode,
  currentUser,
  accessibleProjects,
  selectedProjectCode,
  onSelectProject,
  allSpecs,
  favoriteProgramIds,
  onToggleFavorite,
  onSpecsChanged,
  onChangeViewMode,
  onOpenProgram,
  onCreateNewProgram,
  onOpenProjectManager,
  onRequestCopySpec,
  onOpenMeetingWizard,
  onNotify,
}) => {
  const [selectedModuleFilter, setSelectedModuleFilter] = useState<'ALL' | SapModule>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sampleTypeFilter, setSampleTypeFilter] = useState<string>('ALL');
  const [favoritesOnlyFilter, setFavoritesOnlyFilter] = useState(false);
  const [favoriteOverviewScope, setFavoriteOverviewScope] = useState<'ALL' | 'PROJECT'>('ALL');

  const activeProject = useMemo(
    () =>
      accessibleProjects.find((p) => p.code === selectedProjectCode) ||
      accessibleProjects[0],
    [accessibleProjects, selectedProjectCode]
  );

  // Programs visible in the currently selected project
  const projectSpecs = useMemo(() => {
    if (!activeProject) return [];
    return allSpecs.filter((item) =>
      isSpecVisibleInProject(item, activeProject.code, currentUser.name)
    );
  }, [allSpecs, activeProject, currentUser.name]);

  // Program counts for each accessible project (for project switcher cards)
  const projectCountsMap = useMemo(() => {
    const map: Record<string, number> = {};
    accessibleProjects.forEach((p) => {
      map[p.code] = allSpecs.filter((item) =>
        isSpecVisibleInProject(item, p.code, currentUser.name)
      ).length;
    });
    return map;
  }, [accessibleProjects, allSpecs, currentUser.name]);

  // Module breakdown counts for active project
  const moduleCounts = useMemo(() => {
    const counts: Record<SapModule, number> = {
      SD: 0,
      MM: 0,
      FI: 0,
      CO: 0,
      PP: 0,
      HR: 0,
      QM: 0,
      PM: 0,
      BC: 0,
      CM: 0,
    };
    projectSpecs.forEach((item) => {
      if (counts[item.module] !== undefined) {
        counts[item.module] += 1;
      }
    });
    return counts;
  }, [projectSpecs]);

  // Only modules that actually have at least one specification in the active project
  const modulesWithSpecs = useMemo(() => {
    return SAP_MODULES.filter((mod) => (moduleCounts[mod.code] || 0) > 0);
  }, [moduleCounts]);

  const favoriteIdSet = useMemo(
    () => new Set(favoriteProgramIds.map((id) => id.toUpperCase())),
    [favoriteProgramIds]
  );

  // All accessible starred specs ordered by user's favorite order
  const accessibleFavoriteSpecs = useMemo(() => {
    const byId = new Map<string, SavedProgramSpecItem>();
    allSpecs.forEach((item) => {
      const upperId = item.program_id.toUpperCase();
      if (!favoriteIdSet.has(upperId)) return;
      const isVisible = accessibleProjects.some((p) =>
        isSpecVisibleInProject(item, p.code, currentUser.name)
      );
      if (isVisible) {
        byId.set(upperId, item);
      }
    });
    return favoriteProgramIds
      .map((id) => byId.get(id.toUpperCase()))
      .filter((item): item is SavedProgramSpecItem => Boolean(item));
  }, [allSpecs, favoriteProgramIds, favoriteIdSet, accessibleProjects, currentUser.name]);

  const displayedFavoriteSpecs = useMemo(() => {
    if (favoriteOverviewScope === 'PROJECT' && activeProject) {
      return accessibleFavoriteSpecs.filter((item) =>
        isSpecVisibleInProject(item, activeProject.code, currentUser.name)
      );
    }
    return accessibleFavoriteSpecs;
  }, [accessibleFavoriteSpecs, favoriteOverviewScope, activeProject, currentUser.name]);

  // Filtered specs for Program List view
  const filteredListSpecs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return projectSpecs.filter((item) => {
      if (favoritesOnlyFilter && !favoriteIdSet.has(item.program_id.toUpperCase())) {
        return false;
      }
      if (selectedModuleFilter !== 'ALL' && item.module !== selectedModuleFilter) {
        return false;
      }
      if (sampleTypeFilter !== 'ALL' && (item.sample_type || '01') !== sampleTypeFilter) {
        return false;
      }
      if (!q) return true;
      return (
        item.program_id.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.tcode.toLowerCase().includes(q) ||
        item.author.toLowerCase().includes(q) ||
        item.module.toLowerCase().includes(q)
      );
    });
  }, [
    projectSpecs,
    favoritesOnlyFilter,
    favoriteIdSet,
    selectedModuleFilter,
    sampleTypeFilter,
    searchQuery,
  ]);

  const handleOpenModuleList = (mod: 'ALL' | SapModule) => {
    setSelectedModuleFilter(mod);
    onChangeViewMode('program_list');
  };

  const handleDeleteItem = (item: SavedProgramSpecItem) => {
    if (isCommonProtectedSample(item.spec)) {
      onNotify?.('COMMON 공통 샘플 원본은 삭제할 수 없습니다.');
      return;
    }
    const res = deleteSpecFromStorage(item.program_id, currentUser.name);
    if (!res.success) {
      onNotify?.(res.message || '삭제할 수 없습니다.');
      return;
    }
    onSpecsChanged(item.program_id);
    onNotify?.(`프로그램 '${item.program_id}' 사양서가 삭제되었습니다.`);
  };

  if (!activeProject) return null;

  const isTempProject = activeProject.code === TEMP_PROJECT_CODE;
  const isCommonProject = activeProject.code === COMMON_PROJECT_CODE;

  const visibilitySummary = isCommonProject
    ? '전사 공통 영역 · 모든 사용자 조회 가능 (원본 보호)'
    : isTempProject
    ? `개인 전용 임시 공간 · '${currentUser.name}' 본인 작성 프로그램만 표시`
    : `프로젝트 공유 영역 · 참여 멤버 ${activeProject.members.length}명 (${activeProject.members.join(' · ')})`;

  const newTargetProject = isCommonProject ? TEMP_PROJECT_CODE : activeProject.code;

  return (
    <div className="h-full overflow-y-auto bg-slate-50 text-slate-900">
      <div className="max-w-7xl mx-auto px-6 py-7 space-y-6">
        {/* Top Project Switcher & Primary Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="text-xs font-medium text-slate-500 flex items-center gap-2">
              <span>{currentUser.name}</span>
              <span aria-hidden="true">·</span>
              <span>{currentUser.department}</span>
              <span aria-hidden="true">·</span>
              <span>접근 가능 프로젝트 {accessibleProjects.length}개</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
              {viewMode === 'overview'
                ? '프로젝트 사양서 오버뷰'
                : `${activeProject.name} — 프로그램 목록`}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {viewMode === 'program_list' && (
              <button
                type="button"
                onClick={() => onChangeViewMode('overview')}
                className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>오버뷰로 돌아가기</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onOpenMeetingWizard()}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Mic className="w-3.5 h-3.5 text-blue-300" />
              <span>회의록 AI 설계</span>
            </button>

            <button
              type="button"
              onClick={() => onCreateNewProgram(newTargetProject)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>새 프로그램 작성</span>
            </button>
          </div>
        </div>

        {/* Interactive Project Selector Tabs */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-600">
            내가 속한 프로젝트 선택
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {accessibleProjects.map((proj) => {
              const isSelected = proj.code === activeProject.code;
              const count = projectCountsMap[proj.code] ?? 0;
              return (
                <button
                  key={proj.code}
                  type="button"
                  onClick={() => {
                    onSelectProject(proj.code);
                    setSelectedModuleFilter('ALL');
                  }}
                  className={`px-4 py-2.5 rounded-lg border text-left transition-all cursor-pointer flex items-center gap-3 ${
                    isSelected
                      ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <FolderKanban
                        className={`w-3.5 h-3.5 ${isSelected ? 'text-blue-300' : 'text-blue-600'}`}
                      />
                      <span className="font-mono text-xs font-bold">{proj.code}</span>
                    </div>
                    <div
                      className={`text-xs mt-0.5 font-medium ${
                        isSelected ? 'text-slate-200' : 'text-slate-600'
                      }`}
                    >
                      {proj.name}
                    </div>
                  </div>
                  <div
                    className={`font-mono tabular-nums text-sm font-bold pl-3 border-l ${
                      isSelected
                        ? 'border-slate-700 text-blue-300'
                        : 'border-slate-200 text-slate-900'
                    }`}
                  >
                    {count}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* VIEW 1: PROJECT OVERVIEW DASHBOARD                                        */}
        {/* ========================================================================= */}
        {viewMode === 'overview' && (
          <div className="space-y-6">
            {/* Primary Anchor Card: Active Project Summary & Total Program Count */}
            <section className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <div className="text-xs font-mono font-semibold text-blue-700">
                  {activeProject.code} · {activeProject.target_sap_release}
                </div>
                <h2 className="text-xl font-bold text-slate-900">{activeProject.name}</h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {activeProject.description || '프로젝트에 속한 ABAP 기능사양서와 ALV 시뮬레이션을 모듈별로 통합 관리합니다.'}
                </p>
                <div className="pt-1 text-xs text-slate-500">
                  {visibilitySummary}
                </div>
              </div>

              <div className="flex items-center shrink-0 border-t md:border-t-0 md:border-l border-slate-200 pt-4 md:pt-0 md:pl-8">
                <button
                  type="button"
                  onClick={() => handleOpenModuleList('ALL')}
                  title="클릭하여 프로그램 리스트로 이동"
                  aria-label={`${activeProject.name} 프로그램 리스트 보기 (${projectSpecs.length}본)`}
                  className="group flex items-baseline gap-1.5 px-3 py-2 -mx-3 -my-2 rounded-xl hover:bg-blue-50/80 transition-colors cursor-pointer"
                >
                  <span className="text-4xl font-bold font-mono tabular-nums text-slate-900 group-hover:text-blue-700 underline decoration-slate-300 group-hover:decoration-blue-600 underline-offset-4 transition-colors">
                    {projectSpecs.length}
                  </span>
                  <span className="text-sm font-medium text-slate-500 group-hover:text-blue-700">
                    본
                  </span>
                </button>
              </div>
            </section>

            {/* Starred / Favorite Specifications Quick Access */}
            <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                    <span>즐겨찾기 사양서</span>
                    <span className="font-mono text-xs font-semibold text-amber-700">
                      ({displayedFavoriteSpecs.length})
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    자주 참조·편집하는 사양서를 즐겨찾기(★)로 등록해 어느 프로젝트에서든 바로 열 수 있습니다.
                  </p>
                </div>

                {accessibleFavoriteSpecs.length > 0 && (
                  <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs self-start sm:self-auto shrink-0">
                    <button
                      type="button"
                      onClick={() => setFavoriteOverviewScope('ALL')}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                        favoriteOverviewScope === 'ALL'
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      전체 프로젝트 ({accessibleFavoriteSpecs.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFavoriteOverviewScope('PROJECT')}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                        favoriteOverviewScope === 'PROJECT'
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {activeProject.code}만
                    </button>
                  </div>
                )}
              </div>

              {displayedFavoriteSpecs.length === 0 ? (
                <div className="px-5 py-6 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-center gap-2">
                  <span>
                    {accessibleFavoriteSpecs.length === 0
                      ? '아직 즐겨찾기한 사양서가 없습니다. 프로그램 리스트 또는 상단 바의 별표(★) 아이콘을 눌러 등록해 보세요.'
                      : `'${activeProject.code}' 프로젝트에 속한 즐겨찾기 사양서가 없습니다. '전체 프로젝트' 탭에서 다른 프로젝트 즐겨찾기를 확인할 수 있습니다.`}
                  </span>
                </div>
              ) : (
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {displayedFavoriteSpecs.map((item) => {
                    const isProtected = isCommonProtectedSample(item.spec);
                    return (
                      <div
                        key={`fav-${item.program_id}`}
                        className="p-3.5 bg-slate-50/70 hover:bg-blue-50/40 border border-slate-200 hover:border-blue-300 rounded-xl transition-all flex flex-col justify-between gap-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => onOpenProgram(item.spec)}
                            className="text-left min-w-0 group cursor-pointer"
                          >
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <FileCode className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span className="font-mono text-xs font-bold text-blue-700 group-hover:text-blue-900 group-hover:underline">
                                {item.program_id}
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono text-[10px] font-semibold text-slate-700">
                                {item.project_code}
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-slate-200/70 font-mono text-[10px] font-bold text-slate-700">
                                {item.module}
                              </span>
                            </div>
                            <div className="text-xs font-semibold text-slate-900 mt-1.5 line-clamp-1">
                              {item.title}
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => onToggleFavorite(item.program_id)}
                            title="즐겨찾기 해제"
                            aria-label={`${item.program_id} 즐겨찾기 해제`}
                            className="p-1 rounded-md hover:bg-amber-50 transition-colors cursor-pointer shrink-0"
                          >
                            <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/80 text-[11px] text-slate-500">
                          <span className="font-mono truncate">
                            {item.tcode} · Type {item.sample_type || '01'}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {isProtected && (
                              <button
                                type="button"
                                onClick={() => onRequestCopySpec(item.spec)}
                                className="px-2 py-1 text-[11px] font-semibold text-blue-700 bg-white hover:bg-blue-50 border border-blue-200 rounded cursor-pointer"
                                title="프로젝트로 복사"
                              >
                                복사
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => onOpenProgram(item.spec)}
                              className="px-2.5 py-1 text-[11px] font-semibold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 rounded cursor-pointer"
                            >
                              바로 열기
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Module Breakdown Section (Only shows modules with >= 1 spec) */}
            <section className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    모듈별 사양서 현황
                    {modulesWithSpecs.length > 0 && (
                      <span className="ml-1.5 font-mono text-xs font-semibold text-blue-700">
                        ({modulesWithSpecs.length}개 모듈)
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500">
                    사양서가 등록된 모듈만 표시됩니다. 모듈을 클릭하면 해당 모듈의 프로그램 리스트로 이동합니다.
                  </p>
                </div>
                {!isCommonProject && !isTempProject && (
                  <button
                    type="button"
                    onClick={onOpenProjectManager}
                    className="text-xs font-semibold text-slate-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer self-start sm:self-auto"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>프로젝트 모듈 설정</span>
                  </button>
                )}
              </div>

              {modulesWithSpecs.length === 0 ? (
                <div className="p-6 bg-white border border-slate-200 rounded-xl text-center space-y-2.5">
                  <p className="text-xs text-slate-500">
                    현재 프로젝트에 등록된 사양서가 없어 표시할 모듈이 없습니다.
                  </p>
                  {!isCommonProject && (
                    <button
                      type="button"
                      onClick={() => onCreateNewProgram(newTargetProject)}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>새 프로그램 작성</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {modulesWithSpecs.map((mod) => {
                    const count = moduleCounts[mod.code] || 0;
                    return (
                      <button
                        key={mod.code}
                        type="button"
                        onClick={() => handleOpenModuleList(mod.code)}
                        className="p-4 bg-white border border-slate-200 hover:border-blue-400 rounded-xl text-left transition-all cursor-pointer group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-sm font-bold text-slate-900 group-hover:text-blue-700">
                            {mod.code}
                          </span>
                          <span className="font-mono tabular-nums text-lg font-bold text-blue-600">
                            {count}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">{mod.label}</div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: PROJECT PROGRAM LIST                                              */}
        {/* ========================================================================= */}
        {viewMode === 'program_list' && (
          <div className="space-y-4">
            {isCommonProject && (
              <div className="p-3.5 bg-white border border-blue-200 rounded-xl text-xs text-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>
                    <strong>COMMON 공통 샘플 원본 보호:</strong>{' '}
                    ZRALV0010~ZRALV0040 샘플은 전사 공통 기준이므로 원본은 보호됩니다. 실제 개발 시 각 행의 <strong>복사</strong> 버튼으로 내 프로젝트 또는 TEMP에 복제하여 작성하세요.
                  </span>
                </div>
              </div>
            )}

            {/* Module Filter & Search Bar */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedModuleFilter('ALL')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                    selectedModuleFilter === 'ALL'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  ALL ({projectSpecs.length})
                </button>
                {modulesWithSpecs.map((mod) => {
                  const cnt = moduleCounts[mod.code] || 0;
                  return (
                    <button
                      key={mod.code}
                      type="button"
                      onClick={() => setSelectedModuleFilter(mod.code)}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold font-mono transition-colors cursor-pointer ${
                        selectedModuleFilter === mod.code
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {mod.code} ({cnt})
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Program ID, 제목, T-Code, 작성자 검색..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFavoritesOnlyFilter((prev) => !prev)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-colors cursor-pointer ${
                      favoritesOnlyFilter
                        ? 'bg-amber-50 border-amber-300 text-amber-900'
                        : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Star
                      className={`w-3.5 h-3.5 ${
                        favoritesOnlyFilter
                          ? 'fill-amber-400 text-amber-500'
                          : 'text-slate-400'
                      }`}
                    />
                    <span>즐겨찾기만</span>
                  </button>

                  <select
                    value={sampleTypeFilter}
                    onChange={(e) => setSampleTypeFilter(e.target.value)}
                    aria-label="Sample Type Filter"
                    className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 cursor-pointer"
                  >
                    <option value="ALL">모든 ALV 유형</option>
                    <option value="01">01 (Single ALV Grid)</option>
                    <option value="02">02 (Master-Detail ALV)</option>
                    <option value="03">03 (Tree ALV Grid)</option>
                    <option value="04">04 (Pivot Browser)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Program Table */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[920px]">
                  <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                    <tr>
                      <th className="px-4 py-3">Program ID</th>
                      <th className="px-4 py-3">Project</th>
                      <th className="px-4 py-3">Module</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">T-Code</th>
                      <th className="px-4 py-3">Title</th>
                      <th className="px-4 py-3">Author</th>
                      <th className="px-4 py-3">Version</th>
                      <th className="px-4 py-3">Updated</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredListSpecs.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-6 py-12 text-center text-slate-500">
                          조건에 일치하는 프로그램 사양서가 없습니다.
                        </td>
                      </tr>
                    ) : (
                      filteredListSpecs.map((item) => {
                        const isProtected = isCommonProtectedSample(item.spec);
                        const isFav = favoriteIdSet.has(item.program_id.toUpperCase());
                        const canDelete = !isProtected && !item.is_system && item.author === currentUser.name;
                        const latestVer =
                          item.change_history && item.change_history.length > 0
                            ? item.change_history[item.change_history.length - 1].version
                            : 'v1.0';

                        return (
                          <tr
                            key={item.program_id}
                            className="hover:bg-blue-50/50 transition-colors"
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => onToggleFavorite(item.program_id)}
                                  title={isFav ? '즐겨찾기 해제' : '즐겨찾기에 추가'}
                                  aria-label={`${item.program_id} ${isFav ? '즐겨찾기 해제' : '즐겨찾기에 추가'}`}
                                  className="p-0.5 rounded hover:bg-amber-50 transition-colors cursor-pointer shrink-0"
                                >
                                  <Star
                                    className={`w-3.5 h-3.5 ${
                                      isFav
                                        ? 'fill-amber-400 text-amber-500'
                                        : 'text-slate-300 hover:text-amber-400'
                                    }`}
                                  />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onOpenProgram(item.spec)}
                                  className="font-mono font-bold text-blue-700 hover:text-blue-900 underline decoration-blue-300 hover:decoration-blue-700 flex items-center gap-1.5 cursor-pointer"
                                >
                                  <FileCode className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                  <span>{item.program_id}</span>
                                </button>
                              </div>
                            </td>
                            <td className="px-4 py-3 font-mono font-semibold text-slate-700">
                              {item.project_code}
                            </td>
                            <td className="px-4 py-3 font-mono font-semibold text-slate-800">
                              {item.module}
                            </td>
                            <td className="px-4 py-3 font-mono text-slate-600">
                              {item.sample_type || '01'}
                            </td>
                            <td className="px-4 py-3 font-mono text-slate-700">
                              {item.tcode}
                            </td>
                            <td className="px-4 py-3 font-medium text-slate-900 max-w-xs truncate">
                              {item.title}
                            </td>
                            <td className="px-4 py-3 text-slate-700">{item.author}</td>
                            <td className="px-4 py-3 font-mono text-blue-700 font-semibold">
                              {latestVer}
                            </td>
                            <td className="px-4 py-3 font-mono tabular-nums text-slate-500">
                              {item.updated_at}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => onRequestCopySpec(item.spec)}
                                  className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded flex items-center gap-1 cursor-pointer"
                                  title="다른 프로젝트로 복사"
                                >
                                  <Copy className="w-3 h-3" />
                                  <span>복사</span>
                                </button>
                                {canDelete && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteItem(item)}
                                    className="p-1.5 text-rose-600 hover:bg-rose-50 border border-slate-200 rounded cursor-pointer"
                                    title="사양서 삭제"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
