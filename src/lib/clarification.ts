// =============================================
// 명확화 질문 모듈
// 모호한 요청 감지 및 추가 질문 생성
// =============================================

export interface ClarificationQuestion {
  id: string;
  question: string;
  options: ClarificationOption[];
}

export interface ClarificationOption {
  id: string;
  label: string;
  keywords: string[];  // 선택 시 추가될 키워드
  category_hint?: string;  // 카테고리 힌트
}

export interface ClarificationResult {
  needs_clarification: boolean;
  ambiguity_score: number;  // 0-100 (높을수록 모호함)
  detected_ambiguities: string[];
  questions: ClarificationQuestion[];
  original_keywords: string[];
}

// 모호한 키워드 패턴 정의
const AMBIGUOUS_PATTERNS: Record<string, {
  pattern: RegExp;
  ambiguity_type: string;
  questions: ClarificationQuestion;
}> = {
  // 음향/오디오 관련 모호성
  'audio_ambiguity': {
    pattern: /음향|소리|오디오|볼륨|녹음.*맞추|소리.*다르|음향.*틀리|레벨|음량/i,
    ambiguity_type: '오디오 작업 유형 불명확',
    questions: {
      id: 'audio_type',
      question: '어떤 오디오 작업이 필요하신가요?',
      options: [
        { id: 'audio_normalize', label: '여러 파일의 음량(볼륨) 레벨을 통일하고 싶어요', keywords: ['오디오', '정규화', '노멀라이즈', '레벨', '음량'], category_hint: '오디오편집' },
        { id: 'audio_quality', label: '음질을 개선하고 싶어요 (잡음 제거, 선명도 향상)', keywords: ['오디오', '향상', '잡음제거', '음질'], category_hint: '오디오편집' },
        { id: 'audio_edit', label: '오디오를 편집하고 싶어요 (자르기, 합치기)', keywords: ['오디오', '편집', '컷', '병합'], category_hint: '오디오편집' },
        { id: 'audio_transcribe', label: '음성을 텍스트로 변환하고 싶어요', keywords: ['전사', '자막', 'STT', '음성인식'], category_hint: '회의' }
      ]
    }
  },

  // 영상 관련 모호성
  'video_ambiguity': {
    pattern: /영상|비디오|동영상|유튜브|편집.*영상|영상.*편집/i,
    ambiguity_type: '영상 작업 유형 불명확',
    questions: {
      id: 'video_type',
      question: '어떤 영상 작업이 필요하신가요?',
      options: [
        { id: 'video_create', label: '새로운 영상을 AI로 생성하고 싶어요', keywords: ['영상', '생성', 'AI영상'], category_hint: '영상생성' },
        { id: 'video_edit', label: '기존 영상을 편집하고 싶어요 (자르기, 효과 추가)', keywords: ['영상', '편집', '효과', '컷'], category_hint: '영상생성' },
        { id: 'video_subtitle', label: '자막을 추가하거나 번역하고 싶어요', keywords: ['자막', '번역', '캡션'], category_hint: '영상생성' },
        { id: 'video_thumbnail', label: '썸네일 이미지를 만들고 싶어요', keywords: ['썸네일', '이미지', '디자인'], category_hint: '이미지생성' }
      ]
    }
  },

  // 문서 관련 모호성
  'document_ambiguity': {
    pattern: /문서|작성|보고서|기획|제안서/i,
    ambiguity_type: '문서 작업 유형 불명확',
    questions: {
      id: 'document_type',
      question: '어떤 문서 작업이 필요하신가요?',
      options: [
        { id: 'doc_create', label: '새 문서 초안을 AI로 작성하고 싶어요', keywords: ['문서', '초안', '작성', 'AI작성'], category_hint: '문서작성' },
        { id: 'doc_summarize', label: '기존 문서를 요약하거나 정리하고 싶어요', keywords: ['요약', '정리', '문서분석'], category_hint: '문서작성' },
        { id: 'doc_format', label: '문서 형식/디자인을 개선하고 싶어요', keywords: ['포맷', '디자인', '템플릿'], category_hint: '문서작성' },
        { id: 'doc_translate', label: '문서를 번역하고 싶어요', keywords: ['번역', '다국어', '현지화'], category_hint: '문서작성' }
      ]
    }
  },

  // 이미지 관련 모호성
  'image_ambiguity': {
    pattern: /이미지|그림|디자인|사진|배너|포스터/i,
    ambiguity_type: '이미지 작업 유형 불명확',
    questions: {
      id: 'image_type',
      question: '어떤 이미지 작업이 필요하신가요?',
      options: [
        { id: 'img_create', label: '새로운 이미지를 AI로 생성하고 싶어요', keywords: ['이미지', '생성', 'AI이미지'], category_hint: '이미지생성' },
        { id: 'img_edit', label: '기존 이미지를 편집하고 싶어요', keywords: ['이미지', '편집', '보정'], category_hint: '이미지생성' },
        { id: 'img_remove_bg', label: '배경을 제거하거나 교체하고 싶어요', keywords: ['배경제거', '누끼', '배경교체'], category_hint: '이미지생성' },
        { id: 'img_design', label: '마케팅용 디자인 (배너, 포스터)을 만들고 싶어요', keywords: ['디자인', '배너', '포스터', '마케팅'], category_hint: '마케팅' }
      ]
    }
  },

  // 자동화 관련 모호성 (AI 워크플로우 강화)
  'automation_ambiguity': {
    pattern: /자동화|자동으로|반복.*업무|업무.*반복|워크플로우|파이프라인/i,
    ambiguity_type: '자동화 대상 불명확',
    questions: {
      id: 'automation_type',
      question: '어떤 종류의 업무를 자동화하고 싶으신가요?',
      options: [
        { id: 'auto_ai_workflow', label: 'AI 기반 워크플로우를 만들고 싶어요 (프롬프트 체이닝)', keywords: ['AI워크플로우', '프롬프트', '체이닝', 'Opal', '자동화'], category_hint: '업무자동화' },
        { id: 'auto_python', label: '파이썬으로 데이터 파이프라인을 만들고 싶어요', keywords: ['파이썬', '파이프라인', 'ETL', 'Prefect', 'Airflow', '오케스트레이션'], category_hint: '업무자동화' },
        { id: 'auto_app_connect', label: '여러 앱 간의 연동을 자동화하고 싶어요', keywords: ['워크플로우', '연동', 'API', '통합', '앱연동'], category_hint: '업무자동화' },
        { id: 'auto_report', label: '보고서/리포트 생성을 자동화하고 싶어요', keywords: ['보고서', '리포트', '자동생성'], category_hint: '데이터분석' }
      ]
    }
  },

  // 고객 관련 모호성
  'customer_ambiguity': {
    pattern: /고객|문의|응대|CS|서비스/i,
    ambiguity_type: '고객 서비스 유형 불명확',
    questions: {
      id: 'customer_type',
      question: '어떤 고객 서비스 업무를 개선하고 싶으신가요?',
      options: [
        { id: 'cs_chatbot', label: '자동 응답 챗봇을 만들고 싶어요', keywords: ['챗봇', '자동응답', 'FAQ'], category_hint: '고객서비스' },
        { id: 'cs_template', label: '응대 템플릿/스크립트를 만들고 싶어요', keywords: ['템플릿', '스크립트', '응대'], category_hint: '고객서비스' },
        { id: 'cs_analyze', label: '고객 문의를 분석하고 싶어요', keywords: ['분석', '문의분석', '인사이트'], category_hint: '데이터분석' },
        { id: 'cs_manage', label: '고객 정보/이력을 관리하고 싶어요', keywords: ['CRM', '고객관리', '이력'], category_hint: '업무자동화' }
      ]
    }
  },

  // 데이터 관련 모호성 (웹 데이터 vs 로컬 파일 구분 강화)
  'data_ambiguity': {
    pattern: /데이터|분석|통계|엑셀|스프레드시트|인사이트|시각화/i,
    ambiguity_type: '데이터 작업 유형 불명확',
    questions: {
      id: 'data_type',
      question: '어떤 데이터를 분석하고 싶으신가요?',
      options: [
        { id: 'data_web', label: '웹사이트/검색 결과 데이터를 분석하고 싶어요', keywords: ['웹데이터', '웹분석', '검색결과', '인사이트', '트렌드', '웹페이지'], category_hint: '웹데이터분석' },
        { id: 'data_local', label: '엑셀/CSV 등 파일을 업로드해서 분석하고 싶어요', keywords: ['엑셀', 'CSV', '로컬파일', '파일분석', '업로드', '스프레드시트'], category_hint: '로컬파일분석' },
        { id: 'data_visualize', label: '차트/그래프로 시각화하고 싶어요', keywords: ['시각화', '차트', '그래프', '대시보드', 'Matplotlib'], category_hint: '데이터분석' },
        { id: 'data_collect', label: '웹에서 데이터를 수집/크롤링하고 싶어요', keywords: ['수집', '크롤링', '스크래핑', '웹자동화'], category_hint: '웹크롤링' }
      ]
    }
  },

  // 웹 크롤링/데이터 수집 관련 모호성 (신규)
  'crawling_ambiguity': {
    pattern: /크롤링|스크래핑|웹.*수집|사이트.*데이터|모니터링.*자동/i,
    ambiguity_type: '웹 데이터 수집 방식 불명확',
    questions: {
      id: 'crawling_type',
      question: '어떤 방식으로 웹 데이터를 수집/활용하고 싶으신가요?',
      options: [
        { id: 'crawl_browser', label: 'AI 브라우저로 간편하게 수집하고 싶어요', keywords: ['브라우저', 'AI어시스턴트', '자동화', '웹검색'], category_hint: '웹크롤링' },
        { id: 'crawl_python', label: '파이썬 코드로 직접 크롤링하고 싶어요', keywords: ['파이썬', 'BeautifulSoup', '크롤링', '스크래핑'], category_hint: '다목적' },
        { id: 'crawl_nocode', label: '노코드 도구로 간단히 수집하고 싶어요', keywords: ['노코드', '자동화', 'Listly'], category_hint: '업무자동화' },
        { id: 'crawl_monitor', label: '웹사이트 변경사항을 모니터링하고 싶어요', keywords: ['모니터링', '알림', '변경감지'], category_hint: '업무자동화' }
      ]
    }
  },

  // 파이썬/코딩 관련 모호성 (신규)
  'python_ambiguity': {
    pattern: /파이썬|python|코딩|스크립트|코드.*자동|프로그래밍/i,
    ambiguity_type: '파이썬 활용 목적 불명확',
    questions: {
      id: 'python_type',
      question: '파이썬으로 어떤 작업을 하고 싶으신가요?',
      options: [
        { id: 'py_data', label: '데이터 분석/시각화 (Pandas, Matplotlib)', keywords: ['파이썬', 'Pandas', 'Matplotlib', '데이터분석', '시각화'], category_hint: '다목적' },
        { id: 'py_crawl', label: '웹 크롤링/스크래핑 (BeautifulSoup, Selenium)', keywords: ['파이썬', 'BeautifulSoup', '크롤링', '웹스크래핑'], category_hint: '웹크롤링' },
        { id: 'py_video', label: '영상/오디오 처리 (moviepy, FFmpeg)', keywords: ['파이썬', 'moviepy', 'FFmpeg', '영상처리', '오디오'], category_hint: '다목적' },
        { id: 'py_automate', label: '업무 자동화 스크립트', keywords: ['파이썬', '자동화', '스크립트', '배치'], category_hint: '업무자동화' }
      ]
    }
  },

  // 음악/오디오 생성 관련 모호성 (신규)
  'music_ambiguity': {
    pattern: /음악|BGM|배경음악|작곡|뮤직|노래.*만들|사운드.*생성/i,
    ambiguity_type: '음악/오디오 생성 목적 불명확',
    questions: {
      id: 'music_type',
      question: '어떤 음악/오디오를 만들고 싶으신가요?',
      options: [
        { id: 'music_bgm', label: '영상용 배경음악(BGM)을 만들고 싶어요', keywords: ['음악', 'BGM', '배경음악', '영상음악'], category_hint: '음악생성' },
        { id: 'music_song', label: '보컬이 있는 노래를 만들고 싶어요', keywords: ['음악', '노래', '보컬', '가사'], category_hint: '음악생성' },
        { id: 'music_effect', label: '효과음/사운드 이펙트를 만들고 싶어요', keywords: ['효과음', '사운드', '이펙트', 'SFX'], category_hint: '오디오편집' },
        { id: 'music_edit', label: '기존 음악을 편집하고 싶어요', keywords: ['음악편집', '믹싱', '마스터링'], category_hint: '오디오편집' }
      ]
    }
  },

  // TTS/음성 합성 관련 모호성 (신규)
  'tts_ambiguity': {
    pattern: /TTS|음성합성|나레이션|더빙|AI성우|AI보이스|음성.*생성|목소리.*만들/i,
    ambiguity_type: 'TTS/음성 합성 용도 불명확',
    questions: {
      id: 'tts_type',
      question: '어떤 목적의 음성을 생성하고 싶으신가요?',
      options: [
        { id: 'tts_narration', label: '영상/팟캐스트용 나레이션을 만들고 싶어요', keywords: ['TTS', '나레이션', '팟캐스트', '음성합성'], category_hint: '음성생성' },
        { id: 'tts_dubbing', label: '영상 더빙/외국어 음성을 만들고 싶어요', keywords: ['TTS', '더빙', '다국어', '음성합성'], category_hint: '음성생성' },
        { id: 'tts_clone', label: '특정 목소리를 복제/클론하고 싶어요', keywords: ['음성복제', '보이스클론', 'TTS', 'AI성우'], category_hint: '음성생성' },
        { id: 'tts_korean', label: '한국어 자연스러운 음성이 필요해요', keywords: ['TTS', '한국어', '음성합성', '슈퍼톤'], category_hint: '음성생성' }
      ]
    }
  },

  // 자막/STT 관련 모호성 (신규)
  'subtitle_ambiguity': {
    pattern: /자막|STT|음성인식|전사|자동.*자막|음성.*텍스트/i,
    ambiguity_type: '자막/음성인식 용도 불명확',
    questions: {
      id: 'subtitle_type',
      question: '어떤 자막/음성인식 작업이 필요하신가요?',
      options: [
        { id: 'sub_auto', label: '영상에 자막을 자동으로 생성하고 싶어요', keywords: ['자막', 'STT', '자동자막', '자막생성'], category_hint: '자막생성' },
        { id: 'sub_translate', label: '자막을 다른 언어로 번역하고 싶어요', keywords: ['자막', '번역', '다국어', '번역자막'], category_hint: '자막생성' },
        { id: 'sub_meeting', label: '회의/강의 내용을 텍스트로 변환하고 싶어요', keywords: ['STT', '전사', '회의록', '음성인식'], category_hint: '회의' },
        { id: 'sub_edit', label: '자막을 편집/수정하고 싶어요', keywords: ['자막편집', '자막', '타이밍', '캡션'], category_hint: '영상편집' }
      ]
    }
  }
};

