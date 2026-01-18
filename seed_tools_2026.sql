-- 2026년 AI공부방 10기 교육자료 기반 확장된 AI 도구 데이터베이스

-- 다목적/문서작성
INSERT OR REPLACE INTO ai_tools (id, name, category, subcategory, description, website_url, use_cases, keywords, automation_level, difficulty, pricing_type, rating, popularity, is_active, created_at, updated_at) VALUES
('tool-001', 'ChatGPT', '문서작성', '다목적 AI', 'OpenAI GPT-5 Pro 기반 대화형 AI. 프로젝트 기능으로 맞춤형 앱 개발, 심층 리서치(Search), 이미지 생성(DALL-E), 반복 업무 자동화 초벌 작업 지원', 'https://chatgpt.com', '문서 초안 작성,이메일 작성,보고서 요약,번역,시장조사,엑셀 데이터 자동 입력,반복 업무 자동화 앱 개발', '문서,작성,보고서,이메일,기획안,제안서,요약,번역,프로젝트,자동화,GPT', 'semi', 'beginner', 'freemium', 4.9, 100, 1, 1737200000000, 1737200000000),
('tool-002', 'Claude', '문서작성', '코딩/개발', 'Anthropic의 Claude Sonnet 3.5/Opus 4.5. MCP(AI 에이전트 서버 간 연동) 지원, 고성능 코딩, 바이브 코딩으로 자연어 기반 앱 개발', 'https://claude.ai', '긴 문서 분석,코딩 자동화,바이브 코딩,웹사이트 개발,랜딩페이지 제작,MCP 연동', '분석,문서,코딩,개발,MCP,바이브코딩,에이전트,프로그래밍', 'full', 'beginner', 'freemium', 4.8, 95, 1, 1737200000000, 1737200000000),
('tool-003', 'Notion AI', '문서작성', '문서 관리', 'Notion 내장 AI로 문서 작성, 요약, 액션 아이템 추출, 팀 협업 지원', 'https://www.notion.so', '회의록 정리,문서 요약,액션 아이템 추출,프로젝트 관리,팀 협업', '회의록,정리,요약,액션,문서,노션,협업,프로젝트', 'semi', 'beginner', 'freemium', 4.5, 85, 1, 1737200000000, 1737200000000),
('tool-004', 'Gamma', '문서작성', '프레젠테이션', 'AI 기반 프레젠테이션 자동 생성 도구. 텍스트 입력만으로 전문적인 슬라이드 제작', 'https://gamma.app', '프레젠테이션 제작,슬라이드 디자인,문서 시각화,제안서 작성', '프레젠테이션,PPT,슬라이드,발표,제안서,디자인', 'full', 'beginner', 'freemium', 4.6, 80, 1, 1737200000000, 1737200000000);

