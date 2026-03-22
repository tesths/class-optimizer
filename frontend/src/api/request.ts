import axios from 'axios'
import type { AxiosInstance, AxiosResponse } from 'axios'
import { API_BASE_URL } from './base'
import { clearPersistedToken, getPersistedToken } from '@/utils/authPersistence'

const instance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
})

// Request interceptor
instance.interceptors.request.use(
  (config) => {
    const token = getPersistedToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor
instance.interceptors.response.use(
  (response: AxiosResponse) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      clearPersistedToken()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default instance
