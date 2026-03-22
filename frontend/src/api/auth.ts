import request from './request'
import type { LoginForm, RegisterForm, User } from '@/types'
import axios from 'axios'
import { API_BASE_URL } from './base'

export const login = (data: LoginForm) => {
  const formData = new URLSearchParams()
  formData.append('username', data.username)
  formData.append('password', data.password)
  return axios.post('/auth/login', formData, {
    baseURL: API_BASE_URL,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  }).then(res => res.data)
}

export const register = (data: RegisterForm) => {
  return request.post('/auth/register', data)
}

export const getMe = () => {
  return request.get<any, User>('/auth/me')
}

export interface ProfileUpdateData {
  real_name?: string
  subject?: string
  phone?: string
  email?: string
  bio?: string
}

export const updateProfile = (data: ProfileUpdateData) => {
  return request.put('/auth/profile', data)
}
