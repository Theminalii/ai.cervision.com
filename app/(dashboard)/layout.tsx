"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { useIsMobile } from "@/hooks/use-mobile"
import { backendFetch, ensureBackendToken } from "@/lib/backend-api"
import { cn } from "@/lib/utils"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const isMobile = useIsMobile()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!isMobile || pathname !== "/dashboard") {
      return
    }

    let cancelled = false

    const redirectSalesRep = async () => {
      try {
        const token = await ensureBackendToken("bestsol-mobile-dashboard-check")
        const response = await backendFetch("/me", token)
        const json = await response.json()
        const user = json.data ?? json

        if (!cancelled && user?.role?.name === "Satış Nümayəndəsi") {
          router.replace("/pos")
        }
      } catch {
        // Keep current page when user lookup fails.
      }
    }

    void redirectSalesRep()

    return () => {
      cancelled = true
    }
  }, [isMobile, pathname, router])

  useEffect(() => {
    const openSidebar = () => setSidebarOpen(true)
    window.addEventListener("bestsol:open-sidebar", openSidebar)

    return () => {
      window.removeEventListener("bestsol:open-sidebar", openSidebar)
    }
  }, [])

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      {!isMobile || sidebarOpen ? (
        <div
          className={cn(
            "fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-200 ease-in-out lg:translate-x-0",
            sidebarOpen || !isMobile ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <Sidebar />
        </div>
      ) : null}

      {/* Main content */}
      <div className="flex min-h-0 flex-1 flex-col lg:pl-64">
        <main className="flex-1 min-h-0">
          <div className="h-full min-h-0">{children}</div>
        </main>
      </div>
    </div>
  )
}
