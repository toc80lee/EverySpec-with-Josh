import { ProgramSpec } from '../types/sap';

export function generateSpecMarkdown(spec: ProgramSpec): string {
  return `# [SAP 프로그램 개발 사양서] ${spec.title} (${spec.program_id})

## 1. 문서 관리 정보
- **프로젝트명**: SAP ERP 고도화 및 운영 개발
- **프로그램 ID**: \`${spec.program_id}\`
- **트랜잭션 코드 (T-Code)**: \`${spec.tcode}\`
- **모듈 (Module)**: ${spec.module}
- **프로그램 유형**: ${spec.program_type === 'REPORT' ? 'ALV Report (OOP: CL_GUI_ALV_GRID)' : '온라인 트랜잭션 (Dialog/Dynpro)'}
- **작성자**: ${spec.author}
- **작성일자**: ${spec.created_date}
- **대상 SAP 버전**: ${spec.target_sap_release}

---

## 2. 업무 개요 및 개발 목적
${spec.business_purpose}

---

## 3. 선택 화면 (Selection Screen) 명세
| 구분 | 파라미터명 | 파라미터 설명 | 참조테이블-필드 | 타입(길이) | 필수여부 | 기본값 | 메모리ID |
|:---|:---|:---|:---|:---|:---:|:---|:---|
${spec.selection_params.map(p => `| ${p.kind === 'PARAMETER' ? 'PARAMETER' : 'SELECT-OPTIONS'} | \`${p.name}\` | ${p.text} | ${p.ref_table ? `\`${p.ref_table}-${p.ref_field}\`` : '-'} | ${p.datatype}(${p.length}) | ${p.obligatory ? 'Y' : 'N'} | ${p.default_val || '-'} | ${p.memory_id || '-'} |`).join('\n')}

---

## 4. ALV 그리드 필드 카탈로그 명세서 (Field Catalog: LVC_T_FCAT)
| No | 필드명 (FIELDNAME) | 컬럼명 (COLTEXT) | 타입 | 길이 | 정렬 | Key | Hotspot | Chk | Edit | Sum | 참조테이블-필드 | 드릴다운 T-Code |
|:---:|:---|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---|:---|
${spec.field_catalog.map(f => `| ${f.col_pos} | \`${f.fieldname}\` | ${f.coltext} | ${f.datatype} | ${f.outputlen} | ${f.just} | ${f.key ? 'O' : '-'} | ${f.hotspot ? 'O' : '-'} | ${f.checkbox ? 'O' : '-'} | ${f.edit ? 'O' : '-'} | ${f.do_sum ? 'O' : '-'} | ${f.ref_table ? `\`${f.ref_table}-${f.ref_field}\`` : '-'} | ${f.drilldown_tcode ? `\`${f.drilldown_tcode}\`` : '-'} |`).join('\n')}

---

## 5. ALV 레이아웃 및 툴바 기능 명세
- **얼룩말 줄무늬 (gs_layo-zebra)**: ${spec.layout.zebra ? '적용 (X)' : '미적용'}
- **그리드 타이틀**: ${spec.layout.grid_title || spec.title}
- **선택 모드 (gs_layo-sel_mode)**: ${spec.layout.sel_mode} (A: 복수 행/열 선택)
- **컬럼폭 최적화 (gs_layo-cwidth_opt)**: ${spec.layout.cwidth_opt ? '적용 (X)' : '미적용'}
- **예외 신호등 필드**: \`${spec.layout.excp_fname || 'LIGHTS'}\` (1: 녹색-정상, 2: 황색-진행중, 3: 적색-오류)

### 사용자 정의 툴바 버튼
${spec.custom_toolbar.length > 0 ? spec.custom_toolbar.map(b => `- **[${b.text}]** (\`${b.function}\`): ${b.quickinfo}`).join('\n') : '- 표준 ALV 툴바 기능만 사용'}

---

## 6. 데이터 추출 및 가공 로직 명세
\`\`\`sql
${spec.data_extraction_logic}
\`\`\`

---

## 7. 테스트 케이스 및 시나리오
| 번호 | 테스트 시나리오 | 입력 조건 | 예상 결과 |
|:---:|:---|:---|:---|
${spec.test_cases.length > 0 ? spec.test_cases.map((tc, idx) => `| ${idx + 1} | ${tc.scenario} | ${tc.condition} | ${tc.expected} |`).join('\n') : '| 1 | 정상 조회 테스트 | 기본 파라미터 입력 | ALV 그리드 결과 정상 표시 |'}
`;
}

export function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportFieldCatalogCsv(spec: ProgramSpec): string {
  const headers = ['No', 'FIELDNAME', 'COLTEXT', 'DATATYPE', 'OUTPUTLEN', 'JUST', 'KEY', 'HOTSPOT', 'CHECKBOX', 'EDIT', 'DO_SUM', 'REF_TABLE', 'REF_FIELD', 'DRILLDOWN'];
  const rows = spec.field_catalog.map(f => [
    f.col_pos,
    f.fieldname,
    `"${f.coltext.replace(/"/g, '""')}"`,
    f.datatype,
    f.outputlen,
    f.just,
    f.key ? 'X' : '',
    f.hotspot ? 'X' : '',
    f.checkbox ? 'X' : '',
    f.edit ? 'X' : '',
    f.do_sum ? 'X' : '',
    f.ref_table || '',
    f.ref_field || '',
    f.drilldown_tcode || '',
  ]);
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}
