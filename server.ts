import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// API endpoint: Transcribe recorded audio using Gemini transcribe model
app.post('/api/transcribe-audio', async (req, res) => {
  try {
    const { audioData, mimeType } = req.body || {};

    if (!audioData) {
      return res.status(400).json({ error: '오디오 데이터가 전달되지 않았습니다.' });
    }

    // Clean base64 string if it contains data URI prefix
    const base64Data = audioData.includes(',') ? audioData.split(',')[1] : audioData;
    const resolvedMimeType = mimeType || 'audio/webm';

    const audioPart = {
      inlineData: {
        mimeType: resolvedMimeType,
        data: base64Data,
      },
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: {
        parts: [
          audioPart,
          {
            text: '사용자가 말한 음성을 한국어로 정확하게 받아적어주세요. 인사말이나 부연 설명 없이 오직 받아적은 텍스트 내용만 출력하세요.',
          },
        ],
      },
    });

    const transcribedText = response.text?.trim() || '';
    return res.json({ text: transcribedText });
  } catch (error: any) {
    console.error('Audio transcription error:', error);
    return res.status(500).json({
      error: error?.message || '음성 인식 중 오류가 발생했습니다.',
    });
  }
});

// API endpoint: Suggest ABAP Data Extraction & Processing Logic
app.post('/api/generate-logic', async (req, res) => {
  try {
    const { business_purpose, module, program_id, title } = req.body || {};

    if (!business_purpose || typeof business_purpose !== 'string') {
      return res.status(400).json({ error: '업무 개요를 입력해주세요.' });
    }

    const systemPrompt = `당신은 20년 경력의 SAP ERP ABAP 시니어 테크니컬 아키텍트입니다.
사용자가 입력한 [업무 개요 및 개발 목적], [SAP 모듈], [프로그램 정보]를 분석하여, SAP 표준 개발 문서 양식에 맞는 구조화된 [데이터 추출 및 가공 로직]을 한국어로 작성해주세요.

반드시 다음 4가지 섹션을 체계적으로 포함해야 합니다:
1. 주요 대상 테이블 및 조회 조건 (모듈별 SAP 표준 테이블 예: SD는 VBAK/VBAP, MM은 MARA/EKKO/EKPO, FI는 BKPF/BSEG, CO는 CSKS/SETNODE/SETLEAF/COEP 등과 필드 관계)
2. 테이블 조인 및 데이터 추출 로직 (INNER/LEFT JOIN 관계, FOR ALL ENTRIES 조건, 성능 최적화)
3. 예외 판정 및 신호등(상태) 처리 로직 (LIGHTS: 1-Green 정상, 2-Yellow 경고, 3-Red 오류 판정 기준)
4. 데이터 집계 및 ALV 가공 로직 (루프 처리, 통화/단위 변환, 합계/소계 처리)

간결하고 실무적이며 가독성이 높은 형식으로 작성해주세요. 불필요한 서론이나 인사말은 생략하고 바로 로직 본문을 반환해주세요.`;

    const userPrompt = `[프로그램 정보]
- 프로그램 ID: ${program_id || 'Z_REPORT'}
- 타이틀: ${title || 'ALV Report'}
- 모듈: ${module || 'CO'}

[업무 개요 및 개발 목적]
${business_purpose}

위 내용을 기반으로 SAP ALV 사양서의 [데이터 추출 및 가공 로직]을 완성도 높게 제안해주세요.`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
      },
    });

    const generatedLogic = response.text || '';
    return res.json({ logic: generatedLogic });
  } catch (error: any) {
    console.error('Logic generation error:', error);
    return res.status(500).json({
      error: error?.message || '로직 제안 중 오류가 발생했습니다.',
    });
  }
});

