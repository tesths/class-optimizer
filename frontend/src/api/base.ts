const API_PREFIX = '/api'

const normalizeBaseUrl = (value?: string) => {
  const trimmed = value?.trim()
  if (!trimmed) {
    return API_PREFIX
  }

  const withoutTrailingSlash = trimmed.replace(/\/+$/, '')
  if (!withoutTrailingSlash || withoutTrailingSlash === API_PREFIX) {
    return API_PREFIX
  }

  return withoutTrailingSlash.endsWith(API_PREFIX)
    ? withoutTrailingSlash
    : `${withoutTrailingSlash}${API_PREFIX}`
}

export const API_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL)
