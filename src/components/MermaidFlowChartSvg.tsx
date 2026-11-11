import React, { useMemo } from 'react';
import { ProgramSpec } from '../types/sap';

export interface ParsedMermaidNode {
  id: string;
  label: string;
  shape: 'rect' | 'diamond' | 'stadium' | 'cylinder' | 'circle' | 'round' | 'trapezoid';
  rawText: string;
}

export interface ParsedMermaidEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
  style?: 'normal' | 'dotted' | 'thick';
}

export interface LayoutedNode extends ParsedMermaidNode {
  x: number;
  y: number;
  width: number;
  height: number;
  layer: number;
}

export const MERMAID_TEMPLATES = {
  basic_condition: {
    name: '기본 조건 분기',
    code: `graph TD;
  A[시작] --> B{조건 확인};
  B -->|참| C[작업 수행];
  B -->|거짓| D[다른 작업 수행];
  C --> E[종료];
  D --> E;`,
    node_details: {
      A: {
        label: '시작',
        markdown: `### 시작 (Program Start)
- 프로그램 실행 시작점
- 초기 파라미터 및 시스템 변수(\`SY-REPID\`, \`SY-UNAME\`) 설정
- 화면 타이틀바 및 GUI 상태 초기화 준비`,
      },
      B: {
        label: '조건 확인',
        markdown: `### 조건 확인 (Input Check & Validation)
- 선택화면(Selection Screen)에서 입력된 조회 조건 점검
- 필수 파라미터(회사코드, 전표일자 등) 유효성 검증
- 조건 불충족 시 에러 메시지(\`TYPE 'E'\`) 발생 및 커서 이동`,
      },
      C: {
        label: '작업 수행',
        markdown: `### 작업 수행 (Main Processing)
- 검증 통과 시 원천 DB 테이블(\`VBAK\`, \`VBAP\`)에서 데이터 추출
- 내부 테이블(\`GT_DATA\`) 구성 및 비즈니스 계산 로직 수행
- 상태 신호등(\`LIGHTS\`) 및 통화 금액 집계`,
      },
      D: {
        label: '다른 작업 수행',
        markdown: `### 다른 작업 수행 (Alternative / Error Handling)
- 조건 미충족 또는 예외 케이스 발생 시 보조 데이터 추출
- 오류 로그(\`GT_ERROR\`) 적재 및 경고 알림 처리`,
      },
      E: {
        label: '종료',
        markdown: `### 종료 (Display & Screen End)
- 메인 화면(\`0100 PBO\`) ALV Grid 컨트롤 인스턴스 생성 및 데이터 바인딩
- 사용자 명령 수신 대기(\`PAI\`) 및 종료 시 화면 반환`,
      },
    },
  },

  sample_01_standard: {
    name: 'Sample Type 01: SAP 표준 10단계 흐름도',
    code: `graph TD;
  A([1. 시작 / INITIALIZATION]) --> B[/2. 선택화면 / SELECTION-SCREEN/];
  B --> C{3. 입력값 정합성 점검};
  C -->|오류 발생| B;
  C -->|정상 통과| D[4. START-OF-SELECTION];
  D --> E[(5. 원천 데이터 추출 / SELECT)];
  E --> F[6. 비즈니스 로직 가공 / CALCULATE];
  F --> G[7. ALV Grid 화면 출력 / 0100 PBO];
  G --> H{8. 사용자 명령 처리 / PAI};
  H -->|더블클릭 / 핫스팟| I[9. 상세 전표 드릴다운 / VA03];
  H -->|엑셀 / 인쇄| J[9-1. 데이터 내보내기];
  H -->|종료 / F3| K([10. 프로그램 종료 / LEAVE TO SCREEN 0]);
  I --> G;
  J --> G;`,
    node_details: {
      A: {
        label: '1. 시작 / INITIALIZATION',
        markdown: `### 1. INITIALIZATION
- 프로그램 기동 시 단 1회 실행되는 초기화 이벤트
- 선택화면 조회 조건 기본값(당월 1일 ~ 현재일자) 자동 세팅
- 권한 오브젝트 체크(\`AUTHORITY-CHECK\`) 사전 준비`,
      },
      B: {
        label: '2. 선택화면 / SELECTION-SCREEN',
        markdown: `### 2. AT SELECTION-SCREEN OUTPUT
- 선택화면 PBO 이벤트
- 화면 필드 속성 동적 변경(\`SCREEN-ACTIVE\`, \`SCREEN-INPUT\`)
- 라디오버튼 및 체크박스 선택에 따른 입력 항목 활성/비활성화 제어`,
      },
      C: {
        label: '3. 입력값 정합성 점검',
        markdown: `### 3. AT SELECTION-SCREEN (PAI)
- 필수 입력값 누락 여부 검증
- 전표번호, 회사코드 마스터 존재 여부 체크 (\`T001\`, \`VBAK\`)
- 이상 시 오류 메시지 출력(\`MESSAGE E001\`) 후 해당 필드로 커서 이동`,
      },
      D: {
        label: '4. START-OF-SELECTION',
        markdown: `### 4. START-OF-SELECTION
- 실행 버튼(F8) 클릭 시 본격적인 데이터 처리 단계 진입
- 진행 상태 프로그레스 바(\`SAPGUI_PROGRESS_INDICATOR\`) 표시`,
      },
      E: {
        label: '5. 원천 데이터 추출 / SELECT',
        markdown: `### 5. Data Extraction (원천 데이터 추출)
- 주 테이블 \`VBAK\`(판매오더 헤더) 및 \`VBAP\`(품목) 조인 쿼리 수행
- 고객 마스터 \`KNA1\`에서 고객명 조회
- \`INTO CORRESPONDING FIELDS OF TABLE gt_data\``,
      },
      F: {
        label: '6. 비즈니스 로직 가공 / CALCULATE',
        markdown: `### 6. Business Calculation
- 통화별 공급가액 환산 및 합계 계산
- 출하 상태 및 청구 상태에 따른 신호등(\`LIGHTS\`: 1 초록, 2 노랑, 3 빨강) 산출
- ALV 스타일 테이블(\`LVC_T_STYL\`) 및 컬러 테이블(\`LVC_T_SCOL\`) 설정`,
      },
      G: {
        label: '7. ALV Grid 화면 출력 / 0100 PBO',
        markdown: `### 7. Display Main Screen (Screen 0100 PBO)
- 커스텀 컨테이너(\`CL_GUI_CUSTOM_CONTAINER\`) 생성
- 그리드 컨트롤(\`CL_GUI_ALV_GRID\`) 인스턴스화
- 필드 카탈로그(\`LVC_T_FCAT\`) 및 레이아웃(\`LVC_S_LAYO\`) 바인딩
- \`SET_TABLE_FOR_FIRST_DISPLAY\` 메서드 호출`,
      },
      H: {
        label: '8. 사용자 명령 처리 / PAI',
        markdown: `### 8. USER COMMAND Handling (Screen 0100 PAI)
- OK 코드(\`GV_OK_CODE\`)에 따른 분기 처리
- 툴바 버튼 클릭 이벤트 및 더블클릭/핫스팟 이벤트 수신`,
      },
      I: {
        label: '9. 상세 전표 드릴다운 / VA03',
        markdown: `### 9. Drilldown to Transaction
- 클릭된 행의 전표번호(\`VBELN\`)를 메모리 파라미터(\`SET PARAMETER ID 'AUN'\`)에 저장
- \`CALL TRANSACTION 'VA03' AND SKIP FIRST SCREEN\` 호출
- 복귀 후 그리드 안정적 새로고침(\`REFRESH_TABLE_DISPLAY\`)`,
      },
      J: {
        label: '9-1. 데이터 내보내기',
        markdown: `### 9-1. Excel / Print Export
- 표준 ALV 엑셀 내보내기 기능 호출 (\`&XXL\`)
- 출력물 인쇄 양식 연동`,
      },
      K: {
        label: '10. 프로그램 종료 / LEAVE TO SCREEN 0',
        markdown: `### 10. Program Exit
- F3(뒤로가기), Shift+F3(종료), F12(취소) 시 화면 자원 해제
- 컨테이너 메모리 해제 및 프로그램 종료 (\`LEAVE TO SCREEN 0\`)`,
      },
    },
  },

  sample_02_master_detail: {
    name: 'Sample Type 02: Master-Detail 2-Grid 흐름도',
    code: `graph TD;
  A([1. 시작 / INITIALIZATION]) --> B[/2. 조회 조건 입력 / SELECTION-SCREEN/];
  B --> C{3. 파라미터 유효성 검증};
  C -->|오류 발생| B;
  C -->|정상 통과| D[(4. 헤더 데이터 조회 / VBAK)];
  D --> E[5. 상단 헤더 ALV Grid 바인딩 / 0100];
  E --> F{6. 헤더 행 선택 이벤트};
  F -->|행 클릭/선택| G[(7. 품목 데이터 조회 / VBAP)];
  G --> H[8. 하단 품목 ALV Grid 갱신 / 0110];
  H --> I{9. 사용자 명령 처리};
  I -->|품목 저장/수정| J[10. BAPI 전표 변경 처리];
  I -->|종료| K([11. 프로그램 종료]);
  J --> E;`,
    node_details: {
      A: {
        label: '1. 시작 / INITIALIZATION',
        markdown: `### Master-Detail 초기화
- 프로그램 시작 변수 및 분할 컨테이너(\`CL_GUI_SPLITTER_CONTAINER\`) 레이아웃 설정 준비`,
      },
      B: {
        label: '2. 조회 조건 입력 / SELECTION-SCREEN',
        markdown: `### 2. Selection Screen
- 헤더 조회 파라미터 (회사코드, 판매조직, 생성일자 범위 등) 입력`,
      },
      C: {
        label: '3. 파라미터 유효성 검증',
        markdown: `### 3. 입력값 점검
- 필수값 누락 여부 검증 및 오류 처리`,
      },
      D: {
        label: '4. 헤더 데이터 조회 / VBAK',
        markdown: `### 헤더 데이터 추출
- 판매오더 헤더 테이블 \`VBAK\`에서 조건에 일치하는 데이터 조회
- \`GT_0100\` 내부 테이블에 적재`,
      },
      E: {
        label: '5. 상단 헤더 ALV Grid 바인딩 / 0100',
        markdown: `### 헤더 ALV 화면 바인딩
- 분할 컨테이너 상단(Row 1)에 Header ALV Grid 인스턴스 바인딩`,
      },
      F: {
        label: '6. 헤더 행 선택 이벤트',
        markdown: `### 행 선택 이벤트 감지
- 헤더 그리드의 행 선택 이벤트(\`HANDLE_DOUBLE_CLICK\` 또는 \`HOTSPOT_CLICK\`) 포착
- 선택된 행의 판매오더 번호(\`VBELN\`) 추출`,
      },
      G: {
        label: '7. 품목 데이터 조회 / VBAP',
        markdown: `### 품목 데이터 추출
- 선택된 \`VBELN\`에 해당하는 품목 데이터 \`VBAP\` 조회
- 품목별 단가, 수량, 공급가액 계산 후 \`GT_0110\` 적재`,
      },
      H: {
        label: '8. 하단 품목 ALV Grid 갱신 / 0110',
        markdown: `### 품목 ALV 화면 갱신
- 분할 컨테이너 하단(Row 2)에 품목 데이터 바인딩 및 Refresh`,
      },
      I: {
        label: '9. 사용자 명령 처리',
        markdown: `### 9. User Command
- 품목 저장, 전표 변경, 인쇄 등 사용자 명령 분기`,
      },
      J: {
        label: '10. BAPI 전표 변경 처리',
        markdown: `### 10. BAPI Transaction
- 변경된 품목 데이터를 \`BAPI_SALESORDER_CHANGE\`를 호출하여 ERP에 실시간 반영`,
      },
      K: {
        label: '11. 프로그램 종료',
        markdown: `### 11. Exit
- 화면 및 메모리 자원 해제 후 종료`,
      },
    },
  },

  sample_04_cds_pivot: {
    name: 'Sample Type 04: CDS View / 피벗 집계 흐름도',
    code: `graph TD;
  A([1. 시작 / INITIALIZATION]) --> B[/2. 분석 조건 입력 / SELECTION-SCREEN/];
  B --> C[(3. CDS View 원천 테이블 조회 / ACDOCA)];
  C --> D[4. 다차원 피벗 집계 및 소계 계산];
  D --> E[5. 분석 ALV Grid 출력 / 0100];
  E --> F{6. 사용자 인터랙션};
  F -->|슬라이서/조건 변경| D;
  F -->|엑셀 내보내기| G[7. 보고서 파일 생성];
  F -->|종료| H([8. 종료]);`,
    node_details: {
      A: {
        label: '1. 시작 / INITIALIZATION',
        markdown: `### 피벗 분석 초기화
- 기본 분석 기간 및 차원(Dimension) 변수 초기화`,
      },
      B: {
        label: '2. 분석 조건 입력 / SELECTION-SCREEN',
        markdown: `### 분석 조건 입력
- 회계연도, 전기기간, 회사코드, 코스트센터 범위 입력`,
      },
      C: {
        label: '3. CDS View 원천 테이블 조회 / ACDOCA',
        markdown: `### CDS View / 테이블 조회
- S/4HANA 원천 전표 테이블(\`ACDOCA\`) 또는 CDS View를 통한 고속 인메모리 조회`,
      },
      D: {
        label: '4. 다차원 피벗 집계 및 소계 계산',
        markdown: `### 다차원 피벗 가공
- 기간별(월/분기), 계정별, 코스트센터별 다차원 집계 로직 수행`,
      },
      E: {
        label: '5. 분석 ALV Grid 출력 / 0100',
        markdown: `### 피벗 그리드 출력
- ALV Grid 계층형 소계 및 정렬 적용하여 출력`,
      },
      F: {
        label: '6. 사용자 인터랙션',
        markdown: `### 동적 슬라이서 변경
- 사용자 분석 기준 변경에 따른 실시간 소계 재계산`,
      },
      G: {
        label: '7. 보고서 파일 생성',
        markdown: `### 엑셀 보고서 다운로드
- 피벗 결과를 Excel 파일 형식으로 내보내기`,
      },
      H: {
        label: '8. 종료',
        markdown: `### 종료
- 메모리 해제 및 프로그램 종료`,
      },
    },
  },
};

