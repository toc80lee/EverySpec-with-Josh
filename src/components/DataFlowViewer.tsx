import React, { useRef, useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Download, Maximize2 } from 'lucide-react';
import { DataFlowDiagramConfig, DataFlowStep, DataFlowDatabase } from '../types/sap';

interface DataFlowViewerProps {
  config: DataFlowDiagramConfig;
  selectedStepId?: string | null;
  onSelectStep?: (stepId: string) => void;
  className?: string;
  readOnly?: boolean;
}

export const DataFlowViewer: React.FC<DataFlowViewerProps> = ({
  config,
  selectedStepId,
  onSelectStep,
  className = '',
  readOnly = false,
}) => {
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  // Helper to find step by step_no
  const findStep = (stepNo: string): DataFlowStep | undefined => {
    return config.steps.find((s) => s.step_no === stepNo || s.label.includes(stepNo));
  };

  // Helper for DB cylinder table text
  const db1 = config.databases[0] || { name: 'T004\nT004T' };
  const db2 = config.databases[1] || { name: 'SETHEADER\nSETHEADERT\nSETNODE\nSETLEAF' };

  // Step texts
  const startStep = findStep('시작') || { label: '시작', id: 'start' };
  const s1 = findStep('1)') || { label: '1) 초기화', id: 's1' };
  const s2 = findStep('2)') || { label: '2) 선택화면', id: 's2' };
  const s3 = findStep('3)') || { label: '3) 입력값 점검', id: 's3' };
  const decOpt = findStep('옵션') || findStep('처리 옵션') || { label: '처리 옵션', id: 'decOpt' };
  const s4 = findStep('4)') || { label: '4) 조회', id: 's4' };
  const s5 = findStep('5)') || { label: '5) 생성', id: 's5' };
  const s5_1 = findStep('5-1)') || { label: '5-1) 엑셀 업로드', id: 's5_1' };
  const s6 = findStep('6)') || { label: '6) 데이터 가공', id: 's6' };
  const s7 = findStep('7)') || { label: '7) 100번 화면 호출', id: 's7' };
  const decCmd = findStep('명령') || findStep('사용자 명령') || { label: '사용자 명령', id: 'decCmd' };
  const s7_1 = findStep('7-1)') || { label: '7-1) 종료', id: 's7_1' };
  const s7_2 = findStep('7-2)') || { label: '7-2) 생성', id: 's7_2' };
  const decBapi = findStep('BAPI') || findStep('BAPI 실행') || { label: 'BAPI 실행', id: 'decBapi' };
  const s7_2_1 = findStep('7-2-1)') || { label: '7-2-1) 생성 성공', id: 's7_2_1' };
  const s7_2_2 = findStep('7-2-2)') || { label: '7-2-2) 생성 실패', id: 's7_2_2' };
  const endStep = findStep('종료') || { label: '종료', id: 'end' };

  const handleDownloadSvg = () => {
    if (!svgRef.current) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgRef.current);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'SAP_ALV_Data_Flow_Diagram.svg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const isSelected = (id: string) => selectedStepId === id;

  return (
    <div
      className={`relative bg-white rounded-lg border border-slate-300 shadow-inner overflow-hidden flex flex-col ${
        isFullscreen ? 'fixed inset-4 z-50 shadow-2xl' : ''
      } ${className}`}
    >
      {/* Viewer Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200 text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-slate-700">
          <span className="w-2 h-2 rounded-full bg-blue-600" />
          <span>{config.title || 'Data Flow Diagram'}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(z + 0.15, 2.0))}
            className="p-1 hover:bg-slate-200 rounded text-slate-600"
            title="확대 (Zoom In)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(z - 0.15, 0.6))}
            className="p-1 hover:bg-slate-200 rounded text-slate-600"
            title="축소 (Zoom Out)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            className="p-1 hover:bg-slate-200 rounded text-slate-600 text-[11px] px-1.5"
            title="원래 크기 (100%)"
          >
            100%
          </button>
          <button
            type="button"
            onClick={handleDownloadSvg}
            className="p-1 hover:bg-slate-200 rounded text-slate-600"
            title="SVG 다이어그램 이미지 다운로드"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1 hover:bg-slate-200 rounded text-slate-600"
            title={isFullscreen ? '창 복원' : '전체화면 확대'}
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Diagram Canvas */}
      <div className="flex-1 overflow-auto p-4 flex justify-center items-start bg-white">
        <div
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'top center',
            transition: 'transform 0.15s ease-out',
          }}
          className="inline-block"
        >
          <svg
            ref={svgRef}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 520 1020"
            width="520"
            height="1020"
            className="font-sans select-none"
            style={{ backgroundColor: '#ffffff' }}
          >
            {/* Defs for arrowheads and gradients */}
            <defs>
              <marker
                id="df-arrow"
                viewBox="0 0 10 10"
                refX="6"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#000000" />
              </marker>
              <marker
                id="df-arrow-blue"
                viewBox="0 0 10 10"
                refX="6"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#1e40af" />
              </marker>
            </defs>

            {/* ========================================================================= */}
            {/* 1. DATABASE CYLINDERS (Left Side)                                         */}
            {/* ========================================================================= */}
            {/* Database Cylinder 1: T004 / T004T */}
            <g id="cylinder-1" className="cursor-pointer">
              {/* Cylinder shadow & body */}
              <ellipse cx="60" cy="215" rx="55" ry="10" fill="#ffffff" stroke="#000000" strokeWidth="1.2" />
              <rect x="5" y="215" width="110" height="36" fill="#ffffff" />
              <line x1="5" y1="215" x2="5" y2="251" stroke="#000000" strokeWidth="1.2" />
              <line x1="115" y1="215" x2="115" y2="251" stroke="#000000" strokeWidth="1.2" />
              {/* Internal stacked disk lines */}
              <path d="M 5 224 A 55 10 0 0 0 115 224" fill="none" stroke="#000000" strokeWidth="0.8" />
              <path d="M 5 233 A 55 10 0 0 0 115 233" fill="none" stroke="#000000" strokeWidth="0.8" />
              <ellipse cx="60" cy="251" rx="55" ry="10" fill="#ffffff" stroke="#000000" strokeWidth="1.2" />
              {/* Table Names */}
              {db1.name.split('\n').map((tbl, idx) => (
                <text
                  key={idx}
                  x="60"
                  y={239 + idx * 12}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="bold"
                  fill="#111827"
                  fontFamily="monospace"
                >
                  {tbl}
                </text>
              ))}
            </g>

            {/* Database Cylinder 2: SETHEADER / SETHEADERT / SETNODE / SETLEAF */}
            <g id="cylinder-2" className="cursor-pointer">
              <ellipse cx="60" cy="510" rx="55" ry="10" fill="#ffffff" stroke="#000000" strokeWidth="1.2" />
              <rect x="5" y="510" width="110" height="96" fill="#ffffff" />
              <line x1="5" y1="510" x2="5" y2="606" stroke="#000000" strokeWidth="1.2" />
              <line x1="115" y1="510" x2="115" y2="606" stroke="#000000" strokeWidth="1.2" />
              {/* Internal disks */}
              <path d="M 5 519 A 55 10 0 0 0 115 519" fill="none" stroke="#000000" strokeWidth="0.8" />
              <path d="M 5 528 A 55 10 0 0 0 115 528" fill="none" stroke="#000000" strokeWidth="0.8" />
              <path d="M 5 565 A 55 10 0 0 0 115 565" fill="none" stroke="#000000" strokeWidth="0.8" />
              <path d="M 5 574 A 55 10 0 0 0 115 574" fill="none" stroke="#000000" strokeWidth="0.8" />
              <ellipse cx="60" cy="606" rx="55" ry="10" fill="#ffffff" stroke="#000000" strokeWidth="1.2" />
              {/* Tables */}
              {db2.name.split('\n').map((tbl, idx) => (
                <text
                  key={idx}
                  x="60"
                  y={544 + idx * 13}
                  textAnchor="middle"
                  fontSize="9.5"
                  fontWeight="bold"
                  fill="#111827"
                  fontFamily="monospace"
                >
                  {tbl}
                </text>
              ))}
            </g>

            {/* ========================================================================= */}
            {/* 2. CONNECTING ARROWS & FLOW LINES                                         */}
            {/* ========================================================================= */}
            {/* Start -> 1) 초기화 */}
            <line x1="270" y1="40" x2="270" y2="72" stroke="#000000" strokeWidth="1.2" markerEnd="url(#df-arrow)" />

            {/* 1) 초기화 -> 2) 선택화면 */}
            <line x1="270" y1="108" x2="270" y2="148" stroke="#000000" strokeWidth="1.2" markerEnd="url(#df-arrow)" />

            {/* 2) 선택화면 -> 3) 입력값 점검 */}
            <line x1="270" y1="184" x2="270" y2="224" stroke="#000000" strokeWidth="1.2" markerEnd="url(#df-arrow)" />

            {/* 3) 입력값 점검 -> 처리 옵션 (Diamond) */}
            <line x1="270" y1="260" x2="270" y2="295" stroke="#000000" strokeWidth="1.2" markerEnd="url(#df-arrow)" />

            {/* Cylinder 1 -> 2) 선택화면 & 3) 입력값 점검 */}
            <path
              d="M 115 235 L 170 235 L 170 166 L 209 166"
              fill="none"
              stroke="#000000"
              strokeWidth="1.2"
              markerEnd="url(#df-arrow)"
            />
            <path
              d="M 170 242 L 209 242"
              fill="none"
              stroke="#000000"
              strokeWidth="1.2"
              markerEnd="url(#df-arrow)"
            />

            {/* 처리 옵션 -> Left: 4) 조회 */}
            <path
              d="M 215 315 L 195 315 L 195 357"
              fill="none"
              stroke="#000000"
              strokeWidth="1.2"
              markerEnd="url(#df-arrow)"
            />

            {/* 처리 옵션 -> Right: 5) 생성 */}
            <path
              d="M 325 315 L 348 315 L 348 357"
              fill="none"
              stroke="#000000"
              strokeWidth="1.2"
              markerEnd="url(#df-arrow)"
            />

            {/* 5) 생성 -> 5-1) 엑셀 업로드 */}
            <line x1="348" y1="395" x2="348" y2="433" stroke="#000000" strokeWidth="1.2" markerEnd="url(#df-arrow)" />

            {/* Cylinder 2 -> 4) 조회 */}
            <path
              d="M 60 510 L 60 380 L 140 380"
              fill="none"
              stroke="#000000"
              strokeWidth="1.2"
              markerEnd="url(#df-arrow)"
            />

            {/* Cylinder 2 -> 6) 데이터 가공 */}
            <line x1="115" y1="535" x2="204" y2="535" stroke="#000000" strokeWidth="1.2" markerEnd="url(#df-arrow)" />

            {/* 4) 조회 -> 6) 데이터 가공 */}
            <path
              d="M 195 395 L 195 490 L 255 490 L 255 512"
              fill="none"
              stroke="#000000"
              strokeWidth="1.2"
              markerEnd="url(#df-arrow)"
            />

            {/* 5-1) 엑셀 업로드 -> 6) 데이터 가공 */}
            <path
              d="M 348 471 L 348 490 L 285 490 L 285 512"
              fill="none"
              stroke="#000000"
              strokeWidth="1.2"
              markerEnd="url(#df-arrow)"
            />

            {/* 6) 데이터 가공 -> 7) 100번 화면 호출 */}
            <line x1="270" y1="551" x2="270" y2="583" stroke="#000000" strokeWidth="1.2" markerEnd="url(#df-arrow)" />

            {/* 7) 100번 화면 호출 -> 사용자 명령 (Diamond) */}
            <line x1="270" y1="620" x2="270" y2="655" stroke="#000000" strokeWidth="1.2" markerEnd="url(#df-arrow)" />

            {/* 사용자 명령 -> Left: 7-1) 종료 */}
            <path
              d="M 215 675 L 195 675 L 195 723"
              fill="none"
              stroke="#000000"
              strokeWidth="1.2"
              markerEnd="url(#df-arrow)"
            />

            {/* 사용자 명령 -> Right: 7-2) 생성 */}
            <path
              d="M 325 675 L 348 675 L 348 723"
              fill="none"
              stroke="#000000"
              strokeWidth="1.2"
              markerEnd="url(#df-arrow)"
            />

            {/* 7-2) 생성 -> BAPI 실행 (Diamond) */}
            <line x1="348" y1="760" x2="348" y2="795" stroke="#000000" strokeWidth="1.2" markerEnd="url(#df-arrow)" />

            {/* BAPI 실행 -> Left: 7-2-1) 생성 성공 */}
            <path
              d="M 293 815 L 273 815 L 273 867"
              fill="none"
              stroke="#000000"
              strokeWidth="1.2"
              markerEnd="url(#df-arrow)"
            />

            {/* BAPI 실행 -> Right: 7-2-2) 생성 실패 */}
            <path
              d="M 403 815 L 423 815 L 423 867"
              fill="none"
              stroke="#000000"
              strokeWidth="1.2"
              markerEnd="url(#df-arrow)"
            />

            {/* 7-1) 종료 -> 최종 종료 (End) */}
            <path
              d="M 195 760 L 195 972 L 210 972"
              fill="none"
              stroke="#000000"
              strokeWidth="1.2"
              markerEnd="url(#df-arrow)"
            />

            {/* 7-2-1) 생성 성공 -> 최종 종료 (End) */}
            <line x1="270" y1="905" x2="270" y2="950" stroke="#000000" strokeWidth="1.2" markerEnd="url(#df-arrow)" />

            {/* 7-2-2) 생성 실패 -> 6) 데이터 가공 (Loopback around the right side!) */}
            <path
              d="M 473 886 L 495 886 L 495 533 L 336 533"
              fill="none"
              stroke="#000000"
              strokeWidth="1.2"
              markerEnd="url(#df-arrow)"
            />

            {/* ========================================================================= */}
            {/* 3. DIAGRAM NODES (Boxes, Diamonds, Start/End Pills)                       */}
            {/* ========================================================================= */}
            {/* Node: 시작 (Start) */}
            <g
              onClick={() => onSelectStep?.(startStep.id)}
              className="cursor-pointer group"
            >
              <rect
                x="215"
                y="5"
                width="110"
                height="35"
                rx="8"
                fill={isSelected(startStep.id) ? '#dbeafe' : '#ffffff'}
                stroke={isSelected(startStep.id) ? '#2563eb' : '#000000'}
                strokeWidth={isSelected(startStep.id) ? '2' : '1.2'}
              />
              <text x="270" y="27" textAnchor="middle" fontSize="12" fontWeight="600" fill="#111827">
                {startStep.label}
              </text>
            </g>

            {/* Node: 1) 초기화 */}
            <g onClick={() => onSelectStep?.(s1.id)} className="cursor-pointer group">
              <rect
                x="210"
                y="73"
                width="120"
                height="35"
                fill={isSelected(s1.id) ? '#dbeafe' : '#ffffff'}
                stroke={isSelected(s1.id) ? '#2563eb' : '#000000'}
                strokeWidth={isSelected(s1.id) ? '2' : '1.2'}
              />
              <text x="270" y="95" textAnchor="middle" fontSize="11.5" fontWeight="500" fill="#111827">
                {s1.label}
              </text>
            </g>

            {/* Node: 2) 선택화면 */}
            <g onClick={() => onSelectStep?.(s2.id)} className="cursor-pointer group">
              <rect
                x="210"
                y="149"
                width="120"
                height="35"
                fill={isSelected(s2.id) ? '#dbeafe' : '#ffffff'}
                stroke={isSelected(s2.id) ? '#2563eb' : '#000000'}
                strokeWidth={isSelected(s2.id) ? '2' : '1.2'}
              />
              <text x="270" y="171" textAnchor="middle" fontSize="11.5" fontWeight="500" fill="#111827">
                {s2.label}
              </text>
            </g>

            {/* Node: 3) 입력값 점검 */}
            <g onClick={() => onSelectStep?.(s3.id)} className="cursor-pointer group">
              <rect
                x="210"
                y="225"
                width="120"
                height="35"
                fill={isSelected(s3.id) ? '#dbeafe' : '#ffffff'}
                stroke={isSelected(s3.id) ? '#2563eb' : '#000000'}
                strokeWidth={isSelected(s3.id) ? '2' : '1.2'}
              />
              <text x="270" y="247" textAnchor="middle" fontSize="11.5" fontWeight="500" fill="#111827">
                {s3.label}
              </text>
            </g>

            {/* Node: 처리 옵션 (Diamond) */}
            <g onClick={() => onSelectStep?.(decOpt.id)} className="cursor-pointer group">
              <polygon
                points="270,295 325,315 270,335 215,315"
                fill={isSelected(decOpt.id) ? '#dbeafe' : '#ffffff'}
                stroke={isSelected(decOpt.id) ? '#2563eb' : '#000000'}
                strokeWidth={isSelected(decOpt.id) ? '2' : '1.2'}
              />
              <text x="270" y="319" textAnchor="middle" fontSize="11" fontWeight="500" fill="#111827">
                {decOpt.label}
              </text>
            </g>

            {/* Node: 4) 조회 */}
            <g onClick={() => onSelectStep?.(s4.id)} className="cursor-pointer group">
              <rect
                x="142"
                y="358"
                width="106"
                height="36"
                fill={isSelected(s4.id) ? '#dbeafe' : '#ffffff'}
                stroke={isSelected(s4.id) ? '#2563eb' : '#000000'}
                strokeWidth={isSelected(s4.id) ? '2' : '1.2'}
              />
              <text x="195" y="380" textAnchor="middle" fontSize="11.5" fontWeight="500" fill="#111827">
                {s4.label}
              </text>
            </g>

            {/* Node: 5) 생성 */}
            <g onClick={() => onSelectStep?.(s5.id)} className="cursor-pointer group">
              <rect
                x="295"
                y="358"
                width="106"
                height="36"
                fill={isSelected(s5.id) ? '#dbeafe' : '#ffffff'}
                stroke={isSelected(s5.id) ? '#2563eb' : '#000000'}
                strokeWidth={isSelected(s5.id) ? '2' : '1.2'}
              />
              <text x="348" y="380" textAnchor="middle" fontSize="11.5" fontWeight="500" fill="#111827">
                {s5.label}
              </text>
            </g>

            {/* Node: 5-1) 엑셀 업로드 */}
            <g onClick={() => onSelectStep?.(s5_1.id)} className="cursor-pointer group">
              <rect
                x="295"
                y="434"
                width="106"
                height="36"
                fill={isSelected(s5_1.id) ? '#dbeafe' : '#ffffff'}
                stroke={isSelected(s5_1.id) ? '#2563eb' : '#000000'}
                strokeWidth={isSelected(s5_1.id) ? '2' : '1.2'}
              />
              <text x="348" y="456" textAnchor="middle" fontSize="11.5" fontWeight="500" fill="#111827">
                {s5_1.label}
              </text>
            </g>

            {/* Node: 6) 데이터 가공 */}
            <g onClick={() => onSelectStep?.(s6.id)} className="cursor-pointer group">
              <rect
                x="205"
                y="513"
                width="130"
                height="38"
                fill={isSelected(s6.id) ? '#dbeafe' : '#ffffff'}
                stroke={isSelected(s6.id) ? '#2563eb' : '#000000'}
                strokeWidth={isSelected(s6.id) ? '2' : '1.2'}
              />
              <text x="270" y="536" textAnchor="middle" fontSize="11.5" fontWeight="600" fill="#111827">
                {s6.label}
              </text>
            </g>

            {/* Node: 7) 100번 화면 호출 */}
            <g onClick={() => onSelectStep?.(s7.id)} className="cursor-pointer group">
              <rect
                x="205"
                y="584"
                width="130"
                height="36"
                fill={isSelected(s7.id) ? '#dbeafe' : '#ffffff'}
                stroke={isSelected(s7.id) ? '#2563eb' : '#000000'}
                strokeWidth={isSelected(s7.id) ? '2' : '1.2'}
              />
              <text x="270" y="606" textAnchor="middle" fontSize="11.5" fontWeight="500" fill="#111827">
                {s7.label}
              </text>
            </g>

            {/* Node: 사용자 명령 (Diamond) */}
            <g onClick={() => onSelectStep?.(decCmd.id)} className="cursor-pointer group">
              <polygon
                points="270,655 325,675 270,695 215,675"
                fill={isSelected(decCmd.id) ? '#dbeafe' : '#ffffff'}
                stroke={isSelected(decCmd.id) ? '#2563eb' : '#000000'}
                strokeWidth={isSelected(decCmd.id) ? '2' : '1.2'}
              />
              <text x="270" y="679" textAnchor="middle" fontSize="11" fontWeight="500" fill="#111827">
                {decCmd.label}
              </text>
            </g>

            {/* Node: 7-1) 종료 */}
            <g onClick={() => onSelectStep?.(s7_1.id)} className="cursor-pointer group">
              <rect
                x="142"
                y="724"
                width="106"
                height="36"
                fill={isSelected(s7_1.id) ? '#dbeafe' : '#ffffff'}
                stroke={isSelected(s7_1.id) ? '#2563eb' : '#000000'}
                strokeWidth={isSelected(s7_1.id) ? '2' : '1.2'}
              />
              <text x="195" y="746" textAnchor="middle" fontSize="11.5" fontWeight="500" fill="#111827">
                {s7_1.label}
              </text>
            </g>

            {/* Node: 7-2) 생성 */}
            <g onClick={() => onSelectStep?.(s7_2.id)} className="cursor-pointer group">
              <rect
                x="295"
                y="724"
                width="106"
                height="36"
                fill={isSelected(s7_2.id) ? '#dbeafe' : '#ffffff'}
                stroke={isSelected(s7_2.id) ? '#2563eb' : '#000000'}
                strokeWidth={isSelected(s7_2.id) ? '2' : '1.2'}
              />
              <text x="348" y="746" textAnchor="middle" fontSize="11.5" fontWeight="500" fill="#111827">
                {s7_2.label}
              </text>
            </g>

            {/* Node: BAPI 실행 (Diamond) */}
            <g onClick={() => onSelectStep?.(decBapi.id)} className="cursor-pointer group">
              <polygon
                points="348,795 403,815 348,835 293,815"
                fill={isSelected(decBapi.id) ? '#dbeafe' : '#ffffff'}
                stroke={isSelected(decBapi.id) ? '#2563eb' : '#000000'}
                strokeWidth={isSelected(decBapi.id) ? '2' : '1.2'}
              />
              <text x="348" y="819" textAnchor="middle" fontSize="11" fontWeight="500" fill="#111827">
                {decBapi.label}
              </text>
            </g>

            {/* Node: 7-2-1) 생성 성공 */}
            <g onClick={() => onSelectStep?.(s7_2_1.id)} className="cursor-pointer group">
              <rect
                x="220"
                y="868"
                width="108"
                height="36"
                fill={isSelected(s7_2_1.id) ? '#dbeafe' : '#ffffff'}
                stroke={isSelected(s7_2_1.id) ? '#2563eb' : '#000000'}
                strokeWidth={isSelected(s7_2_1.id) ? '2' : '1.2'}
              />
              <text x="274" y="890" textAnchor="middle" fontSize="11" fontWeight="500" fill="#111827">
                {s7_2_1.label}
              </text>
            </g>

            {/* Node: 7-2-2) 생성 실패 */}
            <g onClick={() => onSelectStep?.(s7_2_2.id)} className="cursor-pointer group">
              <rect
                x="365"
                y="868"
                width="108"
                height="36"
                fill={isSelected(s7_2_2.id) ? '#dbeafe' : '#ffffff'}
                stroke={isSelected(s7_2_2.id) ? '#2563eb' : '#000000'}
                strokeWidth={isSelected(s7_2_2.id) ? '2' : '1.2'}
              />
              <text x="419" y="890" textAnchor="middle" fontSize="11" fontWeight="500" fill="#111827">
                {s7_2_2.label}
              </text>
            </g>

            {/* Node: 종료 (End) */}
            <g onClick={() => onSelectStep?.(endStep.id)} className="cursor-pointer group">
              <rect
                x="215"
                y="952"
                width="110"
                height="35"
                rx="8"
                fill={isSelected(endStep.id) ? '#dbeafe' : '#ffffff'}
                stroke={isSelected(endStep.id) ? '#2563eb' : '#000000'}
                strokeWidth={isSelected(endStep.id) ? '2' : '1.2'}
              />
              <text x="270" y="974" textAnchor="middle" fontSize="12" fontWeight="600" fill="#111827">
                {endStep.label}
              </text>
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
};
