const TOKEN_STORAGE_KEY = 'token'
const TOKEN_COOKIE_KEY = 'auth_token'
const TOKEN_COOKIE_MAX_AGE = 60 * 60 * 24 * 7

function isBrowser() {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

function parseCookieToken(cookieSource: string): string | null {
  const tokenEntry = cookieSource
    .split(';')
    .map(entry => entry.trim())
    .find(entry => entry.startsWith(`${TOKEN_COOKIE_KEY}=`))

  if (!tokenEntry) return null

  const [, value = ''] = tokenEntry.split('=')
  return value ? decodeURIComponent(value) : null
}

export function getPersistedToken(): string | null {
  if (!isBrowser()) return null

  try {
    const localToken = window.localStorage.getItem(TOKEN_STORAGE_KEY)
    if (localToken) return localToken
  } catch {
    // Safari private mode and some embedded browsers can reject storage access.
  }

  return parseCookieToken(document.cookie)
}

export function persistToken(token: string) {
  if (!isBrowser()) return

  try {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token)
  } catch {
    // Ignore storage write failures and fall back to cookies.
  }

  document.cookie = [
    `${TOKEN_COOKIE_KEY}=${encodeURIComponent(token)}`,
    'Path=/',
    `Max-Age=${TOKEN_COOKIE_MAX_AGE}`,
    'SameSite=Lax'
  ].join('; ')
}

export function clearPersistedToken() {
  if (!isBrowser()) return

  try {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY)
  } catch {
    // Ignore storage cleanup failures and still expire the cookie.
  }

  document.cookie = [
    `${TOKEN_COOKIE_KEY}=`,
    'Path=/',
    'Max-Age=0',
    'SameSite=Lax'
  ].join('; ')
}

export function clearPersistedAuthState() {
  clearPersistedToken()
}