-- 리서치/검색
INSERT OR REPLACE INTO ai_tools (id, name, category, subcategory, description, website_url, use_cases, keywords, automation_level, difficulty, pricing_type, rating, popularity, is_active, created_at, updated_at) VALUES
('tool-005', 'Perplexity AI', '리서치', 'AI 검색', '실시간 웹 검색 기반 AI. 연관 질문 자동 생성, 팩트 체크, 검색 결과 PDF 저장, 딥서치 기능으로 심층 조사', 'https://perplexity.ai', '정보 검색,리서치,팩트 체크,트렌드 조사,SW 사용법 검색,딥서치', '검색,리서치,조사,정보,트렌드,분석,팩트체크,딥서치', 'semi', 'beginner', 'freemium', 4.8, 95, 1, 1737200000000, 1737200000000),
('tool-006', 'Perplexity Comet Browser', '리서치', '브라우저', '퍼플렉시티의 AI 브라우저. 웹 크롤링 작업 자동화 불필요, 실시간 정보 수집 및 분석', 'https://perplexity.ai/comet', '웹 크롤링 대체,실시간 정보 수집,경쟁사 모니터링,가격 추적', '크롤링,브라우저,검색,자동화,모니터링,데이터수집', 'full', 'beginner', 'freemium', 4.5, 70, 1, 1737200000000, 1737200000000),
('tool-007', 'Google Deep Research', '리서치', '심층 리서치', 'Gemini의 Deep Research 기능. 복잡한 주제 심층 조사 및 보고서 자동 생성, 학술 조사 지원', 'https://gemini.google.com', '심층 리서치,시장 조사,경쟁사 분석,트렌드 보고서,학술 조사', '검색,리서치,조사,정보,분석,보고서,심층,학술', 'full', 'beginner', 'freemium', 4.6, 80, 1, 1737200000000, 1737200000000),
('tool-008', 'Liner', '리서치', '학술 검색', '학술 논문 기반 검색 및 답변. 신뢰도 높은 논문 검색, 인용 지원', 'https://getliner.com', '학술 논문 검색,인용 관리,연구 조사,신뢰도 높은 정보 검색', '논문,학술,검색,인용,리서치,연구,학습', 'semi', 'beginner', 'freemium', 4.4, 65, 1, 1737200000000, 1737200000000);

-- 학습/문서분석
INSERT OR REPLACE INTO ai_tools (id, name, category, subcategory, description, website_url, use_cases, keywords, automation_level, difficulty, pricing_type, rating, popularity, is_active, created_at, updated_at) VALUES
('tool-009', 'Google NotebookLM', '학습', 'RAG 학습', 'RAG 기반 학습 도구. 대용량 문서/논문 분석, 오디오 오버뷰, 유튜브/웹 요약, 플래시 카드 생성, 팟캐스트 형식 요약 비디오 제작', 'https://notebooklm.google.com', '문서 분석,논문 요약,유튜브 영상 요약,FAQ 생성,팟캐스트 제작,학습 자료 정리,오디오 요약', '문서,분석,요약,노트북,학습,리서치,유튜브,팟캐스트,오디오,RAG', 'full', 'beginner', 'free', 4.9, 92, 1, 1737200000000, 1737200000000),
('tool-010', '클로바노트 (ClovaNote)', '학습', '음성 요약', '네이버의 AI 회의록/음성 요약 도구. 실시간 녹음 전사, 핵심 내용 자동 추출', 'https://clovanote.naver.com', '회의록 작성,강의 녹음 요약,인터뷰 전사,음성 메모 정리', '회의록,녹음,전사,요약,음성,미팅,강의,메모', 'full', 'beginner', 'freemium', 4.5, 75, 1, 1737200000000, 1737200000000);

-- 젠스파크 생태계
INSERT OR REPLACE INTO ai_tools (id, name, category, subcategory, description, website_url, use_cases, keywords, automation_level, difficulty, pricing_type, rating, popularity, is_active, created_at, updated_at) VALUES
('tool-011', 'Genspark', '리서치', '멀티에이전트', '멀티 에이전트 기반 팩트 체크 검색. AI 슬라이드 생성, 젠스파크 페이지(웹사이트) 구축, 통화 비서(예약 대행) 지원', 'https://genspark.ai', '팩트 체크,슬라이드 생성,홈페이지 제작,통화 비서,예약 대행', '검색,팩트체크,슬라이드,홈페이지,에이전트,통화비서', 'full', 'beginner', 'freemium', 4.7, 85, 1, 1737200000000, 1737200000000),
('tool-012', 'Genspark AI Developer', '개발', 'AI 개발자', '젠스파크 AI 개발자. 자연어로 웹앱 개발, 온라인 주문 폼 홈페이지 제작, 코딩 기초 학습 도구', 'https://genspark.ai', '웹앱 개발,주문 폼 제작,랜딩페이지 개발,코딩 학습', '개발,코딩,웹앱,홈페이지,노코드,자동화', 'full', 'beginner', 'freemium', 4.6, 78, 1, 1737200000000, 1737200000000),
('tool-013', 'Nano Banana Pro', '이미지생성', 'AI 이미지', '제미나이 나노바나나 기반 고품질 이미지 생성/편집. 자연어 포토샵, 이미지 내 한글 합성, 유튜브 썸네일 제작', 'https://genspark.ai', '이미지 생성,이미지 편집,썸네일 제작,배경 변경,사물 추가,한글 합성', '이미지,생성,편집,썸네일,포토샵,디자인,합성', 'semi', 'beginner', 'freemium', 4.7, 88, 1, 1737200000000, 1737200000000);