// API endpoint: Fetch SAP Table Schema & Metadata (Standard DDIC or custom tables)
app.post('/api/fetch-sap-table-schema', async (req, res) => {
  try {
    const { tableName } = req.body || {};
    if (!tableName || typeof tableName !== 'string') {
      return res.status(400).json({ error: '테이블명을 입력해주세요.' });
    }

    const cleanTableName = tableName.trim().toUpperCase();

    const systemPrompt = `You are a senior SAP ABAP Data Dictionary (DDIC) and ERP data model architect.
Given an SAP table name (standard or custom), generate the exact or best-practice SAP Data Dictionary schema.
Rules:
1. Provide valid SAP data types: 'CHAR' | 'NUMC' | 'DATS' | 'TIMS' | 'CURR' | 'DEC' | 'UNIT' | 'INT4'.
2. Provide authentic field names (e.g., MANDT, VBELN, POSNR, MATNR, WERKS, BUKRS, ERDAT, NETWR, WAERK, MENGE, MEINS, etc.).
3. Mark primary key fields with isKey: true (e.g., client MANDT, document number, item number).
4. Provide bilingual Korean/English labels (e.g., 'Material Number (자재코드)', 'Sales Order (판매오더 번호)').
5. Provide the correct SAP functional module: 'SD' | 'MM' | 'FI' | 'CO' | 'PP' | 'PM' | 'QM' | 'COMMON'.
6. Include 8 to 25 essential fields commonly used in ALV reports for this table.
7. Return a valid JSON object matching the requested schema.`;

    const userPrompt = `SAP Table: ${cleanTableName}
Provide the complete DDIC schema metadata and field catalog for SAP table ${cleanTableName}.`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
      },
    });

    const rawText = response.text?.trim() || '{}';
    let schemaData: any = null;
    try {
      schemaData = JSON.parse(rawText);
    } catch (parseErr) {
      console.warn('JSON parse error for table schema', parseErr);
    }

    if (!schemaData || !Array.isArray(schemaData.fields) || schemaData.fields.length === 0) {
      schemaData = getFallbackTableSchema(cleanTableName);
    }

    // Ensure table attribute is uppercase clean
    schemaData.table = cleanTableName;
    if (!schemaData.name) {
      schemaData.name = `${cleanTableName} SAP Table Data`;
    }

    return res.json({ schema: schemaData });
  } catch (error: any) {
    console.warn('Gemini schema fetch issue, using fallback:', error?.message);
    const cleanTableName = String(req.body?.tableName || 'CUSTOM_TABLE').trim().toUpperCase();
    const fallbackSchema = getFallbackTableSchema(cleanTableName);
    return res.json({ schema: fallbackSchema, fallback: true });
  }
});

// Helper: Fallback schema generator for arbitrary SAP table names
function getFallbackTableSchema(table: string) {
  const t = table.toUpperCase();
  const isCustom = t.startsWith('Z') || t.startsWith('Y');

  return {
    table: t,
    name: isCustom ? `${t}: Custom SAP Table (고객 커스텀 테이블)` : `${t}: SAP ERP Table`,
    module: t.startsWith('VB') || t.startsWith('KN') ? 'SD' :
            t.startsWith('EK') || t.startsWith('MA') || t.startsWith('LF') ? 'MM' :
            t.startsWith('BK') || t.startsWith('BS') || t.startsWith('T0') ? 'FI' :
            t.startsWith('CS') || t.startsWith('AU') || t.startsWith('CO') ? 'CO' : 'COMMON',
    description: `SAP Data Dictionary table definition for ${t}`,
    fields: [
      { field: 'MANDT', label: 'Client (클라이언트)', datatype: 'CHAR', length: 3, isKey: true, description: 'Client number' },
      { field: isCustom ? `${t}_KEY` : `${t}_ID`, label: 'Primary ID (식별 키)', datatype: 'CHAR', length: 10, isKey: true, description: 'Primary Record Key' },
      { field: 'ERDAT', label: 'Created On (생성일자)', datatype: 'DATS', length: 8, isKey: false, description: 'Creation date' },
      { field: 'ERZET', label: 'Entry Time (생성시간)', datatype: 'TIMS', length: 6, isKey: false, description: 'Time of creation' },
      { field: 'ERNAM', label: 'Created By (생성자)', datatype: 'CHAR', length: 12, isKey: false, description: 'User who created the record' },
      { field: 'BUKRS', label: 'Company Code (회사코드)', datatype: 'CHAR', length: 4, isKey: false, description: 'Company code' },
      { field: 'STATUS', label: 'Processing Status (처리상태)', datatype: 'CHAR', length: 2, isKey: false, description: 'Status code' },
      { field: 'TEXT1', label: 'Description (내역 텍스트)', datatype: 'CHAR', length: 40, isKey: false, description: 'Item description text' },
      { field: 'MENGE', label: 'Quantity (수량)', datatype: 'DEC', length: 13, isKey: false, description: 'Quantity in base unit' },
      { field: 'MEINS', label: 'Base Unit (기본단위)', datatype: 'UNIT', length: 3, isKey: false, description: 'Unit of measure' },
      { field: 'NETWR', label: 'Net Amount (순금액)', datatype: 'CURR', length: 15, isKey: false, description: 'Net amount in document currency' },
      { field: 'WAERS', label: 'Currency (통화키)', datatype: 'CHAR', length: 5, isKey: false, description: 'Currency key' },
    ],
  };
}

