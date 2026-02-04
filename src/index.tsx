// =============================================
// AI 활용 코칭 가이드 웹앱 - 메인 엔트리
// AI공부방 10기 수강생 대상
// =============================================

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import type { Bindings, Task, AITool, Comment, CreateTaskRequest, TaskWithRecommendation } from './lib/types'
import { recommendTools, extractKeywords, ClarificationHint } from './lib/recommendation'
import { generateAICoaching, generateAICoachingWithOpenAI, generateFallbackCoaching, AICoachingResult } from './lib/gemini'
import { analyzeForClarification, applyClarificationChoice, ClarificationOption } from './lib/clarification'
import { selectAIEngine, AIEngineType, ENGINE_OPTIONS } from './lib/ai-engine-selector'

const app = new Hono<{ Bindings: Bindings }>()

// CORS 설정
app.use('/api/*', cors())

// 정적 파일 서빙
app.use('/static/*', serveStatic({ root: './public' }))

// =============================================
// 유틸리티 함수
// =============================================

function generateId(): string {
  return crypto.randomUUID()
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// =============================================
// 데이터베이스 초기화 함수
// =============================================

async function initializeDatabase(db: D1Database) {
  // 각 테이블을 개별적으로 생성
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        organization TEXT NOT NULL,
        department TEXT NOT NULL,
        name TEXT NOT NULL,
        job_description TEXT NOT NULL,
        repeat_cycle TEXT NOT NULL,
        automation_request TEXT NOT NULL,
        email TEXT NOT NULL,
        current_tools TEXT,
        estimated_hours REAL DEFAULT 0,
        recommended_tools TEXT,
        task_category TEXT,
        automation_level TEXT,
        status TEXT DEFAULT 'pending',
        coach_comment_status TEXT DEFAULT 'none',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
    )
  `).run();
  
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS comments (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        additional_tools TEXT,
        tool_explanation TEXT,
        tips TEXT,
        learning_priority TEXT,
        general_comment TEXT,
        status TEXT DEFAULT 'draft',
        coach_name TEXT DEFAULT '디마불사',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    )
  `).run();
  
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS ai_tools (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        category TEXT NOT NULL,
        subcategory TEXT,
        description TEXT NOT NULL,
        website_url TEXT,
        use_cases TEXT NOT NULL,
        keywords TEXT NOT NULL,
        automation_level TEXT NOT NULL,
        difficulty TEXT NOT NULL,
        pricing_type TEXT NOT NULL,
        pricing_detail TEXT,
        rating REAL DEFAULT 4.0,
        popularity INTEGER DEFAULT 50,
        is_active INTEGER DEFAULT 1,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
    )
  `).run();
  
  // 기존 데이터 확인
  const { results } = await db.prepare('SELECT COUNT(*) as count FROM ai_tools').all();
  const count = (results[0] as any)?.count || 0;
  
  // 데이터가 없으면 시드 데이터 삽입
  if (count === 0) {
    const now = Date.now();
    // 2026년 AI공부방 10기 교육자료 기반 확장된 AI 도구 데이터베이스
    const seedTools = [
      // ===== 다목적/문서작성 =====
      { id: 'tool-001', name: 'ChatGPT', category: '문서작성', subcategory: '다목적 AI', description: 'OpenAI GPT-5 Pro 기반 대화형 AI. 프로젝트 기능으로 맞춤형 앱 개발, 심층 리서치(Search), 이미지 생성(DALL-E), 반복 업무 자동화 초벌 작업 지원', website_url: 'https://chatgpt.com', use_cases: '문서 초안 작성,이메일 작성,보고서 요약,번역,시장조사,엑셀 데이터 자동 입력,반복 업무 자동화 앱 개발', keywords: '문서,작성,보고서,이메일,기획안,제안서,요약,번역,프로젝트,자동화,GPT', automation_level: 'semi', difficulty: 'beginner', pricing_type: 'freemium', rating: 4.9, popularity: 100 },
      { id: 'tool-002', name: 'Claude', category: '문서작성', subcategory: '코딩/개발', description: 'Anthropic의 Claude Sonnet 3.5/Opus 4.5. MCP(AI 에이전트 서버 간 연동) 지원, 고성능 코딩, 바이브 코딩으로 자연어 기반 앱 개발', website_url: 'https://claude.ai', use_cases: '긴 문서 분석,코딩 자동화,바이브 코딩,웹사이트 개발,랜딩페이지 제작,MCP 연동', keywords: '분석,문서,코딩,개발,MCP,바이브코딩,에이전트,프로그래밍', automation_level: 'full', difficulty: 'beginner', pricing_type: 'freemium', rating: 4.8, popularity: 95 },
      { id: 'tool-003', name: 'Notion AI', category: '문서작성', subcategory: '문서 관리', description: 'Notion 내장 AI로 문서 작성, 요약, 액션 아이템 추출, 팀 협업 지원', website_url: 'https://www.notion.so', use_cases: '회의록 정리,문서 요약,액션 아이템 추출,프로젝트 관리,팀 협업', keywords: '회의록,정리,요약,액션,문서,노션,협업,프로젝트', automation_level: 'semi', difficulty: 'beginner', pricing_type: 'freemium', rating: 4.5, popularity: 85 },
      { id: 'tool-004', name: 'Gamma', category: '문서작성', subcategory: '프레젠테이션', description: 'AI 기반 프레젠테이션 자동 생성 도구. 텍스트 입력만으로 전문적인 슬라이드 제작', website_url: 'https://gamma.app', use_cases: '프레젠테이션 제작,슬라이드 디자인,문서 시각화,제안서 작성', keywords: '프레젠테이션,PPT,슬라이드,발표,제안서,디자인', automation_level: 'full', difficulty: 'beginner', pricing_type: 'freemium', rating: 4.6, popularity: 80 },
      
      // ===== 리서치/검색 =====
      { id: 'tool-005', name: 'Perplexity AI', category: '리서치', subcategory: 'AI 검색', description: '실시간 웹 검색 기반 AI. 연관 질문 자동 생성, 팩트 체크, 검색 결과 PDF 저장, 딥서치 기능으로 심층 조사', website_url: 'https://perplexity.ai', use_cases: '정보 검색,리서치,팩트 체크,트렌드 조사,SW 사용법 검색,딥서치', keywords: '검색,리서치,조사,정보,트렌드,분석,팩트체크,딥서치', automation_level: 'semi', difficulty: 'beginner', pricing_type: 'freemium', rating: 4.8, popularity: 95 },
      { id: 'tool-006', name: 'Perplexity Comet Browser', category: '리서치', subcategory: '브라우저', description: '퍼플렉시티의 AI 브라우저. 웹 크롤링 작업 자동화 불필요, 실시간 정보 수집 및 분석', website_url: 'https://perplexity.ai/comet', use_cases: '웹 크롤링 대체,실시간 정보 수집,경쟁사 모니터링,가격 추적', keywords: '크롤링,브라우저,검색,자동화,모니터링,데이터수집', automation_level: 'full', difficulty: 'beginner', pricing_type: 'freemium', rating: 4.5, popularity: 70 },
      { id: 'tool-007', name: 'Google Deep Research', category: '리서치', subcategory: '심층 리서치', description: 'Gemini의 Deep Research 기능. 복잡한 주제 심층 조사 및 보고서 자동 생성, 학술 조사 지원', website_url: 'https://gemini.google.com', use_cases: '심층 리서치,시장 조사,경쟁사 분석,트렌드 보고서,학술 조사', keywords: '검색,리서치,조사,정보,분석,보고서,심층,학술', automation_level: 'full', difficulty: 'beginner', pricing_type: 'freemium', rating: 4.6, popularity: 80 },
      { id: 'tool-008', name: 'Liner', category: '리서치', subcategory: '학술 검색', description: '학술 논문 기반 검색 및 답변. 신뢰도 높은 논문 검색, 인용 지원', website_url: 'https://getliner.com', use_cases: '학술 논문 검색,인용 관리,연구 조사,신뢰도 높은 정보 검색', keywords: '논문,학술,검색,인용,리서치,연구,학습', automation_level: 'semi', difficulty: 'beginner', pricing_type: 'freemium', rating: 4.4, popularity: 65 },
      
      // ===== 학습/문서분석 =====
      { id: 'tool-009', name: 'Google NotebookLM', category: '학습', subcategory: 'RAG 학습', description: 'RAG 기반 학습 도구. 대용량 문서/논문 분석, 오디오 오버뷰, 유튜브/웹 요약, 플래시 카드 생성, 팟캐스트 형식 요약 비디오 제작', website_url: 'https://notebooklm.google.com', use_cases: '문서 분석,논문 요약,유튜브 영상 요약,FAQ 생성,팟캐스트 제작,학습 자료 정리,오디오 요약', keywords: '문서,분석,요약,노트북,학습,리서치,유튜브,팟캐스트,오디오,RAG', automation_level: 'full', difficulty: 'beginner', pricing_type: 'free', rating: 4.9, popularity: 92 },
      { id: 'tool-010', name: '클로바노트 (ClovaNote)', category: '학습', subcategory: '음성 요약', description: '네이버의 AI 회의록/음성 요약 도구. 실시간 녹음 전사, 핵심 내용 자동 추출', website_url: 'https://clovanote.naver.com', use_cases: '회의록 작성,강의 녹음 요약,인터뷰 전사,음성 메모 정리', keywords: '회의록,녹음,전사,요약,음성,미팅,강의,메모', automation_level: 'full', difficulty: 'beginner', pricing_type: 'freemium', rating: 4.5, popularity: 75 },
      
      // ===== 젠스파크 생태계 =====
      { id: 'tool-011', name: 'Genspark', category: '리서치', subcategory: '멀티에이전트', description: '멀티 에이전트 기반 팩트 체크 검색. AI 슬라이드 생성, 젠스파크 페이지(웹사이트) 구축, 통화 비서(예약 대행) 지원', website_url: 'https://genspark.ai', use_cases: '팩트 체크,슬라이드 생성,홈페이지 제작,통화 비서,예약 대행', keywords: '검색,팩트체크,슬라이드,홈페이지,에이전트,통화비서', automation_level: 'full', difficulty: 'beginner', pricing_type: 'freemium', rating: 4.7, popularity: 85 },
      { id: 'tool-012', name: 'Genspark AI Developer', category: '개발', subcategory: 'AI 개발자', description: '젠스파크 AI 개발자. 자연어로 웹앱 개발, 온라인 주문 폼 홈페이지 제작, 코딩 기초 학습 도구', website_url: 'https://genspark.ai', use_cases: '웹앱 개발,주문 폼 제작,랜딩페이지 개발,코딩 학습', keywords: '개발,코딩,웹앱,홈페이지,노코드,자동화', automation_level: 'full', difficulty: 'beginner', pricing_type: 'freemium', rating: 4.6, popularity: 78 },
      { id: 'tool-013', name: 'Nano Banana Pro', category: '이미지생성', subcategory: 'AI 이미지', description: '제미나이 나노바나나 기반 고품질 이미지 생성/편집. 자연어 포토샵, 이미지 내 한글 합성, 유튜브 썸네일 제작', website_url: 'https://genspark.ai', use_cases: '이미지 생성,이미지 편집,썸네일 제작,배경 변경,사물 추가,한글 합성', keywords: '이미지,생성,편집,썸네일,포토샵,디자인,합성', automation_level: 'semi', difficulty: 'beginner', pricing_type: 'freemium', rating: 4.7, popularity: 88 },
      
      // ===== 구글 AI 생태계 =====
      { id: 'tool-014', name: 'Google AI Studio', category: '개발', subcategory: 'AI 실험실', description: 'Gemini 최신 기능 무료 실험. 스트림(Screen Share) 코칭, 바이브 앱 개발, SNS 콘텐츠 자동 생성 앱 개발', website_url: 'https://aistudio.google.com', use_cases: 'AI 앱 개발,프로토타입 제작,스트림 코칭,SNS 콘텐츠 자동화', keywords: '개발,AI,실험,프로토타입,스트림,코칭,앱', automation_level: 'semi', difficulty: 'beginner', pricing_type: 'free', rating: 4.6, popularity: 82 },
      { id: 'tool-015', name: 'Google AI Studio Build', category: '개발', subcategory: 'AI 앱 빌더', description: 'Google AI Studio의 빌드(Vibe) 기능. 노코드/로우코드 AI 웹앱 개발 및 배포, 구글 클라우드 런 연동', website_url: 'https://aistudio.google.com', use_cases: 'AI 앱 개발,웹앱 배포,API 연동,챗봇 개발,클라우드 배포', keywords: '개발,노코드,빌드,앱,배포,클라우드,바이브', automation_level: 'full', difficulty: 'beginner', pricing_type: 'free', rating: 4.5, popularity: 75 },
      { id: 'tool-016', name: 'Google AI Studio TTS', category: '음성생성', subcategory: '음성 합성', description: 'Google AI Studio의 TTS 모델. 자연스러운 음성 콘텐츠 제작, 팟캐스트, 영상 나레이션 생성', website_url: 'https://aistudio.google.com', use_cases: '음성 콘텐츠 제작,팟캐스트 제작,영상 나레이션,오디오 광고', keywords: '음성,TTS,나레이션,팟캐스트,오디오,콘텐츠', automation_level: 'semi', difficulty: 'beginner', pricing_type: 'free', rating: 4.4, popularity: 70 },
      { id: 'tool-017', name: 'Gemini 3 Pro', category: '다목적', subcategory: '최신 AI', description: 'Google의 최신 Gemini 3 Pro 모델. 멀티모달 지원, 고급 추론, 긴 컨텍스트 처리', website_url: 'https://gemini.google.com', use_cases: '복잡한 분석,멀티모달 작업,긴 문서 처리,고급 추론', keywords: '분석,멀티모달,추론,문서,이미지,코딩', automation_level: 'semi', difficulty: 'beginner', pricing_type: 'freemium', rating: 4.8, popularity: 90 },
      
      // ===== 영상/미디어 생성 =====
      { id: 'tool-018', name: 'OpenAI Sora 2', category: '영상생성', subcategory: 'AI 영상', description: 'OpenAI의 텍스트/이미지 기반 고품질 동영상 생성. 숏폼 콘텐츠, CF 홍보 영상 제작', website_url: 'https://openai.com/sora', use_cases: '영상 생성,숏폼 제작,광고 영상,스토리텔링 영상,창작 콘텐츠', keywords: '영상,비디오,생성,숏폼,광고,콘텐츠,CF', automation_level: 'semi', difficulty: 'intermediate', pricing_type: 'paid', rating: 4.6, popularity: 85 },
      { id: 'tool-019', name: 'Google VEO 3.1', category: '영상생성', subcategory: 'AI 영상', description: 'Google의 최신 영상 생성 AI. 고품질 영상 및 음향 동시 생성, 마케팅 영상 제작', website_url: 'https://deepmind.google/veo', use_cases: '영상 생성,마케팅 영상,프로모션 비디오,소셜 미디어 콘텐츠', keywords: '영상,비디오,생성,마케팅,콘텐츠,프로모션', automation_level: 'semi', difficulty: 'beginner', pricing_type: 'freemium', rating: 4.5, popularity: 78 },
      { id: 'tool-020', name: 'Suno AI', category: '음악생성', subcategory: 'AI 작곡', description: '작사/작곡 AI. 텍스트로 노래 및 BGM 생성, 기념일 축가, 홍보 영상 배경음악 제작', website_url: 'https://suno.ai', use_cases: '노래 생성,BGM 제작,축가 작곡,홍보 음악,배경음악', keywords: '음악,작곡,노래,BGM,작사,오디오,축가', automation_level: 'full', difficulty: 'beginner', pricing_type: 'freemium', rating: 4.5, popularity: 80 },
      { id: 'tool-021', name: 'Udio', category: '음악생성', subcategory: 'AI 작곡', description: '고품질 AI 음악 생성. 다양한 장르의 음악 및 노래 제작', website_url: 'https://udio.com', use_cases: '음악 생성,노래 제작,BGM 제작,광고 음악', keywords: '음악,작곡,노래,BGM,생성,광고', automation_level: 'full', difficulty: 'beginner', pricing_type: 'freemium', rating: 4.4, popularity: 72 },
      
      // ===== 영상 편집 =====
      { id: 'tool-022', name: 'CapCut', category: '영상편집', subcategory: '영상 편집', description: '무료 영상 편집 앱. 자동 자막 생성, 숏폼 편집, 다양한 효과 및 템플릿', website_url: 'https://www.capcut.com', use_cases: '영상 편집,자막 생성,숏폼 제작,효과 추가,템플릿 활용', keywords: '영상,편집,자막,숏폼,효과,틱톡,릴스', automation_level: 'semi', difficulty: 'beginner', pricing_type: 'free', rating: 4.6, popularity: 90 },
      { id: 'tool-023', name: 'Vrew (브루)', category: '영상편집', subcategory: '자막/편집', description: 'AI 기반 영상 편집 및 자동 자막 생성. 교육 콘텐츠, 유튜브 영상 편집에 최적화', website_url: 'https://vrew.voyagerx.com', use_cases: '자막 생성,영상 편집,교육 콘텐츠,유튜브 편집', keywords: '영상,편집,자막,유튜브,교육,콘텐츠', automation_level: 'full', difficulty: 'beginner', pricing_type: 'freemium', rating: 4.5, popularity: 82 },
      
      // ===== 업무자동화 =====
      { id: 'tool-024', name: 'Make', category: '업무자동화', subcategory: '워크플로우', description: '시각적 워크플로우 빌더. 5000개 이상 앱 연동, 복잡한 조건부 자동화, API 연동', website_url: 'https://www.make.com', use_cases: '워크플로우 자동화,앱 연동,데이터 변환,API 연동,반복 업무 자동화', keywords: '자동화,워크플로우,연동,API,반복,프로세스', automation_level: 'full', difficulty: 'intermediate', pricing_type: 'freemium', rating: 4.6, popularity: 88 },
      { id: 'tool-025', name: 'Zapier', category: '업무자동화', subcategory: '워크플로우', description: '간편한 앱 연동 자동화. 트리거 기반 자동화, 다양한 SaaS 연동', website_url: 'https://zapier.com', use_cases: '앱 연동,트리거 자동화,이메일 자동화,데이터 동기화', keywords: '자동화,워크플로우,연동,트리거,이메일,동기화', automation_level: 'full', difficulty: 'beginner', pricing_type: 'freemium', rating: 4.5, popularity: 85 },
      { id: 'tool-026', name: '에이닷 전화', category: '업무자동화', subcategory: '통화 자동화', description: 'SK텔레콤의 AI 통화 비서. 통화 기록 요약, 일정 자동 생성, 비즈니스 통화 핵심 정리', website_url: 'https://adot.ai', use_cases: '통화 요약,일정 생성,비즈니스 통화 정리,캘린더 등록', keywords: '통화,요약,일정,캘린더,비서,자동화', automation_level: 'full', difficulty: 'beginner', pricing_type: 'freemium', rating: 4.3, popularity: 65 },
      
      // ===== 개발/코딩 =====
      { id: 'tool-027', name: 'Cursor AI', category: '개발', subcategory: 'AI 코딩', description: 'AI 기반 코드 에디터(VS Code 포크). 자연어 지시로 코드 작성/편집, 바이브 코딩 지원', website_url: 'https://cursor.sh', use_cases: '코드 작성,코드 편집,바이브 코딩,소프트웨어 개발', keywords: '코딩,개발,에디터,VS Code,자동화,프로그래밍', automation_level: 'full', difficulty: 'intermediate', pricing_type: 'freemium', rating: 4.7, popularity: 85 },
      { id: 'tool-028', name: 'Google Colab', category: '개발', subcategory: '파이썬 실행', description: '무료 파이썬 코드 실행 환경. GPU 지원, 영상 편집 자동화, 음량 노멀라이징 등 스크립트 실행', website_url: 'https://colab.research.google.com', use_cases: '파이썬 실행,데이터 분석,영상 편집 자동화,머신러닝 실험', keywords: '파이썬,코딩,데이터,분석,자동화,GPU', automation_level: 'semi', difficulty: 'intermediate', pricing_type: 'free', rating: 4.5, popularity: 80 },
      { id: 'tool-029', name: 'Readi', category: '개발', subcategory: '웹 개발', description: 'AI 기반 웹페이지 개발 도구. 자연어로 웹사이트 제작', website_url: 'https://readi.ai', use_cases: '웹페이지 개발,랜딩페이지 제작,포트폴리오 사이트', keywords: '웹,개발,홈페이지,랜딩페이지,노코드', automation_level: 'full', difficulty: 'beginner', pricing_type: 'freemium', rating: 4.2, popularity: 60 },
      
      // ===== 고객서비스/챗봇 =====
      { id: 'tool-030', name: 'Typebot', category: '고객서비스', subcategory: '챗봇 빌더', description: '오픈소스 챗봇 빌더. 드래그앤드롭으로 홈페이지용 ARS 챗봇 개발', website_url: 'https://typebot.io', use_cases: '고객 문의 응대,FAQ 챗봇,리드 수집,ARS 챗봇', keywords: '고객,서비스,챗봇,ARS,자동화,CS', automation_level: 'full', difficulty: 'beginner', pricing_type: 'freemium', rating: 4.4, popularity: 70 },
      { id: 'tool-031', name: '카카오 채널 챗봇', category: '고객서비스', subcategory: '메신저 챗봇', description: '카카오톡 채널 기반 AI 챗봇. 스킬 기능으로 API 연동, 24시간 자동 응답 상담', website_url: 'https://business.kakao.com', use_cases: '카카오톡 상담,자동 응답,예약 관리,주문 접수,ARS 챗봇', keywords: '고객,카카오,챗봇,상담,자동응답,CS', automation_level: 'full', difficulty: 'beginner', pricing_type: 'freemium', rating: 4.5, popularity: 82 },
      
      // ===== 디자인/마케팅 =====
      { id: 'tool-032', name: 'Canva AI', category: '마케팅', subcategory: '디자인', description: 'AI 기반 디자인 도구. SNS 콘텐츠, 배너, 인포그래픽, 프레젠테이션 제작', website_url: 'https://www.canva.com', use_cases: 'SNS 이미지 제작,배너 디자인,인포그래픽,포스터,프레젠테이션', keywords: '디자인,이미지,SNS,배너,포스터,인포그래픽', automation_level: 'semi', difficulty: 'beginner', pricing_type: 'freemium', rating: 4.7, popularity: 95 },
      { id: 'tool-033', name: 'Gemini Gems', category: '마케팅', subcategory: '맞춤형 AI', description: 'Google Gemini 기반 맞춤형 AI 앱. 마케팅 카피, SNS 게시물 자동 생성, 개인 비서', website_url: 'https://gemini.google.com', use_cases: '광고 카피 작성,SNS 게시물,이메일 마케팅,맞춤형 AI 비서', keywords: '카피,광고,마케팅,SNS,게시물,콘텐츠,젬스', automation_level: 'semi', difficulty: 'beginner', pricing_type: 'freemium', rating: 4.5, popularity: 80 },
      
      // ===== 데이터/크롤링 =====
      { id: 'tool-034', name: 'Listly', category: '데이터분석', subcategory: '웹 스크래핑', description: '웹 스크래핑/데이터 추출 도구. 웹페이지 데이터를 엑셀로 자동 변환', website_url: 'https://listly.io', use_cases: '웹 데이터 추출,가격 비교,경쟁사 모니터링,리스트 수집', keywords: '크롤링,데이터,추출,엑셀,스크래핑,수집', automation_level: 'full', difficulty: 'beginner', pricing_type: 'freemium', rating: 4.3, popularity: 68 },
      { id: 'tool-035', name: 'Julius AI', category: '데이터분석', subcategory: '데이터 시각화', description: '자연어로 데이터 분석 및 시각화. 엑셀 데이터 자동 분석, 차트 생성', website_url: 'https://julius.ai', use_cases: '데이터 시각화,통계 분석,차트 생성,엑셀 분석', keywords: '데이터,분석,통계,차트,그래프,시각화,엑셀', automation_level: 'semi', difficulty: 'beginner', pricing_type: 'freemium', rating: 4.4, popularity: 72 },
      
      // ===== 음성/입력 =====
      { id: 'tool-036', name: 'Voice In', category: '음성입력', subcategory: 'STT', description: '음성 인식 STT 딕테이션. 영어 학습, 음성으로 텍스트 입력', website_url: 'https://voicein.com', use_cases: '음성 입력,딕테이션,영어 학습,텍스트 변환', keywords: '음성,STT,딕테이션,입력,영어,변환', automation_level: 'semi', difficulty: 'beginner', pricing_type: 'freemium', rating: 4.2, popularity: 58 },
      
      // ===== 일정관리 =====
      { id: 'tool-037', name: 'Notion 캘린더', category: '일정관리', subcategory: '스케줄링', description: 'Notion 내장 캘린더. 일정 관리, 태스크 연동, 팀 협업 지원', website_url: 'https://www.notion.so/product/calendar', use_cases: '일정 관리,태스크 연동,회의 스케줄링,팀 캘린더', keywords: '일정,스케줄,회의,캘린더,태스크,관리', automation_level: 'semi', difficulty: 'beginner', pricing_type: 'freemium', rating: 4.4, popularity: 78 },
      
      // ===== 구글 앱스 스크립트 =====
      { id: 'tool-038', name: 'Google Apps Script', category: '업무자동화', subcategory: '구글 자동화', description: '구글 시트에 부가 기능 추가. 매크로 자동화, 구글 워크스페이스 연동 자동화', website_url: 'https://script.google.com', use_cases: '구글 시트 자동화,매크로 실행,이메일 자동화,워크스페이스 연동', keywords: '구글,시트,자동화,매크로,스크립트,워크스페이스', automation_level: 'full', difficulty: 'intermediate', pricing_type: 'free', rating: 4.3, popularity: 70 },
    ];
    
    for (const tool of seedTools) {
      await db.prepare(`
        INSERT OR REPLACE INTO ai_tools (id, name, category, subcategory, description, website_url, use_cases, keywords, automation_level, difficulty, pricing_type, rating, popularity, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      `).bind(tool.id, tool.name, tool.category, tool.subcategory, tool.description, tool.website_url, tool.use_cases, tool.keywords, tool.automation_level, tool.difficulty, tool.pricing_type, tool.rating, tool.popularity, now, now).run();
    }
  }
}

// =============================================
// API 라우트
// =============================================

// GET /api/init - 데이터베이스 초기화 (개발용)
app.get('/api/init', async (c) => {
  try {
    await initializeDatabase(c.env.DB);
    return c.json({ success: true, message: 'Database initialized successfully' });
  } catch (error: any) {
    console.error('Init error:', error);
    return c.json({ success: false, error: error?.message || String(error) }, 500);
  }
});

// GET /api/tools - AI 도구 목록 조회
app.get('/api/tools', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM ai_tools WHERE is_active = 1 ORDER BY category, popularity DESC'
    ).all<AITool>()
    
    return c.json({ success: true, data: results })
  } catch (error) {
    console.error('Error fetching tools:', error)
    return c.json({ success: false, error: 'Failed to fetch tools' }, 500)
  }
})

// GET /api/tools/categories - 카테고리별 도구 통계
app.get('/api/tools/categories', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT category, COUNT(*) as count 
      FROM ai_tools 
      WHERE is_active = 1 
      GROUP BY category 
      ORDER BY count DESC
    `).all()
    
    return c.json({ success: true, data: results })
  } catch (error: any) {
    console.error('Error fetching categories:', error?.message || error)
    return c.json({ success: false, error: 'Failed to fetch categories: ' + (error?.message || String(error)) }, 500)
  }
})

