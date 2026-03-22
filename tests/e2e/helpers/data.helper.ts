import { APIRequestContext, APIResponse, expect, Page } from '@playwright/test'

export interface TeacherCredentials {
  username: string
  password: string
  realName: string
  subject: string
}

export interface ClassSeed {
  id: number
  name: string
  grade: string
  school_year: string
  description?: string | null
  visual_theme: 'farm' | 'tree'
  group_growth_thresholds?: number[]
}

export interface StudentSeed {
  id: number
  name: string
  student_no: string
  gender?: string | null
  seat_no?: string | null
  total_score?: number
  growth_stage?: string | null
}

export interface GroupSeed {
  id: number
  name: string
  member_count?: number
  total_score?: number
}

export interface ScoreItemSeed {
  id: number
  name: string
  target_type: 'student' | 'group'
  score_type: 'plus' | 'minus'
  score_value: number
  enabled: boolean
}

export interface StatsOverviewSeed {
  student_count: number
  group_count: number
  week_plus: number
  week_minus: number
  month_plus: number
  month_minus: number
}

export function uniqueName(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`
  }
}

async function expectOk(response: APIResponse, action: string) {
  if (response.ok()) return
  const body = await response.text()
  throw new Error(`${action} failed: ${response.status()} ${body}`)
}

export async function expectStatus(
  response: APIResponse,
  expectedStatuses: number[],
  action: string
) {
  if (expectedStatuses.includes(response.status())) return
  const body = await response.text()
  throw new Error(`${action} failed: ${response.status()} ${body}`)
}

export function buildTeacherCredentials(prefix = 'teacher'): TeacherCredentials {
  const suffix = uniqueName(prefix)
  return {
    username: suffix,
    password: 'password123',
    realName: '测试教师',
    subject: '语文'
  }
}

export async function registerTeacher(
  request: APIRequestContext,
  overrides: Partial<TeacherCredentials> = {}
): Promise<TeacherCredentials> {
  const teacher = { ...buildTeacherCredentials('teacher'), ...overrides }
  const response = await request.post('/api/auth/register', {
    data: {
      username: teacher.username,
      password: teacher.password,
      confirm_password: teacher.password,
      real_name: teacher.realName,
      subject: teacher.subject
    }
  })
  await expectOk(response, 'register teacher')
  return teacher
}

export async function loginTeacher(
  request: APIRequestContext,
  username: string,
  password: string
): Promise<string> {
  const response = await request.post('/api/auth/login', {
    form: { username, password }
  })
  await expectOk(response, 'login teacher')
  const body = await response.json()
  return body.access_token
}

export async function openAuthenticatedPage(page: Page, token: string, path = '/') {
  await page.goto('/login')
  await page.evaluate((value) => {
    window.localStorage.setItem('token', value)
    document.cookie = `auth_token=${encodeURIComponent(value)}; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax`
  }, token)
  await page.goto(path)
}

export async function createTeacherSession(
  page: Page,
  request: APIRequestContext,
  overrides: Partial<TeacherCredentials> = {}
) {
  const teacher = await registerTeacher(request, overrides)
  const token = await loginTeacher(request, teacher.username, teacher.password)
  await openAuthenticatedPage(page, token)
  await expect(page).toHaveURL('/')
  await expect(page.getByRole('heading', { name: '我的班级' })).toBeVisible()
  await page.waitForLoadState('networkidle')
  await expect.poll(async () => {
    return await page.evaluate((value) => {
      const cookieToken = encodeURIComponent(value)
      return (
        window.localStorage.getItem('token') === value &&
        document.cookie.includes(`auth_token=${cookieToken}`)
      )
    }, token)
  }).toBe(true)
  return { teacher, token }
}

export async function createClass(
  request: APIRequestContext,
  token: string,
  overrides: Partial<Omit<ClassSeed, 'id'>> = {}
): Promise<ClassSeed> {
  const payload = {
    name: uniqueName('班级'),
    grade: '初一',
    school_year: '2025-2026',
    description: 'E2E test class',
    visual_theme: 'tree' as const,
    ...overrides
  }

  let lastResponse: APIResponse | null = null

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const response = await request.post('/api/classes', {
      data: payload,
      headers: authHeaders(token)
    })

    if (response.ok()) {
      return await response.json()
    }

    lastResponse = response
    if (response.status() >= 500 && attempt < 4) {
      await new Promise(resolve => setTimeout(resolve, attempt * 200))
      continue
    }

    break
  }

  await expectOk(lastResponse as APIResponse, 'create class')
  return await (lastResponse as APIResponse).json()
}

export async function getClassByApi(
  request: APIRequestContext,
  token: string,
  classId: number
): Promise<ClassSeed> {
  const response = await request.get(`/api/classes/${classId}`, {
    headers: authHeaders(token)
  })
  await expectOk(response, 'get class')
  return await response.json()
}

export async function updateClassByApi(
  request: APIRequestContext,
  token: string,
  classId: number,
  data: Partial<Omit<ClassSeed, 'id'>>
): Promise<ClassSeed> {
  const response = await request.put(`/api/classes/${classId}`, {
    data,
    headers: authHeaders(token)
  })
  await expectOk(response, 'update class')
  return await response.json()
}

export async function createStudent(
  request: APIRequestContext,
  token: string,
  classId: number,
  overrides: Partial<Omit<StudentSeed, 'id'>> = {}
): Promise<StudentSeed> {
  const payload = {
    name: uniqueName('学生'),
    student_no: `${Date.now()}${Math.floor(Math.random() * 100)}`.slice(-8),
    gender: '男',
    seat_no: '1',
    notes: '',
    ...overrides
  }
  const response = await request.post(`/api/classes/${classId}/students`, {
    data: payload,
    headers: authHeaders(token)
  })
  await expectOk(response, 'create student')
  return await response.json()
}

export async function listStudentsByApi(
  request: APIRequestContext,
  token: string,
  classId: number
): Promise<StudentSeed[]> {
  const response = await request.get(`/api/classes/${classId}/students`, {
    headers: authHeaders(token)
  })
  await expectOk(response, 'list students')
  return await response.json()
}

export async function createGroup(
  request: APIRequestContext,
  token: string,
  classId: number,
  overrides: Partial<Omit<GroupSeed, 'id'>> = {}
): Promise<GroupSeed> {
  const payload = {
    name: uniqueName('小组'),
    ...overrides
  }
  const response = await request.post(`/api/classes/${classId}/groups`, {
    data: payload,
    headers: authHeaders(token)
  })
  await expectOk(response, 'create group')
  return await response.json()
}

export async function listGroupsByApi(
  request: APIRequestContext,
  token: string,
  classId: number
): Promise<GroupSeed[]> {
  const response = await request.get(`/api/classes/${classId}/groups`, {
    headers: authHeaders(token)
  })
  await expectOk(response, 'list groups')
  return await response.json()
}

export async function addTeacherToClass(
  request: APIRequestContext,
  token: string,
  classId: number,
  username: string,
  role: 'class_admin' | 'class_teacher' = 'class_teacher'
) {
  const response = await request.post(`/api/classes/${classId}/teachers`, {
    data: { username, role },
    headers: authHeaders(token)
  })
  await expectOk(response, 'add teacher to class')
  return await response.json()
}

export async function addGroupMember(
  request: APIRequestContext,
  token: string,
  classId: number,
  groupId: number,
  studentId: number
) {
  const response = await request.post(`/api/classes/${classId}/groups/${groupId}/members`, {
    data: { student_id: studentId },
    headers: authHeaders(token)
  })
  await expectOk(response, 'add group member')
  return await response.json()
}

export async function createScoreItem(
  request: APIRequestContext,
  token: string,
  classId: number,
  overrides: Partial<Omit<ScoreItemSeed, 'id'>> = {}
): Promise<ScoreItemSeed> {
  const payload = {
    name: uniqueName('积分项'),
    target_type: 'student' as const,
    score_type: 'plus' as const,
    score_value: 2,
    enabled: true,
    sort_order: 0,
    ...overrides
  }
  const response = await request.post(`/api/classes/${classId}/score-items`, {
    data: payload,
    headers: authHeaders(token)
  })
  await expectOk(response, 'create score item')
  return await response.json()
}

export async function scoreStudentByApi(
  request: APIRequestContext,
  token: string,
  studentId: number,
  data: { score_item_id: number; remark?: string }
) {
  const response = await request.post(`/api/students/${studentId}/score`, {
    data,
    headers: authHeaders(token)
  })
  await expectOk(response, 'score student')
  return await response.json()
}

export async function getStudentScoreLogsByApi(
  request: APIRequestContext,
  token: string,
  studentId: number
) {
  const response = await request.get(`/api/students/${studentId}/score-logs`, {
    headers: authHeaders(token)
  })
  await expectOk(response, 'get student score logs')
  return await response.json()
}

export async function revokeStudentScoreLogByApi(
  request: APIRequestContext,
  token: string,
  logId: number
) {
  const response = await request.post(`/api/student-score-logs/${logId}/revoke`, {
    headers: authHeaders(token)
  })
  await expectOk(response, 'revoke student score log')
  return await response.json()
}

export async function scoreGroupByApi(
  request: APIRequestContext,
  token: string,
  groupId: number,
  data: { score_item_id: number; remark?: string }
) {
  const response = await request.post(`/api/groups/${groupId}/score`, {
    data,
    headers: authHeaders(token)
  })
  await expectOk(response, 'score group')
  return await response.json()
}

export async function getGroupScoreLogsByApi(
  request: APIRequestContext,
  token: string,
  groupId: number
) {
  const response = await request.get(`/api/groups/${groupId}/score-logs`, {
    headers: authHeaders(token)
  })
  await expectOk(response, 'get group score logs')
  return await response.json()
}

export async function revokeGroupScoreLogByApi(
  request: APIRequestContext,
  token: string,
  logId: number
) {
  const response = await request.post(`/api/group-score-logs/${logId}/revoke`, {
    headers: authHeaders(token)
  })
  await expectOk(response, 'revoke group score log')
  return await response.json()
}

export async function getStatsOverviewByApi(
  request: APIRequestContext,
  token: string,
  classId: number
): Promise<StatsOverviewSeed> {
  const response = await request.get(`/api/classes/${classId}/stats/overview`, {
    headers: authHeaders(token)
  })
  await expectOk(response, 'get stats overview')
  return await response.json()
}

export async function openClassDetail(page: Page, classId: number) {
  await page.goto(`/class/${classId}`)
  await expect(page).toHaveURL(new RegExp(`/class/${classId}$`))
}
