import request from './request'
import type { ScoreItem, Student, StudentScoreLog } from '@/types'

export const getStudents = (classId: number, params?: { group_id?: number; search?: string }) => {
  const queryParams = new URLSearchParams()
  if (params?.group_id) queryParams.set('group_id', String(params.group_id))
  if (params?.search) queryParams.set('search', params.search)
  return request.get<any, Student[]>(`/classes/${classId}/students?${queryParams}`)
}

export const getStudent = (classId: number, studentId: number) => {
  return request.get<any, Student>(`/classes/${classId}/students/${studentId}`)
}

export const createStudent = (classId: number, data: Partial<Student>) => {
  return request.post<any, Student>(`/classes/${classId}/students`, data)
}

export const updateStudent = (classId: number, studentId: number, data: Partial<Student>) => {
  return request.put<any, Student>(`/classes/${classId}/students/${studentId}`, data)
}

export const deleteStudent = (classId: number, studentId: number) => {
  return request.delete<any, void>(`/classes/${classId}/students/${studentId}`)
}

export const scoreStudent = (studentId: number, data: { score_item_id: number; remark?: string }) => {
  return request.post<any, StudentScoreLog>(`/students/${studentId}/score`, data)
}

export const getScoreItems = (
  classId: number,
  options: { enabledOnly?: boolean; targetType?: 'student' | 'group' } = {}
) => {
  const queryParams = new URLSearchParams()
  queryParams.set('enabled_only', String(options.enabledOnly ?? true))
  if (options.targetType) queryParams.set('target_type', options.targetType)
  return request.get<any, ScoreItem[]>(`/classes/${classId}/score-items?${queryParams}`)
}

export const createScoreItem = (classId: number, data: any) => {
  return request.post<any, any>(`/classes/${classId}/score-items`, data)
}

export const updateScoreItem = (classId: number, itemId: number, data: any) => {
  return request.put<any, any>(`/classes/${classId}/score-items/${itemId}`, data)
}

export const deleteScoreItem = (classId: number, itemId: number) => {
  return request.delete<any, void>(`/classes/${classId}/score-items/${itemId}`)
}

export const getStudentScoreLogs = (studentId: number) => {
  return request.get<any, StudentScoreLog[]>(`/students/${studentId}/score-logs`)
}
