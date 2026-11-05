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
      model: 'gemini-3.8-flash',
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
      model: 'gemini-3.8-flash',
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
