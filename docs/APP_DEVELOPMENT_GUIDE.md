# AI 코칭 웹앱 개발 종합 지침서

## 📋 목차
1. [프로젝트 개요](#1-프로젝트-개요)
2. [개발 전 준비 체크리스트](#2-개발-전-준비-체크리스트)
3. [기술 스택 및 아키텍처](#3-기술-스택-및-아키텍처)
4. [데이터베이스 설계](#4-데이터베이스-설계)
5. [API 설계](#5-api-설계)
6. [UI/UX 설계](#6-uiux-설계)
7. [단계별 개발 프로세스](#7-단계별-개발-프로세스)
8. [배포 프로세스](#8-배포-프로세스)
9. [테스트 체크리스트](#9-테스트-체크리스트)
10. [트러블슈팅 가이드](#10-트러블슈팅-가이드)
11. [유지보수 가이드](#11-유지보수-가이드)

---

## 1. 프로젝트 개요

### 1.1 앱 목적
- 수강생 업무 입력 → AI 분석 → 맞춤형 도구 추천 및 워크플로우 코칭 제공
- 관리자(코치) 대시보드를 통한 수강생 관리 및 코멘트 작성

### 1.2 주요 기능
| 구분 | 기능 | 설명 |
|------|------|------|
| 수강생 | 업무 입력 | 폼을 통한 업무 정보 제출 |
| 수강생 | 분석 보고서 | AI 추천 도구 및 워크플로우 확인 |
| 수강생 | PDF 다운로드 | 보고서 PDF 저장 |
| 관리자 | 대시보드 | 전체 수강생 업무 목록 및 통계 |
| 관리자 | 코멘트 작성 | AI 코칭 내용 기반 코멘트 |
| 관리자 | 휴지통 관리 | 소프트 삭제 및 복원 |
| 관리자 | CSV 내보내기/가져오기 | 대량 데이터 관리 |
| 시스템 | 이메일 알림 | Gmail 연동 보고서/코멘트 발송 |

### 1.3 사용자 역할
- **수강생**: 업무 입력, 보고서 확인
- **코치(관리자)**: 전체 관리, 코멘트 작성, 통계 확인

---

## 2. 개발 전 준비 체크리스트

### 2.1 필수 확인 사항 ⚠️

#### API 키 및 인증
- [ ] **Cloudflare API 토큰** 준비 (또는 발급 방법 안내)
- [ ] **Gemini API 키** 준비 (또는 발급 방법 안내)
- [ ] **GitHub 연동** 설정 확인 (선택사항)

#### 데이터베이스 설계 확정
- [ ] 모든 테이블 스키마 확정
- [ ] **소프트 삭제(deleted_at) 컬럼** 포함 여부 결정
- [ ] 인덱스 설계 완료
- [ ] 시드 데이터 준비

#### UI/UX 요구사항 확정
- [ ] 모든 페이지 목록 확정
- [ ] 각 페이지별 기능 목록 확정
- [ ] **버튼/아이콘 디자인 명세** (텍스트 포함 여부, 색상, 크기)
- [ ] 모달/팝업 디자인 확정
- [ ] 반응형 레이아웃 기준점 확정

#### 기능 요구사항 확정
- [ ] CRUD 기능 전체 목록
- [ ] **삭제 방식** 결정 (소프트 삭제 vs 하드 삭제)
- [ ] 필터링/검색 기능 범위
- [ ] 통계 항목 목록
- [ ] 내보내기/가져오기 형식

### 2.2 기술적 준비사항

#### Cloudflare 서비스
```
□ D1 Database 생성 및 ID 확인
□ Pages 프로젝트 생성
□ 환경 변수 설정 (API 키 등)
□ 커스텀 도메인 설정 (선택)
```

#### 개발 환경
```
□ Node.js 18+ 설치
□ Wrangler CLI 설치 및 인증
□ Git 초기화
□ .gitignore 설정
```

### 2.3 설계 문서 준비

#### 필수 문서
1. **데이터베이스 ERD** - 테이블 관계도
2. **API 명세서** - 모든 엔드포인트 목록
3. **화면 설계서** - 각 페이지 와이어프레임
4. **기능 명세서** - 상세 기능 설명

---

## 3. 기술 스택 및 아키텍처

### 3.1 기술 스택
| 계층 | 기술 | 버전/비고 |
|------|------|----------|
| 프레임워크 | Hono | ^4.0.0 |
| 런타임 | Cloudflare Workers | Edge Runtime |
| 데이터베이스 | Cloudflare D1 | SQLite 기반 |
| 빌드 도구 | Vite | ^5.0.0 |
| 언어 | TypeScript | ^5.0.0 |
| 스타일링 | Tailwind CSS | CDN 방식 |
| 아이콘 | FontAwesome | CDN 방식 |
| AI | Google Gemini API | gemini-2.5-flash |

### 3.2 프로젝트 구조
```
webapp/
├── src/
│   ├── index.tsx          # 메인 앱 (라우트 + HTML 렌더링)
│   └── lib/
│       ├── types.ts       # TypeScript 타입 정의
│       ├── recommendation.ts  # 추천 로직
│       └── gemini.ts      # AI API 연동
├── public/
│   └── static/            # 정적 파일
├── migrations/
│   ├── 0001_initial_schema.sql
│   └── 0002_add_deleted_at.sql
├── wrangler.jsonc         # Cloudflare 설정
├── vite.config.ts         # Vite 설정
├── package.json
├── tsconfig.json
└── ecosystem.config.cjs   # PM2 설정 (로컬 개발용)
```

### 3.3 아키텍처 다이어그램
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Browser   │────▶│  Cloudflare │────▶│  D1 Database│
│  (Client)   │     │   Workers   │     │   (SQLite)  │
└─────────────┘     └──────┬──────┘     └─────────────┘
                          │
                          ▼
                   ┌─────────────┐
                   │  Gemini API │
                   │   (Google)  │
                   └─────────────┘
```

---

## 4. 데이터베이스 설계

### 4.1 테이블 스키마

#### tasks 테이블 (업무)
```sql
CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    organization TEXT NOT NULL,        -- 소속/조직
    department TEXT NOT NULL,          -- 부서
    name TEXT NOT NULL,                -- 이름
    job_description TEXT NOT NULL,     -- 업무 설명
    repeat_cycle TEXT NOT NULL,        -- 반복 주기
    automation_request TEXT NOT NULL,  -- 자동화 요청사항
    email TEXT NOT NULL,               -- 이메일
    current_tools TEXT,                -- 현재 사용 도구
    estimated_hours REAL DEFAULT 1,    -- 예상 소요시간 (기본 1시간)
    recommended_tools TEXT,            -- AI 추천 결과 (JSON)
    task_category TEXT,                -- 업무 카테고리
    automation_level TEXT,             -- 자동화 수준 (full/semi/assist)
    status TEXT DEFAULT 'pending',     -- 상태 (pending/analyzed/commented)
    coach_comment_status TEXT DEFAULT 'none',  -- 코멘트 상태
    deleted_at INTEGER DEFAULT NULL,   -- ⚠️ 소프트 삭제용 (필수!)
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- 인덱스
CREATE INDEX idx_tasks_deleted_at ON tasks(deleted_at);
CREATE INDEX idx_tasks_email ON tasks(email);
CREATE INDEX idx_tasks_status ON tasks(status);
```

#### comments 테이블 (코치 코멘트)
```sql
CREATE TABLE comments (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    additional_tools TEXT,
    tool_explanation TEXT,
    tips TEXT,
    learning_priority TEXT,
    general_comment TEXT,
    status TEXT DEFAULT 'draft',       -- draft/published
    coach_name TEXT DEFAULT '디마불사',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);
```

#### ai_tools 테이블 (AI 도구 마스터)
```sql
CREATE TABLE ai_tools (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    subcategory TEXT,
    description TEXT NOT NULL,
    website_url TEXT,
    use_cases TEXT NOT NULL,
    keywords TEXT NOT NULL,
    automation_level TEXT NOT NULL,    -- full/semi/assist
    difficulty TEXT NOT NULL,          -- beginner/intermediate/advanced
    pricing_type TEXT NOT NULL,        -- free/freemium/paid
    pricing_detail TEXT,
    rating REAL DEFAULT 4.0,
    popularity INTEGER DEFAULT 50,
    is_active INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);
```

### 4.2 설계 원칙 ⚠️ 중요

#### 소프트 삭제 필수 적용
```sql
-- 모든 주요 테이블에 deleted_at 컬럼 추가
ALTER TABLE {table_name} ADD COLUMN deleted_at INTEGER DEFAULT NULL;
CREATE INDEX idx_{table_name}_deleted_at ON {table_name}(deleted_at);
```

#### 모든 조회 쿼리에 삭제 필터 적용
```sql
-- ❌ 잘못된 예
SELECT * FROM tasks ORDER BY created_at DESC;

-- ✅ 올바른 예
SELECT * FROM tasks WHERE deleted_at IS NULL ORDER BY created_at DESC;
```

---

## 5. API 설계

### 5.1 API 엔드포인트 전체 목록

#### 공개 API (인증 불필요)
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/tools` | AI 도구 목록 조회 |
| GET | `/api/tools/categories` | 카테고리별 통계 |
| POST | `/api/tasks` | 업무 등록 + AI 분석 |
| GET | `/api/tasks/:id` | 특정 업무 조회 |
| GET | `/api/tasks?email=xxx` | 이메일별 업무 조회 |
| GET | `/api/history/:email` | 수강생 이력 조회 |

#### 관리자 API (비밀번호 인증)
| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/admin/login` | 관리자 로그인 |
| GET | `/api/admin/tasks` | 전체 업무 목록 |
| GET | `/api/admin/stats` | 통계 데이터 |
| POST | `/api/admin/comments` | 코멘트 저장 |
| GET | `/api/admin/trash` | 휴지통 목록 |
| POST | `/api/admin/trash/cleanup` | 30일 지난 항목 정리 |

#### CRUD API
| 메서드 | 경로 | 설명 |
|--------|------|------|
| DELETE | `/api/tasks/:id` | 소프트 삭제 (휴지통 이동) |
| POST | `/api/tasks/:id/restore` | 휴지통에서 복원 |
| DELETE | `/api/tasks/:id/permanent` | 영구 삭제 |

#### 유틸리티 API
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/export/tasks` | CSV 내보내기 |
| POST | `/api/import/tasks` | CSV 가져오기 |
| POST | `/api/email/compose` | Gmail 작성 URL 생성 |
| GET | `/api/init` | DB 초기화 (개발용) |

#### 페이지 라우트
| 경로 | 설명 |
|------|------|
| `/` | 홈페이지 |
| `/submit` | 업무 입력 폼 |
| `/report/:id` | 분석 보고서 |
| `/coach` | 관리자 대시보드 |
| `/history` | 수강생 이력 조회 |

### 5.2 API 응답 형식
```typescript
// 성공 응답
{
  success: true,
  data: { ... }
}

// 실패 응답
{
  success: false,
  error: "에러 메시지"
}
```

---

## 6. UI/UX 설계

### 6.1 버튼 디자인 가이드 ⚠️ 중요

#### 버튼 스타일 표준
```html
<!-- 기본 버튼 (회색) -->
<button class="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200">
  <i class="fas fa-eye mr-1"></i>보기
</button>

<!-- 주요 액션 버튼 (보라색) -->
<button class="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700">
  <i class="fas fa-comment mr-1"></i>코멘트
</button>

<!-- 보조 버튼 (파란색) -->
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
```

#### 버튼 설계 원칙
1. **아이콘만 사용하지 않기** - 반드시 텍스트 레이블 포함
2. **일관된 크기** - `px-3 py-1 text-sm` 통일
3. **색상 코드화** - 액션별 색상 구분
4. **hover 효과** - 모든 버튼에 hover 스타일 적용

### 6.2 레이아웃 구조

#### 목록 아이템 구조
```html
<div class="border rounded-xl p-5 hover:shadow-md transition">
  <div class="flex justify-between items-start flex-wrap gap-4">
    <!-- 좌측: 정보 영역 -->
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2 mb-2 flex-wrap">
        <h3 class="font-bold text-gray-800">{이름}</h3>
        <span class="text-sm text-gray-500">{부서}</span>
        <!-- 상태 뱃지들 -->
      </div>
      <p class="text-gray-600 text-sm mb-2 truncate">{설명}</p>
      <p class="text-gray-500 text-xs">{날짜} | {이메일}</p>
    </div>
    
    <!-- 우측: 버튼 영역 -->
    <div class="flex gap-2 flex-wrap items-center">
      <!-- 버튼들 (보기, 메일, 코멘트, 삭제 등) -->
    </div>
  </div>
</div>
```

### 6.3 모달 구조
```html
<div id="modal-name" class="hidden fixed inset-0 bg-black/50 flex items-center justify-center z-50">
  <div class="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
    <h2 class="text-xl font-bold text-gray-800 mb-6">
      <i class="fas fa-icon text-purple-600 mr-2"></i>모달 제목
    </h2>
    <!-- 모달 내용 -->
    <div class="flex justify-end gap-4 mt-6">
      <button onclick="closeModal()" class="px-6 py-2 border border-gray-300 rounded-lg">취소</button>
      <button class="px-6 py-2 bg-purple-600 text-white rounded-lg">확인</button>
    </div>
  </div>
</div>
```

### 6.4 통계 카드 구조
```html
<div class="grid md:grid-cols-5 gap-4 mb-8" id="stats-cards">
  <!-- 각 카드 -->
  <div class="bg-white rounded-xl p-6 shadow-sm">
    <div class="flex items-center gap-4">
      <div class="w-12 h-12 bg-{color}-100 rounded-full flex items-center justify-center">
        <i class="fas fa-{icon} text-{color}-600 text-xl"></i>
      </div>
      <div>
        <p class="text-sm text-gray-500">{레이블}</p>
        <p class="text-2xl font-bold text-gray-800">{값}</p>
      </div>
    </div>
  </div>
</div>
```

---

## 7. 단계별 개발 프로세스

### Phase 1: 프로젝트 초기화 (30분)

#### Step 1.1: Hono 프로젝트 생성
```bash
cd /home/user
npm create -y hono@latest webapp -- --template cloudflare-pages --install --pm npm
cd webapp
```

#### Step 1.2: Git 초기화
```bash
git init
cat > .gitignore << 'EOF'
node_modules/
dist/
.wrangler/
.dev.vars
*.log
EOF
git add .
git commit -m "Initial commit"
```

#### Step 1.3: wrangler.jsonc 설정
```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "app-name",
  "compatibility_date": "2024-01-01",
  "pages_build_output_dir": "./dist",
  "compatibility_flags": ["nodejs_compat"],
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "app-db",
      "database_id": "your-database-id"
    }
  ]
}
```

### Phase 2: 데이터베이스 설정 (30분)

#### Step 2.1: D1 데이터베이스 생성
```bash
npx wrangler d1 create app-db
# 출력된 database_id를 wrangler.jsonc에 복사
```

#### Step 2.2: 마이그레이션 파일 생성
```bash
mkdir migrations

# 0001_initial_schema.sql
# 0002_add_deleted_at.sql (소프트 삭제용)
```

#### Step 2.3: 마이그레이션 실행
```bash
# 로컬
npx wrangler d1 migrations apply app-db --local

# 프로덕션
npx wrangler d1 migrations apply app-db --remote
```

### Phase 3: 백엔드 개발 (2-3시간)

#### Step 3.1: 타입 정의 (src/lib/types.ts)
```typescript
export interface Task {
  id: string;
  organization: string;
  department: string;
  name: string;
  job_description: string;
  repeat_cycle: string;
  automation_request: string;
  email: string;
  current_tools: string | null;
  estimated_hours: number;
  recommended_tools: string | null;
  task_category: string | null;
  automation_level: string | null;
  status: 'pending' | 'analyzed' | 'commented';
  coach_comment_status: 'none' | 'draft' | 'published';
  deleted_at: number | null;  // ⚠️ 소프트 삭제용
  created_at: number;
  updated_at: number;
}

export type Bindings = {
  DB: D1Database;
  GEMINI_API_KEY: string;
}
```

#### Step 3.2: API 라우트 구현 (src/index.tsx)
1. 유틸리티 함수 (generateId, formatDate)
2. DB 초기화 함수
3. 공개 API 라우트
4. 관리자 API 라우트
5. CRUD API 라우트 (삭제/복원 포함)
6. 휴지통 API 라우트

#### Step 3.3: AI 연동 (src/lib/gemini.ts)
```typescript
export async function callGeminiAPI(apiKey: string, prompt: string): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192,
        }
      })
    }
  );
  // ... 응답 처리
}
```

### Phase 4: 프론트엔드 개발 (2-3시간)

#### Step 4.1: 페이지별 HTML 렌더링 함수
- renderHomePage()
- renderSubmitPage()
- renderReportPage()
- renderCoachDashboard()
- renderHistoryPage()

#### Step 4.2: JavaScript 기능 구현
- 폼 제출 및 유효성 검사
- API 호출 및 데이터 렌더링
- 모달 열기/닫기
- 필터링 및 검색
- **삭제/복원 기능** (⚠️ 누락 주의)

#### Step 4.3: 차트 및 통계
```javascript
// Chart.js CDN 사용
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
```

### Phase 5: 테스트 및 디버깅 (1시간)

#### Step 5.1: 로컬 테스트
```bash
npm run build
pm2 start ecosystem.config.cjs
curl http://localhost:3000/api/init
```

#### Step 5.2: 기능 테스트
- [ ] 업무 등록 → AI 분석 확인
- [ ] 보고서 페이지 렌더링
- [ ] PDF 다운로드
- [ ] 관리자 로그인
- [ ] 코멘트 작성
- [ ] **삭제 버튼 표시 확인** ⚠️
- [ ] 휴지통 기능
- [ ] 복원 기능
- [ ] 통계 정확성

### Phase 6: 배포 (30분)

#### Step 6.1: Cloudflare API 키 설정
```bash
# setup_cloudflare_api_key 도구 호출
npx wrangler whoami  # 인증 확인
```

#### Step 6.2: 환경 변수 설정
```bash
npx wrangler pages secret put GEMINI_API_KEY --project-name app-name
```

#### Step 6.3: 배포
```bash
npm run build
npx wrangler pages deploy dist --project-name app-name
```

#### Step 6.4: 프로덕션 DB 초기화
```bash
# 시드 데이터 적용
npx wrangler d1 execute app-db --remote --file=./seed_tools.sql
```

---

## 8. 배포 프로세스

### 8.1 첫 배포 체크리스트
```
□ Cloudflare API 키 설정 완료
□ D1 데이터베이스 생성 완료
□ wrangler.jsonc에 database_id 설정
□ 마이그레이션 실행 (로컬 + 리모트)
□ 시드 데이터 적용
□ 환경 변수 설정 (GEMINI_API_KEY)
□ 빌드 성공 확인
□ 배포 성공 확인
□ 프로덕션 테스트
```

### 8.2 업데이트 배포
```bash
# 1. 변경사항 빌드
npm run build

# 2. Git 커밋
git add .
git commit -m "feat: 기능 설명"

# 3. 배포
npx wrangler pages deploy dist --project-name app-name

# 4. 프로덕션 테스트
curl https://app-name.pages.dev/api/admin/stats
```

### 8.3 DB 스키마 변경 시
```bash
# 1. 마이그레이션 파일 생성
# migrations/0003_new_feature.sql

# 2. 로컬 테스트
npx wrangler d1 migrations apply app-db --local

# 3. 프로덕션 적용
npx wrangler d1 migrations apply app-db --remote

# 4. 코드 배포
npm run build
npx wrangler pages deploy dist --project-name app-name
```

---

## 9. 테스트 체크리스트

### 9.1 기능 테스트 ✅

#### 수강생 기능
- [ ] 홈페이지 정상 로드
- [ ] 업무 입력 폼 표시
- [ ] 필수 필드 유효성 검사
- [ ] 업무 제출 성공
- [ ] AI 분석 결과 표시
- [ ] 보고서 페이지 로드
- [ ] PDF 다운로드
- [ ] 공유 기능

#### 관리자 기능
- [ ] 로그인 페이지 표시
- [ ] 올바른 비밀번호로 로그인
- [ ] 잘못된 비밀번호 거부
- [ ] 대시보드 통계 표시
- [ ] 차트 렌더링
- [ ] 업무 목록 표시
- [ ] 상태별 필터링
- [ ] 이름/부서 검색
- [ ] 보고서 보기 링크
- [ ] 이메일 발송 버튼
- [ ] 코멘트 모달 열기
- [ ] AI 내용 자동 채우기
- [ ] 코멘트 저장
- [ ] **삭제 버튼 표시** ⚠️
- [ ] 삭제 확인 다이얼로그
- [ ] 휴지통 이동 성공
- [ ] 휴지통 카드 클릭
- [ ] 휴지통 목록 표시
- [ ] 복원 기능
- [ ] 영구 삭제 기능
- [ ] CSV 내보내기
- [ ] CSV 가져오기

### 9.2 UI 테스트 ✅

#### 버튼 확인 (⚠️ 중요)
- [ ] 모든 버튼에 텍스트 레이블 있음
- [ ] 삭제 버튼 빨간색 배경
- [ ] 삭제 버튼에 "삭제" 텍스트 표시
- [ ] hover 효과 작동
- [ ] 버튼 크기 일관성

#### 반응형 테스트
- [ ] 데스크톱 (1920px)
- [ ] 노트북 (1366px)
- [ ] 태블릿 (768px)
- [ ] 모바일 (375px)

### 9.3 API 테스트 ✅
```bash
# 업무 등록
curl -X POST https://app.pages.dev/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"organization":"테스트","department":"개발팀",...}'

# 통계 조회
curl https://app.pages.dev/api/admin/stats

# 휴지통 조회
curl https://app.pages.dev/api/admin/trash

# 삭제
curl -X DELETE https://app.pages.dev/api/tasks/{id}

# 복원
curl -X POST https://app.pages.dev/api/tasks/{id}/restore
```

---

## 10. 트러블슈팅 가이드

### 10.1 흔한 문제 및 해결책

#### 버튼/아이콘이 보이지 않음
**원인**: 아이콘만 사용하고 텍스트 없음, 또는 빌드 캐시
**해결**:
1. 버튼에 텍스트 레이블 추가
2. 강력 새로고침 (Ctrl+Shift+R)
3. 시크릿 모드에서 테스트

#### 삭제 기능이 작동하지 않음
**원인**: deleted_at 컬럼 없음, 또는 API 라우트 누락
**해결**:
1. 마이그레이션으로 deleted_at 컬럼 추가
2. DELETE /api/tasks/:id 라우트 확인
3. 프론트엔드 deleteTask 함수 확인

#### 통계에 삭제된 항목 포함됨
**원인**: 쿼리에 deleted_at IS NULL 조건 누락
**해결**: 모든 통계/목록 쿼리에 조건 추가
```sql
WHERE deleted_at IS NULL
```

#### D1 데이터베이스 오류
**원인**: database_id 불일치, 또는 마이그레이션 미적용
**해결**:
1. wrangler.jsonc의 database_id 확인
2. 마이그레이션 재실행

#### Gemini API 오류
**원인**: API 키 미설정, 또는 잘못된 모델명
**해결**:
1. 환경 변수 확인: `npx wrangler pages secret list`
2. 모델명 확인: `gemini-2.5-flash`

#### 배포 후 변경사항 미반영
**원인**: 브라우저 캐시
**해결**:
1. 새 배포 URL로 직접 접속
2. 강력 새로고침
3. 시크릿 모드 사용

### 10.2 디버깅 팁

#### 로컬 개발 시
```bash
# 로그 확인
pm2 logs --nostream

# 빌드 파일 확인
grep "특정문자열" dist/_worker.js
```

#### 프로덕션 디버깅
```bash
# 배포된 HTML 확인
curl -s https://app.pages.dev/coach | grep "deleteTask"

# API 응답 확인
curl -s https://app.pages.dev/api/admin/stats | jq
```

---

## 11. 유지보수 가이드

### 11.1 정기 작업

#### 매주
- [ ] 휴지통 정리 (30일 지난 항목)
- [ ] 통계 확인

#### 매월
- [ ] 데이터베이스 백업
- [ ] 시드 데이터 업데이트 (새 AI 도구 추가)
- [ ] 의존성 업데이트 검토

### 11.2 기능 추가 시 체크리스트
```
□ 데이터베이스 스키마 변경 필요 여부
□ 새 API 엔드포인트 필요 여부
□ UI 변경 범위 확인
□ 기존 기능 영향도 분석
□ 테스트 케이스 추가
□ 문서 업데이트
```

### 11.3 백업 절차
```bash
# D1 데이터 백업 (CSV 내보내기)
curl https://app.pages.dev/api/export/tasks > backup_$(date +%Y%m%d).csv

# 코드 백업
git push origin main
```

---

## 부록: 코드 스니펫

### A. 소프트 삭제 구현 패턴

#### API 라우트
```typescript
// 소프트 삭제
app.delete('/api/tasks/:id', async (c) => {
  const taskId = c.req.param('id');
  const now = Date.now();
  
  await c.env.DB.prepare(
    'UPDATE tasks SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL'
  ).bind(now, now, taskId).run();
  
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
```

#### 프론트엔드
```javascript
// 삭제 함수
async function deleteTask(taskId, taskName) {
  if (!confirm(`"${taskName}" 님의 업무를 휴지통으로 이동하시겠습니까?`)) {
    return;
  }
  
  const response = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
  const result = await response.json();
  
  if (result.success) {
    alert('휴지통으로 이동되었습니다.');
    loadDashboard();
  }
}

// 삭제 버튼 (⚠️ 반드시 텍스트 포함!)
`<button onclick="deleteTask('${task.id}', '${task.name}')" 
   class="px-3 py-1 text-sm bg-red-100 text-red-600 rounded hover:bg-red-200">
  <i class="fas fa-trash-alt mr-1"></i>삭제
</button>`
```

### B. 통계 쿼리 패턴
```sql
-- 전체 통계 (삭제된 항목 제외)
SELECT COUNT(*) FROM tasks WHERE deleted_at IS NULL;

-- 휴지통 통계
SELECT COUNT(*) FROM tasks WHERE deleted_at IS NOT NULL;

-- 카테고리별 통계 (삭제된 항목 제외)
SELECT task_category, COUNT(*) 
FROM tasks 
WHERE deleted_at IS NULL 
GROUP BY task_category;
```

---

## 최종 점검 체크리스트

### 개발 완료 전 필수 확인 ✅

```
데이터베이스
□ 모든 테이블에 deleted_at 컬럼 있음
□ deleted_at 인덱스 생성됨
□ 모든 조회 쿼리에 deleted_at IS NULL 조건 있음

API
□ DELETE /api/tasks/:id 라우트 있음
□ POST /api/tasks/:id/restore 라우트 있음
□ DELETE /api/tasks/:id/permanent 라우트 있음
□ GET /api/admin/trash 라우트 있음
□ 통계 API에 휴지통 카운트 포함

UI
□ 삭제 버튼에 "삭제" 텍스트 포함
□ 삭제 버튼 빨간색 스타일 적용
□ 휴지통 통계 카드 있음
□ 휴지통 보기 기능 있음
□ 복원/영구삭제 버튼 있음

테스트
□ 삭제 → 휴지통 이동 확인
□ 휴지통에서 복원 확인
□ 영구 삭제 확인
□ 통계에서 삭제된 항목 제외 확인
□ 목록에서 삭제된 항목 제외 확인
```

---

**문서 버전**: 1.0  
**최종 수정일**: 2026-01-18  
**작성자**: AI 코칭 가이드 개발팀
