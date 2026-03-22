import request from './request'
import type { StatsOverview, StudentStats, GroupStats, SubjectStats } from '@/types'

export const getStatsOverview = (classId: number) => {
  return request.get<any, StatsOverview>(`/classes/${classId}/stats/overview`)
}

export const getStudentStats = (classId: number) => {
  return request.get<any, StudentStats[]>(`/classes/${classId}/stats/students`)
}

export const getGroupStats = (classId: number) => {
  return request.get<any, GroupStats[]>(`/classes/${classId}/stats/groups`)
}

export const getSubjectStats = (classId: number) => {
  return request.get<any, SubjectStats[]>(`/classes/${classId}/stats/subjects`)
}