// =============================================
// 명확화 질문 API
// =============================================

// POST /api/clarify - 요청사항 분석 및 명확화 질문 생성
app.post('/api/clarify', async (c) => {
  try {
    const body = await c.req.json<{ job_description: string; automation_request: string }>()
    
    if (!body.job_description || !body.automation_request) {
      return c.json({ success: false, error: '업무 설명과 자동화 요청이 필요합니다.' }, 400)
    }
    
    // 명확화 분석 실행
    const clarificationResult = analyzeForClarification(
      body.job_description,
      body.automation_request
    )
    
    console.log(`명확화 분석: 모호성 점수 ${clarificationResult.ambiguity_score}, 질문 필요: ${clarificationResult.needs_clarification}`)
    
    return c.json({
      success: true,
      data: clarificationResult
    })
  } catch (error: any) {
    console.error('Clarification error:', error?.message || error)
    return c.json({ success: false, error: '명확화 분석 중 오류가 발생했습니다.' }, 500)
  }
})

// POST /api/clarify/apply - 사용자 선택 적용
app.post('/api/clarify/apply', async (c) => {
  try {
    const body = await c.req.json<{
      job_description: string;
      automation_request: string;
      selected_option: ClarificationOption;
    }>()
    
    if (!body.job_description || !body.automation_request || !body.selected_option) {
      return c.json({ success: false, error: '필수 필드가 누락되었습니다.' }, 400)
    }
    
    // 선택 적용
    const enhanced = applyClarificationChoice(
      { jobDescription: body.job_description, automationRequest: body.automation_request },
      body.selected_option
    )
    
    console.log(`명확화 선택 적용: "${body.selected_option.label}" → 키워드 추가: ${enhanced.additional_keywords.join(', ')}`)
    
    return c.json({
      success: true,
      data: enhanced
    })
  } catch (error: any) {
    console.error('Apply clarification error:', error?.message || error)
    return c.json({ success: false, error: '선택 적용 중 오류가 발생했습니다.' }, 500)
  }
})

// POST /api/tasks - 업무 등록 및 AI 추천 + AI 코칭 코멘트 생성
app.post('/api/tasks', async (c) => {
  try {
    const body = await c.req.json<CreateTaskRequest & { 
      ai_engine?: AIEngineType;
      clarification_hint?: ClarificationHint;  // 명확화 결과 추가
    }>()
    
    // 유효성 검사
    if (!body.organization || !body.department || !body.name || 
        !body.job_description || !body.repeat_cycle || !body.automation_request || !body.email) {
      return c.json({ success: false, error: '필수 필드가 누락되었습니다.' }, 400)
    }
    
    // AI 도구 목록 조회
    const { results: tools } = await c.env.DB.prepare(
      'SELECT * FROM ai_tools WHERE is_active = 1'
    ).all<AITool>()
    
    // 명확화 힌트 로깅
    if (body.clarification_hint) {
      console.log('=== 명확화 힌트 적용 ===')
      console.log('카테고리 힌트:', body.clarification_hint.category_hint)
      console.log('추가 키워드:', body.clarification_hint.additional_keywords)
    }
    
    // AI 추천 생성 (키워드 매칭 기반 + 명확화 힌트)
    const recommendation = recommendTools(
      tools as AITool[],
      body.job_description,
      body.automation_request,
      body.estimated_hours || 4,
      body.clarification_hint  // 명확화 힌트 전달
    )
    
    // AI 엔진 선택 옵션 (기본값: auto)
    const aiEngineOption: AIEngineType = body.ai_engine || 'auto'
    
    // AI 코칭 코멘트 생성
    let aiCoaching: AICoachingResult
    let aiCoachingOpenAI: AICoachingResult | null = null  // 'both' 옵션용
    const geminiApiKey = c.env.GEMINI_API_KEY
    const openaiApiKey = c.env.OPENAI_API_KEY
    
    const taskInfoForAI = {
      name: body.name,
      organization: body.organization,
      department: body.department,
      job_description: body.job_description,
      repeat_cycle: body.repeat_cycle,
      automation_request: body.automation_request,
      estimated_hours: body.estimated_hours || 4,
      current_tools: body.current_tools || null
    }
    
    let aiSource = 'fallback' // 응답 출처 추적
    let engineSelection = null // 자동 선택 정보
    
    // AI 엔진 자동 선택 (auto 모드일 때)
    if (aiEngineOption === 'auto') {
      engineSelection = selectAIEngine(
        recommendation.category,
        recommendation.keywords,
        body.automation_request,
        body.job_description
      )
      console.log(`AI 엔진 자동 선택: ${engineSelection.selected_engine} (신뢰도: ${engineSelection.confidence}%)`)
      console.log(`선택 이유: ${engineSelection.reason}`)
    }
    
    // 실제 사용할 엔진 결정
    const effectiveEngine = aiEngineOption === 'auto' 
      ? engineSelection?.selected_engine || 'gemini'
      : aiEngineOption === 'both' ? 'both' : aiEngineOption
    
    // 'both' 옵션: 두 AI 모두 호출
    if (effectiveEngine === 'both') {
      console.log('=== 두 AI 엔진 모두 호출 (비교 모드) ===')
      
      // Gemini 호출
      if (geminiApiKey) {
        try {
          console.log('Gemini API 호출 중...')
          aiCoaching = await generateAICoaching(geminiApiKey, taskInfoForAI, recommendation)
          aiSource = 'gemini'
          console.log('✓ Gemini API 성공')
        } catch (geminiError) {
          console.error('✗ Gemini API 실패:', geminiError)
          aiCoaching = generateFallbackCoaching(taskInfoForAI, recommendation)
          aiSource = 'fallback_gemini'
        }
      } else {
        aiCoaching = generateFallbackCoaching(taskInfoForAI, recommendation)
        aiSource = 'fallback_gemini'
      }
      
      // OpenAI 호출
      if (openaiApiKey) {
        try {
          console.log('OpenAI API 호출 중...')
          aiCoachingOpenAI = await generateAICoachingWithOpenAI(openaiApiKey, taskInfoForAI, recommendation)
          console.log('✓ OpenAI API 성공')
        } catch (openaiError) {
          console.error('✗ OpenAI API 실패:', openaiError)
          aiCoachingOpenAI = null
        }
      }
    }
    // Gemini 우선 호출
    else if (effectiveEngine === 'gemini') {
      if (geminiApiKey) {
        try {
          console.log('Gemini API 호출 시도...')
          aiCoaching = await generateAICoaching(geminiApiKey, taskInfoForAI, recommendation)
          aiSource = 'gemini'
          console.log('✓ Gemini API 성공')
        } catch (geminiError) {
          console.error('✗ Gemini API 실패:', geminiError)
          // 폴백으로 OpenAI 시도
          if (openaiApiKey) {
            try {
              console.log('폴백: OpenAI API 호출 시도...')
              aiCoaching = await generateAICoachingWithOpenAI(openaiApiKey, taskInfoForAI, recommendation)
              aiSource = 'openai'
              console.log('✓ OpenAI API 성공 (폴백)')
            } catch (openaiError) {
              console.error('✗ OpenAI API 실패:', openaiError)
            }
          }
        }
      } else if (openaiApiKey) {
        // Gemini 키 없으면 OpenAI 시도
        try {
          console.log('Gemini 키 없음, OpenAI API 호출 시도...')
          aiCoaching = await generateAICoachingWithOpenAI(openaiApiKey, taskInfoForAI, recommendation)
          aiSource = 'openai'
          console.log('✓ OpenAI API 성공')
        } catch (openaiError) {
          console.error('✗ OpenAI API 실패:', openaiError)
        }
      }
    }
    // OpenAI 우선 호출
    else if (effectiveEngine === 'openai') {
      if (openaiApiKey) {
        try {
          console.log('OpenAI API 호출 시도...')
          aiCoaching = await generateAICoachingWithOpenAI(openaiApiKey, taskInfoForAI, recommendation)
          aiSource = 'openai'
          console.log('✓ OpenAI API 성공')
        } catch (openaiError) {
          console.error('✗ OpenAI API 실패:', openaiError)
          // 폴백으로 Gemini 시도
          if (geminiApiKey) {
            try {
              console.log('폴백: Gemini API 호출 시도...')
              aiCoaching = await generateAICoaching(geminiApiKey, taskInfoForAI, recommendation)
              aiSource = 'gemini'
              console.log('✓ Gemini API 성공 (폴백)')
            } catch (geminiError) {
              console.error('✗ Gemini API 실패:', geminiError)
            }
          }
        }
      } else if (geminiApiKey) {
        // OpenAI 키 없으면 Gemini 시도
        try {
          console.log('OpenAI 키 없음, Gemini API 호출 시도...')
          aiCoaching = await generateAICoaching(geminiApiKey, taskInfoForAI, recommendation)
          aiSource = 'gemini'
          console.log('✓ Gemini API 성공')
        } catch (geminiError) {
          console.error('✗ Gemini API 실패:', geminiError)
        }
      }
    }
    
    // 모든 API 실패 시 카테고리별 특화 폴백 사용
    if (aiSource === 'fallback') {
      console.log('카테고리별 특화 폴백 템플릿 사용')
      console.log(`자동화 요청사항 기반 카테고리 매칭: "${body.automation_request}" → ${recommendation.category}`)
      aiCoaching = generateFallbackCoaching(taskInfoForAI, recommendation)
    }
    
    const now = Date.now()
    const taskId = generateId()
    
    // 전체 결과 (추천 + AI 코칭 + 엔진 정보)
    // 비교 모드일 경우 comparison 객체에 gemini와 openai 결과 모두 저장
    const comparisonData = (effectiveEngine === 'both' && aiCoaching && aiCoachingOpenAI) ? {
      gemini: {
        summary: aiCoaching.summary,
        workflow: aiCoaching.workflow,
        coaching_tips: aiCoaching.coaching_tips,
        learning_roadmap: aiCoaching.learning_roadmap,
        time_analysis: aiCoaching.time_analysis,
        conclusion: aiCoaching.conclusion
      },
      openai: {
        summary: aiCoachingOpenAI.summary,
        workflow: aiCoachingOpenAI.workflow,
        coaching_tips: aiCoachingOpenAI.coaching_tips,
        learning_roadmap: aiCoachingOpenAI.learning_roadmap,
        time_analysis: aiCoachingOpenAI.time_analysis,
        conclusion: aiCoachingOpenAI.conclusion
      }
    } : null
    
    const fullResult = {
      ...recommendation,
      ai_coaching: aiCoaching,
      ai_engine_info: {
        selected_engine: aiSource,
        engine_option: aiEngineOption,
        auto_selection: engineSelection
      },
      comparison: comparisonData
    }
    
    // 업무 저장
    await c.env.DB.prepare(`
      INSERT INTO tasks (
        id, organization, department, name, job_description, repeat_cycle,
        automation_request, email, current_tools, estimated_hours,
        recommended_tools, task_category, automation_level, status,
        coach_comment_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'analyzed', 'none', ?, ?)
    `).bind(
      taskId,
      body.organization,
      body.department,
      body.name,
      body.job_description,
      body.repeat_cycle,
      body.automation_request,
      body.email,
      body.current_tools || null,
      body.estimated_hours || 4,
      JSON.stringify(fullResult),
      recommendation.category,
      recommendation.automation_level,
      now,
      now
    ).run()
    
    return c.json({ 
      success: true, 
      data: {
        task_id: taskId,
        recommendation: fullResult
      }
    })
  } catch (error: any) {
    console.error('Error creating task:', error)
    return c.json({ success: false, error: 'Failed to create task', details: error?.message || String(error) }, 500)
  }
})

// GET /api/tasks/:id - 특정 업무 조회
app.get('/api/tasks/:id', async (c) => {
  try {
    const taskId = c.req.param('id')
    
    const task = await c.env.DB.prepare(
      'SELECT * FROM tasks WHERE id = ?'
    ).bind(taskId).first<Task>()
    
    if (!task) {
      return c.json({ success: false, error: '업무를 찾을 수 없습니다.' }, 404)
    }
    
    // 코치 코멘트 조회
    const comment = await c.env.DB.prepare(
      'SELECT * FROM comments WHERE task_id = ? AND status = "published"'
    ).bind(taskId).first<Comment>()
    
    const result: TaskWithRecommendation = {
      ...task,
      parsedRecommendation: task.recommended_tools ? JSON.parse(task.recommended_tools) : null,
      comment: comment || undefined
    }
    
    return c.json({ success: true, data: result })
  } catch (error) {
    return c.json({ success: false, error: 'Failed to fetch task' }, 500)
  }
})

// GET /api/tasks - 업무 목록 조회 (이메일 필터, 삭제된 항목 제외)
app.get('/api/tasks', async (c) => {
  try {
    const email = c.req.query('email')
    
    let query = 'SELECT * FROM tasks WHERE deleted_at IS NULL'
    const params: string[] = []
    
    if (email) {
      query += ' AND email = ?'
      params.push(email)
    }
    
    query += ' ORDER BY created_at DESC'
    
    const stmt = c.env.DB.prepare(query)
    const { results } = params.length > 0 
      ? await stmt.bind(...params).all<Task>()
      : await stmt.all<Task>()
    
    return c.json({ success: true, data: results })
  } catch (error) {
    return c.json({ success: false, error: 'Failed to fetch tasks' }, 500)
  }
})

// =============================================
// 코치 대시보드 API (간단 비밀번호 인증)
// =============================================

const COACH_PASSWORD = 'coach2026!' // 실제 운영 시 환경변수로 변경

// POST /api/admin/login - 코치 로그인
app.post('/api/admin/login', async (c) => {
  const { password } = await c.req.json()
  
  if (password === COACH_PASSWORD) {
    return c.json({ success: true, message: '로그인 성공' })
  }
  
  return c.json({ success: false, error: '비밀번호가 일치하지 않습니다.' }, 401)
})

// GET /api/admin/tasks - 모든 업무 조회 (코치용, 삭제된 항목 제외)
app.get('/api/admin/tasks', async (c) => {
  try {
    const status = c.req.query('status')
    
    let query = 'SELECT * FROM tasks WHERE deleted_at IS NULL'
    const params: string[] = []
    
    if (status) {
      query += ' AND status = ?'
      params.push(status)
    }
    
    query += ' ORDER BY created_at DESC'
    
    const stmt = c.env.DB.prepare(query)
    const { results } = params.length > 0 
      ? await stmt.bind(...params).all<Task>()
      : await stmt.all<Task>()
    
    return c.json({ success: true, data: results })
  } catch (error) {
    return c.json({ success: false, error: 'Failed to fetch tasks' }, 500)
  }
})

// POST /api/admin/comments - 코치 코멘트 작성
app.post('/api/admin/comments', async (c) => {
  try {
    const body = await c.req.json()
    const { task_id, additional_tools, tool_explanation, tips, learning_priority, general_comment } = body
    
    if (!task_id) {
      return c.json({ success: false, error: 'task_id is required' }, 400)
    }
    
    const now = Date.now()
    const commentId = generateId()
    
    await c.env.DB.prepare(`
      INSERT INTO comments (
        id, task_id, additional_tools, tool_explanation, tips,
        learning_priority, general_comment, status, coach_name, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'published', '디마불사', ?, ?)
    `).bind(
      commentId,
      task_id,
      additional_tools || null,
      tool_explanation || null,
      tips || null,
      learning_priority || null,
      general_comment || null,
      now,
      now
    ).run()
    
    // 업무 상태 업데이트
    await c.env.DB.prepare(`
      UPDATE tasks SET coach_comment_status = 'published', status = 'commented', updated_at = ?
      WHERE id = ?
    `).bind(now, task_id).run()
    
    return c.json({ success: true, data: { comment_id: commentId } })
  } catch (error) {
    console.error('Error creating comment:', error)
    return c.json({ success: false, error: 'Failed to create comment' }, 500)
  }
})

// =============================================
// Phase 2: 추가 API 엔드포인트
// =============================================

