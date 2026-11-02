import { GoogleGenAI } from '@google/genai';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { business_purpose, module, program_id, title } = req.body || {};

    if (!business_purpose) {
      return res.status(400).json({ error: '업무 개요를 입력해주세요.' });
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

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

    return res.status(200).json({ logic: response.text || '' });
  } catch (error: any) {
    console.error('Vercel API error:', error);
    return res.status(500).json({ error: error?.message || 'Server error' });
  }
}
