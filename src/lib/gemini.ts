// =============================================
// Gemini API 연동 모듈
// AI 코칭 코멘트 자동 생성
// =============================================

import { AITool } from './types';
import { RecommendationResult, RecommendedTool } from './recommendation';

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

// 메인 함수: AI 코칭 코멘트 생성
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

// 간단한 코칭 코멘트 생성 (폴백용)
export function generateFallbackCoaching(
  taskInfo: {
    name: string;
    job_description: string;
    estimated_hours: number;
  },
  recommendation: RecommendationResult
): AICoachingResult {
  const topTool = recommendation.recommended_tools[0]?.tool;
  const secondTool = recommendation.recommended_tools[1]?.tool;
  const thirdTool = recommendation.recommended_tools[2]?.tool;

  return {
    summary: `${taskInfo.name}님의 "${taskInfo.job_description}" 업무는 ${recommendation.category} 카테고리로 분류되며, AI 도구를 활용하면 약 ${recommendation.time_saving.percentage}%의 시간 절감이 가능합니다.`,
    workflow: [
      {
        step_number: 1,
        title: '업무 분석 및 계획 수립',
        tool_name: topTool?.name || 'ChatGPT',
        tool_url: topTool?.website_url || 'https://chat.openai.com',
        specific_feature: '대화형 AI 어시스턴트',
        action_items: [
          '현재 업무 프로세스 정리',
          '자동화 가능한 부분 식별',
          'AI 도구 활용 계획 수립'
        ],
        expected_output: '업무 자동화 계획서',
        time_estimate: '10분',
        tips: '구체적인 업무 내용과 원하는 결과물을 명확히 설명하세요.'
      },
      {
        step_number: 2,
        title: '핵심 업무 자동화',
        tool_name: secondTool?.name || topTool?.name || 'AI 도구',
        tool_url: secondTool?.website_url || topTool?.website_url || '',
        specific_feature: '자동화 기능',
        action_items: [
          '도구 계정 생성 및 설정',
          '업무 템플릿 생성',
          '자동화 워크플로우 구성'
        ],
        expected_output: '자동화된 업무 프로세스',
        time_estimate: '20분',
        tips: '처음에는 간단한 작업부터 자동화를 시작하세요.'
      },
      {
        step_number: 3,
        title: '결과물 검토 및 최적화',
        tool_name: thirdTool?.name || topTool?.name || 'AI 도구',
        tool_url: thirdTool?.website_url || topTool?.website_url || '',
        specific_feature: '검토 및 편집 기능',
        action_items: [
          '생성된 결과물 검토',
          '필요시 수정 및 보완',
          '최종 결과물 저장'
        ],
        expected_output: '완성된 업무 결과물',
        time_estimate: '10분',
        tips: 'AI 결과물은 항상 한 번 더 검토하는 습관을 들이세요.'
      }
    ],
    coaching_tips: [
      '처음에는 하나의 도구에 집중하여 충분히 익숙해진 후 다른 도구로 확장하세요.',
      '반복되는 작업은 템플릿화하여 재사용하면 더 큰 시간 절감 효과를 얻을 수 있습니다.',
      'AI 도구는 보조 수단입니다. 최종 검토는 항상 직접 수행하세요.'
    ],
    time_analysis: {
      before: `현재 ${taskInfo.estimated_hours}시간 소요`,
      after: `자동화 후 ${recommendation.time_saving.new_hours}시간 소요 예상`,
      efficiency_gain: `약 ${recommendation.time_saving.saved_hours}시간(${recommendation.time_saving.percentage}%)의 시간을 절감할 수 있습니다.`
    },
    learning_roadmap: recommendation.recommended_tools.slice(0, 3).map((rt, idx) => ({
      priority: idx + 1,
      tool_name: rt.tool.name,
      reason: rt.reason,
      learning_resources: `${rt.tool.name} 공식 문서 및 YouTube 튜토리얼`,
      estimated_learning_time: rt.tool.difficulty === 'beginner' ? '30분' : rt.tool.difficulty === 'intermediate' ? '1시간' : '2시간'
    })),
    conclusion: `${taskInfo.name}님, 추천드린 AI 도구들을 활용하시면 "${taskInfo.job_description}" 업무를 훨씬 효율적으로 처리하실 수 있습니다. 먼저 ${topTool?.name || '첫 번째 추천 도구'}부터 시작해 보시고, 궁금한 점이 있으시면 언제든 문의해 주세요. 화이팅!`
  };
}
