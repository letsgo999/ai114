// =============================================
// 업무 유형(카테고리)별 특화 폴백 템플릿
// API 실패 시에도 구체적인 워크플로우 제공
// =============================================

import { AICoachingResult, WorkflowStep, LearningStep } from './gemini';
import { RecommendationResult, RecommendedTool } from './recommendation';

// 카테고리별 특화 워크플로우 템플릿 타입
interface CategoryTemplate {
  category: string;
  summaryTemplate: string;
  workflow: WorkflowStep[];
  coachingTips: string[];
  learningFocus: string[];
}

// =============================================
// 11개 카테고리별 특화 워크플로우 템플릿
// =============================================

const CATEGORY_TEMPLATES: Record<string, CategoryTemplate> = {
  // 1. 문서작성 카테고리
  '문서작성': {
    category: '문서작성',
    summaryTemplate: '${name}님의 문서 작성 업무는 AI 도구를 활용하면 초안 작성부터 편집, 포맷팅까지 전 과정을 효율화할 수 있습니다. 특히 반복적인 양식이나 보고서의 경우 템플릿화를 통해 작성 시간을 대폭 단축할 수 있습니다.',
    workflow: [
      {
        step_number: 1,
        title: '문서 구조 및 목차 설계',
        tool_name: 'ChatGPT',
        tool_url: 'https://chatgpt.com',
        specific_feature: '프로젝트 기능 또는 대화형 AI',
        action_items: [
          '문서의 목적과 대상 독자 정의하기',
          '필요한 섹션과 목차 구조 요청하기',
          '핵심 메시지와 논점 정리하기'
        ],
        expected_output: '문서 목차 및 구조 초안',
        time_estimate: '5-10분',
        tips: '구체적인 문서 유형(보고서, 기획안, 제안서 등)과 분량을 미리 알려주면 더 정확한 구조를 받을 수 있습니다.'
      },
      {
        step_number: 2,
        title: '섹션별 초안 작성',
        tool_name: 'Claude',
        tool_url: 'https://claude.ai',
        specific_feature: '긴 문서 작성 및 맥락 유지',
        action_items: [
          '각 섹션별로 필요한 내용 요청하기',
          '데이터나 사례가 필요한 부분 표시하기',
          '문체와 톤 일관성 유지 요청하기'
        ],
        expected_output: '문서 본문 초안 (70-80% 완성도)',
        time_estimate: '15-20분',
        tips: 'Claude는 긴 문서의 맥락을 잘 유지합니다. 전체 구조를 먼저 공유한 후 섹션별로 작업하세요.'
      },
      {
        step_number: 3,
        title: '데이터 및 근거 자료 보강',
        tool_name: 'Perplexity AI',
        tool_url: 'https://perplexity.ai',
        specific_feature: '실시간 웹 검색 기반 팩트 체크',
        action_items: [
          '문서에 필요한 통계, 사례 검색하기',
          '인용할 출처 확인 및 정리하기',
          '최신 트렌드나 동향 반영하기'
        ],
        expected_output: '근거 자료 및 참고문헌 목록',
        time_estimate: '10분',
        tips: '딥서치 기능을 활용하면 더 깊이 있는 자료를 찾을 수 있습니다.'
      },
      {
        step_number: 4,
        title: '문서 시각화 및 디자인',
        tool_name: 'Gamma',
        tool_url: 'https://gamma.app',
        specific_feature: 'AI 기반 문서/프레젠테이션 자동 생성',
        action_items: [
          '완성된 텍스트를 Gamma에 입력하기',
          '적절한 템플릿과 디자인 선택하기',
          '차트, 다이어그램 등 시각 요소 추가하기'
        ],
        expected_output: '시각적으로 완성된 문서/프레젠테이션',
        time_estimate: '10분',
        tips: '텍스트만 넣어도 자동으로 시각적 레이아웃을 생성해줍니다.'
      },
      {
        step_number: 5,
        title: '최종 검토 및 교정',
        tool_name: 'ChatGPT',
        tool_url: 'https://chatgpt.com',
        specific_feature: '문서 교정 및 피드백',
        action_items: [
          '맞춤법, 문법 검사 요청하기',
          '문장 흐름 및 논리 구조 점검하기',
          '개선이 필요한 부분 피드백 받기'
        ],
        expected_output: '완성된 최종 문서',
        time_estimate: '5분',
        tips: '특정 부분에 대한 구체적인 피드백을 요청하면 더 유용한 조언을 받을 수 있습니다.'
      }
    ],
    coachingTips: [
      '문서 작성 전 목적, 대상, 핵심 메시지를 명확히 정의하면 AI 활용 효과가 극대화됩니다.',
      '반복적으로 작성하는 문서는 프롬프트 템플릿을 저장해두면 매번 시간을 절약할 수 있습니다.',
      'AI가 생성한 내용은 반드시 사실관계를 확인하고, 본인의 의견과 경험을 추가하세요.',
      '회사 고유의 용어나 표현이 있다면 AI에게 미리 알려주세요.'
    ],
    learningFocus: ['ChatGPT 프롬프트 작성법', 'Claude 문서 작성 활용', 'Gamma 기본 사용법']
  },

  // 2. 데이터분석 카테고리
  '데이터분석': {
    category: '데이터분석',
    summaryTemplate: '${name}님의 데이터 분석 업무는 AI 도구를 통해 데이터 정리, 분석, 시각화 전 과정을 자동화할 수 있습니다. 특히 반복적인 리포팅 업무의 경우 템플릿화하면 큰 시간 절감이 가능합니다.',
    workflow: [
      {
        step_number: 1,
        title: '데이터 수집 및 정리',
        tool_name: 'Listly',
        tool_url: 'https://listly.io',
        specific_feature: '웹 데이터 자동 추출 및 엑셀 변환',
        action_items: [
          '분석에 필요한 데이터 소스 확인하기',
          '웹 데이터의 경우 Listly로 자동 추출하기',
          '데이터 형식 통일 및 정리하기'
        ],
        expected_output: '정리된 데이터셋 (CSV/Excel)',
        time_estimate: '10분',
        tips: '정기적으로 수집하는 데이터는 Listly 스케줄 기능을 활용하세요.'
      },
      {
        step_number: 2,
        title: '데이터 분석 및 인사이트 도출',
        tool_name: 'Julius AI',
        tool_url: 'https://julius.ai',
        specific_feature: '자연어 기반 데이터 분석',
        action_items: [
          '정리된 데이터 파일 업로드하기',
          '분석하고 싶은 내용을 자연어로 질문하기',
          '트렌드, 패턴, 이상치 등 핵심 인사이트 확인하기'
        ],
        expected_output: '데이터 분석 결과 및 인사이트',
        time_estimate: '15분',
        tips: '"지난 달 대비 증감률", "상위 10개 항목" 등 구체적으로 질문하세요.'
      },
      {
        step_number: 3,
        title: '차트 및 시각화 자료 생성',
        tool_name: 'Julius AI',
        tool_url: 'https://julius.ai',
        specific_feature: '자동 차트 생성 기능',
        action_items: [
          '분석 결과에 맞는 차트 유형 요청하기',
          '차트 색상, 레이블 등 커스터마이징하기',
          '프레젠테이션용 이미지로 내보내기'
        ],
        expected_output: '시각화 차트 및 그래프',
        time_estimate: '10분',
        tips: '막대, 선, 파이 등 목적에 맞는 차트 유형을 명시하면 더 정확한 결과를 얻습니다.'
      },
      {
        step_number: 4,
        title: '분석 보고서 작성',
        tool_name: 'ChatGPT',
        tool_url: 'https://chatgpt.com',
        specific_feature: '데이터 기반 보고서 작성',
        action_items: [
          '분석 결과와 인사이트 정리해서 입력하기',
          '보고서 형식에 맞게 본문 작성 요청하기',
          '경영진/팀원용 요약본 별도 작성하기'
        ],
        expected_output: '데이터 분석 보고서 초안',
        time_estimate: '10분',
        tips: '숫자와 인사이트를 함께 제공하면 더 설득력 있는 보고서가 완성됩니다.'
      },
      {
        step_number: 5,
        title: '정기 리포트 자동화 설정',
        tool_name: 'Google Apps Script',
        tool_url: 'https://script.google.com',
        specific_feature: '구글 시트 자동화 및 스케줄링',
        action_items: [
          '반복 분석 프로세스 스크립트로 자동화하기',
          '정기 실행 트리거 설정하기',
          '이메일 자동 발송 설정하기'
        ],
        expected_output: '자동화된 정기 리포팅 시스템',
        time_estimate: '20분 (초기 설정)',
        tips: 'ChatGPT에게 Apps Script 코드 작성을 요청하면 쉽게 자동화할 수 있습니다.'
      }
    ],
    coachingTips: [
      '데이터 분석 전 "무엇을 알고 싶은가?"를 명확히 정의하는 것이 가장 중요합니다.',
      '정기적으로 분석하는 데이터는 반드시 자동화 파이프라인을 구축하세요.',
      '시각화는 복잡하게 만들지 말고, 핵심 메시지 하나에 집중하세요.',
      '분석 결과에 "So What?(그래서 어쩌라고?)"에 대한 액션 아이템을 반드시 포함하세요.'
    ],
    learningFocus: ['Julius AI 데이터 분석', 'Google Apps Script 기초', '데이터 시각화 원칙']
  },

  // 3. 마케팅 카테고리
  '마케팅': {
    category: '마케팅',
    summaryTemplate: '${name}님의 마케팅 업무는 AI 도구를 활용하면 콘텐츠 기획부터 제작, 일정 관리까지 전 과정을 효율화할 수 있습니다. 특히 SNS 콘텐츠 운영의 경우 AI를 통해 아이디어 발굴과 제작 시간을 대폭 단축할 수 있습니다.',
    workflow: [
      {
        step_number: 1,
        title: '트렌드 분석 및 콘텐츠 아이디어 발굴',
        tool_name: 'Perplexity AI',
        tool_url: 'https://perplexity.ai',
        specific_feature: '실시간 트렌드 검색 및 분석',
        action_items: [
          '타겟 고객층의 최신 관심사 검색하기',
          '경쟁사 콘텐츠 동향 파악하기',
          '시즌/이슈별 콘텐츠 아이디어 목록 작성하기'
        ],
        expected_output: '콘텐츠 아이디어 리스트 (10-20개)',
        time_estimate: '10분',
        tips: '특정 키워드나 해시태그 트렌드를 물어보면 더 정확한 인사이트를 얻을 수 있습니다.'
      },
      {
        step_number: 2,
        title: '콘텐츠 캘린더 및 카피 작성',
        tool_name: 'Gemini Gems',
        tool_url: 'https://gemini.google.com',
        specific_feature: '맞춤형 AI 마케팅 어시스턴트',
        action_items: [
          '월간/주간 콘텐츠 캘린더 초안 작성하기',
          '각 게시물별 카피 및 해시태그 생성하기',
          '브랜드 톤앤매너에 맞게 조정하기'
        ],
        expected_output: '콘텐츠 캘린더 및 게시물 카피',
        time_estimate: '15분',
        tips: 'Gems에 브랜드 가이드라인을 미리 학습시키면 일관된 톤의 콘텐츠를 생성합니다.'
      },
      {
        step_number: 3,
        title: '이미지/배너 디자인',
        tool_name: 'Canva AI',
        tool_url: 'https://www.canva.com',
        specific_feature: 'AI 이미지 생성 및 템플릿 편집',
        action_items: [
          '플랫폼별 적정 사이즈 템플릿 선택하기',
          'AI로 배경 이미지 생성하거나 편집하기',
          '텍스트와 브랜드 요소 배치하기'
        ],
        expected_output: 'SNS 게시용 이미지/배너',
        time_estimate: '15분',
        tips: '자주 사용하는 디자인은 브랜드 킷으로 저장해두면 일관성을 유지하기 쉽습니다.'
      },
      {
        step_number: 4,
        title: '썸네일 및 특수 이미지 제작',
        tool_name: 'Nano Banana Pro',
        tool_url: 'https://genspark.ai',
        specific_feature: '고품질 이미지 생성 및 한글 합성',
        action_items: [
          '유튜브 썸네일 또는 광고 이미지 생성하기',
          '한글 텍스트 자연스럽게 합성하기',
          '배경 제거/변경 등 편집 작업하기'
        ],
        expected_output: '고품질 마케팅 이미지',
        time_estimate: '10분',
        tips: '한글이 포함된 이미지는 Nano Banana Pro가 가장 자연스럽게 처리합니다.'
      },
      {
        step_number: 5,
        title: '성과 분석 및 개선점 도출',
        tool_name: 'Google NotebookLM',
        tool_url: 'https://notebooklm.google.com',
        specific_feature: '데이터 분석 및 인사이트 도출',
        action_items: [
          'SNS 인사이트 데이터 업로드하기',
          '성과 좋은 콘텐츠 패턴 분석하기',
          '다음 기간 개선 방향 정리하기'
        ],
        expected_output: '성과 분석 리포트 및 개선안',
        time_estimate: '10분',
        tips: '월별 데이터를 누적해서 분석하면 장기 트렌드를 파악할 수 있습니다.'
      }
    ],
    coachingTips: [
      '마케팅 AI 활용의 핵심은 "브랜드 일관성 유지"입니다. AI에게 브랜드 가이드를 학습시키세요.',
      '트렌드를 따라가되, 브랜드 아이덴티티를 잃지 않도록 균형을 맞추세요.',
      '콘텐츠 성과 데이터를 꾸준히 분석하여 AI 프롬프트를 개선해 나가세요.',
      'AI가 만든 콘텐츠도 최종적으로는 사람의 감각으로 검토하는 것이 중요합니다.'
    ],
    learningFocus: ['Canva AI 디자인', 'SNS 카피라이팅 프롬프트', '마케팅 데이터 분석']
  },

  // 4. 업무자동화 카테고리
  '업무자동화': {
    category: '업무자동화',
    summaryTemplate: '${name}님의 반복 업무는 자동화 도구를 활용하면 수작업을 크게 줄일 수 있습니다. Make나 Zapier 같은 노코드 자동화 도구를 통해 복잡한 워크플로우도 쉽게 구축할 수 있습니다.',
    workflow: [
      {
        step_number: 1,
        title: '현재 업무 프로세스 분석',
        tool_name: 'ChatGPT',
        tool_url: 'https://chatgpt.com',
        specific_feature: '프로세스 분석 및 자동화 포인트 식별',
        action_items: [
          '현재 업무 프로세스를 단계별로 정리하기',
          '반복적이고 규칙적인 작업 식별하기',
          '자동화 우선순위 결정하기'
        ],
        expected_output: '업무 프로세스 맵 및 자동화 후보 목록',
        time_estimate: '10분',
        tips: '업무를 최대한 구체적으로 설명하면 더 정확한 자동화 방안을 제안받을 수 있습니다.'
      },
      {
        step_number: 2,
        title: '자동화 워크플로우 설계',
        tool_name: 'Make',
        tool_url: 'https://www.make.com',
        specific_feature: '시각적 워크플로우 빌더',
        action_items: [
          '트리거(시작 조건) 정의하기',
          '필요한 앱/서비스 연동 설정하기',
          '데이터 흐름과 조건 분기 설계하기'
        ],
        expected_output: '자동화 워크플로우 설계도',
        time_estimate: '20분',
        tips: '처음에는 간단한 2-3단계 자동화부터 시작하여 점차 확장하세요.'
      },
      {
        step_number: 3,
        title: '자동화 시나리오 구축',
        tool_name: 'Make',
        tool_url: 'https://www.make.com',
        specific_feature: '시나리오 생성 및 테스트',
        action_items: [
          '설계한 워크플로우 실제 구현하기',
          '각 단계별 데이터 매핑 설정하기',
          '테스트 실행 및 오류 수정하기'
        ],
        expected_output: '작동하는 자동화 시나리오',
        time_estimate: '30분',
        tips: '테스트 데이터로 충분히 검증한 후 실제 데이터에 적용하세요.'
      },
      {
        step_number: 4,
        title: '구글 시트 연동 자동화',
        tool_name: 'Google Apps Script',
        tool_url: 'https://script.google.com',
        specific_feature: '구글 워크스페이스 자동화',
        action_items: [
          '데이터 자동 수집/정리 스크립트 작성하기',
          '정기 실행 스케줄 설정하기',
          '알림 및 리포트 자동 발송 설정하기'
        ],
        expected_output: '구글 시트 기반 자동화 시스템',
        time_estimate: '20분',
        tips: 'ChatGPT에게 Apps Script 코드를 요청하면 복잡한 자동화도 쉽게 구현할 수 있습니다.'
      },
      {
        step_number: 5,
        title: '모니터링 및 최적화',
        tool_name: 'Make',
        tool_url: 'https://www.make.com',
        specific_feature: '실행 이력 및 에러 로그 확인',
        action_items: [
          '자동화 실행 로그 정기 점검하기',
          '에러 발생 시 알림 설정하기',
          '성능 개선점 파악 및 최적화하기'
        ],
        expected_output: '안정적으로 운영되는 자동화 시스템',
        time_estimate: '주 10분 (유지보수)',
        tips: '자동화가 실패했을 때의 대응 플랜도 함께 마련해두세요.'
      }
    ],
    coachingTips: [
      '자동화의 핵심은 "규칙성"입니다. 불규칙한 업무는 먼저 표준화한 후 자동화하세요.',
      '100% 자동화보다 80% 자동화 + 20% 수동 검토가 더 안전할 수 있습니다.',
      'Make와 Zapier 중 하나를 먼저 익힌 후, 필요에 따라 다른 도구로 확장하세요.',
      '자동화 전/후 소요 시간을 측정하여 실제 절감 효과를 확인하세요.'
    ],
    learningFocus: ['Make 기본 사용법', 'Google Apps Script 입문', '업무 프로세스 분석']
  },

  // 5. 일정관리 카테고리
  '일정관리': {
    category: '일정관리',
    summaryTemplate: '${name}님의 일정 관리 업무는 AI 도구와 자동화를 통해 스케줄 조율, 알림, 회의 준비까지 효율화할 수 있습니다. 특히 반복되는 일정이나 미팅 관리에 큰 도움이 됩니다.',
    workflow: [
      {
        step_number: 1,
        title: '일정 및 태스크 통합 관리',
        tool_name: 'Notion 캘린더',
        tool_url: 'https://www.notion.so/product/calendar',
        specific_feature: '태스크 연동 캘린더',
        action_items: [
          '모든 일정을 Notion 캘린더에 통합하기',
          '태스크와 일정 연결하기',
          '팀원과 캘린더 공유 설정하기'
        ],
        expected_output: '통합 일정 관리 시스템',
        time_estimate: '15분 (초기 설정)',
        tips: '구글 캘린더와 연동하면 기존 일정을 쉽게 가져올 수 있습니다.'
      },
      {
        step_number: 2,
        title: '회의 일정 자동 조율',
        tool_name: 'ChatGPT',
        tool_url: 'https://chatgpt.com',
        specific_feature: '일정 조율 메일 작성',
        action_items: [
          '참석자 가용 시간 파악 요청 메일 작성하기',
          '최적 미팅 시간 제안 받기',
          '일정 확정 안내 메일 작성하기'
        ],
        expected_output: '일정 조율 커뮤니케이션 템플릿',
        time_estimate: '5분',
        tips: '반복 사용하는 일정 조율 메일은 템플릿으로 저장해두세요.'
      },
      {
        step_number: 3,
        title: '회의 준비 자동화',
        tool_name: 'ChatGPT',
        tool_url: 'https://chatgpt.com',
        specific_feature: '회의 안건 및 자료 준비',
        action_items: [
          '회의 목적에 맞는 안건 정리하기',
          '필요한 사전 자료 목록 작성하기',
          '예상 질문 및 답변 준비하기'
        ],
        expected_output: '회의 준비 체크리스트',
        time_estimate: '10분',
        tips: '정기 회의는 안건 템플릿을 만들어두면 준비 시간을 크게 줄일 수 있습니다.'
      },
      {
        step_number: 4,
        title: '통화 기록 자동 정리',
        tool_name: '에이닷 전화',
        tool_url: 'https://adot.ai',
        specific_feature: 'AI 통화 요약 및 일정 자동 생성',
        action_items: [
          '업무 통화 시 에이닷 통화 요약 기능 활용하기',
          '통화 내용에서 자동 추출된 일정 확인하기',
          '필요시 캘린더에 자동 등록하기'
        ],
        expected_output: '통화 요약 및 일정 자동 등록',
        time_estimate: '자동 처리',
        tips: '중요한 업무 통화는 항상 요약 기능을 켜두세요.'
      },
      {
        step_number: 5,
        title: '일정 리마인더 및 팔로업',
        tool_name: 'Make',
        tool_url: 'https://www.make.com',
        specific_feature: '자동 알림 및 팔로업 설정',
        action_items: [
          '중요 일정 전 자동 리마인더 설정하기',
          '회의 후 팔로업 메일 자동 발송 설정하기',
          '마감일 임박 태스크 알림 설정하기'
        ],
        expected_output: '자동화된 일정 알림 시스템',
        time_estimate: '20분 (초기 설정)',
        tips: '알림이 너무 많으면 오히려 효과가 떨어집니다. 정말 중요한 것만 설정하세요.'
      }
    ],
    coachingTips: [
      '모든 일정을 하나의 캘린더에서 관리하면 중복 예약과 누락을 방지할 수 있습니다.',
      '회의 시간은 가능하면 특정 요일/시간대에 몰아서 "회의 없는 날"을 확보하세요.',
      '예상 소요 시간보다 약간 여유 있게 일정을 잡으면 스트레스가 줄어듭니다.',
      '정기 회의는 자동 반복 설정으로 매번 잡는 수고를 덜 수 있습니다.'
    ],
    learningFocus: ['Notion 캘린더 활용', '회의 효율화 기법', '자동 알림 설정']
  },

  // 6. 회의 카테고리
  '회의': {
    category: '회의',
    summaryTemplate: '${name}님의 회의 관련 업무는 AI 도구를 활용하면 녹음, 전사, 요약, 회의록 작성까지 자동화할 수 있습니다. 회의 시간은 줄이고, 후속 조치는 더 명확하게 관리할 수 있습니다.',
    workflow: [
      {
        step_number: 1,
        title: '회의 녹음 및 실시간 전사',
        tool_name: '클로바노트',
        tool_url: 'https://clovanote.naver.com',
        specific_feature: '실시간 음성 인식 및 전사',
        action_items: [
          '회의 시작 시 클로바노트 녹음 시작하기',
          '화자 분리 기능으로 발언자 구분하기',
          '실시간 텍스트 변환 확인하기'
        ],
        expected_output: '회의 전체 녹음 및 텍스트 전사본',
        time_estimate: '회의 시간 동안 자동',
        tips: '조용한 환경에서 녹음하면 인식 정확도가 높아집니다.'
      },
      {
        step_number: 2,
        title: '핵심 내용 자동 요약',
        tool_name: '클로바노트',
        tool_url: 'https://clovanote.naver.com',
        specific_feature: 'AI 자동 요약',
        action_items: [
          '녹음 종료 후 자동 요약 확인하기',
          '핵심 키워드 및 주제 추출 확인하기',
          '누락된 중요 내용 보완하기'
        ],
        expected_output: '회의 핵심 내용 요약',
        time_estimate: '자동 생성',
        tips: '요약이 부족하다면 전사본을 ChatGPT에 넣어 추가 요약을 받을 수 있습니다.'
      },
      {
        step_number: 3,
        title: '회의록 정리 및 구조화',
        tool_name: 'ChatGPT',
        tool_url: 'https://chatgpt.com',
        specific_feature: '회의록 포맷팅',
        action_items: [
          '요약본을 회의록 양식에 맞게 정리 요청하기',
          '결정사항, 액션 아이템 별도 정리하기',
          '담당자 및 기한 명확히 표기하기'
        ],
        expected_output: '구조화된 공식 회의록',
        time_estimate: '5분',
        tips: '회사의 회의록 양식이 있다면 ChatGPT에게 해당 형식을 알려주세요.'
      },
      {
        step_number: 4,
        title: '액션 아이템 추출 및 할당',
        tool_name: 'Notion AI',
        tool_url: 'https://www.notion.so',
        specific_feature: '액션 아이템 자동 추출',
        action_items: [
          '회의록에서 액션 아이템 자동 추출하기',
          '각 항목에 담당자 및 기한 설정하기',
          '팀 태스크 보드에 연동하기'
        ],
        expected_output: '할당된 액션 아이템 목록',
        time_estimate: '5분',
        tips: '회의 중 결정된 사항은 바로바로 기록하면 누락을 방지할 수 있습니다.'
      },
      {
        step_number: 5,
        title: '회의록 공유 및 팔로업',
        tool_name: 'ChatGPT',
        tool_url: 'https://chatgpt.com',
        specific_feature: '공유 메일 작성',
        action_items: [
          '회의록 공유 이메일 작성하기',
          '참석자/불참석자별 맞춤 내용 구성하기',
          '다음 회의 일정 안내 포함하기'
        ],
        expected_output: '회의록 공유 이메일',
        time_estimate: '3분',
        tips: '불참석자에게는 핵심 내용을 더 상세하게 전달하세요.'
      }
    ],
    coachingTips: [
      '모든 회의는 목적과 안건을 사전에 공유하면 회의 시간을 크게 줄일 수 있습니다.',
      '회의록은 24시간 이내에 공유해야 기억이 선명할 때 확인할 수 있습니다.',
      '액션 아이템에는 반드시 "누가, 무엇을, 언제까지"가 명시되어야 합니다.',
      '정기 회의는 고정 양식을 만들어두면 매번 정리하는 시간을 절약할 수 있습니다.'
    ],
    learningFocus: ['클로바노트 활용', '효과적인 회의록 작성', '액션 아이템 관리']
  },

  // 7. 이미지생성 카테고리
  '이미지생성': {
    category: '이미지생성',
    summaryTemplate: '${name}님의 이미지 제작 업무는 AI 이미지 생성 도구를 활용하면 전문 디자인 기술 없이도 고품질 이미지를 빠르게 만들 수 있습니다. 아이디어만 있으면 다양한 시각 자료를 효율적으로 제작할 수 있습니다.',
    workflow: [
      {
        step_number: 1,
        title: '이미지 컨셉 및 프롬프트 설계',
        tool_name: 'ChatGPT',
        tool_url: 'https://chatgpt.com',
        specific_feature: '이미지 프롬프트 작성 도우미',
        action_items: [
          '필요한 이미지 용도와 스타일 정리하기',
          '효과적인 이미지 생성 프롬프트 요청하기',
          '영문 프롬프트로 변환하기 (더 정확한 결과)'
        ],
        expected_output: '이미지 생성용 상세 프롬프트',
        time_estimate: '5분',
        tips: '구체적인 스타일(일러스트, 사진, 3D 등), 분위기, 색상을 명시하면 원하는 결과에 가까워집니다.'
      },
      {
        step_number: 2,
        title: '고품질 이미지 생성',
        tool_name: 'Nano Banana Pro',
        tool_url: 'https://genspark.ai',
        specific_feature: '고품질 이미지 생성 및 한글 합성',
        action_items: [
          '프롬프트 입력 후 이미지 생성하기',
          '여러 옵션 중 최적 이미지 선택하기',
          '한글 텍스트가 필요하면 자연스럽게 합성하기'
        ],
        expected_output: '고품질 AI 생성 이미지',
        time_estimate: '5-10분',
        tips: '한글 텍스트가 포함된 이미지는 Nano Banana Pro가 가장 잘 처리합니다.'
      },
      {
        step_number: 3,
        title: '이미지 편집 및 보정',
        tool_name: 'Nano Banana Pro',
        tool_url: 'https://genspark.ai',
        specific_feature: '자연어 기반 이미지 편집',
        action_items: [
          '배경 제거 또는 변경하기',
          '불필요한 요소 삭제하기',
          '색상 톤 및 밝기 조정하기'
        ],
        expected_output: '편집 완료된 이미지',
        time_estimate: '5분',
        tips: '자연어로 "배경을 하얀색으로 바꿔줘" 같이 요청하면 쉽게 편집됩니다.'
      },
      {
        step_number: 4,
        title: '디자인 템플릿 적용',
        tool_name: 'Canva AI',
        tool_url: 'https://www.canva.com',
        specific_feature: '템플릿 기반 디자인',
        action_items: [
          '용도에 맞는 템플릿 선택하기',
          '생성한 이미지를 템플릿에 적용하기',
          '텍스트, 로고 등 추가 요소 배치하기'
        ],
        expected_output: '완성된 디자인 결과물',
        time_estimate: '10분',
        tips: 'SNS 플랫폼별 최적 사이즈 템플릿을 활용하세요.'
      },
      {
        step_number: 5,
        title: '최종 검토 및 내보내기',
        tool_name: 'Canva AI',
        tool_url: 'https://www.canva.com',
        specific_feature: '다양한 포맷 내보내기',
        action_items: [
          '용도에 맞는 파일 형식 선택하기 (PNG, JPG, PDF)',
          '해상도 및 품질 설정하기',
          '여러 사이즈로 한 번에 내보내기'
        ],
        expected_output: '사용 가능한 최종 이미지 파일',
        time_estimate: '3분',
        tips: '웹용은 PNG, 인쇄용은 PDF 고화질로 내보내세요.'
      }
    ],
    coachingTips: [
      'AI 이미지 생성의 품질은 프롬프트에 달려 있습니다. 구체적일수록 좋은 결과가 나옵니다.',
      '한 번에 완벽한 이미지를 기대하지 말고, 여러 번 생성 후 최적의 것을 선택하세요.',
      '저작권에 주의하세요. 상업적 사용 시 해당 도구의 라이선스 정책을 확인하세요.',
      '브랜드 이미지는 일관된 스타일을 유지하기 위해 프롬프트 템플릿을 저장해두세요.'
    ],
    learningFocus: ['이미지 프롬프트 작성법', 'Canva 기본 사용법', '이미지 편집 기초']
  },

  // 8. 영상생성 카테고리
  '영상생성': {
    category: '영상생성',
    summaryTemplate: '${name}님의 영상 제작 업무는 AI 도구를 활용하면 촬영 없이도 고품질 영상을 만들 수 있습니다. 텍스트나 이미지만으로 다양한 영상 콘텐츠를 효율적으로 제작할 수 있습니다.',
    workflow: [
      {
        step_number: 1,
        title: '영상 기획 및 스크립트 작성',
        tool_name: 'ChatGPT',
        tool_url: 'https://chatgpt.com',
        specific_feature: '영상 스크립트 작성',
        action_items: [
          '영상 목적, 타겟, 길이 정의하기',
          '스토리보드 또는 씬별 스크립트 작성하기',
          '나레이션 대본 작성하기'
        ],
        expected_output: '영상 스크립트 및 스토리보드',
        time_estimate: '15분',
        tips: '영상 길이(15초, 30초, 1분 등)를 미리 정하면 적절한 분량의 스크립트가 나옵니다.'
      },
      {
        step_number: 2,
        title: 'AI 영상 클립 생성',
        tool_name: 'Google VEO 3.1',
        tool_url: 'https://deepmind.google/veo',
        specific_feature: '텍스트 기반 영상 생성',
        action_items: [
          '각 씬별 프롬프트로 영상 클립 생성하기',
          '원하는 스타일과 분위기 지정하기',
          '여러 버전 중 최적 클립 선택하기'
        ],
        expected_output: 'AI 생성 영상 클립들',
        time_estimate: '20분',
        tips: '짧은 클립(5-10초)으로 여러 개 생성한 후 편집에서 조합하는 것이 효과적입니다.'
      },
      {
        step_number: 3,
        title: '배경음악 및 사운드 추가',
        tool_name: 'Suno AI',
        tool_url: 'https://suno.ai',
        specific_feature: 'AI 음악 생성',
        action_items: [
          '영상 분위기에 맞는 BGM 생성하기',
          '길이와 템포 조절하기',
          '저작권 걱정 없는 음악 확보하기'
        ],
        expected_output: '맞춤형 배경음악',
        time_estimate: '10분',
        tips: '영상 길이에 맞춰 음악 길이를 지정하면 편집이 쉬워집니다.'
      },
      {
        step_number: 4,
        title: '영상 편집 및 자막 추가',
        tool_name: 'CapCut',
        tool_url: 'https://www.capcut.com',
        specific_feature: '자동 자막 및 편집',
        action_items: [
          '영상 클립들 순서대로 배치하기',
          '자동 자막 생성 기능 활용하기',
          '전환 효과 및 텍스트 오버레이 추가하기'
        ],
        expected_output: '편집 완료된 영상',
        time_estimate: '20분',
        tips: '숏폼 영상은 세로(9:16) 비율로, 유튜브는 가로(16:9) 비율로 설정하세요.'
      },
      {
        step_number: 5,
        title: '최종 검토 및 내보내기',
        tool_name: 'Vrew',
        tool_url: 'https://vrew.voyagerx.com',
        specific_feature: '자막 교정 및 최종 편집',
        action_items: [
          '자막 정확도 확인 및 수정하기',
          '전체 흐름 및 타이밍 검토하기',
          '플랫폼별 최적 설정으로 내보내기'
        ],
        expected_output: '배포 가능한 최종 영상',
        time_estimate: '10분',
        tips: 'Vrew는 텍스트 기반으로 영상을 편집할 수 있어 자막 수정이 매우 편리합니다.'
      }
    ],
    coachingTips: [
      '영상 제작의 80%는 기획입니다. 스크립트를 충분히 다듬은 후 제작에 들어가세요.',
      'AI 생성 영상은 짧은 클립으로 만들어 편집에서 조합하는 것이 품질 관리에 유리합니다.',
      '저작권에 주의하세요. AI 생성 콘텐츠도 각 플랫폼의 정책을 확인하세요.',
      '처음에는 15-30초 숏폼부터 시작하여 점차 긴 영상으로 확장하세요.'
    ],
    learningFocus: ['영상 스크립트 작성', 'CapCut 기본 편집', 'AI 영상 프롬프트']
  },

  // 9. 고객서비스 카테고리
  '고객서비스': {
    category: '고객서비스',
    summaryTemplate: '${name}님의 고객 서비스 업무는 AI 챗봇과 자동화 도구를 활용하면 24시간 응대가 가능해지고, 반복 문의에 대한 처리 시간을 크게 줄일 수 있습니다.',
    workflow: [
      {
        step_number: 1,
        title: 'FAQ 및 응답 데이터 정리',
        tool_name: 'ChatGPT',
        tool_url: 'https://chatgpt.com',
        specific_feature: 'FAQ 정리 및 응답 템플릿 생성',
        action_items: [
          '자주 들어오는 문의 유형 분류하기',
          '각 문의별 표준 응답 작성하기',
          '응답 톤앤매너 가이드 정리하기'
        ],
        expected_output: 'FAQ 목록 및 응답 템플릿',
        time_estimate: '30분',
        tips: '실제 고객 문의 데이터를 분석하면 더 정확한 FAQ를 만들 수 있습니다.'
      },
      {
        step_number: 2,
        title: '챗봇 시나리오 설계',
        tool_name: 'Typebot',
        tool_url: 'https://typebot.io',
        specific_feature: '시각적 챗봇 빌더',
        action_items: [
          '고객 문의 흐름 시나리오 설계하기',
          '질문-응답 트리 구조 만들기',
          '상담원 연결 조건 설정하기'
        ],
        expected_output: '챗봇 대화 시나리오',
        time_estimate: '40분',
        tips: '복잡한 문의는 빠르게 상담원에게 연결되도록 설계하세요.'
      },
      {
        step_number: 3,
        title: '챗봇 구축 및 테스트',
        tool_name: 'Typebot',
        tool_url: 'https://typebot.io',
        specific_feature: '드래그앤드롭 챗봇 제작',
        action_items: [
          '시나리오대로 챗봇 블록 구성하기',
          '버튼, 입력창 등 UI 요소 배치하기',
          '테스트 대화로 흐름 검증하기'
        ],
        expected_output: '작동하는 챗봇',
        time_estimate: '1시간',
        tips: '실제 고객처럼 다양한 케이스로 테스트해보세요.'
      },
      {
        step_number: 4,
        title: '카카오톡 채널 연동',
        tool_name: '카카오 채널 챗봇',
        tool_url: 'https://business.kakao.com',
        specific_feature: '스킬 기반 자동응답',
        action_items: [
          '카카오 비즈니스 채널 개설하기',
          '자동응답 시나리오 설정하기',
          '운영시간 및 부재중 메시지 설정하기'
        ],
        expected_output: '카카오톡 자동응답 시스템',
        time_estimate: '30분',
        tips: '카카오 채널은 국내 고객 응대에 가장 효과적인 채널입니다.'
      },
      {
        step_number: 5,
        title: '응대 품질 모니터링',
        tool_name: 'Google NotebookLM',
        tool_url: 'https://notebooklm.google.com',
        specific_feature: '고객 피드백 분석',
        action_items: [
          '챗봇 대화 로그 분석하기',
          '미해결 문의 패턴 파악하기',
          '개선이 필요한 응답 업데이트하기'
        ],
        expected_output: '챗봇 성과 분석 및 개선안',
        time_estimate: '주 20분',
        tips: '고객이 자주 이탈하는 지점을 찾아 우선적으로 개선하세요.'
      }
    ],
    coachingTips: [
      '챗봇은 "완벽한 자동화"보다 "빠른 초기 응대 + 필요시 상담원 연결"이 더 효과적입니다.',
      '고객 문의 데이터를 정기적으로 분석하여 FAQ를 업데이트하세요.',
      '챗봇 응답 톤은 브랜드 이미지와 일치해야 합니다.',
      '복잡한 문의나 불만 사항은 빠르게 사람에게 연결되도록 설계하세요.'
    ],
    learningFocus: ['Typebot 챗봇 제작', '카카오 채널 운영', '고객 서비스 자동화']
  },

  // 10. 개발 카테고리
  '개발': {
    category: '개발',
    summaryTemplate: '${name}님의 개발 업무는 AI 코딩 도구를 활용하면 코드 작성, 디버깅, 리팩토링 등 전 과정을 효율화할 수 있습니다. 특히 반복적인 코드 작성이나 간단한 자동화 스크립트는 AI로 빠르게 생성할 수 있습니다.',
    workflow: [
      {
        step_number: 1,
        title: '요구사항 분석 및 설계',
        tool_name: 'ChatGPT',
        tool_url: 'https://chatgpt.com',
        specific_feature: '기술 설계 및 아키텍처 상담',
        action_items: [
          '개발 요구사항 명확히 정리하기',
          '적절한 기술 스택 추천 받기',
          '기본 아키텍처 및 구조 설계하기'
        ],
        expected_output: '기술 설계 문서',
        time_estimate: '15분',
        tips: '요구사항을 구체적으로 설명할수록 더 좋은 설계를 받을 수 있습니다.'
      },
      {
        step_number: 2,
        title: '코드 작성 및 개발',
        tool_name: 'Cursor AI',
        tool_url: 'https://cursor.sh',
        specific_feature: '자연어 기반 코드 생성',
        action_items: [
          '자연어로 원하는 기능 설명하기',
          'AI가 생성한 코드 검토하기',
          '필요시 수정 요청하기'
        ],
        expected_output: '기능 구현 코드',
        time_estimate: '30분',
        tips: 'Tab 키로 AI 제안을 수락하고, Ctrl+K로 수정을 요청할 수 있습니다.'
      },
      {
        step_number: 3,
        title: '디버깅 및 오류 수정',
        tool_name: 'Claude',
        tool_url: 'https://claude.ai',
        specific_feature: '코드 분석 및 디버깅',
        action_items: [
          '오류 메시지와 코드를 함께 공유하기',
          '원인 분석 및 해결책 요청하기',
          '수정된 코드 적용 및 테스트하기'
        ],
        expected_output: '디버깅 완료된 코드',
        time_estimate: '15분',
        tips: 'Claude는 긴 코드 맥락을 잘 이해합니다. 관련 코드를 충분히 공유하세요.'
      },
      {
        step_number: 4,
        title: '노코드 앱 개발 (필요시)',
        tool_name: 'Genspark AI Developer',
        tool_url: 'https://genspark.ai',
        specific_feature: '자연어 기반 웹앱 개발',
        action_items: [
          '원하는 앱 기능 자연어로 설명하기',
          '생성된 앱 테스트하기',
          '필요한 수정사항 요청하기'
        ],
        expected_output: '작동하는 웹앱 프로토타입',
        time_estimate: '30분',
        tips: '복잡한 앱보다는 단일 기능의 간단한 도구부터 시작하세요.'
      },
      {
        step_number: 5,
        title: '코드 리뷰 및 최적화',
        tool_name: 'ChatGPT',
        tool_url: 'https://chatgpt.com',
        specific_feature: '코드 리뷰 및 개선 제안',
        action_items: [
          '완성된 코드 리뷰 요청하기',
          '성능 개선점 파악하기',
          '코드 주석 및 문서화하기'
        ],
        expected_output: '최적화된 최종 코드',
        time_estimate: '10분',
        tips: '보안, 성능, 가독성 관점에서 각각 리뷰를 요청하면 더 꼼꼼한 피드백을 받을 수 있습니다.'
      }
    ],
    coachingTips: [
      'AI가 생성한 코드는 반드시 이해하고 검토한 후 사용하세요.',
      '보안에 민감한 코드(인증, 결제 등)는 AI 생성 후 반드시 전문가 검토를 받으세요.',
      '작은 단위로 기능을 나눠 AI에게 요청하면 더 정확한 코드를 얻을 수 있습니다.',
      'AI 코딩 도구는 학습 도구로도 훌륭합니다. 생성된 코드의 원리를 이해하려 노력하세요.'
    ],
    learningFocus: ['Cursor AI 활용', '프롬프트 기반 코딩', '코드 리뷰 방법']
  },

  // 11. 리서치 카테고리
  '리서치': {
    category: '리서치',
    summaryTemplate: '${name}님의 리서치 업무는 AI 검색 도구를 활용하면 정보 수집, 분석, 정리까지 전 과정을 효율화할 수 있습니다. 특히 실시간 정보와 팩트 체크가 중요한 업무에 큰 도움이 됩니다.',
    workflow: [
      {
        step_number: 1,
        title: '리서치 주제 및 범위 정의',
        tool_name: 'ChatGPT',
        tool_url: 'https://chatgpt.com',
        specific_feature: '리서치 계획 수립',
        action_items: [
          '리서치 목적과 질문 명확히 정의하기',
          '필요한 정보 유형 목록 작성하기',
          '신뢰할 수 있는 소스 유형 결정하기'
        ],
        expected_output: '리서치 계획서',
        time_estimate: '10분',
        tips: '리서치 질문을 구체적으로 정의할수록 효율적인 조사가 가능합니다.'
      },
      {
        step_number: 2,
        title: '실시간 정보 검색',
        tool_name: 'Perplexity AI',
        tool_url: 'https://perplexity.ai',
        specific_feature: '실시간 웹 검색 + 팩트 체크',
        action_items: [
          '핵심 질문으로 검색하기',
          '출처와 함께 정보 수집하기',
          '딥서치로 심층 조사하기'
        ],
        expected_output: '검색 결과 및 출처 목록',
        time_estimate: '20분',
        tips: '딥서치 기능을 활용하면 더 깊이 있는 정보를 얻을 수 있습니다.'
      },
      {
        step_number: 3,
        title: '학술/전문 자료 검색',
        tool_name: 'Liner',
        tool_url: 'https://getliner.com',
        specific_feature: '학술 논문 기반 검색',
        action_items: [
          '학술적 근거가 필요한 내용 검색하기',
          '관련 논문 및 연구 자료 수집하기',
          '인용 가능한 출처 정리하기'
        ],
        expected_output: '학술 자료 및 참고문헌',
        time_estimate: '15분',
        tips: '공신력 있는 데이터가 필요할 때는 학술 검색 도구를 활용하세요.'
      },
      {
        step_number: 4,
        title: '자료 종합 및 분석',
        tool_name: 'Google NotebookLM',
        tool_url: 'https://notebooklm.google.com',
        specific_feature: 'RAG 기반 문서 분석',
        action_items: [
          '수집한 자료들 업로드하기',
          '자료 간 공통점/차이점 분석하기',
          '핵심 인사이트 도출하기'
        ],
        expected_output: '자료 분석 결과',
        time_estimate: '15분',
        tips: 'NotebookLM에 여러 문서를 함께 업로드하면 교차 분석이 가능합니다.'
      },
      {
        step_number: 5,
        title: '리서치 보고서 작성',
        tool_name: 'ChatGPT',
        tool_url: 'https://chatgpt.com',
        specific_feature: '보고서 작성',
        action_items: [
          '분석 결과를 보고서 형식으로 정리하기',
          '핵심 발견사항 요약하기',
          '출처 및 참고문헌 정리하기'
        ],
        expected_output: '리서치 보고서',
        time_estimate: '15분',
        tips: '결론과 시사점을 명확히 제시하면 활용도 높은 보고서가 됩니다.'
      }
    ],
    coachingTips: [
      'AI 검색 결과는 반드시 원본 출처를 확인하고 팩트 체크하세요.',
      '여러 AI 도구의 검색 결과를 교차 확인하면 더 신뢰할 수 있습니다.',
      '최신 정보가 중요한 주제는 Perplexity AI를, 학술적 근거가 필요하면 Liner를 활용하세요.',
      '리서치 결과는 항상 "그래서 우리는 무엇을 해야 하는가?"로 마무리하세요.'
    ],
    learningFocus: ['Perplexity AI 딥서치', 'NotebookLM 문서 분석', '효과적인 검색 전략']
  }
};