// GET /api/admin/stats - 통계 데이터 (삭제된 항목 제외)
app.get('/api/admin/stats', async (c) => {
  try {
    // 전체 통계 (삭제된 항목 제외)
    const totalResult = await c.env.DB.prepare('SELECT COUNT(*) as count FROM tasks WHERE deleted_at IS NULL').first<{count: number}>();
    const analyzedResult = await c.env.DB.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'analyzed' AND deleted_at IS NULL").first<{count: number}>();
    const commentedResult = await c.env.DB.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'commented' AND deleted_at IS NULL").first<{count: number}>();
    const trashResult = await c.env.DB.prepare('SELECT COUNT(*) as count FROM tasks WHERE deleted_at IS NOT NULL').first<{count: number}>();
    
    // 카테고리별 통계 (삭제된 항목 제외)
    const { results: categoryStats } = await c.env.DB.prepare(`
      SELECT task_category as category, COUNT(*) as count 
      FROM tasks 
      WHERE task_category IS NOT NULL AND deleted_at IS NULL
      GROUP BY task_category 
      ORDER BY count DESC
    `).all();
    
    // 자동화 수준별 통계 (삭제된 항목 제외)
    const { results: automationStats } = await c.env.DB.prepare(`
      SELECT automation_level as level, COUNT(*) as count 
      FROM tasks 
      WHERE automation_level IS NOT NULL AND deleted_at IS NULL
      GROUP BY automation_level
    `).all();
    
    // 부서별 통계 (삭제된 항목 제외)
    const { results: departmentStats } = await c.env.DB.prepare(`
      SELECT department, COUNT(*) as count 
      FROM tasks 
      WHERE deleted_at IS NULL
      GROUP BY department 
      ORDER BY count DESC 
      LIMIT 10
    `).all();
    
    // 최근 7일간 등록 추이 (삭제된 항목 제외)
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const { results: dailyStats } = await c.env.DB.prepare(`
      SELECT 
        DATE(created_at / 1000, 'unixepoch') as date,
        COUNT(*) as count 
      FROM tasks 
      WHERE created_at >= ? AND deleted_at IS NULL
      GROUP BY date 
      ORDER BY date
    `).bind(sevenDaysAgo).all();
    
    return c.json({
      success: true,
      data: {
        total: totalResult?.count || 0,
        analyzed: analyzedResult?.count || 0,
        commented: commentedResult?.count || 0,
        pending: (totalResult?.count || 0) - (commentedResult?.count || 0),
        trash: trashResult?.count || 0,
        categoryStats,
        automationStats,
        departmentStats,
        dailyStats
      }
    });
  } catch (error: any) {
    console.error('Stats error:', error);
    return c.json({ success: false, error: error?.message || 'Failed to fetch stats' }, 500);
  }
});

// GET /api/export/tasks - CSV 내보내기 (삭제된 항목 제외)
app.get('/api/export/tasks', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT 
        t.organization, t.department, t.name, t.email,
        t.job_description, t.repeat_cycle, t.automation_request,
        t.estimated_hours, t.task_category, t.automation_level,
        t.status, t.coach_comment_status,
        DATETIME(t.created_at / 1000, 'unixepoch') as created_date,
        c.general_comment, c.additional_tools, c.tips, c.learning_priority
      FROM tasks t
      LEFT JOIN comments c ON t.id = c.task_id AND c.status = 'published'
      WHERE t.deleted_at IS NULL
      ORDER BY t.created_at DESC
    `).all();
    
    // CSV 헤더
    const headers = [
      '구분/조직', '부서', '성명', '이메일', '하는 일/직무', '반복주기',
      'AI 자동화 요청사항', '예상소요시간', '업무유형', '자동화수준',
      '상태', '코멘트상태', '등록일시', '코치코멘트', '추가추천도구', '팁', '학습우선순위'
    ];
    
    // CSV 데이터 생성
    const csvRows = [headers.join(',')];
    for (const row of results as any[]) {
      const values = [
        row.organization, row.department, row.name, row.email,
        row.job_description, row.repeat_cycle, row.automation_request,
        row.estimated_hours, row.task_category, row.automation_level,
        row.status, row.coach_comment_status, row.created_date,
        row.general_comment || '', row.additional_tools || '', row.tips || '', row.learning_priority || ''
      ].map(v => `"${String(v || '').replace(/"/g, '""')}"`);
      csvRows.push(values.join(','));
    }
    
    const csv = csvRows.join('\n');
    const bom = '\uFEFF'; // UTF-8 BOM for Excel
    
    return new Response(bom + csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="ai_coaching_tasks_${new Date().toISOString().split('T')[0]}.csv"`
      }
    });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Export failed' }, 500);
  }
});

// POST /api/import/tasks - CSV 업로드 (일괄 업무 등록)
app.post('/api/import/tasks', async (c) => {
  try {
    const body = await c.req.json();
    const { tasks: taskList } = body;
    
    if (!Array.isArray(taskList) || taskList.length === 0) {
      return c.json({ success: false, error: 'tasks 배열이 필요합니다.' }, 400);
    }
    
    // AI 도구 목록 조회
    const { results: tools } = await c.env.DB.prepare(
      'SELECT * FROM ai_tools WHERE is_active = 1'
    ).all<AITool>();
    
    const now = Date.now();
    const results: any[] = [];
    let successCount = 0;
    let failCount = 0;
    
    for (const task of taskList) {
      try {
        // 필수 필드 검증
        if (!task.organization || !task.department || !task.name || 
            !task.job_description || !task.repeat_cycle || !task.automation_request || !task.email) {
          results.push({ name: task.name, status: 'failed', error: '필수 필드 누락' });
          failCount++;
          continue;
        }
        
        // AI 추천 생성
        const recommendation = recommendTools(
          tools as AITool[],
          task.job_description,
          task.automation_request,
          task.estimated_hours || 4
        );
        
        const taskId = generateId();
        
        await c.env.DB.prepare(`
          INSERT INTO tasks (
            id, organization, department, name, job_description, repeat_cycle,
            automation_request, email, current_tools, estimated_hours,
            recommended_tools, task_category, automation_level, status,
            coach_comment_status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'analyzed', 'none', ?, ?)
        `).bind(
          taskId,
          task.organization,
          task.department,
          task.name,
          task.job_description,
          task.repeat_cycle,
          task.automation_request,
          task.email,
          task.current_tools || null,
          task.estimated_hours || 4,
          JSON.stringify(recommendation),
          recommendation.category,
          recommendation.automation_level,
          now,
          now
        ).run();
        
        results.push({ name: task.name, status: 'success', task_id: taskId });
        successCount++;
      } catch (err: any) {
        results.push({ name: task.name, status: 'failed', error: err?.message || 'Unknown error' });
        failCount++;
      }
    }
    
    return c.json({
      success: true,
      data: {
        total: taskList.length,
        success: successCount,
        failed: failCount,
        results
      }
    });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Import failed' }, 500);
  }
});

// GET /api/history/:email - 수강생별 이력 조회 (삭제된 항목 제외)
app.get('/api/history/:email', async (c) => {
  try {
    const email = c.req.param('email');
    
    const { results } = await c.env.DB.prepare(`
      SELECT 
        t.*,
        c.general_comment, c.additional_tools, c.tips, c.learning_priority
      FROM tasks t
      LEFT JOIN comments c ON t.id = c.task_id AND c.status = 'published'
      WHERE t.email = ? AND t.deleted_at IS NULL
      ORDER BY t.created_at DESC
    `).bind(email).all();
    
    // 통계 계산
    const stats = {
      totalTasks: results.length,
      commented: results.filter((r: any) => r.coach_comment_status === 'published').length,
      categories: {} as Record<string, number>,
      totalEstimatedHours: 0,
      totalSavedHours: 0
    };
    
    for (const task of results as any[]) {
      // 카테고리 집계
      if (task.task_category) {
        stats.categories[task.task_category] = (stats.categories[task.task_category] || 0) + 1;
      }
      // 시간 집계
      stats.totalEstimatedHours += task.estimated_hours || 0;
      if (task.recommended_tools) {
        try {
          const rec = JSON.parse(task.recommended_tools);
          stats.totalSavedHours += rec.time_saving?.saved_hours || 0;
        } catch {}
      }
    }
    
    return c.json({
      success: true,
      data: {
        email,
        stats,
        tasks: results
      }
    });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Failed to fetch history' }, 500);
  }
});

// POST /api/email/compose - Gmail 작성 URL 생성
app.post('/api/email/compose', async (c) => {
  try {
    const body = await c.req.json();
    const { task_id, type } = body; // type: 'report' | 'comment'
    
    const task = await c.env.DB.prepare(
      'SELECT * FROM tasks WHERE id = ?'
    ).bind(task_id).first<Task>();
    
    if (!task) {
      return c.json({ success: false, error: '업무를 찾을 수 없습니다.' }, 404);
    }
    
    let subject = '';
    let bodyText = '';
    // 동적 URL 생성 (요청의 호스트 사용)
    const host = c.req.header('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const reportUrl = `${protocol}://${host}/report/${task_id}`;
    
    if (type === 'report') {
      subject = `[AI공부방] ${task.name}님의 AI 활용 업무 자동화 진단 보고서`;
      bodyText = `안녕하세요, ${task.name}님!

AI공부방 10기 수강생님의 업무 자동화 진단 보고서가 준비되었습니다.

📋 업무 요약
- 업무: ${task.job_description}
- 반복주기: ${task.repeat_cycle}
- 업무 유형: ${task.task_category || '분석중'}

📊 분석 결과를 확인하려면 아래 링크를 클릭하세요:
${reportUrl}

보고서에서 추천 AI 도구와 예상 시간 절감 효과를 확인하실 수 있습니다.
PDF 다운로드도 가능합니다.

문의사항이 있으시면 언제든 연락주세요.

감사합니다.
디마불사 코치 드림
(디지털 마케팅 프로 컨설턴트, AI 활용 전문코치)`;
    } else if (type === 'comment') {
      // 코치 코멘트 알림
      const comment = await c.env.DB.prepare(
        'SELECT * FROM comments WHERE task_id = ? AND status = "published"'
      ).bind(task_id).first<Comment>();
      
      subject = `[AI공부방] ${task.name}님, 코치 코멘트가 추가되었습니다!`;
      bodyText = `안녕하세요, ${task.name}님!

제출해주신 "${task.job_description}" 업무에 대한 코치 코멘트가 추가되었습니다.

${comment?.general_comment ? `💬 코치 코멘트:\n${comment.general_comment}\n\n` : ''}
${comment?.learning_priority ? `📚 학습 우선순위:\n${comment.learning_priority}\n\n` : ''}
${comment?.tips ? `💡 팁:\n${comment.tips}\n\n` : ''}

전체 보고서 확인하기:
${reportUrl}

AI 도구 활용에 대해 궁금한 점이 있으시면 편하게 질문해주세요!

감사합니다.
디마불사 코치 드림`;
    } else {
      return c.json({ success: false, error: '유효하지 않은 type입니다.' }, 400);
    }
    
    // Gmail Compose URL 생성
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(task.email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;
    
    return c.json({
      success: true,
      data: {
        gmail_url: gmailUrl,
        to: task.email,
        subject,
        body: bodyText
      }
    });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Failed to compose email' }, 500);
  }
});

// =============================================
// 휴지통 API (소프트 삭제, 복원, 영구 삭제)
// =============================================

// DELETE /api/tasks/:id - 소프트 삭제 (휴지통으로 이동)
app.delete('/api/tasks/:id', async (c) => {
  try {
    const taskId = c.req.param('id');
    const now = Date.now();
    
    // 업무가 존재하는지 확인
    const task = await c.env.DB.prepare(
      'SELECT id FROM tasks WHERE id = ? AND deleted_at IS NULL'
    ).bind(taskId).first();
    
    if (!task) {
      return c.json({ success: false, error: '업무를 찾을 수 없습니다.' }, 404);
    }
    
    // deleted_at 설정 (소프트 삭제)
    await c.env.DB.prepare(
      'UPDATE tasks SET deleted_at = ?, updated_at = ? WHERE id = ?'
    ).bind(now, now, taskId).run();
    
    return c.json({ success: true, message: '휴지통으로 이동되었습니다.' });
  } catch (error: any) {
    console.error('Delete error:', error);
    return c.json({ success: false, error: error?.message || 'Failed to delete task' }, 500);
  }
});

// POST /api/tasks/:id/restore - 휴지통에서 복원
app.post('/api/tasks/:id/restore', async (c) => {
  try {
    const taskId = c.req.param('id');
    const now = Date.now();
    
    // 삭제된 업무인지 확인
    const task = await c.env.DB.prepare(
      'SELECT id FROM tasks WHERE id = ? AND deleted_at IS NOT NULL'
    ).bind(taskId).first();
    
    if (!task) {
      return c.json({ success: false, error: '휴지통에서 해당 업무를 찾을 수 없습니다.' }, 404);
    }
    
    // deleted_at NULL로 설정 (복원)
    await c.env.DB.prepare(
      'UPDATE tasks SET deleted_at = NULL, updated_at = ? WHERE id = ?'
    ).bind(now, taskId).run();
    
    return c.json({ success: true, message: '업무가 복원되었습니다.' });
  } catch (error: any) {
    console.error('Restore error:', error);
    return c.json({ success: false, error: error?.message || 'Failed to restore task' }, 500);
  }
});

// DELETE /api/tasks/:id/permanent - 영구 삭제
app.delete('/api/tasks/:id/permanent', async (c) => {
  try {
    const taskId = c.req.param('id');
    
    // 삭제된 업무인지 확인 (휴지통에 있는 것만 영구 삭제 가능)
    const task = await c.env.DB.prepare(
      'SELECT id FROM tasks WHERE id = ? AND deleted_at IS NOT NULL'
    ).bind(taskId).first();
    
    if (!task) {
      return c.json({ success: false, error: '휴지통에서 해당 업무를 찾을 수 없습니다.' }, 404);
    }
    
    // 연관된 코멘트 먼저 삭제
    await c.env.DB.prepare('DELETE FROM comments WHERE task_id = ?').bind(taskId).run();
    
    // 업무 영구 삭제
    await c.env.DB.prepare('DELETE FROM tasks WHERE id = ?').bind(taskId).run();
    
    return c.json({ success: true, message: '영구 삭제되었습니다.' });
  } catch (error: any) {
    console.error('Permanent delete error:', error);
    return c.json({ success: false, error: error?.message || 'Failed to permanently delete task' }, 500);
  }
});

// GET /api/admin/trash - 휴지통 목록 조회
app.get('/api/admin/trash', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT *, 
        CAST((? - deleted_at) / (1000 * 60 * 60 * 24) AS INTEGER) as days_in_trash
      FROM tasks 
      WHERE deleted_at IS NOT NULL 
      ORDER BY deleted_at DESC
    `).bind(Date.now()).all<Task & { days_in_trash: number }>();
    
    return c.json({ 
      success: true, 
      data: results,
      info: {
        total: results.length,
        message: '30일이 지나면 자동으로 영구 삭제됩니다.'
      }
    });
  } catch (error: any) {
    console.error('Trash list error:', error);
    return c.json({ success: false, error: error?.message || 'Failed to fetch trash' }, 500);
  }
});

// POST /api/admin/trash/cleanup - 30일 지난 항목 영구 삭제 (수동/자동 실행)
app.post('/api/admin/trash/cleanup', async (c) => {
  try {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    
    // 30일 지난 항목 조회
    const { results: expiredTasks } = await c.env.DB.prepare(`
      SELECT id FROM tasks WHERE deleted_at IS NOT NULL AND deleted_at < ?
    `).bind(thirtyDaysAgo).all<{ id: string }>();
    
    if (expiredTasks.length === 0) {
      return c.json({ success: true, message: '삭제할 항목이 없습니다.', deleted_count: 0 });
    }
    
    // 연관된 코멘트 삭제
    for (const task of expiredTasks) {
      await c.env.DB.prepare('DELETE FROM comments WHERE task_id = ?').bind(task.id).run();
    }
    
    // 업무 영구 삭제
    const deleteResult = await c.env.DB.prepare(`
      DELETE FROM tasks WHERE deleted_at IS NOT NULL AND deleted_at < ?
    `).bind(thirtyDaysAgo).run();
    
    return c.json({ 
      success: true, 
      message: `${expiredTasks.length}개 항목이 영구 삭제되었습니다.`,
      deleted_count: expiredTasks.length
    });
  } catch (error: any) {
    console.error('Cleanup error:', error);
    return c.json({ success: false, error: error?.message || 'Cleanup failed' }, 500);
  }
});

// =============================================
// HTML 페이지 라우트
// =============================================

// 메인 랜딩 페이지
app.get('/', (c) => {
  return c.html(renderMainPage())
})

// 업무 입력 페이지
app.get('/submit', (c) => {
  return c.html(renderSubmitPage())
})

// 결과/보고서 페이지
app.get('/report/:id', (c) => {
  const taskId = c.req.param('id')
  return c.html(renderReportPage(taskId))
})

// 코치 대시보드 페이지
app.get('/coach', (c) => {
  return c.html(renderCoachPage())
})

// 수강생 히스토리 페이지
app.get('/history', (c) => {
  return c.html(renderHistoryPage())
})

// AI 도구 목록 페이지
app.get('/tools', (c) => {
  return c.html(renderToolsPage())
})

// 404 페이지
app.notFound((c) => {
  return c.html(render404Page(), 404)
})

// 에러 핸들러
app.onError((err, c) => {
  console.error('Server error:', err)
  return c.html(renderErrorPage(err.message), 500)
})

// =============================================
// HTML 템플릿 렌더링 함수
// =============================================

function renderMainPage(): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI 활용 업무 자동화 코칭 가이드 | AI공부방</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://use.fontawesome.com/releases/v6.5.1/css/all.css" integrity="sha384-t1nt8BQoYMLFN5p42tRAtuAAFQaCQODz603XgS9FdHwmkLk5blPpjE7PwJbPtztG" crossorigin="anonymous">
  <style>
    * { font-family: 'Noto Sans KR', sans-serif !important; }
    body { font-family: 'Noto Sans KR', sans-serif !important; font-weight: 500; }
    .gradient-bg {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .card-hover:hover {
      transform: translateY(-5px);
      box-shadow: 0 20px 40px rgba(0,0,0,0.1);
    }
    .feature-icon {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
  </style>
</head>
<body class="bg-gray-50 min-h-screen">
  <!-- 헤더 -->
  <header class="gradient-bg text-white py-20">
    <div class="container mx-auto px-6 text-center">
      <div class="mb-4">
        <span class="bg-white/20 px-4 py-2 rounded-full text-sm font-medium">
          <i class="fas fa-graduation-cap mr-2"></i>AI공부방 10기
        </span>
      </div>
      <h1 class="text-4xl md:text-5xl font-bold mb-6">
        AI 활용 업무 자동화<br>코칭 가이드
      </h1>
      <p class="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
        반복되는 업무를 입력하면 최신 AI 도구와 서비스로<br>
        자동화할 수 있는 방법을 안내해 드립니다
      </p>
      <a href="/submit" class="inline-block bg-white text-purple-700 px-8 py-4 rounded-full text-lg font-semibold hover:bg-gray-100 transition shadow-lg">
        <i class="fas fa-play-circle mr-2"></i>지금 시작하기
      </a>
    </div>
  </header>

  <!-- 특징 섹션 -->
  <section class="py-16 container mx-auto px-6">
    <h2 class="text-3xl font-bold text-center text-gray-800 mb-12">
      <i class="fas fa-star feature-icon mr-2"></i>주요 특징
    </h2>
    <div class="grid md:grid-cols-3 gap-8">
      <div class="bg-white p-8 rounded-2xl shadow-md card-hover transition-all duration-300">
        <div class="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-6">
          <i class="fas fa-robot text-3xl text-purple-600"></i>
        </div>
        <h3 class="text-xl font-bold text-gray-800 mb-4">AI 도구 자동 추천</h3>
        <p class="text-gray-600">
          업무 내용을 분석하여 최적의 AI 도구를 자동으로 추천합니다. 
          Gemini, Make, NotebookLM 등 최신 도구를 포함합니다.
        </p>
      </div>
      <div class="bg-white p-8 rounded-2xl shadow-md card-hover transition-all duration-300">
        <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
          <i class="fas fa-file-pdf text-3xl text-green-600"></i>
        </div>
        <h3 class="text-xl font-bold text-gray-800 mb-4">자가진단 보고서</h3>
        <p class="text-gray-600">
          입력한 업무에 대한 상세 분석 보고서를 PDF로 다운로드할 수 있습니다.
          시간 절감 예측과 도구별 활용법을 제공합니다.
        </p>
      </div>
      <div class="bg-white p-8 rounded-2xl shadow-md card-hover transition-all duration-300">
        <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6">
          <i class="fas fa-user-tie text-3xl text-blue-600"></i>
        </div>
        <h3 class="text-xl font-bold text-gray-800 mb-4">코치 코멘트</h3>
        <p class="text-gray-600">
          디마불사 코치가 직접 추가 조언과 학습 우선순위를 코멘트로 제공합니다.
          맞춤형 가이드를 받아보세요.
        </p>
      </div>
    </div>
  </section>

  <!-- 프로세스 섹션 -->
  <section class="py-16 bg-white">
    <div class="container mx-auto px-6">
      <h2 class="text-3xl font-bold text-center text-gray-800 mb-12">
        <i class="fas fa-tasks feature-icon mr-2"></i>이용 방법
      </h2>
      <div class="flex flex-col md:flex-row justify-center items-start gap-8">
        <div class="flex-1 text-center max-w-xs">
          <div class="w-12 h-12 bg-purple-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">1</div>
          <h4 class="font-bold text-lg mb-2">업무 입력</h4>
          <p class="text-gray-600 text-sm">반복되는 업무 내용과 자동화 요청사항을 입력합니다</p>
        </div>
        <div class="hidden md:block text-4xl text-purple-300 mt-4">→</div>
        <div class="flex-1 text-center max-w-xs">
          <div class="w-12 h-12 bg-purple-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">2</div>
          <h4 class="font-bold text-lg mb-2">AI 분석</h4>
          <p class="text-gray-600 text-sm">시스템이 업무를 분석하고 최적의 AI 도구를 추천합니다</p>
        </div>
        <div class="hidden md:block text-4xl text-purple-300 mt-4">→</div>
        <div class="flex-1 text-center max-w-xs">
          <div class="w-12 h-12 bg-purple-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">3</div>
          <h4 class="font-bold text-lg mb-2">보고서 확인</h4>
          <p class="text-gray-600 text-sm">자가진단 보고서와 코치 코멘트를 확인합니다</p>
        </div>
        <div class="hidden md:block text-4xl text-purple-300 mt-4">→</div>
        <div class="flex-1 text-center max-w-xs">
          <div class="w-12 h-12 bg-purple-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">4</div>
          <h4 class="font-bold text-lg mb-2">PDF 다운로드</h4>
          <p class="text-gray-600 text-sm">보고서를 PDF로 저장하여 활용합니다</p>
        </div>
      </div>
    </div>
  </section>

  <!-- AI 도구 카테고리 -->
  <section class="py-16 container mx-auto px-6">
    <h2 class="text-3xl font-bold text-center text-gray-800 mb-12">
      <i class="fas fa-toolbox feature-icon mr-2"></i>지원하는 AI 도구 카테고리
    </h2>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4" id="category-list">
      <!-- 카테고리가 동적으로 로드됩니다 -->
    </div>
  </section>

  <!-- CTA 섹션 -->
  <section class="gradient-bg text-white py-16">
    <div class="container mx-auto px-6 text-center">
      <h2 class="text-3xl font-bold mb-6">지금 바로 업무 자동화를 시작하세요!</h2>
      <p class="text-white/90 mb-8 max-w-xl mx-auto">
        AI공부방 10기 수강생 여러분, 반복 업무에서 벗어나 더 창의적인 일에 집중하세요.
      </p>
      <div class="flex justify-center gap-4 flex-wrap">
        <a href="/submit" class="inline-block bg-white text-purple-700 px-8 py-4 rounded-full text-lg font-semibold hover:bg-gray-100 transition shadow-lg">
          <i class="fas fa-arrow-right mr-2"></i>업무 입력하기
        </a>
        <a href="/history" class="inline-block bg-white/20 text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-white/30 transition shadow-lg border border-white/30">
          <i class="fas fa-history mr-2"></i>내 이력 조회
        </a>
        <a href="/tools" class="inline-block bg-white/20 text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-white/30 transition shadow-lg border border-white/30">
          <i class="fas fa-toolbox mr-2"></i>AI 도구 보기
        </a>
      </div>
    </div>
  </section>

  <!-- 푸터 -->
  <footer class="bg-gray-800 text-white py-8">
    <div class="container mx-auto px-6 text-center">
      <p class="text-gray-400 mb-2">
        <i class="fas fa-robot mr-2"></i>AI 활용 업무 자동화 코칭 가이드
      </p>
      <p class="text-gray-500 text-sm">
        © 2026 AI공부방 | 코치: 디마불사(디지털 마케팅 프로 컨설턴트)
      </p>
    </div>
  </footer>

  <script>
    // 카테고리 로드
    async function loadCategories() {
      try {
        const response = await fetch('/api/tools/categories');
        const result = await response.json();
        
        if (result.success && result.data) {
          const container = document.getElementById('category-list');
          const icons = {
            '문서작성': 'fa-file-alt',
            '데이터분석': 'fa-chart-bar',
            '마케팅': 'fa-bullhorn',
            '업무자동화': 'fa-cogs',
            '일정관리': 'fa-calendar-alt',
            '회의': 'fa-users',
            '이미지생성': 'fa-image',
            '영상생성': 'fa-video',
            '고객서비스': 'fa-headset',
            '개발': 'fa-code',
            '리서치': 'fa-search'
          };
          
          container.innerHTML = result.data.map(cat => \`
            <div class="bg-white p-4 rounded-xl shadow-sm text-center hover:shadow-md transition">
              <i class="fas \${icons[cat.category] || 'fa-tools'} text-2xl text-purple-600 mb-2"></i>
              <p class="font-medium text-gray-800">\${cat.category}</p>
              <p class="text-sm text-gray-500">\${cat.count}개 도구</p>
            </div>
          \`).join('');
        }
      } catch (error) {
        console.error('Failed to load categories:', error);
      }
    }
    
    loadCategories();
  </script>
</body>
</html>`
}

