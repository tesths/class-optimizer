import request from './request'
import type { GroupMember, GroupScoreLog, StudentGroup } from '@/types'

export const getGroups = (classId: number) => {
  return request.get<any, StudentGroup[]>(`/classes/${classId}/groups`)
}

export const createGroup = (classId: number, data: Partial<StudentGroup>) => {
  return request.post<any, StudentGroup>(`/classes/${classId}/groups`, data)
}

export const updateGroup = (classId: number, groupId: number, data: Partial<StudentGroup>) => {
  return request.put<any, StudentGroup>(`/classes/${classId}/groups/${groupId}`, data)
}

export const deleteGroup = (classId: number, groupId: number) => {
  return request.delete<any, void>(`/classes/${classId}/groups/${groupId}`)
}

export const addGroupMember = (classId: number, groupId: number, studentId: number) => {
  return request.post<any, any>(`/classes/${classId}/groups/${groupId}/members`, { student_id: studentId })
}

export const getGroupMembers = (classId: number, groupId: number) => {
  return request.get<any, GroupMember[]>(`/classes/${classId}/groups/${groupId}/members`)
}

export const removeGroupMember = (classId: number, groupId: number, studentId: number) => {
  return request.delete<any, void>(`/classes/${classId}/groups/${groupId}/members/${studentId}`)
}

export const scoreGroup = (groupId: number, data: { score_item_id: number; remark?: string }) => {
  return request.post<any, GroupScoreLog>(`/groups/${groupId}/score`, data)
}

export const getGroupScoreLogs = (groupId: number) => {
  return request.get<any, GroupScoreLog[]>(`/groups/${groupId}/score-logs`)
}
