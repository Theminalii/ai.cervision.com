"use client"

import { backendFetch } from "@/lib/backend-api"
import { normalizeFrontendUserPayload, type FrontendUser } from "@/lib/permissions"

const USER_CACHE_KEY = "bestsol-frontend-user"
const USER_CACHE_UPDATED_AT_KEY = "bestsol-frontend-user-updated-at"
const USER_CACHE_TTL_MS = 5 * 60 * 1000

function getStorage() {
  if (typeof window === "undefined") {
    return null
  }

  return window.sessionStorage
}

export function getCachedFrontendUser() {
  const storage = getStorage()
  if (!storage) {
    return null
  }

  const raw = storage.getItem(USER_CACHE_KEY)
  const updatedAt = Number(storage.getItem(USER_CACHE_UPDATED_AT_KEY) ?? 0)
  if (!raw || !updatedAt) {
    return null
  }

  if (Date.now() - updatedAt > USER_CACHE_TTL_MS) {
    clearCachedFrontendUser()
    return null
  }

  try {
    return normalizeFrontendUserPayload(JSON.parse(raw))
  } catch {
    clearCachedFrontendUser()
    return null
  }
}

export function setCachedFrontendUser(user: FrontendUser) {
  const normalizedUser = normalizeFrontendUserPayload(user)
  if (!normalizedUser) {
    clearCachedFrontendUser()
    return
  }

  const storage = getStorage()
  if (!storage) {
    return
  }

  storage.setItem(USER_CACHE_KEY, JSON.stringify(normalizedUser))
  storage.setItem(USER_CACHE_UPDATED_AT_KEY, String(Date.now()))
  window.dispatchEvent(new CustomEvent("bestsol:user-updated", { detail: normalizedUser }))
}

export function clearCachedFrontendUser() {
  const storage = getStorage()
  if (!storage) {
    return
  }

  storage.removeItem(USER_CACHE_KEY)
  storage.removeItem(USER_CACHE_UPDATED_AT_KEY)
  window.dispatchEvent(new Event("bestsol:user-cleared"))
}

export async function fetchFrontendUser(token: string, options?: { force?: boolean }) {
  const cached = !options?.force ? getCachedFrontendUser() : null
  if (cached) {
    return cached
  }

  const response = await backendFetch("/me", token)
  const json = await response.json()
  const user = normalizeFrontendUserPayload(json)
  if (!user) {
    throw new Error("İstifadəçi məlumatı oxunmadı.")
  }
  setCachedFrontendUser(user)
  return user
}
