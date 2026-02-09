// =============================================
// AI 도구 추천 엔진
// 키워드 매칭 + 점수 산정 로직
// =============================================

export interface AITool {
  id: string;
  name: string;
  category: string;
  subcategory: string | null;
  description: string;
  website_url: string | null;
  use_cases: string;
  keywords: string;
  automation_level: 'full' | 'semi' | 'assist';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  pricing_type: 'free' | 'freemium' | 'paid';
  rating: number;
  popularity: number;
  is_active: number;
}

export interface RecommendedTool {
  tool: AITool;
  score: number;
  matchedKeywords: string[];
  reason: string;
}

export interface RecommendationResult {
  category: string;
  keywords: string[];
  recommended_tools: RecommendedTool[];
  automation_level: 'full' | 'semi' | 'assist';
  time_saving: {
    percentage: number;
    saved_hours: number;
    new_hours: number;
  };
}

// 한국어 키워드 매핑 (업무 설명에서 AI 도구 키워드로 변환)
const KEYWORD_MAPPINGS: Record<string, string[]> = {
  // 문서 작성
  '문서': ['문서', '작성', '보고서'],
  '보고서': ['문서', '보고서', '작성'],
  '기획안': ['문서', '기획안', '작성', '제안서'],
  '제안서': ['문서', '제안서', '작성'],
  '이메일': ['문서', '이메일', '작성'],
  '회의록': ['회의록', '정리', '요약', '회의'],
  '발표': ['프레젠테이션', 'PPT', '슬라이드', '발표'],
  'PPT': ['프레젠테이션', 'PPT', '슬라이드'],
  '프레젠테이션': ['프레젠테이션', 'PPT', '슬라이드'],
  
  // 데이터 분석 - 로컬 파일 vs 웹 데이터 구분
  '분석': ['분석', '데이터', '통계'],
  '데이터': ['데이터', '분석', '시각화'],
  '통계': ['데이터', '통계', '분석'],
  '차트': ['차트', '그래프', '시각화'],
  '엑셀': ['데이터', '엑셀', '분석', '로컬파일', '파일분석'],
  'CSV': ['데이터', 'CSV', '분석', '로컬파일', '파일분석'],
  '스프레드시트': ['데이터', '엑셀', '스프레드시트', '로컬파일'],
  '업로드': ['로컬파일', '업로드', '파일분석'],
  '파일': ['로컬파일', '파일분석', '업로드'],
  '성과': ['분석', '데이터', '통계', '성과'],
  '모니터링': ['분석', '모니터링', '데이터'],
  // 웹 데이터 분석 전용 키워드
  '웹데이터': ['웹데이터', '웹분석', '크롤링', '인사이트'],
  '웹분석': ['웹데이터', '웹분석', '크롤링', '모니터링'],
  '검색결과': ['웹데이터', '검색', '인사이트', '웹분석'],
  '인사이트': ['인사이트', '분석', '웹데이터', '트렌드'],
  '트렌드': ['트렌드', '인사이트', '리서치', '웹분석'],
  
  // 마케팅
  'SNS': ['SNS', '마케팅', '게시물', '콘텐츠'],
  '소셜미디어': ['SNS', '마케팅', '게시물'],
  '게시물': ['SNS', '게시물', '콘텐츠'],
  '콘텐츠': ['콘텐츠', '마케팅', 'SNS'],
  '광고': ['광고', '마케팅', '카피'],
  '인스타그램': ['SNS', '인스타그램', '마케팅'],
  '페이스북': ['SNS', '페이스북', '마케팅'],
  '디자인': ['디자인', '이미지', 'SNS'],
  '이미지': ['이미지', '디자인', '생성'],
  '배너': ['디자인', '배너', '이미지'],
  '운영': ['운영', '관리', 'SNS', '콘텐츠'],
  '계획': ['계획', '운영', '기획안'],
  
  // 자동화 - AI 워크플로우 강화
  '자동화': ['자동화', '워크플로우', '자동', 'AI워크플로우'],
  '워크플로우': ['워크플로우', '자동화', '프로세스', 'AI워크플로우', '파이프라인'],
  '반복': ['자동화', '반복', '워크플로우', '배치'],
  '프로세스': ['프로세스', '자동화', '워크플로우'],
  '연동': ['연동', 'API', '자동화'],
  '템플릿': ['템플릿', '자동화', '문서'],
  // AI 워크플로우 전용 키워드
  'AI워크플로우': ['자동화', 'AI워크플로우', '프롬프트', '체이닝'],
  '프롬프트체이닝': ['자동화', '프롬프트', '체이닝', 'AI워크플로우'],
  '파이프라인': ['자동화', '파이프라인', '워크플로우', '배치'],
  '오케스트레이션': ['자동화', '오케스트레이션', '워크플로우', '파이프라인'],
  'ETL': ['데이터', 'ETL', '자동화', '파이프라인'],
  
  // 일정 관리
  '일정': ['일정', '스케줄', '관리', '캘린더'],
  '스케줄': ['스케줄', '일정', '관리'],
  '회의': ['회의', '미팅', '스케줄'],
  '시간': ['시간', '일정', '관리'],
  '캘린더': ['캘린더', '일정', '스케줄'],
  
  // 회의/녹음
  '녹음': ['녹음', '회의록', '전사'],
  '전사': ['전사', '녹음', '회의록'],
  '미팅': ['회의', '미팅', '녹음'],
  
  // 고객 서비스
  '고객': ['고객', '서비스', 'CS'],
  '서비스': ['서비스', '고객', 'CS'],
  '문의': ['문의', '고객', '서비스'],
  '응대': ['응대', '고객', '서비스'],
  '챗봇': ['챗봇', '고객', '자동화'],
  
  // 개발
  '코딩': ['코딩', '개발', '프로그래밍'],
  '개발': ['개발', '코딩', '프로그래밍'],
  '프로그래밍': ['프로그래밍', '코딩', '개발'],
  '앱': ['앱', '개발', '노코드'],
  
  // 리서치
  '검색': ['검색', '리서치', '조사'],
  '리서치': ['리서치', '검색', '조사'],
  '조사': ['조사', '리서치', '검색'],
  '트렌드': ['트렌드', '분석', '리서치'],
  
  // 이미지/영상
  '그림': ['이미지', '생성', '그림'],
  '영상': ['영상', '비디오', '생성'],
  '비디오': ['비디오', '영상', '생성'],
  '편집': ['편집', '영상', '이미지'],
  
  // 오디오 편집 (신규 추가)
  '음량': ['오디오', '음량', '볼륨', '편집', '정규화'],
  '볼륨': ['오디오', '볼륨', '음량', '편집'],
  '오디오': ['오디오', '음량', '편집', '사운드'],
  '음향': ['오디오', '음향', '편집', '사운드'],
  '소리': ['오디오', '소리', '편집', '사운드'],
  '레벨': ['오디오', '레벨', '음량', '정규화'],
  '정규화': ['오디오', '정규화', '음량', '레벨통일'],
  '노이즈': ['오디오', '노이즈', '잡음제거', '편집'],
  '잡음': ['오디오', '잡음', '노이즈', '편집'],
  
  // 음악 생성 (신규 추가)
  '음악': ['음악', '뮤직', '작곡', 'BGM', '배경음악'],
  '뮤직': ['음악', '뮤직', '작곡', 'BGM'],
  '작곡': ['음악', '작곡', '뮤직', '멜로디'],
  'BGM': ['음악', 'BGM', '배경음악', '사운드'],
  '배경음악': ['음악', '배경음악', 'BGM', '사운드'],
  '노래': ['음악', '노래', '보컬', '작곡'],
  '보컬': ['음악', '보컬', '노래', '가수'],
  
  // 웹 크롤링/데이터 수집 (신규 추가)
  '크롤링': ['크롤링', '웹스크래핑', '데이터수집', '자동화', '파이썬'],
  '스크래핑': ['크롤링', '웹스크래핑', '데이터수집', '자동화'],
  '웹크롤링': ['크롤링', '웹스크래핑', '데이터수집', '파이썬'],
  '수집': ['데이터수집', '크롤링', '자동화', '모니터링'],
  
  // 파이썬/코딩 (신규 추가)
  '파이썬': ['파이썬', 'Python', '코딩', '자동화', '데이터분석'],
  'Python': ['파이썬', 'Python', '코딩', '프로그래밍'],
  'Pandas': ['파이썬', 'Pandas', '데이터분석', '시각화'],
  '시각화': ['시각화', 'Matplotlib', '차트', '그래프', '데이터'],
  'Matplotlib': ['시각화', 'Matplotlib', '파이썬', '차트'],
  '스크립트': ['파이썬', '스크립트', '자동화', '코딩'],
  
  // 브라우저/AI 어시스턴트 (신규 추가)
  '브라우저': ['브라우저', 'Chrome', '웹', '자동화'],
  '어시스턴트': ['AI어시스턴트', '자동화', '도우미'],
  '웹자동화': ['웹자동화', '브라우저', '크롤링', '자동화'],
  
  // TTS/음성 합성 (신규 추가)
  'TTS': ['TTS', '음성합성', '나레이션', '더빙', 'AI보이스'],
  '음성합성': ['TTS', '음성합성', '나레이션', 'AI성우'],
  '나레이션': ['나레이션', 'TTS', '음성합성', '더빙'],
  '더빙': ['더빙', 'TTS', '음성합성', '나레이션'],
  'AI성우': ['TTS', 'AI성우', '음성합성', '나레이션'],
  '음성복제': ['음성복제', 'TTS', '보이스클론', 'AI보이스'],
  '보이스클론': ['보이스클론', '음성복제', 'TTS'],
  
  // STT/자막 생성 (신규 추가)
  'STT': ['STT', '음성인식', '전사', '자막', '자동자막'],
  '음성인식': ['STT', '음성인식', '전사', '자막생성'],
  '자막': ['자막', 'STT', '자막생성', '자동자막', '캡션'],
  '자막생성': ['자막생성', 'STT', '자막', '자동자막'],
  '자동자막': ['자동자막', 'STT', '자막', '음성인식'],
  '캡션': ['캡션', '자막', 'STT', '자막생성'],
  '번역자막': ['번역자막', '자막', '번역', '다국어']
};