-- 구글 AI 생태계
INSERT OR REPLACE INTO ai_tools (id, name, category, subcategory, description, website_url, use_cases, keywords, automation_level, difficulty, pricing_type, rating, popularity, is_active, created_at, updated_at) VALUES
('tool-014', 'Google AI Studio', '개발', 'AI 실험실', 'Gemini 최신 기능 무료 실험. 스트림(Screen Share) 코칭, 바이브 앱 개발, SNS 콘텐츠 자동 생성 앱 개발', 'https://aistudio.google.com', 'AI 앱 개발,프로토타입 제작,스트림 코칭,SNS 콘텐츠 자동화', '개발,AI,실험,프로토타입,스트림,코칭,앱', 'semi', 'beginner', 'free', 4.6, 82, 1, 1737200000000, 1737200000000),
('tool-015', 'Google AI Studio Build', '개발', 'AI 앱 빌더', 'Google AI Studio의 빌드(Vibe) 기능. 노코드/로우코드 AI 웹앱 개발 및 배포, 구글 클라우드 런 연동', 'https://aistudio.google.com', 'AI 앱 개발,웹앱 배포,API 연동,챗봇 개발,클라우드 배포', '개발,노코드,빌드,앱,배포,클라우드,바이브', 'full', 'beginner', 'free', 4.5, 75, 1, 1737200000000, 1737200000000),
('tool-016', 'Google AI Studio TTS', '음성생성', '음성 합성', 'Google AI Studio의 TTS 모델. 자연스러운 음성 콘텐츠 제작, 팟캐스트, 영상 나레이션 생성', 'https://aistudio.google.com', '음성 콘텐츠 제작,팟캐스트 제작,영상 나레이션,오디오 광고', '음성,TTS,나레이션,팟캐스트,오디오,콘텐츠', 'semi', 'beginner', 'free', 4.4, 70, 1, 1737200000000, 1737200000000),
('tool-017', 'Gemini 3 Pro', '다목적', '최신 AI', 'Google의 최신 Gemini 3 Pro 모델. 멀티모달 지원, 고급 추론, 긴 컨텍스트 처리', 'https://gemini.google.com', '복잡한 분석,멀티모달 작업,긴 문서 처리,고급 추론', '분석,멀티모달,추론,문서,이미지,코딩', 'semi', 'beginner', 'freemium', 4.8, 90, 1, 1737200000000, 1737200000000);