// API endpoint: Generate realistic SAP ALV mock data records using Gemini model
app.post('/api/generate-mock-data', async (req, res) => {
  try {
    const { field_catalog, module, title, business_purpose, count = 5 } = req.body || {};

    if (!Array.isArray(field_catalog) || field_catalog.length === 0) {
      return res.status(400).json({ error: '필드 카탈로그 정보가 없습니다.' });
    }

    const fieldDescriptions = field_catalog.map((f: any) => ({
      fieldname: f.fieldname,
      coltext: f.coltext,
      datatype: f.datatype,
      length: f.outputlen || 10,
      ref_table: f.ref_table || '',
      ref_field: f.ref_field || '',
    }));

    const systemPrompt = `You are a specialized SAP ERP data generator.
Generate realistic mock data records for an SAP ALV Grid report based on the provided field catalog.
Rules for SAP ALV fields:
1. Status fields (e.g., ZICON, STATUS, LIGHTS): output '1' (Normal green), '2' (Warning yellow), or '3' (Error red).
2. Document numbers (e.g., VBELN, DOC_NO, EBELN, BELNR): realistic 10-digit SAP numbers (e.g., '0010000045', '4500019280').
3. Date fields (DATS): format as 'YYYY.MM.DD' (e.g., '2026.10.15').
4. Currency / numeric amounts (CURR, DEC, INT4): realistic integers or floating values (e.g., 45000000, 38200000).
5. Currency keys (e.g., WAERK, CURRENCY, WAERS): standard SAP currency ISO codes ('KRW', 'USD', 'EUR').
6. Partner / Customer names: realistic corporate or supplier names (e.g. '(주)삼성전자 수원공장', '현대모비스 남양연구소', 'LG에너지솔루션').
7. Quantities (MENGE, KWMENG): realistic quantities (e.g. 100, 50, 250).
8. Units (VRKME, MEINS): standard units ('EA', 'KG', 'BOX', 'ST').
9. Keep character strings within the specified length.

Return a JSON array of ${Math.min(Math.max(Number(count) || 5, 3), 10)} objects, where each object has keys exactly matching the fieldnames in the field catalog.`;

    const userPrompt = `Program Context:
- Title: ${title || 'SAP ALV Grid Report'}
- Module: ${module || 'SD'}
- Business Purpose: ${business_purpose || 'General ALV Grid'}

Field Catalog to populate:
${JSON.stringify(fieldDescriptions, null, 2)}

Generate ${Math.min(Math.max(Number(count) || 5, 3), 10)} realistic SAP records as a JSON array.`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
      },
    });

    const rawText = response.text?.trim() || '[]';
    let parsedRows: any[] = [];
    try {
      const parsed = JSON.parse(rawText);
      if (Array.isArray(parsed)) {
        parsedRows = parsed;
      } else if (parsed && typeof parsed === 'object') {
        const values = Object.values(parsed);
        const arrayVal = values.find((v) => Array.isArray(v));
        if (arrayVal) parsedRows = arrayVal as any[];
      }
    } catch (parseErr) {
      console.warn('JSON parse fallback for mock data', parseErr);
    }

    if (!parsedRows || parsedRows.length === 0) {
      parsedRows = generateFallbackSapRows(field_catalog, Number(count) || 5);
    }

    return res.json({ rows: parsedRows });
  } catch (error: any) {
    console.warn('Gemini API temporary issue, using intelligent SAP fallback generator:', error?.message);
    const fallbackRows = generateFallbackSapRows(req.body?.field_catalog || [], Number(req.body?.count) || 5);
    return res.json({ rows: fallbackRows, fallback: true });
  }
});