/**
 * Returns effective Mermaid Code and Node Details for any ProgramSpec
 */
export function getEffectiveDataFlow(spec: ProgramSpec): {
  mermaidCode: string;
  nodeDetails: Record<string, { label?: string; markdown: string }>;
} {
  const config = spec.data_flow;
  let code = config?.mermaid_code?.trim();
  let details = config?.node_details;

  if (!code) {
    if (spec.sample_type === '02') {
      code = MERMAID_TEMPLATES.sample_02_master_detail.code;
      if (!details) details = MERMAID_TEMPLATES.sample_02_master_detail.node_details;
    } else if (spec.sample_type === '04') {
      code = MERMAID_TEMPLATES.sample_04_cds_pivot.code;
      if (!details) details = MERMAID_TEMPLATES.sample_04_cds_pivot.node_details;
    } else {
      code = MERMAID_TEMPLATES.sample_01_standard.code;
      if (!details) details = MERMAID_TEMPLATES.sample_01_standard.node_details;
    }
  }

  if (!details) {
    if (spec.sample_type === '02') {
      details = MERMAID_TEMPLATES.sample_02_master_detail.node_details;
    } else if (spec.sample_type === '04') {
      details = MERMAID_TEMPLATES.sample_04_cds_pivot.node_details;
    } else {
      details = MERMAID_TEMPLATES.basic_condition.node_details;
    }
  }

  return {
    mermaidCode: code,
    nodeDetails: details as Record<string, { label?: string; markdown: string }>,
  };
}

