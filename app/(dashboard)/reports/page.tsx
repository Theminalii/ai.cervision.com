"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { Header } from "@/components/layout/header"
import { backendFetch, ensureBackendToken } from "@/lib/backend-api"
import { toast } from "@/components/ui/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import {
  Download,
  FileSpreadsheet,
  Filter,
  Loader2,
  Printer,
  RefreshCcw,
  TrendingUp,
  FileText,
  Wallet,
  Package,
  Users,
} from "lucide-react"

type PaginatedResponse<T> = {
  data: T[]
}

type ResourceCollectionResponse<T> = {
  data?: T[]
}

type Category = { id: number; name: string }
type Brand = { id: number; name: string }
type Customer = { id: number; name: string; total_debt: number }
type User = { id: number; name: string }

type SaleRow = {
  id: number
  sale_number: string
  customer: { name: string } | null
  sales_representative: { name: string } | null
  sale_type: "cash" | "official"
  payment_status: "paid" | "partial" | "debt"
  payment_method: "cash" | "bank"
  total_amount: number
  paid_amount: number
  debt_amount: number
  sale_date: string
  items: { product_name: string | null; quantity: number; total_price: number }[]
}

type PurchaseRow = {
  id: number
  purchase_number: string
  supplier: { name: string } | null
  payment_method: "cash" | "bank"
  total_amount: number
  paid_amount: number
  debt_amount: number
  purchase_date: string
  items: { product_name: string | null; actual_received_quantity: number; total_cost: number }[]
}

type StockRow = {
  id: number
  product_id: number
  official_quantity: number
  real_quantity: number
  minimum_quantity: number
  product: {
    id: number
    name: string
    product_code: string
    cost_price: number
    cash_sale_price: number
    official_sale_price: number
    category: { id: number; name: string } | null
    brand: { id: number; name: string } | null
  } | null
}

type ExpenseRow = {
  id: number
  title: string
  category_name: string | null
  expense_type: "cash" | "official"
  payment_method: "cash" | "bank"
  amount: number
  note: string | null
  expense_date: string
}

type DebtRow = {
  id: number
  name: string
  phone: string
  total_debt: number
  status: string
}

type FinanceSummary = {
  sales_total: number
  purchase_total: number
  expense_total: number
}

type ReportKind = "sales" | "purchases" | "stock" | "finance" | "customer-debts" | "expenses" | "cost-prices"

type Filters = {
  date_from: string
  date_to: string
  category_id: string
  brand_id: string
  customer_id: string
  sales_representative_id: string
  payment_status: string
  report_type: "real" | "official"
}

const REPORT_LABELS: Record<ReportKind, string> = {
  sales: "Satış hesabatı",
  purchases: "Satınalma hesabatı",
  stock: "Stok hesabatı",
  finance: "Maliyyə hesabatı",
  "customer-debts": "Müştəri borcları",
  expenses: "Xərc hesabatı",
  "cost-prices": "Maya və qiymət hesabatı",
}

const currentDate = () => new Date().toISOString().slice(0, 10)

const monthStart = () => {
  const date = new Date()
  date.setDate(1)
  return date.toISOString().slice(0, 10)
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("az-AZ", {
    style: "currency",
    currency: "AZN",
    minimumFractionDigits: 2,
  }).format(value)

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("az-AZ", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })

const unwrapCollection = <T,>(payload: T[] | ResourceCollectionResponse<T> | null | undefined): T[] => {
  if (Array.isArray(payload)) {
    return payload
  }

  if (payload && Array.isArray(payload.data)) {
    return payload.data
  }

  return []
}

