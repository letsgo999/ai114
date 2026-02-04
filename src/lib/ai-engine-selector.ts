// =============================================
// AI 엔진 자동 선택 모듈
// 카테고리/키워드 기반 Gemini vs OpenAI 자동 선택
// =============================================

export type AIEngineType = 'auto' | 'gemini' | 'openai' | 'both';

export interface AIEngineSelection {
  selected_engine: 'gemini' | 'openai';
  reason: string;
  confidence: number;  // 0-100
  factors: SelectionFactor[];
}

export interface SelectionFactor {
  factor: string;
  weight: number;
  favors: 'gemini' | 'openai' | 'neutral';
  description: string;
}

// 카테고리별 AI 엔진 선호도
const CATEGORY_PREFERENCES: Record<string, { engine: 'gemini' | 'openai'; weight: number; reason: string }> = {
  // Gemini 선호 카테고리 (창의적/마케팅/콘텐츠)
  '마케팅': { engine: 'gemini', weight: 30, reason: '마케팅 콘텐츠 생성에 Gemini가 더 창의적' },
  '콘텐츠': { engine: 'gemini', weight: 25, reason: '콘텐츠 기획에 Gemini의 창의성 활용' },
  '이미지생성': { engine: 'gemini', weight: 20, reason: '이미지 관련 설명에 Gemini가 더 적합' },
  '영상생성': { engine: 'gemini', weight: 20, reason: '영상 콘텐츠 기획에 Gemini 활용' },
  '리서치': { engine: 'gemini', weight: 15, reason: '최신 정보 검색에 Gemini 강점' },
  
  // OpenAI 선호 카테고리 (기술적/분석적)
  '개발': { engine: 'openai', weight: 35, reason: '코드 및 기술 분석에 GPT가 더 정확' },
  '데이터분석': { engine: 'openai', weight: 30, reason: '데이터 분석 및 구조화에 GPT 강점' },
  '업무자동화': { engine: 'openai', weight: 25, reason: '워크플로우 설계에 GPT의 논리적 접근' },
  
  // 중립 카테고리 (둘 다 비슷)
  '문서작성': { engine: 'gemini', weight: 10, reason: '문서 작성은 둘 다 우수 (Gemini 약간 선호)' },
  '일정관리': { engine: 'openai', weight: 10, reason: '일정 관리는 둘 다 우수 (GPT 약간 선호)' },
  '회의': { engine: 'gemini', weight: 10, reason: '회의 관련은 둘 다 우수' },
  '고객서비스': { engine: 'openai', weight: 15, reason: '고객 응대 스크립트에 GPT 강점' },
  '오디오편집': { engine: 'openai', weight: 20, reason: '기술적 오디오 처리 설명에 GPT 강점' }
};

// 키워드별 AI 엔진 선호도
const KEYWORD_PREFERENCES: Record<string, { engine: 'gemini' | 'openai'; weight: number }> = {
  // OpenAI 선호 키워드 (기술/분석)
  '코드': { engine: 'openai', weight: 15 },
  '코딩': { engine: 'openai', weight: 15 },
  '개발': { engine: 'openai', weight: 15 },
  'API': { engine: 'openai', weight: 15 },
  '데이터베이스': { engine: 'openai', weight: 12 },
  '데이터': { engine: 'openai', weight: 10 },
  '분석': { engine: 'openai', weight: 10 },
  '통계': { engine: 'openai', weight: 10 },
  '엑셀': { engine: 'openai', weight: 8 },
  '자동화': { engine: 'openai', weight: 8 },
  '워크플로우': { engine: 'openai', weight: 8 },
  '스크립트': { engine: 'openai', weight: 10 },
  '정규화': { engine: 'openai', weight: 10 },
  '오디오': { engine: 'openai', weight: 8 },
  '레벨': { engine: 'openai', weight: 8 },
  
  // Gemini 선호 키워드 (창의/마케팅)
  '콘텐츠': { engine: 'gemini', weight: 12 },
  '마케팅': { engine: 'gemini', weight: 12 },
  'SNS': { engine: 'gemini', weight: 12 },
  '인스타그램': { engine: 'gemini', weight: 10 },
  '페이스북': { engine: 'gemini', weight: 10 },
  '유튜브': { engine: 'gemini', weight: 10 },
  '블로그': { engine: 'gemini', weight: 10 },
  '카피': { engine: 'gemini', weight: 12 },
  '광고': { engine: 'gemini', weight: 10 },
  '아이디어': { engine: 'gemini', weight: 15 },
  '창의': { engine: 'gemini', weight: 15 },
  '브레인스토밍': { engine: 'gemini', weight: 15 },
  '기획': { engine: 'gemini', weight: 10 },
  '디자인': { engine: 'gemini', weight: 10 },
  '이미지': { engine: 'gemini', weight: 8 },
  '영상': { engine: 'gemini', weight: 8 },
  '트렌드': { engine: 'gemini', weight: 12 }
};