/**
 * Robust Mermaid Flowchart parser supporting:
 * - Direction (TD, TB, LR, RL)
 * - Standard nodes: A[Rect], A(Round), A([Stadium]), A{Diamond}, A[(Cylinder)], A[/Trapezoid/]
 * - Arrow connections: -->, -.->, ==>, -->|Label|, -- Label -->
 */
export function parseMermaidCode(code: string): {
  nodes: ParsedMermaidNode[];
  edges: ParsedMermaidEdge[];
  direction: 'TD' | 'LR';
} {
  const nodesMap = new Map<string, ParsedMermaidNode>();
  const edges: ParsedMermaidEdge[] = [];
  let direction: 'TD' | 'LR' = 'TD';

  const clean = code.trim();
  const firstLine = clean.split('\n')[0] || '';
  if (firstLine.includes('LR') || firstLine.includes('RL')) {
    direction = 'LR';
  }

  const extractNodeInfo = (
    token: string
  ): { id: string; label: string; shape: ParsedMermaidNode['shape'] } | null => {
    const s = token.trim();
    if (!s) return null;

    // Cylinder: A[(label)]
    const cylMatch = s.match(/^([A-Za-z0-9_\-]+)\[\((.*?)\)\]$/);
    if (cylMatch) {
      return { id: cylMatch[1], label: cylMatch[2].trim(), shape: 'cylinder' };
    }

    // Stadium: A([label])
    const stadiumMatch = s.match(/^([A-Za-z0-9_\-]+)\(\[(.*?)\]\)$/);
    if (stadiumMatch) {
      return { id: stadiumMatch[1], label: stadiumMatch[2].trim(), shape: 'stadium' };
    }

    // Circle: A((label))
    const circleMatch = s.match(/^([A-Za-z0-9_\-]+)\(\((.*?)\)\)$/);
    if (circleMatch) {
      return { id: circleMatch[1], label: circleMatch[2].trim(), shape: 'circle' };
    }

    // Diamond: A{label}
    const diamondMatch = s.match(/^([A-Za-z0-9_\-]+)\{(.*?)\}$/);
    if (diamondMatch) {
      return { id: diamondMatch[1], label: diamondMatch[2].trim(), shape: 'diamond' };
    }

    // Trapezoid / Parallelogram: A[/label/]
    const trapMatch = s.match(/^([A-Za-z0-9_\-]+)\[\/(.*?)\/\]$/);
    if (trapMatch) {
      return { id: trapMatch[1], label: trapMatch[2].trim(), shape: 'trapezoid' };
    }

    // Rounded: A(label)
    const roundMatch = s.match(/^([A-Za-z0-9_\-]+)\((.*?)\)$/);
    if (roundMatch) {
      return { id: roundMatch[1], label: roundMatch[2].trim(), shape: 'round' };
    }

    // Rect: A[label]
    const rectMatch = s.match(/^([A-Za-z0-9_\-]+)\[(.*?)\]$/);
    if (rectMatch) {
      return { id: rectMatch[1], label: rectMatch[2].trim(), shape: 'rect' };
    }

    // Simple ID without bracket: A
    const simpleMatch = s.match(/^([A-Za-z0-9_\-]+)$/);
    if (simpleMatch) {
      return { id: simpleMatch[1], label: simpleMatch[1], shape: 'rect' };
    }

    return null;
  };

  const registerNode = (nodeInfo: {
    id: string;
    label: string;
    shape: ParsedMermaidNode['shape'];
  }) => {
    const existing = nodesMap.get(nodeInfo.id);
    if (!existing) {
      nodesMap.set(nodeInfo.id, {
        id: nodeInfo.id,
        label: nodeInfo.label || nodeInfo.id,
        shape: nodeInfo.shape,
        rawText: `${nodeInfo.id}[${nodeInfo.label}]`,
      });
    } else {
      if (nodeInfo.label && nodeInfo.label !== nodeInfo.id) {
        existing.label = nodeInfo.label;
      }
      if (nodeInfo.shape !== 'rect') {
        existing.shape = nodeInfo.shape;
      }
    }
  };

  const statements = clean
    .split(/[\n;]/)
    .map((s) => s.trim())
    .filter(
      (s) =>
        s &&
        !s.startsWith('graph') &&
        !s.startsWith('flowchart') &&
        !s.startsWith('%%')
    );

  let edgeCounter = 1;

  for (const stmt of statements) {
    const edgeRegex = /(.*?)(-->\|(.*?)\||\-\-(.*?)\-\->|==>|\-\.\->|-->)(.*)/;
    const match = stmt.match(edgeRegex);

    if (match) {
      const leftPart = match[1].trim();
      const edgeSymbol = match[2];
      const pipeLabel = match[3];
      const midLabel = match[4];
      const rightPart = match[5].trim();

      const edgeLabel = (pipeLabel || midLabel || '').trim();
      const isDotted = edgeSymbol.includes('-.');
      const isThick = edgeSymbol.includes('==');

      const leftNode = extractNodeInfo(leftPart);
      const rightNode = extractNodeInfo(rightPart);

      if (leftNode) registerNode(leftNode);
      if (rightNode) registerNode(rightNode);

      if (leftNode && rightNode) {
        edges.push({
          id: `e-${edgeCounter++}`,
          from: leftNode.id,
          to: rightNode.id,
          label: edgeLabel || undefined,
          style: isDotted ? 'dotted' : isThick ? 'thick' : 'normal',
        });
      }
    } else {
      const singleNode = extractNodeInfo(stmt);
      if (singleNode) {
        registerNode(singleNode);
      }
    }
  }

  return {
    nodes: Array.from(nodesMap.values()),
    edges,
    direction,
  };
}