// API endpoint: Context-aware Markdown content suggestion tailored to section & screen config
app.post('/api/suggest-markdown', async (req, res) => {
  try {
    const {
      section,
      sectionTitle,
      programInfo,
      selectionParams = [],
      fieldCatalog = [],
      itemFieldCatalog = [],
      layout = {},
      customToolbar = [],
      nodeInfo,
      currentValue = '',
    } = req.body || {};

    if (!section) {
      return res.status(400).json({ error: '마크다운 섹션 위치 정보가 필요합니다.' });
    }

    const sectionRoleGuide =
      section === 'business_purpose'
        ? `작성 위치: [Business Purpose (업무 목적 및 개발 개요)]
- 이 프로그램의 비즈니스 배경, 개발 목적, 주요 대상 사용자, 화면 구성(Sample Type) 및 기대 효과를 명확하고 간결한 마크다운(#/## 제목, - 목록, **굵게**)으로 작성하세요.
- 선택화면 조회 조건과 ALV 출력 그리드/툴바/드릴다운 구성 요소를 자연스럽게 반영하세요.`
        : section === 'data_extraction_logic'
        ? `작성 위치: [Data Extraction & Logic (데이터 추출 및 가공 로직)]
- 다음 4가지를 실무적으로 구체화하여 마크다운으로 작성하세요:
  1. 주요 대상 테이블 및 선택화면 조회 조건 (실제 파라미터명과 참조 테이블/필드 반영)
  2. 테이블 조인 및 데이터 추출/동기화 로직 (Master-Detail이면 헤더-품목 연동, Tree면 계층 구조, Pivot이면 CDS View/집계 반영)
  3. 상태/신호등 및 예외 판정 로직
  4. ALV 그리드 가공(합계/정렬/색상/핫스팟/편집/커스텀 툴바 이벤트) 로직`
        : `작성 위치: [Data Flow 노드 상세 사양서]
- 선택된 Flow Chart 노드(${nodeInfo?.id || ''}: ${nodeInfo?.label || ''}, 형태: ${nodeInfo?.shape || 'rect'})의 역할에 딱 맞는 기술 사양서를 마크다운으로 작성하세요.
- 선행 노드(${(nodeInfo?.prevNodes || []).join(', ') || '시작'})에서 넘어오는 데이터와 후속 노드(${(nodeInfo?.nextNodes || []).join(', ') || '종료'})로 전달할 처리 결과를 반영하고, 프로그램의 실제 선택조건/필드카탈로그/테이블명을 인용하세요.`;

    const systemPrompt = `당신은 20년 경력의 SAP ERP ABAP 시니어 테크니컬 아키텍트입니다.
사용자가 현재 작성 중인 마크다운 편집기의 [위치]와 [전체 화면 구성(선택화면 파라미터, ALV 필드 카탈로그, 레이아웃, 툴바 버튼, 플로우차트 노드 연결)]을 종합적으로 분석해, 바로 사양서에 적용할 수 있는 최적의 마크다운 본문을 한국어로 제안하세요.
규칙:
- 불필요한 인사말/서론 없이 순수 마크다운 본문만 반환하세요.
- 화면에 실제로 정의된 파라미터명, 테이블명(REF_TABLE), 필드명(FIELDNAME), 툴바 기능, T-Code를 적극 반영하세요.
- 간결하고 가독성 좋은 마크다운(### 제목, - 목록, **강조**, \`코드\`)을 사용하세요.`;

    const screenContextSummary = {
      programInfo,
      selectionParams: selectionParams.slice(0, 15).map((p: any) => ({
        kind: p.kind,
        name: p.name,
        text: p.text,
        ref: p.ref_table ? `${p.ref_table}-${p.ref_field}` : p.datatype,
        obligatory: p.obligatory,
      })),
      headerFields: fieldCatalog.slice(0, 20).map((f: any) => ({
        fieldname: f.fieldname,
        coltext: f.coltext,
        datatype: f.datatype,
        ref: f.ref_table ? `${f.ref_table}-${f.ref_field}` : '',
        key: f.key,
        hotspot: f.hotspot,
        edit: f.edit,
        do_sum: f.do_sum,
        drilldown_tcode: f.drilldown_tcode,
      })),
      itemFields: itemFieldCatalog.slice(0, 15).map((f: any) => ({
        fieldname: f.fieldname,
        coltext: f.coltext,
        datatype: f.datatype,
        ref: f.ref_table ? `${f.ref_table}-${f.ref_field}` : '',
      })),
      layout,
      customToolbar: customToolbar
        .filter((b: any) => b.visible !== false)
        .map((b: any) => ({
          function: b.function,
          text: b.text,
          quickinfo: b.quickinfo,
        })),
      nodeInfo,
    };

    const userPrompt = `${sectionRoleGuide}

[섹션 제목]: ${sectionTitle || section}
[현재 화면 및 프로그램 구성(JSON)]:
${JSON.stringify(screenContextSummary, null, 2)}

[기존 작성 내용 참고(비어있으면 새로 작성, 내용이 있으면 화면 구성을 반영하여 보완)]:
${currentValue ? currentValue.slice(0, 1200) : '(비어 있음)'}

위 화면 구성과 마크다운 위치에 가장 적합한 최적의 사양서 내용을 마크다운으로 작성해 주세요.`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
      },
    });

    const suggested = (response.text || '').trim();
    return res.json({ markdown: suggested });
  } catch (error: any) {
    console.error('Markdown suggestion error:', error);
    return res.status(500).json({
      error: error?.message || 'AI 마크다운 제안 중 오류가 발생했습니다.',
    });
  }
});