// 복잡도 분석 (텍스트 길이, 기술 용어 등)
function analyzeComplexity(text: string): { level: 'simple' | 'medium' | 'complex'; score: number } {
  let score = 0;
  
  // 텍스트 길이
  if (text.length > 200) score += 20;
  else if (text.length > 100) score += 10;
  
  // 기술 용어 감지
  const technicalTerms = /API|데이터베이스|SQL|JSON|XML|스크립트|코드|함수|변수|알고리즘|정규화|노멀라이즈/gi;
  const techMatches = text.match(technicalTerms);
  if (techMatches) score += techMatches.length * 10;
  
  // 숫자/수식 포함
  const hasNumbers = /\d+%|\d+시간|\d+개|\d+건/g.test(text);
  if (hasNumbers) score += 10;
  
  if (score >= 40) return { level: 'complex', score };
  if (score >= 20) return { level: 'medium', score };
  return { level: 'simple', score };
}

// 창의성 요구 분석
function analyzeCreativityNeed(text: string): { level: 'high' | 'medium' | 'low'; score: number } {
  let score = 0;
  
  const creativeTerms = /아이디어|창의|새로운|독특|트렌드|영감|브레인스토밍|기획|컨셉|스토리|콘텐츠/gi;
  const creativeMatches = text.match(creativeTerms);
  if (creativeMatches) score += creativeMatches.length * 15;
  
  const marketingTerms = /마케팅|홍보|광고|캠페인|SNS|인스타|페이스북|유튜브/gi;
  const marketingMatches = text.match(marketingTerms);
  if (marketingMatches) score += marketingMatches.length * 10;
  
  if (score >= 30) return { level: 'high', score };
  if (score >= 15) return { level: 'medium', score };
  return { level: 'low', score };
}

