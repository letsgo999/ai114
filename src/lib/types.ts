// =============================================
// 타입 정의
// =============================================

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
  status: 'pending' | 'analyzed' | 'commented' | 'completed';
  coach_comment_status: 'none' | 'draft' | 'published';
  created_at: number;
  updated_at: number;
}

export interface Comment {
  id: string;
  task_id: string;
  additional_tools: string | null;
  tool_explanation: string | null;
  tips: string | null;
  learning_priority: string | null;
  general_comment: string | null;
  status: 'draft' | 'published';
  coach_name: string;
  created_at: number;
  updated_at: number;
}

export interface AITool {
  id: string;
  name: string;
  category: string;
  subcategory: string | null;
  description: string;
  website_url: string | null;
  use_cases: string;
  keywords: string;
  automation_level: 'full' | 'semi' | 'assist';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  pricing_type: 'free' | 'freemium' | 'paid';
  pricing_detail: string | null;
  rating: number;
  popularity: number;
  is_active: number;
  created_at: number;
  updated_at: number;
}

// D1 바인딩 타입
export interface Bindings {
  DB: D1Database;
  GEMINI_API_KEY: string;
}

// 요청/응답 타입
export interface CreateTaskRequest {
  organization: string;
  department: string;
  name: string;
  job_description: string;
  repeat_cycle: string;
  automation_request: string;
  email: string;
  current_tools?: string;
  estimated_hours?: number;
}

export interface TaskWithRecommendation extends Task {
  parsedRecommendation?: {
    category: string;
    keywords: string[];
    recommended_tools: Array<{
      tool: AITool;
      score: number;
      matchedKeywords: string[];
      reason: string;
    }>;
    automation_level: string;
    time_saving: {
      percentage: number;
      saved_hours: number;
      new_hours: number;
    };
  };
  comment?: Comment;
}
