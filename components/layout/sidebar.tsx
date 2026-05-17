"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { backendFetch, ensureBackendToken } from "@/lib/backend-api"
import { FrontendUser, hasPermission } from "@/lib/permissions"
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Truck,
  Warehouse,
  Wallet,
  BarChart3,
  Users,
  Settings,
  Calculator,
  Building2,
  ChevronRight,
  Store,
  Sparkles,
  Smartphone,
} from "lucide-react"

const navigation = [
  {
    name: "Ümumi Baxış",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Satış Nöqtəsi",
    href: "/pos",
    icon: Store,
    badge: "POS",
    permission: "sales_add",
  },
  {
    name: "Məhsullar",
    icon: Package,
    permission: "stock_view",
    children: [
      { name: "Kataloq", href: "/products", permission: "stock_view" },
      { name: "Yeni Məhsul", href: "/products/new", permission: "stock_view" },
      { name: "Qiymətləndirmə", href: "/pricing", permission: "coefficients_manage" },
    ],
  },
  {
    name: "Satış",
    icon: ShoppingCart,
    permission: "sales_add",
    children: [
      { name: "Satış Siyahısı", href: "/sales", permission: "sales_add" },
      { name: "Yeni Satış", href: "/sales/new", permission: "sales_add" },
    ],
  },
  {
    name: "Alış",
    icon: Truck,
    permission: "purchase_add",
    children: [
      { name: "Alış Siyahısı", href: "/purchases", permission: "purchase_add" },
      { name: "Yeni Alış", href: "/purchases/new", permission: "purchase_add" },
    ],
  },
  {
    name: "Anbar",
    icon: Warehouse,
    permission: "stock_view",
    children: [
      { name: "Stok Vəziyyəti", href: "/stock", permission: "stock_view" },
      { name: "Anbarlar", href: "/warehouses", permission: "stock_view" },
    ],
  },
  {
    name: "Maliyyə",
    href: "/finance",
    icon: Wallet,
    permission: "expense_view",
  },
  {
    name: "Hesabatlar",
    href: "/reports",
    icon: BarChart3,
    permission: "reports_view",
  },
  {
    name: "AI Agent",
    href: "/ai-agent",
    icon: Sparkles,
    permission: "users_manage",
  },
  {
    name: "Omnichannel",
    icon: Smartphone,
    permission: "crm_view",
    children: [
      { name: "Inbox", href: "/omnichannel/inbox", permission: "crm_view" },
      { name: "Conversations", href: "/omnichannel", permission: "crm_view" },
      { name: "WhatsApp", href: "/settings/whatsapp", permission: "users_manage" },
      { name: "Mail", href: "/settings/gmail", permission: "users_manage" },
      { name: "Instagram", href: "/settings/instagram", permission: "users_manage" },
      { name: "Automation", href: "/omnichannel/automation", permission: "users_manage" },
      { name: "AI Rules", href: "/settings/ai", permission: "users_manage" },
      { name: "Logs", href: "/omnichannel/logs", permission: "users_manage" },
      { name: "Settings", href: "/omnichannel/settings", permission: "crm_view" },
    ],
  },
  {
    name: "CRM",
    icon: Users,
    permission: "crm_view",
    children: [
      { name: "Dashboard", href: "/crm", permission: "crm_view" },
      { name: "Müştərilər", href: "/crm/customers", permission: "crm_view" },
      { name: "Lead-lər", href: "/crm/leads", permission: "crm_view" },
      { name: "Deal Pipeline", href: "/crm/deals", permission: "crm_view" },
      { name: "Tapşırıqlar", href: "/crm/tasks", permission: "crm_view" },
      { name: "Fəaliyyətlər", href: "/crm/activities", permission: "crm_view" },
      { name: "Şirkətlər", href: "/crm/companies", permission: "crm_view" },
      { name: "Kontaktlar", href: "/crm/contacts", permission: "crm_view" },
      { name: "Hesabatlar", href: "/crm/reports", permission: "crm_view" },
      { name: "AI CRM Assistant", href: "/crm/ai", permission: "crm_view" },
    ],
  },
]

const secondaryNav = [
  { name: "Müştərilər", href: "/customers", icon: Users, permission: "sales_add" },
  { name: "Təchizatçılar", href: "/suppliers", icon: Building2, permission: "purchase_add" },
  { name: "Qiymət Əmsalları", href: "/pricing", icon: Calculator, permission: "coefficients_manage" },
  { name: "Parametrlər", href: "/settings", icon: Settings, permission: "users_manage" },
]

type NavigationItem = (typeof navigation)[number]

