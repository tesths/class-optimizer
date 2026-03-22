import request from './request'

export interface ImportPreviewItem {
  row: number
  name: string
  student_no: string
  gender?: string
  seat_no?: string
  group_name?: string
  notes?: string
  status: 'ok' | 'error'
  error?: string
}

export interface ImportPreviewResponse {
  total: number
  valid_count: number
  error_count: number
  items: ImportPreviewItem[]
}

export interface ImportJob {
  id: number
  class_id: number
  operator_id: number
  file_name: string
  total_rows: number
  success_rows: number
  failed_rows: number
  error_report?: string
  created_at: string
}

export const downloadImportTemplate = (classId: number) => {
  return request.get(`/classes/${classId}/students/import/template`, {
    responseType: 'blob'
  })
}

export const previewImport = (classId: number, file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  return request.post<any, ImportPreviewResponse>(`/classes/${classId}/students/import/preview`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

export const executeImport = (classId: number, file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  return request.post<any, ImportJob>(`/classes/${classId}/students/import/commit`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}