// Helper: Intelligent deterministic SAP mock data generator
function generateFallbackSapRows(fields: any[], rowCount = 5): Record<string, any>[] {
  const result: Record<string, any>[] = [];
  const partnerNames = [
    '(주)삼성전자 수원공장',
    '현대모비스 남양연구소',
    'LG에너지솔루션 오창공장',
    'SK하이닉스 이천캠퍼스',
    '포스코 포항제철소',
  ];
  const amounts = [45000000, 38200000, 19800000, 52400000, 14500000];

  for (let r = 0; r < rowCount; r++) {
    const row: Record<string, any> = {};
    fields.forEach((f: any) => {
      const fn = String(f.fieldname || '').toUpperCase();
      if (fn === 'ZICON' || fn === 'STATUS' || fn === 'LIGHTS') {
        row[f.fieldname] = r === 2 ? '2' : r === 4 ? '3' : '1';
      } else if (fn.includes('VBELN') || fn.includes('DOC_NO') || fn.includes('DOCNO')) {
        row[f.fieldname] = `00100000${45 + r}`;
      } else if (fn.includes('EBELN')) {
        row[f.fieldname] = `450001928${r}`;
      } else if (fn.includes('BELNR')) {
        row[f.fieldname] = `100000001${r}`;
      } else if (f.datatype === 'DATS' || fn.includes('DATE') || fn.includes('ERDAT') || fn.includes('BUDAT')) {
        row[f.fieldname] = `2026.10.${String(10 + r * 3).padStart(2, '0')}`;
      } else if (
        f.datatype === 'CURR' ||
        f.datatype === 'DEC' ||
        fn.includes('AMOUNT') ||
        fn.includes('NETWR') ||
        fn.includes('DMBTR') ||
        fn.includes('NETPR')
      ) {
        row[f.fieldname] = amounts[r % amounts.length];
      } else if (
        fn.includes('WAERK') ||
        fn.includes('WAERS') ||
        fn.includes('CURRENCY') ||
        fn.includes('HWAER')
      ) {
        row[f.fieldname] = 'KRW';
      } else if (
        fn.includes('NAME') ||
        fn.includes('PARTNER') ||
        fn.includes('KUNNR') ||
        fn.includes('LIFNR')
      ) {
        row[f.fieldname] = partnerNames[r % partnerNames.length];
      } else if (fn.includes('MATNR')) {
        row[f.fieldname] = `MAT-PART-00${r + 1}`;
      } else if (fn.includes('MENGE') || fn.includes('KWMENG')) {
        row[f.fieldname] = (r + 1) * 25;
      } else if (fn.includes('MEINS') || fn.includes('VRKME')) {
        row[f.fieldname] = 'EA';
      } else if (f.datatype === 'NUMC') {
        row[f.fieldname] = String(r + 1).padStart(f.outputlen || 4, '0');
      } else {
        row[f.fieldname] = `${f.coltext || f.fieldname} ${r + 1}`;
      }
    });
    result.push(row);
  }
  return result;
}

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
