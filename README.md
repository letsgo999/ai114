# AI 활용 업무 자동화 코칭 가이드

AI공부방 10기 수강생을 위한 업무 자동화 코칭 가이드 웹앱

## 프로젝트 개요

- **이름**: AI 활용 업무 자동화 코칭 가이드
- **목표**: 반복 업무를 입력하면 최신 AI 도구를 추천하고, 자가진단 보고서(PDF)와 코치 코멘트를 제공하는 코칭 시스템
- **대상**: AI공부방 10기 수강생
- **코치**: 디마불사 (디지털 마케팅 프로 컨설턴트)

## 주요 기능

### ✅ 완료된 기능 (Phase 1 + Phase 2)

#### Phase 1 (기본 기능)
1. **메인 랜딩 페이지**: AI 도구 카테고리 표시, 서비스 소개
2. **업무 입력 폼**: 반복 업무 정보 입력 (조직, 부서, 이름, 직무, 반복주기, 자동화 요청)
3. **AI 도구 자동 추천 엔진**: 키워드 기반 매칭 + 점수 산정으로 TOP 5 도구 추천
4. **자가진단 보고서 페이지**: 업무 요약, 분석 결과, 추천 도구, 코치 코멘트 표시
5. **PDF 다운로드**: jsPDF + html2canvas 기반 보고서 다운로드
6. **코치 대시보드**: 간단 비밀번호 인증, 수강생 업무 목록 조회, 코멘트 작성

#### Phase 2 (확장 기능)
1. **Gmail Compose URL 알림**: 보고서/코멘트 알림을 Gmail로 손쉽게 전송
2. **CSV 업로드 (대량 등록)**: 여러 수강생 업무를 CSV로 일괄 등록
3. **CSV 다운로드**: 전체 업무 및 코멘트 데이터를 CSV로 내보내기
4. **통계 대시보드**: Chart.js 기반 카테고리별/자동화 수준별 차트 시각화
5. **수강생별 히스토리 뷰**: 이메일로 자신의 업무 이력 조회

## 페이지 및 API 엔드포인트

### 페이지 라우트

| 경로 | 설명 |
|------|------|
| `/` | 메인 랜딩 페이지 |
| `/submit` | 업무 입력 폼 페이지 |
| `/report/:id` | 자가진단 보고서 페이지 |
| `/coach` | 코치 대시보드 (비밀번호: coach2026!) |
| `/history` | 수강생 히스토리 조회 페이지 |

### API 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/init` | 데이터베이스 초기화 (개발용) |
| GET | `/api/tools` | AI 도구 목록 조회 |
| GET | `/api/tools/categories` | 카테고리별 도구 통계 |
| POST | `/api/tasks` | 업무 등록 및 AI 추천 생성 |
| GET | `/api/tasks/:id` | 특정 업무 및 추천 결과 조회 |
| GET | `/api/tasks?email=xxx` | 이메일로 업무 목록 조회 |
| POST | `/api/admin/login` | 코치 로그인 |
| GET | `/api/admin/tasks` | 모든 업무 조회 (코치용) |
| POST | `/api/admin/comments` | 코치 코멘트 작성 |
| GET | `/api/admin/stats` | 통계 데이터 (전체/카테고리별/자동화별) |
| GET | `/api/export/tasks` | CSV 다운로드 (전체 데이터) |
| POST | `/api/import/tasks` | CSV 업로드 (일괄 등록) |
| GET | `/api/history/:email` | 수강생별 이력 조회 |
| POST | `/api/email/compose` | Gmail Compose URL 생성 |

## 데이터 모델

### tasks (수강생 업무)
- 기본 정보: organization, department, name, email
- 업무 정보: job_description, repeat_cycle, automation_request, estimated_hours
- AI 추천 결과: recommended_tools (JSON), task_category, automation_level
- 상태: status, coach_comment_status

### comments (코치 코멘트)
- 코멘트 내용: additional_tools, tool_explanation, tips, learning_priority, general_comment
- 메타: coach_name, status