// 업무 텍스트에서 키워드 추출
export function extractKeywords(text: string): string[] {
  const keywords: Set<string> = new Set();
  const lowerText = text.toLowerCase();
  
  for (const [keyword, mappings] of Object.entries(KEYWORD_MAPPINGS)) {
    if (lowerText.includes(keyword)) {
      mappings.forEach(k => keywords.add(k));
    }
  }
  
  return Array.from(keywords);
}

// 도구 점수 계산
export function calculateToolScore(tool: AITool, keywords: string[]): { score: number; matchedKeywords: string[] } {
  let score = tool.rating * 5; // 기본 점수 (평점 기반)
  const matchedKeywords: string[] = [];
  
  // 키워드 매칭 점수
  // keywords가 쉼표로 구분된 문자열이므로 split으로 처리
  const toolKeywords = tool.keywords.split(',').map(k => k.trim());
  for (const keyword of keywords) {
    if (toolKeywords.some(tk => tk.includes(keyword) || keyword.includes(tk))) {
      score += 3;
      matchedKeywords.push(keyword);
    }
  }
  
  // 난이도 보너스 (초보자용 도구 선호)
  if (tool.difficulty === 'beginner') {
    score += 3;
  } else if (tool.difficulty === 'intermediate') {
    score += 1;
  }
  
  // 가격 보너스
  if (tool.pricing_type === 'free') {
    score += 2;
  } else if (tool.pricing_type === 'freemium') {
    score += 1;
  }
  
  // 인기도 보너스
  score += tool.popularity / 50;
  
  return { score, matchedKeywords };
}

