import React, { useState, useMemo } from 'react';
import { Copy, Check, Download, Code, Sparkles, Terminal } from 'lucide-react';
import { ProgramSpec } from '../types/sap';
import { generateFullAbapSource } from '../utils/abapGenerator';
import { downloadFile } from '../utils/specExport';

interface AbapCodeGeneratorProps {
  spec: ProgramSpec;
}

export const AbapCodeGenerator: React.FC<AbapCodeGeneratorProps> = ({ spec }) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'full' | 'top' | 'scr' | 'cls' | 'form'>('full');

  const fullCode = useMemo(() => generateFullAbapSource(spec), [spec]);

  // Handle Copy
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  // Handle Download .abap
  const handleDownloadAbap = () => {
    downloadFile(`${spec.program_id}.abap`, fullCode, 'text/plain;charset=utf-8;');
  };

  // Syntax highlighted lines rendering helper
  const renderHighlightedCode = (codeText: string) => {
    const lines = codeText.split('\n');
    return lines.map((line, idx) => {
      const isComment = line.trim().startsWith('*') || line.trim().startsWith('"');
      return (
        <div key={idx} className="flex hover:bg-slate-800/60 leading-relaxed font-mono text-xs">
          <span className="w-12 text-right pr-4 text-slate-600 select-none text-[11px]">
            {idx + 1}
          </span>
          <span
            className={`flex-1 whitespace-pre ${
              isComment
                ? 'text-emerald-400 italic'
                : line.includes('REPORT') || line.includes('TABLES:') || line.includes('TYPES:') || line.includes('DATA:') || line.includes('CLASS') || line.includes('SELECTION-SCREEN')
                ? 'text-sky-300 font-semibold'
                : line.includes('cl_gui_alv_grid') || line.includes('cl_gui_custom_container')
                ? 'text-amber-300 font-semibold'
                : 'text-slate-200'
            }`}
          >
            {line}
          </span>
        </div>
      );
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-xl font-sans">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-500/10 border border-blue-500/20 rounded-md text-blue-400">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white tracking-wide">
                ABAP OOP ALV 자동 소스 코드 생성기
              </span>
              <span className="text-[10px] bg-blue-900/60 text-blue-300 px-1.5 py-0.2 rounded border border-blue-700/50">
                CL_GUI_ALV_GRID
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              작성된 사양서 및 필드 카탈로그에 맞추어 실제 SAP 시스템(SE38/SE80)에서 바로 컴파일 가능한 소스 코드를 생성합니다.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded text-xs font-semibold border border-slate-700 transition-colors shadow-xs"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">복사 완료!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>코드 복사</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownloadAbap}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>.abap 다운로드</span>
          </button>
        </div>
      </div>

      {/* Code Display Canvas */}
      <div className="flex-1 overflow-auto p-4 bg-slate-950 font-mono text-xs">
        {renderHighlightedCode(fullCode)}
      </div>

      {/* Footer Info */}
      <div className="px-4 py-2 bg-slate-900 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>인클루드 분리 구조 지원: TOP / SCR / CLS / F01</span>
          <span className="text-slate-600">|</span>
          <span>총 라인 수: {fullCode.split('\n').length}줄</span>
        </div>
        <div className="text-slate-500">
          SAP S/4HANA & ECC 6.0 완벽 호환
        </div>
      </div>
    </div>
  );
};