function renderSubmitPage(): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>업무 입력 | AI 활용 코칭 가이드</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://use.fontawesome.com/releases/v6.5.1/css/all.css" integrity="sha384-t1nt8BQoYMLFN5p42tRAtuAAFQaCQODz603XgS9FdHwmkLk5blPpjE7PwJbPtztG" crossorigin="anonymous">
  <style>
    * { font-family: 'Noto Sans KR', sans-serif !important; }
    body { font-family: 'Noto Sans KR', sans-serif !important; font-weight: 500; }
    .gradient-bg {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
  </style>
</head>
<body class="bg-gray-50 min-h-screen">
  <!-- 헤더 -->
  <header class="gradient-bg text-white py-8">
    <div class="container mx-auto px-6">
      <a href="/" class="text-white/80 hover:text-white mb-4 inline-block">
        <i class="fas fa-arrow-left mr-2"></i>홈으로
      </a>
      <h1 class="text-3xl font-bold">
        <i class="fas fa-edit mr-2"></i>업무 입력
      </h1>
      <p class="text-white/80 mt-2">반복되는 업무 내용을 입력하면 AI 도구를 추천해 드립니다</p>
    </div>
  </header>

  <!-- 폼 섹션 -->
  <main class="container mx-auto px-6 py-8">
    <div class="max-w-2xl mx-auto">
      <form id="task-form" class="bg-white rounded-2xl shadow-lg p-8">
        <!-- 기본 정보 -->
        <div class="mb-8">
          <h2 class="text-xl font-bold text-gray-800 mb-4 pb-2 border-b">
            <i class="fas fa-user text-purple-600 mr-2"></i>기본 정보
          </h2>
          <div class="grid md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                구분/조직 <span class="text-red-500">*</span>
              </label>
              <input type="text" name="organization" required
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="예: 기획안 작성, 마케팅, 개발">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                부서 <span class="text-red-500">*</span>
              </label>
              <input type="text" name="department" required
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="예: 마케팅팀, 개발팀">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                성명 <span class="text-red-500">*</span>
              </label>
              <input type="text" name="name" required
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="이름을 입력하세요">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                이메일 <span class="text-red-500">*</span>
              </label>
              <input type="email" name="email" required
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="example@email.com">
            </div>
          </div>
        </div>

        <!-- 업무 정보 -->
        <div class="mb-8">
          <h2 class="text-xl font-bold text-gray-800 mb-4 pb-2 border-b">
            <i class="fas fa-briefcase text-purple-600 mr-2"></i>업무 정보
          </h2>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                하는 일 / 직무 <span class="text-red-500">*</span>
              </label>
              <textarea name="job_description" required rows="3"
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="예: 2026년 1월달 SNS 게시물 운영계획 수립"></textarea>
            </div>
            <div class="grid md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  반복주기 <span class="text-red-500">*</span>
                </label>
                <select name="repeat_cycle" required
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                  <option value="">선택하세요</option>
                  <option value="매일">매일</option>
                  <option value="주 1회">주 1회</option>
                  <option value="주 2-3회">주 2-3회</option>
                  <option value="월 1회">월 1회</option>
                  <option value="월 2-4회">월 2-4회</option>
                  <option value="분기 1회">분기 1회</option>
                  <option value="비정기">비정기</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  예상 소요시간 (시간)
                </label>
                <input type="number" name="estimated_hours" min="0.5" max="40" step="0.5" value="1"
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="예: 4">
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                AI 자동화 요청사항 <span class="text-red-500">*</span>
              </label>
              <textarea name="automation_request" id="automation_request" required rows="4"
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="예: 전월 성과 모니터링 후 개선점 도출하여 차기 월에 게시물 운영 계획 수립을 템플릿으로 자동화하고 싶음"></textarea>
              <button type="button" id="check-clarity-btn"
                class="mt-2 text-sm text-purple-600 hover:text-purple-800 underline">
                <i class="fas fa-question-circle mr-1"></i>요청사항이 잘 이해될지 확인하기
              </button>
            </div>
            
            <!-- 명확화 질문 섹션 (동적으로 표시) -->
            <div id="clarification-section" class="hidden">
              <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div class="flex items-start mb-3">
                  <i class="fas fa-lightbulb text-yellow-500 mt-1 mr-2"></i>
                  <div>
                    <p class="font-medium text-yellow-800">더 정확한 분석을 위해 추가 정보가 필요합니다</p>
                    <p class="text-sm text-yellow-700 mt-1" id="ambiguity-info"></p>
                  </div>
                </div>
                <div id="clarification-questions" class="space-y-4">
                  <!-- 질문들이 동적으로 추가됩니다 -->
                </div>
                <div class="mt-4 flex gap-2">
                  <button type="button" id="skip-clarification-btn"
                    class="text-sm text-gray-500 hover:text-gray-700">
                    <i class="fas fa-forward mr-1"></i>건너뛰고 분석하기
                  </button>
                </div>
              </div>
            </div>
            
            <!-- 선택된 명확화 표시 -->
            <div id="selected-clarification" class="hidden">
              <div class="bg-green-50 border border-green-200 rounded-lg p-3">
                <div class="flex items-center justify-between">
                  <div class="flex items-center">
                    <i class="fas fa-check-circle text-green-500 mr-2"></i>
                    <span class="text-green-800 text-sm" id="selected-clarification-text"></span>
                  </div>
                  <button type="button" id="reset-clarification-btn" class="text-sm text-green-600 hover:text-green-800">
                    <i class="fas fa-redo mr-1"></i>다시 선택
                  </button>
                </div>
              </div>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                현재 사용 중인 도구 (선택)
              </label>
              <input type="text" name="current_tools"
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="예: Excel, Notion, Canva">
            </div>
          </div>
        </div>

        <!-- AI 엔진 선택 -->
        <div class="mb-8">
          <h2 class="text-xl font-bold text-gray-800 mb-4 pb-2 border-b">
            <i class="fas fa-brain text-purple-600 mr-2"></i>AI 코칭 엔진 선택
          </h2>
          <p class="text-sm text-gray-600 mb-4">분석에 사용할 AI 엔진을 선택하세요. 자동 선택 시 요청 내용에 맞는 최적의 엔진을 선택합니다.</p>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label class="flex items-start p-4 border-2 border-purple-500 bg-purple-50 rounded-lg cursor-pointer hover:bg-purple-100 transition ai-engine-option">
              <input type="radio" name="ai_engine" value="auto" checked class="mt-1 mr-3 text-purple-600">
              <div>
                <span class="font-medium text-gray-800">
                  <i class="fas fa-magic text-purple-500 mr-1"></i>자동 선택 (추천)
                </span>
                <p class="text-xs text-gray-500 mt-1">요청 내용을 분석하여 최적의 AI 엔진을 자동으로 선택합니다</p>
              </div>
            </label>
            
            <label class="flex items-start p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition ai-engine-option">
              <input type="radio" name="ai_engine" value="gemini" class="mt-1 mr-3 text-purple-600">
              <div>
                <span class="font-medium text-gray-800">
                  <i class="fas fa-star text-blue-500 mr-1"></i>Gemini 2.5 Flash
                </span>
                <p class="text-xs text-gray-500 mt-1">창의적인 콘텐츠, 마케팅, 아이디어 발굴에 강점</p>
              </div>
            </label>
            
            <label class="flex items-start p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition ai-engine-option">
              <input type="radio" name="ai_engine" value="openai" class="mt-1 mr-3 text-purple-600">
              <div>
                <span class="font-medium text-gray-800">
                  <i class="fas fa-robot text-green-500 mr-1"></i>ChatGPT (GPT-4o-mini)
                </span>
                <p class="text-xs text-gray-500 mt-1">기술적 분석, 데이터 처리, 구조화된 워크플로우에 강점</p>
              </div>
            </label>
            
            <label class="flex items-start p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition ai-engine-option">
              <input type="radio" name="ai_engine" value="both" class="mt-1 mr-3 text-purple-600">
              <div>
                <span class="font-medium text-gray-800">
                  <i class="fas fa-balance-scale text-orange-500 mr-1"></i>둘 다 비교
                </span>
                <p class="text-xs text-gray-500 mt-1">두 AI의 응답을 모두 받아 비교합니다 (시간이 더 걸립니다)</p>
              </div>
            </label>
          </div>
        </div>

        <!-- 제출 버튼 -->
        <div class="flex justify-center gap-4">
          <button type="button" onclick="window.location.href='/'"
            class="px-8 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition">
            <i class="fas fa-times mr-2"></i>취소
          </button>
          <button type="submit" id="submit-btn"
            class="px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold">
            <i class="fas fa-paper-plane mr-2"></i>분석 요청
          </button>
        </div>
      </form>

      <!-- 로딩 모달 -->
      <div id="loading-modal" class="hidden fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div class="bg-white rounded-2xl p-8 text-center max-w-sm mx-4">
          <div class="animate-spin rounded-full h-16 w-16 border-4 border-purple-600 border-t-transparent mx-auto mb-4"></div>
          <h3 class="text-xl font-bold text-gray-800 mb-2">분석 중...</h3>
          <p class="text-gray-600">AI가 업무를 분석하고 최적의 도구를 추천하고 있습니다</p>
        </div>
      </div>
    </div>
  </main>

  <script>
    const form = document.getElementById('task-form');
    const submitBtn = document.getElementById('submit-btn');
    const loadingModal = document.getElementById('loading-modal');
    const checkClarityBtn = document.getElementById('check-clarity-btn');
    const clarificationSection = document.getElementById('clarification-section');
    const clarificationQuestions = document.getElementById('clarification-questions');
    const ambiguityInfo = document.getElementById('ambiguity-info');
    const selectedClarification = document.getElementById('selected-clarification');
    const selectedClarificationText = document.getElementById('selected-clarification-text');
    const skipClarificationBtn = document.getElementById('skip-clarification-btn');
    const resetClarificationBtn = document.getElementById('reset-clarification-btn');
    const automationRequestField = document.getElementById('automation_request');
    
    // 선택된 명확화 옵션 저장
    let selectedOption = null;
    let enhancedData = null;
    
    // 명확화 확인 버튼 클릭
    checkClarityBtn.addEventListener('click', async () => {
      const jobDesc = form.querySelector('[name="job_description"]').value;
      const autoReq = automationRequestField.value;
      
      if (!jobDesc || !autoReq) {
        alert('업무 설명과 자동화 요청사항을 먼저 입력해주세요.');
        return;
      }
      
      checkClarityBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>분석 중...';
      checkClarityBtn.disabled = true;
      
      try {
        const response = await fetch('/api/clarify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            job_description: jobDesc,
            automation_request: autoReq
          })
        });
        
        const result = await response.json();
        
        if (result.success && result.data.needs_clarification) {
          showClarificationQuestions(result.data);
        } else {
          // 명확화 불필요
          clarificationSection.classList.add('hidden');
          selectedClarification.classList.add('hidden');
          alert('요청사항이 명확합니다! 바로 분석 요청하세요.');
        }
      } catch (error) {
        console.error('Clarification error:', error);
        alert('분석 중 오류가 발생했습니다.');
      } finally {
        checkClarityBtn.innerHTML = '<i class="fas fa-question-circle mr-1"></i>요청사항이 잘 이해될지 확인하기';
        checkClarityBtn.disabled = false;
      }
    });
    
    // 명확화 질문 표시
    function showClarificationQuestions(data) {
      clarificationSection.classList.remove('hidden');
      selectedClarification.classList.add('hidden');
      ambiguityInfo.textContent = '모호성 점수: ' + data.ambiguity_score + '점 / 감지된 모호성: ' + data.detected_ambiguities.join(', ');
      
      clarificationQuestions.innerHTML = data.questions.map((q, qIdx) => {
        return '<div class="bg-white rounded-lg p-4 border border-yellow-100">' +
          '<p class="font-medium text-gray-800 mb-3"><i class="fas fa-question-circle text-purple-500 mr-2"></i>' + q.question + '</p>' +
          '<div class="grid grid-cols-1 gap-2">' +
          q.options.map((opt, optIdx) => {
            return '<button type="button" ' +
              'class="clarification-option text-left p-3 border border-gray-200 rounded-lg hover:bg-purple-50 hover:border-purple-300 transition text-sm" ' +
              'data-question-id="' + q.id + '" ' +
              'data-option-id="' + opt.id + '" ' +
              'data-option=\\'' + JSON.stringify(opt).replace(/'/g, "\\\\'") + '\\'>' +
              '<i class="fas fa-circle text-gray-300 mr-2"></i>' + opt.label +
              '</button>';
          }).join('') +
          '</div>' +
          '</div>';
      }).join('');
      
      // 옵션 클릭 이벤트 바인딩
      document.querySelectorAll('.clarification-option').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const optionData = JSON.parse(btn.dataset.option);
          await applyClarificationChoice(optionData);
        });
      });
    }
    
    // 명확화 선택 적용
    async function applyClarificationChoice(option) {
      try {
        const response = await fetch('/api/clarify/apply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            job_description: form.querySelector('[name="job_description"]').value,
            automation_request: automationRequestField.value,
            selected_option: option
          })
        });
        
        const result = await response.json();
        
        if (result.success) {
          selectedOption = option;
          enhancedData = result.data;
          
          // UI 업데이트
          clarificationSection.classList.add('hidden');
          selectedClarification.classList.remove('hidden');
          selectedClarificationText.textContent = option.label;
        }
      } catch (error) {
        console.error('Apply clarification error:', error);
      }
    }
    
    // 건너뛰기 버튼
    skipClarificationBtn.addEventListener('click', () => {
      clarificationSection.classList.add('hidden');
      selectedOption = null;
      enhancedData = null;
    });
    
    // 다시 선택 버튼
    resetClarificationBtn.addEventListener('click', () => {
      selectedClarification.classList.add('hidden');
      selectedOption = null;
      enhancedData = null;
      checkClarityBtn.click(); // 다시 명확화 분석 실행
    });
    
    // AI 엔진 선택 라디오 버튼 스타일링
    const engineOptions = document.querySelectorAll('.ai-engine-option');
    engineOptions.forEach(option => {
      const radio = option.querySelector('input[type="radio"]');
      radio.addEventListener('change', () => {
        engineOptions.forEach(opt => {
          opt.classList.remove('border-purple-500', 'bg-purple-50', 'border-2');
          opt.classList.add('border-gray-200', 'border');
        });
        if (radio.checked) {
          option.classList.remove('border-gray-200', 'border');
          option.classList.add('border-purple-500', 'bg-purple-50', 'border-2');
        }
      });
    });
    
    // 폼 제출
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(form);
      
      // AI 엔진 선택 값 가져오기
      const aiEngine = formData.get('ai_engine') || 'auto';
      
      let data = {
        organization: formData.get('organization'),
        department: formData.get('department'),
        name: formData.get('name'),
        email: formData.get('email'),
        job_description: formData.get('job_description'),
        repeat_cycle: formData.get('repeat_cycle'),
        automation_request: formData.get('automation_request'),
        current_tools: formData.get('current_tools') || '',
        estimated_hours: parseFloat(formData.get('estimated_hours')) || 1,
        ai_engine: aiEngine  // AI 엔진 선택 추가
      };
      
      // 명확화 선택이 있으면 적용 (향상된 요청사항 + 추천 엔진 힌트)
      if (enhancedData) {
        data.automation_request = enhancedData.enhanced_automation_request;
        
        // clarification_hint 객체 추가 (추천 엔진에 전달)
        data.clarification_hint = {
          category_hint: enhancedData.suggested_category,
          additional_keywords: enhancedData.additional_keywords || []
        };
        
        console.log('명확화 힌트 전달:', data.clarification_hint);
      }
      
      // 유효성 검사
      if (!data.organization || !data.department || !data.name || !data.email ||
          !data.job_description || !data.repeat_cycle || !data.automation_request) {
        alert('필수 항목을 모두 입력해주세요.');
        return;
      }
      
      // "둘 다 비교" 선택 시 로딩 메시지 변경
      const loadingText = document.querySelector('#loading-modal p');
      if (aiEngine === 'both') {
        loadingText.textContent = '두 AI 엔진으로 분석 중입니다. 잠시만 기다려주세요...';
      } else {
        loadingText.textContent = 'AI가 업무를 분석하고 최적의 도구를 추천하고 있습니다';
      }
      
      loadingModal.classList.remove('hidden');
      submitBtn.disabled = true;
      
      try {
        const response = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
          window.location.href = '/report/' + result.data.task_id;
        } else {
          throw new Error(result.error || '분석에 실패했습니다.');
        }
      } catch (error) {
        alert(error.message);
        loadingModal.classList.add('hidden');
        submitBtn.disabled = false;
      }
    });
  </script>
