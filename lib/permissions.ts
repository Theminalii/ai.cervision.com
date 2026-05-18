"use client"

export type FrontendPermission = {
  id: number
  name: string
  key: string
  module?: string | null
  status?: string
}

export type FrontendRole = {
  id: number
  name: string
  description?: string | null
  status?: string
  permissions?: FrontendPermission[]
}

export type FrontendUser = {
  id: number
  name: string
  email: string
  status?: string
  role?: FrontendRole | null
}

function unwrapResource<T>(value: T | { data?: T } | null | undefined): T | null {
  if (!value) {
    return null
  }

  if (typeof value === "object" && "data" in (value as Record<string, unknown>)) {
    return (((value as { data?: T }).data ?? null) as T | null)
  }

  return value as T
}

export function normalizeFrontendUserPayload(payload: unknown): FrontendUser | null {
  const user = unwrapResource(payload as FrontendUser | { data?: FrontendUser } | null)
  if (!user || typeof user !== "object") {
    return null
  }

  const role = unwrapResource((user as { role?: FrontendRole | { data?: FrontendRole } | null }).role ?? null)
  const permissionsValue = role && typeof role === "object"
    ? (role as { permissions?: FrontendPermission[] | { data?: FrontendPermission[] } | null }).permissions ?? []
    : []
  const permissions = unwrapResource(permissionsValue) ?? []

  return {
    id: Number((user as { id?: number }).id ?? 0),
    name: String((user as { name?: string }).name ?? ""),
    email: String((user as { email?: string }).email ?? ""),
    status: (user as { status?: string }).status,
    role: role && typeof role === "object"
      ? {
          id: Number((role as { id?: number }).id ?? 0),
          name: String((role as { name?: string }).name ?? ""),
          description: (role as { description?: string | null }).description ?? null,
          status: (role as { status?: string }).status,
          permissions: Array.isArray(permissions)
            ? permissions
                .filter((permission): permission is FrontendPermission => Boolean(permission && typeof permission === "object"))
                .map((permission) => ({
                  id: Number(permission.id ?? 0),
                  name: String(permission.name ?? ""),
                  key: String(permission.key ?? ""),
                  module: permission.module ?? null,
                  status: permission.status,
                }))
            : [],
        }
      : null,
  }
}

export function hasPermission(user: FrontendUser | null, permissionKey: string) {
  if (!user?.role) {
    return false
  }

  if (user.role.name === "Super Admin") {
    return true
  }

  return (user.role.permissions ?? []).some((permission) => permission.key === permissionKey)
}