export function Sidebar() {
  const pathname = usePathname()
  const [expandedItems, setExpandedItems] = useState<string[]>(["Məhsullar", "Satış"])
  const [user, setUser] = useState<FrontendUser | null>(null)
  const loadCurrentUser = useCallback(async () => {
    try {
      const token = await ensureBackendToken("bestsol-sidebar-web")
      const response = await backendFetch("/me", token)
      const json = await response.json()
      setUser(json.data ?? json)
    } catch {
      setUser(null)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadCurrentUser()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadCurrentUser])

  const canAccess = useCallback((permission?: string) => {
    if (!permission) {
      return true
    }

    if (!user) {
      return false
    }

    return hasPermission(user, permission)
  }, [user])

  const visibleNavigation = useMemo(() => {
    return navigation
      .map((item) => {
        if (item.children?.length) {
          const visibleChildren = item.children.filter((child) => canAccess(child.permission))
          if (!visibleChildren.length && !canAccess(item.permission)) {
            return null
          }

          return {
            ...item,
            children: visibleChildren,
          }
        }

        return canAccess(item.permission) ? item : null
      })
      .filter((item): item is NavigationItem => item !== null)
  }, [canAccess])

  const visibleSecondaryNav = useMemo(() => {
    return secondaryNav.filter((item) => canAccess(item.permission))
  }, [canAccess])

  const toggleExpand = (name: string) => {
    setExpandedItems((prev) =>
      prev.includes(name)
        ? prev.filter((item) => item !== name)
        : [...prev, name]
    )
  }

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/" || pathname === "/dashboard"
    }
    return pathname === href || pathname.startsWith(href + "/")
  }

  const isChildActive = (children?: { href: string }[]) => {
    if (!children) return false
    return children.some(child => isActive(child.href))
  }

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-[260px] bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Logo */}
      <div className="flex h-14 items-center gap-3 px-5 border-b border-sidebar-border shrink-0">
        <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-md border border-sidebar-border bg-white">
          <Image
            src="/logo.png-2.webp"
            alt="BESTSOL logo"
            width={36}
            height={36}
            className="h-full w-full object-contain"
            priority
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-semibold text-sidebar-foreground tracking-tight">BESTSOL</span>
          <span className="text-[10px] font-medium text-sidebar-muted bg-sidebar-accent px-1.5 py-0.5 rounded">ERP</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-0.5">
          {visibleNavigation.map((item) => {
            const Icon = item.icon
            const hasChildren = item.children && item.children.length > 0
            const isExpanded = expandedItems.includes(item.name)
            const childActive = isChildActive(item.children)
            const active = item.href ? isActive(item.href) : childActive

            if (hasChildren) {
              return (
                <div key={item.name}>
                  <button
                    onClick={() => toggleExpand(item.name)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150",
                      active || childActive
                        ? "text-sidebar-foreground"
                        : "text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={cn(
                        "h-4 w-4 transition-colors",
                        active || childActive ? "text-primary" : ""
                      )} />
                      <span>{item.name}</span>
                    </div>
                    <ChevronRight
                      className={cn(
                        "h-3.5 w-3.5 text-sidebar-muted transition-transform duration-200",
                        isExpanded && "rotate-90"
                      )}
                    />
                  </button>
                  
                  <div className={cn(
                    "overflow-hidden transition-all duration-200",
                    isExpanded ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
                  )}>
                    <div className="mt-1 ml-3 pl-4 border-l border-sidebar-border space-y-0.5">
                      {item.children?.map((child) => {
                        const childIsActive = isActive(child.href)
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={cn(
                              "block rounded-md px-3 py-1.5 text-[13px] transition-all duration-150",
                              childIsActive
                                ? "text-primary font-medium bg-primary/5"
                                : "text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/30"
                            )}
                          >
                            {child.name}
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            }

            return (
              <Link
                key={item.name}
                href={item.href!}
                className={cn(
                  "flex items-center justify-between gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150",
                  active
                    ? "bg-sidebar-accent text-sidebar-foreground"
                    : "text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={cn("h-4 w-4", active && "text-primary")} />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </div>

        {/* Secondary Navigation */}
        <div className="mt-6 pt-6 border-t border-sidebar-border">
          <p className="px-3 mb-3 text-[10px] font-semibold text-sidebar-muted uppercase tracking-widest">
            Konfiqurasiya
          </p>
          <div className="space-y-0.5">
            {visibleSecondaryNav.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150",
                    active
                      ? "bg-sidebar-accent text-sidebar-foreground"
                      : "text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                  )}
                >
                  <Icon className={cn("h-4 w-4", active && "text-primary")} />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </nav>

      {/* User */}
      <div className="border-t border-sidebar-border p-3 shrink-0">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-sidebar-accent/50 transition-colors cursor-pointer">
          <div className="relative">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-primary">
              <span className="text-xs font-semibold text-primary-foreground">RM</span>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-success border-2 border-sidebar" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-sidebar-foreground truncate">
              {user?.name ?? "İstifadəçi"}
            </p>
            <p className="text-[11px] text-sidebar-muted truncate">{user?.role?.name ?? "Rol təyin edilməyib"}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
