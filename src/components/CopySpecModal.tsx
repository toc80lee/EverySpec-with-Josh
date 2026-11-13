import React, { useState, useEffect } from 'react';
import { Copy, FolderKanban, X, AlertCircle } from 'lucide-react';
import { ProgramSpec, SapProject } from '../types/sap';
import {
  COMMON_PROJECT_CODE,
  TEMP_PROJECT_CODE,
  getAccessibleProjectsForUser,
} from '../utils/projectStorage';
import { copySpecInStorage } from '../utils/specStorage';
import { getCurrentUser } from '../utils/authStorage';

interface CopySpecModalProps {
  isOpen: boolean;
  sourceSpec: ProgramSpec | null;
  defaultTargetProject?: string;
  onClose: () => void;
  onCopied: (newSpec: ProgramSpec) => void;
}

export const CopySpecModal: React.FC<CopySpecModalProps> = ({
  isOpen,
  sourceSpec,
  defaultTargetProject,
  onClose,
  onCopied,
}) => {
  const currentUser = getCurrentUser();
  const [projects, setProjects] = useState<SapProject[]>([]);
  const [targetProject, setTargetProject] = useState<string>(TEMP_PROJECT_CODE);
  const [newProgramId, setNewProgramId] = useState<string>('');
  const [newTcode, setNewTcode] = useState<string>('');
  const [newTitle, setNewTitle] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !sourceSpec) return;
    const accessible = getAccessibleProjectsForUser(currentUser.name).filter(
      (p) => p.code !== COMMON_PROJECT_CODE
    );
    setProjects(accessible);

    const suggestedProj =
      defaultTargetProject &&
      defaultTargetProject !== COMMON_PROJECT_CODE &&
      accessible.some((p) => p.code === defaultTargetProject)
        ? defaultTargetProject
        : accessible.find((p) => p.code !== TEMP_PROJECT_CODE)?.code || TEMP_PROJECT_CODE;

    setTargetProject(suggestedProj);
    const baseId = (sourceSpec.program_id || 'ZR_PROG').toUpperCase();
    const suggestedId = `${baseId}_COPY`;
    setNewProgramId(suggestedId);
    setNewTcode(suggestedId.slice(0, 20));
    setNewTitle(`${sourceSpec.title} (Copy)`);
    setErrorMsg(null);
  }, [isOpen, sourceSpec, defaultTargetProject, currentUser.name]);

  if (!isOpen || !sourceSpec) return null;

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = newProgramId.trim().toUpperCase();
    if (!cleanId) {
      setErrorMsg('신규 Program ID를 입력해 주세요.');
      return;
    }
    if (!targetProject) {
      setErrorMsg('대상 프로젝트를 선택해 주세요.');
      return;
    }

    const res = copySpecInStorage(
      sourceSpec.program_id,
      cleanId,
      currentUser.name,
      targetProject,
      newTitle,
      newTcode
    );

    if (!res.success || !res.newSpec) {
      setErrorMsg(res.message || '사양서 복사에 실패했습니다.');
      return;
    }

    onCopied(res.newSpec);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden text-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Copy className="w-4 h-4 text-blue-400" />
            <div>
              <h3 className="text-sm font-bold leading-tight">
                다른 프로젝트로 사양서 복사
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                원본: {sourceSpec.program_id} ({sourceSpec.project_code || COMMON_PROJECT_CODE})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleConfirm} className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              대상 프로젝트 (Target Project) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <FolderKanban className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <select
                required
                value={targetProject}
                onChange={(e) => setTargetProject(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:bg-white focus:border-blue-500 cursor-pointer"
              >
                {projects.map((p) => (
                  <option key={p.code} value={p.code}>
                    [{p.code}] {p.name}
                    {p.code === TEMP_PROJECT_CODE ? ' (나만 보기)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                신규 Program ID <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={newProgramId}
                onChange={(e) => {
                  setNewProgramId(e.target.value.toUpperCase());
                  setErrorMsg(null);
                }}
                placeholder="예: ZRSD0010"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold uppercase text-blue-900 focus:bg-white focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                신규 T-Code <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={newTcode}
                onChange={(e) => setNewTcode(e.target.value.toUpperCase())}
                placeholder="예: ZSD010"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold uppercase text-slate-800 focus:bg-white focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              프로그램 명칭 (Title)
            </label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white focus:border-blue-500"
            />
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>복사 후 편집 시작</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
