"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Header } from "@/components/layout/header"
import { TOKEN_KEY, backendFetch, ensureBackendToken } from "@/lib/backend-api"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertCircle,
  ArrowUpRight,
  Calendar,
  ChevronRight,
  CreditCard,
  Download,
  Eye,
  Loader2,
  Plus,
  Search,
  ShoppingCart,
  TrendingUp,
} from "lucide-react"

type ApiSaleItem = {
  id: number
  product_id: number
  product_name: string
  quantity: number
  unit_price: number
  total_price: number
  stock_type: "real" | "official" | "none"
}

type ApiSale = {
  id: number
  sale_number: string
  customer: {
    id: number
    name: string
    phone: string
    total_debt: number
  } | null
  sales_representative: {
    id: number
    name: string
    email: string
  } | null
  sale_type: "cash" | "official"
  payment_status: "paid" | "partial" | "debt"
  payment_method: "cash" | "bank"
  subtotal: number
  vat_amount: number
  total_amount: number
  paid_amount: number
  debt_amount: number
  stock_output: boolean
  note: string | null
  sale_date: string
  items: ApiSaleItem[]
}

type ApiCustomer = {
  id: number
  name: string
  phone: string
  total_debt: number
  status: "active" | "passive"
}

const today = new Date().toISOString().slice(0, 10)

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("az-AZ", {
    minimumFractionDigits: 2,
  }).format(value)
}