// 복합 모호성 감지 (여러 영역에 걸친 요청)
const COMPOUND_AMBIGUITY_PATTERNS = [
  {
    patterns: [/유튜브|youtube/i, /녹음|음향|소리/i],
    question: {
      id: 'youtube_audio',
      question: '유튜브 콘텐츠의 어떤 부분을 개선하고 싶으신가요?',
      options: [
        { id: 'yt_audio_level', label: '여러 영상의 음량 레벨을 통일하고 싶어요', keywords: ['오디오', '정규화', '레벨통일', '음량'], category_hint: '오디오편집' },
        { id: 'yt_audio_quality', label: '음성 품질을 개선하고 싶어요', keywords: ['음질향상', '잡음제거', '오디오향상'], category_hint: '오디오편집' },
        { id: 'yt_video_edit', label: '영상 자체를 편집하고 싶어요', keywords: ['영상편집', '컷편집', '효과'], category_hint: '영상생성' },
        { id: 'yt_subtitle', label: '자막을 추가하거나 수정하고 싶어요', keywords: ['자막', '캡션', '번역'], category_hint: '영상생성' }
      ]
    }
  },
  {
    patterns: [/SNS|인스타|페이스북|소셜/i, /콘텐츠|게시물|포스팅/i],
    question: {
      id: 'sns_content',
      question: 'SNS 콘텐츠의 어떤 작업이 필요하신가요?',
      options: [
        { id: 'sns_text', label: '게시물 텍스트/카피를 작성하고 싶어요', keywords: ['카피', '텍스트', 'SNS글'], category_hint: '마케팅' },
        { id: 'sns_image', label: '이미지/디자인을 만들고 싶어요', keywords: ['SNS이미지', '디자인', '배너'], category_hint: '이미지생성' },
        { id: 'sns_schedule', label: '게시 일정을 관리하고 싶어요', keywords: ['스케줄', '예약', '게시관리'], category_hint: '일정관리' },
        { id: 'sns_analyze', label: '성과를 분석하고 싶어요', keywords: ['성과분석', '인사이트', '통계'], category_hint: '데이터분석' }
      ]
    }
  }
];

