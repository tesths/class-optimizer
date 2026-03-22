import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login, register, getMe } from '@/api/auth'
import type { User, LoginForm, RegisterForm } from '@/types'
import { clearPersistedToken, getPersistedToken, persistToken } from '@/utils/authPersistence'

function getErrorStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null || !('response' in error)) {
    return undefined
  }

  const response = (error as { response?: { status?: number } }).response
  return response?.status
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(getPersistedToken())
  const user = ref<User | null>(null)

  const isAuthenticated = computed(() => !!token.value)

  async function loginAction(form: LoginForm) {
    const res = await login(form)
    token.value = res.access_token
    persistToken(res.access_token)
    await fetchUser()
    return res
  }

  async function registerAction(form: RegisterForm) {
    return await register(form)
  }

  async function fetchUser() {
    if (!token.value) return
    try {
      user.value = await getMe()
    } catch (error) {
      const status = getErrorStatus(error)
      if (status === 401 || status === 403) {
        logout()
      }
    }
  }

  function logout() {
    token.value = null
    user.value = null
    clearPersistedToken()
  }

  return { token, user, isAuthenticated, loginAction, registerAction, fetchUser, logout }
})