// 업무 카테고리 추론 (웹데이터/로컬파일 분리 지원)
export function inferCategory(keywords: string[]): string {
  const categoryScores: Record<string, number> = {
    '문서작성': 0,
    '데이터분석': 0,
    '로컬파일분석': 0,  // 엑셀/CSV 업로드 분석 신규
    '웹데이터분석': 0,  // 웹 검색/크롤링 분석 신규
    '마케팅': 0,
    '업무자동화': 0,
    '일정관리': 0,
    '회의': 0,
    '이미지생성': 0,
    '영상생성': 0,
    '영상편집': 0,
    '오디오편집': 0,
    '고객서비스': 0,
    '개발': 0,
    '리서치': 0,
    '웹크롤링': 0,
    '음악생성': 0,
    '음성생성': 0,
    '자막생성': 0,
    '다목적': 0
  };
  
  const categoryKeywords: Record<string, string[]> = {
    '문서작성': ['문서', '작성', '보고서', '기획안', '제안서', '이메일', '회의록', '프레젠테이션', 'PPT', '슬라이드'],
    // 데이터분석: 일반적인 데이터 분석 (기본)
    '데이터분석': ['데이터', '분석', '통계', '차트', '그래프', '시각화', '성과', 'Pandas', 'Matplotlib'],
    // 로컬파일분석: 엑셀/CSV/업로드 파일 전용 (신규)
    '로컬파일분석': ['엑셀', 'CSV', '로컬파일', '파일분석', '업로드', '스프레드시트', '파일'],
    // 웹데이터분석: 웹 검색/크롤링 결과 분석 (신규)
    '웹데이터분석': ['웹데이터', '웹분석', '검색결과', '인사이트', '트렌드', '웹페이지', '온라인데이터'],
    '마케팅': ['SNS', '마케팅', '게시물', '콘텐츠', '광고', '카피', '디자인', '배너', '운영'],
    // 업무자동화: AI 워크플로우 키워드 강화
    '업무자동화': ['자동화', '워크플로우', '자동', '반복', '프로세스', '연동', 'API', '템플릿', 'AI워크플로우', '프롬프트체이닝', '파이프라인', 'ETL', '오케스트레이션'],
    '일정관리': ['일정', '스케줄', '캘린더', '시간', '관리'],
    '회의': ['회의', '미팅', '녹음', '전사', '회의록', 'STT', '음성인식'],
    '이미지생성': ['이미지', '생성', '그림', '아트', '일러스트'],
    '영상생성': ['영상', '비디오', '효과'],
    '영상편집': ['편집', '영상', '컷편집', '자막'],
    '오디오편집': ['오디오', '음량', '볼륨', '정규화', '레벨', '음향', '소리', '노이즈', '잡음'],
    '고객서비스': ['고객', '서비스', 'CS', '문의', '응대', '챗봇'],
    '개발': ['코딩', '개발', '프로그래밍', '코드', '앱', '노코드'],
    '리서치': ['검색', '리서치', '조사', '트렌드', '정보'],
    '웹크롤링': ['크롤링', '스크래핑', '웹스크래핑', '데이터수집', '웹자동화', '모니터링'],
    '음악생성': ['음악', '뮤직', '작곡', 'BGM', '배경음악', '노래', '보컬', '멜로디'],
    '음성생성': ['TTS', '음성합성', '나레이션', '더빙', 'AI성우', 'AI보이스', '음성복제', '보이스클론'],
    '자막생성': ['자막', 'STT', '음성인식', '전사', '자동자막', '자막생성', '번역자막'],
    '다목적': ['파이썬', 'Python', '스크립트', '브라우저', 'AI어시스턴트']
  };
  
  for (const keyword of keywords) {
    for (const [category, catKeywords] of Object.entries(categoryKeywords)) {
      if (catKeywords.includes(keyword)) {
        categoryScores[category]++;
      }
    }
  }
  
  const maxCategory = Object.entries(categoryScores).reduce((a, b) => a[1] > b[1] ? a : b);
  return maxCategory[0];
}

