import { CustomToolbarVariant, AlvToolbarButton } from '../types/sap';

const STORAGE_KEY = 'sap_custom_toolbar_variants';

export const PREDEFINED_TOOLBAR_VARIANTS: CustomToolbarVariant[] = [
  {
    id: 'DEFAULT_EMPTY',
    name: '기본 빈 커스텀 툴바 (Default Blank)',
    description: '커스텀 버튼이 없는 기본 초기 상태입니다.',
    is_builtin: true,
    buttons: [],
  },
  {
    id: '/SD_SALES_ORDER',
    name: '영업 / 출하 관리 (SD Sales & Delivery)',
    description: '주문확정, 출하지시, 세금계산서 발행, 거래명세서 출력',
    is_builtin: true,
    buttons: [
      {
        id: 'cust-sd-01',
        function: 'ZORD_CONF',
        text: '주문확정',
        quickinfo: '영업오더 승인 및 진행 상태 확정',
        icon: 'ICON_CHECKED',
        disabled: false,
        visible: true,
        is_standard: false,
        separator_before: false,
      },
      {
        id: 'cust-sd-02',
        function: 'ZDELIV_CREATE',
        text: '출하지시',
        quickinfo: '출하지시 및 Outbound 납품문서(VL01N) 생성',
        icon: 'ICON_DELIVERY',
        disabled: false,
        visible: true,
        is_standard: false,
        separator_before: false,
      },
      {
        id: 'cust-sd-03',
        function: 'ZBILL_ISSUE',
        text: '세금계산서',
        quickinfo: '대금청구 및 세금계산서(VF01) 발행',
        icon: 'ICON_INVOICE',
        disabled: false,
        visible: true,
        is_standard: false,
        separator_before: false,
      },
      {
        id: 'cust-sd-04',
        function: 'ZPRINT_BL',
        text: '거래명세서',
        quickinfo: '거래명세서 인쇄 및 PDF 문서 출력',
        icon: 'ICON_PRINT',
        disabled: false,
        visible: true,
        is_standard: false,
        separator_before: true,
      },
    ],
  },
  {
    id: '/MM_INVENTORY',
    name: '자재 / 재고 관리 (MM Inventory & Stock)',
    description: '자재출고, 이전전기, 실사확정, 구매발주권고',
    is_builtin: true,
    buttons: [
      {
        id: 'cust-mm-01',
        function: 'ZGOODS_ISSUE',
        text: '자재출고',
        quickinfo: '생산 및 불출용 자재 출고 전기 (mvt 201/261)',
        icon: 'ICON_OUTBOUND',
        disabled: false,
        visible: true,
        is_standard: false,
        separator_before: false,
      },
      {
        id: 'cust-mm-02',
        function: 'ZSTOCK_TRANS',
        text: '이전전기',
        quickinfo: '플랜트/저장위치 간 재고이전 전기 (mvt 311)',
        icon: 'ICON_TRANSFER',
        disabled: false,
        visible: true,
        is_standard: false,
        separator_before: false,
      },
      {
        id: 'cust-mm-03',
        function: 'ZPHYS_INV',
        text: '실사확정',
        quickinfo: '재고실사 차이 전기 및 장부 재고 확정',
        icon: 'ICON_COUNT',
        disabled: false,
        visible: true,
        is_standard: false,
        separator_before: false,
      },
      {
        id: 'cust-mm-04',
        function: 'ZREORDER_ALERT',
        text: '발주요청',
        quickinfo: '안전재고 미달 품목 구매발주(PR) 자동 생성',
        icon: 'ICON_ALERT',
        disabled: false,
        visible: true,
        is_standard: false,
        separator_before: true,
      },
    ],
  },
  {
    id: '/FI_JOURNAL',
    name: '재무 / 전표 관리 (FI Financial & Posting)',
    description: '전표전기, 역분개, 지급제안, 세금계산서 전송',
    is_builtin: true,
    buttons: [
      {
        id: 'cust-fi-01',
        function: 'ZDOC_POST',
        text: '전표전기',
        quickinfo: 'G/L 전표 일괄 자동 전기 (FB50/F-02)',
        icon: 'ICON_POST',
        disabled: false,
        visible: true,
        is_standard: false,
        separator_before: false,
      },
      {
        id: 'cust-fi-02',
        function: 'ZREVERSE',
        text: '역분개',
        quickinfo: '회계 전표 취소 및 반제 역분개 처리 (FB08)',
        icon: 'ICON_CANCEL',
        disabled: false,
        visible: true,
        is_standard: false,
        separator_before: false,
      },
      {
        id: 'cust-fi-03',
        function: 'ZPAY_PROP',
        text: '지급제안',
        quickinfo: '자동 지급 실행 제안서 생성 (F110)',
        icon: 'ICON_PAYMENT',
        disabled: false,
        visible: true,
        is_standard: false,
        separator_before: false,
      },
      {
        id: 'cust-fi-04',
        function: 'ZTAX_INVOICE',
        text: '전자세금전송',
        quickinfo: '국세청 전자세금계산서 API 일괄 전송',
        icon: 'ICON_CALC',
        disabled: false,
        visible: true,
        is_standard: false,
        separator_before: true,
      },
    ],
  },
  {
    id: '/DATA_ANALYTICS',
    name: '데이터 분석 & 전송 (Export & BI Analytics)',
    description: '대용량 CSV추출, 피벗분석, 메일전송, ERP동기화',
    is_builtin: true,
    buttons: [
      {
        id: 'cust-bi-01',
        function: 'ZDOWNLOAD_CSV',
        text: 'CSV추출',
        quickinfo: '대용량 원시 데이터 직접 다운로드',
        icon: 'ICON_EXPORT',
        disabled: false,
        visible: true,
        is_standard: false,
        separator_before: false,
      },
      {
        id: 'cust-bi-02',
        function: 'ZPIVOT_VIEW',
        text: '피벗분석',
        quickinfo: '다차원 피벗 집계 및 요약 뷰 전환',
        icon: 'ICON_CALC',
        disabled: false,
        visible: true,
        is_standard: false,
        separator_before: false,
      },
      {
        id: 'cust-bi-03',
        function: 'ZEMAIL_SEND',
        text: '메일전송',
        quickinfo: '조회 결과표 담당자 메일 발송',
        icon: 'ICON_MAIL',
        disabled: false,
        visible: true,
        is_standard: false,
        separator_before: false,
      },
      {
        id: 'cust-bi-04',
        function: 'ZSYNC_ERP',
        text: 'ERP동기화',
        quickinfo: 'SAP 백엔드 RFC 실시간 데이터 동기화',
        icon: 'ICON_REFRESH',
        disabled: false,
        visible: true,
        is_standard: false,
        separator_before: true,
      },
    ],
  },
];

