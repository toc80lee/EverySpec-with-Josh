/**
 * AI Data Extraction Logic Generator
 */

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
