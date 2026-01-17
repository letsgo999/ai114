-- =============================================
-- AI 도구 시드 데이터 (20개 도구)
-- 2026년 최신 버전 (디마불사 코치 요청 반영)
-- =============================================

-- 문서 작성
INSERT OR REPLACE INTO ai_tools (id, name, category, subcategory, description, website_url, use_cases, keywords, automation_level, difficulty, pricing_type, rating, popularity, is_active, created_at, updated_at) VALUES
('tool-001', 'ChatGPT', '문서작성', '텍스트 생성', 'OpenAI의 대화형 AI로 문서 초안 작성, 요약, 번역 등 다양한 텍스트 작업 지원', 'https://chat.openai.com', '["문서 초안 작성", "이메일 작성", "보고서 요약", "번역", "아이디어 브레인스토밍"]', '["문서", "작성", "보고서", "이메일", "기획안", "제안서", "요약", "번역"]', 'semi', 'beginner', 'freemium', 4.8, 100, 1, 1737100800000, 1737100800000),

('tool-002', 'Notion AI', '문서작성', '문서 관리', 'Notion 내장 AI로 문서 작성, 요약, 액션 아이템 추출 등 지원', 'https://www.notion.so', '["회의록 정리", "문서 요약", "액션 아이템 추출", "글쓰기 보조"]', '["회의록", "정리", "요약", "액션", "문서", "노션"]', 'semi', 'beginner', 'freemium', 4.5, 85, 1, 1737100800000, 1737100800000),

('tool-003', 'Gamma', '문서작성', '프레젠테이션', 'AI 기반 프레젠테이션 자동 생성 도구', 'https://gamma.app', '["프레젠테이션 제작", "슬라이드 디자인", "문서 시각화"]', '["프레젠테이션", "PPT", "슬라이드", "발표", "제안서"]', 'full', 'beginner', 'freemium', 4.6, 75, 1, 1737100800000, 1737100800000);

-- 데이터 분석
INSERT OR REPLACE INTO ai_tools (id, name, category, subcategory, description, website_url, use_cases, keywords, automation_level, difficulty, pricing_type, rating, popularity, is_active, created_at, updated_at) VALUES
('tool-004', 'Julius AI', '데이터분석', '데이터 시각화', '자연어로 데이터 분석 및 시각화를 수행하는 AI 도구', 'https://julius.ai', '["데이터 시각화", "통계 분석", "차트 생성", "데이터 정리"]', '["데이터", "분석", "통계", "차트", "그래프", "시각화", "엑셀"]', 'semi', 'beginner', 'freemium', 4.4, 70, 1, 1737100800000, 1737100800000),

('tool-005', 'Claude', '데이터분석', '문서 분석', 'Anthropic의 AI로 긴 문서 분석, 데이터 해석에 강점', 'https://claude.ai', '["긴 문서 분석", "데이터 해석", "비교 분석", "요약"]', '["분석", "문서", "데이터", "비교", "해석", "요약"]', 'semi', 'beginner', 'freemium', 4.7, 90, 1, 1737100800000, 1737100800000);

-- 마케팅 (Copy.ai → Gemini Gems, Jasper → Google AI Studio TTS)
INSERT OR REPLACE INTO ai_tools (id, name, category, subcategory, description, website_url, use_cases, keywords, automation_level, difficulty, pricing_type, rating, popularity, is_active, created_at, updated_at) VALUES
('tool-006', 'Canva AI', '마케팅', '디자인', 'AI 기반 디자인 도구로 SNS 콘텐츠, 배너, 포스터 등 제작', 'https://www.canva.com', '["SNS 이미지 제작", "배너 디자인", "포스터 제작", "로고 디자인"]', '["디자인", "이미지", "SNS", "배너", "포스터", "인스타그램", "페이스북"]', 'semi', 'beginner', 'freemium', 4.6, 95, 1, 1737100800000, 1737100800000),

('tool-007', 'Gemini Gems', '마케팅', '카피라이팅', 'Google Gemini 기반 맞춤형 AI 앱으로 마케팅 카피, SNS 게시물 자동 생성', 'https://gemini.google.com/gems', '["광고 카피 작성", "SNS 게시물 작성", "이메일 마케팅", "블로그 글", "맞춤형 AI 비서"]', '["카피", "광고", "마케팅", "SNS", "게시물", "콘텐츠", "운영", "젬스"]', 'semi', 'beginner', 'freemium', 4.5, 80, 1, 1737100800000, 1737100800000),

('tool-008', 'Google AI Studio TTS', '마케팅', '음성 콘텐츠', 'Google AI Studio의 TTS 모델로 마케팅 음성 콘텐츠 제작', 'https://aistudio.google.com', '["음성 콘텐츠 제작", "팟캐스트 제작", "영상 나레이션", "오디오 광고"]', '["마케팅", "콘텐츠", "음성", "TTS", "나레이션", "팟캐스트"]', 'semi', 'beginner', 'free', 4.3, 65, 1, 1737100800000, 1737100800000);