// 자동화 수준 판단
export function determineAutomationLevel(tools: RecommendedTool[]): 'full' | 'semi' | 'assist' {
  const fullCount = tools.filter(t => t.tool.automation_level === 'full').length;
  const semiCount = tools.filter(t => t.tool.automation_level === 'semi').length;
  
  if (fullCount >= 3) return 'full';
  if (fullCount + semiCount >= 3) return 'semi';
  return 'assist';
}

// 시간 절감 계산
export function calculateTimeSaving(
  estimatedHours: number,
  automationLevel: 'full' | 'semi' | 'assist'
): { percentage: number; saved_hours: number; new_hours: number } {
  const savingsRate = {
    'full': 0.8,
    'semi': 0.6,
    'assist': 0.3
  };
  
  const rate = savingsRate[automationLevel];
  const savedHours = Math.round(estimatedHours * rate * 10) / 10;
  const newHours = Math.round((estimatedHours - savedHours) * 10) / 10;
  
  return {
    percentage: Math.round(rate * 100),
    saved_hours: savedHours,
    new_hours: newHours
  };
}

// 추천 이유 생성
export function generateReason(tool: AITool, matchedKeywords: string[]): string {
  // use_cases가 쉼표로 구분된 문자열이므로 split으로 처리
  const useCases = tool.use_cases.split(',').map(u => u.trim());
  const mainUseCase = useCases[0] || tool.description;
  
  if (matchedKeywords.length > 0) {
    return `"${matchedKeywords.slice(0, 2).join(', ')}" 키워드와 관련된 ${mainUseCase}에 최적화된 도구입니다.`;
  }
  
  return `${mainUseCase}에 유용한 도구입니다.`;
}

