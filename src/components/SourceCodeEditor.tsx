import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Code,
  Copy,
  Check,
  RotateCcw,
  Download,
  CheckCircle2,
  FileCode,
  Terminal,
  Eye,
  Edit3,
} from 'lucide-react';
import { ProgramSpec, ProgramSourceCodeTabs } from '../types/sap';
import {
  generateDefaultProgramSource,
  generateDefaultTopSource,
  generateDefaultS01Source,
  generateDefaultC01Source,
  generateDefaultModSource,
} from '../utils/sourceCodeHelper';
import { downloadFile } from '../utils/specExport';
import { HighlightedAbapLine } from './AbapSyntaxHighlighter';

export type SourceSubTab = 'program' | 'top' | 's01' | 'c01' | 'mod' | 'f01';

interface SourceCodeEditorProps {
  spec: ProgramSpec;
  onChange: (updated: ProgramSpec) => void;
}

const TAB_DEFINITIONS: { id: SourceSubTab; label: string; desc: string; isMain?: boolean }[] = [
  { id: 'program', label: 'Program', desc: '메인 리포트 프로그램 소스 (REPORT <prog>)', isMain: true },
  { id: 'top', label: 'TOP', desc: '전역 변수 & 타입 선언 (INCLUDE <prog>TOP)' },
  { id: 's01', label: 'S01', desc: '선택 화면 정의 (INCLUDE <prog>S01) - Selection Screen 파라미터 실시간 연동' },
  { id: 'c01', label: 'C01', desc: '클래스 및 이벤트 핸들러 (INCLUDE <prog>C01)' },
  { id: 'mod', label: 'MOD', desc: 'PBO / PAI 화면 모듈 (INCLUDE <prog>MOD)' },
  { id: 'f01', label: 'F01', desc: '서브루틴 및 FORM 로직 (INCLUDE <prog>F01)' },
];