export default function SalesPage() {
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [sales, setSales] = useState<ApiSale[]>([])
  const [customers, setCustomers] = useState<ApiCustomer[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedSale, setSelectedSale] = useState<ApiSale | null>(null)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [isPaying, setIsPaying] = useState(false)
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    payment_method: "cash",
    note: "",
    transaction_date: today,
  })

  useEffect(() => {
    const storedToken = window.localStorage.getItem(TOKEN_KEY)
    void bootstrap(storedToken)
  }, [])

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
      }
      throw error
    }
  }

  const bootstrap = async (existingToken: string | null) => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const activeToken = existingToken ?? (await ensureBackendToken("bestsol-sales-list-web"))

      setToken(activeToken)
      await loadData(activeToken)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Satış məlumatları yüklənmədi.")
    } finally {
      setIsLoading(false)
    }
  }

  const loadData = async (activeToken: string) => {
    const [salesResponse, customersResponse] = await Promise.all([
      apiFetch("/sales?per_page=200", undefined, activeToken),
      apiFetch("/customers?per_page=200&sort=id&direction=asc", undefined, activeToken),
    ])

    const salesJson = await salesResponse.json()
    const customersJson = await customersResponse.json()

    setSales(salesJson.data ?? [])
    setCustomers(customersJson.data ?? [])
  }

  const openPaymentDialog = () => {
    if (!selectedSale || selectedSale.debt_amount <= 0) {
      return
    }

    setPaymentForm({
      amount: String(selectedSale.debt_amount),
      payment_method: selectedSale.payment_method,
      note: "",
      transaction_date: today,
    })
    setPaymentDialogOpen(true)
  }

  const submitDebtPayment = async () => {
    if (!selectedSale) {
      return
    }

    setErrorMessage(null)
    setIsPaying(true)

    try {
      const response = await apiFetch(`/sales/${selectedSale.id}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(paymentForm.amount),
          payment_method: paymentForm.payment_method,
          note: paymentForm.note || null,
          transaction_date: paymentForm.transaction_date,
        }),
      })

      const json = await response.json()
      setSelectedSale(json.data ?? json)
      setPaymentDialogOpen(false)
      if (token) {
        await loadData(token)
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Ödəniş qeydə alınmadı.")
    } finally {
      setIsPaying(false)
    }
  }

  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      const customerName = sale.customer?.name ?? "Nağdsız müştəri"
      const representative = sale.sales_representative?.name ?? ""
      const matchesSearch =
        customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sale.sale_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        representative.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesType = typeFilter === "all" || sale.sale_type === typeFilter
      const matchesStatus = statusFilter === "all" || sale.payment_status === statusFilter
      return matchesSearch && matchesType && matchesStatus
    })
  }, [sales, searchQuery, statusFilter, typeFilter])

  const totalSales = useMemo(
    () => sales.reduce((sum, sale) => sum + sale.total_amount, 0),
    [sales],
  )

  const cashSales = useMemo(
    () => sales.filter((sale) => sale.sale_type === "cash").reduce((sum, sale) => sum + sale.total_amount, 0),
    [sales],
  )

  const officialSales = useMemo(
    () => sales.filter((sale) => sale.sale_type === "official").reduce((sum, sale) => sum + sale.total_amount, 0),
    [sales],
  )

  const unpaidAmount = useMemo(
    () => sales.reduce((sum, sale) => sum + sale.debt_amount, 0),
    [sales],
  )

  const stats = [
    { label: "Cəmi Satış", value: totalSales, icon: ShoppingCart, color: "text-primary", bgColor: "bg-primary/10" },
    { label: "Nağd Satış", value: cashSales, icon: TrendingUp, color: "text-success", bgColor: "bg-success/10" },
    { label: "Rəsmi Satış", value: officialSales, icon: CreditCard, color: "text-chart-2", bgColor: "bg-chart-2/10" },
    { label: "Ödənilməmiş", value: unpaidAmount, icon: AlertCircle, color: "text-destructive", bgColor: "bg-destructive/10" },
  ]

  const indebtedCustomers = useMemo(
    () => customers.filter((customer) => customer.total_debt > 0).sort((a, b) => b.total_debt - a.total_debt).slice(0, 5),
    [customers],
  )

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header title="Satış" subtitle="Satış əməliyyatları və hesabatlar" />
        <div className="flex flex-1 items-center justify-center">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Satış məlumatları yüklənir...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Satış" subtitle="Satış əməliyyatları və hesabatlar" />

      <div className="flex-1 p-6 space-y-6">
        {errorMessage && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <Card key={stat.label} className="border-border">
                <CardContent className="p-5">
                  <div className="flex items-center gap-4">
                    <div className={`h-11 w-11 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                      <Icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-xl font-semibold tabular-nums">{formatCurrency(stat.value)} <span className="text-sm font-normal text-muted-foreground">AZN</span></p>
                      <p className="text-[12px] text-muted-foreground">{stat.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Müştəri, satış nömrəsi və ya nümayəndə axtar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 bg-secondary/50 border-0 focus-visible:ring-1"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px] h-9 bg-secondary/50 border-0">
                <SelectValue placeholder="Növ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün</SelectItem>
                <SelectItem value="cash">Nağd</SelectItem>
                <SelectItem value="official">Rəsmi</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] h-9 bg-secondary/50 border-0">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün</SelectItem>
                <SelectItem value="paid">Ödənilib</SelectItem>
                <SelectItem value="partial">Qismən</SelectItem>
                <SelectItem value="debt">Borc</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-9 gap-1.5">
              <Download className="h-4 w-4" /> Export
            </Button>
            <Link href="/sales/new">
              <Button size="sm" className="h-9 gap-1.5">
                <Plus className="h-4 w-4" /> Yeni Satış
              </Button>
            </Link>
          </div>
        </div>

        <Card className="border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-3 px-4 text-[12px] font-medium text-muted-foreground">Nömrə</th>
                  <th className="text-left py-3 px-4 text-[12px] font-medium text-muted-foreground">Tarix</th>
                  <th className="text-left py-3 px-4 text-[12px] font-medium text-muted-foreground">Müştəri</th>
                  <th className="text-left py-3 px-4 text-[12px] font-medium text-muted-foreground">Nümayəndə</th>
                  <th className="text-center py-3 px-4 text-[12px] font-medium text-muted-foreground">Növ</th>
                  <th className="text-center py-3 px-4 text-[12px] font-medium text-muted-foreground">Status</th>
                  <th className="text-right py-3 px-4 text-[12px] font-medium text-muted-foreground">Məbləğ</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredSales.map((sale) => (
                  <tr
                    key={sale.id}
                    className="group hover:bg-muted/20 transition-colors cursor-pointer"
                    onClick={() => setSelectedSale(sale)}
                  >
                    <td className="py-3 px-4">
                      <code className="text-[12px] font-mono text-primary">{sale.sale_number}</code>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        {sale.sale_date}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-[13px] font-medium">{sale.customer?.name ?? "Seçilməyib"}</p>
                    </td>
                    <td className="py-3 px-4 text-[13px] text-muted-foreground">{sale.sales_representative?.name ?? "-"}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex h-6 px-2.5 rounded-full text-[11px] font-medium items-center ${
                        sale.sale_type === "cash"
                          ? "bg-success/10 text-success"
                          : "bg-chart-2/10 text-chart-2"
                      }`}>
                        {sale.sale_type === "cash" ? "Nağd" : "Rəsmi"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex h-6 px-2.5 rounded-full text-[11px] font-medium items-center ${
                        sale.payment_status === "paid"
                          ? "bg-success/10 text-success"
                          : sale.payment_status === "partial"
                            ? "bg-warning/10 text-warning"
                            : "bg-destructive/10 text-destructive"
                      }`}>
                        {sale.payment_status === "paid" ? "Ödənilib" : sale.payment_status === "partial" ? "Qismən" : "Borc"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <p className="text-[14px] font-semibold tabular-nums">{formatCurrency(sale.total_amount)} AZN</p>
                    </td>
                    <td className="py-3 px-4">
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {filteredSales.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      Filterə uyğun satış tapılmadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="border-border">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="text-[15px] font-semibold">Müştəri Borcları</h3>
              <p className="text-[12px] text-muted-foreground mt-0.5">Backend-dən gələn aktual borc qalığı</p>
            </div>
            <Button variant="ghost" size="sm" className="text-[13px] text-primary gap-1">
              Hamısına bax <ArrowUpRight className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="divide-y divide-border">
            {indebtedCustomers.map((customer) => (
              <div key={customer.id} className="flex items-center justify-between p-4 hover:bg-muted/20 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <span className="text-[12px] font-semibold text-primary">
                      {customer.name.split(" ").map((name) => name[0]).join("").slice(0, 2)}
                    </span>
                  </div>
                  <div>
                    <p className="text-[13px] font-medium">{customer.name}</p>
                    <p className="text-[11px] text-muted-foreground">{customer.phone}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[14px] font-semibold text-destructive tabular-nums">{formatCurrency(customer.total_debt)} AZN</p>
                  <p className="text-[11px] text-muted-foreground">qalıq borc</p>
                </div>
              </div>
            ))}
            {indebtedCustomers.length === 0 && (
              <div className="p-4 text-sm text-muted-foreground">Hazırda borclu müştəri yoxdur.</div>
            )}
          </div>
        </Card>
      </div>

      <Sheet open={!!selectedSale} onOpenChange={() => setSelectedSale(null)}>
        <SheetContent className="sm:max-w-lg border-l-border">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-[16px]">
              Satış <code className="text-primary font-mono">{selectedSale?.sale_number}</code>
            </SheetTitle>
          </SheetHeader>
          {selectedSale && (
            <div className="mt-6 space-y-6">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/30 border border-border">
                <div className="h-11 w-11 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <span className="text-[13px] font-semibold text-primary">
                    {(selectedSale.customer?.name ?? "M")
                      .split(" ")
                      .map((part) => part[0])
                      .join("")
                      .slice(0, 2)}
                  </span>
                </div>
                <div>
                  <p className="text-[14px] font-medium">{selectedSale.customer?.name ?? "Seçilməyib"}</p>
                  <p className="text-[12px] text-muted-foreground">{selectedSale.sale_date}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/30 border border-border">
                  <p className="text-[11px] text-muted-foreground mb-1">Satış Növü</p>
                  <span className={`inline-flex h-6 px-2.5 rounded-full text-[11px] font-medium items-center ${
                    selectedSale.sale_type === "cash" ? "bg-success/10 text-success" : "bg-chart-2/10 text-chart-2"
                  }`}>
                    {selectedSale.sale_type === "cash" ? "Nağd" : "Rəsmi"}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 border border-border">
                  <p className="text-[11px] text-muted-foreground mb-1">Ödəniş Statusu</p>
                  <span className={`inline-flex h-6 px-2.5 rounded-full text-[11px] font-medium items-center ${
                    selectedSale.payment_status === "paid"
                      ? "bg-success/10 text-success"
                      : selectedSale.payment_status === "partial"
                        ? "bg-warning/10 text-warning"
                        : "bg-destructive/10 text-destructive"
                  }`}>
                    {selectedSale.payment_status === "paid" ? "Ödənilib" : selectedSale.payment_status === "partial" ? "Qismən" : "Borc"}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-[12px] text-muted-foreground mb-3">Məhsullar</p>
                <div className="rounded-xl border border-border overflow-hidden">
                  {selectedSale.items.map((product) => (
                    <div key={product.id} className="flex items-center justify-between p-3 border-b border-border last:border-0 hover:bg-muted/20">
                      <div>
                        <p className="text-[13px] font-medium">{product.product_name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {product.quantity} × {formatCurrency(product.unit_price)} AZN
                        </p>
                      </div>
                      <p className="text-[13px] font-semibold tabular-nums">{formatCurrency(product.total_price)} AZN</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                <div className="flex justify-between items-center">
                  <span className="text-[14px] font-medium">Cəmi</span>
                  <span className="text-[18px] font-bold tabular-nums">{formatCurrency(selectedSale.total_amount)} AZN</span>
                </div>
                {selectedSale.payment_status !== "paid" && (
                  <div className="mt-3 pt-3 border-t border-primary/10 space-y-2">
                    <div className="flex justify-between text-[13px]">
                      <span className="text-muted-foreground">Ödənilən</span>
                      <span className="text-success font-medium">{formatCurrency(selectedSale.paid_amount)} AZN</span>
                    </div>
                    <div className="flex justify-between text-[13px]">
                      <span className="text-muted-foreground">Qalıq</span>
                      <span className="text-destructive font-semibold">{formatCurrency(selectedSale.debt_amount)} AZN</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-muted-foreground">Ödəniş metodu</p>
                  <p className="mt-1 font-medium">{selectedSale.payment_method === "cash" ? "Nağd kassa" : "Bank hesabı"}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-muted-foreground">Nümayəndə</p>
                  <p className="mt-1 font-medium">{selectedSale.sales_representative?.name ?? "-"}</p>
                </div>
              </div>

              {selectedSale.note && (
                <div className="rounded-lg border border-border p-3 text-sm">
                  <p className="text-muted-foreground">Qeyd</p>
                  <p className="mt-1">{selectedSale.note}</p>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 h-10"
                  onClick={() => window.open(`/sales/${selectedSale.id}?print=1`, "_blank", "noopener,noreferrer")}
                >
                  Çap et
                </Button>
                <Link href={`/sales/${selectedSale.id}`} className="flex-1">
                  <Button className="w-full h-10">
                    Ətraflı bax <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </div>

              {selectedSale.debt_amount > 0 && (
                <Button className="w-full h-10" onClick={openPaymentDialog}>
                  Borcdan ödə
                </Button>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Satış üzrə ödəniş al</DialogTitle>
            <DialogDescription>
              {selectedSale?.sale_number} üzrə qalıq borcdan ödəniş qəbul edin.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="sale-payment-amount">Məbləğ</Label>
              <Input
                id="sale-payment-amount"
                type="number"
                min="0.01"
                step="0.01"
                max={selectedSale?.debt_amount ?? 0}
                value={paymentForm.amount}
                onChange={(event) => setPaymentForm((current) => ({ ...current, amount: event.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Ödəniş metodu</Label>
              <Select
                value={paymentForm.payment_method}
                onValueChange={(value: "cash" | "bank") => setPaymentForm((current) => ({ ...current, payment_method: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Nağd kassa</SelectItem>
                  <SelectItem value="bank">Bank hesabı</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sale-payment-date">Tarix</Label>
              <Input
                id="sale-payment-date"
                type="date"
                value={paymentForm.transaction_date}
                onChange={(event) => setPaymentForm((current) => ({ ...current, transaction_date: event.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sale-payment-note">Qeyd</Label>
              <Textarea
                id="sale-payment-note"
                value={paymentForm.note}
                onChange={(event) => setPaymentForm((current) => ({ ...current, note: event.target.value }))}
                placeholder="Ödəniş haqqında qeyd"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>Ləğv et</Button>
            <Button onClick={submitDebtPayment} disabled={isPaying}>
              {isPaying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Ödənişi qeydə al
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
