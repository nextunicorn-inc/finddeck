import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * LLM 추출 데이터 구조 (Refactoring Phase)
 * - aiSummary: 공고 전체 요약
 * - targetDetail: 신청 자격 상세 서술
 * - exclusionDetail: 제외 대상 상세 서술
 */
export interface ApplicationTarget {
  aiSummary: string;
  targetDetail: string;
  exclusionDetail: string;
}

// LLM 프롬프트 및 스키마 정의
const EXTRACTION_PROMPT = `
공고문 이미지/텍스트를 분석하여 다음 3가지 핵심 정보를 추출 및 요약해줘.
사용자가 지원 여부를 판단할 수 있도록 "서술형"으로 상세하게 작성해야 함.

1. **aiSummary**: 공고의 전체 내용을 3~5문장으로 요약. (사업 목적, 주요 지원 내용, 지원 규모 등 핵심 포함)
2. **targetDetail**: "신청 자격" 및 "지원 대상"에 대한 모든 조건을 빠짐없이 서술. (업력, 지역, 분야, 매출, 고용 조건 등 포함). 목록형 텍스트로 정리.
3. **exclusionDetail**: "신청 제외 대상", "지원 불가 사유", "참여 제한" 조건을 빠짐없이 서술. (매우 중요함. 없으면 "특이사항 없음"으로 기재). 목록형 텍스트로 정리.

(주의: 입력된 이미지는 하나의 긴 공고문이 나누어진 것입니다. 모든 이미지를 순서대로 빠짐없이 읽고 통합하여 분석하시오.)
`;

const schema: any = {
  type: SchemaType.OBJECT,
  properties: {
    aiSummary: { type: SchemaType.STRING, description: "공고 전체 핵심 요약 (3~5문장)" },
    targetDetail: { type: SchemaType.STRING, description: "신청 자격 및 지원 대상 상세 서술 (목록형 줄글)" },
    exclusionDetail: { type: SchemaType.STRING, description: "신청 제외 대상 및 제한 조건 상세 서술 (목록형 줄글)" },
  },
  required: ["aiSummary", "targetDetail", "exclusionDetail"],
};

/**
 * eligibility 텍스트에서 정보 추출 (Text Mode)
 */
export async function extractApplicationTarget(
  eligibilityText: string,
  descriptionText?: string
): Promise<ApplicationTarget | null> {
  if (!process.env.GEMINI_API_KEY) {
    console.error('[LLM] GEMINI_API_KEY not configured');
    return null;
  }

  if (!eligibilityText && !descriptionText) {
    return null;
  }

  const inputText = [eligibilityText, descriptionText].filter(Boolean).join('\n\n---\n\n');

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: EXTRACTION_PROMPT + '\n\n' + inputText }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
        responseSchema: schema,
      },
    });

    const response = result.response;
    return parseLlmResponse(response.text());
  } catch (error) {
    console.error('[LLM] Text extraction failed:', error);
    return null;
  }
}

/**
 * 이미지(들)에서 정보 추출 (Vision Mode)
 */
export async function extractTargetFromImage(
  images: string | string[],
  mimeType: string = 'image/jpeg'
): Promise<ApplicationTarget | null> {
  if (!process.env.GEMINI_API_KEY) {
    console.error('[LLM] GEMINI_API_KEY not configured');
    return null;
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const imageList = Array.isArray(images) ? images : [images];
    const imageParts = imageList.map(img => ({
      inlineData: {
        data: img,
        mimeType,
      },
    }));

    // 타임아웃 90초
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Vision AI request timed out')), 90000)
    );

    const generatePromise = model.generateContent({
      contents: [{
        role: 'user',
        parts: [
          { text: EXTRACTION_PROMPT },
          ...imageParts,
        ],
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
        responseSchema: schema,
      },
    });

    const result: any = await Promise.race([generatePromise, timeoutPromise]);
    const response = result.response;
    return parseLlmResponse(response.text());

  } catch (error) {
    console.error('Vision AI extraction error:', error);
    return null;
  }
}

function parseLlmResponse(text: string): ApplicationTarget {
  try {
    const parsed = JSON.parse(text) as ApplicationTarget;
    return {
      aiSummary: parsed.aiSummary || '',
      targetDetail: parsed.targetDetail || '',
      exclusionDetail: parsed.exclusionDetail || '',
    };
  } catch (e) {
    console.error('JSON Parse Error:', e);
    return {
      aiSummary: '',
      targetDetail: '',
      exclusionDetail: '',
    };
  }
}