/**
 * Calculates neat layout coordinates for Mermaid nodes
 */
export function layoutMermaidDiagram(
  nodes: ParsedMermaidNode[],
  edges: ParsedMermaidEdge[],
  direction: 'TD' | 'LR' = 'TD'
): LayoutedNode[] {
  if (nodes.length === 0) return [];

  const nodeMap = new Map<string, ParsedMermaidNode>();
  nodes.forEach((n) => nodeMap.set(n.id, n));

  const incomingEdges: Record<string, string[]> = {};
  const outgoingEdges: Record<string, string[]> = {};
  nodes.forEach((n) => {
    incomingEdges[n.id] = [];
    outgoingEdges[n.id] = [];
  });

  edges.forEach((e) => {
    if (incomingEdges[e.to]) incomingEdges[e.to].push(e.from);
    if (outgoingEdges[e.from]) outgoingEdges[e.from].push(e.to);
  });

  const nodeLayers: Record<string, number> = {};
  const visited = new Set<string>();

  const roots = nodes.filter((n) => incomingEdges[n.id].length === 0);
  const queue: { id: string; layer: number }[] =
    roots.length > 0
      ? roots.map((r) => ({ id: r.id, layer: 0 }))
      : [{ id: nodes[0].id, layer: 0 }];

  queue.forEach((q) => {
    nodeLayers[q.id] = 0;
    visited.add(q.id);
  });

  while (queue.length > 0) {
    const { id, layer } = queue.shift()!;
    const children = outgoingEdges[id] || [];

    for (const childId of children) {
      const nextLayer = layer + 1;
      if (nodeLayers[childId] === undefined || nextLayer > nodeLayers[childId]) {
        nodeLayers[childId] = nextLayer;
      }
      if (!visited.has(childId)) {
        visited.add(childId);
        queue.push({ id: childId, layer: nextLayer });
      }
    }
  }

  nodes.forEach((n) => {
    if (nodeLayers[n.id] === undefined) {
      nodeLayers[n.id] = 0;
    }
  });

  const layersMap: Record<number, ParsedMermaidNode[]> = {};
  nodes.forEach((n) => {
    const l = nodeLayers[n.id] || 0;
    if (!layersMap[l]) layersMap[l] = [];
    layersMap[l].push(n);
  });

  const layerIndices = Object.keys(layersMap)
    .map(Number)
    .sort((a, b) => a - b);

  const layouted: LayoutedNode[] = [];
  const isTD = direction === 'TD';

  const nodeW = 160;
  const nodeH = 46;
  const gapX = 40;
  const gapY = 56;

  let maxLayerBreadth = 0;
  layerIndices.forEach((l) => {
    const count = layersMap[l].length;
    if (count > maxLayerBreadth) maxLayerBreadth = count;
  });

  const totalCanvasWidth = Math.max(
    600,
    maxLayerBreadth * (nodeW + gapX) + 80
  );

  layerIndices.forEach((layerIndex) => {
    const layerNodes = layersMap[layerIndex];
    const layerBreadth = layerNodes.length * nodeW + (layerNodes.length - 1) * gapX;
    const startX = (totalCanvasWidth - layerBreadth) / 2;

    layerNodes.forEach((node, idx) => {
      let w = nodeW;
      let h = nodeH;

      if (node.shape === 'diamond') {
        w = 160;
        h = 58;
      } else if (node.shape === 'cylinder') {
        w = 160;
        h = 54;
      } else if (node.shape === 'stadium' || node.shape === 'circle') {
        w = 170;
        h = 44;
      }

      const x = isTD
        ? startX + idx * (nodeW + gapX)
        : 40 + layerIndex * (nodeW + gapX);
      const y = isTD
        ? 30 + layerIndex * (nodeH + gapY)
        : 30 + idx * (nodeH + gapY);

      layouted.push({
        ...node,
        x,
        y,
        width: w,
        height: h,
        layer: layerIndex,
      });
    });
  });

  return layouted;
}