// 명확화 옵션 인터페이스
export interface ClarificationHint {
  category_hint?: string;  // 명확화에서 선택된 카테고리 힌트
  additional_keywords?: string[];  // 명확화에서 추가된 키워드
}

// 카테고리 힌트와 도구 카테고리 매핑
// 수정: 2026-02-09 - 로컬파일분석/웹데이터분석 카테고리 추가
const CATEGORY_HINT_MAPPING: Record<string, string[]> = {
  '오디오편집': ['영상편집', '영상생성', '오디오편집'],
  '영상편집': ['영상편집', '영상생성'],
  '영상생성': ['영상생성'],
  '이미지생성': ['이미지생성'],
  '문서작성': ['문서작성', '업무자동화', '다목적'],
  '데이터분석': ['데이터분석', '업무자동화', '다목적'],
  '로컬파일분석': ['데이터분석', '다목적'],  // 엑셀/CSV 파일 분석 → Julius AI 우선
  '웹데이터분석': ['데이터분석', '리서치', '웹크롤링'],  // 웹 검색/크롤링 분석 → Perplexity Comet 우선
  '마케팅': ['마케팅', '이미지생성'],
  '업무자동화': ['업무자동화', '다목적'],
  '고객서비스': ['고객서비스', '업무자동화'],
  '개발': ['개발', '업무자동화', '다목적'],
  '리서치': ['리서치', '데이터분석', '웹데이터분석'],
  '웹크롤링': ['데이터분석', '업무자동화', '다목적', '리서치', '웹데이터분석'],
  '음악생성': ['음악생성'],
  '음성생성': ['음성생성'],
  '자막생성': ['영상편집', '회의'],
  '다목적': ['다목적', '문서작성', '데이터분석']
};

// 카테고리별 추천 도구 이름 (명시적 우선순위)
// 수정: 2026-02-09 - 업무자동화에 Google Opal, Prefect, Airflow 우선순위
// 수정: 데이터분석을 웹데이터/로컬파일 구분
const CATEGORY_PREFERRED_TOOLS: Record<string, string[]> = {
  '오디오편집': ['CapCut', 'Adobe Podcast', 'Descript', 'Auphonic', 'DaVinci Resolve', 'Google Colab'],
  '영상편집': ['CapCut', 'DaVinci Resolve', 'Vrew', 'Descript', 'Google Colab'],
  '영상생성': ['Google VEO 3.1', 'OpenAI Sora 2', 'Runway ML', 'Pika Labs'],
  '이미지생성': ['Nano Banana Pro', 'DALL-E 3', 'Midjourney', 'Stable Diffusion'],
  '문서작성': ['ChatGPT', 'Gemini Gems', 'Notion AI', 'Microsoft Copilot', 'Claude'],
  // 데이터분석: 웹 데이터 분석 시 Perplexity Comet 우선, 로컬 파일 분석 시 Julius AI 우선
  '데이터분석': ['Perplexity Comet', 'Gemini in Chrome', 'Julius AI', 'Google Colab', 'ChatGPT', 'Claude'],
  '로컬파일분석': ['Julius AI', 'Google Colab', 'ChatGPT', 'Claude'],  // 엑셀/CSV 업로드 분석 전용
  '웹데이터분석': ['Perplexity Comet', 'Gemini in Chrome', 'Google Colab', 'Listly'],  // 웹 검색/크롤링 분석 전용
  '마케팅': ['Gemini Gems', 'ChatGPT', 'Canva', 'Copy.ai'],
  // 업무자동화: Google Opal, Python 모듈(Prefect, Airflow) 우선, Zapier/Make/n8n 후순위
  '업무자동화': ['Google Opal', 'Prefect', 'Apache Airflow', 'Google Apps Script', 'Google Colab', 'n8n', 'Zapier', 'Make'],
  '웹크롤링': ['Google Colab', 'Perplexity Comet', 'Gemini in Chrome', 'Listly', 'ChatGPT'],
  '음악생성': ['MiniMax Music', 'Suno AI', 'Udio', 'AIVA'],
  '음성생성': ['ElevenLabs', 'Supertone', 'Gemini TTS', 'Qwen3 TTS', 'Google AI Studio TTS'],
  '자막생성': ['Vrew', 'Descript', 'Clova Note', 'CapCut'],
  '다목적': ['Google Colab', 'Google Opal', 'ChatGPT', 'Claude', 'Gemini Gems', 'Perplexity Comet']
};