-- 업무 자동화 (Zapier, n8n → Make, Google Opal)
INSERT OR REPLACE INTO ai_tools (id, name, category, subcategory, description, website_url, use_cases, keywords, automation_level, difficulty, pricing_type, rating, popularity, is_active, created_at, updated_at) VALUES
('tool-009', 'Make', '업무자동화', '워크플로우', '시각적 워크플로우 빌더로 복잡한 자동화 구현, 5000개 이상 앱 연동', 'https://www.make.com', '["복잡한 워크플로우", "조건부 자동화", "데이터 변환", "API 연동", "앱 간 데이터 연동"]', '["자동화", "워크플로우", "연동", "API", "자동", "프로세스", "반복", "작업"]', 'full', 'intermediate', 'freemium', 4.5, 85, 1, 1737100800000, 1737100800000),

('tool-010', 'Google Opal', '업무자동화', 'AI 에이전트', 'Google의 AI 에이전트 플랫폼으로 업무 자동화 및 워크플로우 구축', 'https://opal.google.com', '["AI 에이전트 구축", "워크플로우 자동화", "데이터 처리", "Google Workspace 연동"]', '["자동화", "워크플로우", "에이전트", "AI", "구글", "프로세스"]', 'full', 'intermediate', 'freemium', 4.2, 60, 1, 1737100800000, 1737100800000);

-- 일정 관리 (Reclaim.ai, Motion → Notion 캘린더)
INSERT OR REPLACE INTO ai_tools (id, name, category, subcategory, description, website_url, use_cases, keywords, automation_level, difficulty, pricing_type, rating, popularity, is_active, created_at, updated_at) VALUES
('tool-011', 'Notion 캘린더', '일정관리', '스케줄링', 'Notion 내장 캘린더로 일정 관리, 태스크 연동, 팀 협업 지원', 'https://www.notion.so/product/calendar', '["일정 관리", "태스크 연동", "회의 스케줄링", "팀 캘린더 공유", "마감일 관리"]', '["일정", "스케줄", "회의", "시간", "관리", "캘린더", "노션", "태스크"]', 'semi', 'beginner', 'freemium', 4.4, 80, 1, 1737100800000, 1737100800000);

-- 회의 (Fireflies, Otter, Clova Note → NotebookLM)
INSERT OR REPLACE INTO ai_tools (id, name, category, subcategory, description, website_url, use_cases, keywords, automation_level, difficulty, pricing_type, rating, popularity, is_active, created_at, updated_at) VALUES
('tool-012', 'Google NotebookLM', '회의', '회의록/음성 분석', 'Google의 AI 노트북으로 회의 녹음 파일 업로드, 자동 전사, 요약, Q&A 지원', 'https://notebooklm.google.com', '["회의 녹음 분석", "자동 전사", "회의록 생성", "핵심 내용 요약", "Q&A", "오디오 요약"]', '["회의", "녹음", "회의록", "전사", "요약", "미팅", "음성", "노트북"]', 'full', 'beginner', 'free', 4.7, 88, 1, 1737100800000, 1737100800000);

-- 이미지 생성 (Midjourney, DALL-E 3 → Nano Banana Pro)
INSERT OR REPLACE INTO ai_tools (id, name, category, subcategory, description, website_url, use_cases, keywords, automation_level, difficulty, pricing_type, rating, popularity, is_active, created_at, updated_at) VALUES
('tool-013', 'Nano Banana Pro', '이미지생성', 'AI 이미지', '고품질 이미지 생성 및 편집 AI 모델, 다양한 스타일과 고해상도 출력 지원', 'https://genspark.ai', '["이미지 생성", "이미지 편집", "컨셉 아트", "마케팅 이미지", "일러스트", "스타일 변환"]', '["이미지", "생성", "그림", "디자인", "아트", "일러스트", "편집"]', 'semi', 'beginner', 'freemium', 4.6, 82, 1, 1737100800000, 1737100800000);

-- 영상 생성 (Runway → VEO 3.1, Sora 2)
INSERT OR REPLACE INTO ai_tools (id, name, category, subcategory, description, website_url, use_cases, keywords, automation_level, difficulty, pricing_type, rating, popularity, is_active, created_at, updated_at) VALUES
('tool-014', 'Google VEO 3.1', '영상생성', 'AI 영상', 'Google의 최신 영상 생성 AI, 고품질 영상 및 음향 동시 생성 지원', 'https://deepmind.google/veo', '["영상 생성", "마케팅 영상", "프로모션 비디오", "소셜 미디어 콘텐츠"]', '["영상", "비디오", "생성", "마케팅", "콘텐츠"]', 'semi', 'beginner', 'freemium', 4.5, 75, 1, 1737100800000, 1737100800000),

