import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import * as authApi from '@/api/auth'

// Mock the API module
vi.mock('@/api/auth', () => ({
  login: vi.fn(),
  register: vi.fn(),
  getMe: vi.fn()
}))

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: () => { store = {} }
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

describe('Auth Store', () => {
  let authStore: ReturnType<typeof useAuthStore>

  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
    document.cookie = 'auth_token=; Path=/; Max-Age=0; SameSite=Lax'
    setActivePinia(createPinia())
    authStore = useAuthStore()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initial state', () => {
    it('should have null token initially', () => {
      expect(authStore.token).toBeNull()
    })

    it('should have null user initially', () => {
      expect(authStore.user).toBeNull()
    })

    it('should not be authenticated initially', () => {
      expect(authStore.isAuthenticated).toBe(false)
    })
  })

  describe('loginAction', () => {
    it('should login successfully with valid credentials', async () => {
      const mockResponse = { access_token: 'test-token-123' }
      const mockUser = {
        id: 1,
        username: 'testuser',
        is_active: true,
        created_at: '2024-01-01'
      }

      vi.mocked(authApi.login).mockResolvedValue(mockResponse)
      vi.mocked(authApi.getMe).mockResolvedValue(mockUser)

      const result = await authStore.loginAction({
        username: 'testuser',
        password: 'password123'
      })

      expect(result).toEqual(mockResponse)
      expect(authStore.token).toBe('test-token-123')
      expect(authStore.isAuthenticated).toBe(true)
      expect(localStorageMock.setItem).toHaveBeenCalledWith('token', 'test-token-123')
    })

    it('should store token in localStorage on login', async () => {
      const mockResponse = { access_token: 'token-abc' }
      vi.mocked(authApi.login).mockResolvedValue(mockResponse)
      vi.mocked(authApi.getMe).mockResolvedValue({ id: 1, username: 'user', is_active: true, created_at: '' })

      await authStore.loginAction({ username: 'user', password: 'pass' })

      expect(localStorageMock.setItem).toHaveBeenCalledWith('token', 'token-abc')
    })

    it('should fetch user after successful login', async () => {
      const mockUser = { id: 1, username: 'testuser', is_active: true, created_at: '2024-01-01' }
      vi.mocked(authApi.login).mockResolvedValue({ access_token: 'token' })
      vi.mocked(authApi.getMe).mockResolvedValue(mockUser)

      await authStore.loginAction({ username: 'testuser', password: 'password' })

      expect(authApi.getMe).toHaveBeenCalled()
      expect(authStore.user).toEqual(mockUser)
    })

    it('should propagate login error', async () => {
      const error = new Error('Invalid credentials')
      vi.mocked(authApi.login).mockRejectedValue(error)

      await expect(
        authStore.loginAction({ username: 'wrong', password: 'wrong' })
      ).rejects.toThrow('Invalid credentials')
    })
  })

  describe('logout', () => {
    it('should clear token on logout', async () => {
      // Setup logged in state
      vi.mocked(authApi.login).mockResolvedValue({ access_token: 'token' })
      vi.mocked(authApi.getMe).mockResolvedValue({ id: 1, username: 'user', is_active: true, created_at: '' })
      await authStore.loginAction({ username: 'user', password: 'pass' })

      authStore.logout()

      expect(authStore.token).toBeNull()
    })

    it('should clear user on logout', async () => {
      vi.mocked(authApi.login).mockResolvedValue({ access_token: 'token' })
      vi.mocked(authApi.getMe).mockResolvedValue({ id: 1, username: 'user', is_active: true, created_at: '' })
      await authStore.loginAction({ username: 'user', password: 'pass' })

      authStore.logout()

      expect(authStore.user).toBeNull()
    })

    it('should remove token from localStorage on logout', async () => {
      vi.mocked(authApi.login).mockResolvedValue({ access_token: 'token' })
      vi.mocked(authApi.getMe).mockResolvedValue({ id: 1, username: 'user', is_active: true, created_at: '' })
      await authStore.loginAction({ username: 'user', password: 'pass' })

      authStore.logout()

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('token')
    })

    it('should set isAuthenticated to false after logout', async () => {
      vi.mocked(authApi.login).mockResolvedValue({ access_token: 'token' })
      vi.mocked(authApi.getMe).mockResolvedValue({ id: 1, username: 'user', is_active: true, created_at: '' })
      await authStore.loginAction({ username: 'user', password: 'pass' })

      authStore.logout()

      expect(authStore.isAuthenticated).toBe(false)
    })
  })

  describe('token storage/retrieval', () => {
    it('should read token from localStorage on initialization', () => {
      localStorageMock.getItem.mockReturnValue('stored-token-456')

      setActivePinia(createPinia())
      const store = useAuthStore()

      expect(store.token).toBe('stored-token-456')
      expect(store.isAuthenticated).toBe(true)
    })

    it('should return null if no token in localStorage', () => {
      localStorageMock.getItem.mockReturnValue(null)

      setActivePinia(createPinia())
      const store = useAuthStore()

      expect(store.token).toBeNull()
      expect(store.isAuthenticated).toBe(false)
    })
  })

  describe('currentUser computed', () => {
    it('should return user object when logged in', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        is_active: true,
        created_at: '2024-01-01',
        teacher_profile: {
          id: 1,
          user_id: 1,
          real_name: 'Test Teacher',
          subject: 'Math'
        }
      }

      vi.mocked(authApi.login).mockResolvedValue({ access_token: 'token' })
      vi.mocked(authApi.getMe).mockResolvedValue(mockUser)
      await authStore.loginAction({ username: 'user', password: 'pass' })

      expect(authStore.user).toEqual(mockUser)
      expect(authStore.user?.teacher_profile?.real_name).toBe('Test Teacher')
    })

    it('should return null when not logged in', () => {
      expect(authStore.user).toBeNull()
    })
  })

  describe('isAuthenticated computed', () => {
    it('should return true when token exists', () => {
      authStore.token = 'valid-token'
      expect(authStore.isAuthenticated).toBe(true)
    })

    it('should return false when token is null', () => {
      authStore.token = null
      expect(authStore.isAuthenticated).toBe(false)
    })

    it('should return false when token is empty string', () => {
      authStore.token = ''
      expect(authStore.isAuthenticated).toBe(false)
    })
  })

  describe('fetchUser', () => {
    it('should not fetch user if no token', async () => {
      authStore.token = null

      await authStore.fetchUser()

      expect(authApi.getMe).not.toHaveBeenCalled()
    })

    it('should call getMe API when token exists', async () => {
      authStore.token = 'valid-token'
      const mockUser = { id: 1, username: 'user', is_active: true, created_at: '' }
      vi.mocked(authApi.getMe).mockResolvedValue(mockUser)

      await authStore.fetchUser()

      expect(authApi.getMe).toHaveBeenCalled()
      expect(authStore.user).toEqual(mockUser)
    })

    it('should logout on fetchUser 401 error', async () => {
      authStore.token = 'valid-token'
      vi.mocked(authApi.getMe).mockRejectedValue({ response: { status: 401 } } as never)

      await authStore.fetchUser()

      expect(authStore.token).toBeNull()
      expect(authStore.user).toBeNull()
    })

    it('should preserve token on transient fetchUser error', async () => {
      authStore.token = 'valid-token'
      vi.mocked(authApi.getMe).mockRejectedValue(new Error('Network Error'))

      await authStore.fetchUser()

      expect(authStore.token).toBe('valid-token')
    })
  })

  describe('registerAction', () => {
    it('should call register API with form data', async () => {
      const mockResponse = { id: 1, username: 'newuser' }
      vi.mocked(authApi.register).mockResolvedValue(mockResponse)

      const form = {
        username: 'newuser',
        password: 'password123',
        confirm_password: 'password123',
        real_name: 'New User',
        subject: 'Math'
      }

      const result = await authStore.registerAction(form)

      expect(authApi.register).toHaveBeenCalledWith(form)
      expect(result).toEqual(mockResponse)
    })
  })
})