// 메인 추천 함수 (명확화 힌트 지원)
export function recommendTools(
  tools: AITool[],
  jobDescription: string,
  automationRequest: string,
  estimatedHours: number = 4,
  clarificationHint?: ClarificationHint  // 명확화 결과 추가
): RecommendationResult {
  // 1. 키워드 추출
  const combinedText = `${jobDescription} ${automationRequest}`;
  let keywords = extractKeywords(combinedText);
  
  // 1-1. 명확화에서 추가된 키워드 병합
  if (clarificationHint?.additional_keywords && clarificationHint.additional_keywords.length > 0) {
    keywords = [...new Set([...keywords, ...clarificationHint.additional_keywords])];
    console.log('명확화 키워드 추가:', clarificationHint.additional_keywords);
  }
  
  // 2. 카테고리 추론 (명확화 힌트가 있으면 우선 사용)
  let category = clarificationHint?.category_hint || inferCategory(keywords);
  
  // 카테고리 힌트가 제공된 경우 로그
  if (clarificationHint?.category_hint) {
    console.log('명확화 카테고리 힌트 적용:', clarificationHint.category_hint);
  }
  
  // 3. 각 도구별 점수 계산 (명확화 가중치 적용)
  const preferredTools = CATEGORY_PREFERRED_TOOLS[category] || [];
  const relatedCategories = CATEGORY_HINT_MAPPING[category] || [];
  
  const scoredTools: RecommendedTool[] = tools
    .filter(tool => tool.is_active)
    .map(tool => {
      let { score, matchedKeywords } = calculateToolScore(tool, keywords);
      
      // === 명확화 기반 가중치 적용 ===
      
      // 3-1. 명확화된 카테고리와 도구 카테고리가 일치하면 +30점
      if (clarificationHint?.category_hint) {
        if (relatedCategories.includes(tool.category)) {
          score += 30;
          console.log(`[가중치] ${tool.name}: 카테고리 일치 +30점 (${tool.category})`);
        }
      }
      
      // 3-2. 선호 도구 목록에 있으면 +40점 (순위에 따라 차등)
      const preferredIndex = preferredTools.findIndex(
        pt => tool.name.toLowerCase().includes(pt.toLowerCase()) || pt.toLowerCase().includes(tool.name.toLowerCase())
      );
      if (preferredIndex !== -1) {
        const preferredBonus = 40 - (preferredIndex * 5); // 1위: +40, 2위: +35, 3위: +30...
        score += Math.max(preferredBonus, 10);
        console.log(`[가중치] ${tool.name}: 선호 도구 +${Math.max(preferredBonus, 10)}점 (순위 ${preferredIndex + 1})`);
      }
      
      // 3-3. 명확화 키워드와 도구 키워드 추가 매칭 (+5점 per keyword)
      if (clarificationHint?.additional_keywords) {
        const toolKeywords = tool.keywords.split(',').map(k => k.trim().toLowerCase());
        for (const addKeyword of clarificationHint.additional_keywords) {
          if (toolKeywords.some(tk => tk.includes(addKeyword.toLowerCase()) || addKeyword.toLowerCase().includes(tk))) {
            score += 5;
            if (!matchedKeywords.includes(addKeyword)) {
              matchedKeywords.push(addKeyword);
            }
          }
        }
      }
      
      return {
        tool,
        score,
        matchedKeywords,
        reason: generateReason(tool, matchedKeywords)
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5); // 상위 5개
  
  // 4. 자동화 수준 판단
  const automationLevel = determineAutomationLevel(scoredTools);
  
  // 5. 시간 절감 계산
  const timeSaving = calculateTimeSaving(estimatedHours, automationLevel);
  
  return {
    category,
    keywords,
    recommended_tools: scoredTools,
    automation_level: automationLevel,
    time_saving: timeSaving
  };
}
