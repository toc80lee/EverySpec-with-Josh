/**
 * SAP ALV Specification & CL_GUI_ALV_GRID Data Types
 */

export type SapModule = 'SD' | 'MM' | 'FI' | 'CO' | 'PP' | 'HR' | 'QM' | 'PM' | 'BC';

export type SapDataType = 'CHAR' | 'NUMC' | 'DATS' | 'TIMS' | 'CURR' | 'DEC' | 'UNIT' | 'INT4' | 'STRING';

export type TextAlignment = 'L' | 'C' | 'R';

export type SelectionKind = 'PARAMETER' | 'SELECT_OPTION' | 'RADIOBUTTON' | 'CHECKBOX';

export interface AlvErrorLog {
  id: string;
  type: 'E' | 'W' | 'I';   // Error, Warning, Info
  col_name: string;        // 열 이름 e.g. 세트 라인
  message: string;         // 메시지 텍스트 e.g. 엔트리는 숫자가 아닙니다
}

export interface AlvField {
  id: string;              // Stable unique key to prevent input unmounting
  col_pos: number;
  fieldname: string;       // e.g. VBELN
  coltext: string;         // e.g. 판매오더 번호
  scrtext_s?: string;      // 짧은 텍스트 (10자)
  scrtext_m?: string;      // 중간 텍스트 (20자)
  scrtext_l?: string;      // 긴 텍스트 (40자)
  datatype: SapDataType;   // CHAR, CURR, etc.
  outputlen: number;       // 출력 길이
  just: TextAlignment;     // L, C, R
  key: boolean;            // 키 필드 (고정 컬럼)
  hotspot: boolean;        // 클릭 가능 핫스팟 (드릴다운 링크)
  checkbox: boolean;       // 체크박스 형태
  edit: boolean;           // 그리드 셀 직접 편집 가능
  do_sum: boolean;         // 합계 계산 (Σ)
  emphasize: string;       // SAP 컬러코드: '', 'C100', 'C300', 'C500', 'C700'
  icon_type?: 'DOC' | 'FOLDER' | 'LIGHTS' | 'NONE'; // SAP 셀 아이콘
  cfieldname?: string;     // 통화 참조 필드 (예: WAERK)
  qfieldname?: string;     // 단위 참조 필드 (예: MEINS)
  ref_table?: string;      // 참조 테이블 (예: VBAK)
  ref_field?: string;      // 참조 필드 (예: VBELN)
  drilldown_tcode?: string;// 핫스팟 클릭 시 이동할 T-Code (예: VA03)
  sort_enable?: boolean;   // 정렬 참여 여부 (기본: false)
}

export interface SelectionParameter {
  id: string;
  kind: SelectionKind;     // PARAMETER, SELECT_OPTION, RADIOBUTTON, CHECKBOX
  name: string;            // e.g. P_BUKRS, S_VBELN, P_RAD1
  text: string;            // e.g. 회사코드, 판매오더
  ref_table?: string;      // e.g. T001
  ref_field?: string;      // e.g. BUKRS
  datatype: SapDataType;
  length: number;
  obligatory: boolean;     // 필수 입력 여부
  default_val: string;     // 기본값
  memory_id?: string;      // SPA/GPA 메모리 ID
  // Selection Screen Box / Frame & Radio Grouping
  block_title?: string;    // e.g. "기본 조회 조건" / "Basic Criteria" (SELECTION-SCREEN BEGIN OF BLOCK)
  block_id?: string;       // e.g. "B1", "B2"
  radio_group?: string;    // e.g. "R_GRP1" (RADIOBUTTON GROUP)
  // Mockup values for simulation
  low?: string;
  high?: string;
  sign?: 'I' | 'E';
  option?: 'EQ' | 'BT' | 'CP' | 'NE';
  multi_values?: { sign: 'I' | 'E'; option: string; low: string; high: string }[];
}

