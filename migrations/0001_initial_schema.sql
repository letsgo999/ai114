-- =============================================
-- AI 활용 코칭 가이드 웹앱 - 초기 스키마
-- 버전: 1.0
-- 날짜: 2026-01-17
-- =============================================

-- tasks 테이블 (수강생 업무 정보)
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    
    -- 기본 정보 (CSV 시트 기반)
    organization TEXT NOT NULL,
    department TEXT NOT NULL,
    name TEXT NOT NULL,
    job_description TEXT NOT NULL,
    repeat_cycle TEXT NOT NULL,
    automation_request TEXT NOT NULL,
    
    -- 추가 정보
    email TEXT NOT NULL,
    current_tools TEXT,
    estimated_hours REAL DEFAULT 0,
    
    -- AI 추천 결과 (JSON)
    recommended_tools TEXT,
    task_category TEXT,
    automation_level TEXT,
    
    -- 상태 관리
    status TEXT DEFAULT 'pending',
    coach_comment_status TEXT DEFAULT 'none',
    
    -- 시스템 필드
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_tasks_email ON tasks(email);
CREATE INDEX IF NOT EXISTS idx_tasks_department ON tasks(department);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);

-- comments 테이블 (코치 코멘트)
CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    
    -- 코멘트 내용
    additional_tools TEXT,
    tool_explanation TEXT,
    tips TEXT,
    learning_priority TEXT,
    general_comment TEXT,
    
    -- 상태 관리
    status TEXT DEFAULT 'draft',
    
    -- 시스템 필드
    coach_name TEXT DEFAULT '디마불사',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_comments_task_id ON comments(task_id);
CREATE INDEX IF NOT EXISTS idx_comments_status ON comments(status);

-- ai_tools 테이블 (AI 도구 데이터베이스)
CREATE TABLE IF NOT EXISTS ai_tools (
    id TEXT PRIMARY KEY,
    
    -- 도구 기본 정보
    name TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    subcategory TEXT,
    description TEXT NOT NULL,
    website_url TEXT,
    
    -- 기능 정보 (JSON)
    use_cases TEXT NOT NULL,
    keywords TEXT NOT NULL,
    automation_level TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    
    -- 비용 정보
    pricing_type TEXT NOT NULL,
    pricing_detail TEXT,
    
    -- 평가 정보
    rating REAL DEFAULT 4.0,
    popularity INTEGER DEFAULT 50,
    
    -- 시스템 필드
    is_active INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_ai_tools_category ON ai_tools(category);
CREATE INDEX IF NOT EXISTS idx_ai_tools_name ON ai_tools(name);
CREATE INDEX IF NOT EXISTS idx_ai_tools_is_active ON ai_tools(is_active);
