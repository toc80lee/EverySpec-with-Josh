import { GoogleGenAI } from '@google/genai';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '25mb',
    },
  },
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { audioData, mimeType } = req.body || {};

    if (!audioData) {
      return res.status(400).json({ error: '오디오 데이터가 전달되지 않았습니다.' });
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

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
    return res.status(200).json({ text: transcribedText });
  } catch (error: any) {
    console.error('Audio transcription error in Vercel function:', error);
    return res.status(500).json({
      error: error?.message || '음성 인식 중 오류가 발생했습니다.',
    });
  }
}