export function getToolbarVariants(): CustomToolbarVariant[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const userVariants: CustomToolbarVariant[] = JSON.parse(saved);
      // Combine builtins + user variants (filtering duplicates by id)
      const userIds = new Set(userVariants.map((v) => v.id));
      const builtins = PREDEFINED_TOOLBAR_VARIANTS.filter((v) => !userIds.has(v.id));
      return [...builtins, ...userVariants];
    }
  } catch (e) {
    console.error('Failed to load toolbar variants from localStorage', e);
  }
  return PREDEFINED_TOOLBAR_VARIANTS;
}

export function saveUserToolbarVariant(variant: CustomToolbarVariant): CustomToolbarVariant[] {
  const current = getToolbarVariants();
  const existingIndex = current.findIndex((v) => v.id === variant.id);
  let updated: CustomToolbarVariant[];

  if (existingIndex >= 0) {
    updated = current.map((v, i) => (i === existingIndex ? { ...variant, is_builtin: false } : v));
  } else {
    updated = [...current, { ...variant, is_builtin: false }];
  }

  // Persist only non-builtin or modified variants
  const userOnly = updated.filter((v) => !v.is_builtin);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userOnly));
  } catch (e) {
    console.error('Failed to save toolbar variants to localStorage', e);
  }

  return updated;
}

export function deleteUserToolbarVariant(variantId: string): CustomToolbarVariant[] {
  const current = getToolbarVariants();
  const updated = current.filter((v) => v.id !== variantId || v.is_builtin);
  const userOnly = updated.filter((v) => !v.is_builtin);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userOnly));
  } catch (e) {
    console.error('Failed to delete toolbar variant from localStorage', e);
  }

  return getToolbarVariants();
}
