"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Header } from "@/components/layout/header"
import { backendFetch, ensureBackendToken } from "@/lib/backend-api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  AlertTriangle,
  ArrowUpRight,
  Clock,
  TrendingUp,
  Package,
  ShoppingCart,
  Truck,
  Wallet,
  Loader2,
} from "lucide-react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

type Summary = {
  today_sales: number
  monthly_sales: number
  customer_debt: number
  supplier_debt: number
  real_stock_value: number
  official_stock_value: number
}

type SaleChartPoint = {
  month: string
  total: number
}

type ExpenseChartPoint = {
  month: string
  total: number
}

type SaleItem = {
  sale_number: string
  customer: { name: string } | null
  total_amount: number
  payment_status: "paid" | "partial" | "debt"
  sale_date: string
}

type PurchaseItem = {
  purchase_number: string
  supplier: { name: string } | null
  total_amount: number
  purchase_date: string
}

type LowStockItem = {
  real_quantity: number
  minimum_quantity: number
  product: { name: string; product_code: string } | null
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("az-AZ", {
    minimumFractionDigits: 2,
  }).format(value)

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [salesChart, setSalesChart] = useState<SaleChartPoint[]>([])
  const [expenseChart, setExpenseChart] = useState<ExpenseChartPoint[]>([])
  const [recentSales, setRecentSales] = useState<SaleItem[]>([])
  const [recentPurchases, setRecentPurchases] = useState<PurchaseItem[]>([])
  const [lowStock, setLowStock] = useState<LowStockItem[]>([])

  useEffect(() => {
    void bootstrap()
  }, [])

  const bootstrap = async () => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const token = await ensureBackendToken("bestsol-dashboard-web")
      const [
        summaryResponse,
        salesChartResponse,
        expenseChartResponse,
        recentSalesResponse,
        recentPurchasesResponse,
        lowStockResponse,
      ] = await Promise.all([
        backendFetch("/dashboard/summary", token),
        backendFetch("/dashboard/sales-chart", token),
        backendFetch("/dashboard/expense-chart", token),
        backendFetch("/dashboard/recent-sales", token),
        backendFetch("/dashboard/recent-purchases", token),
        backendFetch("/dashboard/low-stock", token),
      ])

      setSummary(await summaryResponse.json())
      setSalesChart(await salesChartResponse.json())
      setExpenseChart(await expenseChartResponse.json())

      const recentSalesJson = await recentSalesResponse.json()
      const recentPurchasesJson = await recentPurchasesResponse.json()
      const lowStockJson = await lowStockResponse.json()

      setRecentSales(recentSalesJson.data ?? [])
      setRecentPurchases(recentPurchasesJson.data ?? [])
      setLowStock(lowStockJson.data ?? [])
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Dashboard məlumatları yüklənmədi.")
    } finally {
      setIsLoading(false)
    }
  }

  const weeklyBars = useMemo(
    () => salesChart.slice(-7).map((item) => ({
      name: item.month.slice(5),
      value: Number(item.total ?? 0),
    })),
    [salesChart],
  )

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header title="Ümumi Baxış" subtitle="Bugünkü statistikalar və göstəricilər" />
        <div className="flex flex-1 items-center justify-center">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Dashboard yüklənir...
          </div>
        </div>
      </div>
    )
  }

  const stats = [
    {
      title: "Bugünkü Satış",
      value: summary?.today_sales ?? 0,
      icon: ShoppingCart,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Aylıq Satış",
      value: summary?.monthly_sales ?? 0,
      icon: Truck,
      color: "text-chart-2",
      bgColor: "bg-chart-2/10",
    },
    {
      title: "Real Stok Dəyəri",
      value: summary?.real_stock_value ?? 0,
      icon: Package,
      color: "text-chart-3",
      bgColor: "bg-chart-3/10",
    },
    {
      title: "Müştəri Borcu",
      value: summary?.customer_debt ?? 0,
      icon: Wallet,
      color: "text-success",
      bgColor: "bg-success/10",
    },
  ]

  return (
    <div className="flex min-h-screen flex-col">
      <Header title="Ümumi Baxış" subtitle="Bugünkü statistikalar və göstəricilər" />

      <div className="flex-1 space-y-6 p-6">
        {errorMessage && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <Card key={stat.title} className="group relative overflow-hidden border-border transition-all duration-300 hover:border-primary/30">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="space-y-3">
                      <p className="text-[13px] font-medium text-muted-foreground">{stat.title}</p>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-semibold tracking-tight">{formatCurrency(stat.value)}</span>
                        <span className="text-sm text-muted-foreground">AZN</span>
                      </div>
                    </div>
                    <div className={`rounded-xl p-2.5 transition-transform group-hover:scale-110 ${stat.bgColor}`}>
                      <Icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="border-border lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-[15px] font-semibold">Satış və Xərc Trendi</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={salesChart.map((item, index) => ({
                      name: item.month,
                      sales: item.total,
                      expense: expenseChart[index]?.total ?? 0,
                    }))}
                  >
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
                    <Tooltip formatter={(value: number) => `${formatCurrency(value)} AZN`} />
                    <Area type="monotone" dataKey="sales" stroke="oklch(0.72 0.19 175)" fillOpacity={0.2} fill="oklch(0.72 0.19 175)" />
                    <Area type="monotone" dataKey="expense" stroke="oklch(0.65 0.15 250)" fillOpacity={0.15} fill="oklch(0.65 0.15 250)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-[15px] font-semibold">Son Dövr Satışları</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyBars}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip formatter={(value: number) => `${formatCurrency(value)} AZN`} />
                    <Bar dataKey="value" fill="oklch(0.72 0.19 175)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="border-border">
            <CardHeader className="pb-4">
              <CardTitle className="text-[15px] font-semibold">Son Satışlar</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-1">
                {recentSales.map((sale) => (
                  <div key={sale.sale_number} className="group flex cursor-pointer items-center justify-between rounded-lg px-3 py-3 transition-colors hover:bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                        sale.payment_status === "paid" ? "bg-success/10" : sale.payment_status === "partial" ? "bg-warning/10" : "bg-destructive/10"
                      }`}>
                        {sale.payment_status === "paid" ? (
                          <TrendingUp className="h-4 w-4 text-success" />
                        ) : sale.payment_status === "partial" ? (
                          <Clock className="h-4 w-4 text-warning" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                        )}
                      </div>
                      <div>
                        <p className="text-[13px] font-medium">{sale.customer?.name ?? "Müştəri seçilməyib"}</p>
                        <p className="text-[11px] text-muted-foreground">{sale.sale_number} · {sale.sale_date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[13px] font-semibold">{formatCurrency(sale.total_amount)} AZN</p>
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/sales">
                <Button variant="ghost" className="mt-4 w-full text-[13px] text-primary hover:bg-primary/5 hover:text-primary">
                  Bütün satışları göstər
                  <ArrowUpRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-4">
              <CardTitle className="text-[15px] font-semibold">Az Stok Məhsulları</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {lowStock.map((item) => (
                  <div key={item.product?.product_code ?? item.product?.name} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div>
                      <p className="text-[13px] font-medium">{item.product?.name ?? "-"}</p>
                      <p className="text-[11px] text-muted-foreground">{item.product?.product_code ?? "-"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[13px] font-semibold text-destructive">{item.real_quantity} ədəd</p>
                      <p className="text-[11px] text-muted-foreground">Min: {item.minimum_quantity}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/stock">
                <Button variant="ghost" className="mt-4 w-full text-[13px] text-primary hover:bg-primary/5 hover:text-primary">
                  Stok səhifəsinə keç
                  <ArrowUpRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-[15px] font-semibold">Son Satınalmalar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              {recentPurchases.map((purchase) => (
                <div key={purchase.purchase_number} className="rounded-lg border border-border p-4">
                  <div className="text-sm font-medium">{purchase.supplier?.name ?? "-"}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{purchase.purchase_number} · {purchase.purchase_date}</div>
                  <div className="mt-3 text-lg font-semibold">{formatCurrency(purchase.total_amount)} AZN</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
