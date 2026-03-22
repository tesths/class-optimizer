import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearPersistedToken,
  getPersistedToken,
  persistToken
} from '@/utils/authPersistence'

describe('authPersistence', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
    document.cookie = 'auth_token=; Path=/; Max-Age=0; SameSite=Lax'
  })

  it('persists the token to localStorage and cookie', () => {
    persistToken('token-123')

    expect(localStorage.getItem('token')).toBe('token-123')
    expect(document.cookie).toContain('auth_token=token-123')
  })

  it('falls back to cookie when localStorage has no token', () => {
    document.cookie = 'auth_token=cookie-token; Path=/; SameSite=Lax'

    expect(getPersistedToken()).toBe('cookie-token')
  })

  it('clears the token from localStorage and cookie', () => {
    persistToken('token-123')

    clearPersistedToken()

    expect(localStorage.getItem('token')).toBeNull()
    expect(getPersistedToken()).toBeNull()
  })
})