### ai_tools (AI 도구 데이터베이스)
- 22개 최신 AI 도구 (2026년 기준)
- 카테고리: 문서작성, 데이터분석, 마케팅, 업무자동화, 일정관리, 회의, 이미지생성, 영상생성, 고객서비스, 개발, 리서치

## AI 도구 목록 (22개)

| 카테고리 | 도구명 |
|----------|--------|
| 문서작성 | ChatGPT, Notion AI, Gamma |
| 데이터분석 | Julius AI, Claude |
| 마케팅 | Canva AI, Gemini Gems, Google AI Studio TTS |
| 업무자동화 | Make, Google Opal |
| 일정관리 | Notion 캘린더 |
| 회의 | Google NotebookLM |
| 이미지생성 | Nano Banana Pro |
| 영상생성 | Google VEO 3.1, OpenAI Sora 2 |
| 고객서비스 | Typebot, 카카오 채널 챗봇 |
| 개발 | Google AI Studio Build, Antigravity |
| 리서치 | Perplexity AI, Google Deep Research, NotebookLM (리서치) |

## 기술 스택

- **Frontend**: HTML5 + Tailwind CSS (CDN) + Vanilla JavaScript + Chart.js
- **Backend**: Hono (TypeScript)
- **Database**: Cloudflare D1 (SQLite)
- **Hosting**: Cloudflare Pages (로컬: wrangler pages dev)
- **PDF 생성**: jsPDF + html2canvas (클라이언트 사이드)

## 로컬 개발

```bash
# 의존성 설치
npm install

# 빌드
npm run build

# 개발 서버 실행 (DB 자동 초기화)
npm run dev:sandbox

# 또는 PM2로 실행
pm2 start ecosystem.config.cjs

# 데이터베이스 초기화 (브라우저 또는 curl)
curl http://localhost:3000/api/init
```

## URL

- **개발 서버 (샌드박스)**: https://3000-i1bccqox4cqz1t0t1s10g-d0b9e1e2.sandbox.novita.ai
- **코치 대시보드**: `/coach` (비밀번호: coach2026!)
- **히스토리 조회**: `/history`

## 사용 방법

### 수강생
1. 메인 페이지에서 "지금 시작하기" 클릭
2. 업무 입력 폼에서 반복 업무 정보 입력
3. AI 분석 결과와 추천 도구 확인
4. PDF 다운로드로 보고서 저장
5. `/history`에서 이메일로 이전 업무 이력 조회

### 코치 (디마불사)
1. `/coach`로 이동
2. 비밀번호 입력하여 로그인
3. 통계 대시보드에서 현황 파악 (차트)
4. 수강생 업무 목록에서 코멘트 작성
5. "메일" 버튼으로 Gmail 알림 발송
6. CSV 업로드로 대량 등록, CSV 다운로드로 데이터 백업

## 배포 상태

- **플랫폼**: Cloudflare Pages (로컬 개발 중)
- **상태**: 🟢 로컬 개발 서버 활성화
- **Phase**: Phase 1 + Phase 2 완료

## 업데이트 이력

- **2026-01-17**: Phase 2 구현 완료
  - Gmail Compose URL 알림 기능
  - CSV 업로드/다운로드 기능
  - 통계 대시보드 (Chart.js 차트)
  - 수강생별 히스토리 뷰 (/history)
  - 동적 URL 처리 (요청 호스트 기반)

- **2026-01-17**: Phase 1 구현 완료
  - 프로젝트 셋업 (Hono + Cloudflare Pages)
  - D1 데이터베이스 스키마 및 시드 데이터
  - AI 도구 추천 엔진 (키워드 매칭 + 점수 산정)
  - 메인/업무입력/보고서/코치 대시보드 UI
  - PDF 다운로드 기능

---

© 2026 AI공부방 | 코치: 디마불사 (디지털 마케팅 프로 컨설턴트, AI 활용 전문코치)
