import { ProgramSpec } from '../types/sap';

/**
 * AI Data Extraction Logic Generator & Context-Aware Markdown Suggestion
 */

export interface MarkdownSuggestionRequest {
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
  currentValue?: string;
}

export async function requestMarkdownAiSuggestion(
  req: MarkdownSuggestionRequest
): Promise<{ markdown: string; source: 'ai' | 'fallback'; error?: string }> {
  const { spec, section, sectionTitle, nodeInfo, currentValue } = req;

  try {
    const res = await fetch('/api/suggest-markdown', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        section,
        sectionTitle,
        programInfo: {
          program_id: spec.program_id,
          tcode: spec.tcode,
          title: spec.title,
          module: spec.module,
          sample_type: spec.sample_type || '01',
          target_sap_release: spec.target_sap_release,
          cds_view_table: spec.cds_view_table,
          business_purpose: spec.business_purpose,
        },
        selectionParams: spec.selection_params || [],
        fieldCatalog: spec.field_catalog || [],
        itemFieldCatalog: spec.item_grid?.field_catalog || [],
        layout: spec.layout,
        customToolbar: spec.custom_toolbar || [],
        nodeInfo,
        currentValue,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && typeof data.markdown === 'string' && data.markdown.trim()) {
        return { markdown: data.markdown.trim(), source: 'ai' };
      }
    }
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `서버 응답 오류 (${res.status})`);
  } catch (err: any) {
    console.warn('Backend AI markdown suggestion failed, using screen-aware fallback:', err);
    const fallback = generateSmartMarkdownFallback(req);
    return { markdown: fallback, source: 'fallback', error: err.message };
  }
}

