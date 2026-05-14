"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useTheme } from "next-themes"
import {
  API_BASE,
  LOGGED_OUT_KEY,
  TOKEN_KEY,
  backendFetch,
  clearPreferredApiBase,
  ensureBackendToken,
  getPreferredApiBase,
  getPreferredApiOrigin,
  loginToBackend,
  normalizeApiBase,
  setPreferredApiBase,
} from "@/lib/backend-api"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  Bell,
  Building2,
  Check,
  Key,
  Mail,
  Monitor,
  Moon,
  Palette,
  RotateCcw,
  Save,
  Send,
  Settings2,
  Shield,
  Smartphone,
  Sun,
  Trash2,
  Upload,
  User,
  Users,
} from "lucide-react"

type ThemeMode = "light" | "dark" | "system"

type Role = {
  id: number
  name: string
  description?: string | null
  status?: string
  permissions?: PermissionItem[]
}

type PermissionItem = {
  id: number
  name: string
  key: string
  module: string
  status?: string
}

type ApiUser = {
  id: number
  name: string
  email: string
  status: "active" | "passive"
  role?: {
    id: number
    name: string
  } | null
}

type SessionItem = {
  id: number
  device: string
  location: string
  time: string
  current: boolean
}

type SettingsPayload = {
  company: {
    company_name: string
    tax_id: string
    email: string
    phone: string
    address: string
    currency: string
    language: string
    timezone: string
    invoice_template: string
    receipt_size: string
    auto_print_receipt: boolean
    show_logo_on_print: boolean
    logo_url: string | null
  }
  notifications: {
    channels: {
      email: {
        enabled: boolean
        host: string
        port: number
        encryption: string
        username: string
        password: string
        from_address: string
        from_name: string
        recipient: string
      }
      telegram: {
        enabled: boolean
        bot_token: string
        chat_id: string
      }
    }
    events: {
      low_stock: boolean
      new_order: boolean
      payment: boolean
      weekly_summary: boolean
      failed_login: boolean
    }
  }
  appearance: {
    compact_sidebar: boolean
    hover_expand: boolean
    dense_tables: boolean
    theme: ThemeMode
  }
  sessions: SessionItem[]
}

type UserDraft = {
  id?: number
  name: string
  email: string
  role_id: string
  status: "active" | "passive"
  password: string
}

const DEFAULT_DEV_EMAIL = "admin@bestsol.az"
const DEFAULT_DEV_PASSWORD = "password"

const emptyUserDraft = (): UserDraft => ({
  name: "",
  email: "",
  role_id: "",
  status: "active",
  password: "",
})

const defaultSettings: SettingsPayload = {
  company: {
    company_name: "BESTSOL MMC",
    tax_id: "1234567890",
    email: "info@bestsol.az",
    phone: "+994 12 555 55 55",
    address: "Bakı şəhəri, Nəsimi rayonu",
    currency: "AZN",
    language: "az",
    timezone: "asia-baku",
    invoice_template: "standard",
    receipt_size: "80mm",
    auto_print_receipt: true,
    show_logo_on_print: true,
    logo_url: null,
  },
  notifications: {
    channels: {
      email: {
        enabled: false,
        host: "",
        port: 587,
        encryption: "tls",
        username: "",
        password: "",
        from_address: "",
        from_name: "BESTSOL",
        recipient: "",
      },
      telegram: {
        enabled: false,
        bot_token: "",
        chat_id: "",
      },
    },
    events: {
      low_stock: true,
      new_order: true,
      payment: true,
      weekly_summary: true,
      failed_login: true,
    },
  },
  appearance: {
    compact_sidebar: false,
    hover_expand: true,
    dense_tables: false,
    theme: "light",
  },
  sessions: [],
}