export interface AlvLayout {
  // 1. Display & Appearance (화면 표시 & 외관)
  grid_title: string;          // Char string max 70 - 그리드 컨트롤과 툴바 사이의 타이틀 제목
  smalltitle?: boolean;        // SPACE, 'X' - 그리드 제목 크기를 열 헤더 폰트 크기로 설정
  zebra: boolean;              // SPACE, 'X' - 스트라이프(얼룩말 패턴/지브라 패턴) 적용 (gs_layo-zebra = 'X')
  no_headers?: boolean;        // SPACE, 'X' - 열 헤더(컬럼 타이틀) 숨김
  no_hgridln?: boolean;        // SPACE, 'X' - 가로 그리드 라인 숨김
  no_vgridln?: boolean;        // SPACE, 'X' - 세로 그리드 라인 숨김
  no_toolbar?: boolean;        // SPACE, 'X' - ALV 상단 툴바 숨김
  no_rowmark?: boolean;        // SPACE, 'X' - 행 선택 마크 버튼 숨김 (선택 모드 'A'/'D' 해당)

  // 2. Columns & Sorting (컬럼 & 너비 & 정렬)
  cwidth_opt: boolean;         // SPACE, 'X' - 열 너비 최적화 (열 헤더 및 셀 내용에 맞춤)
  sgl_clk_hd?: boolean;        // SPACE, 'X' - 컬럼 헤더 단일 클릭 정렬 활성화 (1회 클릭 시 오름차순, 2회 내림차순)
  no_merging?: boolean;        // SPACE, 'X' - 정렬 시 동일 값의 셀 병합 방지
  keyhot?: boolean;            // SPACE, 'X' - 모든 키 필드를 핫스팟(한 번 클릭 시 이벤트 발생)으로 설정

  // 3. Totals & Calculations (합계 & 계산)
  totals_bef?: boolean;        // SPACE, 'X' - 계산된 합계를 리스트 상단 첫 번째 행에 표시
  no_totline?: boolean;        // SPACE, 'X' - 전체 합계 숨기고 소계만 표시
  no_totarr?: boolean;         // SPACE, 'X' - 합계/소합계 라인의 영역 표시 화살표 숨김
  no_totexp?: boolean;         // SPACE, 'X' - (소)합계 펼침/접힘 아이콘 숨김
  numc_total?: boolean;        // SPACE, 'X' - NUMC 타입 필드의 합계 계산 허용

  // 4. Selection Mode & Detail Popup (선택 모드 & 상세 창)
  sel_mode: 'A' | 'B' | 'C' | 'D' | 'SPACE'; // 'A':행/열, 'B':단일, 'C':다중, 'D':셀
  detailinit?: boolean;        // SPACE, 'X' - 상세 화면에 초기값(공백/0)을 가진 컬럼도 표시
  detailtitl?: string;         // Char string max 30 - 상세 조회 창의 타이틀바 제목

  // 5. Color & Style Tables (색상 및 스타일 제어 필드)
  info_fname?: string;         // Char string max 30 - 전체 행 색상 지정(Char 4) 필드명
  ctab_fname?: string;         // Char string max 30 - 개별 셀 색상 지정 테이블(LVC_T_SCOL) 필드명
  stylefname?: string;         // Char string max 30 - 버튼/편집 스타일 제어 내부 테이블(LVC_T_STYL) 필드명

  // Existing helpers
  totals_only?: boolean;       // 합계 라인만 표시
  excp_fname?: string;         // 예외 신호등 필드명 (기본: LIGHTS)
  excp_led?: boolean;          // 1-Green, 2-Yellow, 3-Red
  box_fname?: string;          // 행 선택 체크박스 필드명 (BOX_FNAME)
  colorfname?: string;         // 행 컬러 필드명
  show_row_numbers: boolean;
}

export interface AlvToolbarButton {
  id: string;
  function: string;        // e.g. &DETAIL, &GRAPHIC, &SORT_ASC, FC01, POST
  text: string;            // e.g. 세부사항, 오름차순, 출하전기
  quickinfo: string;       // e.g. 행 세부사항 팝업 조회
  icon: string;            // e.g. ICON_DETAIL, ICON_GRAPHIC, ICON_SORT_UP
  disabled: boolean;       // 비활성화 여부
  visible: boolean;        // 툴바 표시 여부
  is_standard: boolean;    // SAP 표준 버튼 여부
  separator_before?: boolean; // 앞 구분선
}

export type ToolbarCustomButton = AlvToolbarButton;

export interface TestCase {
  id: string;
  scenario: string;        // 테스트 시나리오 설명
  condition: string;       // 입력 조건
  expected: string;        // 예상 결과
}

export type FlowStepKind = 'start' | 'process' | 'decision' | 'screen' | 'bapi' | 'end';

