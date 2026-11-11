import React, { useState } from 'react';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Code,
  Heading1,
  Heading2,
  Eye,
  Edit3,
} from 'lucide-react';

interface MarkdownFieldEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  rows?: number;
  minHeight?: string;
}

/**
 * Clean, lightweight Markdown Editor with white background, Markdown helper toolbar,
 * and live Edit / Preview toggle.
 */
export const MarkdownFieldEditor: React.FC<MarkdownFieldEditorProps> = ({
  value,
  onChange,
  placeholder = '마크다운(# 제목, - 목록, **굵게**, `코드`) 형식으로 입력해 주세요...',
  rows = 5,
  minHeight = '130px',
}) => {
  // Default to 'preview' mode per RFQ v1.22
  const [mode, setMode] = useState<'edit' | 'preview'>('preview');

  const insertSyntax = (before: string, after: string = '') => {
    if (mode === 'preview') return;
    const text = value || '';
    onChange(`${text}\n${before}${after}`);
  };

  // Simple Markdown renderer without heavy external parser dependencies
  const renderSimpleMarkdown = (content: string) => {
    if (!content.trim()) {
      return <p className="text-slate-400 italic">내용이 비어 있습니다.</p>;
    }

    const lines = content.split('\n');
    return (
      <div className="space-y-1.5 text-xs text-slate-800 leading-relaxed font-sans">
        {lines.map((line, idx) => {
          const trimmed = line.trim();

          // Heading 1
          if (trimmed.startsWith('# ')) {
            return (
              <h1 key={idx} className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-1 mt-2">
                {trimmed.substring(2)}
              </h1>
            );
          }
          // Heading 2
          if (trimmed.startsWith('## ')) {
            return (
              <h2 key={idx} className="text-xs font-bold text-blue-900 mt-1.5">
                {trimmed.substring(3)}
              </h2>
            );
          }
          // Heading 3
          if (trimmed.startsWith('### ')) {
            return (
              <h3 key={idx} className="text-xs font-semibold text-slate-800 mt-1">
                {trimmed.substring(4)}
              </h3>
            );
          }
          // Unordered list
          if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            return (
              <li key={idx} className="ml-4 list-disc text-slate-700">
                {formatInlineMarkdown(trimmed.substring(2))}
              </li>
            );
          }
          // Ordered list
          if (/^\d+\.\s/.test(trimmed)) {
            const numMatch = trimmed.match(/^\d+\.\s/);
            const textPart = trimmed.substring(numMatch![0].length);
            return (
              <li key={idx} className="ml-4 list-decimal text-slate-700">
                {formatInlineMarkdown(textPart)}
              </li>
            );
          }
          // Code block indicator or blockquote
          if (trimmed.startsWith('> ')) {
            return (
              <blockquote key={idx} className="pl-2 border-l-2 border-blue-500 text-slate-600 bg-blue-50/50 py-0.5 rounded-r">
                {formatInlineMarkdown(trimmed.substring(2))}
              </blockquote>
            );
          }

          if (!trimmed) {
            return <div key={idx} className="h-2" />;
          }

          return (
            <p key={idx} className="text-slate-800">
              {formatInlineMarkdown(line)}
            </p>
          );
        })}
      </div>
    );
  };

  const formatInlineMarkdown = (text: string) => {
    // Bold: **text**
    const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-bold text-slate-900">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={i} className="bg-slate-100 text-pink-700 px-1 py-0.5 rounded font-mono text-[11px] border border-slate-200">
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  return (
    <div className="border border-slate-300 rounded-md overflow-hidden bg-white shadow-2xs">
      {/* Markdown Quick Toolbar */}
      <div className="px-2.5 py-1 bg-[#f8fafc] border-b border-slate-200 flex items-center justify-between flex-wrap gap-1.5 text-slate-600">
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={mode === 'preview'}
            onClick={() => insertSyntax('# ')}
            className={`p-1 rounded transition-colors ${
              mode === 'preview'
                ? 'opacity-30 cursor-not-allowed text-slate-400'
                : 'hover:bg-slate-200 text-slate-700 cursor-pointer'
            }`}
            title={mode === 'preview' ? '미리보기 상태에서는 서식을 추가할 수 없습니다 (편집 모드로 전환하세요)' : 'Heading 1 (# )'}
          >
            <Heading1 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={mode === 'preview'}
            onClick={() => insertSyntax('## ')}
            className={`p-1 rounded transition-colors ${
              mode === 'preview'
                ? 'opacity-30 cursor-not-allowed text-slate-400'
                : 'hover:bg-slate-200 text-slate-700 cursor-pointer'
            }`}
            title={mode === 'preview' ? '미리보기 상태에서는 서식을 추가할 수 없습니다 (편집 모드로 전환하세요)' : 'Heading 2 (## )'}
          >
            <Heading2 className="w-3.5 h-3.5" />
          </button>
          <div className="h-3 w-px bg-slate-300 mx-0.5" />
          <button
            type="button"
            disabled={mode === 'preview'}
            onClick={() => insertSyntax('**굵은 텍스트**')}
            className={`p-1 rounded transition-colors ${
              mode === 'preview'
                ? 'opacity-30 cursor-not-allowed text-slate-400'
                : 'hover:bg-slate-200 text-slate-700 cursor-pointer'
            }`}
            title={mode === 'preview' ? '미리보기 상태에서는 서식을 추가할 수 없습니다 (편집 모드로 전환하세요)' : 'Bold (**text**)'}
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={mode === 'preview'}
            onClick={() => insertSyntax('- 목록 항목')}
            className={`p-1 rounded transition-colors ${
              mode === 'preview'
                ? 'opacity-30 cursor-not-allowed text-slate-400'
                : 'hover:bg-slate-200 text-slate-700 cursor-pointer'
            }`}
            title={mode === 'preview' ? '미리보기 상태에서는 서식을 추가할 수 없습니다 (편집 모드로 전환하세요)' : 'Unordered list (- item)'}
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={mode === 'preview'}
            onClick={() => insertSyntax('1. 순서 목록')}
            className={`p-1 rounded transition-colors ${
              mode === 'preview'
                ? 'opacity-30 cursor-not-allowed text-slate-400'
                : 'hover:bg-slate-200 text-slate-700 cursor-pointer'
            }`}
            title={mode === 'preview' ? '미리보기 상태에서는 서식을 추가할 수 없습니다 (편집 모드로 전환하세요)' : 'Ordered list (1. item)'}
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={mode === 'preview'}
            onClick={() => insertSyntax('`코드`')}
            className={`p-1 rounded transition-colors ${
              mode === 'preview'
                ? 'opacity-30 cursor-not-allowed text-slate-400'
                : 'hover:bg-slate-200 text-slate-700 cursor-pointer'
            }`}
            title={mode === 'preview' ? '미리보기 상태에서는 서식을 추가할 수 없습니다 (편집 모드로 전환하세요)' : 'Inline Code (`code`)'}
          >
            <Code className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Edit / Markdown Preview Switcher */}
        <div className="flex items-center bg-slate-200/80 p-0.5 rounded text-[11px] font-semibold">
          <button
            type="button"
            onClick={() => setMode('edit')}
            className={`px-2 py-0.5 rounded flex items-center gap-1 cursor-pointer transition-all ${
              mode === 'edit'
                ? 'bg-white text-blue-700 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Edit3 className="w-3 h-3" />
            <span>편집</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('preview')}
            className={`px-2 py-0.5 rounded flex items-center gap-1 cursor-pointer transition-all ${
              mode === 'preview'
                ? 'bg-white text-blue-700 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Eye className="w-3 h-3" />
            <span>미리보기</span>
          </button>
        </div>
      </div>

      {/* Editor Content Area (White Background) */}
      <div className="bg-white p-2.5">
        {mode === 'edit' ? (
          <textarea
            rows={rows}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-white text-slate-800 text-xs leading-relaxed focus:outline-none border-none resize-y selection:bg-blue-100"
            style={{ minHeight }}
            placeholder={placeholder}
          />
        ) : (
          <div className="min-h-[100px] overflow-auto p-1 bg-white" style={{ minHeight }}>
            {renderSimpleMarkdown(value)}
          </div>
        )}
      </div>
    </div>
  );
};
