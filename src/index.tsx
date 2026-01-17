// =============================================
// AI 활용 코칭 가이드 웹앱 - 메인 엔트리
// AI공부방 10기 수강생 대상
// =============================================

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import type { Bindings, Task, AITool, Comment, CreateTaskRequest, TaskWithRecommendation } from './lib/types'
import { recommendTools } from './lib/recommendation'

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

// POST /api/tasks - 업무 등록 및 AI 추천 생성
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
    
    // AI 추천 생성
    const recommendation = recommendTools(
      tools as AITool[],
      body.job_description,
      body.automation_request,
      body.estimated_hours || 4
    )
    
    const now = Date.now()
    const taskId = generateId()
    
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
      JSON.stringify(recommendation),
      recommendation.category,
      recommendation.automation_level,
      now,
      now
    ).run()
    
    return c.json({ 
      success: true, 
      data: {
        task_id: taskId,
        recommendation
      }
    })
  } catch (error) {
    console.error('Error creating task:', error)
    return c.json({ success: false, error: 'Failed to create task' }, 500)
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
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <style>
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
      <a href="/submit" class="inline-block bg-white text-purple-700 px-8 py-4 rounded-full text-lg font-semibold hover:bg-gray-100 transition shadow-lg">
        <i class="fas fa-arrow-right mr-2"></i>업무 입력하기
      </a>
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
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <style>
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
                <input type="number" name="estimated_hours" min="0.5" max="40" step="0.5" value="4"
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
        estimated_hours: parseFloat(formData.get('estimated_hours')) || 4
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
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
  <style>
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
  <div class="no-print fixed top-4 right-4 z-40 flex gap-2">
    <button onclick="downloadPDF()" class="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition shadow-lg">
      <i class="fas fa-file-pdf mr-2"></i>PDF 다운로드
    </button>
    <a href="/" class="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition shadow-lg inline-block">
      <i class="fas fa-home mr-2"></i>홈으로
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

    <!-- 코치 코멘트 -->
    <div class="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl shadow-lg p-8 mb-6" id="coach-comment-section">
      <h2 class="text-xl font-bold text-gray-800 mb-6 pb-2 border-b border-purple-200">
        <i class="fas fa-user-tie text-purple-600 mr-2"></i>코치 코멘트
      </h2>
      <div id="coach-comment">
        <p class="text-gray-500 italic">아직 코치 코멘트가 작성되지 않았습니다. 곧 코멘트가 추가될 예정입니다.</p>
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
      
      // 코치 코멘트
      if (data.comment) {
        document.getElementById('coach-comment').innerHTML = \`
          <div class="space-y-4">
            \${data.comment.general_comment ? '<div class="bg-white p-4 rounded-lg"><p class="text-sm text-purple-600 font-medium mb-1"><i class="fas fa-comment mr-1"></i>종합 코멘트</p><p class="text-gray-700">' + data.comment.general_comment + '</p></div>' : ''}
            \${data.comment.additional_tools ? '<div class="bg-white p-4 rounded-lg"><p class="text-sm text-purple-600 font-medium mb-1"><i class="fas fa-plus-circle mr-1"></i>추가 추천 도구</p><p class="text-gray-700">' + data.comment.additional_tools + '</p></div>' : ''}
            \${data.comment.tips ? '<div class="bg-white p-4 rounded-lg"><p class="text-sm text-purple-600 font-medium mb-1"><i class="fas fa-lightbulb mr-1"></i>팁</p><p class="text-gray-700">' + data.comment.tips + '</p></div>' : ''}
            \${data.comment.learning_priority ? '<div class="bg-white p-4 rounded-lg"><p class="text-sm text-purple-600 font-medium mb-1"><i class="fas fa-list-ol mr-1"></i>학습 우선순위</p><p class="text-gray-700">' + data.comment.learning_priority + '</p></div>' : ''}
          </div>
          <p class="text-right text-sm text-gray-500 mt-4">- 디마불사 코치</p>
        \`;
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
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <style>
    .gradient-bg {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
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
        <button type="submit" class="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition font-semibold">
          로그인
        </button>
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
        <div class="flex gap-4">
          <a href="/" class="text-white/80 hover:text-white"><i class="fas fa-home mr-1"></i>홈</a>
          <button onclick="logout()" class="text-white/80 hover:text-white"><i class="fas fa-sign-out-alt mr-1"></i>로그아웃</button>
        </div>
      </div>
    </header>

    <!-- 통계 카드 -->
    <div class="container mx-auto px-6 py-8">
      <div class="grid md:grid-cols-4 gap-6 mb-8" id="stats-cards">
        <!-- 동적 로드 -->
      </div>

      <!-- 업무 목록 -->
      <div class="bg-white rounded-2xl shadow-lg p-6">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-xl font-bold text-gray-800"><i class="fas fa-list text-purple-600 mr-2"></i>수강생 업무 목록</h2>
          <select id="status-filter" onchange="filterTasks()" class="px-4 py-2 border rounded-lg">
            <option value="">전체</option>
            <option value="analyzed">분석완료</option>
            <option value="commented">코멘트완료</option>
          </select>
        </div>
        <div id="task-list" class="space-y-4">
          <!-- 동적 로드 -->
        </div>
      </div>
    </div>
  </div>

  <!-- 코멘트 모달 -->
  <div id="comment-modal" class="hidden fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-8">
    <div class="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 my-8">
      <h2 class="text-xl font-bold text-gray-800 mb-6"><i class="fas fa-comment text-purple-600 mr-2"></i>코치 코멘트 작성</h2>
      <form id="comment-form">
        <input type="hidden" id="comment-task-id">
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">종합 코멘트</label>
            <textarea id="general_comment" rows="3" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              placeholder="수강생에게 전달할 종합 코멘트를 작성하세요"></textarea>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">추가 추천 도구</label>
            <textarea id="additional_tools" rows="2" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              placeholder="AI 추천 외에 추가로 추천하고 싶은 도구"></textarea>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">도구 활용 팁</label>
            <textarea id="tips" rows="2" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              placeholder="도구 활용 시 유용한 팁"></textarea>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">학습 우선순위</label>
            <textarea id="learning_priority" rows="2" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              placeholder="예: 1) ChatGPT 프롬프트 작성법 → 2) Make 자동화 구축"></textarea>
          </div>
        </div>
        <div class="flex justify-end gap-4 mt-6">
          <button type="button" onclick="closeCommentModal()" class="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">취소</button>
          <button type="submit" class="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">저장</button>
        </div>
      </form>
    </div>
  </div>

  <script>
    let allTasks = [];
    
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
    
    function logout() {
      location.reload();
    }
    
    // 대시보드 로드
    async function loadDashboard() {
      try {
        const response = await fetch('/api/admin/tasks');
        const result = await response.json();
        
        if (result.success) {
          allTasks = result.data;
          renderStats();
          renderTasks(allTasks);
        }
      } catch (error) {
        console.error('Failed to load dashboard:', error);
      }
    }
    
    // 통계 렌더링
    function renderStats() {
      const total = allTasks.length;
      const analyzed = allTasks.filter(t => t.status === 'analyzed').length;
      const commented = allTasks.filter(t => t.status === 'commented').length;
      const pending = allTasks.filter(t => t.coach_comment_status === 'none').length;
      
      document.getElementById('stats-cards').innerHTML = \`
        <div class="bg-white rounded-xl p-6 shadow-sm">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <i class="fas fa-tasks text-purple-600 text-xl"></i>
            </div>
            <div>
              <p class="text-sm text-gray-500">전체 업무</p>
              <p class="text-2xl font-bold text-gray-800">\${total}</p>
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
              <p class="text-2xl font-bold text-gray-800">\${analyzed}</p>
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
              <p class="text-2xl font-bold text-gray-800">\${commented}</p>
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
              <p class="text-2xl font-bold text-gray-800">\${pending}</p>
            </div>
          </div>
        </div>
      \`;
    }
    
    // 업무 목록 렌더링
    function renderTasks(tasks) {
      const statusBadge = {
        'pending': '<span class="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">대기</span>',
        'analyzed': '<span class="px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded">분석완료</span>',
        'commented': '<span class="px-2 py-1 text-xs bg-green-100 text-green-600 rounded">코멘트완료</span>'
      };
      
      document.getElementById('task-list').innerHTML = tasks.map(task => {
        const date = new Date(task.created_at);
        const dateStr = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
        
        return \`
          <div class="border rounded-xl p-5 hover:shadow-md transition">
            <div class="flex justify-between items-start">
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-2">
                  <h3 class="font-bold text-gray-800">\${task.name}</h3>
                  <span class="text-sm text-gray-500">\${task.department}</span>
                  \${statusBadge[task.status]}
                </div>
                <p class="text-gray-600 text-sm mb-2">\${task.job_description}</p>
                <p class="text-gray-500 text-xs">\${dateStr} | \${task.email}</p>
              </div>
              <div class="flex gap-2">
                <a href="/report/\${task.id}" target="_blank" class="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200">
                  <i class="fas fa-eye mr-1"></i>보기
                </a>
                \${task.coach_comment_status === 'none' ? '<button onclick="openCommentModal(\\'' + task.id + '\\')" class="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"><i class="fas fa-comment mr-1"></i>코멘트</button>' : '<span class="px-3 py-1 text-sm bg-green-100 text-green-600 rounded"><i class="fas fa-check mr-1"></i>작성완료</span>'}
              </div>
            </div>
          </div>
        \`;
      }).join('');
    }
    
    // 필터
    function filterTasks() {
      const status = document.getElementById('status-filter').value;
      const filtered = status ? allTasks.filter(t => t.status === status) : allTasks;
      renderTasks(filtered);
    }
    
    // 코멘트 모달
    function openCommentModal(taskId) {
      document.getElementById('comment-task-id').value = taskId;
      document.getElementById('comment-modal').classList.remove('hidden');
    }
    
    function closeCommentModal() {
      document.getElementById('comment-modal').classList.add('hidden');
      document.getElementById('comment-form').reset();
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
  </script>
</body>
</html>`
}

export default app
