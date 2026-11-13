import React, { useState, useRef, useEffect } from 'react';
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
  Mic,
  MicOff,
  Sparkles,
  Loader2,
  Check,
} from 'lucide-react';
import { ProgramSpec } from '../types/sap';
import { useVoiceInput } from '../hooks/useVoiceInput';
import { requestMarkdownAiSuggestion } from '../utils/aiLogicGenerator';

export interface MarkdownAiContext {
  section: 'business_purpose' | 'data_extraction_logic' | 'data_flow_node';
  sectionTitle?: string;
  spec: ProgramSpec;
  nodeInfo?: {
    id: string;
    label: string;
    shape?: string;
    prevNodes?: string[];
    nextNodes?: string[];
  };
}

interface MarkdownFieldEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  rows?: number;
  minHeight?: string;
  aiContext?: MarkdownAiContext;
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
  aiContext,
}) => {
  // Default to 'preview' mode per RFQ v1.22
  const [mode, setMode] = useState<'edit' | 'preview'>('preview');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiStatus, setAiStatus] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const latestValueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    latestValueRef.current = value;
  }, [value]);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const voice = useVoiceInput({
    lang: 'ko-KR',
    onResult: (finalText) => {
      const prev = latestValueRef.current || '';
      const sep = prev.trim() ? '\n' : '';
      onChangeRef.current(`${prev}${sep}${finalText}`);
    },
  });

  const handleAiSuggest = async () => {
    if (!aiContext) return;
    setIsGeneratingAi(true);
    setAiStatus(null);
    setAiError(null);
    try {
      const res = await requestMarkdownAiSuggestion({
        section: aiContext.section,
        sectionTitle: aiContext.sectionTitle,
        spec: aiContext.spec,
        nodeInfo: aiContext.nodeInfo,
        currentValue: latestValueRef.current,
      });
      onChangeRef.current(res.markdown);
      setAiStatus(
        res.source === 'ai'
          ? '현재 화면 구성과 위치에 맞는 AI 추천 내용이 반영되었습니다.'
          : '화면 구성을 반영한 표준 사양 내용이 제안되었습니다.'
      );
      setTimeout(() => setAiStatus(null), 5000);
    } catch (err: any) {
      setAiError(err?.message || 'AI 제안 생성 중 오류가 발생했습니다.');
      setTimeout(() => setAiError(null), 6000);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const insertSyntax = (before: string, after: string = '', defaultInner: string = '') => {
    if (mode === 'preview') return;
    const el = textareaRef.current;
    const text = value || '';

    if (!el) {
      onChange(`${text}${text && !text.endsWith('\n') ? '\n' : ''}${before}${defaultInner}${after}`);
      return;
    }

    const start = el.selectionStart ?? text.length;
    const end = el.selectionEnd ?? text.length;
    const selected = text.slice(start, end);
    const inner = selected || defaultInner;
    const insertion = `${before}${inner}${after}`;
    const updated = `${text.slice(0, start)}${insertion}${text.slice(end)}`;
    onChange(updated);

    requestAnimationFrame(() => {
      if (!textareaRef.current) return;
      textareaRef.current.focus();
      const cursorStart = start + before.length;
      const cursorEnd = cursorStart + inner.length;
      textareaRef.current.setSelectionRange(cursorStart, cursorEnd);
    });
  };

  const switchToEditAndFocus = () => {
    setMode('edit');
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      insertSyntax('**', '**', '굵은 텍스트');
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
      e.preventDefault();
      setMode('preview');
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const el = e.currentTarget;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const text = value || '';
      const next = `${text.slice(0, start)}  ${text.slice(end)}`;
      onChange(next);
      requestAnimationFrame(() => {
        if (!textareaRef.current) return;
        textareaRef.current.setSelectionRange(start + 2, start + 2);
      });
    }
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
            onClick={() => insertSyntax('**', '**', '굵은 텍스트')}
            className={`p-1 rounded transition-colors ${
              mode === 'preview'
                ? 'opacity-30 cursor-not-allowed text-slate-400'
                : 'hover:bg-slate-200 text-slate-700 cursor-pointer'
            }`}
            title={mode === 'preview' ? 'Switch to Edit mode to format text' : 'Bold (Ctrl+B)'}
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={mode === 'preview'}
            onClick={() => insertSyntax('- ', '', '목록 항목')}
            className={`p-1 rounded transition-colors ${
              mode === 'preview'
                ? 'opacity-30 cursor-not-allowed text-slate-400'
                : 'hover:bg-slate-200 text-slate-700 cursor-pointer'
            }`}
            title={mode === 'preview' ? 'Switch to Edit mode to format text' : 'Bullet List (- item)'}
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={mode === 'preview'}
            onClick={() => insertSyntax('1. ', '', '순서 목록')}
            className={`p-1 rounded transition-colors ${
              mode === 'preview'
                ? 'opacity-30 cursor-not-allowed text-slate-400'
                : 'hover:bg-slate-200 text-slate-700 cursor-pointer'
            }`}
            title={mode === 'preview' ? 'Switch to Edit mode to format text' : 'Numbered List (1. item)'}
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={mode === 'preview'}
            onClick={() => insertSyntax('`', '`', '코드')}
            className={`p-1 rounded transition-colors ${
              mode === 'preview'
                ? 'opacity-30 cursor-not-allowed text-slate-400'
                : 'hover:bg-slate-200 text-slate-700 cursor-pointer'
            }`}
            title={mode === 'preview' ? 'Switch to Edit mode to format text' : 'Inline Code (`code`)'}
          >
            <Code className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Unified Right Action Icons: Voice -> AI -> Display <-> Edit */}
        <div className="flex items-center gap-1">
          {/* 1. Voice Recording Button (Icon-only) */}
          <button
            type="button"
            onClick={voice.toggleListening}
            disabled={voice.isTranscribing || isGeneratingAi}
            title={
              voice.isListening
                ? '음성 녹음 중... 클릭하여 완료'
                : voice.isTranscribing
                ? '음성 텍스트 변환 중...'
                : '음성 입력 (녹음)'
            }
            aria-label="음성 입력 (녹음)"
            className={`p-1.5 rounded flex items-center justify-center cursor-pointer transition-all shadow-2xs disabled:opacity-50 ${
              voice.isListening
                ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse ring-2 ring-rose-300'
                : voice.isTranscribing
                ? 'bg-indigo-600 text-white cursor-wait border border-indigo-600'
                : 'bg-white hover:bg-blue-50 text-blue-600 border border-slate-300'
            }`}
          >
            {voice.isListening ? (
              <MicOff className="w-3.5 h-3.5" />
            ) : voice.isTranscribing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Mic className="w-3.5 h-3.5" />
            )}
          </button>

          {/* 2. AI Context Suggestion Button (Icon-only) */}
          {aiContext && (
            <button
              type="button"
              onClick={handleAiSuggest}
              disabled={isGeneratingAi || voice.isListening || voice.isTranscribing}
              title="AI 제안 (위치 및 화면 구성 기반 최적 내용 제안)"
              aria-label="AI 제안"
              className={`p-1.5 rounded flex items-center justify-center cursor-pointer transition-all shadow-2xs disabled:opacity-50 ${
                isGeneratingAi
                  ? 'bg-indigo-600 text-white cursor-wait border border-indigo-600'
                  : 'bg-white hover:bg-indigo-50 text-indigo-600 border border-slate-300'
              }`}
            >
              {isGeneratingAi ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
            </button>
          )}

          {/* 3. Single Display <-> Edit Toggle Button (Icon-only) */}
          <button
            type="button"
            onClick={() => {
              if (mode === 'preview') switchToEditAndFocus();
              else setMode('preview');
            }}
            title="Display ↔ Edit (Double-click preview to edit)"
            aria-label="Display ↔ Edit"
            className={`p-1.5 rounded flex items-center justify-center cursor-pointer transition-all shadow-2xs ${
              mode === 'edit'
                ? 'bg-blue-600 hover:bg-blue-700 text-white border border-blue-600'
                : 'bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-300'
            }`}
          >
            {mode === 'preview' ? (
              <Edit3 className="w-3.5 h-3.5" />
            ) : (
              <Eye className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Live Voice / AI Feedback Strips */}
      {voice.isListening && (
        <div className="px-2.5 py-1.5 bg-rose-50 border-b border-rose-200 text-[11px] text-rose-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping shrink-0" />
            <span>음성 녹음 중... 녹음 버튼을 다시 클릭하면 텍스트로 변환됩니다.</span>
          </div>
          {voice.transcript && (
            <span className="font-semibold text-rose-950 italic truncate max-w-[220px]">
              "{voice.transcript}"
            </span>
          )}
        </div>
      )}

      {voice.isTranscribing && (
        <div className="px-2.5 py-1.5 bg-indigo-50 border-b border-indigo-200 text-[11px] text-indigo-800 flex items-center gap-1.5">
          <Loader2 className="w-3.5 h-3.5 text-indigo-600 animate-spin shrink-0" />
          <span>음성을 텍스트로 변환하고 있습니다...</span>
        </div>
      )}

      {voice.errorMessage && (
        <div className="px-2.5 py-1.5 bg-amber-50 border-b border-amber-200 text-[11px] text-amber-900 flex items-center justify-between gap-2">
          <span>{voice.errorMessage}</span>
          <button
            type="button"
            onClick={voice.clearError}
            className="text-[11px] font-semibold text-amber-700 hover:underline shrink-0 cursor-pointer"
          >
            닫기
          </button>
        </div>
      )}

      {aiStatus && (
        <div className="px-2.5 py-1.5 bg-emerald-50 border-b border-emerald-200 text-[11px] text-emerald-800 flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>{aiStatus}</span>
        </div>
      )}

      {aiError && (
        <div className="px-2.5 py-1.5 bg-rose-50 border-b border-rose-200 text-[11px] text-rose-800 flex items-center gap-1.5">
          <span>{aiError}</span>
        </div>
      )}

      {/* Editor Content Area (White Background) */}
      <div className="bg-white p-2.5">
        {mode === 'edit' ? (
          <textarea
            ref={textareaRef}
            rows={rows}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleTextareaKeyDown}
            className="w-full bg-white text-slate-800 text-xs leading-relaxed focus:outline-none border-none resize-y selection:bg-blue-100"
            style={{ minHeight }}
            placeholder={placeholder}
          />
        ) : (
          <div
            onDoubleClick={switchToEditAndFocus}
            title="Double-click to edit Markdown"
            className="min-h-[100px] overflow-auto p-1 bg-white cursor-text rounded hover:bg-slate-50/40 transition-colors"
            style={{ minHeight }}
          >
            {renderSimpleMarkdown(value)}
          </div>
        )}
      </div>
    </div>
  );
};
