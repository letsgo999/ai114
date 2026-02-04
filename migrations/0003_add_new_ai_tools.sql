-- =============================================
-- 새로운 AI 도구 추가 및 기존 도구 업데이트
-- 버전: 1.3
-- 날짜: 2026-02-04
-- =============================================

-- 1. Google Colab (기존 도구 업데이트 - 다목적 카테고리로 변경 및 설명 확장)
UPDATE ai_tools SET
    category = '다목적',
    subcategory = '파이썬/데이터분석',
    description = 'Google 무료 클라우드 파이썬 환경. Pandas(데이터분석), Matplotlib(시각화), BeautifulSoup(웹크롤링), MoviePy(영상편집), FFmpeg(음원처리) 등 다양한 라이브러리 지원. GPU 무료 제공',
    use_cases = '데이터 분석 및 시각화,웹 크롤링/스크래핑,영상/음원 자동 편집,머신러닝 실험,업무 자동화 스크립트',
    keywords = '파이썬,Python,Pandas,Matplotlib,데이터분석,시각화,웹크롤링,BeautifulSoup,MoviePy,FFmpeg,음원편집,영상편집,자동화,GPU,코딩,스크립트',
    automation_level = 'full',
    difficulty = 'intermediate',
    pricing_type = 'freemium',
    rating = 4.7,
    popularity = 92
WHERE id = 'tool-028';

-- 2. Perplexity Comet Browser (기존 도구 업데이트 - 기능 확장)
UPDATE ai_tools SET
    category = '데이터분석',
    subcategory = 'AI 브라우저',
    description = 'Perplexity의 AI 에이전트 브라우저. 웹 자동화, 멀티탭 리서치, 이메일 정리, 작업 자동 실행 지원. 2025년 10월 정식 출시',
    use_cases = '웹 데이터 자동 수집,멀티탭 리서치 및 요약,이메일/일정 자동 정리,반복 작업 자동화,실시간 정보 모니터링',
    keywords = '브라우저,웹자동화,크롤링,데이터수집,리서치,에이전트,AI브라우저,자동화,모니터링,Perplexity,Comet',
    automation_level = 'full',
    difficulty = 'beginner',
    pricing_type = 'freemium',
    rating = 4.6,
    popularity = 88
WHERE id = 'tool-006';

-- 3. Gemini in Chrome (신규 추가)
INSERT OR REPLACE INTO ai_tools (
    id, name, category, subcategory, description, website_url, use_cases, keywords,
    automation_level, difficulty, pricing_type, pricing_detail, rating, popularity, is_active, created_at, updated_at
) VALUES (
    'tool-039',
    'Gemini in Chrome',
    '데이터분석',
    'AI 브라우저',
    'Google Chrome에 내장된 Gemini AI 어시스턴트. 웹페이지 요약, 복잡한 정보 설명, 멀티탭 작업 지원. 2025년 9월 정식 통합',
    'https://www.google.com/chrome/ai-innovations/',
    '웹페이지 즉시 요약,복잡한 개념 쉽게 설명,멀티탭 정보 통합 분석,브라우징 중 AI 질문,콘텐츠 번역 및 재작성',
    '브라우저,Chrome,Gemini,웹요약,AI어시스턴트,멀티탭,검색,자동화,구글,정보분석',
    'semi',
    'beginner',
    'free',
    'Chrome 브라우저 무료 내장',
    4.5,
    95,
    1,
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
);

-- 4. MiniMax Music (신규 추가)
INSERT OR REPLACE INTO ai_tools (
    id, name, category, subcategory, description, website_url, use_cases, keywords,
    automation_level, difficulty, pricing_type, pricing_detail, rating, popularity, is_active, created_at, updated_at
) VALUES (
    'tool-040',
    'MiniMax Music',
    '음악생성',
    'AI 음악',
    '중국 MiniMax의 AI 음악 생성 플랫폼. Music 2.5 버전으로 4분 길이 곡 생성, 14개 언어 지원, 자연스러운 보컬과 악기 구현. 무료 사용 가능',
    'https://www.minimax.io/audio/music',
    'AI 음악 작곡,배경 음악 생성,보컬 포함 노래 제작,다국어 음악 생성,영상용 BGM 제작',
    '음악,뮤직,작곡,AI음악,배경음악,BGM,보컬,MiniMax,중국AI,음악생성,노래',
    'full',
    'beginner',
    'freemium',
    '무료 플랜 제공, Pro $30/월',
    4.5,
    82,
    1,
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
);

-- 5. 음악생성 카테고리 추가 도구들

-- Suno AI (기존에 없으면 추가)
INSERT OR IGNORE INTO ai_tools (
    id, name, category, subcategory, description, website_url, use_cases, keywords,
    automation_level, difficulty, pricing_type, pricing_detail, rating, popularity, is_active, created_at, updated_at
) VALUES (
    'tool-041',
    'Suno AI',
    '음악생성',
    'AI 음악',
    '텍스트 프롬프트로 보컬 포함 음악 생성. 다양한 장르와 스타일 지원. 영어/한국어 가사 생성 가능',
    'https://suno.ai',
    '노래 작곡,배경 음악 생성,광고 음악 제작,유튜브 BGM,팟캐스트 인트로',
    '음악,뮤직,작곡,노래,AI음악,Suno,보컬,가사,BGM,배경음악',
    'full',
    'beginner',
    'freemium',
    '무료 10곡/일, Pro $10/월',
    4.6,
    90,
    1,
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
);

-- Udio (기존에 없으면 추가)
INSERT OR IGNORE INTO ai_tools (
    id, name, category, subcategory, description, website_url, use_cases, keywords,
    automation_level, difficulty, pricing_type, pricing_detail, rating, popularity, is_active, created_at, updated_at
) VALUES (
    'tool-042',
    'Udio',
    '음악생성',
    'AI 음악',
    '고품질 AI 음악 생성 플랫폼. 다양한 장르와 스타일의 음악 및 보컬 생성. 2024년 4월 출시',
    'https://udio.com',
    '음악 작곡,보컬 생성,장르별 음악 제작,리믹스 생성,영상 음악',
    '음악,뮤직,작곡,Udio,AI음악,보컬,장르,리믹스,생성',
    'full',
    'beginner',
    'freemium',
    '무료 플랜 제공',
    4.5,
    85,
    1,
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
);
