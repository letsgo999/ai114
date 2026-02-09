-- =============================================
-- 0005: 워크플로우 자동화 도구 추가 및 데이터분석 도구 세분화
-- 날짜: 2026-02-09
-- 목적: 
--   1. Google Opal 및 Python 워크플로우 도구 추가
--   2. Julius AI → 로컬 파일 분석 전용으로 수정
--   3. Perplexity Comet Browser → 웹 데이터 분석 우선으로 수정
--   4. Zapier/Make/n8n → 우선순위 낮춤
-- =============================================

-- 현재 시간 (Unix timestamp in milliseconds)
-- 1739144400000 = 2026-02-09 기준

-- =============================================
-- 1. 신규 도구 추가: Google Opal
-- =============================================
INSERT OR REPLACE INTO ai_tools (
  id, name, category, subcategory, description, website_url,
  use_cases, keywords, automation_level, difficulty,
  pricing_type, pricing_detail, rating, popularity, is_active,
  created_at, updated_at
) VALUES (
  'tool-047',
  'Google Opal',
  '업무자동화',
  '워크플로우 빌더',
  'Google AI 기반 노코드 워크플로우 빌더. 자연어로 AI 미니앱 생성, 멀티스텝 자동화 워크플로우 구축. 프롬프트 체이닝으로 복잡한 업무 자동화 가능.',
  'https://opal.google',
  '워크플로우 자동화,AI 미니앱 생성,프롬프트 체이닝,반복 업무 자동화,데이터 처리 파이프라인,보고서 자동 생성',
  '워크플로우,자동화,노코드,AI앱,구글,Opal,프롬프트,체이닝,미니앱,파이프라인,Gemini,자연어',
  'full',
  'beginner',
  'free',
  '무료 (Google Labs)',
  4.6,
  88,
  1,
  1739144400000,
  1739144400000
);

-- =============================================
-- 2. 신규 도구 추가: Python Prefect
-- =============================================
INSERT OR REPLACE INTO ai_tools (
  id, name, category, subcategory, description, website_url,
  use_cases, keywords, automation_level, difficulty,
  pricing_type, pricing_detail, rating, popularity, is_active,
  created_at, updated_at
) VALUES (
  'tool-048',
  'Prefect (Python)',
  '업무자동화',
  'Python 워크플로우',
  'Python 기반 워크플로우 오케스트레이션. 데코레이터만으로 함수를 데이터 파이프라인으로 변환. 재시도, 에러 핸들링, 스케줄링 내장.',
  'https://www.prefect.io',
  '데이터 파이프라인,배치 작업 스케줄링,ETL 자동화,ML 워크플로우,API 연동 자동화,리포트 생성 자동화',
  '파이썬,Python,워크플로우,자동화,오케스트레이션,Prefect,데이터파이프라인,ETL,스케줄링,배치',
  'full',
  'intermediate',
  'freemium',
  '무료 플랜 제공, 클라우드 유료',
  4.5,
  82,
  1,
  1739144400000,
  1739144400000
);

-- =============================================
-- 3. 신규 도구 추가: Apache Airflow
-- =============================================
INSERT OR REPLACE INTO ai_tools (
  id, name, category, subcategory, description, website_url,
  use_cases, keywords, automation_level, difficulty,
  pricing_type, pricing_detail, rating, popularity, is_active,
  created_at, updated_at
) VALUES (
  'tool-049',
  'Apache Airflow',
  '업무자동화',
  'Python 워크플로우',
  'Python 기반 워크플로우 관리 플랫폼. DAG(방향성 비순환 그래프)로 복잡한 데이터 파이프라인 정의. 대규모 배치 처리에 적합.',
  'https://airflow.apache.org',
  '데이터 파이프라인 관리,배치 작업 스케줄링,ETL 프로세스,ML 파이프라인,데이터 웨어하우스 연동',
  '파이썬,Python,워크플로우,자동화,Airflow,DAG,데이터파이프라인,ETL,스케줄링,오픈소스',
  'full',
  'advanced',
  'free',
  '오픈소스 무료',
  4.4,
  90,
  1,
  1739144400000,
  1739144400000
);