('tool-015', 'OpenAI Sora 2', '영상생성', 'AI 영상', 'OpenAI의 텍스트-영상 생성 AI, 고품질 시네마틱 영상 제작 가능', 'https://openai.com/sora', '["영상 생성", "스토리텔링 영상", "광고 영상", "창작 콘텐츠"]', '["영상", "편집", "비디오", "생성", "효과", "AI"]', 'semi', 'intermediate', 'paid', 4.4, 70, 1, 1737100800000, 1737100800000);

-- 고객 서비스 (Intercom Fin → Typebot, 카카오 채널 챗봇)
INSERT OR REPLACE INTO ai_tools (id, name, category, subcategory, description, website_url, use_cases, keywords, automation_level, difficulty, pricing_type, rating, popularity, is_active, created_at, updated_at) VALUES
('tool-016', 'Typebot', '고객서비스', '챗봇 빌더', '오픈소스 챗봇 빌더로 드래그앤드롭 방식의 대화형 챗봇 구축', 'https://typebot.io', '["고객 문의 응대", "FAQ 챗봇", "리드 수집", "예약 시스템"]', '["고객", "서비스", "문의", "응대", "챗봇", "CS", "자동화"]', 'full', 'beginner', 'freemium', 4.3, 65, 1, 1737100800000, 1737100800000),

('tool-017', '카카오 채널 챗봇', '고객서비스', '메신저 챗봇', '카카오톡 채널 기반 AI 챗봇으로 한국 시장 최적화 고객 서비스 제공', 'https://business.kakao.com', '["카카오톡 고객 응대", "자동 응답", "예약 관리", "주문 접수"]', '["고객", "서비스", "카카오", "챗봇", "메신저", "CS", "한국"]', 'full', 'beginner', 'freemium', 4.4, 78, 1, 1737100800000, 1737100800000);

-- 코딩/개발 (GitHub Copilot, Cursor → Google AI Studio Build, Antigravity)
INSERT OR REPLACE INTO ai_tools (id, name, category, subcategory, description, website_url, use_cases, keywords, automation_level, difficulty, pricing_type, rating, popularity, is_active, created_at, updated_at) VALUES
('tool-018', 'Google AI Studio Build', '개발', 'AI 앱 빌더', 'Google AI Studio의 빌드 기능으로 노코드/로우코드 AI 앱 개발', 'https://aistudio.google.com', '["AI 앱 개발", "프로토타입 제작", "API 연동", "챗봇 개발"]', '["코딩", "개발", "프로그래밍", "코드", "자동화", "노코드", "AI"]', 'semi', 'beginner', 'free', 4.3, 68, 1, 1737100800000, 1737100800000),

('tool-019', 'Antigravity', '개발', 'AI 개발 플랫폼', 'AI 기반 웹/앱 개발 플랫폼으로 자연어로 코드 생성 및 배포', 'https://antigravity.dev', '["웹 개발", "앱 개발", "자동 코드 생성", "배포 자동화"]', '["코딩", "개발", "IDE", "에디터", "프로그래밍", "노코드"]', 'full', 'beginner', 'freemium', 4.2, 55, 1, 1737100800000, 1737100800000);

-- 리서치
INSERT OR REPLACE INTO ai_tools (id, name, category, subcategory, description, website_url, use_cases, keywords, automation_level, difficulty, pricing_type, rating, popularity, is_active, created_at, updated_at) VALUES
('tool-020', 'Perplexity AI', '리서치', 'AI 검색', 'AI 기반 검색 엔진, 출처 포함 답변 제공', 'https://www.perplexity.ai', '["정보 검색", "리서치", "팩트 체크", "트렌드 조사"]', '["검색", "리서치", "조사", "정보", "트렌드", "분석"]', 'semi', 'beginner', 'freemium', 4.6, 88, 1, 1737100800000, 1737100800000),

('tool-021', 'Google Deep Research', '리서치', '심층 리서치', 'Google Gemini의 Deep Research 기능으로 복잡한 주제 심층 조사 및 보고서 자동 생성', 'https://gemini.google.com', '["심층 리서치", "시장 조사", "경쟁사 분석", "트렌드 보고서", "학술 조사"]', '["검색", "리서치", "조사", "정보", "분석", "보고서", "심층"]', 'full', 'beginner', 'freemium', 4.5, 72, 1, 1737100800000, 1737100800000),

('tool-022', 'NotebookLM (리서치)', '리서치', '문서 분석', 'Google의 AI 노트북, 업로드 문서 기반 Q&A 및 인사이트 도출', 'https://notebooklm.google.com', '["문서 분석", "요약", "Q&A", "인사이트 도출", "학습 자료 정리"]', '["문서", "분석", "요약", "노트북", "학습", "리서치"]', 'semi', 'beginner', 'free', 4.7, 85, 1, 1737100800000, 1737100800000);
