# AI 코칭 웹앱 개발 종합 지침서 v2.0

## 📋 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [실제 발생한 문제와 해결책 (교훈 모음)](#2-실제-발생한-문제와-해결책-교훈-모음)
3. [개발 전 필수 확인 체크리스트](#3-개발-전-필수-확인-체크리스트)
4. [기술 스택 및 아키텍처](#4-기술-스택-및-아키텍처)
5. [데이터베이스 설계 완전 가이드](#5-데이터베이스-설계-완전-가이드)
6. [API 설계 완전 명세](#6-api-설계-완전-명세)
7. [UI/UX 설계 표준](#7-uiux-설계-표준)
8. [AI 연동 (Gemini API)](#8-ai-연동-gemini-api)
9. [점수/평점 시스템 설계](#9-점수평점-시스템-설계)
10. [단계별 개발 프로세스](#10-단계별-개발-프로세스)
11. [배포 프로세스](#11-배포-프로세스)
12. [테스트 체크리스트](#12-테스트-체크리스트)
13. [트러블슈팅 가이드](#13-트러블슈팅-가이드)
14. [유지보수 가이드](#14-유지보수-가이드)
15. [코드 스니펫 라이브러리](#15-코드-스니펫-라이브러리)
16. [최종 점검 체크리스트](#16-최종-점검-체크리스트)

---

## 1. 프로젝트 개요

### 1.1 앱 목적
- 수강생 업무 입력 → AI 분석 → 맞춤형 AI 도구 추천 및 워크플로우 코칭 제공
- 관리자(코치) 대시보드를 통한 수강생 관리 및 코멘트 작성
- 실시간 통계 및 분석 결과 시각화

### 1.2 최종 구현 기능 목록

| 구분 | 기능 | 상세 설명 | 우선순위 |
|------|------|----------|----------|
| **수강생** | 업무 입력 폼 | 조직, 부서, 이름, 이메일, 업무 설명, 반복주기, 자동화 요청 | 필수 |
| **수강생** | AI 분석 보고서 | 추천 도구 TOP 5, 워크플로우, 시간 절감 분석, 학습 로드맵 | 필수 |
| **수강생** | 점수 표시 | 100점 만점 기준 + 인포 아이콘 툴팁 설명 | 필수 |
| **수강생** | PDF 다운로드 | 보고서 PDF 저장 기능 | 선택 |
| **수강생** | 이력 조회 | 이메일 기반 과거 분석 이력 확인 | 선택 |
| **관리자** | 로그인 | 비밀번호 기반 인증 | 필수 |
| **관리자** | 대시보드 | 통계 카드, 차트, 업무 목록 | 필수 |
| **관리자** | 코멘트 작성 | AI 분석 기반 코칭 코멘트 작성 | 필수 |
| **관리자** | 휴지통 관리 | 소프트 삭제, 복원, 30일 후 영구 삭제 | 필수 |
| **관리자** | CSV 관리 | 내보내기/가져오기 | 선택 |
| **시스템** | Gmail 연동 | 보고서/코멘트 이메일 발송 링크 생성 | 선택 |

### 1.3 사용자 역할 정의

| 역할 | 접근 권한 | 인증 방식 |
|------|----------|----------|
| 수강생 | 업무 입력, 보고서 조회, 이력 확인 | 없음 (이메일로 식별) |
| 코치(관리자) | 전체 관리, 코멘트, 통계, 휴지통 | 비밀번호 인증 |

---

## 2. 실제 발생한 문제와 해결책 (교훈 모음)

> ⚠️ **중요**: 이 섹션은 실제 개발 과정에서 발생한 문제와 해결책을 정리한 것입니다.
> 다음 프로젝트에서 동일한 문제가 발생하지 않도록 반드시 숙지하세요.

### 2.1 🗑️ 휴지통 기능 누락 문제

**발생 상황:**
- 관리자가 레코드 삭제 기능을 요청
- 초기 설계에 삭제 기능 미포함

**요청 내용:**
```
"관리자 모드에서 보고서 레코드 별 뒷부분에 휴지통 아이콘을 추가해서 
삭제 처리하면 휴지통으로 넣어서 통계에 잡히지 않도록 하고, 
30일 뒤에는 복원 불가능하게 영구 삭제 처리해줘."
```

**해결책:**
1. DB 마이그레이션으로 `deleted_at` 컬럼 추가
2. 소프트 삭제 API 구현 (`DELETE /api/tasks/:id`)
3. 복원 API 구현 (`POST /api/tasks/:id/restore`)
4. 휴지통 목록 API 구현 (`GET /api/admin/trash`)
5. 30일 경과 항목 정리 API 구현 (`POST /api/admin/trash/cleanup`)
6. 모든 조회 쿼리에 `WHERE deleted_at IS NULL` 조건 추가

**예방책:**
```
✅ 개발 시작 전 삭제 방식 결정 (소프트 삭제 vs 하드 삭제)
✅ 초기 DB 스키마에 deleted_at 컬럼 필수 포함
✅ 휴지통 기능을 기본 기능으로 설계
```

---

### 2.2 🔘 삭제 버튼 미표시 문제

**발생 상황:**
- 삭제 기능 구현 후 배포했으나 버튼이 화면에 표시되지 않음
- 여러 번 배포해도 동일 문제 발생

**원인 분석:**
1. 아이콘만 있는 버튼 (텍스트 없음)
2. 버튼 크기/색상이 눈에 띄지 않음
3. 브라우저 캐시 문제

**해결책:**
```html
<!-- ❌ 잘못된 예: 아이콘만 있는 버튼 -->
<button><i class="fas fa-trash"></i></button>

<!-- ✅ 올바른 예: 텍스트 + 아이콘 + 명확한 색상 -->
<button class="px-3 py-1 text-sm bg-red-100 text-red-600 rounded hover:bg-red-200">
  <i class="fas fa-trash-alt mr-1"></i>삭제
</button>
```

**예방책:**
```
✅ 모든 버튼에 반드시 텍스트 레이블 포함
✅ 액션별 색상 코드 통일 (삭제=빨강, 확인=초록 등)
✅ 배포 후 시크릿 모드에서 테스트
✅ 새 배포 URL로 직접 접속하여 테스트
```

---

### 2.3 📊 점수 표시 불명확 문제

**발생 상황:**
- 추천 AI 도구 TOP 5 목록에 점수가 표시되었으나
- 사용자가 점수의 의미와 만점 기준을 이해하지 못함

**요청 내용:**
```
"분석 보고서 중 추천 AI도구 TOP 5 목록 뒷쪽 점수가 무엇을 뜻하는지 
사용자들이 기준이나 의미, 점수를 이해하기 어려워. 몇 점 만점인지, 
여기 표기된 점수가 뭘 의미하는지 목록 하단에 간략하게 [일러두기] 형식의 
박스나 귀퉁이 (i) 인포 아이콘에 마우스 오버하면 말풍선 형식으로 보여줄 수 있게 해줘."
```

**해결책:**
1. 점수를 100점 만점으로 정규화 (`score * 2`, 최대 100)
2. 점수 옆에 "(100점 만점)" 표시 추가
3. 제목 옆에 (i) 인포 아이콘 추가
4. 마우스 오버 시 툴팁으로 점수 산정 기준 표시

**구현 코드:**
```html
<!-- 인포 아이콘 + 툴팁 -->
<span class="relative inline-block ml-2 group cursor-help">
  <i class="fas fa-info-circle text-gray-400 text-sm hover:text-purple-600 transition"></i>
  <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-4 py-3 
              bg-gray-800 text-white text-xs rounded-lg shadow-lg 
              opacity-0 invisible group-hover:opacity-100 group-hover:visible 
              transition-all duration-200 w-72 z-50">
    <div class="font-bold mb-2 text-purple-300">추천 점수 안내</div>
    <ul class="space-y-1 text-gray-200">
      <li>• <strong>100점 만점</strong> 기준으로 산정</li>
      <li>• 업무 키워드 일치도 (40%)</li>
      <li>• 도구 평점 및 인기도 (30%)</li>
      <li>• 사용 난이도/접근성 (20%)</li>
      <li>• 가격 접근성 (10%)</li>
    </ul>
    <div class="mt-2 pt-2 border-t border-gray-600 text-gray-300">
      점수가 높을수록 업무에 적합합니다.
    </div>
    <!-- 말풍선 꼬리 -->
    <div class="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 
                border-8 border-transparent border-t-gray-800"></div>
  </div>
</span>

<!-- 점수 표시 -->
<div class="text-right">
  <p class="text-sm text-gray-500">추천점수</p>
  <p class="text-xl font-bold text-purple-600">${Math.min(100, Math.round(item.score * 2))}점</p>
  <p class="text-xs text-gray-400">(100점 만점)</p>
</div>
```

**예방책:**
```
✅ 점수/평점 시스템 설계 시 만점 기준 명확히 정의
✅ 사용자에게 점수 산정 기준 안내 UI 필수 포함
✅ 인포 아이콘 + 툴팁 패턴 표준화
```

---

### 2.4 🔄 AI 모델 버전 문제

**발생 상황:**
- Gemini 프리뷰 버전 사용 중 안정성 문제 발생
- 사용자가 "Gemini 3 Flash"로 변경 요청

**해결책:**
- 프리뷰 버전(`gemini-2.5-flash-preview-05-20`) → 안정 버전(`gemini-2.5-flash`)으로 변경
- 존재하지 않는 모델명 요청 시 현재 사용 가능한 최신 안정 버전 안내

**예방책:**
```
✅ AI 모델은 항상 안정 버전 사용 (프리뷰 버전 지양)
✅ 모델 버전을 환경 변수로 관리하여 쉽게 변경 가능하도록 설계
✅ 모델 변경 시 폴백 로직 필수 구현
```

---

### 2.5 📂 AI 도구 데이터베이스 확장

**발생 상황:**
- 초기 22개 도구 → 38개 도구로 확장 요청
- 새로운 카테고리 및 도구 추가 필요

**해결책:**
1. `seed_tools_2026.sql` 파일 생성
2. 새로운 도구 데이터 추가
3. 프로덕션 DB에 적용 (`wrangler d1 execute --remote --file=./seed_tools.sql`)

**예방책:**
```
✅ 시드 데이터는 별도 SQL 파일로 관리
✅ INSERT OR REPLACE 사용하여 중복 방지
✅ 도구 데이터 업데이트 절차 문서화
```

---

### 2.6 🌐 브라우저 캐시 문제

**발생 상황:**
- 배포 후에도 이전 버전이 표시됨
- 새로 추가한 기능이 보이지 않음

**해결책:**
1. 새 배포 URL(`https://xxxxx.ai-coaching-guide.pages.dev`)로 직접 접속
2. 강력 새로고침 (Ctrl+Shift+R / Cmd+Shift+R)
3. 시크릿 모드에서 테스트
4. 개발자 도구 → Network → "Disable cache" 체크

**예방책:**
```
✅ 배포 후 반드시 새 배포 URL로 테스트
✅ 정적 파일에 버전 쿼리스트링 추가 고려 (?v=1.0.1)
✅ 캐시 관련 헤더 설정 검토
```

---

### 2.7 📝 기존 DB 수정 vs 새 DB 생성 혼동

**발생 상황:**
- "ai-coaching-db가 이미 생성되어 있는데 수정만 하면 되는 거 아니니?"

**해결책:**
- 기존 DB에 ALTER TABLE로 컬럼 추가
- 마이그레이션 파일 생성 및 적용

**예방책:**
```
✅ DB 변경 시 항상 마이그레이션 파일 생성
✅ 마이그레이션 파일명 규칙: 0001_description.sql, 0002_description.sql
✅ 로컬 테스트 후 프로덕션 적용
```

---

## 3. 개발 전 필수 확인 체크리스트

### 3.1 기능 요구사항 확정 ⚠️ 최우선

```
□ 전체 페이지 목록 작성
□ 각 페이지별 기능 명세
□ 사용자 역할 및 권한 정의
□ 삭제 방식 결정 (소프트 삭제 권장)
□ 휴지통 기능 포함 여부
□ 점수/평점 시스템 설계 (만점 기준, 산정 방식)
□ 인포 아이콘/툴팁 필요 항목 식별
```

### 3.2 데이터베이스 설계 확정

```
□ 모든 테이블 스키마 확정
□ deleted_at 컬럼 포함 (소프트 삭제)
□ created_at, updated_at 컬럼 포함
□ 필요한 인덱스 설계
□ 외래키 관계 정의
□ 시드 데이터 준비
```

### 3.3 UI/UX 요구사항 확정

```
□ 버튼 디자인 표준 정의
  - 모든 버튼에 텍스트 레이블 포함
  - 액션별 색상 코드 (삭제=빨강, 확인=초록 등)
□ 아이콘 + 툴팁 패턴 정의
□ 모달/팝업 디자인
□ 통계 카드 레이아웃
□ 반응형 브레이크포인트
```

### 3.4 API 키 및 인증 준비

```
□ Cloudflare API 토큰 확보
□ Gemini API 키 확보
□ GitHub 연동 설정 (선택)
□ 커스텀 도메인 준비 (선택)
```

### 3.5 점수 시스템 설계 (해당 시)

```
□ 점수 만점 기준 정의 (예: 100점)
□ 점수 산정 공식 문서화
□ 점수 가중치 정의
  - 키워드 일치도: 40%
  - 평점/인기도: 30%
  - 난이도/접근성: 20%
  - 가격: 10%
□ 점수 설명 UI (인포 아이콘 + 툴팁)
```

---

## 4. 기술 스택 및 아키텍처

### 4.1 기술 스택

| 계층 | 기술 | 버전 | 용도 |
|------|------|------|------|
| 프레임워크 | Hono | ^4.0.0 | 경량 웹 프레임워크 |
| 런타임 | Cloudflare Workers | Edge | 서버리스 엣지 컴퓨팅 |
| 데이터베이스 | Cloudflare D1 | - | SQLite 기반 글로벌 DB |
| 빌드 도구 | Vite | ^5.0.0 | 빠른 빌드 및 HMR |
| 언어 | TypeScript | ^5.0.0 | 타입 안전성 |
| 스타일링 | Tailwind CSS | CDN | 유틸리티 CSS |
| 아이콘 | FontAwesome | CDN | 아이콘 라이브러리 |
| 차트 | Chart.js | CDN | 데이터 시각화 |
| AI | Google Gemini | 2.5-flash | AI 코칭 생성 |

### 4.2 프로젝트 구조

```
webapp/
├── src/
│   ├── index.tsx              # 메인 앱 (라우트 + HTML 렌더링)
│   └── lib/
│       ├── types.ts           # TypeScript 타입 정의
│       ├── recommendation.ts  # 추천 로직 및 점수 계산
│       └── gemini.ts          # Gemini API 연동
├── public/
│   ├── static/                # 정적 파일 (JS, CSS)
│   └── docs/                  # 문서 (가이드 등)
├── migrations/
│   ├── 0001_initial_schema.sql    # 초기 스키마
│   └── 0002_add_deleted_at.sql    # 소프트 삭제 컬럼
├── docs/
│   └── APP_DEVELOPMENT_GUIDE.md   # 개발 가이드
├── wrangler.jsonc             # Cloudflare 설정
├── vite.config.ts             # Vite 설정
├── package.json
├── tsconfig.json
├── ecosystem.config.cjs       # PM2 설정
├── seed_tools_2026.sql        # AI 도구 시드 데이터
└── README.md
```

### 4.3 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────────────────┐
│                         사용자 브라우저                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ 업무입력  │  │ 보고서   │  │ 대시보드  │  │ 휴지통   │        │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘        │
└───────┼─────────────┼─────────────┼─────────────┼───────────────┘
        │             │             │             │
        ▼             ▼             ▼             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Cloudflare Workers (Hono)                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                      API 라우트                             │ │
│  │  POST /api/tasks     GET /api/tasks/:id                    │ │
│  │  GET /api/admin/stats DELETE /api/tasks/:id                │ │
│  │  GET /api/admin/trash POST /api/tasks/:id/restore          │ │
│  └────────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  Cloudflare  │ │   Gemini     │ │   Gmail      │
│  D1 Database │ │   API        │ │   (링크)     │
│  (SQLite)    │ │   (AI 분석)  │ │              │
└──────────────┘ └──────────────┘ └──────────────┘
```

---

## 5. 데이터베이스 설계 완전 가이드

### 5.1 테이블 스키마

#### tasks 테이블 (업무)
```sql
CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    organization TEXT NOT NULL,          -- 소속/조직
    department TEXT NOT NULL,            -- 부서
    name TEXT NOT NULL,                  -- 이름
    job_description TEXT NOT NULL,       -- 업무 설명
    repeat_cycle TEXT NOT NULL,          -- 반복 주기
    automation_request TEXT NOT NULL,    -- 자동화 요청사항
    email TEXT NOT NULL,                 -- 이메일
    current_tools TEXT,                  -- 현재 사용 도구
    estimated_hours REAL DEFAULT 1,      -- 예상 소요시간
    recommended_tools TEXT,              -- AI 추천 결과 (JSON)
    task_category TEXT,                  -- 업무 카테고리
    automation_level TEXT,               -- 자동화 수준 (full/semi/assist)
    status TEXT DEFAULT 'pending',       -- 상태 (pending/analyzed/commented)
    coach_comment_status TEXT DEFAULT 'none',  -- 코멘트 상태 (none/draft/published)
    deleted_at INTEGER DEFAULT NULL,     -- ⚠️ 소프트 삭제 (필수!)
    created_at INTEGER NOT NULL,         -- 생성 시각 (timestamp)
    updated_at INTEGER NOT NULL          -- 수정 시각 (timestamp)
);

-- 필수 인덱스
CREATE INDEX idx_tasks_deleted_at ON tasks(deleted_at);
CREATE INDEX idx_tasks_email ON tasks(email);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_created_at ON tasks(created_at);
```

#### comments 테이블 (코치 코멘트)
```sql
CREATE TABLE comments (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    additional_tools TEXT,               -- 추가 추천 도구
    tool_explanation TEXT,               -- 도구 설명
    tips TEXT,                           -- 팁
    learning_priority TEXT,              -- 학습 우선순위
    general_comment TEXT,                -- 종합 코멘트
    status TEXT DEFAULT 'draft',         -- draft/published
    coach_name TEXT DEFAULT '코치명',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE INDEX idx_comments_task_id ON comments(task_id);
```

#### ai_tools 테이블 (AI 도구 마스터)
```sql
CREATE TABLE ai_tools (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,              -- 주 카테고리
    subcategory TEXT,                    -- 하위 카테고리
    description TEXT NOT NULL,           -- 도구 설명
    website_url TEXT,                    -- 웹사이트 URL
    use_cases TEXT NOT NULL,             -- 사용 사례 (콤마 구분)
    keywords TEXT NOT NULL,              -- 키워드 (콤마 구분)
    automation_level TEXT NOT NULL,      -- full/semi/assist
    difficulty TEXT NOT NULL,            -- beginner/intermediate/advanced
    pricing_type TEXT NOT NULL,          -- free/freemium/paid
    pricing_detail TEXT,                 -- 가격 상세
    rating REAL DEFAULT 4.0,             -- 평점 (5점 만점)
    popularity INTEGER DEFAULT 50,       -- 인기도 (0-100)
    is_active INTEGER DEFAULT 1,         -- 활성 여부
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE INDEX idx_ai_tools_category ON ai_tools(category);
CREATE INDEX idx_ai_tools_is_active ON ai_tools(is_active);
```

### 5.2 마이그레이션 파일 관리

```
migrations/
├── 0001_initial_schema.sql      # 초기 테이블 생성
├── 0002_add_deleted_at.sql      # 소프트 삭제 컬럼 추가
├── 0003_add_indexes.sql         # 추가 인덱스
└── ...
```

**0002_add_deleted_at.sql 예시:**
```sql
-- 소프트 삭제 컬럼 추가
ALTER TABLE tasks ADD COLUMN deleted_at INTEGER DEFAULT NULL;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at ON tasks(deleted_at);
```

### 5.3 시드 데이터 관리

**seed_tools_2026.sql 구조:**
```sql
-- AI 도구 시드 데이터
INSERT OR REPLACE INTO ai_tools (id, name, category, subcategory, description, website_url, use_cases, keywords, automation_level, difficulty, pricing_type, rating, popularity, is_active, created_at, updated_at)
VALUES 
('tool-001', 'ChatGPT', '문서작성', '다목적 AI', 'OpenAI GPT-5 Pro 기반 대화형 AI...', 'https://chatgpt.com', '문서 초안 작성,이메일 작성,보고서 요약', '문서,작성,보고서,이메일', 'semi', 'beginner', 'freemium', 4.9, 100, 1, 1737200000000, 1737200000000),
-- ... 추가 도구들
```

### 5.4 소프트 삭제 쿼리 패턴 ⚠️ 필수

```sql
-- ❌ 잘못된 예: deleted_at 조건 누락
SELECT * FROM tasks ORDER BY created_at DESC;

-- ✅ 올바른 예: 모든 조회에 deleted_at IS NULL 포함
SELECT * FROM tasks WHERE deleted_at IS NULL ORDER BY created_at DESC;

-- 휴지통 조회
SELECT * FROM tasks WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC;

-- 소프트 삭제
UPDATE tasks SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL;

-- 복원
UPDATE tasks SET deleted_at = NULL, updated_at = ? WHERE id = ?;

-- 영구 삭제 (30일 경과)
DELETE FROM tasks WHERE deleted_at IS NOT NULL AND deleted_at < ?;
```

---

## 6. API 설계 완전 명세

### 6.1 공개 API (인증 불필요)

| 메서드 | 경로 | 설명 | 요청 | 응답 |
|--------|------|------|------|------|
| GET | `/api/tools` | AI 도구 목록 | - | `{ success, data: AITool[] }` |
| GET | `/api/tools/categories` | 카테고리별 통계 | - | `{ success, data: { category, count }[] }` |
| POST | `/api/tasks` | 업무 등록 + AI 분석 | CreateTaskRequest | `{ success, data: { task_id, recommendation } }` |
| GET | `/api/tasks/:id` | 특정 업무 조회 | - | `{ success, data: TaskWithRecommendation }` |
| GET | `/api/tasks?email=xxx` | 이메일별 조회 | query: email | `{ success, data: Task[] }` |
| GET | `/api/history/:email` | 수강생 이력 | - | `{ success, data: { email, stats, tasks } }` |

### 6.2 관리자 API (인증 필요)

| 메서드 | 경로 | 설명 | 요청 | 응답 |
|--------|------|------|------|------|
| POST | `/api/admin/login` | 로그인 | `{ password }` | `{ success, message }` |
| GET | `/api/admin/tasks` | 전체 업무 목록 | query: status | `{ success, data: Task[] }` |
| GET | `/api/admin/stats` | 통계 데이터 | - | `{ success, data: Stats }` |
| POST | `/api/admin/comments` | 코멘트 저장 | CommentRequest | `{ success, data: Comment }` |
| GET | `/api/admin/trash` | 휴지통 목록 | - | `{ success, data: Task[], total }` |
| POST | `/api/admin/trash/cleanup` | 30일 정리 | - | `{ success, deleted_count }` |

### 6.3 CRUD API

| 메서드 | 경로 | 설명 | 동작 |
|--------|------|------|------|
| DELETE | `/api/tasks/:id` | 소프트 삭제 | `deleted_at = now` |
| POST | `/api/tasks/:id/restore` | 복원 | `deleted_at = NULL` |
| DELETE | `/api/tasks/:id/permanent` | 영구 삭제 | `DELETE FROM tasks` |

### 6.4 유틸리티 API

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/export/tasks` | CSV 내보내기 |
| POST | `/api/import/tasks` | CSV 가져오기 |
| POST | `/api/email/compose` | Gmail 작성 URL 생성 |
| GET | `/api/init` | DB 초기화 (개발용) |

### 6.5 API 응답 형식

```typescript
// 성공 응답
interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

// 실패 응답
interface ErrorResponse {
  success: false;
  error: string;
}

// 예시
{
  "success": true,
  "data": {
    "task_id": "uuid-here",
    "recommendation": { ... }
  }
}
```

---

## 7. UI/UX 설계 표준

### 7.1 버튼 디자인 가이드 ⚠️ 필수 준수

```html
<!-- 기본 버튼 (회색) - 보기, 취소 등 -->
<button class="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200">
  <i class="fas fa-eye mr-1"></i>보기
</button>

<!-- 주요 액션 버튼 (보라색) - 주요 기능 -->
<button class="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700">
  <i class="fas fa-comment mr-1"></i>코멘트
</button>

<!-- 보조 버튼 (파란색) - 이메일, 링크 등 -->
<button class="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200">
  <i class="fas fa-envelope mr-1"></i>메일
</button>

<!-- 성공/완료 버튼 (초록색) -->
<button class="px-3 py-1 text-sm bg-green-100 text-green-600 rounded hover:bg-green-200">
  <i class="fas fa-check mr-1"></i>완료
</button>

<!-- ⚠️ 삭제 버튼 (빨간색) - 반드시 텍스트 포함! -->
<button class="px-3 py-1 text-sm bg-red-100 text-red-600 rounded hover:bg-red-200">
  <i class="fas fa-trash-alt mr-1"></i>삭제
</button>

<!-- 복원 버튼 (초록색) -->
<button class="px-3 py-1 text-sm bg-green-100 text-green-600 rounded hover:bg-green-200">
  <i class="fas fa-undo mr-1"></i>복원
</button>
```

### 7.2 인포 아이콘 + 툴팁 패턴 ⚠️ 점수/복잡한 정보에 필수

```html
<span class="relative inline-block ml-2 group cursor-help">
  <!-- 아이콘 -->
  <i class="fas fa-info-circle text-gray-400 text-sm hover:text-purple-600 transition"></i>
  
  <!-- 툴팁 (호버 시 표시) -->
  <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 
              px-4 py-3 bg-gray-800 text-white text-xs rounded-lg shadow-lg 
              opacity-0 invisible group-hover:opacity-100 group-hover:visible 
              transition-all duration-200 w-72 z-50">
    
    <!-- 툴팁 제목 -->
    <div class="font-bold mb-2 text-purple-300">제목</div>
    
    <!-- 툴팁 내용 -->
    <ul class="space-y-1 text-gray-200">
      <li>• 항목 1</li>
      <li>• 항목 2</li>
    </ul>
    
    <!-- 부가 설명 -->
    <div class="mt-2 pt-2 border-t border-gray-600 text-gray-300">
      추가 설명 텍스트
    </div>
    
    <!-- 말풍선 꼬리 -->
    <div class="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 
                border-8 border-transparent border-t-gray-800"></div>
  </div>
</span>
```

### 7.3 목록 아이템 구조

```html
<div class="border border-gray-200 rounded-xl p-5 hover:shadow-md transition">
  <div class="flex items-start gap-4">
    <!-- 순번 또는 아이콘 -->
    <div class="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
      <span class="text-purple-600 font-bold">1</span>
    </div>
    
    <!-- 정보 영역 -->
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2 mb-2 flex-wrap">
        <h3 class="font-bold text-gray-800">제목</h3>
        <span class="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">태그</span>
      </div>
      <p class="text-sm text-gray-600 mb-2">설명 텍스트</p>
      <p class="text-xs text-gray-500">부가 정보</p>
    </div>
    
    <!-- 점수/상태 영역 -->
    <div class="text-right">
      <p class="text-sm text-gray-500">추천점수</p>
      <p class="text-xl font-bold text-purple-600">85점</p>
      <p class="text-xs text-gray-400">(100점 만점)</p>
    </div>
  </div>
</div>
```

### 7.4 통계 카드 레이아웃

```html
<div class="grid md:grid-cols-5 gap-4 mb-8">
  <!-- 통계 카드 -->
  <div class="bg-white rounded-xl p-6 shadow-sm cursor-pointer hover:shadow-md transition">
    <div class="flex items-center gap-4">
      <div class="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
        <i class="fas fa-tasks text-purple-600 text-xl"></i>
      </div>
      <div>
        <p class="text-sm text-gray-500">전체</p>
        <p class="text-2xl font-bold text-gray-800">100</p>
      </div>
    </div>
  </div>
  
  <!-- 휴지통 카드 (클릭 가능) -->
  <div class="bg-white rounded-xl p-6 shadow-sm cursor-pointer hover:shadow-md transition" 
       onclick="showTrash()">
    <div class="flex items-center gap-4">
      <div class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
        <i class="fas fa-trash text-red-600 text-xl"></i>
      </div>
      <div>
        <p class="text-sm text-gray-500">휴지통</p>
        <p class="text-2xl font-bold text-gray-800">5</p>
      </div>
    </div>
  </div>
</div>
```

### 7.5 모달 구조

```html
<div id="modal-id" class="hidden fixed inset-0 bg-black/50 flex items-center justify-center z-50">
  <div class="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
    <!-- 모달 헤더 -->
    <h2 class="text-xl font-bold text-gray-800 mb-6">
      <i class="fas fa-icon text-purple-600 mr-2"></i>모달 제목
    </h2>
    
    <!-- 모달 내용 -->
    <div class="space-y-4">
      <!-- 폼 필드 등 -->
    </div>
    
    <!-- 모달 푸터 -->
    <div class="flex justify-end gap-4 mt-6">
      <button onclick="closeModal('modal-id')" 
              class="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
        취소
      </button>
      <button class="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
        확인
      </button>
    </div>
  </div>
</div>
```

---

## 8. AI 연동 (Gemini API)

### 8.1 API 호출 함수

```typescript
// src/lib/gemini.ts

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

export async function callGeminiAPI(apiKey: string, prompt: string): Promise<string> {
  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}
```

### 8.2 프롬프트 설계

```typescript
export function buildCoachingPrompt(
  studentInfo: { name: string; department: string },
  jobDescription: string,
  automationRequest: string,
  recommendedTools: any[]
): string {
  return `
당신은 AI 활용 전문 코치입니다. 다음 수강생의 업무에 맞는 AI 코칭 코멘트를 JSON 형식으로 작성해주세요.

## 수강생 정보
- 이름: ${studentInfo.name}
- 부서: ${studentInfo.department}

## 업무 내용
${jobDescription}

## 자동화 요청사항
${automationRequest}

## 추천된 AI 도구 (상위 5개)
${recommendedTools.map((t, i) => `${i + 1}. ${t.tool.name}: ${t.tool.description}`).join('\n')}

## 출력 형식 (JSON)
{
  "summary": "한 줄 요약",
  "workflow": [
    {
      "step_number": 1,
      "title": "단계 제목",
      "tool_name": "사용 도구",
      "tool_url": "도구 URL",
      "specific_feature": "사용 기능",
      "action_items": ["실행 항목 1", "실행 항목 2"],
      "expected_output": "예상 결과물",
      "time_estimate": "예상 소요 시간",
      "tips": "팁"
    }
  ],
  "time_analysis": {
    "before": "자동화 전 소요 시간",
    "after": "자동화 후 소요 시간",
    "efficiency_gain": "효율 개선율"
  },
  "learning_roadmap": [
    {
      "priority": 1,
      "tool_name": "도구명",
      "reason": "학습 이유",
      "resources": ["학습 자료 URL"]
    }
  ],
  "coaching_tips": ["팁 1", "팁 2"],
  "conclusion": "종합 의견"
}

## 제약사항
- workflow는 3-6단계로 구성
- learning_roadmap은 3개 이내
- 모든 텍스트는 한국어로 작성
- JSON 형식만 출력 (마크다운 코드블록 없이)
`;
}
```

### 8.3 폴백 로직

```typescript
export function generateFallbackCoaching(
  recommendedTools: any[],
  estimatedHours: number
): AICoachingResult {
  const topTools = recommendedTools.slice(0, 3);
  
  return {
    summary: `${topTools.map(t => t.tool.name).join(', ')}을(를) 활용하여 업무 효율화를 추천합니다.`,
    workflow: topTools.map((t, i) => ({
      step_number: i + 1,
      title: `${t.tool.name} 활용`,
      tool_name: t.tool.name,
      tool_url: t.tool.website_url || '',
      specific_feature: t.tool.use_cases?.split(',')[0] || '주요 기능',
      action_items: ['도구 접속 및 회원가입', '기본 사용법 숙지', '업무에 적용'],
      expected_output: '업무 결과물',
      time_estimate: `${Math.round(estimatedHours / topTools.length * 60)}분`,
      tips: t.reason
    })),
    time_analysis: {
      before: `${estimatedHours}시간`,
      after: `${Math.round(estimatedHours * 0.4 * 10) / 10}시간`,
      efficiency_gain: '약 60%'
    },
    learning_roadmap: topTools.slice(0, 2).map((t, i) => ({
      priority: i + 1,
      tool_name: t.tool.name,
      reason: t.reason,
      resources: [t.tool.website_url || '']
    })),
    coaching_tips: [
      '단계별로 천천히 학습하세요.',
      '실제 업무에 바로 적용해보세요.'
    ],
    conclusion: 'AI 도구를 활용하면 업무 효율을 크게 높일 수 있습니다.'
  };
}
```

---

## 9. 점수/평점 시스템 설계

### 9.1 점수 계산 공식

```typescript
// src/lib/recommendation.ts

export function calculateToolScore(tool: AITool, keywords: string[]): { score: number; matchedKeywords: string[] } {
  let score = 0;
  const matchedKeywords: string[] = [];
  
  // 1. 기본 점수: 평점 기반 (최대 25점)
  score += tool.rating * 5;
  
  // 2. 키워드 매칭 (키워드당 +3점)
  const toolKeywords = tool.keywords.split(',').map(k => k.trim());
  for (const keyword of keywords) {
    if (toolKeywords.some(tk => tk.includes(keyword) || keyword.includes(tk))) {
      score += 3;
      matchedKeywords.push(keyword);
    }
  }
  
  // 3. 난이도 보너스 (최대 3점)
  if (tool.difficulty === 'beginner') score += 3;
  else if (tool.difficulty === 'intermediate') score += 1;
  
  // 4. 가격 보너스 (최대 2점)
  if (tool.pricing_type === 'free') score += 2;
  else if (tool.pricing_type === 'freemium') score += 1;
  
  // 5. 인기도 보너스 (최대 2점)
  score += tool.popularity / 50;
  
  return { score, matchedKeywords };
}
```

### 9.2 100점 만점 정규화

```javascript
// 프론트엔드에서 점수 표시
const normalizedScore = Math.min(100, Math.round(item.score * 2));

// 표시 형식
`<p class="text-xl font-bold text-purple-600">${normalizedScore}점</p>
 <p class="text-xs text-gray-400">(100점 만점)</p>`
```

### 9.3 점수 산정 기준 안내 (툴팁)

| 항목 | 비중 | 설명 |
|------|------|------|
| 업무 키워드 일치도 | 40% | 업무 설명과 도구 키워드 매칭 |
| 도구 평점 및 인기도 | 30% | 사용자 평점(5점 만점) + 인기도 |
| 사용 난이도/접근성 | 20% | 초보자 친화적 도구 우선 |
| 가격 접근성 | 10% | 무료/부분무료 도구 우선 |

---

## 10. 단계별 개발 프로세스

### Phase 1: 프로젝트 초기화 (30분)

```bash
# 1. Hono 프로젝트 생성
cd /home/user
npm create -y hono@latest webapp -- --template cloudflare-pages --install --pm npm

# 2. 프로젝트 디렉토리 이동
cd webapp

# 3. Git 초기화
git init

# 4. .gitignore 생성
cat > .gitignore << 'EOF'
node_modules/
dist/
.wrangler/
.dev.vars
*.log
.DS_Store
EOF

# 5. 초기 커밋
git add .
git commit -m "Initial commit"
```

### Phase 2: 데이터베이스 설정 (30분)

```bash
# 1. D1 데이터베이스 생성
npx wrangler d1 create app-db

# 2. wrangler.jsonc에 database_id 추가
# 출력된 database_id를 복사하여 설정

# 3. 마이그레이션 디렉토리 생성
mkdir migrations

# 4. 초기 스키마 작성
# migrations/0001_initial_schema.sql

# 5. 소프트 삭제 컬럼 추가
# migrations/0002_add_deleted_at.sql

# 6. 로컬 마이그레이션 실행
npx wrangler d1 migrations apply app-db --local

# 7. 프로덕션 마이그레이션 실행
npx wrangler d1 migrations apply app-db --remote

# 8. 시드 데이터 적용
npx wrangler d1 execute app-db --remote --file=./seed_tools.sql
```

### Phase 3: 백엔드 개발 (2-3시간)

**구현 순서:**
1. `src/lib/types.ts` - 타입 정의
2. `src/lib/recommendation.ts` - 점수 계산 로직
3. `src/lib/gemini.ts` - AI API 연동
4. `src/index.tsx` - API 라우트 구현

**API 구현 체크리스트:**
```
□ GET /api/tools
□ GET /api/tools/categories
□ POST /api/tasks (+ AI 분석)
□ GET /api/tasks/:id
□ GET /api/tasks?email=xxx
□ POST /api/admin/login
□ GET /api/admin/tasks
□ GET /api/admin/stats
□ POST /api/admin/comments
□ DELETE /api/tasks/:id (소프트 삭제)
□ POST /api/tasks/:id/restore (복원)
□ DELETE /api/tasks/:id/permanent (영구 삭제)
□ GET /api/admin/trash
□ POST /api/admin/trash/cleanup
□ GET /api/export/tasks
□ POST /api/import/tasks
□ POST /api/email/compose
```

### Phase 4: 프론트엔드 개발 (2-3시간)

**페이지별 구현:**
1. 홈페이지 (`/`)
2. 업무 입력 폼 (`/submit`)
3. 분석 보고서 (`/report/:id`)
4. 관리자 대시보드 (`/coach`)
5. 이력 조회 (`/history`)

**UI 구현 체크리스트:**
```
□ 모든 버튼에 텍스트 레이블 포함
□ 삭제 버튼 빨간색 + "삭제" 텍스트
□ 점수 표시: XX점 (100점 만점)
□ 인포 아이콘 + 툴팁 (점수 설명)
□ 휴지통 통계 카드
□ 휴지통 목록 모달
□ 복원/영구삭제 버튼
□ 반응형 레이아웃
```

### Phase 5: 테스트 (1시간)

```bash
# 1. 빌드
npm run build

# 2. 로컬 서버 시작
pm2 start ecosystem.config.cjs

# 3. API 테스트
curl http://localhost:3000/api/init
curl http://localhost:3000/api/tools

# 4. 기능 테스트 (브라우저)
# - 업무 입력 → AI 분석
# - 보고서 확인 (점수 표시, 툴팁)
# - 관리자 로그인
# - 삭제 → 휴지통 → 복원
```

### Phase 6: 배포 (30분)

```bash
# 1. Cloudflare API 키 설정
# setup_cloudflare_api_key 도구 호출

# 2. 인증 확인
npx wrangler whoami

# 3. 환경 변수 설정
npx wrangler pages secret put GEMINI_API_KEY --project-name app-name

# 4. 빌드 및 배포
npm run build
npx wrangler pages deploy dist --project-name app-name

# 5. 프로덕션 테스트 (새 배포 URL로)
curl https://xxxxx.app-name.pages.dev/api/admin/stats
```

---

## 11. 배포 프로세스

### 11.1 첫 배포 체크리스트

```
□ Cloudflare API 키 설정 완료
□ D1 데이터베이스 생성 완료
□ wrangler.jsonc에 database_id 설정
□ 마이그레이션 실행 (로컬 + 리모트)
□ 시드 데이터 적용
□ 환경 변수 설정 (GEMINI_API_KEY 등)
□ 빌드 성공 확인
□ 배포 성공 확인
□ 새 배포 URL로 테스트 (캐시 우회)
□ 모든 기능 동작 확인
```

### 11.2 업데이트 배포

```bash
# 1. 변경사항 빌드
npm run build

# 2. Git 커밋
git add .
git commit -m "feat: 기능 설명"

# 3. 배포
npx wrangler pages deploy dist --project-name app-name

# 4. 새 배포 URL로 테스트 (출력된 URL 사용)
# https://xxxxx.app-name.pages.dev

# 5. 프로덕션 도메인에서 강력 새로고침 후 확인
```

### 11.3 DB 스키마 변경 시

```bash
# 1. 마이그레이션 파일 생성
# migrations/0003_new_feature.sql

# 2. 로컬 테스트
npx wrangler d1 migrations apply app-db --local

# 3. 프로덕션 적용
npx wrangler d1 migrations apply app-db --remote

# 4. 코드 수정 및 배포
npm run build
npx wrangler pages deploy dist --project-name app-name
```

---

## 12. 테스트 체크리스트

### 12.1 기능 테스트

#### 수강생 기능
```
□ 홈페이지 정상 로드
□ 업무 입력 폼 표시
□ 필수 필드 유효성 검사
□ 업무 제출 성공
□ AI 분석 결과 표시
□ 보고서 페이지 로드
□ 추천 도구 TOP 5 표시
□ 점수 표시 (XX점 / 100점 만점)
□ 인포 아이콘 툴팁 표시
□ 워크플로우 단계 표시
□ 시간 절감 분석 표시
□ PDF 다운로드
□ 공유 기능
```

#### 관리자 기능
```
□ 로그인 페이지 표시
□ 올바른 비밀번호로 로그인
□ 잘못된 비밀번호 거부
□ 대시보드 통계 표시
□ 차트 렌더링
□ 업무 목록 표시
□ 상태별 필터링
□ 이름/부서 검색
□ 보고서 보기 링크
□ 이메일 발송 버튼
□ 코멘트 모달 열기
□ AI 내용 자동 채우기
□ 코멘트 저장
```

#### 휴지통 기능 ⚠️ 중요
```
□ 삭제 버튼 표시 (빨간색 + "삭제" 텍스트)
□ 삭제 확인 다이얼로그
□ 휴지통 이동 성공
□ 통계에서 삭제된 항목 제외
□ 목록에서 삭제된 항목 제외
□ 휴지통 카드 클릭
□ 휴지통 목록 표시
□ 남은 일수 표시
□ 복원 기능
□ 영구 삭제 기능
□ 30일 정리 기능
```

### 12.2 UI 테스트 ⚠️ 필수

```
□ 모든 버튼에 텍스트 레이블 있음
□ 삭제 버튼 빨간색 배경
□ 삭제 버튼에 "삭제" 텍스트 표시
□ 점수 옆에 "(100점 만점)" 표시
□ 인포 아이콘 호버 시 툴팁 표시
□ hover 효과 작동
□ 버튼 크기 일관성
```

### 12.3 반응형 테스트

```
□ 데스크톱 (1920px)
□ 노트북 (1366px)
□ 태블릿 (768px)
□ 모바일 (375px)
```

### 12.4 API 테스트

```bash
# 업무 등록
curl -X POST https://app.pages.dev/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"organization":"테스트","department":"개발팀","name":"홍길동","job_description":"문서 작성","repeat_cycle":"매일","automation_request":"자동화 원함","email":"test@test.com"}'

# 통계 조회
curl https://app.pages.dev/api/admin/stats

# 휴지통 조회
curl https://app.pages.dev/api/admin/trash

# 삭제
curl -X DELETE https://app.pages.dev/api/tasks/{id}

# 복원
curl -X POST https://app.pages.dev/api/tasks/{id}/restore

# 영구 삭제
curl -X DELETE https://app.pages.dev/api/tasks/{id}/permanent
```

---

## 13. 트러블슈팅 가이드

### 13.1 버튼/아이콘이 보이지 않음

**원인:**
- 아이콘만 사용하고 텍스트 없음
- 버튼 크기/색상 미흡
- 브라우저 캐시

**해결:**
```
1. 버튼에 텍스트 레이블 추가
2. 명확한 색상 적용 (삭제=빨강 등)
3. 강력 새로고침 (Ctrl+Shift+R)
4. 시크릿 모드에서 테스트
5. 새 배포 URL로 직접 접속
```

### 13.2 삭제 기능이 작동하지 않음

**원인:**
- deleted_at 컬럼 없음
- API 라우트 누락
- 프론트엔드 함수 누락

**해결:**
```
1. 마이그레이션으로 deleted_at 컬럼 추가
2. DELETE /api/tasks/:id 라우트 확인
3. deleteTask 함수 구현 확인
4. 빌드 파일에 함수 포함 확인: grep "deleteTask" dist/_worker.js
```

### 13.3 통계에 삭제된 항목 포함됨

**원인:**
- 쿼리에 deleted_at IS NULL 조건 누락

**해결:**
```sql
-- 모든 통계/목록 쿼리에 조건 추가
WHERE deleted_at IS NULL
```

### 13.4 점수가 이상하게 표시됨

**원인:**
- 정규화 로직 오류
- 만점 기준 불명확

**해결:**
```javascript
// 100점 만점으로 정규화
const normalizedScore = Math.min(100, Math.round(item.score * 2));
```

### 13.5 툴팁이 표시되지 않음

**원인:**
- CSS 클래스 오류
- z-index 문제
- 호버 이벤트 미작동

**해결:**
```
1. group/group-hover 클래스 확인
2. z-50 등 z-index 확인
3. opacity/visibility transition 확인
4. 부모 요소의 overflow 속성 확인
```

### 13.6 배포 후 변경사항 미반영

**원인:**
- 브라우저 캐시

**해결:**
```
1. 새 배포 URL로 직접 접속 (https://xxxxx.app.pages.dev)
2. 강력 새로고침 (Ctrl+Shift+R)
3. 시크릿 모드 사용
4. 개발자 도구 → Network → "Disable cache" 체크
```

### 13.7 Gemini API 오류

**원인:**
- API 키 미설정
- 잘못된 모델명
- 할당량 초과

**해결:**
```
1. 환경 변수 확인: npx wrangler pages secret list
2. 모델명 확인: gemini-2.5-flash (안정 버전 사용)
3. 폴백 로직 구현
```

### 13.8 D1 데이터베이스 오류

**원인:**
- database_id 불일치
- 마이그레이션 미적용

**해결:**
```
1. wrangler.jsonc의 database_id 확인
2. 마이그레이션 재실행:
   npx wrangler d1 migrations apply app-db --remote
```

---

## 14. 유지보수 가이드

### 14.1 정기 작업

#### 매주
```
□ 휴지통 정리 (30일 지난 항목)
  - POST /api/admin/trash/cleanup 호출
  - 또는 관리자 대시보드에서 "30일 지난 항목 정리" 버튼
□ 통계 확인
```

#### 매월
```
□ 데이터베이스 백업 (CSV 내보내기)
  - curl https://app.pages.dev/api/export/tasks > backup_YYYYMMDD.csv
□ 시드 데이터 업데이트 (새 AI 도구 추가)
□ 의존성 업데이트 검토
  - npm outdated
  - npm update
```

### 14.2 기능 추가 시 체크리스트

```
□ 데이터베이스 스키마 변경 필요 여부
  - 필요시 마이그레이션 파일 생성
□ 새 API 엔드포인트 필요 여부
□ UI 변경 범위 확인
  - 버튼: 텍스트 레이블 필수
  - 점수/복잡한 정보: 인포 아이콘 + 툴팁
□ 기존 기능 영향도 분석
□ 테스트 케이스 추가
□ 문서 업데이트
```

### 14.3 AI 도구 추가 절차

```bash
# 1. seed_tools.sql 수정
# INSERT OR REPLACE INTO ai_tools (...) VALUES (...);

# 2. 프로덕션 적용
npx wrangler d1 execute app-db --remote --file=./seed_tools.sql

# 3. 확인
curl https://app.pages.dev/api/tools | jq '.data | length'
```

---

## 15. 코드 스니펫 라이브러리

### 15.1 소프트 삭제 API

```typescript
// 소프트 삭제
app.delete('/api/tasks/:id', async (c) => {
  const taskId = c.req.param('id');
  const now = Date.now();
  
  const result = await c.env.DB.prepare(
    'UPDATE tasks SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL'
  ).bind(now, now, taskId).run();
  
  if (result.meta.changes === 0) {
    return c.json({ success: false, error: '삭제할 항목을 찾을 수 없습니다.' }, 404);
  }
  
  return c.json({ success: true, message: '휴지통으로 이동되었습니다.' });
});

// 복원
app.post('/api/tasks/:id/restore', async (c) => {
  const taskId = c.req.param('id');
  const now = Date.now();
  
  await c.env.DB.prepare(
    'UPDATE tasks SET deleted_at = NULL, updated_at = ? WHERE id = ?'
  ).bind(now, taskId).run();
  
  return c.json({ success: true, message: '복원되었습니다.' });
});

// 영구 삭제
app.delete('/api/tasks/:id/permanent', async (c) => {
  const taskId = c.req.param('id');
  
  await c.env.DB.prepare('DELETE FROM tasks WHERE id = ?').bind(taskId).run();
  
  return c.json({ success: true, message: '영구 삭제되었습니다.' });
});

// 휴지통 목록
app.get('/api/admin/trash', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM tasks WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC'
  ).all();
  
  return c.json({ 
    success: true, 
    data: results,
    total: results.length,
    note: '30일 후 영구 삭제됩니다.'
  });
});

// 30일 경과 항목 정리
app.post('/api/admin/trash/cleanup', async (c) => {
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  
  const result = await c.env.DB.prepare(
    'DELETE FROM tasks WHERE deleted_at IS NOT NULL AND deleted_at < ?'
  ).bind(thirtyDaysAgo).run();
  
  return c.json({ 
    success: true, 
    message: `${result.meta.changes}개 항목이 영구 삭제되었습니다.`,
    deleted_count: result.meta.changes
  });
});
```

### 15.2 프론트엔드 삭제 함수

```javascript
// 삭제 함수
async function deleteTask(taskId, taskName) {
  if (!confirm(`"${taskName}" 님의 업무를 휴지통으로 이동하시겠습니까?`)) {
    return;
  }
  
  try {
    const response = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
    const result = await response.json();
    
    if (result.success) {
      alert('휴지통으로 이동되었습니다.');
      loadDashboard(); // 목록 새로고침
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    alert('삭제 실패: ' + error.message);
  }
}

// 복원 함수
async function restoreTask(taskId, taskName) {
  if (!confirm(`"${taskName}" 님의 업무를 복원하시겠습니까?`)) {
    return;
  }
  
  try {
    const response = await fetch(`/api/tasks/${taskId}/restore`, { method: 'POST' });
    const result = await response.json();
    
    if (result.success) {
      alert('복원되었습니다.');
      loadTrash(); // 휴지통 새로고침
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    alert('복원 실패: ' + error.message);
  }
}

// 영구 삭제 함수
async function permanentDeleteTask(taskId, taskName) {
  if (!confirm(`⚠️ "${taskName}" 님의 업무를 영구 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`)) {
    return;
  }
  
  try {
    const response = await fetch(`/api/tasks/${taskId}/permanent`, { method: 'DELETE' });
    const result = await response.json();
    
    if (result.success) {
      alert('영구 삭제되었습니다.');
      loadTrash();
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    alert('삭제 실패: ' + error.message);
  }
}
```

### 15.3 삭제 버튼 HTML

```javascript
// ⚠️ 반드시 텍스트 포함!
`<button onclick="deleteTask('${task.id}', '${task.name}')" 
   class="px-3 py-1 text-sm bg-red-100 text-red-600 rounded hover:bg-red-200">
  <i class="fas fa-trash-alt mr-1"></i>삭제
</button>`
```

### 15.4 인포 아이콘 + 툴팁

```html
<span class="relative inline-block ml-2 group cursor-help">
  <i class="fas fa-info-circle text-gray-400 text-sm hover:text-purple-600 transition"></i>
  <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-4 py-3 
              bg-gray-800 text-white text-xs rounded-lg shadow-lg 
              opacity-0 invisible group-hover:opacity-100 group-hover:visible 
              transition-all duration-200 w-72 z-50">
    <div class="font-bold mb-2 text-purple-300">추천 점수 안내</div>
    <ul class="space-y-1 text-gray-200">
      <li>• <strong>100점 만점</strong> 기준으로 산정</li>
      <li>• 업무 키워드 일치도 (40%)</li>
      <li>• 도구 평점 및 인기도 (30%)</li>
      <li>• 사용 난이도/접근성 (20%)</li>
      <li>• 가격 접근성 (10%)</li>
    </ul>
    <div class="mt-2 pt-2 border-t border-gray-600 text-gray-300">
      점수가 높을수록 업무에 적합합니다.
    </div>
    <div class="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 
                border-8 border-transparent border-t-gray-800"></div>
  </div>
</span>
```

### 15.5 점수 표시

```javascript
`<div class="text-right">
  <p class="text-sm text-gray-500">추천점수</p>
  <p class="text-xl font-bold text-purple-600">${Math.min(100, Math.round(item.score * 2))}점</p>
  <p class="text-xs text-gray-400">(100점 만점)</p>
</div>`
```

### 15.6 통계 쿼리

```sql
-- 전체 통계 (삭제된 항목 제외)
SELECT COUNT(*) as total FROM tasks WHERE deleted_at IS NULL;

-- 상태별 통계
SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN status = 'analyzed' THEN 1 ELSE 0 END) as analyzed,
  SUM(CASE WHEN status = 'commented' THEN 1 ELSE 0 END) as commented,
  SUM(CASE WHEN coach_comment_status = 'none' THEN 1 ELSE 0 END) as pending
FROM tasks WHERE deleted_at IS NULL;

-- 휴지통 통계
SELECT COUNT(*) as trash_count FROM tasks WHERE deleted_at IS NOT NULL;

-- 카테고리별 통계
SELECT task_category, COUNT(*) as count 
FROM tasks 
WHERE deleted_at IS NULL 
GROUP BY task_category;

-- 최근 7일 등록 추이
SELECT DATE(created_at/1000, 'unixepoch') as date, COUNT(*) as count
FROM tasks
WHERE deleted_at IS NULL AND created_at > ?
GROUP BY date
ORDER BY date;
```

---

## 16. 최종 점검 체크리스트

### 개발 완료 전 필수 확인 ✅

#### 데이터베이스
```
□ 모든 테이블에 deleted_at 컬럼 있음
□ deleted_at 인덱스 생성됨
□ 모든 조회 쿼리에 deleted_at IS NULL 조건 있음
□ 시드 데이터 적용됨
```

#### API
```
□ DELETE /api/tasks/:id 라우트 있음 (소프트 삭제)
□ POST /api/tasks/:id/restore 라우트 있음 (복원)
□ DELETE /api/tasks/:id/permanent 라우트 있음 (영구 삭제)
□ GET /api/admin/trash 라우트 있음 (휴지통 목록)
□ POST /api/admin/trash/cleanup 라우트 있음 (30일 정리)
□ 통계 API에 삭제된 항목 제외됨
□ 통계 API에 휴지통 카운트 포함
```

#### UI - 버튼
```
□ 삭제 버튼에 "삭제" 텍스트 포함
□ 삭제 버튼 빨간색 스타일 적용
□ 복원 버튼에 "복원" 텍스트 포함
□ 모든 버튼에 hover 효과 있음
```

#### UI - 점수/정보 표시
```
□ 점수 XX점 (100점 만점) 형식으로 표시
□ 인포 아이콘 있음
□ 호버 시 툴팁 표시됨
□ 툴팁에 점수 산정 기준 설명 포함
```

#### UI - 휴지통
```
□ 휴지통 통계 카드 있음
□ 휴지통 카드 클릭 시 목록 표시
□ 휴지통 항목에 남은 일수 표시
□ 복원/영구삭제 버튼 있음
□ 30일 정리 버튼 있음
```

#### 테스트
```
□ 업무 등록 → AI 분석 성공
□ 보고서 페이지 정상 표시
□ 점수 + 인포 아이콘 툴팁 동작
□ 삭제 → 휴지통 이동 확인
□ 휴지통에서 복원 확인
□ 영구 삭제 확인
□ 통계에서 삭제된 항목 제외 확인
□ 목록에서 삭제된 항목 제외 확인
□ 새 배포 URL로 테스트 (캐시 우회)
```

---

## 문서 정보

**문서 버전**: 2.0  
**최종 수정일**: 2026-01-19  
**작성자**: AI 코칭 가이드 개발팀  
**참조 프로젝트**: ai-coaching-guide (ai114.xyz)

### 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
| 1.0 | 2026-01-18 | 초기 버전 |
| 2.0 | 2026-01-19 | 실제 발생 문제 및 해결책 추가, 점수 시스템 설계, 인포 아이콘+툴팁 패턴, 코드 스니펫 확장 |

---

## 부록: 프로젝트 URL 정보

| 항목 | URL |
|------|-----|
| 프로덕션 | https://ai114.xyz |
| 관리자 | https://ai114.xyz/coach |
| 개발 가이드 PDF | https://ai114.xyz/docs/app-development-guide.html |
| Cloudflare Pages | https://ai-coaching-guide.pages.dev |
| GitHub | (설정된 경우 표시) |

**관리자 비밀번호**: 환경 변수 또는 별도 문서 참조