function generateSmartMarkdownFallback(req: MarkdownSuggestionRequest): string {
  const { section, spec, nodeInfo } = req;
  const sampleTypeLabel =
    spec.sample_type === '02'
      ? 'Master-Detail 2-Grid ALV'
      : spec.sample_type === '03'
      ? 'Tree ALV Grid'
      : spec.sample_type === '04'
      ? 'Multi-Dimensional Pivot Browser'
      : 'Single ALV Grid';

  const paramList = (spec.selection_params || [])
    .slice(0, 6)
    .map((p) => `\`${p.name}\`(${p.text || p.datatype}${p.obligatory ? ', 필수' : ''})`)
    .join(', ');

  const refTables = Array.from(
    new Set(
      [...(spec.field_catalog || []), ...(spec.item_grid?.field_catalog || [])]
        .map((f) => f.ref_table?.trim().toUpperCase())
        .filter(Boolean)
    )
  );
  if (spec.cds_view_table?.trim()) {
    refTables.unshift(spec.cds_view_table.trim().toUpperCase());
  }

  const keyFields = (spec.field_catalog || [])
    .filter((f) => f.key && f.fieldname !== 'ZICON')
    .map((f) => `\`${f.fieldname}\`(${f.coltext})`)
    .join(', ');

  const sumFields = (spec.field_catalog || [])
    .filter((f) => f.do_sum)
    .map((f) => `\`${f.fieldname}\`(${f.coltext})`)
    .join(', ');

  const hotspotFields = (spec.field_catalog || [])
    .filter((f) => f.hotspot)
    .map((f) => `\`${f.fieldname}\`${f.drilldown_tcode ? ` → ${f.drilldown_tcode}` : ''}`)
    .join(', ');

  const toolbarText = (spec.custom_toolbar || [])
    .filter((b) => b.visible !== false)
    .map((b) => `\`${b.function}\`(${b.text || b.quickinfo || '기능'})`)
    .join(', ');

  if (section === 'business_purpose') {
    return `### 1. 개발 목적 및 업무 배경 (${spec.module} / ${spec.program_id})
- **프로그램명**: ${spec.title} (\`${spec.tcode || 'ZREP'}\`, ${sampleTypeLabel})
- **주요 목적**: ${paramList ? `${paramList} 조건으로 데이터를 실시간 조회하여` : '업무 조건별 데이터를 조회하여'} 현업 담당자가 직관적으로 현황을 모니터링하고 예외 건을 신속히 조치할 수 있도록 지원함.

### 2. 화면 구성 및 주요 기능
- **출력 구조**: ${sampleTypeLabel}${spec.layout?.grid_title ? ` (\`${spec.layout.grid_title}\`)` : ''} 기반 ${spec.field_catalog?.length || 0}개 컬럼 구성${spec.sample_type === '02' ? ` 및 하단 품목(${spec.item_grid?.field_catalog?.length || 0}개 컬럼) 연동` : ''}
- **참조 테이블**: ${refTables.length > 0 ? refTables.map((t) => `\`${t}\``).join(', ') : `${spec.module} 표준 원천 테이블`}${hotspotFields ? `\n- **드릴다운 연계**: ${hotspotFields} 클릭 시 상세 전표 조회` : ''}${sumFields ? `\n- **집계 항목**: ${sumFields} 자동 합계 제공` : ''}${toolbarText ? `\n- **사용자 기능**: ${toolbarText}` : ''}`;
  }

  if (section === 'data_extraction_logic') {
    return generateSmartFallbackLogic({
      business_purpose: spec.business_purpose || '',
      module: spec.module,
      program_id: spec.program_id,
      title: spec.title,
      existing_fields: (spec.field_catalog || []).map((f) => f.fieldname),
    });
  }

  // section === 'data_flow_node'
  const nId = nodeInfo?.id || 'A';
  const nLabel = nodeInfo?.label || '단계 처리';
  const prevText = nodeInfo?.prevNodes?.length ? nodeInfo.prevNodes.join(', ') : '프로그램 기동';
  const nextText = nodeInfo?.nextNodes?.length ? nodeInfo.nextNodes.join(', ') : '화면 반환 / 종료';
  const upperLabel = nLabel.toUpperCase();

  if (upperLabel.includes('INITIAL') || upperLabel.includes('시작')) {
    return `### [${nId}] ${nLabel}
- **처리 목적**: \`${spec.program_id}\` (\`${spec.tcode}\`) 실행 시 전역 변수 및 ${sampleTypeLabel} 제어 객체 초기화
- **주요 로직**:
  - ${paramList ? `선택화면 기본값(${paramList}) 자동 세팅` : '조회 기준일자 및 회사코드 기본값 세팅'}
  - \`AUTHORITY-CHECK\`를 통한 ${spec.module} 모듈 실행 권한 검증
- **후속 흐름**: ${nextText}`;
  }

  if (upperLabel.includes('SELECTION') || upperLabel.includes('선택') || upperLabel.includes('조회 조건') || upperLabel.includes('입력')) {
    return `### [${nId}] ${nLabel}
- **선행 단계**: ${prevText}
- **화면 파라미터 구성**: ${paramList || '표준 조회 조건 파라미터'}
- **입력값 검증 규칙**:
  - 필수 입력 항목 누락 여부 및 유효 범위(\`LOW <= HIGH\`) 점검
  - 오류 발생 시 \`MESSAGE E001\` 출력 및 해당 입력 필드로 커서 이동
- **후속 흐름**: ${nextText}`;
  }

  if (upperLabel.includes('SELECT') || upperLabel.includes('추출') || upperLabel.includes('조회') || nodeInfo?.shape === 'cylinder') {
    return `### [${nId}] ${nLabel}
- **선행 단계**: ${prevText}
- **대상 테이블**: ${refTables.length > 0 ? refTables.map((t) => `\`${t}\``).join(', ') : `${spec.module} 원천 테이블`}
- **추출 및 조인 로직**:
  - 선택 조건(${paramList || '조회 조건'}) 기반으로 원천 테이블 조회 후 \`GT_DATA\` 적재
  - 키 필드(${keyFields || '주요 식별자'}) 기준 정렬 및 불필요한 중복 조회 방지(\`FOR ALL ENTRIES\` 전 \`IS NOT INITIAL\` 체크)
- **후속 흐름**: ${nextText}`;
  }

  if (upperLabel.includes('ALV') || upperLabel.includes('PBO') || upperLabel.includes('출력') || upperLabel.includes('바인딩') || upperLabel.includes('갱신')) {
    return `### [${nId}] ${nLabel}
- **선행 단계**: ${prevText}
- **화면 구성 (${sampleTypeLabel})**:
  - 그리드 타이틀: \`${spec.layout?.grid_title || spec.title}\` (Zebra: ${spec.layout?.zebra ? 'ON' : 'OFF'}, 선택모드: \`${spec.layout?.sel_mode || 'A'}\`)
  - 필드 카탈로그(${spec.field_catalog?.length || 0}개 컬럼) 및 신호등(\`ZICON\`) 바인딩${sumFields ? `\n  - 자동 합계(\`DO_SUM\`): ${sumFields}` : ''}${toolbarText ? `\n  - 툴바 버튼: ${toolbarText}` : ''}
- **호출 메서드**: \`SET_TABLE_FOR_FIRST_DISPLAY\` / \`REFRESH_TABLE_DISPLAY\`
- **후속 흐름**: ${nextText}`;
  }

  if (upperLabel.includes('PAI') || upperLabel.includes('명령') || upperLabel.includes('드릴다운') || upperLabel.includes('이벤트') || upperLabel.includes('BAPI')) {
    return `### [${nId}] ${nLabel}
- **선행 단계**: ${prevText}
- **이벤트 및 사용자 명령 처리**:${hotspotFields ? `\n  - 핫스팟/더블클릭 드릴다운: ${hotspotFields}` : '\n  - 행 선택/더블클릭 이벤트 핸들러(`HANDLE_DOUBLE_CLICK`, `HANDLE_HOTSPOT_CLICK`) 처리'}${toolbarText ? `\n  - 커스텀 툴바(\`USER_COMMAND\`): ${toolbarText}` : ''}
  - 처리 완료 후 \`REFRESH_TABLE_DISPLAY\`로 화면 최신 상태 반영
- **후속 흐름**: ${nextText}`;
  }

  return `### [${nId}] ${nLabel}
- **선행 단계**: ${prevText}
- **처리 사양 (${spec.program_id} / ${sampleTypeLabel})**:
  - ${refTables.length > 0 ? `참조 테이블(${refTables.map((t) => `\`${t}\``).join(', ')}) 기반으로` : '내부 테이블 데이터 기준으로'} 해당 단계의 비즈니스 검증 및 가공 로직 수행
  - 주요 관리 필드: ${keyFields || `${spec.field_catalog?.length || 0}개 출력 컬럼`}
- **후속 흐름**: ${nextText}`;
}

