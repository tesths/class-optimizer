import request from './request'
import type { ClassScoreHistoryItem, GroupHistoryItem, StudentHistoryItem } from '@/types'

export const getClassScoreHistory = (classId: number) => {
  return request.get<any, ClassScoreHistoryItem[]>(`/classes/${classId}/score-history`)
}

export const getStudentScoreHistory = (classId: number) => {
  return request.get<any, StudentHistoryItem[]>(`/classes/${classId}/student-score-history`)
}

export const getGroupScoreHistory = (classId: number) => {
  return request.get<any, GroupHistoryItem[]>(`/classes/${classId}/group-score-history`)
}