export interface DataFlowStep {
  id: string;
  step_no: string;         // e.g. "1)", "2)", "5-1)", "7-2-1)"
  label: string;           // e.g. "초기화", "선택화면", "입력값 점검", "처리 옵션"
  kind: FlowStepKind;      // process, decision, screen, bapi, start, end
  description?: string;    // 설명
  branch_left?: string;    // 왼쪽 분기명 (e.g. "조회", "종료", "성공")
  branch_right?: string;   // 오른쪽 분기명 (e.g. "생성", "생성", "실패")
}

export interface DataFlowDatabase {
  id: string;
  name: string;            // e.g. "T004\nT004T" or "SETHEADER\nSETHEADERT\nSETNODE\nSETLEAF"
  target_steps: string[];  // 연결될 단계 번호들 (e.g. ["2)", "3)"] 또는 ["4)", "6)"])
}

export type FlowShapeType = 'start' | 'process' | 'decision' | 'database' | 'end';
export type PortPosition = 'top' | 'bottom' | 'left' | 'right' | 'auto';

export interface CanvasNode {
  id: string;
  type: FlowShapeType;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  description?: string;
  sublabel?: string;
}

export interface CanvasEdge {
  id: string;
  from: string;
  to: string;
  fromPort?: PortPosition;
  toPort?: PortPosition;
  label?: string;
  style?: 'orthogonal' | 'curved' | 'straight';
}

export interface DataFlowDiagramConfig {
  title?: string;
  steps?: DataFlowStep[];
  databases?: DataFlowDatabase[];
  nodes?: CanvasNode[];
  edges?: CanvasEdge[];
}

export interface SubAlvGridConfig {
  grid_name?: string;     // e.g. "Item ALV Grid"
  layout: AlvLayout;
  field_catalog: AlvField[];
  custom_toolbar?: ToolbarCustomButton[];
  toolbar_buttons?: AlvToolbarButton[];
  test_cases?: TestCase[];
  mock_rows: Record<string, any>[];
  foreign_key?: string;    // e.g. "VBELN" to link to header row
}

export interface SpecChangeHistoryItem {
  id: string;
  version: string;         // e.g. "v1.0", "v1.1", "v1.2"
  changed_at: string;      // YYYY-MM-DD HH:mm:ss
  author: string;          // User who made the change
  comment: string;         // Change description
}

export interface ProgramSpec {
  id: string;
  sample_type?: string;    // e.g. "01", "02", "03", "04"
  program_id: string;      // e.g. ZR_CUSTOM_REPORT
  tcode: string;           // e.g. ZREP01
  title: string;           // e.g. 영업 오더 진행 및 출하 모니터링
  module: SapModule;       // SD, MM, FI, etc.
  author: string;          // e.g. 홍길동 책임
  created_date: string;    // YYYY-MM-DD
  target_sap_release: string; // e.g. SAP S/4HANA 2023 / ECC 6.0
  program_type: 'REPORT' | 'TRANSACTION';
  business_purpose: string; // 개발 배경 및 업무 목적
  data_extraction_logic: string; // DB 테이블 조인 및 추출 조건 설명
  data_flow?: DataFlowDiagramConfig; // 처리 흐름도 및 데이터 흐름 다이어그램
  selection_params: SelectionParameter[];
  field_catalog: AlvField[];
  layout: AlvLayout;
  custom_toolbar: ToolbarCustomButton[];
  toolbar_buttons?: AlvToolbarButton[];
  test_cases: TestCase[];
  mock_rows: Record<string, any>[];
  error_logs?: AlvErrorLog[];
  item_grid?: SubAlvGridConfig; // For Master-Detail ALV (sample_type === '02')
  is_system?: boolean;          // Built-in system sample spec (cannot be deleted)
  change_history?: SpecChangeHistoryItem[]; // Revision change audit trail
}

export type TemplateCategory = 'Single-Table' | 'Header-Detail' | 'OData-based' | 'Interface / Batch' | 'Custom';

export interface PredefinedTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  description: string;
  module: SapModule;
  author?: string;
  target_release?: string;
  tags: string[];
  spec: ProgramSpec;
}

export interface SavedUserTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  description: string;
  module: SapModule;
  savedAt: string;
  spec: ProgramSpec;
}