</body>
</html>`
}

function renderReportPage(taskId: string): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI 활용 업무 자동화 진단 보고서</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://use.fontawesome.com/releases/v6.5.1/css/all.css" integrity="sha384-t1nt8BQoYMLFN5p42tRAtuAAFQaCQODz603XgS9FdHwmkLk5blPpjE7PwJbPtztG" crossorigin="anonymous">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
  <style>
    * { font-family: 'Noto Sans KR', sans-serif !important; }
    body { font-family: 'Noto Sans KR', sans-serif !important; font-weight: 500; }
    .gradient-bg {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    @media print {
      .no-print { display: none !important; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .print-break { page-break-before: always; }
    }
    /* 비교 모드 스타일 */
    .comparison-workflow-step {
      background: white;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 12px;
      border-left: 4px solid;
    }
    .gemini-step { border-left-color: #7c3aed; }
    .openai-step { border-left-color: #059669; }
    .comparison-highlight {
      animation: highlight-pulse 2s ease-in-out;
    }
    @keyframes highlight-pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(124, 58, 237, 0); }
      50% { box-shadow: 0 0 0 8px rgba(124, 58, 237, 0.2); }
    }
    /* 모바일 탭 전환 */
    @media (max-width: 767px) {
      #gemini-panel.hidden-mobile, #openai-panel.hidden-mobile {
        display: none !important;
      }
    }
  </style>
</head>
<body class="bg-gray-50 min-h-screen">
  <!-- 로딩 -->
  <div id="loading" class="fixed inset-0 bg-white flex items-center justify-center z-50">
    <div class="text-center">
      <div class="animate-spin rounded-full h-16 w-16 border-4 border-purple-600 border-t-transparent mx-auto mb-4"></div>
      <p class="text-gray-600">보고서를 불러오는 중...</p>
    </div>
  </div>

  <!-- 액션 버튼 (상단 고정) -->
  <div class="no-print fixed top-4 right-4 z-40 flex gap-2 flex-wrap justify-end">
    <button onclick="downloadPDF()" class="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition shadow-lg">
      <i class="fas fa-file-pdf mr-2"></i>PDF
    </button>
    <button onclick="shareReport()" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow-lg">
      <i class="fas fa-share-alt mr-2"></i>공유
    </button>
    <a href="/" class="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition shadow-lg inline-block">
      <i class="fas fa-home mr-2"></i>홈
    </a>
  </div>

  <!-- 보고서 컨테이너 -->
  <div id="report-container" class="container mx-auto px-6 py-8 max-w-4xl">
    <!-- 보고서 헤더 -->
    <div id="report-header" class="bg-white rounded-2xl shadow-lg p-8 mb-6">
      <div class="text-center">
        <div class="inline-block bg-purple-100 text-purple-700 px-4 py-1 rounded-full text-sm font-medium mb-4">
          AI공부방 10기 | 자가진단 보고서
        </div>
        <h1 class="text-3xl font-bold text-gray-800 mb-2">
          <i class="fas fa-robot text-purple-600 mr-2"></i>AI 활용 업무 자동화 진단 보고서
        </h1>
        <p class="text-gray-500" id="report-meta"></p>
      </div>
    </div>

    <!-- 업무 요약 -->
    <div class="bg-white rounded-2xl shadow-lg p-8 mb-6">
      <h2 class="text-xl font-bold text-gray-800 mb-6 pb-2 border-b border-gray-200">
        <i class="fas fa-clipboard-list text-purple-600 mr-2"></i>업무 요약
      </h2>
      <div class="grid md:grid-cols-2 gap-6" id="task-summary">
        <!-- 동적 로드 -->
      </div>
    </div>

    <!-- 분석 결과 -->
    <div class="bg-white rounded-2xl shadow-lg p-8 mb-6">
      <h2 class="text-xl font-bold text-gray-800 mb-6 pb-2 border-b border-gray-200">
        <i class="fas fa-chart-pie text-green-600 mr-2"></i>분석 결과
      </h2>
      <div class="grid md:grid-cols-3 gap-6" id="analysis-result">
        <!-- 동적 로드 -->
      </div>
    </div>

    <!-- 추천 AI 도구 TOP 5 -->
    <div class="bg-white rounded-2xl shadow-lg p-8 mb-6">
      <h2 class="text-xl font-bold text-gray-800 mb-6 pb-2 border-b border-gray-200">
        <i class="fas fa-tools text-blue-600 mr-2"></i>추천 AI 도구 TOP 5
        <span class="relative inline-block ml-2 group cursor-help">
          <i class="fas fa-info-circle text-gray-400 text-sm hover:text-purple-600 transition"></i>
          <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-4 py-3 bg-gray-800 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 w-72 z-50">
            <div class="font-bold mb-2 text-purple-300">추천 점수 안내</div>
            <ul class="space-y-1 text-gray-200">
              <li>• <strong>100점 만점</strong> 기준으로 산정</li>
              <li>• 업무 키워드 일치도 (40%)</li>
              <li>• 도구 평점 및 인기도 (30%)</li>
              <li>• 사용 난이도/접근성 (20%)</li>
              <li>• 가격 접근성 (10%)</li>
            </ul>
            <div class="mt-2 pt-2 border-t border-gray-600 text-gray-300">점수가 높을수록 업무에 적합합니다.</div>
            <div class="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-8 border-transparent border-t-gray-800"></div>
          </div>
        </span>
      </h2>
      <div id="recommended-tools" class="space-y-4">
        <!-- 동적 로드 -->
      </div>
    </div>

    <!-- AI 엔진 비교 섹션 (둘 다 비교 모드일 때만 표시) -->
    <div id="comparison-section" class="hidden mb-6">
      <!-- 엔진 선택 탭 (모바일) -->
      <div id="comparison-tabs" class="md:hidden bg-white rounded-xl shadow-lg p-2 mb-4 flex">
        <button id="tab-gemini" onclick="switchComparisonTab('gemini')" class="flex-1 py-3 px-4 rounded-lg font-medium transition bg-purple-600 text-white">
          <i class="fas fa-gem mr-1"></i>Gemini
        </button>
        <button id="tab-openai" onclick="switchComparisonTab('openai')" class="flex-1 py-3 px-4 rounded-lg font-medium transition bg-gray-100 text-gray-600">
          <i class="fas fa-robot mr-1"></i>ChatGPT
        </button>
      </div>
      
      <!-- 좌우 비교 레이아웃 (데스크톱) -->
      <div class="grid md:grid-cols-2 gap-4">
        <!-- Gemini 결과 -->
        <div id="gemini-panel" class="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl shadow-lg p-6 border-2 border-purple-200">
          <div class="flex items-center gap-2 mb-4 pb-3 border-b border-purple-200">
            <div class="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
              <i class="fas fa-gem text-white"></i>
            </div>
            <div>
              <h3 class="font-bold text-purple-800">Google Gemini</h3>
              <p class="text-xs text-purple-600">창의적 · 다양한 아이디어</p>
            </div>
          </div>
          <div id="gemini-content">
            <p class="text-gray-500">Gemini 결과 로딩 중...</p>
          </div>
        </div>
        
        <!-- OpenAI 결과 -->
        <div id="openai-panel" class="bg-gradient-to-br from-green-50 to-teal-50 rounded-2xl shadow-lg p-6 border-2 border-green-200">
          <div class="flex items-center gap-2 mb-4 pb-3 border-b border-green-200">
            <div class="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
              <i class="fas fa-robot text-white"></i>
            </div>
            <div>
              <h3 class="font-bold text-green-800">ChatGPT (GPT-4o-mini)</h3>
              <p class="text-xs text-green-600">논리적 · 구조화된 분석</p>
            </div>
          </div>
          <div id="openai-content">
            <p class="text-gray-500">ChatGPT 결과 로딩 중...</p>
          </div>
        </div>
      </div>
      
      <!-- 비교 요약 -->
      <div id="comparison-summary" class="bg-white rounded-2xl shadow-lg p-6 mt-4">
        <h3 class="text-lg font-bold text-gray-800 mb-4">
          <i class="fas fa-balance-scale text-blue-600 mr-2"></i>비교 요약
        </h3>
        <div id="comparison-summary-content" class="grid md:grid-cols-3 gap-4">
          <p class="text-gray-500">비교 분석 중...</p>
        </div>
      </div>
    </div>
    
    <!-- AI 코칭 분석 요약 (단일 엔진 모드) -->
    <div class="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl shadow-lg p-8 mb-6" id="ai-coaching-summary">
      <h2 class="text-xl font-bold text-gray-800 mb-6 pb-2 border-b border-purple-200">
        <i class="fas fa-robot text-purple-600 mr-2"></i>AI 코칭 분석
        <span id="ai-engine-badge" class="ml-2 text-sm font-normal px-3 py-1 rounded-full bg-purple-100 text-purple-700"></span>
      </h2>
      <div id="coaching-summary-content">
        <p class="text-gray-500">분석 중...</p>
      </div>
    </div>

    <!-- 단계별 워크플로우 -->
    <div class="bg-white rounded-2xl shadow-lg p-8 mb-6" id="workflow-section">
      <h2 class="text-xl font-bold text-gray-800 mb-6 pb-2 border-b border-gray-200">
        <i class="fas fa-tasks text-green-600 mr-2"></i>단계별 실행 워크플로우
      </h2>
      <div id="workflow-content" class="space-y-6">
        <p class="text-gray-500">워크플로우 로딩 중...</p>
      </div>
    </div>

    <!-- 시간 분석 -->
    <div class="bg-white rounded-2xl shadow-lg p-8 mb-6" id="time-analysis-section">
      <h2 class="text-xl font-bold text-gray-800 mb-6 pb-2 border-b border-gray-200">
        <i class="fas fa-clock text-blue-600 mr-2"></i>시간 절감 분석
      </h2>
      <div id="time-analysis-content" class="grid md:grid-cols-3 gap-6">
        <p class="text-gray-500">분석 중...</p>
      </div>
    </div>

    <!-- 학습 로드맵 -->
    <div class="bg-white rounded-2xl shadow-lg p-8 mb-6" id="learning-roadmap-section">
      <h2 class="text-xl font-bold text-gray-800 mb-6 pb-2 border-b border-gray-200">
        <i class="fas fa-graduation-cap text-orange-600 mr-2"></i>학습 로드맵
      </h2>
      <div id="learning-roadmap-content" class="space-y-4">
        <p class="text-gray-500">로드맵 로딩 중...</p>
      </div>
    </div>

    <!-- 코칭 팁 & 종합 의견 -->
    <div class="bg-gradient-to-br from-green-50 to-blue-50 rounded-2xl shadow-lg p-8 mb-6" id="coaching-tips-section">
      <h2 class="text-xl font-bold text-gray-800 mb-6 pb-2 border-b border-green-200">
        <i class="fas fa-lightbulb text-yellow-600 mr-2"></i>코칭 팁 & 종합 의견
      </h2>
      <div id="coaching-tips-content">
        <p class="text-gray-500">로딩 중...</p>
      </div>
    </div>

    <!-- 푸터 -->
    <div class="text-center text-gray-500 text-sm py-4">
      <p>© 2026 AI공부방 | 코치: 디마불사(디지털 마케팅 프로 컨설턴트)</p>
      <p class="mt-1">본 보고서는 참고용이며, 실제 적용 시 상황에 맞게 조정이 필요할 수 있습니다.</p>
    </div>
  </div>

  <script>
    const taskId = '${taskId}';
    let taskData = null;
    let currentComparisonTab = 'gemini';
    
    // 데이터 로드
    async function loadReport() {
      try {
        const response = await fetch('/api/tasks/' + taskId);
        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || '보고서를 찾을 수 없습니다.');
        }
        
        taskData = result.data;
        renderReport(taskData);
        document.getElementById('loading').style.display = 'none';
      } catch (error) {
        document.getElementById('loading').innerHTML = 
          '<div class="text-center"><i class="fas fa-exclamation-circle text-red-500 text-4xl mb-4"></i><p class="text-gray-600">' + error.message + '</p><a href="/" class="text-purple-600 mt-4 inline-block">홈으로 돌아가기</a></div>';
      }
    }
    
    // 모바일 탭 전환
    function switchComparisonTab(engine) {
      currentComparisonTab = engine;
      const geminiPanel = document.getElementById('gemini-panel');
      const openaiPanel = document.getElementById('openai-panel');
      const tabGemini = document.getElementById('tab-gemini');
      const tabOpenai = document.getElementById('tab-openai');
      
      if (engine === 'gemini') {
        geminiPanel.classList.remove('hidden-mobile');
        openaiPanel.classList.add('hidden-mobile');
        tabGemini.className = 'flex-1 py-3 px-4 rounded-lg font-medium transition bg-purple-600 text-white';
        tabOpenai.className = 'flex-1 py-3 px-4 rounded-lg font-medium transition bg-gray-100 text-gray-600';
      } else {
        geminiPanel.classList.add('hidden-mobile');
        openaiPanel.classList.remove('hidden-mobile');
        tabGemini.className = 'flex-1 py-3 px-4 rounded-lg font-medium transition bg-gray-100 text-gray-600';
        tabOpenai.className = 'flex-1 py-3 px-4 rounded-lg font-medium transition bg-green-600 text-white';
      }
    }
    
    // 워크플로우 HTML 생성 (비교용)
    function renderComparisonWorkflow(workflow, engineType) {
      if (!workflow || workflow.length === 0) return '<p class="text-gray-500">워크플로우 없음</p>';
      
      const stepClass = engineType === 'gemini' ? 'gemini-step' : 'openai-step';
      const borderColor = engineType === 'gemini' ? 'purple' : 'green';
      
      return workflow.map((step, idx) => \`
        <div class="comparison-workflow-step \${stepClass}">
          <div class="flex items-center gap-2 mb-2">
            <span class="w-7 h-7 bg-\${borderColor}-600 text-white rounded-full flex items-center justify-center text-sm font-bold">\${step.step_number || idx + 1}</span>
            <h4 class="font-bold text-gray-800 text-sm">\${step.title}</h4>
          </div>
          <div class="text-xs text-gray-600 space-y-1">
            <p><i class="fas fa-tools text-\${borderColor}-500 mr-1"></i>\${step.tool_name}</p>
            <p><i class="fas fa-clock text-\${borderColor}-500 mr-1"></i>\${step.time_estimate}</p>
            <p class="text-gray-700">\${step.specific_feature}</p>
          </div>
        </div>
      \`).join('');
    }
    
    // 비교 모드 렌더링
    function renderComparisonMode(recommendation) {
      const comparison = recommendation.comparison;
      if (!comparison || !comparison.gemini || !comparison.openai) return;
      
      const gemini = comparison.gemini;
      const openai = comparison.openai;
      
      // 비교 섹션 표시
      document.getElementById('comparison-section').classList.remove('hidden');
      document.getElementById('ai-coaching-summary').classList.add('hidden');
      document.getElementById('workflow-section').classList.add('hidden');
      
      // Gemini 패널
      document.getElementById('gemini-content').innerHTML = \`
        <div class="mb-4">
          <h4 class="text-sm font-bold text-purple-700 mb-2"><i class="fas fa-lightbulb mr-1"></i>분석 요약</h4>
          <p class="text-sm text-gray-700 bg-white p-3 rounded-lg">\${gemini.summary || '요약 없음'}</p>
        </div>
        <div class="mb-4">
          <h4 class="text-sm font-bold text-purple-700 mb-2"><i class="fas fa-tasks mr-1"></i>워크플로우 (\${gemini.workflow?.length || 0}단계)</h4>
          <div class="max-h-64 overflow-y-auto">
            \${renderComparisonWorkflow(gemini.workflow, 'gemini')}
          </div>
        </div>
        <div class="mb-4">
          <h4 class="text-sm font-bold text-purple-700 mb-2"><i class="fas fa-clock mr-1"></i>시간 분석</h4>
          <div class="bg-white p-3 rounded-lg text-xs">
            <p><strong>자동화 전:</strong> \${gemini.time_analysis?.before || '-'}</p>
            <p><strong>자동화 후:</strong> \${gemini.time_analysis?.after || '-'}</p>
            <p class="text-purple-600 font-medium"><strong>효율성:</strong> \${gemini.time_analysis?.efficiency_gain || '-'}</p>
          </div>
        </div>
        <div class="mb-4">
          <h4 class="text-sm font-bold text-purple-700 mb-2"><i class="fas fa-star mr-1"></i>코칭 팁</h4>
          <ul class="text-xs space-y-1 bg-white p-3 rounded-lg">
            \${(gemini.coaching_tips || []).map(tip => '<li class="flex items-start gap-1"><i class="fas fa-check text-purple-500 mt-0.5"></i><span>' + tip + '</span></li>').join('') || '<li class="text-gray-500">팁 없음</li>'}
          </ul>
        </div>
        <div>
          <h4 class="text-sm font-bold text-purple-700 mb-2"><i class="fas fa-comment-dots mr-1"></i>종합 결론</h4>
          <p class="text-xs text-gray-700 bg-white p-3 rounded-lg italic">\${gemini.conclusion || '결론 없음'}</p>
        </div>
      \`;
      
      // OpenAI 패널
      document.getElementById('openai-content').innerHTML = \`
        <div class="mb-4">
          <h4 class="text-sm font-bold text-green-700 mb-2"><i class="fas fa-lightbulb mr-1"></i>분석 요약</h4>
          <p class="text-sm text-gray-700 bg-white p-3 rounded-lg">\${openai.summary || '요약 없음'}</p>
        </div>
        <div class="mb-4">
          <h4 class="text-sm font-bold text-green-700 mb-2"><i class="fas fa-tasks mr-1"></i>워크플로우 (\${openai.workflow?.length || 0}단계)</h4>
          <div class="max-h-64 overflow-y-auto">
            \${renderComparisonWorkflow(openai.workflow, 'openai')}
          </div>
        </div>
        <div class="mb-4">
          <h4 class="text-sm font-bold text-green-700 mb-2"><i class="fas fa-clock mr-1"></i>시간 분석</h4>
          <div class="bg-white p-3 rounded-lg text-xs">
            <p><strong>자동화 전:</strong> \${openai.time_analysis?.before || '-'}</p>
            <p><strong>자동화 후:</strong> \${openai.time_analysis?.after || '-'}</p>
            <p class="text-green-600 font-medium"><strong>효율성:</strong> \${openai.time_analysis?.efficiency_gain || '-'}</p>
          </div>
        </div>
        <div class="mb-4">
          <h4 class="text-sm font-bold text-green-700 mb-2"><i class="fas fa-star mr-1"></i>코칭 팁</h4>
          <ul class="text-xs space-y-1 bg-white p-3 rounded-lg">
            \${(openai.coaching_tips || []).map(tip => '<li class="flex items-start gap-1"><i class="fas fa-check text-green-500 mt-0.5"></i><span>' + tip + '</span></li>').join('') || '<li class="text-gray-500">팁 없음</li>'}
          </ul>
        </div>
        <div>
          <h4 class="text-sm font-bold text-green-700 mb-2"><i class="fas fa-comment-dots mr-1"></i>종합 결론</h4>
          <p class="text-xs text-gray-700 bg-white p-3 rounded-lg italic">\${openai.conclusion || '결론 없음'}</p>
        </div>
      \`;
      
      // 비교 요약
      const geminiWorkflowCount = gemini.workflow ? gemini.workflow.length : 0;
      const openaiWorkflowCount = openai.workflow ? openai.workflow.length : 0;
      const geminiTipsCount = gemini.coaching_tips ? gemini.coaching_tips.length : 0;
      const openaiTipsCount = openai.coaching_tips ? openai.coaching_tips.length : 0;
      const geminiRoadmapCount = gemini.learning_roadmap ? gemini.learning_roadmap.length : 0;
      const openaiRoadmapCount = openai.learning_roadmap ? openai.learning_roadmap.length : 0;
      
      document.getElementById('comparison-summary-content').innerHTML = \`
        <div class="bg-purple-50 p-4 rounded-xl">
          <div class="flex items-center gap-2 mb-3">
            <div class="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
              <i class="fas fa-gem text-white text-sm"></i>
            </div>
            <span class="font-bold text-purple-700">Google Gemini</span>
          </div>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-600">워크플로우</span>
              <span class="font-bold text-purple-600">\${geminiWorkflowCount}단계</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">코칭 팁</span>
              <span class="font-bold text-purple-600">\${geminiTipsCount}개</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">학습 로드맵</span>
              <span class="font-bold text-purple-600">\${geminiRoadmapCount}개</span>
            </div>
          </div>
        </div>
        <div class="bg-green-50 p-4 rounded-xl">
          <div class="flex items-center gap-2 mb-3">
            <div class="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
              <i class="fas fa-robot text-white text-sm"></i>
            </div>
            <span class="font-bold text-green-700">ChatGPT</span>
          </div>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-600">워크플로우</span>
              <span class="font-bold text-green-600">\${openaiWorkflowCount}단계</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">코칭 팁</span>
              <span class="font-bold text-green-600">\${openaiTipsCount}개</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">학습 로드맵</span>
              <span class="font-bold text-green-600">\${openaiRoadmapCount}개</span>
            </div>
          </div>
        </div>
        <div class="bg-blue-50 p-4 rounded-xl">
          <div class="flex items-center gap-2 mb-3">
            <div class="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <i class="fas fa-balance-scale text-white text-sm"></i>
            </div>
            <span class="font-bold text-blue-700">비교 결과</span>
          </div>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-600">기본 사용 엔진</span>
              <span class="font-bold text-blue-600">\${recommendation.ai_engine_info?.selected_engine === 'gemini' ? 'Gemini' : 'ChatGPT'}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">워크플로우 차이</span>
              <span class="font-bold \${geminiWorkflowCount > openaiWorkflowCount ? 'text-purple-600' : 'text-green-600'}">\${Math.abs(geminiWorkflowCount - openaiWorkflowCount)}단계</span>
            </div>
            <p class="text-xs text-gray-500 mt-2 pt-2 border-t border-blue-200">두 AI의 관점을 비교하여 최적의 방법을 선택하세요</p>
          </div>
        </div>
      \`;
      
      // 단일 모드용 섹션들도 데이터로 채우기 (시간분석, 학습로드맵 등은 선택된 엔진 기준)
      renderSingleModeContent(recommendation);
    }
    
    // 단일 모드 콘텐츠 렌더링 (시간분석, 학습로드맵, 코칭팁)
    function renderSingleModeContent(recommendation) {
      const aiCoaching = recommendation.ai_coaching;
      if (!aiCoaching) return;
      
      // 시간 분석
      if (aiCoaching.time_analysis) {
        document.getElementById('time-analysis-content').innerHTML = \`
          <div class="bg-red-50 p-6 rounded-xl text-center">
            <i class="fas fa-hourglass-start text-red-500 text-3xl mb-3"></i>
            <p class="text-sm text-gray-500 mb-2">자동화 전</p>
            <p class="text-lg font-bold text-red-600">\${aiCoaching.time_analysis.before}</p>
          </div>
          <div class="bg-green-50 p-6 rounded-xl text-center">
            <i class="fas fa-hourglass-end text-green-500 text-3xl mb-3"></i>
            <p class="text-sm text-gray-500 mb-2">자동화 후</p>
            <p class="text-lg font-bold text-green-600">\${aiCoaching.time_analysis.after}</p>
          </div>
          <div class="bg-blue-50 p-6 rounded-xl text-center">
            <i class="fas fa-chart-line text-blue-500 text-3xl mb-3"></i>
            <p class="text-sm text-gray-500 mb-2">효율성 향상</p>
            <p class="text-lg font-bold text-blue-600">\${aiCoaching.time_analysis.efficiency_gain}</p>
          </div>
        \`;
      }
      
      // 학습 로드맵
      if (aiCoaching.learning_roadmap && aiCoaching.learning_roadmap.length > 0) {
        const roadmapHTML = aiCoaching.learning_roadmap.map(item => \`
          <div class="bg-gray-50 rounded-xl p-5 flex items-start gap-4">
            <div class="w-10 h-10 bg-orange-500 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">
              \${item.priority}
            </div>
            <div class="flex-1">
              <h4 class="font-bold text-gray-800 mb-1">\${item.tool_name}</h4>
              <p class="text-sm text-gray-600 mb-2">\${item.reason}</p>
              <div class="flex flex-wrap gap-4 text-sm">
                <span class="text-blue-600"><i class="fas fa-book mr-1"></i>\${item.learning_resources}</span>
                <span class="text-green-600"><i class="fas fa-clock mr-1"></i>\${item.estimated_learning_time}</span>
              </div>
            </div>
          </div>
        \`).join('');
        document.getElementById('learning-roadmap-content').innerHTML = roadmapHTML;
      }
      
      // 코칭 팁 & 종합 의견
      let tipsHTML = '';
      if (aiCoaching.coaching_tips && aiCoaching.coaching_tips.length > 0) {
        tipsHTML += '<div class="mb-6"><h3 class="text-lg font-bold text-gray-800 mb-3"><i class="fas fa-check-circle text-green-500 mr-2"></i>코칭 팁</h3><ul class="space-y-2">';
        aiCoaching.coaching_tips.forEach(tip => {
          tipsHTML += '<li class="flex items-start gap-2 bg-white p-3 rounded-lg"><i class="fas fa-lightbulb text-yellow-500 mt-1"></i><span class="text-gray-700">' + tip + '</span></li>';
        });
        tipsHTML += '</ul></div>';
      }
      
      if (aiCoaching.conclusion) {
        tipsHTML += \`
          <div class="bg-white p-6 rounded-xl border-2 border-purple-200">
            <h3 class="text-lg font-bold text-purple-700 mb-3"><i class="fas fa-medal mr-2"></i>종합 코멘트</h3>
            <p class="text-gray-700 leading-relaxed">\${aiCoaching.conclusion}</p>
            <p class="text-right text-sm text-purple-500 mt-4 font-medium">- 디마불사 코치 (AI 어시스턴트)</p>
          </div>
        \`;
      }
      document.getElementById('coaching-tips-content').innerHTML = tipsHTML || '<p class="text-gray-500">코칭 팁이 없습니다.</p>';
    }
    
    // 보고서 렌더링
    function renderReport(data) {
      const recommendation = data.parsedRecommendation;
      const date = new Date(data.created_at);
      const formattedDate = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
      
      // 메타 정보
      document.getElementById('report-meta').innerHTML = 
        '작성자: <strong>' + data.name + '</strong> | 부서: <strong>' + data.department + '</strong> | 작성일: <strong>' + formattedDate + '</strong>';
      
      // 업무 요약
      document.getElementById('task-summary').innerHTML = \`
        <div class="bg-gray-50 p-4 rounded-lg">
          <p class="text-sm text-gray-500 mb-1">업무 내용</p>
          <p class="font-medium text-gray-800">\${data.job_description}</p>
        </div>
        <div class="bg-gray-50 p-4 rounded-lg">
          <p class="text-sm text-gray-500 mb-1">반복주기</p>
          <p class="font-medium text-gray-800">\${data.repeat_cycle}</p>
        </div>
        <div class="bg-gray-50 p-4 rounded-lg">
          <p class="text-sm text-gray-500 mb-1">예상 소요시간</p>
          <p class="font-medium text-gray-800">\${data.estimated_hours}시간</p>
        </div>
        <div class="bg-gray-50 p-4 rounded-lg">
          <p class="text-sm text-gray-500 mb-1">자동화 요청</p>
          <p class="font-medium text-gray-800">\${data.automation_request}</p>
        </div>
      \`;
      
      // 분석 결과
      const levelText = { 'full': '완전자동화 가능', 'semi': '반자동화 가능', 'assist': 'AI 보조 활용' };
      const levelColor = { 'full': 'green', 'semi': 'blue', 'assist': 'yellow' };
      
      document.getElementById('analysis-result').innerHTML = \`
        <div class="text-center p-6 bg-\${levelColor[recommendation.automation_level]}-50 rounded-xl">
          <p class="text-sm text-gray-500 mb-2">자동화 수준</p>
          <p class="text-2xl font-bold text-\${levelColor[recommendation.automation_level]}-600">\${levelText[recommendation.automation_level]}</p>
        </div>
        <div class="text-center p-6 bg-purple-50 rounded-xl">
          <p class="text-sm text-gray-500 mb-2">예상 시간 절감</p>
          <p class="text-2xl font-bold text-purple-600">\${recommendation.time_saving.percentage}%</p>
          <p class="text-sm text-gray-500 mt-1">\${data.estimated_hours}시간 → \${recommendation.time_saving.new_hours}시간</p>
        </div>
        <div class="text-center p-6 bg-gray-50 rounded-xl">
          <p class="text-sm text-gray-500 mb-2">업무 유형</p>
          <p class="text-xl font-bold text-gray-800">\${recommendation.category}</p>
          <p class="text-sm text-gray-500 mt-1">\${recommendation.keywords.slice(0, 3).join(', ')}</p>
        </div>
      \`;
      
      // 추천 도구
      const toolsHTML = recommendation.recommended_tools.map((item, index) => {
        const difficultyText = { 'beginner': '초급', 'intermediate': '중급', 'advanced': '고급' };
        const pricingText = { 'free': '무료', 'freemium': '부분무료', 'paid': '유료' };
        const pricingColor = { 'free': 'green', 'freemium': 'blue', 'paid': 'orange' };
        
        return \`
          <div class="border border-gray-200 rounded-xl p-5 hover:shadow-md transition">
            <div class="flex items-start gap-4">
              <div class="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span class="text-purple-600 font-bold">\${index + 1}</span>
              </div>
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-2">
                  <h3 class="font-bold text-gray-800">\${item.tool.name}</h3>
                  <span class="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">\${item.tool.category}</span>
                  <span class="text-xs px-2 py-0.5 bg-\${pricingColor[item.tool.pricing_type]}-100 text-\${pricingColor[item.tool.pricing_type]}-600 rounded">\${pricingText[item.tool.pricing_type]}</span>
                </div>
                <p class="text-sm text-gray-600 mb-2">\${item.tool.description}</p>
                <p class="text-sm text-purple-600"><i class="fas fa-lightbulb mr-1"></i>\${item.reason}</p>
                \${item.tool.website_url ? '<a href="' + item.tool.website_url + '" target="_blank" class="text-sm text-blue-500 hover:underline mt-2 inline-block"><i class="fas fa-external-link-alt mr-1"></i>사이트 방문</a>' : ''}
              </div>
              <div class="text-right">
                <p class="text-sm text-gray-500">추천점수</p>
                <p class="text-xl font-bold text-purple-600">\${Math.min(100, Math.round(item.score * 2))}점</p>
                <p class="text-xs text-gray-400">(100점 만점)</p>
              </div>
            </div>
          </div>
        \`;
      }).join('');
      
      document.getElementById('recommended-tools').innerHTML = toolsHTML;
      
      // 비교 모드 확인
      const hasComparison = recommendation.comparison && recommendation.comparison.gemini && recommendation.comparison.openai;
      
      // AI 엔진 정보 표시
      const engineInfo = recommendation.ai_engine_info;
      if (engineInfo) {
        const engineBadge = document.getElementById('ai-engine-badge');
        const engineNames = { 'gemini': 'Google Gemini', 'openai': 'ChatGPT', 'fallback': '기본 템플릿' };
        const engineColors = { 'gemini': 'purple', 'openai': 'green', 'fallback': 'gray' };
        const engine = engineInfo.selected_engine || 'fallback';
        engineBadge.textContent = engineNames[engine] || engine;
        engineBadge.className = 'ml-2 text-sm font-normal px-3 py-1 rounded-full bg-' + (engineColors[engine] || 'gray') + '-100 text-' + (engineColors[engine] || 'gray') + '-700';
      }
      
      // 비교 모드일 경우 좌우 비교 렌더링
      if (hasComparison) {
        renderComparisonMode(recommendation);
        return; // 비교 모드에서는 아래 단일 모드 렌더링 스킵
      }
      
      // AI 코칭 결과 렌더링 (단일 엔진 모드)
      const aiCoaching = recommendation.ai_coaching;
      if (aiCoaching) {
        // 코칭 요약
        document.getElementById('coaching-summary-content').innerHTML = \`
          <div class="bg-white p-6 rounded-xl">
            <p class="text-lg text-gray-700 leading-relaxed">\${aiCoaching.summary}</p>
          </div>
        \`;
        
        // 단계별 워크플로우
        if (aiCoaching.workflow && aiCoaching.workflow.length > 0) {
          const workflowHTML = aiCoaching.workflow.map((step, idx) => \`
            <div class="bg-gray-50 rounded-xl p-6 border-l-4 border-purple-500">
              <div class="flex items-start gap-4">
                <div class="w-12 h-12 bg-purple-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-lg font-bold">
                  \${step.step_number || idx + 1}
                </div>
                <div class="flex-1">
                  <h3 class="text-lg font-bold text-gray-800 mb-2">\${step.title}</h3>
                  <div class="grid md:grid-cols-2 gap-4 mb-4">
                    <div class="flex items-center gap-2">
                      <i class="fas fa-tools text-blue-500"></i>
                      <span class="text-sm"><strong>도구:</strong> \${step.tool_name}</span>
                      \${step.tool_url ? '<a href="' + step.tool_url + '" target="_blank" class="text-blue-500 hover:underline ml-2"><i class="fas fa-external-link-alt"></i></a>' : ''}
                    </div>
                    <div class="flex items-center gap-2">
                      <i class="fas fa-clock text-green-500"></i>
                      <span class="text-sm"><strong>소요 시간:</strong> \${step.time_estimate}</span>
                    </div>
                  </div>
                  <div class="mb-3">
                    <p class="text-sm text-purple-600 font-medium mb-1"><i class="fas fa-cog mr-1"></i>사용 기능</p>
                    <p class="text-gray-700">\${step.specific_feature}</p>
                  </div>
                  <div class="mb-3">
                    <p class="text-sm text-blue-600 font-medium mb-1"><i class="fas fa-list-check mr-1"></i>실행 항목</p>
                    <ul class="list-disc list-inside text-gray-700 space-y-1">
                      \${step.action_items.map(item => '<li>' + item + '</li>').join('')}
                    </ul>
                  </div>
                  <div class="grid md:grid-cols-2 gap-4">
                    <div class="bg-white p-3 rounded-lg">
                      <p class="text-sm text-green-600 font-medium mb-1"><i class="fas fa-file-alt mr-1"></i>예상 결과물</p>
                      <p class="text-gray-700 text-sm">\${step.expected_output}</p>
                    </div>
                    <div class="bg-yellow-50 p-3 rounded-lg">
                      <p class="text-sm text-yellow-700 font-medium mb-1"><i class="fas fa-lightbulb mr-1"></i>팁</p>
                      <p class="text-gray-700 text-sm">\${step.tips}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          \`).join('');
          document.getElementById('workflow-content').innerHTML = workflowHTML;
        }
        
        // 시간 분석
        if (aiCoaching.time_analysis) {
          document.getElementById('time-analysis-content').innerHTML = \`
            <div class="bg-red-50 p-6 rounded-xl text-center">
              <i class="fas fa-hourglass-start text-red-500 text-3xl mb-3"></i>
              <p class="text-sm text-gray-500 mb-2">자동화 전</p>
              <p class="text-lg font-bold text-red-600">\${aiCoaching.time_analysis.before}</p>
            </div>
            <div class="bg-green-50 p-6 rounded-xl text-center">
              <i class="fas fa-hourglass-end text-green-500 text-3xl mb-3"></i>
              <p class="text-sm text-gray-500 mb-2">자동화 후</p>
              <p class="text-lg font-bold text-green-600">\${aiCoaching.time_analysis.after}</p>
            </div>
            <div class="bg-blue-50 p-6 rounded-xl text-center">
              <i class="fas fa-chart-line text-blue-500 text-3xl mb-3"></i>
              <p class="text-sm text-gray-500 mb-2">효율성 향상</p>
              <p class="text-lg font-bold text-blue-600">\${aiCoaching.time_analysis.efficiency_gain}</p>
            </div>
          \`;
        }
        
        // 학습 로드맵
        if (aiCoaching.learning_roadmap && aiCoaching.learning_roadmap.length > 0) {
          const roadmapHTML = aiCoaching.learning_roadmap.map(item => \`
            <div class="bg-gray-50 rounded-xl p-5 flex items-start gap-4">
              <div class="w-10 h-10 bg-orange-500 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                \${item.priority}
              </div>
              <div class="flex-1">
                <h4 class="font-bold text-gray-800 mb-1">\${item.tool_name}</h4>
                <p class="text-sm text-gray-600 mb-2">\${item.reason}</p>
                <div class="flex flex-wrap gap-4 text-sm">
                  <span class="text-blue-600"><i class="fas fa-book mr-1"></i>\${item.learning_resources}</span>
                  <span class="text-green-600"><i class="fas fa-clock mr-1"></i>\${item.estimated_learning_time}</span>
                </div>
              </div>
            </div>
          \`).join('');
          document.getElementById('learning-roadmap-content').innerHTML = roadmapHTML;
        }
        
        // 코칭 팁 & 종합 의견
        let tipsHTML = '';
        if (aiCoaching.coaching_tips && aiCoaching.coaching_tips.length > 0) {
          tipsHTML += '<div class="mb-6"><h3 class="text-lg font-bold text-gray-800 mb-3"><i class="fas fa-check-circle text-green-500 mr-2"></i>코칭 팁</h3><ul class="space-y-2">';
          aiCoaching.coaching_tips.forEach(tip => {
            tipsHTML += '<li class="flex items-start gap-2 bg-white p-3 rounded-lg"><i class="fas fa-lightbulb text-yellow-500 mt-1"></i><span class="text-gray-700">' + tip + '</span></li>';
          });
          tipsHTML += '</ul></div>';
        }
        
        if (aiCoaching.conclusion) {
          tipsHTML += \`
            <div class="bg-white p-6 rounded-xl border-2 border-purple-200">
              <h3 class="text-lg font-bold text-purple-700 mb-3"><i class="fas fa-medal mr-2"></i>종합 코멘트</h3>
              <p class="text-gray-700 leading-relaxed">\${aiCoaching.conclusion}</p>
              <p class="text-right text-sm text-purple-500 mt-4 font-medium">- 디마불사 코치 (AI 어시스턴트)</p>
            </div>
          \`;
        }
        document.getElementById('coaching-tips-content').innerHTML = tipsHTML || '<p class="text-gray-500">코칭 팁이 없습니다.</p>';
      } else {
        // AI 코칭이 없는 경우 섹션 숨기기
        document.getElementById('ai-coaching-summary').style.display = 'none';
        document.getElementById('workflow-section').style.display = 'none';
        document.getElementById('time-analysis-section').style.display = 'none';
        document.getElementById('learning-roadmap-section').style.display = 'none';
        document.getElementById('coaching-tips-section').style.display = 'none';
      }
    }
    
    // PDF 다운로드
    async function downloadPDF() {
      const { jsPDF } = window.jspdf;
      const element = document.getElementById('report-container');
      
      // 로딩 표시
      const loadingDiv = document.createElement('div');
      loadingDiv.id = 'pdf-loading';
      loadingDiv.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
      loadingDiv.innerHTML = '<div class="bg-white rounded-lg p-6 text-center"><div class="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent mx-auto mb-4"></div><p>PDF 생성 중...</p></div>';
      document.body.appendChild(loadingDiv);
      
      try {
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          logging: false,
          windowWidth: element.scrollWidth,
          windowHeight: element.scrollHeight
        });
        
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
        const imgX = (pdfWidth - imgWidth * ratio) / 2;
        
        let heightLeft = imgHeight * ratio;
        let position = 0;
        
        while (heightLeft > 0) {
          pdf.addImage(imgData, 'PNG', imgX, position, imgWidth * ratio, imgHeight * ratio);
          heightLeft -= pdfHeight;
          if (heightLeft > 0) {
            position -= pdfHeight;
            pdf.addPage();
          }
        }
        
        const fileName = 'AI활용_진단보고서_' + taskData.name + '_' + new Date().toISOString().split('T')[0] + '.pdf';
        pdf.save(fileName);
      } catch (error) {
        alert('PDF 생성에 실패했습니다: ' + error.message);
      } finally {
        document.getElementById('pdf-loading').remove();
      }
    }
    
    // 공유 기능
    async function shareReport() {
      const url = window.location.href;
      const title = 'AI 활용 업무 자동화 진단 보고서 - ' + (taskData?.name || '');
      
      // Web Share API 지원 확인
      if (navigator.share) {
        try {
          await navigator.share({
            title: title,
            text: taskData?.name + '님의 AI 활용 업무 자동화 진단 보고서입니다.',
            url: url
          });
        } catch (err) {
          if (err.name !== 'AbortError') {
            copyToClipboard(url);
          }
        }
      } else {
        copyToClipboard(url);
      }
    }
    
    function copyToClipboard(text) {
      navigator.clipboard.writeText(text).then(() => {
        alert('보고서 링크가 클립보드에 복사되었습니다!\\n\\n' + text);
      }).catch(() => {
        // 폴백: 임시 텍스트 영역 사용
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        alert('보고서 링크가 클립보드에 복사되었습니다!\\n\\n' + text);
      });
    }
    
    // 초기화
    loadReport();
  </script>
</body>
</html>`
}

