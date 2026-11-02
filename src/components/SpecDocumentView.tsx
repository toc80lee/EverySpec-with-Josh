import React from 'react';
import { Printer, Download, FileText, Share2, Upload } from 'lucide-react';
import { ProgramSpec } from '../types/sap';
import { generateSpecMarkdown, downloadFile, exportFieldCatalogCsv } from '../utils/specExport';

interface SpecDocumentViewProps {
  spec: ProgramSpec;
  onImportSpec?: (imported: ProgramSpec) => void;
}

export const SpecDocumentView: React.FC<SpecDocumentViewProps> = ({ spec, onImportSpec }) => {
  // Download Markdown
  const handleDownloadMarkdown = () => {
    const md = generateSpecMarkdown(spec);
    downloadFile(`${spec.program_id}_SPECIFICATION.md`, md, 'text/markdown;charset=utf-8;');
  };

  // Download Field Catalog CSV
  const handleDownloadCsv = () => {
    const csv = exportFieldCatalogCsv(spec);
    downloadFile(`${spec.program_id}_FIELDCATALOG.csv`, '\uFEFF' + csv, 'text/csv;charset=utf-8;');
  };

  // Export JSON
  const handleExportJson = () => {
    const jsonStr = JSON.stringify(spec, null, 2);
    downloadFile(`${spec.program_id}_SPEC.json`, jsonStr, 'application/json');
  };

  // Import JSON
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onImportSpec) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.program_id && parsed.field_catalog) {
          onImportSpec(parsed);
        }
      } catch (err) {
        alert('올바른 사양서 JSON 파일이 아닙니다.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col h-full bg-slate-100 rounded-xl overflow-hidden border border-slate-300 shadow-sm font-sans">
      {/* Top Action Bar (hidden in print) */}
      <div className="no-print flex items-center justify-between px-5 py-3 bg-white border-b border-slate-200">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-700" />
          <div>
            <h3 className="text-xs font-bold text-slate-900">
              SAP 프로그램 개발 사양서 (Functional & Technical Specification)
            </h3>
            <p className="text-[11px] text-slate-500">
              고객사 및 프로젝트 감리용 표준 산출물 형식의 완성된 명세서 문서입니다.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-semibold transition-colors shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>인쇄 / PDF 저장</span>
          </button>

          <button
            onClick={handleDownloadMarkdown}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 rounded text-xs font-semibold border border-slate-300 transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Markdown 다운로드</span>
          </button>

          <button
            onClick={handleDownloadCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded text-xs font-semibold border border-emerald-300 transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>필드 카탈로그 CSV</span>
          </button>

          <button
            onClick={handleExportJson}
            title="사양서 JSON 백업 저장"
            className="p-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {onImportSpec && (
            <label
              title="사양서 JSON 불러오기"
              className="p-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <input
                type="file"
                accept=".json"
                onChange={handleImportJson}
                className="hidden"
              />
            </label>
          )}
        </div>
      </div>

      {/* Printable Specification Document Canvas */}
      <div className="flex-1 overflow-y-auto p-8 bg-slate-100 flex justify-center">
        <div className="w-full max-w-4xl bg-white p-10 rounded shadow-md border border-slate-300 print:border-none print:shadow-none print:p-0 text-slate-900 space-y-8">
          {/* Document Header & Approval Box */}
          <div className="border-b-2 border-slate-900 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold tracking-widest text-blue-700 uppercase">
                  SAP ERP ABAP Development Specification
                </span>
                <h1 className="text-2xl font-extrabold text-slate-900 mt-1">
                  프로그램 개발 사양서
                </h1>
                <div className="text-sm font-semibold text-slate-600 mt-0.5">
                  [{spec.program_id}] {spec.title}
                </div>
              </div>

              {/* Approval stamp matrix */}
              <table className="border-collapse border border-slate-400 text-xs text-center w-48 font-sans">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-400">
                    <th className="p-1 border-r border-slate-400 font-medium">작성자</th>
                    <th className="p-1 border-r border-slate-400 font-medium">검토자</th>
                    <th className="p-1 font-medium">승인자</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="h-12 border-b border-slate-300">
                    <td className="p-1 border-r border-slate-400 align-bottom text-[11px] text-slate-700">
                      {spec.author.split(' ')[0] || '작성'}
                    </td>
                    <td className="p-1 border-r border-slate-400 align-bottom text-[11px] text-slate-400">
                      (인)
                    </td>
                    <td className="p-1 align-bottom text-[11px] text-slate-400">
                      (인)
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 1. 문서 관리 정보 */}
          <section className="space-y-2">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 pb-1 border-b border-slate-200">
              <span className="w-2 h-2 bg-blue-600 rounded-xs"></span>
              1. 문서 관리 정보
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-3 rounded border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">프로그램 ID</span>
                <span className="font-mono font-bold text-blue-900">{spec.program_id}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">트랜잭션 코드 (T-Code)</span>
                <span className="font-mono font-bold text-blue-900">{spec.tcode}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">SAP 모듈</span>
                <span className="font-semibold text-slate-800">{spec.module} 모듈</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">프로그램 유형</span>
                <span className="font-semibold text-slate-800">
                  {spec.program_type === 'REPORT' ? 'ALV Report (OOP: CL_GUI_ALV_GRID)' : '온라인 대화형 (Dynpro)'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">작성자</span>
                <span className="font-semibold text-slate-800">{spec.author}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">작성 일자</span>
                <span className="font-mono text-slate-800">{spec.created_date}</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500 block text-[11px]">대상 SAP 시스템 버전</span>
                <span className="font-medium text-slate-800">{spec.target_sap_release}</span>
              </div>
            </div>
          </section>

          {/* 2. 업무 개요 및 개발 목적 */}
          <section className="space-y-2">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 pb-1 border-b border-slate-200">
              <span className="w-2 h-2 bg-blue-600 rounded-xs"></span>
              2. 업무 개요 및 개발 목적
            </h2>
            <div className="p-4 bg-slate-50 rounded border border-slate-200 text-xs leading-relaxed whitespace-pre-line text-slate-800">
              {spec.business_purpose}
            </div>
          </section>

          {/* 3. 선택 화면 정의 */}
          <section className="space-y-2">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 pb-1 border-b border-slate-200">
              <span className="w-2 h-2 bg-blue-600 rounded-xs"></span>
              3. 선택 화면 (Selection Screen) 명세
            </h2>
            <div className="border border-slate-300 rounded overflow-hidden">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 font-semibold text-[11px]">
                  <tr>
                    <th className="p-2 border-r border-slate-200 w-24">구분</th>
                    <th className="p-2 border-r border-slate-200 w-28">변수명</th>
                    <th className="p-2 border-r border-slate-200">선택 화면 텍스트</th>
                    <th className="p-2 border-r border-slate-200 w-28">참조 테이블/필드</th>
                    <th className="p-2 border-r border-slate-200 w-16 text-center">필수</th>
                    <th className="p-2 w-24">기본값</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                  {spec.selection_params.map((p) => (
                    <tr key={p.id}>
                      <td className="p-2 border-r border-slate-200 font-sans font-medium text-slate-600">
                        {p.kind === 'PARAMETER' ? 'PARAMETERS' : 'SELECT-OPTIONS'}
                      </td>
                      <td className="p-2 border-r border-slate-200 font-bold text-blue-900">
                        {p.name}
                      </td>
                      <td className="p-2 border-r border-slate-200 font-sans text-slate-800">
                        {p.text}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-slate-600">
                        {p.ref_table ? `${p.ref_table}-${p.ref_field}` : '-'}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-center font-bold">
                        {p.obligatory ? (
                          <span className="text-red-600">Y</span>
                        ) : (
                          <span className="text-slate-400">N</span>
                        )}
                      </td>
                      <td className="p-2 text-slate-700">{p.default_val || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 4. ALV 그리드 필드 카탈로그 명세서 */}
          <section className="space-y-2 page-break">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 pb-1 border-b border-slate-200">
              <span className="w-2 h-2 bg-blue-600 rounded-xs"></span>
              4. ALV 그리드 필드 카탈로그 명세서 (LVC_T_FCAT)
            </h2>
            <div className="border border-slate-300 rounded overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 font-semibold text-[11px]">
                  <tr>
                    <th className="p-1.5 border-r border-slate-200 text-center w-8">No</th>
                    <th className="p-1.5 border-r border-slate-200 min-w-24">필드명</th>
                    <th className="p-1.5 border-r border-slate-200 min-w-28">컬럼명 (라벨)</th>
                    <th className="p-1.5 border-r border-slate-200 w-16">타입</th>
                    <th className="p-1.5 border-r border-slate-200 text-center w-10">길이</th>
                    <th className="p-1.5 border-r border-slate-200 text-center w-10">정렬</th>
                    <th className="p-1.5 border-r border-slate-200 text-center w-10">Key</th>
                    <th className="p-1.5 border-r border-slate-200 text-center w-10">Link</th>
                    <th className="p-1.5 border-r border-slate-200 text-center w-10">Chk</th>
                    <th className="p-1.5 border-r border-slate-200 text-center w-10">Edit</th>
                    <th className="p-1.5 border-r border-slate-200 text-center w-10">Sum</th>
                    <th className="p-1.5 border-r border-slate-200 min-w-24">참조 테이블/필드</th>
                    <th className="p-1.5 min-w-20">드릴다운</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                  {spec.field_catalog.map((f) => (
                    <tr key={f.fieldname} className="hover:bg-slate-50">
                      <td className="p-1.5 border-r border-slate-200 text-center text-slate-500">
                        {f.col_pos}
                      </td>
                      <td className="p-1.5 border-r border-slate-200 font-bold text-slate-900">
                        {f.fieldname}
                      </td>
                      <td className="p-1.5 border-r border-slate-200 font-sans text-slate-800">
                        {f.coltext}
                      </td>
                      <td className="p-1.5 border-r border-slate-200 text-slate-600">{f.datatype}</td>
                      <td className="p-1.5 border-r border-slate-200 text-center">{f.outputlen}</td>
                      <td className="p-1.5 border-r border-slate-200 text-center">{f.just}</td>
                      <td className="p-1.5 border-r border-slate-200 text-center font-bold text-blue-700">
                        {f.key ? 'O' : '-'}
                      </td>
                      <td className="p-1.5 border-r border-slate-200 text-center font-bold text-indigo-700">
                        {f.hotspot ? 'O' : '-'}
                      </td>
                      <td className="p-1.5 border-r border-slate-200 text-center">
                        {f.checkbox ? 'O' : '-'}
                      </td>
                      <td className="p-1.5 border-r border-slate-200 text-center">
                        {f.edit ? 'O' : '-'}
                      </td>
                      <td className="p-1.5 border-r border-slate-200 text-center font-bold text-emerald-700">
                        {f.do_sum ? 'O' : '-'}
                      </td>
                      <td className="p-1.5 border-r border-slate-200 text-[10px] text-slate-500">
                        {f.ref_table ? `${f.ref_table}-${f.ref_field}` : '-'}
                      </td>
                      <td className="p-1.5 text-[10px] text-blue-700">
                        {f.drilldown_tcode ? `${f.drilldown_tcode}` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 5. 처리 로직 명세 */}
          <section className="space-y-2">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 pb-1 border-b border-slate-200">
              <span className="w-2 h-2 bg-blue-600 rounded-xs"></span>
              5. 데이터 추출 및 업무 처리 로직 명세
            </h2>
            <div className="p-4 bg-slate-900 text-slate-100 rounded border border-slate-800 font-mono text-xs leading-relaxed whitespace-pre-line">
              {spec.data_extraction_logic}
            </div>
          </section>

          {/* 6. 테스트 케이스 및 시나리오 */}
          <section className="space-y-2">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 pb-1 border-b border-slate-200">
              <span className="w-2 h-2 bg-blue-600 rounded-xs"></span>
              6. 테스트 케이스 명세
            </h2>
            <div className="border border-slate-300 rounded overflow-hidden">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 font-semibold text-[11px]">
                  <tr>
                    <th className="p-2 border-r border-slate-200 text-center w-10">No</th>
                    <th className="p-2 border-r border-slate-200 w-44">시나리오 (Scenario)</th>
                    <th className="p-2 border-r border-slate-200">입력 조건 (Condition)</th>
                    <th className="p-2">예상 결과 (Expected Result)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-[11px]">
                  {spec.test_cases.map((tc, idx) => (
                    <tr key={tc.id}>
                      <td className="p-2 border-r border-slate-200 text-center font-mono text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="p-2 border-r border-slate-200 font-medium text-slate-800">
                        {tc.scenario}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-slate-700">
                        {tc.condition}
                      </td>
                      <td className="p-2 font-medium text-emerald-900">
                        {tc.expected}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
