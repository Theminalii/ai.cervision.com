"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { backendFetch, clearBackendSession, ensureBackendToken } from "@/lib/backend-api"
import { clearCachedFrontendUser, fetchFrontendUser, getCachedFrontendUser } from "@/lib/frontend-user"
import { FrontendUser, hasPermission } from "@/lib/permissions"
import { Bell, Search, Command, ChevronDown, Plus, LogOut, User, Settings, Loader2, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface HeaderProps {
  title?: string
  subtitle?: string
  onMenuClick?: () => void
  lightweight?: boolean
}

type HeaderSale = {
  sale_number: string
  customer: { name: string } | null
  total_amount: number
}

type HeaderStock = {
  real_quantity: number
  product: { name: string } | null
}

type InAppNotification = {
  title: string
  body: string
  tone: "warning" | "success" | "info"
  created_at: string
}

export function Header({ title = "Ümumi Baxış", subtitle, onMenuClick, lightweight = false }: HeaderProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(() => getCachedFrontendUser() === null)
  const [user, setUser] = useState<FrontendUser | null>(() => getCachedFrontendUser())
  const [recentSales, setRecentSales] = useState<HeaderSale[]>([])
  const [lowStock, setLowStock] = useState<HeaderStock[]>([])
  const [inAppNotifications, setInAppNotifications] = useState<InAppNotification[]>([])

  async function bootstrap() {
    try {
      const token = await ensureBackendToken("bestsol-header-web")
      setUser(await fetchFrontendUser(token))

      if (lightweight) {
        setRecentSales([])
        setLowStock([])
        setInAppNotifications([])
        return
      }

      const response = await backendFetch("/dashboard/header", token)
      const json = await response.json()

      setRecentSales(json.recent_sales ?? [])
      setLowStock(json.low_stock ?? [])
      setInAppNotifications(json.notifications ?? [])
    } catch {
      setUser(null)
      setRecentSales([])
      setLowStock([])
      setInAppNotifications([])
      router.replace("/login")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void bootstrap()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    const handleUserUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<FrontendUser>
      setUser(customEvent.detail)
      setIsLoading(false)
    }
    const handleUserCleared = () => {
      setUser(null)
      setIsLoading(true)
    }

    window.addEventListener("bestsol:user-updated", handleUserUpdated as EventListener)
    window.addEventListener("bestsol:user-cleared", handleUserCleared)

    return () => {
      window.removeEventListener("bestsol:user-updated", handleUserUpdated as EventListener)
      window.removeEventListener("bestsol:user-cleared", handleUserCleared)
    }
  }, [])

  const logout = async () => {
    try {
      const token = await ensureBackendToken("bestsol-header-logout")
      await backendFetch("/logout", token, { method: "POST" })
    } catch {
      // ignore logout transport errors and clear local session anyway
    } finally {
      clearCachedFrontendUser()
      clearBackendSession()
      router.push("/login")
    }
  }

  const initials = user?.name
    ?.split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() ?? "BS"

  const notifications = [
    ...inAppNotifications.slice(0, 3).map((item) => ({
      title: item.title,
      body: item.body,
      tone: item.tone,
    })),
    ...lowStock.slice(0, 2).map((item) => ({
      title: "Az stok xəbərdarlığı",
      body: `${item.product?.name ?? "Məhsul"} - ${item.real_quantity} ədəd qalıb`,
      tone: "warning",
    })),
    ...recentSales.slice(0, 2).map((sale) => ({
      title: "Yeni satış",
      body: `${sale.customer?.name ?? "Müştəri"} - ${sale.total_amount.toFixed(2)} AZN`,
      tone: "success",
    })),
  ].slice(0, 4)

  const quickCreateItems = [
    { href: "/sales/new", label: "Yeni Satış", permission: "sales_add" },
    { href: "/purchases/new", label: "Yeni Alış", permission: "purchase_add" },
    { href: "/products/new", label: "Yeni Məhsul", permission: "stock_view" },
    { href: "/customers", label: "Yeni Müştəri", permission: "sales_add" },
    { href: "/suppliers", label: "Yeni Təchizatçı", permission: "purchase_add" },
  ].filter((item) => !item.permission || hasPermission(user, item.permission))

  const openSidebar = () => {
    if (onMenuClick) {
      onMenuClick()
      return
    }

    window.dispatchEvent(new Event("bestsol:open-sidebar"))
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur-sm">
      <div className="flex items-center gap-3 sm:gap-6">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0 lg:hidden"
          onClick={openSidebar}
          aria-label="Menyunu ac"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-[15px] font-semibold text-foreground">{title}</h1>
          {subtitle && <p className="text-[12px] text-muted-foreground">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className="flex h-8 items-center gap-2 rounded-lg border border-border bg-secondary/50 px-3 text-[13px] text-muted-foreground transition-colors hover:bg-secondary">
          <Search className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Axtarış...</span>
          <kbd className="hidden h-5 items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground md:inline-flex">
            <Command className="h-2.5 w-2.5" />K
          </kbd>
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="h-8 gap-1.5 text-[13px]">
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Yeni</span>
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {quickCreateItems.map((item, index) => (
              <div key={item.href}>
                {index === 3 ? <DropdownMenuSeparator /> : null}
                <DropdownMenuItem asChild className="text-[13px]">
                  <Link href={item.href}>{item.label}</Link>
                </DropdownMenuItem>
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {lightweight ? null : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative h-8 w-8">
                <Bell className="h-4 w-4" />
                {notifications.length > 0 && (
                  <span className="absolute right-1 top-1 flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="flex items-center justify-between text-[13px]">
                Bildirişlər
                <span className="text-[11px] font-normal text-primary">{notifications.length} yeni</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-3 py-4 text-sm text-muted-foreground">Yeni bildiriş yoxdur.</div>
                ) : (
                  notifications.map((notification, index) => (
                    <DropdownMenuItem key={`${notification.title}-${index}`} className="flex cursor-pointer flex-col items-start gap-1 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${
                          notification.tone === "warning" ? "bg-warning" : notification.tone === "success" ? "bg-success" : "bg-primary"
                        }`} />
                        <span className="text-[13px] font-medium">{notification.title}</span>
                      </div>
                      <span className="pl-4 text-[12px] text-muted-foreground">{notification.body}</span>
                    </DropdownMenuItem>
                  ))
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-primary">
                {isLoading ? <Loader2 className="h-3 w-3 animate-spin text-primary-foreground" /> : <span className="text-[11px] font-semibold text-primary-foreground">{initials}</span>}
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-[13px] font-medium">{user?.name ?? "İstifadəçi"}</p>
                <p className="text-[12px] text-muted-foreground">{user?.email ?? "Giriş tələb olunur"}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 text-[13px]">
              <User className="h-4 w-4" /> Profil
            </DropdownMenuItem>
            {hasPermission(user, "users_manage") ? (
              <DropdownMenuItem asChild className="gap-2 text-[13px]">
                <Link href="/settings">
                  <Settings className="h-4 w-4" /> Parametrlər
                </Link>
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 text-[13px] text-destructive" onClick={logout}>
              <LogOut className="h-4 w-4" /> Çıxış
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