interface MermaidFlowChartSvgProps {
  mermaidCode?: string;
  nodeDetails?: Record<string, { label?: string; markdown: string }>;
  selectedNodeId?: string | null;
  onSelectNode?: (nodeId: string) => void;
  readOnly?: boolean;
  scale?: number;
  className?: string;
  fitToWidth?: boolean;
}

/**
 * Clean, high-fidelity SVG renderer for Mermaid Flowcharts.
 * Fully compatible with screen display, full-screen modals, and A4 print/PDF exports.
 */
export const MermaidFlowChartSvg: React.FC<MermaidFlowChartSvgProps> = ({
  mermaidCode = '',
  nodeDetails = {},
  selectedNodeId,
  onSelectNode,
  readOnly = false,
  scale = 1,
  className = '',
  fitToWidth = false,
}) => {
  const parsed = useMemo(() => parseMermaidCode(mermaidCode), [mermaidCode]);
  const layoutedNodes = useMemo(
    () => layoutMermaidDiagram(parsed.nodes, parsed.edges, parsed.direction),
    [parsed]
  );

  const svgBounds = useMemo(() => {
    if (layoutedNodes.length === 0) return { width: 500, height: 300 };
    let maxX = 0;
    let maxY = 0;
    layoutedNodes.forEach((n) => {
      const right = n.x + n.width + 40;
      const bottom = n.y + n.height + 40;
      if (right > maxX) maxX = right;
      if (bottom > maxY) maxY = bottom;
    });
    return {
      width: Math.max(620, maxX),
      height: Math.max(340, maxY),
    };
  }, [layoutedNodes]);

  if (layoutedNodes.length === 0) {
    return (
      <div className="py-12 text-center text-slate-400 text-xs italic">
        플로우차트 다이어그램 코드가 비어 있습니다.
      </div>
    );
  }

  const markerId = `mermaid-arrow-${readOnly ? 'ro' : 'edit'}`;
  const glowId = `node-glow-${readOnly ? 'ro' : 'edit'}`;

  return (
    <svg
      viewBox={`0 0 ${svgBounds.width} ${svgBounds.height}`}
      width={fitToWidth ? '100%' : svgBounds.width * scale}
      height={fitToWidth ? undefined : svgBounds.height * scale}
      className={`select-none mx-auto block ${className}`}
      style={{
        maxWidth: '100%',
        height: fitToWidth ? 'auto' : undefined,
      }}
    >
      <defs>
        {/* Arrow marker */}
        <marker
          id={markerId}
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 10 5 L 0 9 z" fill="#64748b" />
        </marker>
        {/* Active node glow filter */}
        <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#3b82f6" floodOpacity="0.35" />
        </filter>
      </defs>

      {/* Draw Edges */}
      {parsed.edges.map((edge) => {
        const source = layoutedNodes.find((n) => n.id === edge.from);
        const target = layoutedNodes.find((n) => n.id === edge.to);
        if (!source || !target) return null;

        const isSelectedEdge =
          !readOnly && (selectedNodeId === edge.from || selectedNodeId === edge.to);

        // Compute connection points
        const startX = source.x + source.width / 2;
        const startY = source.y + source.height;
        const endX = target.x + target.width / 2;
        const endY = target.y;

        // Smooth curve control points
        const midY = (startY + endY) / 2;
        const pathD = `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`;

        return (
          <g key={edge.id} className="transition-all">
            <path
              d={pathD}
              fill="none"
              stroke={isSelectedEdge ? '#2563eb' : '#94a3b8'}
              strokeWidth={isSelectedEdge ? 2.2 : 1.5}
              strokeDasharray={edge.style === 'dotted' ? '4 4' : undefined}
              markerEnd={`url(#${markerId})`}
            />

            {/* Edge label badge */}
            {edge.label && (
              <g transform={`translate(${(startX + endX) / 2}, ${midY})`}>
                <rect
                  x={-Math.max(16, edge.label.length * 5)}
                  y="-9"
                  width={Math.max(32, edge.label.length * 10)}
                  height="18"
                  rx="9"
                  fill="#ffffff"
                  stroke={isSelectedEdge ? '#93c5fd' : '#cbd5e1'}
                  strokeWidth="1"
                />
                <text
                  x="0"
                  y="3"
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="600"
                  fill={isSelectedEdge ? '#1d4ed8' : '#475569'}
                  fontFamily="sans-serif"
                >
                  {edge.label}
                </text>
              </g>
            )}
          </g>
        );
      })}

      {/* Draw Nodes */}
      {layoutedNodes.map((node) => {
        const isSelected = !readOnly && selectedNodeId === node.id;
        const hasDetail = !!nodeDetails[node.id]?.markdown?.trim();

        return (
          <g
            key={node.id}
            transform={`translate(${node.x}, ${node.y})`}
            onClick={() => {
              if (onSelectNode) onSelectNode(node.id);
            }}
            className={onSelectNode && !readOnly ? 'cursor-pointer group' : ''}
            filter={isSelected ? `url(#${glowId})` : undefined}
          >
            {/* Shape rendering */}
            {node.shape === 'diamond' ? (
              // Diamond (Decision)
              <polygon
                points={`${node.width / 2},0 ${node.width},${node.height / 2} ${node.width / 2},${node.height} 0,${node.height / 2}`}
                fill={isSelected ? '#eff6ff' : '#ffffff'}
                stroke={isSelected ? '#2563eb' : '#64748b'}
                strokeWidth={isSelected ? '2.5' : '1.5'}
                className="transition-colors group-hover:stroke-blue-500"
              />
            ) : node.shape === 'cylinder' ? (
              // Cylinder (Database)
              <g>
                <rect
                  x="0"
                  y="7"
                  width={node.width}
                  height={node.height - 7}
                  rx="5"
                  fill={isSelected ? '#eff6ff' : '#ffffff'}
                  stroke={isSelected ? '#2563eb' : '#0284c7'}
                  strokeWidth={isSelected ? '2.5' : '1.5'}
                />
                <ellipse
                  cx={node.width / 2}
                  cy="7"
                  rx={node.width / 2}
                  ry="6"
                  fill={isSelected ? '#dbeafe' : '#f0f9ff'}
                  stroke={isSelected ? '#2563eb' : '#0284c7'}
                  strokeWidth={isSelected ? '2.5' : '1.5'}
                />
              </g>
            ) : node.shape === 'stadium' ? (
              // Stadium / Capsule (Start / End)
              <rect
                x="0"
                y="0"
                width={node.width}
                height={node.height}
                rx={node.height / 2}
                fill={isSelected ? '#eff6ff' : '#ffffff'}
                stroke={isSelected ? '#2563eb' : '#059669'}
                strokeWidth={isSelected ? '2.5' : '1.5'}
                className="transition-colors group-hover:stroke-emerald-600"
              />
            ) : node.shape === 'round' ? (
              // Rounded Rect
              <rect
                x="0"
                y="0"
                width={node.width}
                height={node.height}
                rx="14"
                fill={isSelected ? '#eff6ff' : '#ffffff'}
                stroke={isSelected ? '#2563eb' : '#64748b'}
                strokeWidth={isSelected ? '2.5' : '1.5'}
                className="transition-colors group-hover:stroke-blue-500"
              />
            ) : (
              // Default Rectangle (Process)
              <rect
                x="0"
                y="0"
                width={node.width}
                height={node.height}
                rx="4"
                fill={isSelected ? '#eff6ff' : '#ffffff'}
                stroke={isSelected ? '#2563eb' : '#64748b'}
                strokeWidth={isSelected ? '2.5' : '1.5'}
                className="transition-colors group-hover:stroke-blue-500"
              />
            )}

            {/* Node ID Badge in top-left */}
            <g transform="translate(6, 6)">
              <rect
                x="0"
                y="0"
                width={Math.max(18, node.id.length * 7 + 6)}
                height="14"
                rx="3"
                fill={isSelected ? '#2563eb' : '#e2e8f0'}
              />
              <text
                x={Math.max(9, (node.id.length * 7 + 6) / 2)}
                y="10"
                textAnchor="middle"
                fontSize="9"
                fontWeight="700"
                fill={isSelected ? '#ffffff' : '#334155'}
                fontFamily="monospace"
              >
                {node.id}
              </text>
            </g>

            {/* Has Detailed Specification indicator dot */}
            {hasDetail && !readOnly && (
              <circle
                cx={node.width - 8}
                cy="8"
                r="3.5"
                fill="#10b981"
                stroke="#ffffff"
                strokeWidth="1"
              />
            )}

            {/* Node Text Label */}
            <text
              x={node.width / 2}
              y={node.height / 2 + (node.shape === 'cylinder' ? 4 : 3)}
              textAnchor="middle"
              fontSize="11"
              fontWeight={isSelected ? '700' : '600'}
              fill={isSelected ? '#1e3a8a' : '#1e293b'}
              fontFamily="sans-serif"
            >
              {node.label.length > 18 ? `${node.label.slice(0, 17)}…` : node.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
};
