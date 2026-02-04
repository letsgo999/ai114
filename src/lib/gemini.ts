// =============================================
// Gemini API 연동 모듈
// AI 코칭 코멘트 자동 생성
// =============================================

import { AITool } from './types';
import { RecommendationResult, RecommendedTool } from './recommendation';
import { generateCategoryFallbackCoaching, AVAILABLE_CATEGORIES } from './fallback-templates';

// Gemini API 응답 타입
interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

// OpenAI API 응답 타입
interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

// AI 코칭 결과 타입
export interface AICoachingResult {
  summary: string;           // 업무 분석 요약
  workflow: WorkflowStep[];  // 단계별 워크플로우
  coaching_tips: string[];   // 코칭 팁
  time_analysis: {
    before: string;          // 자동화 전 예상 시간
    after: string;           // 자동화 후 예상 시간
    efficiency_gain: string; // 효율성 향상 설명
  };
  learning_roadmap: LearningStep[]; // 학습 로드맵
  conclusion: string;        // 종합 코멘트
}

export interface WorkflowStep {
  step_number: number;
  title: string;
  tool_name: string;
  tool_url: string;
  specific_feature: string;  // 사용할 구체적 기능/메뉴
  action_items: string[];    // 실행 항목
  expected_output: string;   // 예상 결과물
  time_estimate: string;     // 소요 시간
  tips: string;              // 팁
}

export interface LearningStep {
  priority: number;          // 학습 우선순위 (1, 2, 3...)
  tool_name: string;
  reason: string;            // 학습 이유
  learning_resources: string; // 학습 리소스 제안
  estimated_learning_time: string; // 예상 학습 시간
}

// Gemini API 호출 함수
export async function callGeminiAPI(
  apiKey: string,
  prompt: string
): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
        }
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json() as GeminiResponse;
  
  if (!data.candidates || data.candidates.length === 0) {
    throw new Error('No response from Gemini API');
  }

  return data.candidates[0].content.parts[0].text;
}

// AI 코칭 코멘트 생성 프롬프트 구성
function buildCoachingPrompt(
  taskInfo: {
    name: string;
    organization: string;
    department: string;
    job_description: string;
    repeat_cycle: string;
    automation_request: string;
    estimated_hours: number;
    current_tools: string | null;
  },
  recommendation: RecommendationResult
): string {
  const toolsList = recommendation.recommended_tools.map((rt, idx) => {
    return `${idx + 1}. ${rt.tool.name}
   - 카테고리: ${rt.tool.category}/${rt.tool.subcategory || '일반'}
   - 설명: ${rt.tool.description}
   - 웹사이트: ${rt.tool.website_url || 'N/A'}
   - 활용 사례: ${rt.tool.use_cases}
   - 자동화 수준: ${rt.tool.automation_level}
   - 난이도: ${rt.tool.difficulty}
   - 가격: ${rt.tool.pricing_type}${rt.tool.pricing_detail ? ` (${rt.tool.pricing_detail})` : ''}
   - 매칭 키워드: ${rt.matchedKeywords.join(', ')}`;
  }).join('\n\n');

  return `당신은 "디마불사" 코치입니다. 디지털 마케팅 및 AI 활용 전문 코치로서, 수강생의 반복 업무를 분석하고 AI 도구를 활용한 업무 자동화 방안을 상세하게 코칭해 주세요.

## 수강생 정보
- 이름: ${taskInfo.name}
- 소속: ${taskInfo.organization} ${taskInfo.department}

## 업무 내용
- 업무 설명: ${taskInfo.job_description}
- 반복 주기: ${taskInfo.repeat_cycle}
- 자동화 요청: ${taskInfo.automation_request}
- 현재 사용 도구: ${taskInfo.current_tools || '없음'}
- 현재 예상 소요 시간: ${taskInfo.estimated_hours}시간

## AI 도구 추천 결과 (키워드 매칭 기반)
- 분석된 업무 카테고리: ${recommendation.category}
- 추출된 키워드: ${recommendation.keywords.join(', ')}
- 자동화 가능 수준: ${recommendation.automation_level}
- 예상 시간 절감: ${recommendation.time_saving.percentage}% (${recommendation.time_saving.saved_hours}시간 절감)

### 추천 AI 도구 TOP 5
${toolsList}

---

## 요청사항
위 정보를 바탕으로 아래 JSON 형식으로 상세한 AI 코칭 코멘트를 작성해 주세요.
반드시 아래 JSON 형식만 출력하고, 다른 설명이나 마크다운 코드블록 없이 순수 JSON만 반환하세요.

{
  "summary": "업무 분석 요약 (2-3문장, 수강생의 업무 특성과 자동화 가능성을 설명)",
  "workflow": [
    {
      "step_number": 1,
      "title": "단계 제목",
      "tool_name": "도구 이름",
      "tool_url": "도구 URL",
      "specific_feature": "사용할 구체적 기능/메뉴 이름",
      "action_items": ["실행 항목 1", "실행 항목 2", "실행 항목 3"],
      "expected_output": "이 단계에서 얻을 수 있는 결과물",
      "time_estimate": "예상 소요 시간 (예: 5분)",
      "tips": "이 단계에서의 실용적인 팁"
    }
  ],
  "coaching_tips": [
    "전체적인 코칭 팁 1",
    "전체적인 코칭 팁 2",
    "전체적인 코칭 팁 3"
  ],
  "time_analysis": {
    "before": "자동화 전 예상 소요 시간 설명",
    "after": "자동화 후 예상 소요 시간 설명",
    "efficiency_gain": "효율성 향상에 대한 구체적 설명"
  },
  "learning_roadmap": [
    {
      "priority": 1,
      "tool_name": "가장 먼저 학습할 도구",
      "reason": "이 도구를 먼저 학습해야 하는 이유",
      "learning_resources": "추천 학습 리소스 (YouTube, 공식 문서 등)",
      "estimated_learning_time": "예상 학습 소요 시간"
    }
  ],
  "conclusion": "종합 코멘트 (수강생에게 격려와 함께 다음 단계 안내, 3-4문장)"
}

중요: 
1. workflow는 최소 3단계, 최대 6단계로 구성하세요.
2. 각 단계에서 실제로 사용할 도구의 구체적인 기능/메뉴를 명시하세요.
3. 실행 항목은 수강생이 바로 따라할 수 있도록 구체적으로 작성하세요.
4. learning_roadmap은 3개 이내로 작성하세요.
5. 모든 내용은 한국어로 작성하세요.
6. JSON만 출력하세요. 마크다운 코드블록(\`\`\`json)을 사용하지 마세요.`;
}