-- 영상/미디어 생성
INSERT OR REPLACE INTO ai_tools (id, name, category, subcategory, description, website_url, use_cases, keywords, automation_level, difficulty, pricing_type, rating, popularity, is_active, created_at, updated_at) VALUES
('tool-018', 'OpenAI Sora 2', '영상생성', 'AI 영상', 'OpenAI의 텍스트/이미지 기반 고품질 동영상 생성. 숏폼 콘텐츠, CF 홍보 영상 제작', 'https://openai.com/sora', '영상 생성,숏폼 제작,광고 영상,스토리텔링 영상,창작 콘텐츠', '영상,비디오,생성,숏폼,광고,콘텐츠,CF', 'semi', 'intermediate', 'paid', 4.6, 85, 1, 1737200000000, 1737200000000),
('tool-019', 'Google VEO 3.1', '영상생성', 'AI 영상', 'Google의 최신 영상 생성 AI. 고품질 영상 및 음향 동시 생성, 마케팅 영상 제작', 'https://deepmind.google/veo', '영상 생성,마케팅 영상,프로모션 비디오,소셜 미디어 콘텐츠', '영상,비디오,생성,마케팅,콘텐츠,프로모션', 'semi', 'beginner', 'freemium', 4.5, 78, 1, 1737200000000, 1737200000000),
('tool-020', 'Suno AI', '음악생성', 'AI 작곡', '작사/작곡 AI. 텍스트로 노래 및 BGM 생성, 기념일 축가, 홍보 영상 배경음악 제작', 'https://suno.ai', '노래 생성,BGM 제작,축가 작곡,홍보 음악,배경음악', '음악,작곡,노래,BGM,작사,오디오,축가', 'full', 'beginner', 'freemium', 4.5, 80, 1, 1737200000000, 1737200000000),
('tool-021', 'Udio', '음악생성', 'AI 작곡', '고품질 AI 음악 생성. 다양한 장르의 음악 및 노래 제작', 'https://udio.com', '음악 생성,노래 제작,BGM 제작,광고 음악', '음악,작곡,노래,BGM,생성,광고', 'full', 'beginner', 'freemium', 4.4, 72, 1, 1737200000000, 1737200000000);

-- 영상 편집
INSERT OR REPLACE INTO ai_tools (id, name, category, subcategory, description, website_url, use_cases, keywords, automation_level, difficulty, pricing_type, rating, popularity, is_active, created_at, updated_at) VALUES
('tool-022', 'CapCut', '영상편집', '영상 편집', '무료 영상 편집 앱. 자동 자막 생성, 숏폼 편집, 다양한 효과 및 템플릿', 'https://www.capcut.com', '영상 편집,자막 생성,숏폼 제작,효과 추가,템플릿 활용', '영상,편집,자막,숏폼,효과,틱톡,릴스', 'semi', 'beginner', 'free', 4.6, 90, 1, 1737200000000, 1737200000000),
('tool-023', 'Vrew (브루)', '영상편집', '자막/편집', 'AI 기반 영상 편집 및 자동 자막 생성. 교육 콘텐츠, 유튜브 영상 편집에 최적화', 'https://vrew.voyagerx.com', '자막 생성,영상 편집,교육 콘텐츠,유튜브 편집', '영상,편집,자막,유튜브,교육,콘텐츠', 'full', 'beginner', 'freemium', 4.5, 82, 1, 1737200000000, 1737200000000);

-- 업무자동화
INSERT OR REPLACE INTO ai_tools (id, name, category, subcategory, description, website_url, use_cases, keywords, automation_level, difficulty, pricing_type, rating, popularity, is_active, created_at, updated_at) VALUES
('tool-024', 'Make', '업무자동화', '워크플로우', '시각적 워크플로우 빌더. 5000개 이상 앱 연동, 복잡한 조건부 자동화, API 연동', 'https://www.make.com', '워크플로우 자동화,앱 연동,데이터 변환,API 연동,반복 업무 자동화', '자동화,워크플로우,연동,API,반복,프로세스', 'full', 'intermediate', 'freemium', 4.6, 88, 1, 1737200000000, 1737200000000),
('tool-025', 'Zapier', '업무자동화', '워크플로우', '간편한 앱 연동 자동화. 트리거 기반 자동화, 다양한 SaaS 연동', 'https://zapier.com', '앱 연동,트리거 자동화,이메일 자동화,데이터 동기화', '자동화,워크플로우,연동,트리거,이메일,동기화', 'full', 'beginner', 'freemium', 4.5, 85, 1, 1737200000000, 1737200000000),
('tool-026', '에이닷 전화', '업무자동화', '통화 자동화', 'SK텔레콤의 AI 통화 비서. 통화 기록 요약, 일정 자동 생성, 비즈니스 통화 핵심 정리', 'https://adot.ai', '통화 요약,일정 생성,비즈니스 통화 정리,캘린더 등록', '통화,요약,일정,캘린더,비서,자동화', 'full', 'beginner', 'freemium', 4.3, 65, 1, 1737200000000, 1737200000000);