// =============================================
// 메인 함수: 카테고리별 특화 폴백 코칭 생성
// =============================================

export function generateCategoryFallbackCoaching(
  taskInfo: {
    name: string;
    organization: string;
    department: string;
    job_description: string;
    repeat_cycle: string;
    automation_request: string;
    estimated_hours: number;
    current_tools: string | null;
  },
  recommendation: RecommendationResult
): AICoachingResult {
  // 카테고리에 해당하는 템플릿 가져오기
  const category = recommendation.category;
  const template = CATEGORY_TEMPLATES[category] || CATEGORY_TEMPLATES['문서작성']; // 기본값

  // 추천된 도구 정보 가져오기
  const topTools = recommendation.recommended_tools.slice(0, 5);

  // 워크플로우에 실제 추천 도구 정보 반영
  const customizedWorkflow = customizeWorkflowWithTools(
    template.workflow,
    topTools,
    taskInfo.job_description
  );

  // 요약문 템플릿 변수 치환
  const summary = template.summaryTemplate
    .replace('${name}', taskInfo.name)
    .replace('${job_description}', taskInfo.job_description);

  // 학습 로드맵 생성
  const learningRoadmap = generateLearningRoadmap(topTools, template.learningFocus);

  return {
    summary: summary,
    workflow: customizedWorkflow,
    coaching_tips: template.coachingTips,
    time_analysis: {
      before: `현재 ${taskInfo.estimated_hours}시간 소요`,
      after: `자동화 후 약 ${recommendation.time_saving.new_hours}시간 소요 예상`,
      efficiency_gain: `약 ${recommendation.time_saving.saved_hours}시간(${recommendation.time_saving.percentage}%)의 시간을 절감할 수 있습니다. ${category} 업무의 핵심 단계를 AI가 대신 처리합니다.`
    },
    learning_roadmap: learningRoadmap,
    conclusion: generateConclusion(taskInfo.name, category, topTools[0]?.tool.name || 'AI 도구')
  };
}

