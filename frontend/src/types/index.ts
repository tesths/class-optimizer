// User types
export interface User {
  id: number
  username: string
  is_active: boolean
  created_at: string
  teacher_profile?: TeacherProfile
}

export interface TeacherProfile {
  id: number
  user_id: number
  real_name: string
  subject: string
  phone?: string
  email?: string
  avatar_url?: string
  bio?: string
}

// Auth types
export interface LoginForm {
  username: string
  password: string
}

export interface RegisterForm {
  username: string
  password: string
  confirm_password: string
  real_name: string
  subject: string
}

export interface AuthResponse {
  access_token: string
  token_type: string
}

// Class types
export interface Class {
  id: number
  name: string
  grade: string
  school_year: string
  term_id?: number
  description?: string
  visual_theme: 'farm' | 'tree'
  group_growth_thresholds?: number[]
  creator_id: number
  created_at: string
  updated_at: string
  student_count?: number
  teacher_count?: number
}

export interface ClassTeacher {
  id: number
  class_id: number
  user_id: number
  role: 'class_admin' | 'class_teacher'
  user?: User
}

// Student types
export interface Student {
  id: number
  class_id: number
  name: string
  student_no: string
  gender?: string
  seat_no?: string
  avatar_url?: string
  notes?: string
  group_id?: number
  group_name?: string
  total_score?: number
  growth_stage?: string
  created_at: string
  updated_at: string
}

// Group types
export interface StudentGroup {
  id: number
  class_id: number
  name: string
  leader_student_id?: number
  total_score?: number
  member_count?: number
  created_at: string
  updated_at: string
}

export interface GroupMember {
  id: number
  group_id: number
  student_id: number
  student?: Student
}

// Score types
export interface ScoreItem {
  id: number
  class_id: number
  name: string
  target_type: 'student' | 'group'
  score_type: 'plus' | 'minus'
  score_value: number
  subject?: string
  color_tag?: string
  icon_name?: string
  enabled: boolean
  sort_order: number
}

export interface StudentScoreLog {
  id: number
  class_id: number
  student_id: number
  operator_id: number
  score_item_id?: number
  item_name_snapshot: string
  score_delta: number
  score_type: 'plus' | 'minus'
  subject?: string
  remark?: string
  is_revoked: boolean
  revoked_by?: number
  revoked_at?: string
  created_at: string
}

export interface GroupScoreLog {
  id: number
  class_id: number
  group_id: number
  operator_id: number
  score_item_id?: number
  item_name_snapshot: string
  score_delta: number
  subject?: string
  remark?: string
  is_revoked: boolean
  revoked_by?: number
  revoked_at?: string
  created_at: string
}

export interface ClassScoreHistoryItem {
  id: number
  class_id: number
  type: 'student' | 'group'
  student_id?: number
  student_name?: string
  group_id?: number
  group_name?: string
  item_name_snapshot: string
  score_delta: number
  score_type: 'plus' | 'minus'
  subject?: string
  remark?: string
  is_revoked: boolean
  revoked_by?: number
  revoked_at?: string
  created_at: string
}

export interface StudentHistoryItem {
  id: number
  class_id: number
  student_id: number
  student_name: string
  score_item_id?: number
  item_name_snapshot: string
  score_delta: number
  score_type: 'plus' | 'minus'
  subject?: string
  remark?: string
  is_revoked: boolean
  revoked_by?: number
  revoked_at?: string
  created_at: string
}

export interface GroupHistoryItem {
  id: number
  class_id: number
  group_id: number
  group_name: string
  score_item_id?: number
  item_name_snapshot: string
  score_delta: number
  score_type: 'plus' | 'minus'
  subject?: string
  remark?: string
  is_revoked: boolean
  revoked_by?: number
  revoked_at?: string
  created_at: string
}

// Term types
export interface Term {
  id: number
  name: string
  start_date: string
  end_date: string
  created_by: number
  created_at: string
}

// Stats types
export interface StatsOverview {
  student_count: number
  group_count: number
  week_plus: number
  week_minus: number
  month_plus: number
  month_minus: number
}

export interface StudentStats {
  student_id: number
  name: string
  total_score: number
  week_score: number
  month_score: number
  semester_score: number
  plus_count: number
  minus_count: number
}

export interface GroupStats {
  group_id: number
  name: string
  total_score: number
  week_score: number
  month_score: number
  semester_score: number
}

export interface SubjectStats {
  subject: string
  plus_count: number
  minus_count: number
  total_delta: number
}
