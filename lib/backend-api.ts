import { normalizeFrontendUserPayload } from "@/lib/permissions"

export const API_BASE = process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "http://127.0.0.1:8000/api"
export const TOKEN_KEY = "bestsol-backend-token"
export const API_BASE_STORAGE_KEY = "bestsol-backend-api-base"

function getLocalStorage() {
  if (typeof window === "undefined") {
    return null
  }

  return window.localStorage
}

export function getStoredToken() {
  const storage = getLocalStorage()
  if (!storage) {
    return null
  }

  return storage.getItem(TOKEN_KEY)
}

export function setStoredToken(token: string) {
  const storage = getLocalStorage()
  if (!storage) {
    return
  }

  storage.setItem(TOKEN_KEY, token)
}

export function clearStoredToken() {
  const storage = getLocalStorage()
  if (!storage) {
    return
  }

  storage.removeItem(TOKEN_KEY)
}

export function getLoggedOutFlag() {
  return null
}

export function setLoggedOutFlag() {
  return
}

export function clearLoggedOutFlag() {
  return
}

function getNetworkErrorMessage() {
  return "Backend serverinə qoşulmaq olmadı. Lokal mühitdə `backend` tərəfində `php artisan serve` işlədiyini, deploy mühitində isə `NEXT_PUBLIC_BACKEND_API_URL` dəyərinin düzgün verildiyini yoxlayın."
}

function unique<T>(values: T[]) {
  return [...new Set(values)]
}

export function normalizeApiBase(base: string) {
  const trimmed = base.trim()
  if (!trimmed) {
    return API_BASE
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`
  const withoutTrailingSlash = withProtocol.replace(/\/+$/, "")

  if (withoutTrailingSlash.endsWith("/api")) {
    return withoutTrailingSlash
  }

  return `${withoutTrailingSlash}/api`
}

function getApiCandidates() {
  const envBase = normalizeApiBase(API_BASE)
  const candidates = [envBase]

  if (typeof window !== "undefined") {
    const storedBase = window.localStorage.getItem(API_BASE_STORAGE_KEY)
    const currentHost = window.location.hostname
    const isLocalHost =
      currentHost === "localhost" ||
      currentHost === "127.0.0.1" ||
      currentHost.endsWith(".local")

    if (storedBase) {
      const normalizedStoredBase = normalizeApiBase(storedBase)
      const storedHost = (() => {
        try {
          return new URL(normalizedStoredBase).hostname
        } catch {
          return ""
        }
      })()

      const envHost = (() => {
        try {
          return new URL(envBase).hostname
        } catch {
          return ""
        }
      })()

      if (normalizedStoredBase === envBase || storedHost === envHost || storedHost === currentHost) {
        candidates.unshift(normalizedStoredBase)
      } else {
        window.localStorage.removeItem(API_BASE_STORAGE_KEY)
      }
    }

    if (isLocalHost) {
      candidates.push(normalizeApiBase(`http://${currentHost}:8000`))
      candidates.push(normalizeApiBase(`http://${currentHost}:8001`))
      candidates.push(normalizeApiBase("http://127.0.0.1:8000"))
      candidates.push(normalizeApiBase("http://localhost:8000"))
      candidates.push(normalizeApiBase("http://127.0.0.1:8001"))
      candidates.push(normalizeApiBase("http://localhost:8001"))
      candidates.push(normalizeApiBase(window.location.origin))
    }
  }

  return unique(candidates)
}

function rememberApiBase(base: string) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(API_BASE_STORAGE_KEY, normalizeApiBase(base))
  }
}

export function getPreferredApiBase() {
  if (typeof window !== "undefined") {
    return normalizeApiBase(window.localStorage.getItem(API_BASE_STORAGE_KEY) ?? API_BASE)
  }

  return normalizeApiBase(API_BASE)
}

export function getPreferredApiOrigin() {
  try {
    return new URL(getPreferredApiBase()).origin
  } catch {
    return ""
  }
}

export function setPreferredApiBase(base: string) {
  rememberApiBase(base)
}

export function clearPreferredApiBase() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(API_BASE_STORAGE_KEY)
  }
}

export async function loginToBackend(email: string, password: string, deviceName = "bestsol-web") {
  let sawNetworkFailure = false

  for (const base of getApiCandidates()) {
    let response: Response

    try {
      response = await fetch(`${base}/login`, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          device_name: deviceName,
        }),
      })
    } catch {
      sawNetworkFailure = true
      continue
    }

    if (response.status === 404 || response.status === 405) {
      continue
    }

    if (!response.ok) {
      const json = await response.json().catch(() => null)
      throw new Error(json?.message ?? "Giriş alınmadı.")
    }

    const json = await response.json()
    rememberApiBase(base)
    return {
      token: json.token as string,
      user: normalizeFrontendUserPayload(json.user ?? null),
    }
  }

  if (sawNetworkFailure) {
    throw new Error(getNetworkErrorMessage())
  }

  return null
}

export async function ensureBackendToken(deviceName = "bestsol-web") {
  const storedToken = getStoredToken()
  if (storedToken) {
    return storedToken
  }

  window.location.replace(`/login?device=${encodeURIComponent(deviceName)}`)
  throw new Error("Giriş tələb olunur.")
}

export async function backendFetch(path: string, token: string, init?: RequestInit) {
  let sawNetworkFailure = false

  for (const base of getApiCandidates()) {
    let response: Response

    try {
      response = await fetch(`${base}${path}`, {
        ...init,
        headers: {
          "Accept": "application/json",
          ...(init?.headers ?? {}),
          Authorization: `Bearer ${token}`,
        },
      })
    } catch {
      sawNetworkFailure = true
      continue
    }

    if (response.status === 401) {
      clearStoredToken()
      throw new Error("Sessiya bitib. Yenidən qoşulun.")
    }

    if (response.status === 404 || response.status === 405) {
      continue
    }

    if (!response.ok) {
      const json = await response.json().catch(() => null)
      if (json?.errors) {
        const firstError = Object.values(json.errors)[0]
        if (Array.isArray(firstError) && firstError[0]) {
          throw new Error(String(firstError[0]))
        }
      }

      throw new Error(json?.message ?? "Sorğu zamanı xəta baş verdi.")
    }

    rememberApiBase(base)
    return response
  }

  if (sawNetworkFailure) {
    throw new Error(getNetworkErrorMessage())
  }

  throw new Error("Sorğu zamanı xəta baş verdi.")
}

export function clearBackendSession() {
  clearStoredToken()
}
