// =============================================
// AI 활용 코칭 가이드 웹앱 - 메인 엔트리
// AI공부방 10기 수강생 대상
// =============================================

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import type { Bindings, Task, AITool, Comment, CreateTaskRequest, TaskWithRecommendation } from './lib/types'
import { recommendTools } from './lib/recommendation'
import { generateAICoaching, generateFallbackCoaching, AICoachingResult } from './lib/gemini'

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
    const seedTools = [
      { id: 'tool-001', name: 'ChatGPT', category: '문서작성', subcategory: '텍스트 생성', description: 'OpenAI의 대화형 AI로 문서 초안 작성, 요약, 번역 등 다양한 텍스트 작업 지원', website_url: 'https://chat.openai.com', use_cases: '["문서 초안 작성", "이메일 작성", "보고서 요약", "번역", "아이디어 브레인스토밍"]', keywords: '["문서", "작성", "보고서", "이메일", "기획안", "제안서", "요약", "번역"]', automation_level: 'semi', difficulty: 'beginner', pricing_type: 'freemium', rating: 4.8, popularity: 100 },
      { id: 'tool-002', name: 'Notion AI', category: '문서작성', subcategory: '문서 관리', description: 'Notion 내장 AI로 문서 작성, 요약, 액션 아이템 추출 등 지원', website_url: 'https://www.notion.so', use_cases: '["회의록 정리", "문서 요약", "액션 아이템 추출", "글쓰기 보조"]', keywords: '["회의록", "정리", "요약", "액션", "문서", "노션"]', automation_level: 'semi', difficulty: 'beginner', pricing_type: 'freemium', rating: 4.5, popularity: 85 },
      { id: 'tool-003', name: 'Gamma', category: '문서작성', subcategory: '프레젠테이션', description: 'AI 기반 프레젠테이션 자동 생성 도구', website_url: 'https://gamma.app', use_cases: '["프레젠테이션 제작", "슬라이드 디자인", "문서 시각화"]', keywords: '["프레젠테이션", "PPT", "슬라이드", "발표", "제안서"]', automation_level: 'full', difficulty: 'beginner', pricing_type: 'freemium', rating: 4.6, popularity: 75 },
      { id: 'tool-004', name: 'Julius AI', category: '데이터분석', subcategory: '데이터 시각화', description: '자연어로 데이터 분석 및 시각화를 수행하는 AI 도구', website_url: 'https://julius.ai', use_cases: '["데이터 시각화", "통계 분석", "차트 생성", "데이터 정리"]', keywords: '["데이터", "분석", "통계", "차트", "그래프", "시각화", "엑셀"]', automation_level: 'semi', difficulty: 'beginner', pricing_type: 'freemium', rating: 4.4, popularity: 70 },
      { id: 'tool-005', name: 'Claude', category: '데이터분석', subcategory: '문서 분석', description: 'Anthropic의 AI로 긴 문서 분석, 데이터 해석에 강점', website_url: 'https://claude.ai', use_cases: '["긴 문서 분석", "데이터 해석", "비교 분석", "요약"]', keywords: '["분석", "문서", "데이터", "비교", "해석", "요약"]', automation_level: 'semi', difficulty: 'beginner', pricing_type: 'freemium', rating: 4.7, popularity: 90 },
      { id: 'tool-006', name: 'Canva AI', category: '마케팅', subcategory: '디자인', description: 'AI 기반 디자인 도구로 SNS 콘텐츠, 배너, 포스터 등 제작', website_url: 'https://www.canva.com', use_cases: '["SNS 이미지 제작", "배너 디자인", "포스터 제작", "로고 디자인"]', keywords: '["디자인", "이미지", "SNS", "배너", "포스터", "인스타그램", "페이스북"]', automation_level: 'semi', difficulty: 'beginner', pricing_type: 'freemium', rating: 4.6, popularity: 95 },
      { id: 'tool-007', name: 'Gemini Gems', category: '마케팅', subcategory: '카피라이팅', description: 'Google Gemini 기반 맞춤형 AI 앱으로 마케팅 카피, SNS 게시물 자동 생성', website_url: 'https://gemini.google.com/gems', use_cases: '["광고 카피 작성", "SNS 게시물 작성", "이메일 마케팅", "블로그 글", "맞춤형 AI 비서"]', keywords: '["카피", "광고", "마케팅", "SNS", "게시물", "콘텐츠", "운영", "젬스"]', automation_level: 'semi', difficulty: 'beginner', pricing_type: 'freemium', rating: 4.5, popularity: 80 },
      { id: 'tool-008', name: 'Google AI Studio TTS', category: '마케팅', subcategory: '음성 콘텐츠', description: 'Google AI Studio의 TTS 모델로 마케팅 음성 콘텐츠 제작', website_url: 'https://aistudio.google.com', use_cases: '["음성 콘텐츠 제작", "팟캐스트 제작", "영상 나레이션", "오디오 광고"]', keywords: '["마케팅", "콘텐츠", "음성", "TTS", "나레이션", "팟캐스트"]', automation_level: 'semi', difficulty: 'beginner', pricing_type: 'free', rating: 4.3, popularity: 65 },
      { id: 'tool-009', name: 'Make', category: '업무자동화', subcategory: '워크플로우', description: '시각적 워크플로우 빌더로 복잡한 자동화 구현, 5000개 이상 앱 연동', website_url: 'https://www.make.com', use_cases: '["복잡한 워크플로우", "조건부 자동화", "데이터 변환", "API 연동", "앱 간 데이터 연동"]', keywords: '["자동화", "워크플로우", "연동", "API", "자동", "프로세스", "반복", "작업"]', automation_level: 'full', difficulty: 'intermediate', pricing_type: 'freemium', rating: 4.5, popularity: 85 },
      { id: 'tool-010', name: 'Google Opal', category: '업무자동화', subcategory: 'AI 에이전트', description: 'Google의 AI 에이전트 플랫폼으로 업무 자동화 및 워크플로우 구축', website_url: 'https://opal.google.com', use_cases: '["AI 에이전트 구축", "워크플로우 자동화", "데이터 처리", "Google Workspace 연동"]', keywords: '["자동화", "워크플로우", "에이전트", "AI", "구글", "프로세스"]', automation_level: 'full', difficulty: 'intermediate', pricing_type: 'freemium', rating: 4.2, popularity: 60 },
      { id: 'tool-011', name: 'Notion 캘린더', category: '일정관리', subcategory: '스케줄링', description: 'Notion 내장 캘린더로 일정 관리, 태스크 연동, 팀 협업 지원', website_url: 'https://www.notion.so/product/calendar', use_cases: '["일정 관리", "태스크 연동", "회의 스케줄링", "팀 캘린더 공유", "마감일 관리"]', keywords: '["일정", "스케줄", "회의", "시간", "관리", "캘린더", "노션", "태스크"]', automation_level: 'semi', difficulty: 'beginner', pricing_type: 'freemium', rating: 4.4, popularity: 80 },
      { id: 'tool-012', name: 'Google NotebookLM', category: '회의', subcategory: '회의록/음성 분석', description: 'Google의 AI 노트북으로 회의 녹음 파일 업로드, 자동 전사, 요약, Q&A 지원', website_url: 'https://notebooklm.google.com', use_cases: '["회의 녹음 분석", "자동 전사", "회의록 생성", "핵심 내용 요약", "Q&A", "오디오 요약"]', keywords: '["회의", "녹음", "회의록", "전사", "요약", "미팅", "음성", "노트북"]', automation_level: 'full', difficulty: 'beginner', pricing_type: 'free', rating: 4.7, popularity: 88 },
      { id: 'tool-013', name: 'Nano Banana Pro', category: '이미지생성', subcategory: 'AI 이미지', description: '고품질 이미지 생성 및 편집 AI 모델, 다양한 스타일과 고해상도 출력 지원', website_url: 'https://genspark.ai', use_cases: '["이미지 생성", "이미지 편집", "컨셉 아트", "마케팅 이미지", "일러스트", "스타일 변환"]', keywords: '["이미지", "생성", "그림", "디자인", "아트", "일러스트", "편집"]', automation_level: 'semi', difficulty: 'beginner', pricing_type: 'freemium', rating: 4.6, popularity: 82 },
      { id: 'tool-014', name: 'Google VEO 3.1', category: '영상생성', subcategory: 'AI 영상', description: 'Google의 최신 영상 생성 AI, 고품질 영상 및 음향 동시 생성 지원', website_url: 'https://deepmind.google/veo', use_cases: '["영상 생성", "마케팅 영상", "프로모션 비디오", "소셜 미디어 콘텐츠"]', keywords: '["영상", "비디오", "생성", "마케팅", "콘텐츠"]', automation_level: 'semi', difficulty: 'beginner', pricing_type: 'freemium', rating: 4.5, popularity: 75 },
      { id: 'tool-015', name: 'OpenAI Sora 2', category: '영상생성', subcategory: 'AI 영상', description: 'OpenAI의 텍스트-영상 생성 AI, 고품질 시네마틱 영상 제작 가능', website_url: 'https://openai.com/sora', use_cases: '["영상 생성", "스토리텔링 영상", "광고 영상", "창작 콘텐츠"]', keywords: '["영상", "편집", "비디오", "생성", "효과", "AI"]', automation_level: 'semi', difficulty: 'intermediate', pricing_type: 'paid', rating: 4.4, popularity: 70 },
      { id: 'tool-016', name: 'Typebot', category: '고객서비스', subcategory: '챗봇 빌더', description: '오픈소스 챗봇 빌더로 드래그앤드롭 방식의 대화형 챗봇 구축', website_url: 'https://typebot.io', use_cases: '["고객 문의 응대", "FAQ 챗봇", "리드 수집", "예약 시스템"]', keywords: '["고객", "서비스", "문의", "응대", "챗봇", "CS", "자동화"]', automation_level: 'full', difficulty: 'beginner', pricing_type: 'freemium', rating: 4.3, popularity: 65 },
      { id: 'tool-017', name: '카카오 채널 챗봇', category: '고객서비스', subcategory: '메신저 챗봇', description: '카카오톡 채널 기반 AI 챗봇으로 한국 시장 최적화 고객 서비스 제공', website_url: 'https://business.kakao.com', use_cases: '["카카오톡 고객 응대", "자동 응답", "예약 관리", "주문 접수"]', keywords: '["고객", "서비스", "카카오", "챗봇", "메신저", "CS", "한국"]', automation_level: 'full', difficulty: 'beginner', pricing_type: 'freemium', rating: 4.4, popularity: 78 },
      { id: 'tool-018', name: 'Google AI Studio Build', category: '개발', subcategory: 'AI 앱 빌더', description: 'Google AI Studio의 빌드 기능으로 노코드/로우코드 AI 앱 개발', website_url: 'https://aistudio.google.com', use_cases: '["AI 앱 개발", "프로토타입 제작", "API 연동", "챗봇 개발"]', keywords: '["코딩", "개발", "프로그래밍", "코드", "자동화", "노코드", "AI"]', automation_level: 'semi', difficulty: 'beginner', pricing_type: 'free', rating: 4.3, popularity: 68 },
      { id: 'tool-019', name: 'Antigravity', category: '개발', subcategory: 'AI 개발 플랫폼', description: 'AI 기반 웹/앱 개발 플랫폼으로 자연어로 코드 생성 및 배포', website_url: 'https://antigravity.dev', use_cases: '["웹 개발", "앱 개발", "자동 코드 생성", "배포 자동화"]', keywords: '["코딩", "개발", "IDE", "에디터", "프로그래밍", "노코드"]', automation_level: 'full', difficulty: 'beginner', pricing_type: 'freemium', rating: 4.2, popularity: 55 },
      { id: 'tool-020', name: 'Perplexity AI', category: '리서치', subcategory: 'AI 검색', description: 'AI 기반 검색 엔진, 출처 포함 답변 제공', website_url: 'https://www.perplexity.ai', use_cases: '["정보 검색", "리서치", "팩트 체크", "트렌드 조사"]', keywords: '["검색", "리서치", "조사", "정보", "트렌드", "분석"]', automation_level: 'semi', difficulty: 'beginner', pricing_type: 'freemium', rating: 4.6, popularity: 88 },
      { id: 'tool-021', name: 'Google Deep Research', category: '리서치', subcategory: '심층 리서치', description: 'Google Gemini의 Deep Research 기능으로 복잡한 주제 심층 조사 및 보고서 자동 생성', website_url: 'https://gemini.google.com', use_cases: '["심층 리서치", "시장 조사", "경쟁사 분석", "트렌드 보고서", "학술 조사"]', keywords: '["검색", "리서치", "조사", "정보", "분석", "보고서", "심층"]', automation_level: 'full', difficulty: 'beginner', pricing_type: 'freemium', rating: 4.5, popularity: 72 },
      { id: 'tool-022', name: 'NotebookLM (리서치)', category: '리서치', subcategory: '문서 분석', description: 'Google의 AI 노트북, 업로드 문서 기반 Q&A 및 인사이트 도출', website_url: 'https://notebooklm.google.com', use_cases: '["문서 분석", "요약", "Q&A", "인사이트 도출", "학습 자료 정리"]', keywords: '["문서", "분석", "요약", "노트북", "학습", "리서치"]', automation_level: 'semi', difficulty: 'beginner', pricing_type: 'free', rating: 4.7, popularity: 85 },
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

// POST /api/tasks - 업무 등록 및 AI 추천 + AI 코칭 코멘트 생성
app.post('/api/tasks', async (c) => {
  try {
    const body = await c.req.json<CreateTaskRequest>()
    
    // 유효성 검사
    if (!body.organization || !body.department || !body.name || 
        !body.job_description || !body.repeat_cycle || !body.automation_request || !body.email) {
      return c.json({ success: false, error: '필수 필드가 누락되었습니다.' }, 400)
    }
    
    // AI 도구 목록 조회
    const { results: tools } = await c.env.DB.prepare(
      'SELECT * FROM ai_tools WHERE is_active = 1'
    ).all<AITool>()
    
    // AI 추천 생성 (키워드 매칭 기반)
    const recommendation = recommendTools(
      tools as AITool[],
      body.job_description,
      body.automation_request,
      body.estimated_hours || 4
    )
    
    // Gemini API를 통한 AI 코칭 코멘트 생성
    let aiCoaching: AICoachingResult
    const geminiApiKey = c.env.GEMINI_API_KEY
    
    if (geminiApiKey) {
      try {
        aiCoaching = await generateAICoaching(
          geminiApiKey,
          {
            name: body.name,
            organization: body.organization,
            department: body.department,
            job_description: body.job_description,
            repeat_cycle: body.repeat_cycle,
            automation_request: body.automation_request,
            estimated_hours: body.estimated_hours || 4,
            current_tools: body.current_tools || null
          },
          recommendation
        )
      } catch (aiError) {
        console.error('Gemini API error, using fallback:', aiError)
        // Gemini API 실패 시 폴백 코칭 사용
        aiCoaching = generateFallbackCoaching(
          {
            name: body.name,
            job_description: body.job_description,
            estimated_hours: body.estimated_hours || 4
          },
          recommendation
        )
      }
    } else {
      // API 키가 없으면 폴백 코칭 사용
      aiCoaching = generateFallbackCoaching(
        {
          name: body.name,
          job_description: body.job_description,
          estimated_hours: body.estimated_hours || 4
        },
        recommendation
      )
    }
    
    const now = Date.now()
    const taskId = generateId()
    
    // 전체 결과 (추천 + AI 코칭)
    const fullResult = {
      ...recommendation,
      ai_coaching: aiCoaching
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

// GET /api/tasks - 업무 목록 조회 (이메일 필터)
app.get('/api/tasks', async (c) => {
  try {
    const email = c.req.query('email')
    
    let query = 'SELECT * FROM tasks'
    const params: string[] = []
    
    if (email) {
      query += ' WHERE email = ?'
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

// GET /api/admin/tasks - 모든 업무 조회 (코치용)
app.get('/api/admin/tasks', async (c) => {
  try {
    const status = c.req.query('status')
    
    let query = 'SELECT * FROM tasks'
    const params: string[] = []
    
    if (status) {
      query += ' WHERE status = ?'
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

// GET /api/admin/stats - 통계 데이터
app.get('/api/admin/stats', async (c) => {
  try {
    // 전체 통계
    const totalResult = await c.env.DB.prepare('SELECT COUNT(*) as count FROM tasks').first<{count: number}>();
    const analyzedResult = await c.env.DB.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'analyzed'").first<{count: number}>();
    const commentedResult = await c.env.DB.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'commented'").first<{count: number}>();
    
    // 카테고리별 통계
    const { results: categoryStats } = await c.env.DB.prepare(`
      SELECT task_category as category, COUNT(*) as count 
      FROM tasks 
      WHERE task_category IS NOT NULL 
      GROUP BY task_category 
      ORDER BY count DESC
    `).all();
    
    // 자동화 수준별 통계
    const { results: automationStats } = await c.env.DB.prepare(`
      SELECT automation_level as level, COUNT(*) as count 
      FROM tasks 
      WHERE automation_level IS NOT NULL 
      GROUP BY automation_level
    `).all();
    
    // 부서별 통계
    const { results: departmentStats } = await c.env.DB.prepare(`
      SELECT department, COUNT(*) as count 
      FROM tasks 
      GROUP BY department 
      ORDER BY count DESC 
      LIMIT 10
    `).all();
    
    // 최근 7일간 등록 추이
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const { results: dailyStats } = await c.env.DB.prepare(`
      SELECT 
        DATE(created_at / 1000, 'unixepoch') as date,
        COUNT(*) as count 
      FROM tasks 
      WHERE created_at >= ? 
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

// GET /api/export/tasks - CSV 내보내기
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

// GET /api/history/:email - 수강생별 이력 조회
app.get('/api/history/:email', async (c) => {
  try {
    const email = c.req.param('email');
    
    const { results } = await c.env.DB.prepare(`
      SELECT 
        t.*,
        c.general_comment, c.additional_tools, c.tips, c.learning_priority
      FROM tasks t
      LEFT JOIN comments c ON t.id = c.task_id AND c.status = 'published'
      WHERE t.email = ?
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
              <textarea name="automation_request" required rows="4"
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="예: 전월 성과 모니터링 후 개선점 도출하여 차기 월에 게시물 운영 계획 수립을 템플릿으로 자동화하고 싶음"></textarea>
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
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(form);
      const data = {
        organization: formData.get('organization'),
        department: formData.get('department'),
        name: formData.get('name'),
        email: formData.get('email'),
        job_description: formData.get('job_description'),
        repeat_cycle: formData.get('repeat_cycle'),
        automation_request: formData.get('automation_request'),
        current_tools: formData.get('current_tools') || '',
        estimated_hours: parseFloat(formData.get('estimated_hours')) || 1
      };
      
      // 유효성 검사
      if (!data.organization || !data.department || !data.name || !data.email ||
          !data.job_description || !data.repeat_cycle || !data.automation_request) {
        alert('필수 항목을 모두 입력해주세요.');
        return;
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
      </h2>
      <div id="recommended-tools" class="space-y-4">
        <!-- 동적 로드 -->
      </div>
    </div>

    <!-- AI 코칭 분석 요약 -->
    <div class="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl shadow-lg p-8 mb-6" id="ai-coaching-summary">
      <h2 class="text-xl font-bold text-gray-800 mb-6 pb-2 border-b border-purple-200">
        <i class="fas fa-robot text-purple-600 mr-2"></i>AI 코칭 분석
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
                <p class="text-sm text-gray-500">점수</p>
                <p class="text-xl font-bold text-purple-600">\${Math.round(item.score)}</p>
              </div>
            </div>
          </div>
        \`;
      }).join('');
      
      document.getElementById('recommended-tools').innerHTML = toolsHTML;
      
      // AI 코칭 결과 렌더링
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
      <div class="grid md:grid-cols-4 gap-6 mb-8" id="stats-cards"></div>

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
              <div class="flex gap-2 flex-wrap">
                <a href="/report/\${task.id}" target="_blank" class="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200">
                  <i class="fas fa-eye mr-1"></i>보기
                </a>
                <button onclick="sendReportEmail('\${task.id}')" class="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200">
                  <i class="fas fa-envelope mr-1"></i>메일
                </button>
                \${task.coach_comment_status === 'none' 
                  ? '<button onclick="openCommentModal(\\'' + task.id + '\\')" class="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"><i class="fas fa-comment mr-1"></i>코멘트</button>' 
                  : '<button onclick="sendCommentEmail(\\'' + task.id + '\\')" class="px-3 py-1 text-sm bg-green-100 text-green-600 rounded hover:bg-green-200"><i class="fas fa-check mr-1"></i>완료</button>'}
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