// JSON 파싱 헬퍼 함수
function parseJSONResponse(text: string): AICoachingResult {
  // 마크다운 코드블록 제거
  let cleanText = text.trim();
  if (cleanText.startsWith('```json')) {
    cleanText = cleanText.slice(7);
  } else if (cleanText.startsWith('```')) {
    cleanText = cleanText.slice(3);
  }
  if (cleanText.endsWith('```')) {
    cleanText = cleanText.slice(0, -3);
  }
  cleanText = cleanText.trim();

  try {
    return JSON.parse(cleanText) as AICoachingResult;
  } catch (error) {
    console.error('JSON parse error:', error);
    console.error('Raw text:', cleanText.substring(0, 500));
    throw new Error('Failed to parse AI response as JSON');
  }
}

// OpenAI API 호출 함수 (gpt-4o-mini)
export async function callOpenAIAPI(
  apiKey: string,
  prompt: string
): Promise<string> {
  const response = await fetch(
    'https://api.openai.com/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: '당신은 AI 활용 업무 자동화 전문 코치입니다. JSON 형식으로만 응답하세요.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4096,
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json() as OpenAIResponse;
  
  if (!data.choices || data.choices.length === 0) {
    throw new Error('No response from OpenAI API');
  }

  return data.choices[0].message.content;
}

// 메인 함수: Gemini API로 AI 코칭 코멘트 생성
export async function generateAICoaching(
  apiKey: string,
  taskInfo: {
    name: string;
    organization: string;
    department: string;
    job_description: string;
    repeat_cycle: string;
    automation_request: string;
    estimated_hours: number;
    current_tools: string | null;
  },
  recommendation: RecommendationResult
): Promise<AICoachingResult> {
  const prompt = buildCoachingPrompt(taskInfo, recommendation);
  
  const response = await callGeminiAPI(apiKey, prompt);
  
  return parseJSONResponse(response);
}

// OpenAI API로 AI 코칭 코멘트 생성 (대안 API)
export async function generateAICoachingWithOpenAI(
  apiKey: string,
  taskInfo: {
    name: string;
    organization: string;
    department: string;
    job_description: string;
    repeat_cycle: string;
    automation_request: string;
    estimated_hours: number;
    current_tools: string | null;
  },
  recommendation: RecommendationResult
): Promise<AICoachingResult> {
  const prompt = buildCoachingPrompt(taskInfo, recommendation);
  
  const response = await callOpenAIAPI(apiKey, prompt);
  
  return parseJSONResponse(response);
}

// =============================================
// 폴백 코칭 코멘트 생성 (카테고리별 특화 템플릿 사용)
// =============================================

/**
 * 폴백 코칭 생성 - 카테고리별 특화 템플릿 활용
 * 
 * Gemini API 실패 시 또는 API 키가 없을 때 호출됨
 * 기존의 기본 3단계 템플릿 대신 11개 카테고리별 상세 워크플로우 제공
 * 
 * @param taskInfo 사용자 업무 정보
 * @param recommendation AI 도구 추천 결과
 * @returns 카테고리에 맞는 상세 AI 코칭 결과
 */
export function generateFallbackCoaching(
  taskInfo: {
    name: string;
    job_description: string;
    estimated_hours: number;
    // 추가 정보 (선택적)
    organization?: string;
    department?: string;
    repeat_cycle?: string;
    automation_request?: string;
    current_tools?: string | null;
  },
  recommendation: RecommendationResult
): AICoachingResult {
  // 카테고리별 특화 폴백 템플릿 사용
  // fallback-templates.ts의 generateCategoryFallbackCoaching 호출
  return generateCategoryFallbackCoaching(
    {
      name: taskInfo.name,
      organization: taskInfo.organization || '',
      department: taskInfo.department || '',
      job_description: taskInfo.job_description,
      repeat_cycle: taskInfo.repeat_cycle || '',
      automation_request: taskInfo.automation_request || '',
      estimated_hours: taskInfo.estimated_hours,
      current_tools: taskInfo.current_tools || null
    },
    recommendation
  );
}

/**
 * 지원하는 카테고리 목록 반환
 * UI에서 카테고리 선택 시 사용 가능
 */
export function getSupportedCategories(): string[] {
  return AVAILABLE_CATEGORIES;
}