// 워크플로우를 실제 추천 도구에 맞게 커스터마이징
function customizeWorkflowWithTools(
  templateWorkflow: WorkflowStep[],
  recommendedTools: RecommendedTool[],
  jobDescription: string
): WorkflowStep[] {
  // 추천된 도구명 목록
  const toolNames = recommendedTools.map(rt => rt.tool.name);
  
  return templateWorkflow.map((step, index) => {
    // 추천 도구 중 현재 단계의 도구가 있는지 확인
    const matchingTool = recommendedTools.find(rt => 
      rt.tool.name === step.tool_name ||
      rt.tool.category.includes(step.tool_name) ||
      step.tool_name.includes(rt.tool.name)
    );

    // 매칭되는 추천 도구가 있으면 해당 도구 정보로 업데이트
    if (matchingTool) {
      return {
        ...step,
        tool_name: matchingTool.tool.name,
        tool_url: matchingTool.tool.website_url || step.tool_url,
        tips: `${matchingTool.reason} ${step.tips}`
      };
    }

    // 추천 도구 목록에서 순서대로 배정 (템플릿 도구가 없는 경우)
    if (index < recommendedTools.length && !toolNames.includes(step.tool_name)) {
      const altTool = recommendedTools[index];
      return {
        ...step,
        tool_name: altTool.tool.name,
        tool_url: altTool.tool.website_url || '',
        tips: `${altTool.reason} ${step.tips}`
      };
    }

    return step;
  });
}