-- 개발/코딩
INSERT OR REPLACE INTO ai_tools (id, name, category, subcategory, description, website_url, use_cases, keywords, automation_level, difficulty, pricing_type, rating, popularity, is_active, created_at, updated_at) VALUES
('tool-027', 'Cursor AI', '개발', 'AI 코딩', 'AI 기반 코드 에디터(VS Code 포크). 자연어 지시로 코드 작성/편집, 바이브 코딩 지원', 'https://cursor.sh', '코드 작성,코드 편집,바이브 코딩,소프트웨어 개발', '코딩,개발,에디터,VS Code,자동화,프로그래밍', 'full', 'intermediate', 'freemium', 4.7, 85, 1, 1737200000000, 1737200000000),
('tool-028', 'Google Colab', '개발', '파이썬 실행', '무료 파이썬 코드 실행 환경. GPU 지원, 영상 편집 자동화, 음량 노멀라이징 등 스크립트 실행', 'https://colab.research.google.com', '파이썬 실행,데이터 분석,영상 편집 자동화,머신러닝 실험', '파이썬,코딩,데이터,분석,자동화,GPU', 'semi', 'intermediate', 'free', 4.5, 80, 1, 1737200000000, 1737200000000),
('tool-029', 'Readi', '개발', '웹 개발', 'AI 기반 웹페이지 개발 도구. 자연어로 웹사이트 제작', 'https://readi.ai', '웹페이지 개발,랜딩페이지 제작,포트폴리오 사이트', '웹,개발,홈페이지,랜딩페이지,노코드', 'full', 'beginner', 'freemium', 4.2, 60, 1, 1737200000000, 1737200000000);

-- 고객서비스/챗봇
INSERT OR REPLACE INTO ai_tools (id, name, category, subcategory, description, website_url, use_cases, keywords, automation_level, difficulty, pricing_type, rating, popularity, is_active, created_at, updated_at) VALUES
('tool-030', 'Typebot', '고객서비스', '챗봇 빌더', '오픈소스 챗봇 빌더. 드래그앤드롭으로 홈페이지용 ARS 챗봇 개발', 'https://typebot.io', '고객 문의 응대,FAQ 챗봇,리드 수집,ARS 챗봇', '고객,서비스,챗봇,ARS,자동화,CS', 'full', 'beginner', 'freemium', 4.4, 70, 1, 1737200000000, 1737200000000),
('tool-031', '카카오 채널 챗봇', '고객서비스', '메신저 챗봇', '카카오톡 채널 기반 AI 챗봇. 스킬 기능으로 API 연동, 24시간 자동 응답 상담', 'https://business.kakao.com', '카카오톡 상담,자동 응답,예약 관리,주문 접수,ARS 챗봇', '고객,카카오,챗봇,상담,자동응답,CS', 'full', 'beginner', 'freemium', 4.5, 82, 1, 1737200000000, 1737200000000);

-- 디자인/마케팅
INSERT OR REPLACE INTO ai_tools (id, name, category, subcategory, description, website_url, use_cases, keywords, automation_level, difficulty, pricing_type, rating, popularity, is_active, created_at, updated_at) VALUES
('tool-032', 'Canva AI', '마케팅', '디자인', 'AI 기반 디자인 도구. SNS 콘텐츠, 배너, 인포그래픽, 프레젠테이션 제작', 'https://www.canva.com', 'SNS 이미지 제작,배너 디자인,인포그래픽,포스터,프레젠테이션', '디자인,이미지,SNS,배너,포스터,인포그래픽', 'semi', 'beginner', 'freemium', 4.7, 95, 1, 1737200000000, 1737200000000),
('tool-033', 'Gemini Gems', '마케팅', '맞춤형 AI', 'Google Gemini 기반 맞춤형 AI 앱. 마케팅 카피, SNS 게시물 자동 생성, 개인 비서', 'https://gemini.google.com', '광고 카피 작성,SNS 게시물,이메일 마케팅,맞춤형 AI 비서', '카피,광고,마케팅,SNS,게시물,콘텐츠,젬스', 'semi', 'beginner', 'freemium', 4.5, 80, 1, 1737200000000, 1737200000000);