// 모호성 점수 계산
function calculateAmbiguityScore(text: string, matchedPatterns: string[]): number {
  let score = 0;
  
  // 기본 모호성 점수
  score += matchedPatterns.length * 20;
  
  // 텍스트 길이가 짧으면 모호성 증가
  if (text.length < 30) score += 20;
  else if (text.length < 50) score += 10;
  
  // 구체적인 도구명이 없으면 모호성 증가
  const toolMentions = /chatgpt|gemini|canva|notion|zapier|adobe|capcut/i.test(text);
  if (!toolMentions) score += 10;
  
  // "~하고 싶어요", "~해주세요" 같은 막연한 요청
  const vagueRequest = /싶어|해주|해 주|할 수 있|가능할까|어떻게/i.test(text);
  if (vagueRequest) score += 10;
  
  return Math.min(score, 100);
}

// 메인 분석 함수
export function analyzeForClarification(
  jobDescription: string,
  automationRequest: string
): ClarificationResult {
  const combinedText = `${jobDescription} ${automationRequest}`;
  const matchedPatterns: string[] = [];
  const questions: ClarificationQuestion[] = [];
  const detectedAmbiguities: string[] = [];
  
  // 1. 복합 모호성 먼저 체크 (더 구체적인 질문)
  for (const compound of COMPOUND_AMBIGUITY_PATTERNS) {
    const allMatch = compound.patterns.every(p => p.test(combinedText));
    if (allMatch) {
      questions.push(compound.question);
      detectedAmbiguities.push('복합 영역 요청 감지');
      matchedPatterns.push('compound');
    }
  }
  
  // 2. 개별 모호성 체크 (복합으로 이미 처리된 경우 제외)
  if (questions.length === 0) {
    for (const [key, config] of Object.entries(AMBIGUOUS_PATTERNS)) {
      if (config.pattern.test(combinedText)) {
        // 이미 유사한 질문이 있는지 확인
        const alreadyHas = questions.some(q => q.id === config.questions.id);
        if (!alreadyHas) {
          questions.push(config.questions);
          detectedAmbiguities.push(config.ambiguity_type);
          matchedPatterns.push(key);
        }
      }
    }
  }
  
  // 3. 모호성 점수 계산
  const ambiguityScore = calculateAmbiguityScore(combinedText, matchedPatterns);
  
  // 4. 기존 키워드 추출 (참고용)
  const originalKeywords = extractBasicKeywords(combinedText);
  
  return {
    needs_clarification: questions.length > 0 && ambiguityScore >= 30,
    ambiguity_score: ambiguityScore,
    detected_ambiguities: detectedAmbiguities,
    questions: questions.slice(0, 2), // 최대 2개 질문만
    original_keywords: originalKeywords
  };
}

// 기본 키워드 추출 (간단 버전)
function extractBasicKeywords(text: string): string[] {
  const keywords: string[] = [];
  const keywordList = [
    '문서', '보고서', '이메일', '데이터', '분석', 'SNS', '마케팅', 
    '자동화', '일정', '회의', '녹음', '이미지', '영상', '고객', 
    '개발', '리서치', '음향', '오디오', '유튜브', '파이썬', '크롤링',
    '음악', 'BGM', '스크립트', '코딩', '브라우저'
  ];
  
  for (const kw of keywordList) {
    if (text.includes(kw)) {
      keywords.push(kw);
    }
  }
  
  return keywords;
}

// 사용자 선택 적용 함수
export function applyClarificationChoice(
  originalRequest: { jobDescription: string; automationRequest: string },
  selectedOption: ClarificationOption
): { 
  enhanced_job_description: string; 
  enhanced_automation_request: string;
  additional_keywords: string[];
  suggested_category: string | undefined;
} {
  return {
    enhanced_job_description: originalRequest.jobDescription,
    enhanced_automation_request: `${originalRequest.automationRequest} [구체화: ${selectedOption.label}]`,
    additional_keywords: selectedOption.keywords,
    suggested_category: selectedOption.category_hint
  };
}
