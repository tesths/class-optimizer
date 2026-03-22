import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import * as authApi from '@/api/auth'

vi.mock('@/api/auth', () => ({
  login: vi.fn(),
  register: vi.fn(),
  getMe: vi.fn()
}))

describe('auth store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    document.cookie = 'auth_token=; Path=/; Max-Age=0; SameSite=Lax'
    setActivePinia(createPinia())
  })

  it('stores the token and fetches the current user after login', async () => {
    vi.mocked(authApi.login).mockResolvedValue({
      access_token: 'token-123',
      token_type: 'bearer'
    })
    vi.mocked(authApi.getMe).mockResolvedValue({
      id: 1,
      username: 'teacher1',
      is_active: true,
      created_at: '2024-01-01',
      teacher_profile: {
        id: 1,
        user_id: 1,
        real_name: 'Teacher One',
        subject: 'Math'
      }
    })

    const store = useAuthStore()
    await store.loginAction({ username: 'teacher1', password: 'secret123' })

    expect(store.isAuthenticated).toBe(true)
    expect(store.token).toBe('token-123')
    expect(localStorage.getItem('token')).toBe('token-123')
    expect(store.user?.teacher_profile?.real_name).toBe('Teacher One')
  })

  it('delegates registration to the auth API', async () => {
    vi.mocked(authApi.register).mockResolvedValue({ message: '注册成功' } as never)

    const store = useAuthStore()
    await store.registerAction({
      username: 'new-user',
      password: 'secret123',
      confirm_password: 'secret123',
      real_name: 'New User',
      subject: 'Science'
    })

    expect(authApi.register).toHaveBeenCalledOnce()
  })

  it('logs out when fetching the current user returns 401', async () => {
    localStorage.setItem('token', 'stale-token')
    vi.mocked(authApi.getMe).mockRejectedValue({ response: { status: 401 } } as never)

    const store = useAuthStore()
    expect(store.token).toBe('stale-token')

    await store.fetchUser()

    expect(store.token).toBeNull()
    expect(store.user).toBeNull()
    expect(localStorage.getItem('token')).toBeNull()
  })

  it('keeps the token when fetching the current user fails transiently', async () => {
    localStorage.setItem('token', 'stale-token')
    vi.mocked(authApi.getMe).mockRejectedValue(new Error('network down'))

    const store = useAuthStore()
    await store.fetchUser()

    expect(store.token).toBe('stale-token')
    expect(localStorage.getItem('token')).toBe('stale-token')
  })

  it('clears local state on logout', () => {
    localStorage.setItem('token', 'token-123')
    const store = useAuthStore()
    store.user = {
      id: 1,
      username: 'teacher1',
      is_active: true,
      created_at: '2024-01-01'
    }

    store.logout()

    expect(store.isAuthenticated).toBe(false)
    expect(store.user).toBeNull()
    expect(localStorage.getItem('token')).toBeNull()
  })
})