-- 데이터/크롤링
INSERT OR REPLACE INTO ai_tools (id, name, category, subcategory, description, website_url, use_cases, keywords, automation_level, difficulty, pricing_type, rating, popularity, is_active, created_at, updated_at) VALUES
('tool-034', 'Listly', '데이터분석', '웹 스크래핑', '웹 스크래핑/데이터 추출 도구. 웹페이지 데이터를 엑셀로 자동 변환', 'https://listly.io', '웹 데이터 추출,가격 비교,경쟁사 모니터링,리스트 수집', '크롤링,데이터,추출,엑셀,스크래핑,수집', 'full', 'beginner', 'freemium', 4.3, 68, 1, 1737200000000, 1737200000000),
('tool-035', 'Julius AI', '데이터분석', '데이터 시각화', '자연어로 데이터 분석 및 시각화. 엑셀 데이터 자동 분석, 차트 생성', 'https://julius.ai', '데이터 시각화,통계 분석,차트 생성,엑셀 분석', '데이터,분석,통계,차트,그래프,시각화,엑셀', 'semi', 'beginner', 'freemium', 4.4, 72, 1, 1737200000000, 1737200000000);

-- 음성/입력
INSERT OR REPLACE INTO ai_tools (id, name, category, subcategory, description, website_url, use_cases, keywords, automation_level, difficulty, pricing_type, rating, popularity, is_active, created_at, updated_at) VALUES
('tool-036', 'Voice In', '음성입력', 'STT', '음성 인식 STT 딕테이션. 영어 학습, 음성으로 텍스트 입력', 'https://voicein.com', '음성 입력,딕테이션,영어 학습,텍스트 변환', '음성,STT,딕테이션,입력,영어,변환', 'semi', 'beginner', 'freemium', 4.2, 58, 1, 1737200000000, 1737200000000);

-- 일정관리
INSERT OR REPLACE INTO ai_tools (id, name, category, subcategory, description, website_url, use_cases, keywords, automation_level, difficulty, pricing_type, rating, popularity, is_active, created_at, updated_at) VALUES
('tool-037', 'Notion 캘린더', '일정관리', '스케줄링', 'Notion 내장 캘린더. 일정 관리, 태스크 연동, 팀 협업 지원', 'https://www.notion.so/product/calendar', '일정 관리,태스크 연동,회의 스케줄링,팀 캘린더', '일정,스케줄,회의,캘린더,태스크,관리', 'semi', 'beginner', 'freemium', 4.4, 78, 1, 1737200000000, 1737200000000);

-- 구글 앱스 스크립트
INSERT OR REPLACE INTO ai_tools (id, name, category, subcategory, description, website_url, use_cases, keywords, automation_level, difficulty, pricing_type, rating, popularity, is_active, created_at, updated_at) VALUES
('tool-038', 'Google Apps Script', '업무자동화', '구글 자동화', '구글 시트에 부가 기능 추가. 매크로 자동화, 구글 워크스페이스 연동 자동화', 'https://script.google.com', '구글 시트 자동화,매크로 실행,이메일 자동화,워크스페이스 연동', '구글,시트,자동화,매크로,스크립트,워크스페이스', 'full', 'intermediate', 'free', 4.3, 70, 1, 1737200000000, 1737200000000);
