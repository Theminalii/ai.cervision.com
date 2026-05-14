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

export function hasPermission(user: FrontendUser | null, permissionKey: string) {
  if (!user?.role) {
    return false
  }

  if (user.role.name === "Super Admin") {
    return true
  }

  return (user.role.permissions ?? []).some((permission) => permission.key === permissionKey)
}
