import React, { useState, useEffect } from 'react';
import {
  FolderOpen,
  Save,
  Copy,
  Trash2,
  X,
  Search,
  CheckCircle2,
  AlertCircle,
  FileCode,
  ArrowRight,
  Lock,
  User,
  History,
  Clock,
  Sparkles,
  ChevronRight,
  Shield,
  Layers,
} from 'lucide-react';
import { ProgramSpec, SpecChangeHistoryItem } from '../types/sap';
import {
  getSavedSpecList,
  saveSpecToStorage,
  copySpecInStorage,
  deleteSpecFromStorage,
  SavedProgramSpecItem,
} from '../utils/specStorage';
import {
  getCurrentUser,
  setCurrentUser,
  PRESET_USERS,
  CurrentUser,
} from '../utils/authStorage';

interface SpecManagerModalProps {
  currentSpec: ProgramSpec;
  isOpen: boolean;
  onClose: () => void;
  onSelectSpec: (spec: ProgramSpec) => void;
}

export const SpecManagerModal: React.FC<SpecManagerModalProps> = ({
  currentSpec,
  isOpen,
  onClose,
  onSelectSpec,
}) => {
  const [specs, setSpecs] = useState<SavedProgramSpecItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // User Authentication State
  const [currentUser, setCurrentUserState] = useState<CurrentUser>(getCurrentUser());
  const [isUserSwitcherOpen, setIsUserSwitcherOpen] = useState(false);
  const [customUserName, setCustomUserName] = useState('');

  // Save with Change History Modal State
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveChangeComment, setSaveChangeComment] = useState('');

  // Copy modal state
  const [copyingSource, setCopyingSource] = useState<SavedProgramSpecItem | null>(null);
  const [newProgramIdInput, setNewProgramIdInput] = useState('');
  const [copyError, setCopyError] = useState<string | null>(null);

  // History Detail Viewer Modal State
  const [historyViewingItem, setHistoryViewingItem] = useState<SavedProgramSpecItem | null>(null);
  const tableScrollRef = React.useRef<HTMLDivElement>(null);

  const scrollTable = (direction: 'left' | 'right') => {
    if (tableScrollRef.current) {
      tableScrollRef.current.scrollBy({
        left: direction === 'left' ? -300 : 300,
        behavior: 'smooth',
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshList();
      setCurrentUserState(getCurrentUser());
    }
  }, [isOpen]);

  const refreshList = () => {
    const list = getSavedSpecList();
    setSpecs(list);
  };

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleSwitchUser = (user: CurrentUser) => {
    setCurrentUser(user);
    setCurrentUserState(user);
    setIsUserSwitcherOpen(false);
    showToast('success', `'${user.name}' 사용자로 로그인되었습니다.`);
  };

  const handleCustomLogin = () => {
    if (!customUserName.trim()) return;
    const newUser: CurrentUser = {
      id: `user-${Date.now()}`,
      name: customUserName.trim(),
      role: 'SAP Consultant / Developer',
      department: 'Custom User',
      email: `${customUserName.trim().toLowerCase().replace(/\s+/g, '.')}@sap-project.com`,
    };
    setCurrentUser(newUser);
    setCurrentUserState(newUser);
    setCustomUserName('');
    setIsUserSwitcherOpen(false);
    showToast('success', `'${newUser.name}' 사용자로 로그인되었습니다.`);
  };

  if (!isOpen) return null;

  // Filtered spec list
  const filteredSpecs = specs.filter((s) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return (
      s.program_id.toLowerCase().includes(query) ||
      s.title.toLowerCase().includes(query) ||
      s.tcode.toLowerCase().includes(query) ||
      s.module.toLowerCase().includes(query) ||
      s.author.toLowerCase().includes(query) ||
      (s.sample_type && s.sample_type.includes(query))
    );
  });

  // Handle Save Spec with change description
  const handleExecuteSave = () => {
    const res = saveSpecToStorage(currentSpec, saveChangeComment, currentUser.name);
    if (res.success && res.savedItem) {
      refreshList();
      setIsSaveModalOpen(false);
      setSaveChangeComment('');
      showToast(
        'success',
        `프로그램 '${currentSpec.program_id}' 사양이 버전 ${
          res.savedItem.change_history[res.savedItem.change_history.length - 1]?.version || 'v1.0'
        }(으)로 변경 이력과 함께 저장되었습니다.`
      );
    } else {
      showToast('error', res.message || '저장에 실패했습니다.');
    }
  };

  // Open copy dialog for an item
  const handleOpenCopyDialog = (item: SavedProgramSpecItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setCopyingSource(item);
    setNewProgramIdInput(`${item.program_id}_COPY`);
    setCopyError(null);
  };

  // Execute copy
  const handleExecuteCopy = () => {
    if (!copyingSource) return;
    const res = copySpecInStorage(copyingSource.program_id, newProgramIdInput, currentUser.name);
    if (res.success && res.newSpec) {
      refreshList();
      setCopyingSource(null);
      setCopyError(null);
      showToast('success', `신규 프로그램 '${res.newSpec.program_id}'(으)로 복사되었습니다.`);
      onSelectSpec(res.newSpec);
      onClose();
    } else {
      setCopyError(res.message || '복사 처리 중 오류가 발생했습니다.');
    }
  };

  // Delete item with strict authorization
  const handleDelete = (item: SavedProgramSpecItem, e: React.MouseEvent) => {
    e.stopPropagation();

    // 1. System Spec Check
    if (item.is_system) {
      showToast('error', '기본 제공 샘플 사양서는 삭제할 수 없습니다.');
      return;
    }

    // 2. Author Check
    if (item.author !== currentUser.name) {
      showToast(
        'error',
        `본인이 작성한 사양서만 삭제할 수 있습니다. (작성자: ${item.author}, 현재 로그인: ${currentUser.name})`
      );
      return;
    }

    if (window.confirm(`'${item.program_id}' 사양서를 목록에서 삭제하시겠습니까?`)) {
      const res = deleteSpecFromStorage(item.program_id, currentUser.name);
      if (res.success) {
        setSpecs(res.list);
        showToast('success', `'${item.program_id}' 사양서가 삭제되었습니다.`);
      } else {
        showToast('error', res.message || '삭제에 실패했습니다.');
      }
    }
  };

  // Select/Load spec
  const handleSelect = (item: SavedProgramSpecItem) => {
    onSelectSpec(item.spec);
    showToast('success', `'${item.program_id}' 사양서를 불러왔습니다.`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <FolderOpen className="w-5 h-5 text-blue-400" />
            <div>
              <h2 className="text-base font-bold text-white leading-tight flex items-center gap-2">
                <span>Spec List (Program Spec Manager)</span>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-blue-900/80 text-blue-200 border border-blue-700">
                  Total {specs.length} Specs
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Program ID별 사양서 저장·조회, 버전 변경 이력 관리, 복사 및 권한 기반 삭제를 지원합니다.
              </p>
            </div>
          </div>

          {/* Current Logged-in User Profile & Switcher */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsUserSwitcherOpen(!isUserSwitcherOpen)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs flex items-center gap-2 transition-colors cursor-pointer"
                title="로그인 사용자 변경"
              >
                <div className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[10px]">
                  {currentUser.name.charAt(0)}
                </div>
                <div className="text-left">
                  <div className="font-bold text-white text-[11px] leading-none">
                    {currentUser.name}
                  </div>
                  <div className="text-[9px] text-blue-300 leading-none mt-0.5">
                    {currentUser.role}
                  </div>
                </div>
                <span className="text-[10px] text-slate-400">▼</span>
              </button>

              {/* User Switcher Dropdown */}
              {isUserSwitcherOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-64 bg-white rounded-xl shadow-2xl border border-slate-200 p-2 z-50 text-slate-800 font-sans">
                  <div className="text-[11px] font-bold text-slate-500 px-2 py-1 border-b border-slate-100 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-blue-600" />
                    <span>사용자 로그인 변경 (계정 선택)</span>
                  </div>
                  <div className="py-1 space-y-0.5">
                    {PRESET_USERS.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => handleSwitchUser(u)}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                          currentUser.name === u.name
                            ? 'bg-blue-50 text-blue-900 font-bold border border-blue-200'
                            : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-xs">{u.name}</div>
                          <div className="text-[10px] text-slate-500">{u.role}</div>
                        </div>
                        {currentUser.name === u.name && (
                          <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-slate-100 px-1">
                    <div className="text-[10px] text-slate-500 mb-1">직접 사용자명 입력:</div>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        placeholder="이름 입력..."
                        value={customUserName}
                        onChange={(e) => setCustomUserName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleCustomLogin();
                        }}
                        className="flex-1 px-2 py-1 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={handleCustomLogin}
                        className="px-2 py-1 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700 cursor-pointer"
                      >
                        로그인
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action bar */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsSaveModalOpen(true)}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="현재 편집 중인 사양서를 변경 이력과 함께 저장합니다."
            >
              <Save className="w-3.5 h-3.5" />
              <span>현재 Spec 저장 [{currentSpec.program_id}]</span>
            </button>

            <span className="text-xs text-slate-500 ml-2">
              작성자: <strong className="text-slate-800">{currentUser.name}</strong>
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Horizontal Scroll Quick Buttons for wide table display */}
            <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-slate-300 text-xs shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 mr-1">컬럼 가로 이동:</span>
              <button
                type="button"
                onClick={() => scrollTable('left')}
                className="px-2 py-0.5 bg-slate-100 hover:bg-blue-100 hover:text-blue-800 rounded text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                title="테이블 왼쪽으로 스크롤"
              >
                ◀ 좌측
              </button>
              <button
                type="button"
                onClick={() => scrollTable('right')}
                className="px-2 py-0.5 bg-slate-100 hover:bg-blue-100 hover:text-blue-800 rounded text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                title="테이블 오른쪽으로 스크롤 (Actions 및 변경 이력 확인)"
              >
                우측 ▶
              </button>
            </div>

            <div className="relative min-w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Program ID, 제목, 모듈, 작성자 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
              />
            </div>
          </div>
        </div>

        {/* Toast / Alert notification */}
        {toastMessage && (
          <div
            className={`px-6 py-2 text-xs font-medium flex items-center gap-2 shrink-0 border-b ${
              toastMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        )}

        {/* Spec List Table with Horizontal Scroll (필드 정보 잘림 방지: min-w-[1100px] 및 가로 스크롤 제공) */}
        <div className="flex-1 overflow-auto p-6">
          <div
            ref={tableScrollRef}
            className="border border-slate-200 rounded-lg overflow-x-auto shadow-2xs bg-white"
            style={{ scrollbarWidth: 'thin' }}
          >
            <table className="w-full text-left text-xs border-collapse min-w-[1100px] whitespace-nowrap">
              <thead className="bg-[#e9f0f8] border-b border-slate-200 text-slate-700 font-bold uppercase text-[11px] sticky top-0 z-10">
                <tr>
                  <th className="px-3.5 py-2.5 w-40">Program ID (클릭시 불러오기)</th>
                  <th className="px-3.5 py-2.5 w-28">Type</th>
                  <th className="px-3.5 py-2.5 w-20">Module</th>
                  <th className="px-3.5 py-2.5 w-28">T-Code</th>
                  <th className="px-3.5 py-2.5 min-w-56">Title</th>
                  <th className="px-3.5 py-2.5 w-28">Author</th>
                  <th className="px-3.5 py-2.5 w-48">History (변경 이력)</th>
                  <th className="px-3.5 py-2.5 w-36">Updated</th>
                  <th className="px-3.5 py-2.5 w-48 text-center sticky right-0 bg-[#e9f0f8] shadow-xs">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-sans">
                {filteredSpecs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      저장된 Program Spec이 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredSpecs.map((item) => {
                    const isCurrent = item.program_id === currentSpec.program_id;
                    const isMySpec = item.author === currentUser.name;
                    const isSystem = !!item.is_system;
                    const canDelete = !isSystem && isMySpec;

                    const latestHistory =
                      item.change_history && item.change_history.length > 0
                        ? item.change_history[item.change_history.length - 1]
                        : null;

                    return (
                      <tr
                        key={item.program_id}
                        onClick={() => handleSelect(item)}
                        className={`hover:bg-blue-50/70 transition-colors cursor-pointer group ${
                          isCurrent ? 'bg-blue-50/50' : 'bg-white'
                        }`}
                      >
                        {/* 1. Program ID (Clicking loads the spec) */}
                        <td
                          className="px-3.5 py-2.5 font-mono font-bold text-blue-700 group-hover:text-blue-900"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelect(item);
                          }}
                        >
                          <div className="flex items-center gap-1.5" title="Program ID를 클릭하여 저장된 사양서를 불러옵니다.">
                            <FileCode className="w-4 h-4 text-blue-500 shrink-0" />
                            <span className="underline decoration-blue-300 group-hover:decoration-blue-700 cursor-pointer font-extrabold">
                              {item.program_id}
                            </span>
                            {isSystem && (
                              <span
                                className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-sans font-semibold border border-amber-200"
                                title="SAP 기본 제공 샘플 사양서"
                              >
                                샘플
                              </span>
                            )}
                            {isCurrent && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-600 text-white font-sans font-bold">
                                현재 작업
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 2. Type */}
                        <td className="px-3.5 py-2.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {item.sample_type === '01'
                              ? '01 (Single)'
                              : item.sample_type === '02'
                              ? '02 (Master-Detail)'
                              : item.sample_type === '03'
                              ? '03 (Tree)'
                              : item.sample_type === '04'
                              ? '04 (Pivot)'
                              : item.sample_type || '01'}
                          </span>
                        </td>

                        {/* 3. Module */}
                        <td className="px-3.5 py-2.5 font-semibold text-slate-700">
                          {item.module}
                        </td>

                        {/* 4. T-Code */}
                        <td className="px-3.5 py-2.5 font-mono text-slate-600">
                          {item.tcode}
                        </td>

                        {/* 5. Title */}
                        <td className="px-3.5 py-2.5 text-slate-800 font-medium max-w-xs truncate" title={item.title}>
                          {item.title}
                        </td>

                        {/* 6. Author */}
                        <td className="px-3.5 py-2.5">
                          <span
                            className={`font-medium ${
                              isMySpec ? 'text-blue-700 font-bold' : 'text-slate-600'
                            }`}
                          >
                            {item.author}
                          </span>
                        </td>

                        {/* 7. History (변경 이력 - RFQ v1.08 요구사항) */}
                        <td
                          className="px-3.5 py-2.5"
                          onClick={(e) => {
                            e.stopPropagation();
                            setHistoryViewingItem(item);
                          }}
                        >
                          <div
                            className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-900 rounded border border-slate-200 transition-colors cursor-pointer text-[11px]"
                            title="클릭하여 전체 변경 이력 보기"
                          >
                            <History className="w-3 h-3 text-slate-500" />
                            <span className="font-mono font-bold text-blue-700">
                              {latestHistory?.version || 'v1.0'}
                            </span>
                            <span className="text-[10px] text-slate-500 max-w-28 truncate">
                              ({latestHistory?.comment || '기본 버전'})
                            </span>
                          </div>
                        </td>

                        {/* 8. Updated */}
                        <td className="px-3.5 py-2.5 font-mono text-slate-500 text-[11px]">
                          {item.updated_at}
                        </td>

                        {/* 9. Actions (Sticky right column for smooth horizontal scroll) */}
                        <td className="px-3.5 py-2.5 text-center sticky right-0 bg-white group-hover:bg-blue-50/70 border-l border-slate-200 shadow-xs">
                          <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            {/* Copy Button */}
                            <button
                              type="button"
                              onClick={(e) => handleOpenCopyDialog(item, e)}
                              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded font-semibold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                              title="이 사양서를 신규 Program ID로 복사합니다."
                            >
                              <Copy className="w-3 h-3 text-amber-600" />
                              <span>복사</span>
                            </button>

                            {/* Load Button */}
                            <button
                              type="button"
                              onClick={() => handleSelect(item)}
                              className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded font-semibold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                              title="이 사양서 내용을 편집기로 로드합니다."
                            >
                              <ArrowRight className="w-3 h-3 text-blue-600" />
                              <span>불러오기</span>
                            </button>

                            {/* Delete Button (Enforced: System cannot be deleted; Only author can delete) */}
                            {isSystem ? (
                              <span
                                className="p-1 text-slate-300 cursor-not-allowed flex items-center"
                                title="기본 제공 샘플 사양서는 삭제할 수 없습니다."
                              >
                                <Lock className="w-3.5 h-3.5 text-slate-400" />
                              </span>
                            ) : canDelete ? (
                              <button
                                type="button"
                                onClick={(e) => handleDelete(item, e)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                title="사양서 삭제"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <span
                                className="p-1 text-slate-300 cursor-not-allowed flex items-center"
                                title={`본인이 작성한 사양서만 삭제할 수 있습니다. (작성자: ${item.author})`}
                              >
                                <Shield className="w-3.5 h-3.5 text-slate-300" />
                              </span>
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

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 shrink-0">
          <div className="flex items-center gap-4">
            <span>
              총 <strong>{filteredSpecs.length}</strong>개의 프로그램 사양서
            </span>
            <span className="text-slate-400">|</span>
            <span className="text-[11px] text-slate-500">
              * 표를 좌우로 스크롤하여 모든 컬럼과 변경 이력을 확인할 수 있습니다.
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-lg transition-colors cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>

      {/* Save Spec with Change History Modal */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Save className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold">사양서 저장 & 변경 이력 등록</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSaveModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                  저장 대상 Program ID
                </span>
                <div className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded text-xs font-mono font-bold text-blue-900">
                  {currentSpec.program_id} ({currentSpec.title})
                </div>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                  작성자 (Author)
                </span>
                <div className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  <span>{currentUser.name}</span>
                  <span className="text-[10px] text-slate-400">({currentUser.role})</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  변경 내용 기록 (Change Description)
                </label>
                <textarea
                  rows={3}
                  value={saveChangeComment}
                  onChange={(e) => setSaveChangeComment(e.target.value)}
                  placeholder="예: Group by sum 변경, 소계 라인 제거 및 영어 필드 반영"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-[10px] text-slate-400">
                  저장 시 신규 버전 번호가 자동 부여되고 변경 이력 목록에 영구 보존됩니다.
                </span>
              </div>
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsSaveModalOpen(false)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleExecuteSave}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>저장 완료</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Detail Viewer Modal */}
      {historyViewingItem && (
        <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold">
                  [{historyViewingItem.program_id}] 변경 이력 전체 내역
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setHistoryViewingItem(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 max-h-96 overflow-y-auto space-y-3">
              {historyViewingItem.change_history && historyViewingItem.change_history.length > 0 ? (
                historyViewingItem.change_history
                  .slice()
                  .reverse()
                  .map((h, idx) => (
                    <div
                      key={h.id || idx}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1 hover:border-blue-300 transition-colors"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                          {h.version}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {h.changed_at}
                        </span>
                      </div>
                      <div className="text-xs text-slate-800 font-medium pt-1">
                        {h.comment}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        작성자: <span className="font-semibold text-slate-700">{h.author}</span>
                      </div>
                    </div>
                  ))
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs">
                  등록된 변경 이력이 없습니다.
                </div>
              )}
            </div>

            <div className="px-5 py-3 bg-slate-100 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setHistoryViewingItem(null)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Copy Specification Dialog */}
      {copyingSource && (
        <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Copy className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold">사양서 복사하기 (Copy Spec)</h3>
              </div>
              <button
                type="button"
                onClick={() => setCopyingSource(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                  원본 Program ID
                </span>
                <div className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded text-xs font-mono font-bold text-slate-700">
                  {copyingSource.program_id} ({copyingSource.title})
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  신규 Program ID 입력 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  autoFocus
                  value={newProgramIdInput}
                  onChange={(e) => {
                    setNewProgramIdInput(e.target.value.toUpperCase());
                    setCopyError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleExecuteCopy();
                  }}
                  placeholder="예: ZRALV0040_COPY"
                  className={`w-full px-3 py-2 text-xs font-mono font-bold uppercase rounded-lg border focus:outline-none transition-colors ${
                    copyError
                      ? 'border-rose-400 bg-rose-50/50 text-rose-900 focus:border-rose-500'
                      : 'border-slate-300 bg-white text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                  }`}
                />
              </div>

              {/* Exact Error Message Display */}
              {copyError && (
                <div className="p-2.5 bg-rose-50 border border-rose-300 rounded-lg text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span className="font-bold">{copyError}</span>
                </div>
              )}

              <p className="text-[11px] text-slate-500">
                복사 시 현재 로그인한 사용자(<strong>{currentUser.name}</strong>)의 사양서로 신규 생성되며,
                본인 사양서이므로 차후 삭제 및 수정이 자유롭습니다.
              </p>
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setCopyingSource(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleExecuteCopy}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>복사 완료</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