function renderCoachPage(): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>코치 대시보드 | AI 활용 코칭 가이드</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://use.fontawesome.com/releases/v6.5.1/css/all.css" integrity="sha384-t1nt8BQoYMLFN5p42tRAtuAAFQaCQODz603XgS9FdHwmkLk5blPpjE7PwJbPtztG" crossorigin="anonymous">
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    * { font-family: 'Noto Sans KR', sans-serif !important; }
    body { font-family: 'Noto Sans KR', sans-serif !important; font-weight: 500; }
    .gradient-bg { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
  </style>
</head>
<body class="bg-gray-100 min-h-screen">
  <!-- 로그인 모달 -->
  <div id="login-modal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div class="bg-white rounded-2xl p-8 max-w-sm w-full mx-4">
      <h2 class="text-2xl font-bold text-gray-800 mb-6 text-center">
        <i class="fas fa-lock text-purple-600 mr-2"></i>코치 로그인
      </h2>
      <form id="login-form">
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">비밀번호</label>
          <input type="password" id="password" required
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="비밀번호를 입력하세요">
        </div>
        <button type="submit" class="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition font-semibold">로그인</button>
      </form>
    </div>
  </div>

  <!-- 대시보드 -->
  <div id="dashboard" class="hidden">
    <!-- 헤더 -->
    <header class="gradient-bg text-white py-6">
      <div class="container mx-auto px-6 flex justify-between items-center">
        <div>
          <h1 class="text-2xl font-bold"><i class="fas fa-user-tie mr-2"></i>코치 대시보드</h1>
          <p class="text-white/80">디마불사 코치님, 환영합니다!</p>
        </div>
        <div class="flex gap-4 items-center">
          <button onclick="openImportModal()" class="bg-white/20 px-4 py-2 rounded-lg hover:bg-white/30 transition">
            <i class="fas fa-upload mr-1"></i>CSV 업로드
          </button>
          <a href="/api/export/tasks" class="bg-white/20 px-4 py-2 rounded-lg hover:bg-white/30 transition">
            <i class="fas fa-download mr-1"></i>CSV 다운로드
          </a>
          <a href="/" class="text-white/80 hover:text-white"><i class="fas fa-home mr-1"></i>홈</a>
          <button onclick="logout()" class="text-white/80 hover:text-white"><i class="fas fa-sign-out-alt mr-1"></i>로그아웃</button>
        </div>
      </div>
    </header>

    <div class="container mx-auto px-6 py-8">
      <!-- 통계 카드 -->
      <div class="grid md:grid-cols-5 gap-4 mb-8" id="stats-cards"></div>

      <!-- 차트 섹션 -->
      <div class="grid md:grid-cols-2 gap-6 mb-8">
        <div class="bg-white rounded-2xl shadow-lg p-6">
          <h3 class="text-lg font-bold text-gray-800 mb-4"><i class="fas fa-chart-pie text-purple-600 mr-2"></i>업무 유형별 분포</h3>
          <canvas id="categoryChart" height="200"></canvas>
        </div>
        <div class="bg-white rounded-2xl shadow-lg p-6">
          <h3 class="text-lg font-bold text-gray-800 mb-4"><i class="fas fa-chart-bar text-blue-600 mr-2"></i>자동화 수준 분포</h3>
          <canvas id="automationChart" height="200"></canvas>
        </div>
      </div>

      <!-- 업무 목록 -->
      <div class="bg-white rounded-2xl shadow-lg p-6">
        <div class="flex justify-between items-center mb-6 flex-wrap gap-4">
          <h2 class="text-xl font-bold text-gray-800"><i class="fas fa-list text-purple-600 mr-2"></i>수강생 업무 목록</h2>
          <div class="flex gap-2 items-center">
            <input type="text" id="search-input" onkeyup="searchTasks()" placeholder="이름/부서 검색..." 
              class="px-4 py-2 border rounded-lg text-sm w-40">
            <select id="status-filter" onchange="filterTasks()" class="px-4 py-2 border rounded-lg text-sm">
              <option value="">전체</option>
              <option value="analyzed">분석완료</option>
              <option value="commented">코멘트완료</option>
            </select>
          </div>
        </div>
        <div id="task-list" class="space-y-4"></div>
      </div>
    </div>
  </div>

  <!-- 코멘트 모달 -->
  <div id="comment-modal" class="hidden fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-8">
    <div class="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 my-8 max-h-[90vh] overflow-y-auto">
      <h2 class="text-xl font-bold text-gray-800 mb-2"><i class="fas fa-comment text-purple-600 mr-2"></i>코치 코멘트 작성</h2>
      <p class="text-sm text-gray-500 mb-4"><i class="fas fa-info-circle mr-1"></i>입력창 클릭 또는 엔터 시 AI 분석 내용이 자동 입력됩니다.</p>
      <form id="comment-form">
        <input type="hidden" id="comment-task-id">
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">종합 코멘트</label>
            <textarea id="general_comment" rows="4" 
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 placeholder-gray-400" 
              data-ai-field="conclusion"
              onfocus="fillFromPlaceholder(this)"
              onkeydown="if(event.key==='Enter' && !this.value) { fillFromPlaceholder(this); }"
              placeholder="수강생에게 전달할 종합 코멘트를 작성하세요"></textarea>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">추가 추천 도구</label>
            <textarea id="additional_tools" rows="2" 
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 placeholder-gray-400" 
              data-ai-field="tools"
              onfocus="fillFromPlaceholder(this)"
              onkeydown="if(event.key==='Enter' && !this.value) { fillFromPlaceholder(this); }"
              placeholder="AI 추천 외에 추가로 추천하고 싶은 도구"></textarea>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">도구 활용 팁</label>
            <textarea id="tips" rows="3" 
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 placeholder-gray-400" 
              data-ai-field="tips"
              onfocus="fillFromPlaceholder(this)"
              onkeydown="if(event.key==='Enter' && !this.value) { fillFromPlaceholder(this); }"
              placeholder="도구 활용 시 유용한 팁"></textarea>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">학습 우선순위</label>
            <textarea id="learning_priority" rows="3" 
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 placeholder-gray-400" 
              data-ai-field="roadmap"
              onfocus="fillFromPlaceholder(this)"
              onkeydown="if(event.key==='Enter' && !this.value) { fillFromPlaceholder(this); }"
              placeholder="예: 1) ChatGPT 프롬프트 작성법 → 2) Make 자동화 구축"></textarea>
          </div>
        </div>
        <div class="flex justify-between gap-4 mt-6">
          <div class="flex gap-2">
            <button type="button" onclick="fillAllFromAI()" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
              <i class="fas fa-magic mr-1"></i>AI 내용 전체 입력
            </button>
            <button type="button" onclick="sendEmailNotification('comment')" class="px-4 py-2 border border-blue-500 text-blue-600 rounded-lg hover:bg-blue-50">
              <i class="fas fa-envelope mr-1"></i>저장 후 이메일
            </button>
          </div>
          <div class="flex gap-2">
            <button type="button" onclick="closeCommentModal()" class="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">취소</button>
            <button type="submit" class="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">저장</button>
          </div>
        </div>
      </form>
    </div>
  </div>

  <!-- CSV 업로드 모달 -->
  <div id="import-modal" class="hidden fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-8">
    <div class="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 my-8">
      <h2 class="text-xl font-bold text-gray-800 mb-6"><i class="fas fa-upload text-purple-600 mr-2"></i>CSV 일괄 업로드</h2>
      <div class="mb-6">
        <p class="text-gray-600 text-sm mb-4">CSV 파일 형식: 구분/조직, 부서, 성명, 이메일, 하는일/직무, 반복주기, AI자동화요청사항</p>
        <textarea id="csv-input" rows="8" class="w-full px-4 py-3 border border-gray-300 rounded-lg font-mono text-sm"
          placeholder="기획안 작성,마케팅팀,손오공,test@example.com,SNS 게시물 운영계획 수립,월 1회,전월 성과 모니터링 후 개선점 도출하여 운영 계획 자동화"></textarea>
      </div>
      <div id="import-result" class="hidden mb-4 p-4 rounded-lg"></div>
      <div class="flex justify-end gap-4">
        <button type="button" onclick="closeImportModal()" class="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">취소</button>
        <button onclick="importCSV()" class="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
          <i class="fas fa-upload mr-1"></i>업로드
        </button>
      </div>
    </div>
  </div>

  <script>
    let allTasks = [];
    let categoryChart, automationChart;
    
    // 로그인
    document.getElementById('login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const password = document.getElementById('password').value;
      try {
        const response = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password })
        });
        const result = await response.json();
        if (result.success) {
          document.getElementById('login-modal').classList.add('hidden');
          document.getElementById('dashboard').classList.remove('hidden');
          loadDashboard();
        } else {
          alert(result.error);
        }
      } catch (error) {
        alert('로그인 실패');
      }
    });
    
    function logout() { location.reload(); }
    
    // 대시보드 로드
    async function loadDashboard() {
      try {
        const [tasksRes, statsRes] = await Promise.all([
          fetch('/api/admin/tasks'),
          fetch('/api/admin/stats')
        ]);
        const tasksResult = await tasksRes.json();
        const statsResult = await statsRes.json();
        
        if (tasksResult.success) {
          allTasks = tasksResult.data;
          renderTasks(allTasks);
        }
        if (statsResult.success) {
          renderStats(statsResult.data);
          renderCharts(statsResult.data);
        }
      } catch (error) {
        console.error('Failed to load dashboard:', error);
      }
    }
    
    // 통계 렌더링
    function renderStats(stats) {
      document.getElementById('stats-cards').innerHTML = \`
        <div class="bg-white rounded-xl p-6 shadow-sm">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <i class="fas fa-tasks text-purple-600 text-xl"></i>
            </div>
            <div>
              <p class="text-sm text-gray-500">전체 업무</p>
              <p class="text-2xl font-bold text-gray-800">\${stats.total}</p>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-xl p-6 shadow-sm">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <i class="fas fa-search text-blue-600 text-xl"></i>
            </div>
            <div>
              <p class="text-sm text-gray-500">분석완료</p>
              <p class="text-2xl font-bold text-gray-800">\${stats.analyzed}</p>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-xl p-6 shadow-sm">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <i class="fas fa-check text-green-600 text-xl"></i>
            </div>
            <div>
              <p class="text-sm text-gray-500">코멘트완료</p>
              <p class="text-2xl font-bold text-gray-800">\${stats.commented}</p>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-xl p-6 shadow-sm">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <i class="fas fa-clock text-orange-600 text-xl"></i>
            </div>
            <div>
              <p class="text-sm text-gray-500">대기중</p>
              <p class="text-2xl font-bold text-gray-800">\${stats.pending}</p>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-xl p-6 shadow-sm cursor-pointer hover:shadow-md transition" onclick="showTrash()">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <i class="fas fa-trash-alt text-red-600 text-xl"></i>
            </div>
            <div>
              <p class="text-sm text-gray-500">휴지통</p>
              <p class="text-2xl font-bold text-gray-800">\${stats.trash || 0}</p>
            </div>
          </div>
        </div>
      \`;
    }
    
    // 차트 렌더링
    function renderCharts(stats) {
      // 카테고리 차트
      const catLabels = stats.categoryStats?.map(c => c.category) || [];
      const catData = stats.categoryStats?.map(c => c.count) || [];
      const catColors = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#14b8a6', '#f97316', '#84cc16', '#06b6d4'];
      
      if (categoryChart) categoryChart.destroy();
      categoryChart = new Chart(document.getElementById('categoryChart'), {
        type: 'doughnut',
        data: {
          labels: catLabels,
          datasets: [{ data: catData, backgroundColor: catColors.slice(0, catLabels.length) }]
        },
        options: { responsive: true, plugins: { legend: { position: 'right' } } }
      });
      
      // 자동화 수준 차트
      const levelMap = { 'full': '완전자동화', 'semi': '반자동화', 'assist': 'AI보조' };
      const autoLabels = stats.automationStats?.map(a => levelMap[a.level] || a.level) || [];
      const autoData = stats.automationStats?.map(a => a.count) || [];
      
      if (automationChart) automationChart.destroy();
      automationChart = new Chart(document.getElementById('automationChart'), {
        type: 'bar',
        data: {
          labels: autoLabels,
          datasets: [{ label: '업무 수', data: autoData, backgroundColor: ['#10b981', '#3b82f6', '#f59e0b'] }]
        },
        options: { responsive: true, plugins: { legend: { display: false } } }
      });
    }
    
    // 업무 목록 렌더링
    function renderTasks(tasks) {
      const statusBadge = {
        'pending': '<span class="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">대기</span>',
        'analyzed': '<span class="px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded">분석완료</span>',
        'commented': '<span class="px-2 py-1 text-xs bg-green-100 text-green-600 rounded">코멘트완료</span>'
      };
      
      if (tasks.length === 0) {
        document.getElementById('task-list').innerHTML = '<p class="text-center text-gray-500 py-8">등록된 업무가 없습니다.</p>';
        return;
      }
      
      document.getElementById('task-list').innerHTML = tasks.map(task => {
        const date = new Date(task.created_at);
        const dateStr = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
        
        return \`
          <div class="border rounded-xl p-5 hover:shadow-md transition">
            <div class="flex justify-between items-start flex-wrap gap-4">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-2 flex-wrap">
                  <h3 class="font-bold text-gray-800">\${task.name}</h3>
                  <span class="text-sm text-gray-500">\${task.department}</span>
                  \${statusBadge[task.status] || ''}
                  \${task.task_category ? '<span class="px-2 py-1 text-xs bg-purple-100 text-purple-600 rounded">' + task.task_category + '</span>' : ''}
                </div>
                <p class="text-gray-600 text-sm mb-2 truncate">\${task.job_description}</p>
                <p class="text-gray-500 text-xs">\${dateStr} | \${task.email}</p>
              </div>
              <div class="flex gap-2 flex-wrap items-center">
                <a href="/report/\${task.id}" target="_blank" class="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200">
                  <i class="fas fa-eye mr-1"></i>보기
                </a>
                <button onclick="sendReportEmail('\${task.id}')" class="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200">
                  <i class="fas fa-envelope mr-1"></i>메일
                </button>
                \${task.coach_comment_status === 'none' 
                  ? '<button onclick="openCommentModal(\\'' + task.id + '\\')" class="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"><i class="fas fa-comment mr-1"></i>코멘트</button>' 
                  : '<button onclick="sendCommentEmail(\\'' + task.id + '\\')" class="px-3 py-1 text-sm bg-green-100 text-green-600 rounded hover:bg-green-200"><i class="fas fa-check mr-1"></i>완료</button>'}
                <button onclick="deleteTask('\${task.id}', '\${task.name}')" class="px-3 py-1 text-sm bg-red-100 text-red-600 rounded hover:bg-red-200">
                  <i class="fas fa-trash-alt mr-1"></i>삭제
                </button>
              </div>
            </div>
          </div>
        \`;
      }).join('');
    }
    
    // 필터 및 검색
    function filterTasks() {
      const status = document.getElementById('status-filter').value;
      const search = document.getElementById('search-input').value.toLowerCase();
      let filtered = allTasks;
      if (status) filtered = filtered.filter(t => t.status === status);
      if (search) filtered = filtered.filter(t => t.name.toLowerCase().includes(search) || t.department.toLowerCase().includes(search));
      renderTasks(filtered);
    }
    function searchTasks() { filterTasks(); }
    
    // 코멘트 모달 - AI 분석 내용을 placeholder로 미리 표시
    let currentTaskAIData = null; // 현재 태스크의 AI 코칭 데이터 저장
    
    async function openCommentModal(taskId) {
      document.getElementById('comment-task-id').value = taskId;
      document.getElementById('comment-modal').classList.remove('hidden');
      
      // 폼 초기화
      document.getElementById('comment-form').reset();
      currentTaskAIData = null;
      
      // 해당 태스크의 AI 분석 데이터 가져오기
      const task = allTasks.find(t => t.id === taskId);
      if (task && task.recommended_tools) {
        try {
          const recommendation = typeof task.recommended_tools === 'string' 
            ? JSON.parse(task.recommended_tools) 
            : task.recommended_tools;
          
          const aiCoaching = recommendation.ai_coaching;
          if (aiCoaching) {
            currentTaskAIData = aiCoaching;
            
            // 종합 코멘트 placeholder
            const conclusionText = aiCoaching.conclusion || aiCoaching.summary || '';
            if (conclusionText) {
              document.getElementById('general_comment').placeholder = conclusionText;
            }
            
            // 추가 추천 도구 placeholder - 추천 도구 리스트에서 추출
            const toolsText = recommendation.recommended_tools
              ? recommendation.recommended_tools.map((t, i) => (i+1) + '. ' + t.tool.name + ' - ' + t.tool.description).join('\\n')
              : '';
            if (toolsText) {
              document.getElementById('additional_tools').placeholder = toolsText;
            }
            
            // 도구 활용 팁 placeholder
            const tipsText = aiCoaching.coaching_tips 
              ? aiCoaching.coaching_tips.map((tip, i) => '• ' + tip).join('\\n')
              : '';
            if (tipsText) {
              document.getElementById('tips').placeholder = tipsText;
            }
            
            // 학습 우선순위 placeholder
            const roadmapText = aiCoaching.learning_roadmap
              ? aiCoaching.learning_roadmap.map(item => item.priority + ') ' + item.tool_name + ' - ' + item.reason).join('\\n')
              : '';
            if (roadmapText) {
              document.getElementById('learning_priority').placeholder = roadmapText;
            }
          }
        } catch (e) {
          console.error('AI 데이터 파싱 오류:', e);
        }
      }
    }
    
    // placeholder 내용을 입력값으로 자동 채우기
    function fillFromPlaceholder(element) {
      if (!element.value && element.placeholder && element.placeholder !== element.getAttribute('data-default-placeholder')) {
        element.value = element.placeholder;
      }
    }
    
    // 모든 필드에 AI 내용 자동 입력
    function fillAllFromAI() {
      const fields = ['general_comment', 'additional_tools', 'tips', 'learning_priority'];
      fields.forEach(fieldId => {
        const element = document.getElementById(fieldId);
        if (element && !element.value && element.placeholder) {
          element.value = element.placeholder;
        }
      });
    }
    
    function closeCommentModal() {
      document.getElementById('comment-modal').classList.add('hidden');
      document.getElementById('comment-form').reset();
      currentTaskAIData = null;
      
      // placeholder 초기화
      document.getElementById('general_comment').placeholder = '수강생에게 전달할 종합 코멘트를 작성하세요';
      document.getElementById('additional_tools').placeholder = 'AI 추천 외에 추가로 추천하고 싶은 도구';
      document.getElementById('tips').placeholder = '도구 활용 시 유용한 팁';
      document.getElementById('learning_priority').placeholder = '예: 1) ChatGPT 프롬프트 작성법 → 2) Make 자동화 구축';
    }
    
    // 코멘트 저장
    document.getElementById('comment-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = {
        task_id: document.getElementById('comment-task-id').value,
        general_comment: document.getElementById('general_comment').value,
        additional_tools: document.getElementById('additional_tools').value,
        tips: document.getElementById('tips').value,
        learning_priority: document.getElementById('learning_priority').value
      };
      try {
        const response = await fetch('/api/admin/comments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const result = await response.json();
        if (result.success) {
          alert('코멘트가 저장되었습니다.');
          closeCommentModal();
          loadDashboard();
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        alert('저장 실패: ' + error.message);
      }
    });
    
    // 이메일 발송 (Gmail Compose URL)
    async function sendReportEmail(taskId) {
      try {
        const response = await fetch('/api/email/compose', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ task_id: taskId, type: 'report' })
        });
        const result = await response.json();
        if (result.success) {
          window.open(result.data.gmail_url, '_blank');
        } else {
          alert('이메일 생성 실패: ' + result.error);
        }
      } catch (error) {
        alert('오류 발생: ' + error.message);
      }
    }
    
    async function sendCommentEmail(taskId) {
      try {
        const response = await fetch('/api/email/compose', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ task_id: taskId, type: 'comment' })
        });
        const result = await response.json();
        if (result.success) {
          window.open(result.data.gmail_url, '_blank');
        } else {
          alert('이메일 생성 실패: ' + result.error);
        }
      } catch (error) {
        alert('오류 발생: ' + error.message);
      }
    }
    
    async function sendEmailNotification(type) {
      const taskId = document.getElementById('comment-task-id').value;
      // 먼저 저장
      document.getElementById('comment-form').dispatchEvent(new Event('submit'));
      // 약간의 딜레이 후 이메일
      setTimeout(() => sendCommentEmail(taskId), 1000);
    }
    
    // CSV 업로드 모달
    function openImportModal() {
      document.getElementById('import-modal').classList.remove('hidden');
      document.getElementById('import-result').classList.add('hidden');
    }
    function closeImportModal() {
      document.getElementById('import-modal').classList.add('hidden');
      document.getElementById('csv-input').value = '';
    }
    
    async function importCSV() {
      const csvText = document.getElementById('csv-input').value.trim();
      if (!csvText) {
        alert('CSV 데이터를 입력하세요.');
        return;
      }
      
      const lines = csvText.split('\\n').filter(line => line.trim());
      const tasks = lines.map(line => {
        const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        return {
          organization: cols[0] || '',
          department: cols[1] || '',
          name: cols[2] || '',
          email: cols[3] || '',
          job_description: cols[4] || '',
          repeat_cycle: cols[5] || '',
          automation_request: cols[6] || '',
          estimated_hours: parseFloat(cols[7]) || 1
        };
      });
      
      try {
        const response = await fetch('/api/import/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tasks })
        });
        const result = await response.json();
        
        const resultDiv = document.getElementById('import-result');
        if (result.success) {
          resultDiv.className = 'mb-4 p-4 rounded-lg bg-green-100 text-green-800';
          resultDiv.innerHTML = \`
            <p><strong>업로드 완료!</strong></p>
            <p>전체: \${result.data.total}건 | 성공: \${result.data.success}건 | 실패: \${result.data.failed}건</p>
          \`;
          loadDashboard();
        } else {
          resultDiv.className = 'mb-4 p-4 rounded-lg bg-red-100 text-red-800';
          resultDiv.innerHTML = '<p><strong>오류:</strong> ' + result.error + '</p>';
        }
        resultDiv.classList.remove('hidden');
      } catch (error) {
        alert('업로드 실패: ' + error.message);
      }
    }
    
    // =============================================
    // 휴지통 관련 함수
    // =============================================
    
    let trashTasks = [];
    let isTrashView = false;
    
    // 휴지통으로 이동 (소프트 삭제)
    async function deleteTask(taskId, taskName) {
      if (!confirm(\`"\${taskName}" 님의 업무를 휴지통으로 이동하시겠습니까?\\n\\n* 휴지통에서 30일 후 영구 삭제됩니다.\\n* 복원 가능합니다.\`)) {
        return;
      }
      
      try {
        const response = await fetch(\`/api/tasks/\${taskId}\`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        });
        const result = await response.json();
        if (result.success) {
          alert('휴지통으로 이동되었습니다.');
          loadDashboard();
        } else {
          alert('삭제 실패: ' + result.error);
        }
      } catch (error) {
        alert('오류 발생: ' + error.message);
      }
    }
    
    // 휴지통 보기
    async function showTrash() {
      try {
        const response = await fetch('/api/admin/trash');
        const result = await response.json();
        
        if (result.success) {
          trashTasks = result.data;
          isTrashView = true;
          
          // UI 변경
          document.querySelector('#task-list').parentElement.querySelector('h2').innerHTML = 
            '<i class="fas fa-trash-alt text-red-600 mr-2"></i>휴지통 <span class="text-sm font-normal text-gray-500">(' + trashTasks.length + '개 항목, 30일 후 자동 삭제)</span>';
          
          // 버튼 영역 변경
          const filterArea = document.querySelector('#task-list').parentElement.querySelector('.flex.gap-2.items-center');
          filterArea.innerHTML = \`
            <button onclick="cleanupTrash()" class="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 text-sm">
              <i class="fas fa-broom mr-1"></i>30일 지난 항목 정리
            </button>
            <button onclick="backToTasks()" class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm">
              <i class="fas fa-arrow-left mr-1"></i>업무 목록으로
            </button>
          \`;
          
          renderTrashTasks(trashTasks);
        } else {
          alert('휴지통 로드 실패: ' + result.error);
        }
      } catch (error) {
        alert('오류 발생: ' + error.message);
      }
    }
    
    // 휴지통 항목 렌더링
    function renderTrashTasks(tasks) {
      if (tasks.length === 0) {
        document.getElementById('task-list').innerHTML = '<p class="text-center text-gray-500 py-8"><i class="fas fa-check-circle text-green-500 mr-2"></i>휴지통이 비어 있습니다.</p>';
        return;
      }
      
      document.getElementById('task-list').innerHTML = tasks.map(task => {
        const deletedDate = new Date(task.deleted_at);
        const deletedDateStr = deletedDate.getFullYear() + '-' + String(deletedDate.getMonth() + 1).padStart(2, '0') + '-' + String(deletedDate.getDate()).padStart(2, '0');
        const daysRemaining = 30 - (task.days_in_trash || 0);
        
        return \`
          <div class="border border-red-200 rounded-xl p-5 bg-red-50/30 hover:shadow-md transition">
            <div class="flex justify-between items-start flex-wrap gap-4">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-2 flex-wrap">
                  <h3 class="font-bold text-gray-800">\${task.name}</h3>
                  <span class="text-sm text-gray-500">\${task.department}</span>
                  <span class="px-2 py-1 text-xs bg-red-100 text-red-600 rounded">삭제됨</span>
                </div>
                <p class="text-gray-600 text-sm mb-2 truncate">\${task.job_description}</p>
                <p class="text-gray-500 text-xs">삭제일: \${deletedDateStr} | <span class="text-red-500">\${daysRemaining > 0 ? daysRemaining + '일 후 영구 삭제' : '영구 삭제 대상'}</span></p>
              </div>
              <div class="flex gap-2 flex-wrap items-center">
                <button onclick="restoreTask('\${task.id}', '\${task.name}')" class="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200">
                  <i class="fas fa-undo mr-1"></i>복원
                </button>
                <button onclick="permanentDeleteTask('\${task.id}', '\${task.name}')" class="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700">
                  <i class="fas fa-trash mr-1"></i>영구 삭제
                </button>
              </div>
            </div>
          </div>
        \`;
      }).join('');
    }
    
    // 복원
    async function restoreTask(taskId, taskName) {
      if (!confirm(\`"\${taskName}" 님의 업무를 복원하시겠습니까?\`)) {
        return;
      }
      
      try {
        const response = await fetch(\`/api/tasks/\${taskId}/restore\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        const result = await response.json();
        if (result.success) {
          alert('복원되었습니다.');
          showTrash(); // 휴지통 다시 로드
          // 통계 갱신
          const statsRes = await fetch('/api/admin/stats');
          const statsResult = await statsRes.json();
          if (statsResult.success) renderStats(statsResult.data);
        } else {
          alert('복원 실패: ' + result.error);
        }
      } catch (error) {
        alert('오류 발생: ' + error.message);
      }
    }
    
    // 영구 삭제
    async function permanentDeleteTask(taskId, taskName) {
      if (!confirm(\`"\${taskName}" 님의 업무를 영구 삭제하시겠습니까?\\n\\n⚠️ 이 작업은 되돌릴 수 없습니다!\`)) {
        return;
      }
      
      try {
        const response = await fetch(\`/api/tasks/\${taskId}/permanent\`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        });
        const result = await response.json();
        if (result.success) {
          alert('영구 삭제되었습니다.');
          showTrash(); // 휴지통 다시 로드
          // 통계 갱신
          const statsRes = await fetch('/api/admin/stats');
          const statsResult = await statsRes.json();
          if (statsResult.success) renderStats(statsResult.data);
        } else {
          alert('삭제 실패: ' + result.error);
        }
      } catch (error) {
        alert('오류 발생: ' + error.message);
      }
    }
    
    // 30일 지난 항목 정리
    async function cleanupTrash() {
      if (!confirm('30일이 지난 모든 항목을 영구 삭제하시겠습니까?\\n\\n⚠️ 이 작업은 되돌릴 수 없습니다!')) {
        return;
      }
      
      try {
        const response = await fetch('/api/admin/trash/cleanup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        const result = await response.json();
        if (result.success) {
          alert(result.message);
          showTrash();
          // 통계 갱신
          const statsRes = await fetch('/api/admin/stats');
          const statsResult = await statsRes.json();
          if (statsResult.success) renderStats(statsResult.data);
        } else {
          alert('정리 실패: ' + result.error);
        }
      } catch (error) {
        alert('오류 발생: ' + error.message);
      }
    }
    
    // 업무 목록으로 돌아가기
    function backToTasks() {
      isTrashView = false;
      
      // UI 복원
      document.querySelector('#task-list').parentElement.querySelector('h2').innerHTML = 
        '<i class="fas fa-list text-purple-600 mr-2"></i>수강생 업무 목록';
      
      // 필터 영역 복원
      const filterArea = document.querySelector('#task-list').parentElement.querySelector('.flex.gap-2.items-center');
      filterArea.innerHTML = \`
        <input type="text" id="search-input" onkeyup="searchTasks()" placeholder="이름/부서 검색..." 
          class="px-4 py-2 border rounded-lg text-sm w-40">
        <select id="status-filter" onchange="filterTasks()" class="px-4 py-2 border rounded-lg text-sm">
          <option value="">전체</option>
          <option value="analyzed">분석완료</option>
          <option value="commented">코멘트완료</option>
        </select>
      \`;
      
      loadDashboard();
    }
  </script>
</body>
</html>`
}