export interface GenerateLogicRequest {
  business_purpose: string;
  module: string;
  program_id: string;
  title: string;
  existing_fields?: string[];
}

export async function requestAiLogicGeneration(req: GenerateLogicRequest): Promise<{ logic: string; source: 'ai' | 'fallback'; error?: string }> {
  try {
    const res = await fetch('/api/generate-logic', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.logic) {
        return { logic: data.logic, source: 'ai' };
      }
    }
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `서버 응답 오류 (${res.status})`);
  } catch (err: any) {
    console.warn('Backend AI generation failed, using intelligent rule-based SAP architect generator:', err);
    // Intelligent fallback generator tailored to the SAP module
    const fallback = generateSmartFallbackLogic(req);
    return { logic: fallback, source: 'fallback', error: err.message };
  }
}

function generateSmartFallbackLogic(req: GenerateLogicRequest): string {
  const mod = (req.module || 'CO').toUpperCase();
  const purpose = req.business_purpose || '';

  if (mod === 'CO') {
    return `1. 대상 테이블 및 조회 조건:
- CSKS (코스트 센터 마스터): KOKRS = '1000' AND DATBI >= SY-DATUM
- SETNODE / SETLEAF (원가요소/코스트센터 그룹 계층구조): SETCLASS = '0102' / '0101'
- COEP / COSP (코스트 센터 실제/계획 원가 라인 아이템): GJAHR = p_gjahr, KOKRS = p_kokrs

2. 데이터 추출 및 조인 로직:
- 입력된 코스트센터 및 원가요소 그룹(SETNODE)을 재귀(Recursive) 조회하여 하위 개별 원가요소(SETLEAF) 추출
- 추출된 원가요소 키를 바탕으로 COEP(실제 라인아이템)과 CSKS(마스터)를 FOR ALL ENTRIES로 조회
- 회계연도(GJAHR), 기간(PERIO), 코스트센터(KOSTL), 원가요소(KSTAR) 기준으로 내부 테이블(GT_DATA)에 SUM 집계

3. 상태(신호등) 판정 로직 (gs_alv-lights):
- 마스터 미존재 또는 그룹 코드 불일치 시: RED ('3')
- 당월 실적 금액이 0이거나 예산 초과 항목: YELLOW ('2')
- 정상 집계 및 마스터 검증 완료 항목: GREEN ('1')

4. ALV 그리드 가공 로직:
- 상위 노드(SET_NAME) 및 코스트센터 기준으로 정렬 (SORT)
- 통화(WAERK) 참조 지정 및 금액 필드(DMBTR, WKG001) 자동 합계(DO_SUM) 적용`;
  }

  if (mod === 'SD') {
    return `1. 대상 테이블 및 조회 조건:
- VBAK (영업 오더 헤더): VBELN IN s_vbeln, VKORG = p_vkorg, ERDAT IN s_erdat
- VBAP (영업 오더 품목): VBELN = VBAK-VBELN
- VBUK / VBUP (오더 처리 상태): VBELN = VBAK-VBELN
- LIKP / LIPS (출하 납품 헤더 및 품목): VGBEL = VBAP-VBELN
- VBRK / VBRP (대금청구 헤더 및 품목): AUBEL = VBAK-VBELN

2. 데이터 추출 및 조인 로직:
- 선택조건(s_vbeln, s_erdat)으로 VBAK를 조회 후, 결과 키로 VBAP을 FOR ALL ENTRIES 조회
- VBAP 품목별로 LIPS(납품문서)와 VBRP(청구문서) 진행 상태를 조인하여 출하 완료 여부 판정
- 미출하 수량 = VBAP-KWMENG - SUM(LIPS-LFIMG)

3. 상태(신호등) 판정 로직 (gs_alv-lights):
- 여신 블록(CMGST = 'B') 또는 납품 보류(LIFSK ≠ space): RED ('3')
- 출하 진행 중(GBSTK = 'B') 또는 일부 납품 완료: YELLOW ('2')
- 대금청구 및 출하 완료(GBSTK = 'C'): GREEN ('1')

4. ALV 그리드 가공 로직:
- 판매오더 번호(VBELN) 및 품목번호(POSNR) 키 필드 고정
- 순수 판매금액(NETWR) 통화키(WAERK) 연결 및 합계(DO_SUM) 처리`;
  }

  if (mod === 'MM') {
    return `1. 대상 테이블 및 조회 조건:
- EKKO (구매오더 헤더): EBELN IN s_ebeln, BUKRS = p_bukrs, BEDAT IN s_bedat
- EKPO (구매오더 품목): EBELN = EKKO-EBELN, WERKS IN s_werks
- MARA / MAKT (자재 마스터 및 텍스트): MATNR = EKPO-MATNR
- EKBE (구매오더 이력 / 입고 및 송장): EBELN = EKPO-EBELN, EBELP = EKPO-EBELP

2. 데이터 추출 및 조인 로직:
- 발주일자(BEDAT) 및 구매조직 조건으로 EKKO/EKPO 조인 추출
- EKBE를 집계하여 입고 수량(MENGE) 및 송장 검수 금액 산출
- 미입고 잔량 = EKPO-MENGE - SUM(EKBE-MENGE where VGABE = '1')

3. 상태(신호등) 판정 로직 (gs_alv-lights):
- 납기 지연(EINDT < SY-DATUM AND 미입고 잔량 > 0): RED ('3')
- 입고 완료 후 송장 미처리 상태: YELLOW ('2')
- 입고 및 송장 검수 완료: GREEN ('1')

4. ALV 그리드 가공 로직:
- 구매오더 번호 및 자재번호 핫스팟 링크 설정 (ME23N 연계)
- 발주수량, 입고수량, 단가 및 발주금액 합계 표시`;
  }

  return `1. 주요 대상 테이블 및 조회 조건:
- BKPF (회계전표 헤더): BUKRS = p_bukrs, GJAHR = p_gjahr, BUDAT IN s_budat
- BSEG (회계전표 세그먼트): BUKRS = BKPF-BUKRS, BELNR = BKPF-BELNR, GJAHR = BKPF-GJAHR
- SKA1 / SKAT (G/L 계정 마스터 및 계정명): SAKNR = BSEG-HKONT

2. 데이터 추출 및 조인 로직:
- 회계연도 및 전기일자 조건으로 BKPF 추출 후, BSEG 라인 아이템 FOR ALL ENTRIES 조회
- 계정별 차변(SHKZG = 'S')과 대변(SHKZG = 'H') 금액 분리 집계
- 환율(KURSF) 및 전표통화(WAERS) 기준 원화 환산액 산출

3. 상태(신호등) 판정 로직 (gs_alv-lights):
- 대차 불일치 또는 전기 오류: RED ('3')
- 미결제(Open Item) 라인 항목: YELLOW ('2')
- 반제 완료(Cleared Item): GREEN ('1')

4. ALV 그리드 가공 로직:
- 전표번호(BELNR) 핫스팟(FB03) 연결 및 계정별 소계(SUBTOTAL) 처리`;
}