export default function ReportsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [activeReport, setActiveReport] = useState<ReportKind>("sales")
  const [filters, setFilters] = useState<Filters>({
    date_from: monthStart(),
    date_to: currentDate(),
    category_id: "all",
    brand_id: "all",
    customer_id: "all",
    sales_representative_id: "all",
    payment_status: "all",
    report_type: "real",
  })
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [salesRows, setSalesRows] = useState<SaleRow[]>([])
  const [purchaseRows, setPurchaseRows] = useState<PurchaseRow[]>([])
  const [stockRows, setStockRows] = useState<StockRow[]>([])
  const [expenseRows, setExpenseRows] = useState<ExpenseRow[]>([])
  const [customerDebtRows, setCustomerDebtRows] = useState<DebtRow[]>([])
  const [costPriceRows, setCostPriceRows] = useState<StockRow["product"][]>([])
  const [financeSummary, setFinanceSummary] = useState<FinanceSummary | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void bootstrap()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!isLoading) {
      void fetchReport(activeReport)
    }
  }, [activeReport])

  async function bootstrap() {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const token = await ensureBackendToken("bestsol-reports-web")
      const [categoriesResponse, brandsResponse, customersResponse, usersResponse] = await Promise.all([
        backendFetch("/categories", token),
        backendFetch("/brands", token),
        backendFetch("/customers?per_page=200", token),
        backendFetch("/users?per_page=200", token),
      ])

      setCategories(unwrapCollection<Category>(await categoriesResponse.json()))
      setBrands(unwrapCollection<Brand>(await brandsResponse.json()))
      setCustomers(((await customersResponse.json()) as PaginatedResponse<Customer>).data ?? [])
      const usersJson = (await usersResponse.json()) as PaginatedResponse<User>
      setUsers(usersJson.data ?? [])

      await fetchReport("sales", token)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Hesabatlar yüklənmədi.")
    } finally {
      setIsLoading(false)
    }
  }

  const buildQuery = () => {
    const params = new URLSearchParams()
    params.set("per_page", "500")
    if (filters.date_from) params.set("date_from", filters.date_from)
    if (filters.date_to) params.set("date_to", filters.date_to)
    if (filters.category_id !== "all") params.set("category_id", filters.category_id)
    if (filters.brand_id !== "all") params.set("brand_id", filters.brand_id)
    if (filters.customer_id !== "all") params.set("customer_id", filters.customer_id)
    if (filters.sales_representative_id !== "all") params.set("sales_representative_id", filters.sales_representative_id)
    if (filters.payment_status !== "all") params.set("payment_status", filters.payment_status)
    params.set("report_type", filters.report_type)
    params.set("export", "json")
    return params.toString()
  }

  async function fetchReport(kind: ReportKind, existingToken?: string) {
    setIsRefreshing(true)
    setErrorMessage(null)

    try {
      const token = existingToken ?? (await ensureBackendToken("bestsol-reports-fetch"))
      const query = buildQuery()
      const response = await backendFetch(`/reports/${kind}?${query}`, token)
      const json = await response.json()

      if (kind === "sales") {
        setSalesRows((json.data ?? []) as SaleRow[])
      } else if (kind === "purchases") {
        setPurchaseRows((json.data ?? []) as PurchaseRow[])
      } else if (kind === "stock") {
        setStockRows((json.data ?? []) as StockRow[])
      } else if (kind === "finance") {
        setFinanceSummary(json as FinanceSummary)
      } else if (kind === "customer-debts") {
        setCustomerDebtRows((json.data ?? []) as DebtRow[])
      } else if (kind === "expenses") {
        setExpenseRows((json.data ?? []) as ExpenseRow[])
      } else if (kind === "cost-prices") {
        setCostPriceRows((json.data ?? []) as StockRow["product"][])
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Hesabat gətirilə bilmədi.")
    } finally {
      setIsRefreshing(false)
    }
  }

  const currentRows = useMemo(() => {
    if (activeReport === "sales") return salesRows
    if (activeReport === "purchases") return purchaseRows
    if (activeReport === "stock") return stockRows
    if (activeReport === "customer-debts") return customerDebtRows
    if (activeReport === "expenses") return expenseRows
    if (activeReport === "cost-prices") return costPriceRows
    return financeSummary ? [financeSummary] : []
  }, [activeReport, costPriceRows, customerDebtRows, expenseRows, financeSummary, purchaseRows, salesRows, stockRows])

  const summaryCards = useMemo(() => {
    if (activeReport === "sales") {
      const total = salesRows.reduce((sum, row) => sum + row.total_amount, 0)
      const paid = salesRows.reduce((sum, row) => sum + row.paid_amount, 0)
      const debt = salesRows.reduce((sum, row) => sum + row.debt_amount, 0)
      return [
        { title: "Satış sayı", value: String(salesRows.length), icon: FileText },
        { title: "Ümumi satış", value: formatCurrency(total), icon: TrendingUp },
        { title: "Alınan ödəniş", value: formatCurrency(paid), icon: Wallet },
        { title: "Qalıq borc", value: formatCurrency(debt), icon: Users },
      ]
    }

    if (activeReport === "purchases") {
      const total = purchaseRows.reduce((sum, row) => sum + row.total_amount, 0)
      const paid = purchaseRows.reduce((sum, row) => sum + row.paid_amount, 0)
      const debt = purchaseRows.reduce((sum, row) => sum + row.debt_amount, 0)
      return [
        { title: "Satınalma sayı", value: String(purchaseRows.length), icon: FileText },
        { title: "Ümumi satınalma", value: formatCurrency(total), icon: Package },
        { title: "Ödənilən", value: formatCurrency(paid), icon: Wallet },
        { title: "Qalıq borc", value: formatCurrency(debt), icon: Users },
      ]
    }

    if (activeReport === "stock") {
      const official = stockRows.reduce((sum, row) => sum + row.official_quantity, 0)
      const real = stockRows.reduce((sum, row) => sum + row.real_quantity, 0)
      const low = stockRows.filter((row) => row.real_quantity <= row.minimum_quantity).length
      return [
        { title: "Məhsul sayı", value: String(stockRows.length), icon: Package },
        { title: "Real stok", value: String(real), icon: Package },
        { title: "Rəsmi stok", value: String(official), icon: Package },
        { title: "Aşağı stok", value: String(low), icon: TrendingUp },
      ]
    }

    if (activeReport === "finance") {
      const sales = financeSummary?.sales_total ?? 0
      const purchases = financeSummary?.purchase_total ?? 0
      const expenses = financeSummary?.expense_total ?? 0
      return [
        { title: "Satış gəliri", value: formatCurrency(sales), icon: TrendingUp },
        { title: "Satınalma", value: formatCurrency(purchases), icon: Package },
        { title: "Xərclər", value: formatCurrency(expenses), icon: Wallet },
        { title: "Xalis nəticə", value: formatCurrency(sales - purchases - expenses), icon: FileText },
      ]
    }

    if (activeReport === "customer-debts") {
      const total = customerDebtRows.reduce((sum, row) => sum + row.total_debt, 0)
      return [
        { title: "Borclu müştəri", value: String(customerDebtRows.length), icon: Users },
        { title: "Cəmi borc", value: formatCurrency(total), icon: Wallet },
        { title: "Aktiv hesab", value: String(customerDebtRows.filter((row) => row.status === "active").length), icon: FileText },
        { title: "Orta borc", value: formatCurrency(customerDebtRows.length ? total / customerDebtRows.length : 0), icon: TrendingUp },
      ]
    }

    if (activeReport === "expenses") {
      const total = expenseRows.reduce((sum, row) => sum + row.amount, 0)
      const cash = expenseRows.filter((row) => row.expense_type === "cash").reduce((sum, row) => sum + row.amount, 0)
      const official = expenseRows.filter((row) => row.expense_type === "official").reduce((sum, row) => sum + row.amount, 0)
      return [
        { title: "Xərc sayı", value: String(expenseRows.length), icon: FileText },
        { title: "Ümumi xərc", value: formatCurrency(total), icon: Wallet },
        { title: "Nağd xərc", value: formatCurrency(cash), icon: TrendingUp },
        { title: "Rəsmi xərc", value: formatCurrency(official), icon: TrendingUp },
      ]
    }

    const avgCost =
      costPriceRows.length > 0
        ? costPriceRows.reduce((sum, row) => sum + Number(row?.cost_price ?? 0), 0) / costPriceRows.length
        : 0
    return [
      { title: "Məhsul sayı", value: String(costPriceRows.length), icon: Package },
      { title: "Orta maya", value: formatCurrency(avgCost), icon: Wallet },
      { title: "Orta nağd qiymət", value: formatCurrency(costPriceRows.length ? costPriceRows.reduce((sum, row) => sum + Number(row?.cash_sale_price ?? 0), 0) / costPriceRows.length : 0), icon: TrendingUp },
      { title: "Orta rəsmi qiymət", value: formatCurrency(costPriceRows.length ? costPriceRows.reduce((sum, row) => sum + Number(row?.official_sale_price ?? 0), 0) / costPriceRows.length : 0), icon: TrendingUp },
    ]
  }, [activeReport, costPriceRows, customerDebtRows, expenseRows, financeSummary, purchaseRows, salesRows, stockRows])

  const barData = useMemo(() => {
    if (activeReport === "sales") {
      return salesRows.map((row) => ({ label: row.sale_number, value: row.total_amount })).slice(0, 8)
    }
    if (activeReport === "purchases") {
      return purchaseRows.map((row) => ({ label: row.purchase_number, value: row.total_amount })).slice(0, 8)
    }
    if (activeReport === "stock") {
      return stockRows.map((row) => ({ label: row.product?.name ?? "-", value: row.real_quantity })).slice(0, 8)
    }
    if (activeReport === "customer-debts") {
      return customerDebtRows.map((row) => ({ label: row.name, value: row.total_debt })).slice(0, 8)
    }
    if (activeReport === "expenses") {
      return expenseRows.map((row) => ({ label: row.title, value: row.amount })).slice(0, 8)
    }
    if (activeReport === "cost-prices") {
      return costPriceRows.map((row) => ({ label: row?.name ?? "-", value: Number(row?.cost_price ?? 0) })).slice(0, 8)
    }
    return [
      { label: "Satış", value: financeSummary?.sales_total ?? 0 },
      { label: "Satınalma", value: financeSummary?.purchase_total ?? 0 },
      { label: "Xərc", value: financeSummary?.expense_total ?? 0 },
    ]
  }, [activeReport, costPriceRows, customerDebtRows, expenseRows, financeSummary, purchaseRows, salesRows, stockRows])

  const pieData = useMemo(() => {
    const colors = ["#0ea5e9", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6"]

    if (activeReport === "sales") {
      const grouped = new Map<string, number>()
      salesRows.forEach((row) => {
        const key = row.sale_type === "official" ? "Rəsmi satış" : "Nağd satış"
        grouped.set(key, (grouped.get(key) ?? 0) + row.total_amount)
      })
      return [...grouped.entries()].map(([name, value], index) => ({ name, value, color: colors[index % colors.length] }))
    }

    if (activeReport === "expenses") {
      const grouped = new Map<string, number>()
      expenseRows.forEach((row) => {
        const key = row.category_name ?? "Kateqoriyasız"
        grouped.set(key, (grouped.get(key) ?? 0) + row.amount)
      })
      return [...grouped.entries()].map(([name, value], index) => ({ name, value, color: colors[index % colors.length] }))
    }

    if (activeReport === "stock") {
      const grouped = new Map<string, number>()
      stockRows.forEach((row) => {
        const key = row.product?.category?.name ?? "Kateqoriyasız"
        grouped.set(key, (grouped.get(key) ?? 0) + row.real_quantity)
      })
      return [...grouped.entries()].map(([name, value], index) => ({ name, value, color: colors[index % colors.length] }))
    }

    return barData.map((item, index) => ({
      name: item.label,
      value: item.value,
      color: colors[index % colors.length],
    }))
  }, [activeReport, barData, expenseRows, salesRows, stockRows])

  const exportJson = () => {
    downloadFile(JSON.stringify(currentRows, null, 2), `${activeReport}-report.json`, "application/json")
  }

  const exportCsv = () => {
    const csv = toCsv(activeReport, currentRows)
    downloadFile(csv, `${activeReport}-report.csv`, "text/csv;charset=utf-8;")
  }

  const exportPdf = () => {
    toast({
      title: "PDF axını açılır",
      description: "Brauzerin print pəncərəsindən PDF kimi yadda saxlaya bilərsiniz.",
    })
    window.print()
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header title="Hesabatlar" subtitle="Filtrli satış, stok və maliyyə görünüşləri" />
        <div className="flex flex-1 items-center justify-center">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Hesabatlar yüklənir...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header title="Hesabatlar" subtitle="Filtrli satış, stok və maliyyə görünüşləri" />

      <div className="flex-1 space-y-6 p-6">
        {errorMessage && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </div>
        )}

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-lg font-semibold">{REPORT_LABELS[activeReport]}</div>
            <div className="text-sm text-muted-foreground">Bütün göstəricilər real backend məlumatlarından hesablanır.</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" />
              Çap et
            </Button>
            <Button variant="outline" onClick={exportJson}>
              <Download className="mr-2 h-4 w-4" />
              JSON
            </Button>
            <Button variant="outline" onClick={exportCsv}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Excel
            </Button>
            <Button onClick={exportPdf}>
              <FileText className="mr-2 h-4 w-4" />
              PDF
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtrlər
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <Label>Başlanğıc tarixi</Label>
                <Input
                  type="date"
                  value={filters.date_from}
                  onChange={(event) => setFilters((current) => ({ ...current, date_from: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Son tarix</Label>
                <Input
                  type="date"
                  value={filters.date_to}
                  onChange={(event) => setFilters((current) => ({ ...current, date_to: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Kateqoriya</Label>
                <Select
                  value={filters.category_id}
                  onValueChange={(value) => setFilters((current) => ({ ...current, category_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Hamısı</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={String(category.id)}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Brend</Label>
                <Select
                  value={filters.brand_id}
                  onValueChange={(value) => setFilters((current) => ({ ...current, brand_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Hamısı</SelectItem>
                    {brands.map((brand) => (
                      <SelectItem key={brand.id} value={String(brand.id)}>
                        {brand.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Müştəri</Label>
                <Select
                  value={filters.customer_id}
                  onValueChange={(value) => setFilters((current) => ({ ...current, customer_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Hamısı</SelectItem>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={String(customer.id)}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Satış nümayəndəsi</Label>
                <Select
                  value={filters.sales_representative_id}
                  onValueChange={(value) => setFilters((current) => ({ ...current, sales_representative_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Hamısı</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={String(user.id)}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ödəniş statusu</Label>
                <Select
                  value={filters.payment_status}
                  onValueChange={(value) => setFilters((current) => ({ ...current, payment_status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Hamısı</SelectItem>
                    <SelectItem value="paid">Ödənilib</SelectItem>
                    <SelectItem value="partial">Qismən</SelectItem>
                    <SelectItem value="debt">Borc</SelectItem>
                    <SelectItem value="cash">Nağd</SelectItem>
                    <SelectItem value="bank">Bank</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Rejim</Label>
                <Select
                  value={filters.report_type}
                  onValueChange={(value: "real" | "official") =>
                    setFilters((current) => ({ ...current, report_type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="real">Real</SelectItem>
                    <SelectItem value="official">Rəsmi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void fetchReport(activeReport)}>
                {isRefreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                Tətbiq et
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setFilters({
                    date_from: monthStart(),
                    date_to: currentDate(),
                    category_id: "all",
                    brand_id: "all",
                    customer_id: "all",
                    sales_representative_id: "all",
                    payment_status: "all",
                    report_type: "real",
                  })
                }}
              >
                Sıfırla
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => {
            const Icon = card.icon
            return (
              <Card key={card.title}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">{card.title}</div>
                      <div className="text-2xl font-semibold">{card.value}</div>
                    </div>
                    <div className="rounded-xl bg-muted p-3">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <Tabs value={activeReport} onValueChange={(value) => setActiveReport(value as ReportKind)} className="space-y-4">
          <TabsList className="flex flex-wrap">
            <TabsTrigger value="sales">Satış</TabsTrigger>
            <TabsTrigger value="purchases">Satınalma</TabsTrigger>
            <TabsTrigger value="stock">Stok</TabsTrigger>
            <TabsTrigger value="finance">Maliyyə</TabsTrigger>
            <TabsTrigger value="customer-debts">Müştəri borcları</TabsTrigger>
            <TabsTrigger value="expenses">Xərclər</TabsTrigger>
            <TabsTrigger value="cost-prices">Qiymətlər</TabsTrigger>
          </TabsList>

          <TabsContent value={activeReport} className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Qrafik görünüş</CardTitle>
                  <CardDescription>Aktiv hesabat üzrə əsas dəyərlər</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barData}>
                        <XAxis dataKey="label" hide={barData.length > 6} />
                        <YAxis tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Bar dataKey="value" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Paylanma</CardTitle>
                  <CardDescription>Kateqoriya və ya tip bölgüsü</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4 lg:flex-row">
                  <div className="h-[260px] w-full max-w-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={84}>
                          {pieData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-3">
                    {pieData.map((item) => (
                      <div key={item.name} className="flex items-center justify-between rounded-lg border px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-sm">{item.name}</span>
                        </div>
                        <span className="text-sm font-medium">{formatCurrency(item.value)}</span>
                      </div>
                    ))}
                    {pieData.length === 0 && (
                      <div className="rounded-lg border border-dashed px-4 py-8 text-sm text-muted-foreground">
                        Qrafik üçün məlumat tapılmadı.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <ReportTable
              report={activeReport}
              salesRows={salesRows}
              purchaseRows={purchaseRows}
              stockRows={stockRows}
              expenseRows={expenseRows}
              customerDebtRows={customerDebtRows}
              costPriceRows={costPriceRows}
              financeSummary={financeSummary}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

function ReportTable({
  report,
  salesRows,
  purchaseRows,
  stockRows,
  expenseRows,
  customerDebtRows,
  costPriceRows,
  financeSummary,
}: {
  report: ReportKind
  salesRows: SaleRow[]
  purchaseRows: PurchaseRow[]
  stockRows: StockRow[]
  expenseRows: ExpenseRow[]
  customerDebtRows: DebtRow[]
  costPriceRows: StockRow["product"][]
  financeSummary: FinanceSummary | null
}) {
  if (report === "sales") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Satış əməliyyatları</CardTitle>
        </CardHeader>
        <CardContent>
          <BaseTable
            head={
              <TableRow>
                <TableHead>№</TableHead>
                <TableHead>Tarix</TableHead>
                <TableHead>Müştəri</TableHead>
                <TableHead>Nümayəndə</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Məbləğ</TableHead>
              </TableRow>
            }
            body={salesRows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.sale_number}</TableCell>
                <TableCell>{formatDate(row.sale_date)}</TableCell>
                <TableCell>{row.customer?.name ?? "N/A"}</TableCell>
                <TableCell>{row.sales_representative?.name ?? "N/A"}</TableCell>
                <TableCell>
                  <Badge variant={row.payment_status === "paid" ? "default" : "secondary"}>
                    {row.payment_status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">{formatCurrency(row.total_amount)}</TableCell>
              </TableRow>
            ))}
            emptyMessage="Satış hesabatı üçün nəticə yoxdur."
            colSpan={6}
          />
        </CardContent>
      </Card>
    )
  }

  if (report === "purchases") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Satınalma əməliyyatları</CardTitle>
        </CardHeader>
        <CardContent>
          <BaseTable
            head={
              <TableRow>
                <TableHead>№</TableHead>
                <TableHead>Tarix</TableHead>
                <TableHead>Təchizatçı</TableHead>
                <TableHead>Ödəniş üsulu</TableHead>
                <TableHead className="text-right">Məbləğ</TableHead>
                <TableHead className="text-right">Borc</TableHead>
              </TableRow>
            }
            body={purchaseRows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.purchase_number}</TableCell>
                <TableCell>{formatDate(row.purchase_date)}</TableCell>
                <TableCell>{row.supplier?.name ?? "N/A"}</TableCell>
                <TableCell>{row.payment_method === "cash" ? "Kassa" : "Bank"}</TableCell>
                <TableCell className="text-right">{formatCurrency(row.total_amount)}</TableCell>
                <TableCell className="text-right">{formatCurrency(row.debt_amount)}</TableCell>
              </TableRow>
            ))}
            emptyMessage="Satınalma hesabatı üçün nəticə yoxdur."
            colSpan={6}
          />
        </CardContent>
      </Card>
    )
  }

  if (report === "stock") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Stok vəziyyəti</CardTitle>
        </CardHeader>
        <CardContent>
          <BaseTable
            head={
              <TableRow>
                <TableHead>Məhsul</TableHead>
                <TableHead>Kod</TableHead>
                <TableHead>Kateqoriya</TableHead>
                <TableHead className="text-right">Real</TableHead>
                <TableHead className="text-right">Rəsmi</TableHead>
                <TableHead className="text-right">Minimum</TableHead>
              </TableRow>
            }
            body={stockRows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.product?.name ?? "N/A"}</TableCell>
                <TableCell>{row.product?.product_code ?? "-"}</TableCell>
                <TableCell>{row.product?.category?.name ?? "-"}</TableCell>
                <TableCell className="text-right">{row.real_quantity}</TableCell>
                <TableCell className="text-right">{row.official_quantity}</TableCell>
                <TableCell className="text-right">{row.minimum_quantity}</TableCell>
              </TableRow>
            ))}
            emptyMessage="Stok hesabatı üçün nəticə yoxdur."
            colSpan={6}
          />
        </CardContent>
      </Card>
    )
  }

  if (report === "finance") {
    const net = (financeSummary?.sales_total ?? 0) - (financeSummary?.purchase_total ?? 0) - (financeSummary?.expense_total ?? 0)
    return (
      <Card>
        <CardHeader>
          <CardTitle>Maliyyə nəticəsi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <FinanceTile title="Satış gəliri" value={financeSummary?.sales_total ?? 0} />
            <FinanceTile title="Satınalma xərci" value={financeSummary?.purchase_total ?? 0} />
            <FinanceTile title="Əlavə xərclər" value={financeSummary?.expense_total ?? 0} />
            <FinanceTile title="Xalis nəticə" value={net} />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (report === "customer-debts") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Müştəri borcları</CardTitle>
        </CardHeader>
        <CardContent>
          <BaseTable
            head={
              <TableRow>
                <TableHead>Müştəri</TableHead>
                <TableHead>Telefon</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Borc</TableHead>
              </TableRow>
            }
            body={customerDebtRows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.name}</TableCell>
                <TableCell>{row.phone}</TableCell>
                <TableCell>
                  <Badge variant={row.status === "active" ? "default" : "secondary"}>{row.status}</Badge>
                </TableCell>
                <TableCell className="text-right">{formatCurrency(row.total_debt)}</TableCell>
              </TableRow>
            ))}
            emptyMessage="Müştəri borcu tapılmadı."
            colSpan={4}
          />
        </CardContent>
      </Card>
    )
  }

  if (report === "expenses") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Xərc cədvəli</CardTitle>
        </CardHeader>
        <CardContent>
          <BaseTable
            head={
              <TableRow>
                <TableHead>Tarix</TableHead>
                <TableHead>Başlıq</TableHead>
                <TableHead>Kateqoriya</TableHead>
                <TableHead>Növ</TableHead>
                <TableHead>Ödəniş</TableHead>
                <TableHead className="text-right">Məbləğ</TableHead>
              </TableRow>
            }
            body={expenseRows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{formatDate(row.expense_date)}</TableCell>
                <TableCell className="font-medium">{row.title}</TableCell>
                <TableCell>{row.category_name ?? "Kateqoriyasız"}</TableCell>
                <TableCell>
                  <Badge variant={row.expense_type === "cash" ? "secondary" : "default"}>{row.expense_type}</Badge>
                </TableCell>
                <TableCell>{row.payment_method === "cash" ? "Kassa" : "Bank"}</TableCell>
                <TableCell className="text-right">{formatCurrency(row.amount)}</TableCell>
              </TableRow>
            ))}
            emptyMessage="Xərc hesabatı üçün nəticə yoxdur."
            colSpan={6}
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Maya və satış qiymətləri</CardTitle>
      </CardHeader>
      <CardContent>
        <BaseTable
          head={
            <TableRow>
              <TableHead>Məhsul</TableHead>
              <TableHead>Kateqoriya</TableHead>
              <TableHead>Brend</TableHead>
              <TableHead className="text-right">Maya</TableHead>
              <TableHead className="text-right">Nağd qiymət</TableHead>
              <TableHead className="text-right">Rəsmi qiymət</TableHead>
            </TableRow>
          }
          body={costPriceRows.map((row) => (
            <TableRow key={row?.id ?? row?.name ?? "product"}>
              <TableCell className="font-medium">{row?.name ?? "N/A"}</TableCell>
              <TableCell>{row?.category?.name ?? "-"}</TableCell>
              <TableCell>{row?.brand?.name ?? "-"}</TableCell>
              <TableCell className="text-right">{formatCurrency(Number(row?.cost_price ?? 0))}</TableCell>
              <TableCell className="text-right">{formatCurrency(Number(row?.cash_sale_price ?? 0))}</TableCell>
              <TableCell className="text-right">{formatCurrency(Number(row?.official_sale_price ?? 0))}</TableCell>
            </TableRow>
          ))}
          emptyMessage="Qiymət hesabatı üçün nəticə yoxdur."
          colSpan={6}
        />
      </CardContent>
    </Card>
  )
}

function BaseTable({
  head,
  body,
  emptyMessage,
  colSpan,
}: {
  head: ReactNode
  body: ReactNode[]
  emptyMessage: string
  colSpan: number
}) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>{head}</TableHeader>
        <TableBody>
          {body.length > 0 ? (
            body
          ) : (
            <TableRow>
              <TableCell colSpan={colSpan} className="h-24 text-center text-muted-foreground">
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}

function FinanceTile({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-lg border bg-muted/30 px-4 py-5">
      <div className="text-sm text-muted-foreground">{title}</div>
      <div className="mt-2 text-2xl font-semibold">{formatCurrency(value)}</div>
    </div>
  )
}

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function toCsv(report: ReportKind, rows: unknown[]) {
  if (report === "finance") {
    const financeRows = rows as FinanceSummary[]
    return buildCsv([
      ["sales_total", "purchase_total", "expense_total"],
      ...financeRows.map((row) => [row.sales_total, row.purchase_total, row.expense_total]),
    ])
  }

  if (report === "sales") {
    return buildCsv([
      ["sale_number", "sale_date", "customer", "sales_representative", "payment_status", "total_amount", "debt_amount"],
      ...(rows as SaleRow[]).map((row) => [
        row.sale_number,
        row.sale_date,
        row.customer?.name ?? "",
        row.sales_representative?.name ?? "",
        row.payment_status,
        row.total_amount,
        row.debt_amount,
      ]),
    ])
  }

  if (report === "purchases") {
    return buildCsv([
      ["purchase_number", "purchase_date", "supplier", "payment_method", "total_amount", "debt_amount"],
      ...(rows as PurchaseRow[]).map((row) => [
        row.purchase_number,
        row.purchase_date,
        row.supplier?.name ?? "",
        row.payment_method,
        row.total_amount,
        row.debt_amount,
      ]),
    ])
  }

  if (report === "stock") {
    return buildCsv([
      ["product", "product_code", "category", "brand", "real_quantity", "official_quantity", "minimum_quantity"],
      ...(rows as StockRow[]).map((row) => [
        row.product?.name ?? "",
        row.product?.product_code ?? "",
        row.product?.category?.name ?? "",
        row.product?.brand?.name ?? "",
        row.real_quantity,
        row.official_quantity,
        row.minimum_quantity,
      ]),
    ])
  }

  if (report === "customer-debts") {
    return buildCsv([
      ["name", "phone", "status", "total_debt"],
      ...(rows as DebtRow[]).map((row) => [row.name, row.phone, row.status, row.total_debt]),
    ])
  }

  if (report === "expenses") {
    return buildCsv([
      ["expense_date", "title", "category_name", "expense_type", "payment_method", "amount"],
      ...(rows as ExpenseRow[]).map((row) => [
        row.expense_date,
        row.title,
        row.category_name ?? "",
        row.expense_type,
        row.payment_method,
        row.amount,
      ]),
    ])
  }

  return buildCsv([
    ["name", "category", "brand", "cost_price", "cash_sale_price", "official_sale_price"],
    ...(rows as StockRow["product"][]).map((row) => [
      row?.name ?? "",
      row?.category?.name ?? "",
      row?.brand?.name ?? "",
      Number(row?.cost_price ?? 0),
      Number(row?.cash_sale_price ?? 0),
      Number(row?.official_sale_price ?? 0),
    ]),
  ])
}

function buildCsv(rows: Array<Array<string | number>>) {
  return rows
    .map((row) =>
      row
        .map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`)
        .join(","),
    )
    .join("\n")
}