function renderHistoryPage(): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>내 업무 이력 | AI 활용 코칭 가이드</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://use.fontawesome.com/releases/v6.5.1/css/all.css" integrity="sha384-t1nt8BQoYMLFN5p42tRAtuAAFQaCQODz603XgS9FdHwmkLk5blPpjE7PwJbPtztG" crossorigin="anonymous">
  <style>
    * { font-family: 'Noto Sans KR', sans-serif !important; }
    body { font-family: 'Noto Sans KR', sans-serif !important; font-weight: 500; }
    .gradient-bg { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
  </style>
</head>
<body class="bg-gray-50 min-h-screen">
  <!-- 헤더 -->
  <header class="gradient-bg text-white py-8">
    <div class="container mx-auto px-6">
      <a href="/" class="text-white/80 hover:text-white mb-4 inline-block">
        <i class="fas fa-arrow-left mr-2"></i>홈으로
      </a>
      <h1 class="text-3xl font-bold">
        <i class="fas fa-history mr-2"></i>내 업무 이력 조회
      </h1>
      <p class="text-white/80 mt-2">이메일로 제출한 업무 이력과 분석 결과를 확인하세요</p>
    </div>
  </header>

  <main class="container mx-auto px-6 py-8">
    <!-- 이메일 입력 섹션 -->
    <div class="max-w-2xl mx-auto mb-8">
      <div class="bg-white rounded-2xl shadow-lg p-8">
        <h2 class="text-xl font-bold text-gray-800 mb-4">
          <i class="fas fa-search text-purple-600 mr-2"></i>이력 조회
        </h2>
        <form id="search-form" class="flex gap-4">
          <input type="email" id="email-input" required
            class="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="이메일을 입력하세요">
          <button type="submit" class="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold">
            <i class="fas fa-search mr-2"></i>조회
          </button>
        </form>
      </div>
    </div>

    <!-- 결과 섹션 -->
    <div id="result-section" class="hidden max-w-4xl mx-auto">
      <!-- 통계 요약 -->
      <div class="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <h3 class="text-lg font-bold text-gray-800 mb-4">
          <i class="fas fa-chart-bar text-blue-600 mr-2"></i>나의 활동 요약
        </h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4" id="stats-summary"></div>
      </div>

      <!-- 업무 목록 -->
      <div class="bg-white rounded-2xl shadow-lg p-6">
        <h3 class="text-lg font-bold text-gray-800 mb-4">
          <i class="fas fa-list text-purple-600 mr-2"></i>제출한 업무 목록
        </h3>
        <div id="task-list" class="space-y-4"></div>
      </div>
    </div>

    <!-- 빈 상태 -->
    <div id="empty-state" class="hidden max-w-2xl mx-auto">
      <div class="bg-white rounded-2xl shadow-lg p-8 text-center">
        <i class="fas fa-inbox text-gray-300 text-6xl mb-4"></i>
        <h3 class="text-xl font-bold text-gray-600 mb-2">아직 제출한 업무가 없습니다</h3>
        <p class="text-gray-500 mb-6">업무를 입력하고 AI 도구 추천을 받아보세요!</p>
        <a href="/submit" class="inline-block bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition">
          <i class="fas fa-plus mr-2"></i>업무 입력하기
        </a>
      </div>
    </div>
  </main>

  <script>
    const searchForm = document.getElementById('search-form');
    const emailInput = document.getElementById('email-input');
    const resultSection = document.getElementById('result-section');
    const emptyState = document.getElementById('empty-state');
    
    // URL 파라미터에서 이메일 확인
    const urlParams = new URLSearchParams(window.location.search);
    const emailParam = urlParams.get('email');
    if (emailParam) {
      emailInput.value = emailParam;
      searchHistory(emailParam);
    }
    
    searchForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = emailInput.value.trim();
      if (email) {
        searchHistory(email);
        // URL 업데이트
        window.history.pushState({}, '', '/history?email=' + encodeURIComponent(email));
      }
    });
    
    async function searchHistory(email) {
      try {
        const response = await fetch('/api/history/' + encodeURIComponent(email));
        const result = await response.json();
        
        if (result.success) {
          if (result.data.tasks.length === 0) {
            resultSection.classList.add('hidden');
            emptyState.classList.remove('hidden');
          } else {
            emptyState.classList.add('hidden');
            resultSection.classList.remove('hidden');
            renderStats(result.data.stats);
            renderTasks(result.data.tasks);
          }
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        alert('조회 실패: ' + error.message);
      }
    }
    
    function renderStats(stats) {
      document.getElementById('stats-summary').innerHTML = \`
        <div class="bg-purple-50 p-4 rounded-xl text-center">
          <p class="text-sm text-gray-500 mb-1">총 업무</p>
          <p class="text-2xl font-bold text-purple-600">\${stats.totalTasks}</p>
        </div>
        <div class="bg-green-50 p-4 rounded-xl text-center">
          <p class="text-sm text-gray-500 mb-1">코멘트 완료</p>
          <p class="text-2xl font-bold text-green-600">\${stats.commented}</p>
        </div>
        <div class="bg-blue-50 p-4 rounded-xl text-center">
          <p class="text-sm text-gray-500 mb-1">예상 소요시간</p>
          <p class="text-2xl font-bold text-blue-600">\${stats.totalEstimatedHours}h</p>
        </div>
        <div class="bg-orange-50 p-4 rounded-xl text-center">
          <p class="text-sm text-gray-500 mb-1">절감 시간</p>
          <p class="text-2xl font-bold text-orange-600">\${stats.totalSavedHours.toFixed(1)}h</p>
        </div>
      \`;
    }
    
    function renderTasks(tasks) {
      const statusBadge = {
        'pending': '<span class="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">대기</span>',
        'analyzed': '<span class="px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded">분석완료</span>',
        'commented': '<span class="px-2 py-1 text-xs bg-green-100 text-green-600 rounded">코멘트완료</span>'
      };
      
      document.getElementById('task-list').innerHTML = tasks.map(task => {
        const date = new Date(task.created_at);
        const dateStr = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
        
        let recommendation = null;
        try {
          recommendation = task.recommended_tools ? JSON.parse(task.recommended_tools) : null;
        } catch (e) {}
        
        return \`
          <div class="border rounded-xl p-5 hover:shadow-md transition">
            <div class="flex justify-between items-start flex-wrap gap-4">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-2 flex-wrap">
                  \${statusBadge[task.status] || ''}
                  \${task.task_category ? '<span class="px-2 py-1 text-xs bg-purple-100 text-purple-600 rounded">' + task.task_category + '</span>' : ''}
                  <span class="text-sm text-gray-500">\${dateStr}</span>
                </div>
                <h3 class="font-bold text-gray-800 mb-2">\${task.job_description}</h3>
                <p class="text-sm text-gray-600 mb-2">반복: \${task.repeat_cycle} | 소요시간: \${task.estimated_hours}시간</p>
                \${recommendation ? '<p class="text-sm text-green-600"><i class="fas fa-chart-line mr-1"></i>예상 시간 절감: ' + recommendation.time_saving.percentage + '% (' + recommendation.time_saving.saved_hours + '시간)</p>' : ''}
              </div>
              <a href="/report/\${task.id}" class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition">
                <i class="fas fa-file-alt mr-1"></i>보고서 보기
              </a>
            </div>
            \${task.general_comment ? '<div class="mt-4 p-4 bg-purple-50 rounded-lg"><p class="text-sm text-purple-600 font-medium mb-1"><i class="fas fa-comment mr-1"></i>코치 코멘트</p><p class="text-sm text-gray-700">' + task.general_comment + '</p></div>' : ''}
          </div>
        \`;
      }).join('');
    }
  </script>
</body>
</html>`
}

// 404 페이지
function render404Page(): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>페이지를 찾을 수 없습니다 | AI 활용 코칭 가이드</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://use.fontawesome.com/releases/v6.5.1/css/all.css" integrity="sha384-t1nt8BQoYMLFN5p42tRAtuAAFQaCQODz603XgS9FdHwmkLk5blPpjE7PwJbPtztG" crossorigin="anonymous">
  <style>
    * { font-family: 'Noto Sans KR', sans-serif !important; }
    body { font-family: 'Noto Sans KR', sans-serif !important; font-weight: 500; }
    .gradient-bg { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
  </style>
</head>
<body class="bg-gray-50 min-h-screen flex items-center justify-center">
  <div class="text-center px-6">
    <div class="mb-8">
      <i class="fas fa-search text-gray-300 text-8xl"></i>
    </div>
    <h1 class="text-6xl font-bold text-gray-800 mb-4">404</h1>
    <p class="text-xl text-gray-600 mb-8">요청하신 페이지를 찾을 수 없습니다</p>
    <div class="flex justify-center gap-4 flex-wrap">
      <a href="/" class="inline-block bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition">
        <i class="fas fa-home mr-2"></i>홈으로 가기
      </a>
      <a href="/submit" class="inline-block bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition">
        <i class="fas fa-edit mr-2"></i>업무 입력하기
      </a>
    </div>
  </div>
</body>
</html>`
}

// 에러 페이지
function renderErrorPage(errorMessage: string): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>오류 발생 | AI 활용 코칭 가이드</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://use.fontawesome.com/releases/v6.5.1/css/all.css" integrity="sha384-t1nt8BQoYMLFN5p42tRAtuAAFQaCQODz603XgS9FdHwmkLk5blPpjE7PwJbPtztG" crossorigin="anonymous">
  <style>
    * { font-family: 'Noto Sans KR', sans-serif !important; }
    body { font-family: 'Noto Sans KR', sans-serif !important; font-weight: 500; }
  </style>
</head>
<body class="bg-gray-50 min-h-screen flex items-center justify-center">
  <div class="text-center px-6 max-w-md">
    <div class="mb-8">
      <i class="fas fa-exclamation-triangle text-red-400 text-8xl"></i>
    </div>
    <h1 class="text-4xl font-bold text-gray-800 mb-4">오류가 발생했습니다</h1>
    <p class="text-gray-600 mb-4">죄송합니다. 요청을 처리하는 중 문제가 발생했습니다.</p>
    <p class="text-sm text-gray-500 bg-gray-100 p-3 rounded mb-8">${errorMessage}</p>
    <a href="/" class="inline-block bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition">
      <i class="fas fa-home mr-2"></i>홈으로 가기
    </a>
  </div>
</body>
</html>`
}

// AI 도구 목록 페이지
function renderToolsPage(): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI 도구 목록 | AI 활용 코칭 가이드</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://use.fontawesome.com/releases/v6.5.1/css/all.css" integrity="sha384-t1nt8BQoYMLFN5p42tRAtuAAFQaCQODz603XgS9FdHwmkLk5blPpjE7PwJbPtztG" crossorigin="anonymous">
  <style>
    * { font-family: 'Noto Sans KR', sans-serif !important; }
    body { font-family: 'Noto Sans KR', sans-serif !important; font-weight: 500; }
    .gradient-bg { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
  </style>
</head>
<body class="bg-gray-50 min-h-screen">
  <!-- 헤더 -->
  <header class="gradient-bg text-white py-8">
    <div class="container mx-auto px-6">
      <a href="/" class="text-white/80 hover:text-white mb-4 inline-block">
        <i class="fas fa-arrow-left mr-2"></i>홈으로
      </a>
      <h1 class="text-3xl font-bold">
        <i class="fas fa-toolbox mr-2"></i>AI 도구 목록
      </h1>
      <p class="text-white/80 mt-2">업무 자동화에 활용할 수 있는 최신 AI 도구들입니다 (22개)</p>
    </div>
  </header>

  <main class="container mx-auto px-6 py-8">
    <!-- 카테고리 필터 -->
    <div class="mb-6 flex flex-wrap gap-2" id="category-filters">
      <button onclick="filterTools('')" class="category-btn active px-4 py-2 rounded-full bg-purple-600 text-white text-sm">전체</button>
    </div>

    <!-- 검색 -->
    <div class="mb-6">
      <input type="text" id="search-input" onkeyup="searchTools()" placeholder="도구명 또는 키워드 검색..."
        class="w-full max-w-md px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
    </div>

    <!-- 도구 목록 -->
    <div id="tools-grid" class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      <!-- 동적 로드 -->
    </div>
  </main>

  <script>
    let allTools = [];
    let currentCategory = '';
    
    const categoryIcons = {
      '문서작성': 'fa-file-alt',
      '데이터분석': 'fa-chart-bar',
      '마케팅': 'fa-bullhorn',
      '업무자동화': 'fa-cogs',
      '일정관리': 'fa-calendar-alt',
      '회의': 'fa-users',
      '이미지생성': 'fa-image',
      '영상생성': 'fa-video',
      '고객서비스': 'fa-headset',
      '개발': 'fa-code',
      '리서치': 'fa-search'
    };
    
    const difficultyText = { 'beginner': '초급', 'intermediate': '중급', 'advanced': '고급' };
    const pricingText = { 'free': '무료', 'freemium': '부분무료', 'paid': '유료' };
    const pricingColor = { 'free': 'green', 'freemium': 'blue', 'paid': 'orange' };
    
    async function loadTools() {
      try {
        const response = await fetch('/api/tools');
        const result = await response.json();
        if (result.success) {
          allTools = result.data;
          renderTools(allTools);
          renderCategoryFilters();
        }
      } catch (error) {
        console.error('Failed to load tools:', error);
      }
    }
    
    function renderCategoryFilters() {
      const categories = [...new Set(allTools.map(t => t.category))];
      const container = document.getElementById('category-filters');
      container.innerHTML = '<button onclick="filterTools(\\'\\')" class="category-btn ' + (currentCategory === '' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700') + ' px-4 py-2 rounded-full text-sm hover:bg-purple-500 hover:text-white transition">전체</button>';
      categories.forEach(cat => {
        container.innerHTML += '<button onclick="filterTools(\\'' + cat + '\\')" class="category-btn ' + (currentCategory === cat ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700') + ' px-4 py-2 rounded-full text-sm hover:bg-purple-500 hover:text-white transition"><i class="fas ' + (categoryIcons[cat] || 'fa-tools') + ' mr-1"></i>' + cat + '</button>';
      });
    }
    
    function filterTools(category) {
      currentCategory = category;
      renderCategoryFilters();
      const filtered = category ? allTools.filter(t => t.category === category) : allTools;
      renderTools(filtered);
    }
    
    function searchTools() {
      const query = document.getElementById('search-input').value.toLowerCase();
      let filtered = currentCategory ? allTools.filter(t => t.category === currentCategory) : allTools;
      if (query) {
        filtered = filtered.filter(t => 
          t.name.toLowerCase().includes(query) || 
          t.description.toLowerCase().includes(query) ||
          t.keywords.toLowerCase().includes(query)
        );
      }
      renderTools(filtered);
    }
    
    function renderTools(tools) {
      document.getElementById('tools-grid').innerHTML = tools.map(tool => \`
        <div class="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition">
          <div class="flex items-start gap-4">
            <div class="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
              <i class="fas \${categoryIcons[tool.category] || 'fa-tools'} text-purple-600"></i>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap mb-2">
                <h3 class="font-bold text-gray-800">\${tool.name}</h3>
                <span class="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">\${tool.category}</span>
              </div>
              <p class="text-sm text-gray-600 mb-3">\${tool.description}</p>
              <div class="flex items-center gap-2 flex-wrap text-xs">
                <span class="px-2 py-1 bg-\${pricingColor[tool.pricing_type]}-100 text-\${pricingColor[tool.pricing_type]}-600 rounded">\${pricingText[tool.pricing_type]}</span>
                <span class="px-2 py-1 bg-gray-100 text-gray-600 rounded">\${difficultyText[tool.difficulty]}</span>
                <span class="text-yellow-500"><i class="fas fa-star"></i> \${tool.rating}</span>
              </div>
              \${tool.website_url ? '<a href="' + tool.website_url + '" target="_blank" class="mt-3 inline-block text-sm text-purple-600 hover:underline"><i class="fas fa-external-link-alt mr-1"></i>사이트 방문</a>' : ''}
            </div>
          </div>
        </div>
      \`).join('');
      
      if (tools.length === 0) {
        document.getElementById('tools-grid').innerHTML = '<div class="col-span-full text-center py-12 text-gray-500"><i class="fas fa-search text-4xl mb-4"></i><p>검색 결과가 없습니다.</p></div>';
      }
    }
    
    loadTools();
  </script>
</body>
</html>`
}

export default app
