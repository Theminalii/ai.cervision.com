"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { Header } from "@/components/layout/header"
import { backendFetch, ensureBackendToken } from "@/lib/backend-api"
import { toast } from "@/components/ui/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, MoreHorizontal, Eye, Edit, Trash2, Search, Plus, Download, Building2, Truck, Package, DollarSign } from "lucide-react"

type PaginatedResponse<T> = { data: T[] }

type Account = {
  id: number
  name: string
  type: "cash" | "bank"
  balance: number
  status: "active" | "passive"
}

type Supplier = {
  id: number
  name: string
  phone: string
  email: string | null
  address: string | null
  total_debt: number
  status: "active" | "passive"
}

type Purchase = {
  id: number
  purchase_number: string
  supplier: { id: number; name: string } | null
  total_amount: number
  paid_amount: number
  debt_amount: number
  purchase_date: string
}

type DebtTransaction = {
  id: number
  type: "debt" | "payment"
  amount: number
  note: string | null
  transaction_date: string
}

type SupplierForm = {
  id: number | null
  name: string
  phone: string
  email: string
  address: string
  status: "active" | "passive"
}

type PaymentForm = {
  supplierId: string
  amount: string
  payment_method: "cash" | "bank"
  transaction_date: string
  note: string
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

const currentDate = () => new Date().toISOString().slice(0, 10)

const emptySupplierForm = (): SupplierForm => ({
  id: null,
  name: "",
  phone: "",
  email: "",
  address: "",
  status: "active",
})

const emptyPaymentForm = (): PaymentForm => ({
  supplierId: "",
  amount: "",
  payment_method: "bank",
  transaction_date: currentDate(),
  note: "",
})

export default function SuppliersPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [accountsErrorMessage, setAccountsErrorMessage] = useState<string | null>(null)
  const [paymentErrorMessage, setPaymentErrorMessage] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [selectedDebtTransactions, setSelectedDebtTransactions] = useState<DebtTransaction[]>([])
  const [isSupplierDialogOpen, setIsSupplierDialogOpen] = useState(false)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
  const [supplierForm, setSupplierForm] = useState<SupplierForm>(emptySupplierForm())
  const [paymentForm, setPaymentForm] = useState<PaymentForm>(emptyPaymentForm())

  async function bootstrap() {
    setIsLoading(true)
    setErrorMessage(null)
    setAccountsErrorMessage(null)
    try {
      const token = await ensureBackendToken("bestsol-suppliers-web")
      const [suppliersResponse, purchasesResponse] = await Promise.all([
        backendFetch("/suppliers?per_page=500&sort=id&direction=desc", token),
        backendFetch("/purchases?per_page=500", token),
      ])
      let accountsJson: Account[] = []
      try {
        const accountsResponse = await backendFetch("/finance/accounts", token)
        accountsJson = await accountsResponse.json()
      } catch (error) {
        accountsJson = []
        setAccountsErrorMessage(error instanceof Error ? error.message : "Hesab məlumatları yüklənmədi.")
      }
      const suppliersJson = (await suppliersResponse.json()) as PaginatedResponse<Supplier>
      const purchasesJson = (await purchasesResponse.json()) as PaginatedResponse<Purchase>
      setSuppliers(suppliersJson.data ?? [])
      setPurchases(purchasesJson.data ?? [])
      setAccounts(accountsJson)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Təchizatçılar yüklənmədi.")
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

  const metrics = useMemo(() => {
    const purchasesBySupplier = new Map<number, { totalOrders: number; totalValue: number }>()
    purchases.forEach((purchase) => {
      if (!purchase.supplier?.id) return
      const existing = purchasesBySupplier.get(purchase.supplier.id) ?? { totalOrders: 0, totalValue: 0 }
      existing.totalOrders += 1
      existing.totalValue += purchase.total_amount
      purchasesBySupplier.set(purchase.supplier.id, existing)
    })
    return purchasesBySupplier
  }, [purchases])

  const filteredSuppliers = useMemo(() => {
    const term = searchTerm.toLowerCase()
    return suppliers.filter((supplier) =>
      supplier.name.toLowerCase().includes(term) ||
      supplier.phone.toLowerCase().includes(term) ||
      (supplier.email ?? "").toLowerCase().includes(term),
    )
  }, [searchTerm, suppliers])

  const totalPurchases = useMemo(
    () => purchases.reduce((sum, purchase) => sum + Number(purchase.total_amount ?? 0), 0),
    [purchases],
  )

  const totalDebt = useMemo(
    () => suppliers.reduce((sum, supplier) => sum + Number(supplier.total_debt ?? 0), 0),
    [suppliers],
  )

  const selectedPaymentSupplier = useMemo(
    () => suppliers.find((supplier) => String(supplier.id) === paymentForm.supplierId) ?? null,
    [paymentForm.supplierId, suppliers],
  )

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.type === paymentForm.payment_method && account.status === "active") ?? null,
    [accounts, paymentForm.payment_method],
  )

  const openCreateDialog = () => {
    setSupplierForm(emptySupplierForm())
    setIsSupplierDialogOpen(true)
  }

  const openEditDialog = (supplier: Supplier) => {
    setSupplierForm({
      id: supplier.id,
      name: supplier.name,
      phone: supplier.phone,
      email: supplier.email ?? "",
      address: supplier.address ?? "",
      status: supplier.status,
    })
    setIsSupplierDialogOpen(true)
  }

  const openDetailDialog = async (supplier: Supplier) => {
    setSelectedSupplier(supplier)
    setSelectedDebtTransactions([])
    setIsDetailDialogOpen(true)
    try {
      const token = await ensureBackendToken("bestsol-supplier-detail")
      const response = await backendFetch(`/suppliers/${supplier.id}/debts`, token)
      const json = await response.json()
      setSelectedDebtTransactions(json.transactions ?? [])
    } catch (error) {
      toast({
        title: "Borclar yüklənmədi",
        description: error instanceof Error ? error.message : "Xəta baş verdi.",
        variant: "destructive",
      })
    }
  }

  const openPaymentDialog = (supplier?: Supplier) => {
    const suggestedMethod = getSuggestedPaymentMethod(accounts, supplier)
    setPaymentErrorMessage(null)

    setPaymentForm({
      ...emptyPaymentForm(),
      supplierId: supplier ? String(supplier.id) : "",
      amount: supplier ? String(Number(supplier.total_debt).toFixed(2)) : "",
      payment_method: suggestedMethod,
    })
    setIsPaymentDialogOpen(true)
  }

  const saveSupplier = async () => {
    setIsSaving(true)
    try {
      const token = await ensureBackendToken("bestsol-supplier-save")
      await backendFetch(supplierForm.id ? `/suppliers/${supplierForm.id}` : "/suppliers", token, {
        method: supplierForm.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: supplierForm.name,
          phone: supplierForm.phone,
          email: supplierForm.email || null,
          address: supplierForm.address || null,
          status: supplierForm.status,
        }),
      })
      toast({ title: "Təchizatçı saxlanıldı" })
      setIsSupplierDialogOpen(false)
      await bootstrap()
    } catch (error) {
      toast({
        title: "Təchizatçı saxlanmadı",
        description: error instanceof Error ? error.message : "Xəta baş verdi.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const deleteSupplier = async (supplier: Supplier) => {
    if (!window.confirm(`"${supplier.name}" təchizatçısını silmək istəyirsiniz?`)) return
    try {
      const token = await ensureBackendToken("bestsol-supplier-delete")
      await backendFetch(`/suppliers/${supplier.id}`, token, { method: "DELETE" })
      toast({ title: "Təchizatçı silindi" })
      await bootstrap()
    } catch (error) {
      toast({
        title: "Təchizatçı silinmədi",
        description: error instanceof Error ? error.message : "Xəta baş verdi.",
        variant: "destructive",
      })
    }
  }

  const submitPayment = async () => {
    setIsSaving(true)
    setPaymentErrorMessage(null)
    try {
      if (!paymentForm.supplierId) {
        throw new Error("Əvvəlcə təchizatçı seçin.")
      }

      const amount = Number(paymentForm.amount || 0)
      if (amount <= 0) {
        throw new Error("Ödəniş məbləği 0-dan böyük olmalıdır.")
      }

      const supplier = suppliers.find((item) => String(item.id) === paymentForm.supplierId)
      if (!supplier) {
        throw new Error("Seçilmiş təchizatçı tapılmadı.")
      }

      if (amount > Number(supplier.total_debt)) {
        throw new Error("Ödəniş məbləği təchizatçının cari borcundan çox ola bilməz.")
      }

      if (accountsErrorMessage) {
        throw new Error(`Hesab məlumatı alınmadığı üçün ödəniş tamamlanmadı. ${accountsErrorMessage}`)
      }

      const account = accounts.find((item) => item.type === paymentForm.payment_method && item.status === "active")
      if (!account) {
        throw new Error(
          paymentForm.payment_method === "bank"
            ? "Aktiv bank hesabı tapılmadı."
            : "Aktiv nağd hesab tapılmadı.",
        )
      }

      if (amount > Number(account.balance)) {
        throw new Error(`${account.name} hesabında kifayət qədər məbləğ yoxdur.`)
      }

      const token = await ensureBackendToken("bestsol-supplier-payment")
      await backendFetch(`/suppliers/${paymentForm.supplierId}/payment`, token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          payment_method: paymentForm.payment_method,
          transaction_date: paymentForm.transaction_date,
          note: paymentForm.note || null,
        }),
      })
      toast({ title: "Ödəniş qeydə alındı" })
      setIsPaymentDialogOpen(false)
      await bootstrap()
      if (selectedSupplier && String(selectedSupplier.id) === paymentForm.supplierId) {
        await openDetailDialog(selectedSupplier)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Xəta baş verdi."
      setPaymentErrorMessage(message)
      toast({
        title: "Ödəniş tamamlanmadı",
        description: message,
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const exportSuppliers = () => {
    const reportWindow = window.open("", "_blank", "noopener,noreferrer,width=1200,height=900")
    if (!reportWindow) {
      toast({
        title: "PDF açıla bilmədi",
        description: "Brauzer pop-up pəncərəsini blokladı. İcazə verib yenidən yoxlayın.",
        variant: "destructive",
      })
      return
    }

    const generatedAt = new Date().toLocaleString("az-AZ", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })

    const rows = filteredSuppliers
      .map((supplier) => {
        const supplierMetrics = metrics.get(supplier.id) ?? { totalOrders: 0, totalValue: 0 }

        return `
          <tr>
            <td>${escapeHtml(supplier.name)}</td>
            <td>${escapeHtml(supplier.phone)}</td>
            <td>${escapeHtml(supplier.email ?? "-")}</td>
            <td>${escapeHtml(supplier.address ?? "-")}</td>
            <td>${escapeHtml(supplier.status === "active" ? "Aktiv" : "Passiv")}</td>
            <td class="num">${supplierMetrics.totalOrders}</td>
            <td class="num">${escapeHtml(formatCurrency(supplierMetrics.totalValue))}</td>
            <td class="num debt">${escapeHtml(formatCurrency(supplier.total_debt))}</td>
          </tr>
        `
      })
      .join("")

    reportWindow.document.write(`
      <!doctype html>
      <html lang="az">
        <head>
          <meta charset="utf-8" />
          <title>BestSol Təchizatçılar Hesabatı</title>
          <style>
            :root {
              color-scheme: light;
              --text: #111827;
              --muted: #6b7280;
              --line: #d1d5db;
              --panel: #f8fafc;
              --accent: #0f766e;
              --accent-soft: #ccfbf1;
              --warn: #b45309;
            }
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 32px;
              font-family: "Arial", sans-serif;
              color: var(--text);
              background: white;
            }
            .page {
              max-width: 1120px;
              margin: 0 auto;
            }
            .header {
              display: flex;
              justify-content: space-between;
              gap: 24px;
              align-items: flex-start;
              margin-bottom: 24px;
              padding-bottom: 20px;
              border-bottom: 2px solid var(--line);
            }
            .title {
              margin: 0;
              font-size: 28px;
              font-weight: 700;
            }
            .subtitle {
              margin: 8px 0 0;
              color: var(--muted);
              font-size: 14px;
            }
            .meta {
              text-align: right;
              font-size: 13px;
              color: var(--muted);
            }
            .summary {
              display: grid;
              grid-template-columns: repeat(4, minmax(0, 1fr));
              gap: 12px;
              margin-bottom: 24px;
            }
            .card {
              border: 1px solid var(--line);
              border-radius: 14px;
              padding: 16px;
              background: var(--panel);
            }
            .card .label {
              font-size: 12px;
              color: var(--muted);
              text-transform: uppercase;
              letter-spacing: 0.04em;
              margin-bottom: 8px;
            }
            .card .value {
              font-size: 24px;
              font-weight: 700;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
            }
            thead th {
              background: var(--accent-soft);
              color: var(--accent);
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 0.04em;
              text-align: left;
              padding: 12px 10px;
              border: 1px solid var(--line);
            }
            tbody td {
              padding: 12px 10px;
              border: 1px solid var(--line);
              vertical-align: top;
              font-size: 13px;
              word-break: break-word;
            }
            .num {
              text-align: right;
              white-space: nowrap;
            }
            .debt {
              color: var(--warn);
              font-weight: 700;
            }
            .empty {
              border: 1px dashed var(--line);
              border-radius: 14px;
              padding: 24px;
              text-align: center;
              color: var(--muted);
            }
            @media print {
              body { padding: 16px; }
              .page { max-width: none; }
            }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="header">
              <div>
                <h1 class="title">Təchizatçılar Hesabatı</h1>
                <p class="subtitle">BestSol üzrə təchizatçı siyahısı, alış statistikası və borc məlumatları</p>
              </div>
              <div class="meta">
                <div>Tarix: ${escapeHtml(generatedAt)}</div>
                <div>Qeyd sayı: ${filteredSuppliers.length}</div>
              </div>
            </div>

            <div class="summary">
              <div class="card">
                <div class="label">Ümumi Təchizatçılar</div>
                <div class="value">${suppliers.length}</div>
              </div>
              <div class="card">
                <div class="label">Aktiv Təchizatçılar</div>
                <div class="value">${suppliers.filter((supplier) => supplier.status === "active").length}</div>
              </div>
              <div class="card">
                <div class="label">Ümumi Alış</div>
                <div class="value">${escapeHtml(formatCurrency(totalPurchases))}</div>
              </div>
              <div class="card">
                <div class="label">Ödəniləcək Borc</div>
                <div class="value">${escapeHtml(formatCurrency(totalDebt))}</div>
              </div>
            </div>

            ${
              filteredSuppliers.length === 0
                ? `<div class="empty">İxrac üçün uyğun təchizatçı tapılmadı.</div>`
                : `
                  <table>
                    <thead>
                      <tr>
                        <th>Təchizatçı</th>
                        <th>Telefon</th>
                        <th>E-poçt</th>
                        <th>Ünvan</th>
                        <th>Status</th>
                        <th>Sifariş</th>
                        <th>Ümumi Alış</th>
                        <th>Borc</th>
                      </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                  </table>
                `
            }
          </div>
          <script>
            window.onload = () => {
              setTimeout(() => window.print(), 250)
            }
          </script>
        </body>
      </html>
    `)
    reportWindow.document.close()
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header title="Təchizatçılar" subtitle="Təchizatçı bazası və borc axınları" />
        <div className="flex flex-1 items-center justify-center">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Təchizatçılar yüklənir...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header title="Təchizatçılar" subtitle="Təchizatçı bazası və borc axınları" />

      <div className="flex-1 space-y-6 p-6">
        {errorMessage && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </div>
        )}
        {accountsErrorMessage && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700">
            Hesab məlumatları alınmadı: {accountsErrorMessage}
          </div>
        )}

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-3xl font-bold tracking-tight">Təchizatçılar</div>
            <p className="text-muted-foreground">Real satınalma və borc məlumatları ilə idarə edin</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={exportSuppliers}>
              <Download className="mr-2 h-4 w-4" />
              PDF ixrac
            </Button>
            <Button variant="outline" onClick={() => openPaymentDialog()}>
              <DollarSign className="mr-2 h-4 w-4" />
              Borc ödə
            </Button>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Yeni təchizatçı
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <StatCard title="Ümumi Təchizatçılar" value={String(suppliers.length)} icon={Building2} />
          <StatCard title="Aktiv Təchizatçılar" value={String(suppliers.filter((supplier) => supplier.status === "active").length)} icon={Truck} />
          <StatCard title="Ümumi Alış" value={formatCurrency(totalPurchases)} icon={Package} />
          <StatCard title="Ödəniləcək Borc" value={formatCurrency(totalDebt)} icon={DollarSign} />
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>Təchizatçı Siyahısı</CardTitle>
                <CardDescription>Bütün təchizatçıları buradan idarə edin</CardDescription>
              </div>
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Təchizatçı axtar..." className="pl-9" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Təchizatçı</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Satınalma</TableHead>
                  <TableHead className="text-right">Ümumi Alış</TableHead>
                  <TableHead className="text-right">Borc</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSuppliers.map((supplier) => {
                  const supplierMetrics = metrics.get(supplier.id) ?? { totalOrders: 0, totalValue: 0 }
                  return (
                    <TableRow key={supplier.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>{initials(supplier.name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{supplier.name}</div>
                            <div className="text-sm text-muted-foreground">{supplier.email ?? "E-poçt yoxdur"}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{supplier.phone}</TableCell>
                      <TableCell>
                        <Badge variant={supplier.status === "active" ? "default" : "secondary"}>{supplier.status}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{supplierMetrics.totalOrders}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(supplierMetrics.totalValue)}</TableCell>
                      <TableCell className="text-right">
                        <span className={Number(supplier.total_debt) > 0 ? "font-medium text-warning" : "font-medium text-success"}>
                          {formatCurrency(supplier.total_debt)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => void openDetailDialog(supplier)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Baxış
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditDialog(supplier)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Redaktə
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openPaymentDialog(supplier)}>
                              <DollarSign className="mr-2 h-4 w-4" />
                              Ödəniş et
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => void deleteSupplier(supplier)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Sil
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {filteredSuppliers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      Uyğun təchizatçı tapılmadı.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isSupplierDialogOpen} onOpenChange={setIsSupplierDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{supplierForm.id ? "Təchizatçını redaktə et" : "Yeni təchizatçı"}</DialogTitle>
            <DialogDescription>Təchizatçı məlumatlarını sistemə yazın.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Field label="Şirkət adı">
              <Input value={supplierForm.name} onChange={(event) => setSupplierForm((current) => ({ ...current, name: event.target.value }))} />
            </Field>
            <Field label="Telefon">
              <Input value={supplierForm.phone} onChange={(event) => setSupplierForm((current) => ({ ...current, phone: event.target.value }))} />
            </Field>
            <Field label="E-poçt">
              <Input value={supplierForm.email} onChange={(event) => setSupplierForm((current) => ({ ...current, email: event.target.value }))} />
            </Field>
            <Field label="Ünvan">
              <Input value={supplierForm.address} onChange={(event) => setSupplierForm((current) => ({ ...current, address: event.target.value }))} />
            </Field>
            <Field label="Status">
              <div className="flex gap-2">
                <Button type="button" variant={supplierForm.status === "active" ? "default" : "outline"} onClick={() => setSupplierForm((current) => ({ ...current, status: "active" }))}>Aktiv</Button>
                <Button type="button" variant={supplierForm.status === "passive" ? "default" : "outline"} onClick={() => setSupplierForm((current) => ({ ...current, status: "passive" }))}>Passiv</Button>
              </div>
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSupplierDialogOpen(false)}>Ləğv et</Button>
            <Button onClick={() => void saveSupplier()}>{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Saxla</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Təchizatçı ödənişi</DialogTitle>
            <DialogDescription>Təchizatçı borcunu seçilən hesabdan çıxın.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Field label="Təchizatçı">
              <Select
                value={paymentForm.supplierId}
                onValueChange={(value) => {
                  const supplier = suppliers.find((item) => String(item.id) === value)
                  setPaymentErrorMessage(null)
                  setPaymentForm((current) => ({
                    ...current,
                    supplierId: value,
                    amount: supplier ? String(Number(supplier.total_debt).toFixed(2)) : current.amount,
                    payment_method: getSuggestedPaymentMethod(accounts, supplier, current.payment_method),
                  }))
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Təchizatçı seçin" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.filter((supplier) => Number(supplier.total_debt) > 0).map((supplier) => (
                    <SelectItem key={supplier.id} value={String(supplier.id)}>
                      {supplier.name} • {formatCurrency(supplier.total_debt)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Məbləğ">
              <Input
                type="number"
                step="0.01"
                value={paymentForm.amount}
                onChange={(event) => {
                  setPaymentErrorMessage(null)
                  setPaymentForm((current) => ({ ...current, amount: event.target.value }))
                }}
              />
            </Field>
            <Field label="Ödəniş üsulu">
              <div className="flex gap-2">
                <Button type="button" variant={paymentForm.payment_method === "cash" ? "default" : "outline"} onClick={() => {
                  setPaymentErrorMessage(null)
                  setPaymentForm((current) => ({ ...current, payment_method: "cash" }))
                }}>Nağd</Button>
                <Button type="button" variant={paymentForm.payment_method === "bank" ? "default" : "outline"} onClick={() => {
                  setPaymentErrorMessage(null)
                  setPaymentForm((current) => ({ ...current, payment_method: "bank" }))
                }}>Bank</Button>
              </div>
            </Field>
            {selectedPaymentSupplier && (
              <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm">
                Cari borc: <span className="font-medium">{formatCurrency(selectedPaymentSupplier.total_debt)}</span>
              </div>
            )}
            {selectedAccount && (
              <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm">
                Hesab qalığı: <span className="font-medium">{selectedAccount.name} • {formatCurrency(selectedAccount.balance)}</span>
              </div>
            )}
            {paymentErrorMessage && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {paymentErrorMessage}
              </div>
            )}
            <Field label="Tarix">
              <Input type="date" value={paymentForm.transaction_date} onChange={(event) => {
                setPaymentErrorMessage(null)
                setPaymentForm((current) => ({ ...current, transaction_date: event.target.value }))
              }} />
            </Field>
            <Field label="Qeyd">
              <Input value={paymentForm.note} onChange={(event) => {
                setPaymentErrorMessage(null)
                setPaymentForm((current) => ({ ...current, note: event.target.value }))
              }} />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>Ləğv et</Button>
            <Button onClick={() => void submitPayment()}>{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Təsdiqlə</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-hidden sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>{selectedSupplier?.name ?? "Təchizatçı detalı"}</DialogTitle>
            <DialogDescription>Satınalma və borc tarixçəsi</DialogDescription>
          </DialogHeader>
          {selectedSupplier && (
            <div className="space-y-5 overflow-y-auto pr-1">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <DetailTile label="Telefon" value={selectedSupplier.phone} />
                <DetailTile label="E-poçt" value={selectedSupplier.email ?? "-"} />
                <DetailTile label="Ümumi borc" value={formatCurrency(selectedSupplier.total_debt)} />
                <DetailTile label="Satınalma sayı" value={String(metrics.get(selectedSupplier.id)?.totalOrders ?? 0)} />
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <Card className="min-h-0">
                  <CardHeader>
                    <CardTitle className="text-base">Son satınalmalar</CardTitle>
                    <CardDescription>Təchizatçı üzrə son alış əməliyyatları</CardDescription>
                  </CardHeader>
                  <CardContent className="min-h-0">
                    <ScrollArea className="h-64">
                      <div className="space-y-3">
                        {purchases.filter((purchase) => purchase.supplier?.id === selectedSupplier.id).map((purchase) => (
                          <div key={purchase.id} className="rounded-lg border px-3 py-2">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <div className="font-medium">{purchase.purchase_number}</div>
                                <div className="text-sm text-muted-foreground">{formatDate(purchase.purchase_date)}</div>
                              </div>
                              <div className="text-right">
                                <div className="font-medium">{formatCurrency(purchase.total_amount)}</div>
                                <div className="text-xs text-muted-foreground">Borc: {formatCurrency(purchase.debt_amount)}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                        {purchases.filter((purchase) => purchase.supplier?.id === selectedSupplier.id).length === 0 && (
                          <div className="rounded-lg border border-dashed px-3 py-6 text-sm text-muted-foreground">
                            Satınalma tapılmadı.
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                <Card className="min-h-0">
                  <CardHeader>
                    <CardTitle className="text-base">Borc hərəkətləri</CardTitle>
                    <CardDescription>Borc və ödəniş tarixçəsi</CardDescription>
                  </CardHeader>
                  <CardContent className="min-h-0">
                    <ScrollArea className="h-64">
                      <div className="space-y-3">
                        {selectedDebtTransactions.map((item) => (
                          <div key={item.id} className="rounded-lg border px-3 py-2">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <div className="font-medium">{item.type === "debt" ? "Borc yazıldı" : "Ödəniş edildi"}</div>
                                <div className="text-sm text-muted-foreground">{formatDate(item.transaction_date)}</div>
                              </div>
                              <div className={`font-medium ${item.type === "debt" ? "text-warning" : "text-success"}`}>
                                {item.type === "debt" ? "+" : "-"}{formatCurrency(item.amount)}
                              </div>
                            </div>
                            {item.note && <div className="mt-2 text-sm text-muted-foreground">{item.note}</div>}
                          </div>
                        ))}
                        {selectedDebtTransactions.length === 0 && (
                          <div className="text-sm text-muted-foreground">Borc hərəkəti tapılmadı.</div>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function initials(value: string) {
  return value
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

function getSuggestedPaymentMethod(
  accounts: Account[],
  supplier?: Supplier,
  fallback: PaymentForm["payment_method"] = "bank",
): PaymentForm["payment_method"] {
  const activeAccounts = accounts.filter((account) => account.status === "active")
  const activeBank = activeAccounts.find((account) => account.type === "bank")
  const activeCash = activeAccounts.find((account) => account.type === "cash")

  if (!supplier) {
    return activeBank?.type ?? activeCash?.type ?? fallback
  }

  if (activeBank && Number(activeBank.balance) >= Number(supplier.total_debt)) {
    return "bank"
  }

  if (activeCash && Number(activeCash.balance) >= Number(supplier.total_debt)) {
    return "cash"
  }

  if (activeBank && Number(activeBank.balance) > 0) {
    return "bank"
  }

  if (activeCash && Number(activeCash.balance) > 0) {
    return "cash"
  }

  return activeBank?.type ?? activeCash?.type ?? fallback
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function StatCard({ title, value, icon: Icon }: { title: string; value: string; icon: typeof Building2 }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function DetailTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 px-4 py-3">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  )
}