export const SourceCodeEditor: React.FC<SourceCodeEditorProps> = ({ spec, onChange }) => {
  const [activeTab, setActiveTab] = useState<SourceSubTab>('program');
  const [copied, setCopied] = useState<boolean>(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [editorMode, setEditorMode] = useState<'edit' | 'preview'>('edit');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightOverlayRef = useRef<HTMLDivElement>(null);

  // Default Program source generated live from spec
  const defaultProgramSource = useMemo(() => generateDefaultProgramSource(spec), [
    spec.program_id,
    spec.title,
    spec.module,
    spec.tcode,
    spec.author,
  ]);

  // Default TOP source generated live from spec (Sample Type 01 & 02 use dynamic Field Catalog linkage)
  const defaultTopSource = useMemo(() => {
    if (spec.sample_type === '01' || spec.sample_type === '02') {
      return generateDefaultTopSource(spec);
    }
    return '';
  }, [spec.sample_type, spec.field_catalog, spec.item_grid?.field_catalog]);

  // Default S01 source generated live from Selection Screen parameters
  const defaultS01Source = useMemo(() => {
    return generateDefaultS01Source(spec);
  }, [spec.program_id, spec.selection_params]);

  // Default C01 source for Sample Type 01 and 02
  const defaultC01Source = useMemo(() => {
    if (spec.sample_type === '01' || spec.sample_type === '02') {
      return generateDefaultC01Source();
    }
    return '';
  }, [spec.sample_type]);

  // Default MOD source for Sample Type 01 and Sample Type 02
  const defaultModSource = useMemo(() => {
    if (spec.sample_type === '01' || spec.sample_type === '02') {
      return generateDefaultModSource(spec.sample_type);
    }
    return '';
  }, [spec.sample_type]);

  // Current source code stored in spec.source_code, with fallback to default for 'program', 'top', 's01', 'c01', and 'mod'
  const currentCodes: ProgramSourceCodeTabs = useMemo(() => {
    return {
      program: spec.source_code?.program !== undefined ? spec.source_code.program : defaultProgramSource,
      top: spec.source_code?.top !== undefined ? spec.source_code.top : defaultTopSource,
      s01: spec.source_code?.s01 !== undefined ? spec.source_code.s01 : defaultS01Source,
      c01: spec.source_code?.c01 !== undefined ? spec.source_code.c01 : defaultC01Source,
      mod: spec.source_code?.mod !== undefined ? spec.source_code.mod : defaultModSource,
      f01: spec.source_code?.f01 || '',
    };
  }, [spec.source_code, defaultProgramSource, defaultTopSource, defaultS01Source, defaultC01Source, defaultModSource]);

  const activeCode = currentCodes[activeTab] || '';

  // Synchronize scroll between textarea and syntax highlight overlay
  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (highlightOverlayRef.current) {
      highlightOverlayRef.current.scrollTop = e.currentTarget.scrollTop;
      highlightOverlayRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  // Handle Code Text Change in ABAP Editor
  const handleCodeChange = (newCode: string) => {
    const updatedSourceTabs: ProgramSourceCodeTabs = {
      ...currentCodes,
      [activeTab]: newCode,
    };
    onChange({
      ...spec,
      source_code: updatedSourceTabs,
    });
  };

  // Reset to spec-derived default (for Program, TOP for sample 01, S01, C01/MOD for sample 01/02, clear for others)
  const handleResetToDefault = () => {
    if (activeTab === 'program') {
      const generated = generateDefaultProgramSource(spec);
      handleCodeChange(generated);
      showToast('Program 탭 소스가 기본 템플릿으로 초기화되었습니다.');
    } else if (activeTab === 'top' && (spec.sample_type === '01' || spec.sample_type === '02')) {
      const generated = generateDefaultTopSource(spec);
      handleCodeChange(generated);
      showToast('TOP 탭 소스가 Field Catalog 연동 기본 템플릿으로 초기화되었습니다.');
    } else if (activeTab === 's01') {
      const generated = generateDefaultS01Source(spec);
      handleCodeChange(generated);
      showToast('S01 탭 소스가 Selection Screen 연동 코드로 초기화되었습니다.');
    } else if (activeTab === 'c01' && (spec.sample_type === '01' || spec.sample_type === '02')) {
      const generated = generateDefaultC01Source();
      handleCodeChange(generated);
      showToast('C01 탭 소스가 기본 템플릿으로 초기화되었습니다.');
    } else if (activeTab === 'mod' && (spec.sample_type === '01' || spec.sample_type === '02')) {
      const generated = generateDefaultModSource(spec.sample_type);
      handleCodeChange(generated);
      showToast('MOD 탭 소스가 기본 템플릿으로 초기화되었습니다.');
    } else {
      handleCodeChange('');
      showToast(`${activeTab.toUpperCase()} 탭이 초기화되었습니다.`);
    }
  };

  const showToast = (msg: string) => {
    setSaveToast(msg);
    setTimeout(() => setSaveToast(null), 3000);
  };

  // Copy active tab code
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  // Download .abap file for the active tab
  const handleDownload = () => {
    const progIdLower = (spec.program_id || 'ZRALV0010').toLowerCase();
    const fileName = activeTab === 'program' ? `${progIdLower}.abap` : `${progIdLower}${activeTab}.abap`;
    downloadFile(fileName, activeCode, 'text/plain;charset=utf-8;');
  };

  // Line count for the gutter
  const lines = useMemo(() => {
    return activeCode.split('\n');
  }, [activeCode]);

  const lineNumbers = useMemo(() => {
    return Array.from({ length: Math.max(lines.length, 1) }, (_, i) => i + 1);
  }, [lines.length]);

  return (
    <div className="flex flex-col h-full bg-white border border-slate-300 rounded-lg overflow-hidden font-sans shadow-sm">
      {/* Top Header / Sub-Tab Bar: Program, TOP, S01, C01, MOD, F01 */}
      <div className="bg-[#f0f4f9] px-3 pt-2 pb-0 border-b border-slate-300 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1 overflow-x-auto">
          {TAB_DEFINITIONS.map((tab) => {
            const isActive = activeTab === tab.id;
            const hasContent = Boolean(currentCodes[tab.id]?.trim());

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-4 py-2 text-xs font-mono font-semibold rounded-t-md transition-all flex items-center gap-2 cursor-pointer border-t-2 ${
                  isActive
                    ? 'bg-white text-blue-700 border-blue-600 shadow-xs'
                    : 'bg-[#e2e8f0] text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 border-transparent'
                }`}
                title={tab.desc}
              >
                <FileCode className={`w-3.5 h-3.5 ${isActive ? 'text-blue-600' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
                {hasContent && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isActive ? 'bg-blue-600' : 'bg-slate-400'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Action Buttons: Template Sync, Mode Toggle, Copy, Download */}
        <div className="flex items-center gap-1.5 pb-2">
          {(activeTab === 'program' ||
            activeTab === 's01' ||
            (activeTab === 'top' && (spec.sample_type === '01' || spec.sample_type === '02')) ||
            (activeTab === 'c01' && (spec.sample_type === '01' || spec.sample_type === '02')) ||
            (activeTab === 'mod' && (spec.sample_type === '01' || spec.sample_type === '02'))) && (
            <button
              type="button"
              onClick={handleResetToDefault}
              className="px-2.5 py-1 text-[11px] bg-white hover:bg-slate-50 text-slate-700 hover:text-blue-700 rounded border border-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title={
                activeTab === 's01'
                  ? 'Selection Screen에 등록된 파라미터/셀렉션 옵션으로 S01 인클루드 소스 다시 생성'
                  : '사양서 정보 및 화면 모듈/클래스 정의를 다시 반영하여 기본 템플릿으로 초기화'
              }
            >
              <RotateCcw className="w-3 h-3 text-amber-600" />
              <span>
                {activeTab === 's01' ? 'Selection Screen 연동 동기화' : '기본 템플릿 동기화'}
              </span>
            </button>
          )}

          {/* Edit / Highlight Preview Toggle */}
          <div className="flex items-center bg-slate-200/80 p-0.5 rounded border border-slate-300">
            <button
              type="button"
              onClick={() => setEditorMode('edit')}
              className={`px-2 py-0.5 text-[11px] font-semibold rounded flex items-center gap-1 cursor-pointer transition-all ${
                editorMode === 'edit'
                  ? 'bg-white text-blue-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="직접 텍스트 편집 모드"
            >
              <Edit3 className="w-3 h-3" />
              <span>편집</span>
            </button>
            <button
              type="button"
              onClick={() => setEditorMode('preview')}
              className={`px-2 py-0.5 text-[11px] font-semibold rounded flex items-center gap-1 cursor-pointer transition-all ${
                editorMode === 'preview'
                  ? 'bg-white text-blue-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="ABAP 구문 강조(Syntax Highlighting) 가독성 뷰"
            >
              <Eye className="w-3 h-3" />
              <span>구문강조 뷰</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="px-2.5 py-1 text-[11px] bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 rounded border border-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="현재 탭 코드 클립보드 복사"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-600" />
                <span className="text-emerald-600 font-bold">복사됨</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>복사</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="px-2.5 py-1 text-[11px] bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="현재 탭 소스 .abap 파일로 다운로드"
          >
            <Download className="w-3 h-3" />
            <span>.abap 다운로드</span>
          </button>
        </div>
      </div>

      {/* Editor Sub-Header / Current Include Info */}
      <div className="bg-[#f8fafc] px-4 py-1.5 border-b border-slate-200 text-[11px] flex items-center justify-between text-slate-600 font-mono">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-blue-600" />
          <span className="text-slate-900 font-bold">
            {activeTab === 'program'
              ? `REPORT ${(spec.program_id || 'ZRALV0010').toLowerCase()}`
              : `INCLUDE ${(spec.program_id || 'ZRALV0010').toLowerCase()}${activeTab}`}
          </span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-600 font-sans">
            {TAB_DEFINITIONS.find((t) => t.id === activeTab)?.desc}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {saveToast && (
            <span className="text-emerald-700 font-sans font-semibold flex items-center gap-1 animate-in fade-in">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              {saveToast}
            </span>
          )}
          <span className="text-slate-500 text-[10px]">
            {lines.length} lines | {activeCode.length} chars
          </span>
          <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200 font-sans font-medium">
            실시간 자동 저장
          </span>
        </div>
      </div>

      {/* ABAP Code Editor Area with White Background & High-Readability Line Numbers */}
      <div className="flex-1 flex overflow-hidden bg-white text-slate-900 font-mono text-xs">
        {/* Line Numbers Gutter */}
        <div className="w-12 py-3 bg-[#f8fafc] border-r border-slate-300 text-right pr-3 select-none text-slate-400 text-[11px] font-mono shrink-0 overflow-hidden">
          {lineNumbers.map((num) => (
            <div key={num} className="leading-5 h-5">
              {num}
            </div>
          ))}
        </div>

        {/* Editor Main Content: Edit Mode (Textarea with live overlay) or Full Preview Mode */}
        <div className="flex-1 relative overflow-auto bg-white">
          {editorMode === 'edit' ? (
            <div className="relative w-full h-full min-h-[520px]">
              {/* Background Syntax Highlight Layer for crisp keyword readability */}
              <div
                ref={highlightOverlayRef}
                aria-hidden="true"
                className="absolute inset-0 p-3 pointer-events-none whitespace-pre font-mono text-xs leading-5 overflow-hidden select-none"
                style={{
                  fontFamily: "'JetBrains Mono', 'Consolas', 'Courier New', monospace",
                  tabSize: 2,
                }}
              >
                {lines.map((line, idx) => (
                  <div key={idx} className="h-5 leading-5">
                    <HighlightedAbapLine line={line} />
                  </div>
                ))}
              </div>

              {/* Transparent Textarea for smooth editing and typing */}
              <textarea
                ref={textareaRef}
                value={activeCode}
                onChange={(e) => handleCodeChange(e.target.value)}
                onScroll={handleScroll}
                placeholder={
                  activeTab === 'program'
                    ? 'ABAP 메인 리포트 소스 코드를 입력하세요...'
                    : `INCLUDE ${(spec.program_id || 'ZRALV0010').toLowerCase()}${activeTab} 소스 코드를 자유롭게 작성하세요...`
                }
                spellCheck={false}
                className="absolute inset-0 w-full h-full p-3 bg-transparent text-transparent caret-slate-900 font-mono text-xs leading-5 resize-none focus:outline-none border-none selection:bg-blue-200/80 selection:text-blue-900 whitespace-pre overflow-auto"
                style={{
                  fontFamily: "'JetBrains Mono', 'Consolas', 'Courier New', monospace",
                  tabSize: 2,
                  WebkitTextFillColor: 'transparent',
                }}
              />
            </div>
          ) : (
            /* Syntax Highlighted View Mode with clickable line focus */
            <div
              className="p-3 whitespace-pre font-mono text-xs leading-5 overflow-auto select-text min-h-[520px]"
              style={{
                fontFamily: "'JetBrains Mono', 'Consolas', 'Courier New', monospace",
                tabSize: 2,
              }}
            >
              {lines.map((line, idx) => (
                <div key={idx} className="hover:bg-blue-50/60 rounded px-1 -mx-1 h-5 leading-5 flex items-center">
                  <HighlightedAbapLine line={line} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Editor Footer / SAP ABAP Status */}
      <div className="bg-[#f8fafc] px-4 py-1.5 border-t border-slate-300 flex items-center justify-between text-[11px] text-slate-500 font-sans shrink-0">
        <div className="flex items-center gap-2 font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="font-semibold text-slate-700">ABAP Syntax: Ready</span>
          <span>•</span>
          <span>Theme: SAP GUI Light (White)</span>
          <span>•</span>
          <span>Encoding: UTF-8</span>
          <span>•</span>
          <span>Target: {spec.target_sap_release || 'SAP S/4HANA / ECC 6.0'}</span>
        </div>
        <div className="text-slate-500 text-[10px]">
          <span>{editorMode === 'edit' ? '직접 수정 시 실시간 구문 강조 반영' : '구문 강조 뷰 활성화됨'}</span>
        </div>
      </div>
    </div>
  );
};