// 학습 로드맵 생성
function generateLearningRoadmap(
  recommendedTools: RecommendedTool[],
  focusAreas: string[]
): LearningStep[] {
  return recommendedTools.slice(0, 3).map((rt, index) => ({
    priority: index + 1,
    tool_name: rt.tool.name,
    reason: rt.reason,
    learning_resources: `${rt.tool.name} 공식 문서, YouTube 튜토리얼, ${focusAreas[index] || '관련 온라인 강의'}`,
    estimated_learning_time: rt.tool.difficulty === 'beginner' ? '30분-1시간' : 
                            rt.tool.difficulty === 'intermediate' ? '1-2시간' : '2-3시간'
  }));
}

// 종합 코멘트 생성
function generateConclusion(name: string, category: string, topToolName: string): string {
  const conclusions: Record<string, string> = {
    '문서작성': `${name}님, 문서 작성 업무는 AI 도구를 활용하면 초안 작성 시간을 크게 줄일 수 있습니다. 먼저 ${topToolName}부터 시작해서 기본적인 문서 작성 프롬프트를 익히시고, 점차 다른 도구로 확장해보세요. 꾸준히 연습하면 분명 좋은 결과를 얻으실 수 있습니다!`,
    '데이터분석': `${name}님, 데이터 분석 업무는 AI 도구로 데이터 정리부터 시각화까지 자동화할 수 있습니다. ${topToolName}으로 먼저 간단한 데이터 분석을 시도해보시고, 점차 복잡한 분석으로 확장하세요. 반복 분석 업무는 반드시 자동화해두시면 큰 시간 절감이 됩니다!`,
    '마케팅': `${name}님, 마케팅 콘텐츠 제작은 AI 도구의 효과가 가장 크게 나타나는 분야입니다. ${topToolName}으로 아이디어 발굴과 초안 작성을 시작하시고, 브랜드 톤에 맞게 다듬어 나가시면 됩니다. 일관된 콘텐츠 퀄리티를 유지하는 것이 핵심입니다!`,
    '업무자동화': `${name}님, 반복 업무 자동화는 처음 설정에 시간이 걸리지만 장기적으로 큰 효과를 얻을 수 있습니다. ${topToolName}으로 간단한 자동화부터 시작하시고, 점차 복잡한 워크플로우로 확장해보세요. 자동화 전/후 시간을 측정하면서 개선해나가시면 됩니다!`,
    '일정관리': `${name}님, 일정 관리의 핵심은 모든 일정을 한 곳에서 관리하는 것입니다. ${topToolName}으로 일정 통합 관리를 시작하시고, 자동 리마인더와 팔로업 설정을 추가해보세요. 회의 없는 시간 블록을 확보하는 것도 중요한 팁입니다!`,
    '회의': `${name}님, 회의 관련 업무는 AI 도구로 녹음부터 회의록 작성까지 자동화할 수 있습니다. ${topToolName}으로 회의 녹음과 요약을 시작하시고, 액션 아이템 관리까지 연결하면 후속 조치 누락을 방지할 수 있습니다. 회의록은 24시간 이내 공유를 목표로 하세요!`,
    '이미지생성': `${name}님, 이미지 제작은 이제 디자인 전문가가 아니어도 AI로 충분히 가능합니다. ${topToolName}으로 기본적인 이미지 생성부터 시작하시고, 프롬프트 작성법을 익히면 원하는 결과를 더 정확히 얻을 수 있습니다. 브랜드 일관성 유지에 신경 쓰세요!`,
    '영상생성': `${name}님, 영상 제작도 AI 도구로 훨씬 쉬워졌습니다. ${topToolName}으로 짧은 클립부터 시작하시고, 편집 도구로 조합하는 방식을 익히세요. 처음에는 15-30초 숏폼부터 시작하는 것을 추천드립니다. 스크립트 기획에 충분한 시간을 투자하세요!`,
    '고객서비스': `${name}님, 고객 서비스 자동화는 반복 문의 처리 시간을 크게 줄여줍니다. ${topToolName}으로 기본 FAQ 챗봇부터 구축하시고, 고객 피드백을 반영해 지속적으로 개선해나가세요. 복잡한 문의는 빠르게 상담원에게 연결되도록 설계하는 것이 중요합니다!`,
    '개발': `${name}님, 개발 업무는 AI 코딩 도구로 생산성을 크게 높일 수 있습니다. ${topToolName}으로 반복적인 코드 작성부터 시작하시고, AI가 생성한 코드는 반드시 이해하고 검토한 후 사용하세요. 보안이 중요한 코드는 추가 검토를 권장드립니다!`,
    '리서치': `${name}님, 리서치 업무는 AI 검색 도구로 정보 수집 시간을 크게 단축할 수 있습니다. ${topToolName}으로 실시간 정보 검색을 시작하시고, 반드시 출처를 확인하는 습관을 들이세요. 여러 소스를 교차 검증하면 더 신뢰할 수 있는 결과를 얻을 수 있습니다!`
  };

  return conclusions[category] || conclusions['문서작성'];
}

// 카테고리 목록 export (다른 모듈에서 사용)
export const AVAILABLE_CATEGORIES = Object.keys(CATEGORY_TEMPLATES);
