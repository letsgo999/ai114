-- =============================================
-- AI 코칭 가이드 - TTS/음성생성 및 자막 도구 추가
-- Version: 1.4
-- Date: 2026-02-05
-- =============================================

-- 1. Gemini TTS (구글 제미나이 TTS)
INSERT OR REPLACE INTO ai_tools (
  id, name, category, subcategory, description, website_url,
  use_cases, keywords, automation_level, difficulty, pricing_type,
  rating, popularity, is_active, created_at, updated_at
) VALUES (
  'tool-041',
  'Gemini TTS',
  '음성생성',
  'AI 음성 합성',
  'Google Gemini 기반 고품질 TTS. 자연스러운 음성 합성, 다국어 지원, 감정 표현 가능. Chrome 브라우저 및 API 통합 지원.',
  'https://ai.google.dev/gemini-api/docs/audio',
  '나레이션 생성,팟캐스트 음성,영상 더빙,오디오북 제작,다국어 음성 변환',
  'TTS,음성합성,나레이션,더빙,Gemini,구글,다국어,음성생성,AI보이스',
  'full',
  'beginner',
  'freemium',
  4.7,
  88,
  1,
  strftime('%s', 'now'),
  strftime('%s', 'now')
);

-- 2. Supertone (슈퍼톤) - 한국어 특화
INSERT OR REPLACE INTO ai_tools (
  id, name, category, subcategory, description, website_url,
  use_cases, keywords, automation_level, difficulty, pricing_type,
  rating, popularity, is_active, created_at, updated_at
) VALUES (
  'tool-042',
  'Supertone (슈퍼톤)',
  '음성생성',
  'AI 음성 합성',
  '한국 스타트업의 AI 음성 기술. 한국어 자연스러운 발음, 감정 표현, 음성 복제 기능. 유튜브/팟캐스트/광고 나레이션에 최적화.',
  'https://supertone.ai',
  '한국어 나레이션,유튜브 더빙,광고 음성,팟캐스트,AI 성우,음성 복제',
  'TTS,음성합성,한국어,나레이션,더빙,슈퍼톤,AI성우,음성복제,보이스클론',
  'full',
  'beginner',
  'freemium',
  4.6,
  75,
  1,
  strftime('%s', 'now'),
  strftime('%s', 'now')
);

-- 3. Qwen3 TTS (알리바바 통의천문)
INSERT OR REPLACE INTO ai_tools (
  id, name, category, subcategory, description, website_url,
  use_cases, keywords, automation_level, difficulty, pricing_type,
  rating, popularity, is_active, created_at, updated_at
) VALUES (
  'tool-043',
  'Qwen3 TTS',
  '음성생성',
  'AI 음성 합성',
  '알리바바 Qwen3 기반 다국어 TTS. 중국어/영어/한국어 등 다양한 언어 지원. 오픈소스로 커스터마이징 가능.',
  'https://github.com/QwenLM/Qwen2.5',
  '다국어 음성합성,오픈소스 TTS,음성 커스터마이징,API 연동,배치 처리',
  'TTS,음성합성,Qwen,알리바바,다국어,오픈소스,음성생성,중국어,AI보이스',
  'semi',
  'intermediate',
  'free',
  4.4,
  70,
  1,
  strftime('%s', 'now'),
  strftime('%s', 'now')
);

-- 4. ElevenLabs (일레븐랩스) - 글로벌 대표 TTS
INSERT OR REPLACE INTO ai_tools (
  id, name, category, subcategory, description, website_url,
  use_cases, keywords, automation_level, difficulty, pricing_type,
  rating, popularity, is_active, created_at, updated_at
) VALUES (
  'tool-044',
  'ElevenLabs',
  '음성생성',
  'AI 음성 합성',
  '세계 최고 수준의 AI 음성 합성. 29개 언어 지원, 음성 복제, 실시간 더빙. 할리우드급 품질의 나레이션 생성.',
  'https://elevenlabs.io',
  '프로 나레이션,음성 복제,실시간 더빙,오디오북,게임 음성,다국어 더빙',
  'TTS,음성합성,ElevenLabs,나레이션,더빙,음성복제,AI성우,다국어,프로오디오',
  'full',
  'beginner',
  'freemium',
  4.8,
  95,
  1,
  strftime('%s', 'now'),
  strftime('%s', 'now')
);

-- 5. Vrew 도구 정보 업데이트 (자막/STT 기능 강화)
UPDATE ai_tools SET
  description = 'AI 기반 영상 편집 및 자막 자동 생성. 음성 인식(STT)으로 자막 자동 생성, 다국어 번역, TTS 나레이션 추가. 유튜브/교육 영상 제작에 최적화.',
  use_cases = '자막 자동 생성,음성→텍스트 변환,다국어 자막 번역,영상 편집,TTS 나레이션,유튜브 자막',
  keywords = '영상,편집,자막,STT,음성인식,자막생성,유튜브,교육,TTS,번역,Vrew,브루,자동자막',
  updated_at = strftime('%s', 'now')
WHERE id = 'tool-023';

-- 6. 자막 전문 도구 - Descript 추가
INSERT OR REPLACE INTO ai_tools (
  id, name, category, subcategory, description, website_url,
  use_cases, keywords, automation_level, difficulty, pricing_type,
  rating, popularity, is_active, created_at, updated_at
) VALUES (
  'tool-045',
  'Descript',
  '영상편집',
  '자막/음성 편집',
  '텍스트 기반 영상/오디오 편집. 음성을 텍스트로 변환 후 텍스트 편집으로 영상 편집. 자막 자동 생성, 필러워드 제거, AI 음성 교정.',
  'https://www.descript.com',
  '자막 자동 생성,텍스트 기반 편집,필러워드 제거,팟캐스트 편집,음성 교정,화면 녹화',
  '영상편집,자막,STT,음성인식,텍스트편집,팟캐스트,Descript,필러워드,오디오편집',
  'full',
  'beginner',
  'freemium',
  4.7,
  85,
  1,
  strftime('%s', 'now'),
  strftime('%s', 'now')
);

-- 7. Clova Note (클로바노트) - 한국어 STT
INSERT OR REPLACE INTO ai_tools (
  id, name, category, subcategory, description, website_url,
  use_cases, keywords, automation_level, difficulty, pricing_type,
  rating, popularity, is_active, created_at, updated_at
) VALUES (
  'tool-046',
  'Clova Note (클로바노트)',
  '회의',
  '음성 기록',
  '네이버 AI 기반 음성 기록 서비스. 한국어 인식 최적화, 회의록 자동 생성, 화자 분리, 실시간 전사. 무료 사용 가능.',
  'https://clovanote.naver.com',
  '회의록 자동 생성,음성→텍스트,강의 녹취,인터뷰 전사,화자 분리,실시간 기록',
  'STT,음성인식,회의록,전사,클로바노트,네이버,한국어,화자분리,녹취',
  'full',
  'beginner',
  'free',
  4.5,
  80,
  1,
  strftime('%s', 'now'),
  strftime('%s', 'now')
);
