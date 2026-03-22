import request from './request'
import type { Class, StatsOverview } from '@/types'

export const getClasses = () => request.get<any, Class[]>('/classes')

export const getClass = (id: number) => request.get<any, Class>(`/classes/${id}`)

export const createClass = (data: Partial<Class>) => request.post<any, Class>('/classes', data)

export const updateClass = (id: number, data: Partial<Class>) => request.put<any, Class>(`/classes/${id}`, data)

export const deleteClass = (id: number) => request.delete<any, void>(`/classes/${id}`)

export const getClassStats = (id: number) => request.get<any, StatsOverview>(`/classes/${id}/stats/overview`)
