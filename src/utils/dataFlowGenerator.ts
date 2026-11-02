import { DataFlowDiagramConfig, ProgramSpec, SapModule } from '../types/sap';

/**
 * Standard SAP Data Flow Template matching the user's reference diagram
 */
export const DEFAULT_CO_DATA_FLOW: DataFlowDiagramConfig = {
  title: '프로그램 처리 흐름도 (Data Flow Diagram)',
  steps: [
    {
      id: 'step-start',
      step_no: '시작',
      label: '시작',
      kind: 'start',
      description: '트랜잭션 실행 (T-Code / SE38 실행)',
    },
    {
      id: 'step-1',
      step_no: '1)',
      label: '1) 초기화',
      kind: 'process',
      description: 'INITIALIZATION: 기본값 설정 (회사코드, 관리회계영역, 기준일자 등)',
    },
    {
      id: 'step-2',
      step_no: '2)',
      label: '2) 선택화면',
      kind: 'screen',
      description: 'AT SELECTION-SCREEN OUTPUT: 선택화면 출력 및 필수/옵션 조건 입력',
    },
    {
      id: 'step-3',
      step_no: '3)',
      label: '3) 입력값 점검',
      kind: 'process',
      description: 'AT SELECTION-SCREEN: 기준 테이블 마스터 검증 및 필수 입력값 체크',
    },
    {
      id: 'step-decision-opt',
      step_no: '옵션',
      label: '처리 옵션',
      kind: 'decision',
      description: '라디오 버튼 선택 여부 판정 (조회 모드 vs 생성 모드)',
      branch_left: '조회',
      branch_right: '생성',
    },
    {
      id: 'step-4',
      step_no: '4)',
      label: '4) 조회',
      kind: 'process',
      description: 'START-OF-SELECTION: 조건에 따른 기존 계층구조 및 데이터 조회',
    },
    {
      id: 'step-5',
      step_no: '5)',
      label: '5) 생성',
      kind: 'process',
      description: '신규 생성 모드 진입',
    },
    {
      id: 'step-5-1',
      step_no: '5-1)',
      label: '5-1) 엑셀 업로드',
      kind: 'process',
      description: '로컬 PC 엑셀 양식 데이터 파싱 및 내부 테이블(ITAB) 적재',
    },
    {
      id: 'step-6',
      step_no: '6)',
      label: '6) 데이터 가공',
      kind: 'process',
      description: 'END-OF-SELECTION: 데이터 정합성 검증, 상태 신호등(LIGHTS) 및 셀 스타일 가공',
    },
    {
      id: 'step-7',
      step_no: '7)',
      label: '7) 100번 화면 호출',
      kind: 'screen',
      description: 'CALL SCREEN 100: CL_GUI_ALV_GRID 컨테이너 및 툴바 활성화',
    },
    {
      id: 'step-decision-cmd',
      step_no: '명령',
      label: '사용자 명령',
      kind: 'decision',
      description: 'USER_COMMAND (PAI): 저장, 실행, 종료 버튼 이벤트 분기',
      branch_left: '종료',
      branch_right: '생성',
    },
    {
      id: 'step-7-1',
      step_no: '7-1)',
      label: '7-1) 종료',
      kind: 'process',
      description: '화면 종료 및 프로그램 세션 정리 (LEAVE TO SCREEN 0)',
    },
    {
      id: 'step-7-2',
      step_no: '7-2)',
      label: '7-2) 생성',
      kind: 'process',
      description: 'BAPI/Function 호출 준비 및 전달 파라미터 매핑',
    },
    {
      id: 'step-decision-bapi',
      step_no: 'BAPI',
      label: 'BAPI 실행',
      kind: 'bapi',
      description: '표준 BAPI 실행 및 BAPIRET2 리턴 메시지 수신',
      branch_left: '생성 성공',
      branch_right: '생성 실패',
    },
    {
      id: 'step-7-2-1',
      step_no: '7-2-1)',
      label: '7-2-1) 생성 성공',
      kind: 'process',
      description: 'BAPI_TRANSACTION_COMMIT 실행 및 완료 메시지 출력',
    },
    {
      id: 'step-7-2-2',
      step_no: '7-2-2)',
      label: '7-2-2) 생성 실패',
      kind: 'process',
      description: 'BAPI_TRANSACTION_ROLLBACK 및 오류 로그 저장 후 가공 단계로 복귀',
    },
    {
      id: 'step-end',
      step_no: '종료',
      label: '종료',
      kind: 'end',
      description: '프로그램 실행 완료 및 종료',
    },
  ],
  databases: [
    {
      id: 'db-1',
      name: 'T004\nT004T',
      target_steps: ['2)', '3)'],
    },
    {
      id: 'db-2',
      name: 'SETHEADER\nSETHEADERT\nSETNODE\nSETLEAF',
      target_steps: ['4)', '6)'],
    },
  ],
};

/**
 * Automatically builds or personalizes a Data Flow diagram from a ProgramSpec
 */
export function generateDataFlowFromSpec(spec: ProgramSpec): DataFlowDiagramConfig {
  const module = spec.module || 'CO';

  // Extract custom referenced tables from fields & params if available
  const detectedTables = new Set<string>();
  spec.selection_params?.forEach(p => {
    if (p.ref_table) detectedTables.add(p.ref_table);
  });
  spec.field_catalog?.forEach(f => {
    if (f.ref_table) detectedTables.add(f.ref_table);
  });

  const tableList = Array.from(detectedTables);

  // Setup module-specific DB cylinder tables
  let db1Tables = 'T001\nT001Z';
  let db2Tables = 'BKPF\nBSEG';

  if (module === 'SD') {
    db1Tables = 'TVKO\nTVTW';
    db2Tables = 'VBAK\nVBAP\nVBRK\nVBRP';
  } else if (module === 'MM') {
    db1Tables = 'T001W\nT001L';
    db2Tables = 'MARA\nMAKT\nEKKO\nEKPO';
  } else if (module === 'CO') {
    db1Tables = 'T004\nT004T';
    db2Tables = 'SETHEADER\nSETHEADERT\nSETNODE\nSETLEAF';
  } else if (module === 'FI') {
    db1Tables = 'T001\nSKA1\nSKB1';
    db2Tables = 'BKPF\nBSEG\nBSIS\nBSAS';
  } else if (tableList.length > 0) {
    db1Tables = tableList.slice(0, 2).join('\n') || 'T001\nT001W';
    db2Tables = tableList.slice(2, 6).join('\n') || 'VBAK\nVBAP';
  }

  // Clone base flow and personalize labels & DBs
  const baseFlow = JSON.parse(JSON.stringify(DEFAULT_CO_DATA_FLOW)) as DataFlowDiagramConfig;
  baseFlow.title = `${spec.program_id || 'ALV'} 처리 흐름도 (Data Flow Diagram)`;
  baseFlow.databases = [
    {
      id: `db-1-${Date.now()}`,
      name: db1Tables,
      target_steps: ['2)', '3)'],
    },
    {
      id: `db-2-${Date.now()}`,
      name: db2Tables,
      target_steps: ['4)', '6)'],
    },
  ];

  return baseFlow;
}