-- =============================================
-- 4. 신규 도구 추가: n8n (오픈소스 자동화)
-- =============================================
INSERT OR REPLACE INTO ai_tools (
  id, name, category, subcategory, description, website_url,
  use_cases, keywords, automation_level, difficulty,
  pricing_type, pricing_detail, rating, popularity, is_active,
  created_at, updated_at
) VALUES (
  'tool-050',
  'n8n',
  '업무자동화',
  '노코드 자동화',
  '오픈소스 워크플로우 자동화 플랫폼. 셀프호스팅 가능, 400+ 통합 지원. Zapier 대안으로 개인정보 보호 및 비용 절감.',
  'https://n8n.io',
  '앱 간 연동 자동화,이메일 자동화,데이터 동기화,웹훅 처리,API 통합,반복 업무 자동화',
  '자동화,워크플로우,n8n,연동,API,웹훅,오픈소스,셀프호스팅,통합',
  'full',
  'intermediate',
  'freemium',
  '셀프호스팅 무료, 클라우드 유료',
  4.5,
  78,
  1,
  1739144400000,
  1739144400000
);

-- =============================================
-- 5. Julius AI 수정: 로컬 파일 분석 전용으로 명확화
-- =============================================
UPDATE ai_tools SET
  subcategory = '로컬 파일 분석',
  description = '엑셀, CSV 등 로컬 파일 데이터 분석 전용 AI. 파일 업로드 후 자연어로 데이터 분석, 통계, 시각화. 웹 데이터 분석에는 Perplexity Comet 권장.',
  use_cases = '엑셀 데이터 분석,CSV 파일 통계,로컬 데이터 시각화,업로드 파일 인사이트,스프레드시트 분석,데이터 대시보드',
  keywords = '데이터,분석,통계,차트,그래프,시각화,엑셀,CSV,로컬파일,업로드,스프레드시트,파일분석,Julius',
  updated_at = 1739144400000
WHERE id = 'tool-035';

-- =============================================
-- 6. Perplexity Comet Browser 수정: 웹 데이터 분석 우선순위 강화
-- =============================================
UPDATE ai_tools SET
  subcategory = '웹 데이터 분석',
  description = '웹사이트 데이터 수집 및 실시간 분석 전용 AI 브라우저. 검색 결과 분석, 웹페이지 인사이트 추출, 실시간 트렌드 모니터링. 로컬 파일 분석에는 Julius AI 권장.',
  use_cases = '웹 데이터 분석,검색 결과 인사이트,실시간 트렌드 분석,경쟁사 웹 모니터링,웹페이지 요약,온라인 리서치 자동화',
  keywords = '브라우저,웹분석,웹데이터,크롤링,데이터수집,리서치,AI브라우저,자동화,모니터링,Perplexity,Comet,인사이트,트렌드,실시간',
  rating = 4.7,
  popularity = 90,
  updated_at = 1739144400000
WHERE id = 'tool-006';

-- =============================================
-- 7. Zapier 수정: 우선순위 낮춤 및 설명 보완
-- =============================================
UPDATE ai_tools SET
  description = 'SaaS 앱 간 연동 자동화 도구. 5000+ 앱 지원. 단, AI 워크플로우에는 Google Opal이나 Python 도구(Prefect, Airflow) 권장.',
  keywords = '자동화,워크플로우,연동,트리거,이메일,동기화,SaaS,앱연동,Zapier',
  popularity = 70,
  updated_at = 1739144400000
WHERE id = 'tool-025';

-- =============================================
-- 8. Make 수정: 우선순위 낮춤 및 설명 보완
-- =============================================
UPDATE ai_tools SET
  description = '시각적 워크플로우 자동화 도구. 복잡한 시나리오 지원. 단, AI 워크플로우에는 Google Opal이나 Python 도구(Prefect, Airflow) 권장.',
  keywords = '자동화,워크플로우,연동,API,반복,프로세스,시나리오,Make,Integromat',
  popularity = 68,
  updated_at = 1739144400000
WHERE id = 'tool-024';

-- =============================================
-- 9. Gemini in Chrome 수정: 웹 분석 키워드 강화
-- =============================================
UPDATE ai_tools SET
  description = 'Chrome 브라우저 내장 Gemini AI. 웹페이지 요약, 실시간 정보 분석, 멀티탭 컨텍스트 활용. 브라우저 기반 웹 데이터 분석에 최적.',
  keywords = '브라우저,Chrome,Gemini,웹요약,AI어시스턴트,멀티탭,검색,자동화,구글,웹분석,웹데이터,인사이트',
  updated_at = 1739144400000
WHERE id = 'tool-039';
