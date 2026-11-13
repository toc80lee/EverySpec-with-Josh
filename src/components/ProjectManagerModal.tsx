import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  FolderKanban,
  Plus,
  Save,
  Trash2,
  Lock,
  Users,
  Check,
  AlertCircle,
} from 'lucide-react';
import { SapModule, SapProject } from '../types/sap';
import {
  COMMON_PROJECT_CODE,
  TEMP_PROJECT_CODE,
  getProjects,
  saveProject,
  deleteProject,
} from '../utils/projectStorage';
import { reassignSpecsProjectToTemp } from '../utils/specStorage';
import { PRESET_USERS, getCurrentUser } from '../utils/authStorage';

interface ProjectManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectsChanged: (selectedCode?: string) => void;
  initialProjectCode?: string;
}

const ALL_MODULES: SapModule[] = ['SD', 'MM', 'FI', 'CO', 'PP', 'HR', 'QM', 'PM', 'BC'];

export const ProjectManagerModal: React.FC<ProjectManagerModalProps> = ({
  isOpen,
  onClose,
  onProjectsChanged,
  initialProjectCode,
}) => {
  const currentUser = getCurrentUser();
  const [projects, setProjects] = useState<SapProject[]>([]);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formRelease, setFormRelease] = useState('SAP S/4HANA 2023');
  const [formOwner, setFormOwner] = useState(currentUser.name);
  const [formMembers, setFormMembers] = useState<string[]>([currentUser.name]);
  const [formModules, setFormModules] = useState<SapModule[]>(['SD', 'MM', 'FI', 'CO']);
  const [customMemberInput, setCustomMemberInput] = useState('');
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadIntoForm = (proj: SapProject) => {
    setIsCreatingNew(false);
    setEditingCode(proj.code);
    setFormCode(proj.code);
    setFormName(proj.name);
    setFormDesc(proj.description);
    setFormRelease(proj.target_sap_release);
    setFormOwner(proj.owner);
    setFormMembers(proj.members || []);
    setFormModules(proj.modules || ALL_MODULES);
    setNotice(null);
  };

  useEffect(() => {
    if (!isOpen) return;
    const list = getProjects();
    setProjects(list);
    const target =
      (initialProjectCode && list.find((p) => p.code === initialProjectCode)) ||
      list.find((p) => !p.is_system) ||
      list[0];
    if (target) {
      loadIntoForm(target);
    }
  }, [isOpen, initialProjectCode]);

  if (!isOpen) return null;

  const isSystemProject =
    !isCreatingNew && (editingCode === COMMON_PROJECT_CODE || editingCode === TEMP_PROJECT_CODE);

  const startNewProject = () => {
    setIsCreatingNew(true);
    setEditingCode(null);
    setFormCode('');
    setFormName('');
    setFormDesc('');
    setFormRelease('SAP S/4HANA 2023');
    setFormOwner(currentUser.name);
    setFormMembers([currentUser.name]);
    setFormModules(['SD', 'MM', 'FI', 'CO']);
    setNotice(null);
  };

  const toggleMember = (name: string) => {
    if (isSystemProject) return;
    setFormMembers((prev) =>
      prev.includes(name) ? prev.filter((m) => m !== name) : [...prev, name]
    );
  };

  const handleAddCustomMember = () => {
    const clean = customMemberInput.trim();
    if (!clean || isSystemProject) return;
    if (!formMembers.includes(clean)) {
      setFormMembers((prev) => [...prev, clean]);
    }
    setCustomMemberInput('');
  };

  const toggleModule = (mod: SapModule) => {
    if (isSystemProject) return;
    setFormModules((prev) =>
      prev.includes(mod) ? prev.filter((m) => m !== mod) : [...prev, mod]
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSystemProject) return;

    const cleanCode = formCode.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '_');
    if (cleanCode === COMMON_PROJECT_CODE || cleanCode === TEMP_PROJECT_CODE) {
      setNotice({ type: 'error', text: 'COMMON 및 TEMP 코드는 시스템 예약 프로젝트입니다.' });
      return;
    }

    const res = saveProject({
      code: cleanCode,
      name: formName,
      description: formDesc,
      visibility: 'project',
      target_sap_release: formRelease,
      owner: formOwner,
      members: formMembers,
      modules: formModules,
      is_system: false,
      created_date: new Date().toISOString().split('T')[0],
    });

    if (!res.success || !res.savedProject) {
      setNotice({ type: 'error', text: res.message || '저장에 실패했습니다.' });
      return;
    }

    setProjects(res.list);
    loadIntoForm(res.savedProject);
    setNotice({
      type: 'success',
      text: `프로젝트 [${res.savedProject.code}] 설정이 저장되었습니다.`,
    });
    onProjectsChanged(res.savedProject.code);
  };

  const handleDelete = () => {
    if (!editingCode || isSystemProject) return;
    const res = deleteProject(editingCode);
    if (!res.success) {
      setNotice({ type: 'error', text: res.message || '삭제에 실패했습니다.' });
      return;
    }
    reassignSpecsProjectToTemp(editingCode);
    setProjects(res.list);
    const fallback = res.list.find((p) => !p.is_system) || res.list[0];
    if (fallback) loadIntoForm(fallback);
    setNotice({
      type: 'success',
      text: `프로젝트 [${editingCode}]가 삭제되었으며 소속 프로그램은 TEMP로 이동되었습니다.`,
    });
    onProjectsChanged(fallback?.code);
  };

  const allKnownUsers = Array.from(
    new Set([...PRESET_USERS.map((u) => u.name), ...formMembers, currentUser.name])
  );

  return (
    <div className="h-full overflow-y-auto bg-slate-50 text-slate-900">
      <div className="max-w-7xl mx-auto px-6 py-7 space-y-6">
        {/* Top Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-blue-400 flex items-center justify-center shrink-0">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                프로젝트 설정 및 멤버 관리 (Project Settings)
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                프로젝트를 생성하고 참여 멤버와 활성 SAP 모듈을 구성합니다.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>이전 화면으로 돌아가기</span>
          </button>
        </div>

        {/* Main Workspace Card */}
        <div className="bg-white rounded-xl border border-slate-200 flex flex-col md:flex-row overflow-hidden min-h-[580px]">
          {/* Left Project List */}
          <div className="w-full md:w-72 border-b md:border-b-0 md:border-r border-slate-200 bg-slate-50 p-4 flex flex-col gap-3 overflow-y-auto shrink-0">
            <button
              type="button"
              onClick={startNewProject}
              className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-2xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>새 프로젝트 추가</span>
            </button>

            <div className="space-y-1.5">
              {projects.map((p) => {
                const selected = !isCreatingNew && editingCode === p.code;
                return (
                  <button
                    key={p.code}
                    type="button"
                    onClick={() => loadIntoForm(p)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                      selected
                        ? 'bg-white border-blue-500 shadow-2xs text-slate-900'
                        : 'bg-white/60 border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-bold text-blue-800">{p.code}</span>
                      {p.is_system && (
                        <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                          <Lock className="w-3 h-3" />
                          <span>기본</span>
                        </span>
                      )}
                    </div>
                    <div className="font-semibold text-slate-800 truncate mt-0.5">{p.name}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {p.visibility === 'common'
                        ? '전사 공통 영역'
                        : p.visibility === 'temp'
                        ? '본인 전용 임시 영역'
                        : `참여 인원 ${p.members.length}명`}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Form */}
          <form onSubmit={handleSave} className="flex-1 p-6 overflow-y-auto space-y-4">
            {notice && (
              <div
                className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                  notice.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{notice.text}</span>
              </div>
            )}

            {isSystemProject && (
              <div className="p-3 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-700 flex items-center gap-2">
                <Lock className="w-4 h-4 text-slate-500 shrink-0" />
                <span>
                  <strong>{editingCode}</strong>는 시스템 기본 프로젝트이므로 코드 및 가시성 정책을 변경하거나 삭제할 수 없습니다.
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Project Code <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={!isCreatingNew}
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  placeholder="예: S4_ROLLOUT_2026"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold uppercase text-blue-900 disabled:bg-slate-100 disabled:text-slate-500 focus:bg-white focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target SAP Release
                </label>
                <input
                  type="text"
                  disabled={isSystemProject}
                  value={formRelease}
                  onChange={(e) => setFormRelease(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 disabled:bg-slate-100 focus:bg-white focus:border-blue-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  프로젝트명 (Project Name) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={isSystemProject}
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="예: 차세대 SAP S/4HANA 구축 프로젝트"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 disabled:bg-slate-100 focus:bg-white focus:border-blue-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  프로젝트 설명
                </label>
                <textarea
                  rows={2}
                  disabled={isSystemProject}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="프로젝트 범위 및 주요 목표를 입력하세요."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 disabled:bg-slate-100 focus:bg-white focus:border-blue-500"
                />
              </div>
            </div>

            {/* Active Modules */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                프로젝트 활성 모듈
              </label>
              <div className="flex flex-wrap gap-1.5">
                {ALL_MODULES.map((mod) => {
                  const active = formModules.includes(mod);
                  return (
                    <button
                      key={mod}
                      type="button"
                      disabled={isSystemProject}
                      onClick={() => toggleModule(mod)}
                      className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold border transition-colors cursor-pointer disabled:cursor-not-allowed ${
                        active
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {mod}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Members */}
            {!isSystemProject && (
              <div className="pt-2 border-t border-slate-100 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-600" />
                    <span>참여 멤버 (선택된 사용자만 이 프로젝트를 오버뷰에서 볼 수 있음)</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {allKnownUsers.map((memberName) => {
                    const checked = formMembers.includes(memberName);
                    return (
                      <button
                        key={memberName}
                        type="button"
                        onClick={() => toggleMember(memberName)}
                        className={`px-3 py-2 rounded-lg border text-xs flex items-center justify-between transition-colors cursor-pointer ${
                          checked
                            ? 'bg-blue-50 border-blue-300 text-blue-950 font-semibold'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span className="truncate">{memberName}</span>
                        {checked && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customMemberInput}
                    onChange={(e) => setCustomMemberInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomMember();
                      }
                    }}
                    placeholder="추가 멤버 이름 입력..."
                    className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomMember}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    멤버 추가
                  </button>
                </div>
              </div>
            )}

            {/* Footer actions */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
              <div>
                {!isCreatingNew && !isSystemProject && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>프로젝트 삭제</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer"
                >
                  돌아가기
                </button>
                {!isSystemProject && (
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isCreatingNew ? '프로젝트 생성' : '변경사항 저장'}</span>
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