// 메인 AI 엔진 선택 함수
export function selectAIEngine(
  category: string,
  keywords: string[],
  automationRequest: string,
  jobDescription: string
): AIEngineSelection {
  const factors: SelectionFactor[] = [];
  let geminiScore = 0;
  let openaiScore = 0;
  
  // 1. 카테고리 기반 점수
  const categoryPref = CATEGORY_PREFERENCES[category];
  if (categoryPref) {
    if (categoryPref.engine === 'gemini') {
      geminiScore += categoryPref.weight;
    } else {
      openaiScore += categoryPref.weight;
    }
    factors.push({
      factor: '업무 카테고리',
      weight: categoryPref.weight,
      favors: categoryPref.engine,
      description: `${category}: ${categoryPref.reason}`
    });
  }
  
  // 2. 키워드 기반 점수
  let keywordGemini = 0;
  let keywordOpenai = 0;
  const matchedKeywords: string[] = [];
  
  for (const keyword of keywords) {
    const pref = KEYWORD_PREFERENCES[keyword];
    if (pref) {
      if (pref.engine === 'gemini') {
        keywordGemini += pref.weight;
      } else {
        keywordOpenai += pref.weight;
      }
      matchedKeywords.push(keyword);
    }
  }
  
  // 텍스트에서 직접 키워드 검색
  const combinedText = `${jobDescription} ${automationRequest}`.toLowerCase();
  for (const [keyword, pref] of Object.entries(KEYWORD_PREFERENCES)) {
    if (combinedText.includes(keyword) && !matchedKeywords.includes(keyword)) {
      if (pref.engine === 'gemini') {
        keywordGemini += pref.weight;
      } else {
        keywordOpenai += pref.weight;
      }
      matchedKeywords.push(keyword);
    }
  }
  
  geminiScore += keywordGemini;
  openaiScore += keywordOpenai;
  
  if (matchedKeywords.length > 0) {
    const keywordFavor = keywordGemini > keywordOpenai ? 'gemini' : 
                         keywordOpenai > keywordGemini ? 'openai' : 'neutral';
    factors.push({
      factor: '키워드 분석',
      weight: Math.max(keywordGemini, keywordOpenai),
      favors: keywordFavor,
      description: `감지된 키워드: ${matchedKeywords.slice(0, 5).join(', ')}`
    });
  }
  
  // 3. 복잡도 분석
  const complexity = analyzeComplexity(combinedText);
  if (complexity.level === 'complex') {
    openaiScore += 15;
    factors.push({
      factor: '복잡도',
      weight: 15,
      favors: 'openai',
      description: '복잡한 요청으로 GPT의 구조화된 분석 선호'
    });
  } else if (complexity.level === 'simple') {
    geminiScore += 5;
    factors.push({
      factor: '복잡도',
      weight: 5,
      favors: 'gemini',
      description: '단순한 요청으로 빠른 응답 선호'
    });
  }
  
  // 4. 창의성 요구 분석
  const creativity = analyzeCreativityNeed(combinedText);
  if (creativity.level === 'high') {
    geminiScore += 20;
    factors.push({
      factor: '창의성 요구',
      weight: 20,
      favors: 'gemini',
      description: '창의적 아이디어가 필요한 요청'
    });
  } else if (creativity.level === 'low') {
    openaiScore += 10;
    factors.push({
      factor: '창의성 요구',
      weight: 10,
      favors: 'openai',
      description: '분석적/논리적 접근이 필요한 요청'
    });
  }
  
  // 5. 최종 선택
  const totalScore = geminiScore + openaiScore;
  const selectedEngine: 'gemini' | 'openai' = geminiScore >= openaiScore ? 'gemini' : 'openai';
  const winningScore = Math.max(geminiScore, openaiScore);
  const confidence = totalScore > 0 ? Math.round((winningScore / totalScore) * 100) : 50;
  
  // 이유 생성
  const topFactors = factors
    .filter(f => f.favors === selectedEngine)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 2);
  
  const reasonParts = topFactors.map(f => f.description);
  const reason = selectedEngine === 'gemini' 
    ? `Gemini 선택: ${reasonParts.join(', ') || '일반적인 요청에 적합'}`
    : `GPT-4o-mini 선택: ${reasonParts.join(', ') || '일반적인 요청에 적합'}`;
  
  return {
    selected_engine: selectedEngine,
    reason,
    confidence,
    factors
  };
}

// 엔진 선택 옵션 설명
export const ENGINE_OPTIONS = {
  auto: {
    label: '자동 선택 (추천)',
    description: '요청 내용을 분석하여 최적의 AI 엔진을 자동으로 선택합니다'
  },
  gemini: {
    label: 'Gemini 2.5 Flash',
    description: '창의적인 콘텐츠, 마케팅, 아이디어 발굴에 강점'
  },
  openai: {
    label: 'ChatGPT (GPT-4o-mini)',
    description: '기술적 분석, 데이터 처리, 구조화된 워크플로우에 강점'
  },
  both: {
    label: '둘 다 비교',
    description: '두 AI의 응답을 모두 받아 비교합니다 (시간이 더 걸립니다)'
  }
};