function buildAssetUrl(path: string | null) {
  if (!path) return "/logo.png"
  if (path.startsWith("data:")) return path
  if (path.startsWith("http")) return path

  try {
    const origin = getPreferredApiOrigin()
    return `${origin}${path}`
  } catch {
    return path
  }
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [mounted, setMounted] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [settings, setSettings] = useState<SettingsPayload>(defaultSettings)
  const [users, setUsers] = useState<ApiUser[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<PermissionItem[]>([])
  const [roleSyncingId, setRoleSyncingId] = useState<number | null>(null)
  const [userDialogOpen, setUserDialogOpen] = useState(false)
  const [userDraft, setUserDraft] = useState<UserDraft>(emptyUserDraft())
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    new_password_confirmation: "",
  })
  const [connectForm, setConnectForm] = useState({
    email: DEFAULT_DEV_EMAIL,
    password: DEFAULT_DEV_PASSWORD,
  })
  const [apiBaseInput, setApiBaseInput] = useState(API_BASE)

  const currentTheme = mounted ? ((theme as ThemeMode | undefined) ?? "light") : "light"

  const roleNameMap = useMemo(
    () => Object.fromEntries(roles.map((role) => [String(role.id), role.name])),
    [roles],
  )

  const permissionsByModule = useMemo(() => {
    return permissions.reduce<Record<string, PermissionItem[]>>((groups, permission) => {
      const key = permission.module || "other"
      groups[key] = [...(groups[key] ?? []), permission]
      return groups
    }, {})
  }, [permissions])

  useEffect(() => {
    setMounted(true)
    setApiBaseInput(getPreferredApiBase())
    const storedToken = window.localStorage.getItem(TOKEN_KEY)
    void bootstrap(storedToken)
  }, [])

  const bootstrap = async (existingToken: string | null) => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const activeToken = existingToken ?? (await ensureBackendToken("bestsol-settings-web"))

      setToken(activeToken)
      await loadAll(activeToken)
    } catch (error) {
      setToken(null)
      setErrorMessage(error instanceof Error ? error.message : "Backend bağlantısı qurulmadı.")
    } finally {
      setIsLoading(false)
    }
  }

  const apiFetch = async (path: string, init?: RequestInit, customToken?: string) => {
    const activeToken = customToken ?? token
    if (!activeToken) {
      throw new Error("Backend token tapılmadı.")
    }

    try {
      return await backendFetch(path, activeToken, init)
    } catch (error) {
      if (error instanceof Error && error.message.includes("Sessiya bitib")) {
        setToken(null)
        window.localStorage.removeItem(TOKEN_KEY)
        window.localStorage.setItem(LOGGED_OUT_KEY, "1")
      }

      throw error
    }
  }

  const loadAll = async (activeToken: string) => {
    const [settingsResponse, usersResponse, rolesResponse, permissionsResponse] = await Promise.all([
      apiFetch("/settings", undefined, activeToken),
      apiFetch("/users?per_page=100", undefined, activeToken),
      apiFetch("/roles", undefined, activeToken),
      apiFetch("/permissions", undefined, activeToken),
    ])

    const settingsJson = await settingsResponse.json()
    const usersJson = await usersResponse.json()
    const rolesJson = await rolesResponse.json()
    const permissionsJson = await permissionsResponse.json()

    setSettings(settingsJson)
    setUsers(usersJson.data ?? [])
    setRoles(rolesJson.data ?? [])
    setPermissions(permissionsJson.data ?? [])

    if (settingsJson.appearance?.theme) {
      setTheme(settingsJson.appearance.theme)
    }
  }

  const saveCompanySettings = async () => {
    setIsSaving(true)
    setSaveMessage(null)
    setErrorMessage(null)

    try {
      await apiFetch("/settings/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings.company),
      })

      try {
        await apiFetch("/settings/appearance", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...settings.appearance,
            theme: currentTheme,
          }),
        })

        setSaveMessage("Şirkət və görünüş parametrləri yadda saxlanıldı.")
      } catch (appearanceError) {
        setSaveMessage("Şirkət məlumatları yadda saxlanıldı. Görünüş ayarları ayrıca yenilənməlidir.")
        setErrorMessage(
          appearanceError instanceof Error ? appearanceError.message : "Görünüş parametrləri saxlanmadı.",
        )
      }

      if (token) {
        await loadAll(token)
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Parametrlər saxlanmadı.")
    } finally {
      setIsSaving(false)
    }
  }

  const saveNotificationSettings = async (options?: { silent?: boolean }) => {
    setIsSaving(true)
    if (!options?.silent) {
      setSaveMessage(null)
    }
    setErrorMessage(null)

    try {
      await apiFetch("/settings/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings.notifications),
      })

      if (!options?.silent) {
        setSaveMessage("Bildiriş parametrləri yadda saxlanıldı.")
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Bildiriş parametrləri saxlanmadı.")
      throw error
    } finally {
      setIsSaving(false)
    }
  }

  const handleNotificationTest = async (kind: "email" | "telegram") => {
    setErrorMessage(null)
    setSaveMessage(null)

    try {
      await saveNotificationSettings({ silent: true })
      const path = kind === "email" ? "/settings/notifications/test-email" : "/settings/notifications/test-telegram"
      await apiFetch(path, { method: "POST" })
      setSaveMessage(kind === "email" ? "Test email göndərildi." : "Telegram test mesajı göndərildi.")
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Test göndərilmədi.")
    }
  }

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setErrorMessage(null)
    setSaveMessage(null)

    try {
      const formData = new FormData()
      formData.append("logo", file)

      const response = await apiFetch("/settings/company/logo", {
        method: "POST",
        body: formData,
      })

      const json = await response.json()

      setSettings((prev) => ({
        ...prev,
        company: {
          ...prev.company,
          logo_url: json.logo_url,
        },
      }))

      setSaveMessage("Şirkət logosu yükləndi.")
      if (token) {
        await loadAll(token)
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Logo yüklənmədi.")
    }
  }

  const openCreateUser = () => {
    setUserDraft(emptyUserDraft())
    setUserDialogOpen(true)
  }

  const openEditUser = (user: ApiUser) => {
    setUserDraft({
      id: user.id,
      name: user.name,
      email: user.email,
      role_id: user.role?.id ? String(user.role.id) : "",
      status: user.status,
      password: "",
    })
    setUserDialogOpen(true)
  }

  const saveUser = async () => {
    setErrorMessage(null)
    setSaveMessage(null)

    try {
      const payload: Record<string, unknown> = {
        name: userDraft.name,
        email: userDraft.email,
        role_id: userDraft.role_id ? Number(userDraft.role_id) : null,
        status: userDraft.status,
      }

      const isCreate = !userDraft.id
      if (isCreate || userDraft.password) {
        payload.password = userDraft.password
      }

      const path = isCreate ? "/users" : `/users/${userDraft.id}`
      const method = isCreate ? "POST" : "PUT"

      await apiFetch(path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      setUserDialogOpen(false)
      setSaveMessage(isCreate ? "Yeni istifadəçi yaradıldı." : "İstifadəçi yeniləndi.")
      if (token) await loadAll(token)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "İstifadəçi yadda saxlanmadı.")
    }
  }

  const deleteUser = async (userId: number) => {
    setErrorMessage(null)
    setSaveMessage(null)

    try {
      await apiFetch(`/users/${userId}`, { method: "DELETE" })
      setUsers((prev) => prev.filter((user) => user.id !== userId))
      setSaveMessage("İstifadəçi silindi.")
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "İstifadəçi silinmədi.")
    }
  }

  const syncRolePermissions = async (roleId: number, permissionId: number, checked: boolean) => {
    const role = roles.find((item) => item.id === roleId)
    if (!role) return
    if (role.name === "Super Admin") {
      setErrorMessage("Super Admin üçün icazələr ayrıca dəyişdirilmir.")
      return
    }

    setErrorMessage(null)
    setSaveMessage(null)
    setRoleSyncingId(roleId)

    const currentPermissionIds = (role.permissions ?? []).map((permission) => permission.id)
    const nextPermissionIds = checked
      ? Array.from(new Set([...currentPermissionIds, permissionId]))
      : currentPermissionIds.filter((id) => id !== permissionId)

    try {
      const response = await apiFetch(`/roles/${roleId}/permissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permission_ids: nextPermissionIds }),
      })

      const json = await response.json()
      const updatedRole = json.data ?? json

      setRoles((prev) => prev.map((item) => (item.id === roleId ? updatedRole : item)))
      setSaveMessage(`"${role.name}" rolu üçün giriş icazələri yeniləndi.`)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Rol icazələri yenilənmədi.")
    } finally {
      setRoleSyncingId(null)
    }
  }

  const savePassword = async () => {
    setErrorMessage(null)
    setSaveMessage(null)

    try {
      await apiFetch("/settings/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(passwordForm),
      })

      setPasswordForm({
        current_password: "",
        new_password: "",
        new_password_confirmation: "",
      })
      setSaveMessage("Şifrə uğurla yeniləndi.")
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Şifrə yenilənmədi.")
    }
  }

  const revokeSession = async (sessionId: number) => {
    setErrorMessage(null)
    setSaveMessage(null)

    try {
      await apiFetch(`/settings/sessions/${sessionId}`, { method: "DELETE" })
      setSettings((prev) => ({
        ...prev,
        sessions: prev.sessions.filter((session) => session.id !== sessionId),
      }))
      setSaveMessage("Sessiya bağlandı.")
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Sessiya bağlanmadı.")
    }
  }

  const revokeOtherSessions = async () => {
    setErrorMessage(null)
    setSaveMessage(null)

    try {
      await apiFetch("/settings/sessions", { method: "DELETE" })
      setSettings((prev) => ({
        ...prev,
        sessions: prev.sessions.filter((session) => session.current),
      }))
      setSaveMessage("Digər sessiyalar bağlandı.")
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Sessiyalar bağlanmadı.")
    }
  }

  const updateCompany = <K extends keyof SettingsPayload["company"]>(key: K, value: SettingsPayload["company"][K]) => {
    setSettings((prev) => ({
      ...prev,
      company: {
        ...prev.company,
        [key]: value,
      },
    }))
  }

  const updateNotificationEmail = <K extends keyof SettingsPayload["notifications"]["channels"]["email"]>(
    key: K,
    value: SettingsPayload["notifications"]["channels"]["email"][K],
  ) => {
    setSettings((prev) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        channels: {
          ...prev.notifications.channels,
          email: {
            ...prev.notifications.channels.email,
            [key]: value,
          },
        },
      },
    }))
  }

  const updateNotificationTelegram = <K extends keyof SettingsPayload["notifications"]["channels"]["telegram"]>(
    key: K,
    value: SettingsPayload["notifications"]["channels"]["telegram"][K],
  ) => {
    setSettings((prev) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        channels: {
          ...prev.notifications.channels,
          telegram: {
            ...prev.notifications.channels.telegram,
            [key]: value,
          },
        },
      },
    }))
  }

  const updateNotificationEvent = <K extends keyof SettingsPayload["notifications"]["events"]>(
    key: K,
    value: SettingsPayload["notifications"]["events"][K],
  ) => {
    setSettings((prev) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        events: {
          ...prev.notifications.events,
          [key]: value,
        },
      },
    }))
  }

  const updateAppearance = <K extends keyof SettingsPayload["appearance"]>(
    key: K,
    value: SettingsPayload["appearance"][K],
  ) => {
    setSettings((prev) => ({
      ...prev,
      appearance: {
        ...prev.appearance,
        [key]: value,
      },
    }))
  }

  const handleManualConnect = async () => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const normalizedBase = normalizeApiBase(apiBaseInput)
      setPreferredApiBase(normalizedBase)
      setApiBaseInput(normalizedBase)
      window.localStorage.removeItem(LOGGED_OUT_KEY)
      const newToken = await loginToBackend(connectForm.email, connectForm.password, "bestsol-settings-manual-web")
      if (!newToken) {
        throw new Error("Email və ya şifrə yanlışdır.")
      }

      setToken(newToken)
      window.localStorage.setItem(TOKEN_KEY, newToken)
      window.localStorage.removeItem(LOGGED_OUT_KEY)
      await loadAll(newToken)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Bağlantı qurulmadı.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleReconnect = async () => {
    await bootstrap(window.localStorage.getItem(TOKEN_KEY))
  }

  const resetConnection = async () => {
    setErrorMessage(null)
    setSaveMessage(null)
    setToken(null)
    clearPreferredApiBase()
    window.localStorage.removeItem(TOKEN_KEY)
    window.localStorage.removeItem(LOGGED_OUT_KEY)
    const fallbackBase = normalizeApiBase(API_BASE)
    setApiBaseInput(fallbackBase)
    await bootstrap(null)
  }

  if (isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Parametrlər yüklənir...</div>
  }

  if (!token) {
    return (
      <div className="mx-auto max-w-md space-y-4 p-6">
        <Card>
          <CardHeader>
            <CardTitle>Backend Bağlantısı</CardTitle>
            <CardDescription>Parametrləri idarə etmək üçün backend admin girişi lazımdır</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Backend API URL</Label>
              <Input
                value={apiBaseInput}
                onChange={(e) => setApiBaseInput(e.target.value)}
                placeholder="http://127.0.0.1:8000/api"
              />
              <p className="text-xs text-muted-foreground">Məsələn: `http://127.0.0.1:8000/api` və ya `http://localhost:8000/api`</p>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={connectForm.email} onChange={(e) => setConnectForm((prev) => ({ ...prev, email: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Şifrə</Label>
              <Input type="password" value={connectForm.password} onChange={(e) => setConnectForm((prev) => ({ ...prev, password: e.target.value }))} />
            </div>
            {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
            <div className="flex gap-2">
              <Button className="flex-1" onClick={handleManualConnect}>
                Qoşul
              </Button>
              <Button variant="outline" onClick={resetConnection}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Sıfırla
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Parametrlər</h1>
          <p className="text-muted-foreground">Sistem və şirkət parametrlərini idarə edin</p>
        </div>
        <div className="flex items-center gap-3">
          {saveMessage && <p className="text-sm text-green-600">{saveMessage}</p>}
          {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
          <Button variant="outline" onClick={handleReconnect}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Yenilə
          </Button>
          <Button disabled={isSaving} onClick={saveCompanySettings}>
            <Save className="mr-2 h-4 w-4" />
            Yadda saxla
          </Button>
        </div>
      </div>

      <Tabs defaultValue="company" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 gap-2">
          <TabsTrigger value="company"><Building2 className="mr-2 h-4 w-4" />Şirkət</TabsTrigger>
          <TabsTrigger value="users"><Users className="mr-2 h-4 w-4" />İstifadəçilər</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="mr-2 h-4 w-4" />Bildirişlər</TabsTrigger>
          <TabsTrigger value="appearance"><Palette className="mr-2 h-4 w-4" />Görünüş</TabsTrigger>
          <TabsTrigger value="security"><Shield className="mr-2 h-4 w-4" />Təhlükəsizlik</TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Şirkət Məlumatları</CardTitle>
              <CardDescription>Şirkət logosu və əsas məlumatlar backend üzərindən saxlanılır</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col gap-6 md:flex-row md:items-center">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={buildAssetUrl(settings.company.logo_url)} />
                  <AvatarFallback className="text-2xl">BS</AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="mr-2 h-4 w-4" />
                    Logo yüklə
                  </Button>
                  <p className="text-sm text-muted-foreground">Fayl backend-ə göndərilir və serverdə saxlanılır.</p>
                </div>
              </div>
              <Separator />
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Şirkət adı</Label>
                  <Input value={settings.company.company_name} onChange={(e) => updateCompany("company_name", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>VÖEN</Label>
                  <Input value={settings.company.tax_id} onChange={(e) => updateCompany("tax_id", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>E-poçt</Label>
                  <Input type="email" value={settings.company.email} onChange={(e) => updateCompany("email", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Telefon</Label>
                  <Input value={settings.company.phone} onChange={(e) => updateCompany("phone", e.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Ünvan</Label>
                  <Textarea value={settings.company.address} onChange={(e) => updateCompany("address", e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Regional və Çap Ayarları</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Valyuta</Label>
                  <Select value={settings.company.currency} onValueChange={(value) => updateCompany("currency", value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AZN">AZN</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Dil</Label>
                  <Select value={settings.company.language} onValueChange={(value) => updateCompany("language", value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="az">Azərbaycan dili</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="ru">Русский</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Saat qurşağı</Label>
                  <Select value={settings.company.timezone} onValueChange={(value) => updateCompany("timezone", value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asia-baku">Bakı (UTC+4)</SelectItem>
                      <SelectItem value="europe-istanbul">İstanbul (UTC+3)</SelectItem>
                      <SelectItem value="europe-moscow">Moskva (UTC+3)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Faktura şablonu</Label>
                  <Select value={settings.company.invoice_template} onValueChange={(value) => updateCompany("invoice_template", value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standart</SelectItem>
                      <SelectItem value="compact">Kompakt</SelectItem>
                      <SelectItem value="detailed">Ətraflı</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Qəbz ölçüsü</Label>
                  <Select value={settings.company.receipt_size} onValueChange={(value) => updateCompany("receipt_size", value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="58mm">58mm</SelectItem>
                      <SelectItem value="80mm">80mm</SelectItem>
                      <SelectItem value="a4">A4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Avtomatik qəbz çapı</p>
                  <p className="text-sm text-muted-foreground">Satış tamamlandıqda qəbzi dərhal çap et</p>
                </div>
                <Switch checked={settings.company.auto_print_receipt} onCheckedChange={(checked) => updateCompany("auto_print_receipt", checked)} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Logo göstərilsin</p>
                  <p className="text-sm text-muted-foreground">Fakturalarda logo görünsün</p>
                </div>
                <Switch checked={settings.company.show_logo_on_print} onCheckedChange={(checked) => updateCompany("show_logo_on_print", checked)} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle>İstifadəçilər</CardTitle>
                  <CardDescription>Yeni istifadəçi yaratmaq, redaktə etmək və silmək backend üzərindən işləyir</CardDescription>
                </div>
                <Button onClick={openCreateUser}>
                  <Users className="mr-2 h-4 w-4" />
                  Yeni istifadəçi
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {users.map((user) => (
                <div key={user.id} className="flex flex-col gap-4 rounded-lg border p-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarFallback>{user.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{user.role?.name ?? "Rol yoxdur"}</Badge>
                    <Badge variant={user.status === "active" ? "default" : "secondary"}>
                      {user.status === "active" ? "Aktiv" : "Passiv"}
                    </Badge>
                    <Button variant="outline" size="sm" onClick={() => openEditUser(user)}>
                      <Settings2 className="mr-2 h-4 w-4" />
                      Redaktə et
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-600" onClick={() => deleteUser(user.id)}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Sil
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Səhifə və Modul Girişləri</CardTitle>
              <CardDescription>Buradan hər rolun hansı səhifə və əməliyyatları görə biləcəyini idarə edə bilərsiniz</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {roles.map((role) => {
                const rolePermissionIds = new Set((role.permissions ?? []).map((permission) => permission.id))

                return (
                  <div key={role.id} className="rounded-xl border p-4">
                    <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-semibold">{role.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {role.description || "Bu rol üçün görünən səhifələr və icazəli əməliyyatlar"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{role.permissions?.length ?? 0} icazə</Badge>
                        {role.name === "Super Admin" ? (
                          <Badge>Hamısına giriş</Badge>
                        ) : roleSyncingId === role.id ? (
                          <Badge variant="secondary">Yenilənir...</Badge>
                        ) : null}
                      </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      {Object.entries(permissionsByModule).map(([module, items]) => (
                        <div key={`${role.id}-${module}`} className="rounded-lg border bg-muted/20 p-4">
                          <div className="mb-3">
                            <p className="font-medium capitalize">{module}</p>
                            <p className="text-xs text-muted-foreground">Bu modul üzrə girişlər</p>
                          </div>
                          <div className="space-y-3">
                            {items.map((permission) => {
                              const checked = role.name === "Super Admin" || rolePermissionIds.has(permission.id)

                              return (
                                <div key={`${role.id}-${permission.id}`} className="flex items-center justify-between gap-3">
                                  <div className="space-y-0.5">
                                    <p className="text-sm font-medium">{permission.name}</p>
                                    <p className="text-xs text-muted-foreground">{permission.key}</p>
                                  </div>
                                  <Switch
                                    checked={checked}
                                    disabled={role.name === "Super Admin" || roleSyncingId === role.id}
                                    onCheckedChange={(nextChecked) => syncRolePermissions(role.id, permission.id, nextChecked)}
                                  />
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}

              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 text-primary" />
                  <p>
                    Məsələn, `Satış Nümayəndəsi` rolunda yalnız `sales_add` açıq olarsa həmin istifadəçi əsasən satış
                    səhifələrini görəcək, maliyyə, hesabat və parametrlər hissəsi gizlənəcək.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>E-poçt Bildirişləri</CardTitle>
              <CardDescription>SMTP login və password daxil edib test email göndərə bilərsiniz</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">E-poçt kanalı aktivdir</p>
                  <p className="text-sm text-muted-foreground">Bildirişlər e-poçt üzərindən göndərilsin</p>
                </div>
                <Switch checked={settings.notifications.channels.email.enabled} onCheckedChange={(checked) => updateNotificationEmail("enabled", checked)} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>SMTP host</Label>
                  <Input value={settings.notifications.channels.email.host} onChange={(e) => updateNotificationEmail("host", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Port</Label>
                  <Input
                    value={String(settings.notifications.channels.email.port)}
                    onChange={(e) => updateNotificationEmail("port", Number(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Login</Label>
                  <Input value={settings.notifications.channels.email.username} onChange={(e) => updateNotificationEmail("username", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input type="password" value={settings.notifications.channels.email.password} onChange={(e) => updateNotificationEmail("password", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>From address</Label>
                  <Input value={settings.notifications.channels.email.from_address} onChange={(e) => updateNotificationEmail("from_address", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Test recipient</Label>
                  <Input value={settings.notifications.channels.email.recipient} onChange={(e) => updateNotificationEmail("recipient", e.target.value)} />
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" onClick={saveNotificationSettings}>Yadda saxla</Button>
                <Button onClick={() => handleNotificationTest("email")}>
                  <Send className="mr-2 h-4 w-4" />
                  Test email göndər
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Telegram Bildirişləri</CardTitle>
              <CardDescription>SMS yerinə Telegram bot token və chat id istifadə olunur</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Telegram kanalı aktivdir</p>
                  <p className="text-sm text-muted-foreground">Bot vasitəsilə chat-ə bildiriş göndər</p>
                </div>
                <Switch checked={settings.notifications.channels.telegram.enabled} onCheckedChange={(checked) => updateNotificationTelegram("enabled", checked)} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Bot token</Label>
                  <Input value={settings.notifications.channels.telegram.bot_token} onChange={(e) => updateNotificationTelegram("bot_token", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Chat ID</Label>
                  <Input value={settings.notifications.channels.telegram.chat_id} onChange={(e) => updateNotificationTelegram("chat_id", e.target.value)} />
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" onClick={saveNotificationSettings}>Yadda saxla</Button>
                <Button onClick={() => handleNotificationTest("telegram")}>
                  <Send className="mr-2 h-4 w-4" />
                  Telegram test göndər
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Hadisə Bildirişləri</CardTitle>
              <CardDescription>Aşağı stok, yeni sifariş və ödəniş hadisələri backend-dən avtomatik göndərilir</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                ["low_stock", "Aşağı stok xəbərdarlığı", "Stok minimum səviyyəyə düşdükdə"],
                ["new_order", "Yeni sifariş", "Yeni sifariş daxil olduqda"],
                ["payment", "Ödəniş bildirişləri", "Ödəniş alındıqda və ya gecikdikdə"],
                ["failed_login", "Uğursuz giriş cəhdləri", "Şübhəli login halları olduqda"],
              ].map(([key, title, description], index) => (
                <div key={key}>
                  {index > 0 && <Separator className="mb-4" />}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{title}</p>
                      <p className="text-sm text-muted-foreground">{description}</p>
                    </div>
                    <Switch
                      checked={settings.notifications.events[key as keyof SettingsPayload["notifications"]["events"]]}
                      onCheckedChange={(checked) => updateNotificationEvent(key as keyof SettingsPayload["notifications"]["events"], checked)}
                    />
                  </div>
                </div>
              ))}
              <Button variant="outline" onClick={saveNotificationSettings}>Hadisə ayarlarını yadda saxla</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tema Seçimi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  { value: "light", label: "İşıqlı", icon: Sun, preview: "bg-white border" },
                  { value: "dark", label: "Qaranlıq", icon: Moon, preview: "bg-slate-900" },
                  { value: "system", label: "Sistem", icon: Monitor, preview: "bg-gradient-to-r from-white to-slate-900" },
                ].map((item) => {
                  const Icon = item.icon
                  return (
                    <button
                      key={item.value}
                      type="button"
                      className={`rounded-lg border-2 p-4 transition-colors ${
                        currentTheme === item.value ? "border-primary" : "border-muted"
                      }`}
                      onClick={() => {
                        setTheme(item.value)
                        updateAppearance("theme", item.value as ThemeMode)
                      }}
                    >
                      <div className={`mb-4 flex h-20 items-center justify-center rounded-lg ${item.preview}`}>
                        <Icon className="h-8 w-8 text-slate-500" />
                      </div>
                      <p className="text-center font-medium">{item.label}</p>
                    </button>
                  )
                })}
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Kompakt rejim</p>
                  <p className="text-sm text-muted-foreground">Sidebar daha yığcam göstərilsin</p>
                </div>
                <Switch checked={settings.appearance.compact_sidebar} onCheckedChange={(checked) => updateAppearance("compact_sidebar", checked)} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Hover genişlənsin</p>
                  <p className="text-sm text-muted-foreground">Kompakt sidebar hover-da açılsın</p>
                </div>
                <Switch checked={settings.appearance.hover_expand} onCheckedChange={(checked) => updateAppearance("hover_expand", checked)} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Sıx cədvəllər</p>
                  <p className="text-sm text-muted-foreground">Cədvəl sıxlığı artırılsın</p>
                </div>
                <Switch checked={settings.appearance.dense_tables} onCheckedChange={(checked) => updateAppearance("dense_tables", checked)} />
              </div>
              <Button variant="outline" onClick={saveCompanySettings}>Görünüş ayarlarını yadda saxla</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Şifrə Dəyişikliyi</CardTitle>
              <CardDescription>Cari şifrə backend-də yoxlanılır və yeni şifrə real olaraq yenilənir</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Cari şifrə</Label>
                <Input type="password" value={passwordForm.current_password} onChange={(e) => setPasswordForm((prev) => ({ ...prev, current_password: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Yeni şifrə</Label>
                <Input type="password" value={passwordForm.new_password} onChange={(e) => setPasswordForm((prev) => ({ ...prev, new_password: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Yeni şifrə təkrarı</Label>
                <Input type="password" value={passwordForm.new_password_confirmation} onChange={(e) => setPasswordForm((prev) => ({ ...prev, new_password_confirmation: e.target.value }))} />
              </div>
              <Button onClick={savePassword}>
                <Key className="mr-2 h-4 w-4" />
                Şifrəni yenilə
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Aktiv Sessiyalar</CardTitle>
              <CardDescription>Bu siyahı backend token-lərindən gəlir, fake məlumat deyil</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {settings.sessions.map((session) => (
                  <div key={session.id} className="flex flex-col gap-4 rounded-lg border p-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                        <Monitor className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{session.device}</p>
                          {session.current && <Badge>Cari</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">{session.location} • {session.time}</p>
                      </div>
                    </div>
                    {!session.current && (
                      <Button variant="ghost" size="sm" className="text-red-600" onClick={() => revokeSession(session.id)}>
                        Çıxış et
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button variant="outline" className="mt-4 w-full text-red-600" onClick={revokeOtherSessions}>
                Digər bütün sessiyalardan çıx
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{userDraft.id ? "İstifadəçini redaktə et" : "Yeni istifadəçi yarat"}</DialogTitle>
            <DialogDescription>Mövcud istifadəçini yenilə və ya yeni istifadəçi yarat</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Ad Soyad</Label>
              <Input value={userDraft.name} onChange={(e) => setUserDraft((prev) => ({ ...prev, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={userDraft.email} onChange={(e) => setUserDraft((prev) => ({ ...prev, email: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={userDraft.role_id} onValueChange={(value) => setUserDraft((prev) => ({ ...prev, role_id: value }))}>
                <SelectTrigger><SelectValue placeholder="Rol seçin" /></SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={String(role.id)}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={userDraft.status} onValueChange={(value: "active" | "passive") => setUserDraft((prev) => ({ ...prev, status: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Aktiv</SelectItem>
                  <SelectItem value="passive">Passiv</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{userDraft.id ? "Yeni şifrə (istəyə bağlı)" : "Şifrə"}</Label>
              <Input type="password" value={userDraft.password} onChange={(e) => setUserDraft((prev) => ({ ...prev, password: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserDialogOpen(false)}>Ləğv et</Button>
            <Button onClick={saveUser}>Yadda saxla</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
