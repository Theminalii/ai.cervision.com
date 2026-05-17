"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useSearchParams } from "next/navigation"
import { Header } from "@/components/layout/header"
import { TOKEN_KEY, backendFetch, ensureBackendToken } from "@/lib/backend-api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Loader2, Printer, ReceiptText } from "lucide-react"

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

const today = new Date().toISOString().slice(0, 10)

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("az-AZ", {
    style: "currency",
    currency: "AZN",
    minimumFractionDigits: 2,
  }).format(value)

export default function SaleDetailsPage() {
  const params = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const saleId = params.id
  const printMode = searchParams.get("print") === "1"

  const [token, setToken] = useState<string | null>(null)
  const [sale, setSale] = useState<ApiSale | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isPaying, setIsPaying] = useState(false)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    payment_method: "cash",
    note: "",
    transaction_date: today,
  })

  useEffect(() => {
    if (sale && printMode) {
      const timer = window.setTimeout(() => window.print(), 300)
      return () => window.clearTimeout(timer)
    }
  }, [printMode, sale])

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

  async function bootstrap(existingToken: string | null) {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const activeToken = existingToken ?? (await ensureBackendToken("bestsol-sales-detail-web"))

      setToken(activeToken)
      const response = await apiFetch(`/sales/${saleId}`, undefined, activeToken)
      const json = await response.json()
      setSale(json.data ?? json)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Satış detalları yüklənmədi.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const storedToken = window.localStorage.getItem(TOKEN_KEY)
    const timer = window.setTimeout(() => {
      void bootstrap(storedToken)
    }, 0)

    return () => window.clearTimeout(timer)
  }, [saleId])

  const openPaymentDialog = () => {
    if (!sale || sale.debt_amount <= 0) {
      return
    }

    setPaymentForm({
      amount: String(sale.debt_amount),
      payment_method: sale.payment_method,
      note: "",
      transaction_date: today,
    })
    setPaymentDialogOpen(true)
  }

  const submitPayment = async () => {
    if (!sale) {
      return
    }

    setIsPaying(true)
    setErrorMessage(null)

    try {
      const response = await apiFetch(`/sales/${sale.id}/payment`, {
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
      setSale(json.data ?? json)
      setPaymentDialogOpen(false)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Ödəniş qeydə alınmadı.")
    } finally {
      setIsPaying(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header title="Satış detalları" subtitle="Satış məlumatları yüklənir" />
        <div className="flex flex-1 items-center justify-center">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Satış detalları yüklənir...
          </div>
        </div>
      </div>
    )
  }

  if (!sale) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header title="Satış detalları" subtitle="Məlumat tapılmadı" />
        <div className="p-6">
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {errorMessage ?? "Satış tapılmadı."}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header title={`Satış ${sale.sale_number}`} subtitle="Satışın tam detal görünüşü" />

      <div className="flex-1 space-y-6 p-6 print:p-4">
        {!printMode && (
          <div className="flex items-center justify-between">
            <Link href="/sales">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Geri
              </Button>
            </Link>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="mr-2 h-4 w-4" />
                Çap et
              </Button>
              {sale.debt_amount > 0 && (
                <Button onClick={openPaymentDialog}>Borcdan ödə</Button>
              )}
            </div>
          </div>
        )}

        {errorMessage && !printMode && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ReceiptText className="h-5 w-5" />
                  Satış məlumatları
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <Detail label="Satış nömrəsi" value={sale.sale_number} />
                <Detail label="Tarix" value={sale.sale_date} />
                <Detail label="Müştəri" value={sale.customer?.name ?? "Seçilməyib"} />
                <Detail label="Telefon" value={sale.customer?.phone ?? "-"} />
                <Detail label="Nümayəndə" value={sale.sales_representative?.name ?? "-"} />
                <Detail label="Ödəniş metodu" value={sale.payment_method === "cash" ? "Nağd kassa" : "Bank hesabı"} />
                <Detail label="Satış növü" value={sale.sale_type === "cash" ? "Nağd" : "Rəsmi"} />
                <Detail label="Stok çıxışı" value={sale.stock_output ? "Aktiv" : "Yoxdur"} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Məhsullar</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Məhsul</TableHead>
                        <TableHead className="text-center">Miqdar</TableHead>
                        <TableHead className="text-right">Qiymət</TableHead>
                        <TableHead className="text-right">Cəmi</TableHead>
                        <TableHead className="text-right">Stok növü</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sale.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.product_name}</TableCell>
                          <TableCell className="text-center">{item.quantity}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(item.total_price)}</TableCell>
                          <TableCell className="text-right">
                            {item.stock_type === "real" ? "Real" : item.stock_type === "official" ? "Rəsmi" : "Çıxılmayıb"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {sale.note && (
              <Card>
                <CardHeader>
                  <CardTitle>Qeyd</CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  {sale.note}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Ödəniş xülasəsi</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <SummaryRow label="Ara cəm" value={formatCurrency(sale.subtotal)} />
                <SummaryRow label="ƏDV" value={formatCurrency(sale.vat_amount)} />
                <SummaryRow label="Cəmi" value={formatCurrency(sale.total_amount)} strong />
                <SummaryRow label="Ödənilib" value={formatCurrency(sale.paid_amount)} />
                <SummaryRow label="Qalıq borc" value={formatCurrency(sale.debt_amount)} className={sale.debt_amount > 0 ? "text-destructive" : "text-emerald-600"} />
                <div className="pt-2">
                  <Badge
                    variant="outline"
                    className={
                      sale.payment_status === "paid"
                        ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        : sale.payment_status === "partial"
                          ? "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                          : "border-destructive/50 bg-destructive/10 text-destructive"
                    }
                  >
                    {sale.payment_status === "paid" ? "Tam ödənilib" : sale.payment_status === "partial" ? "Qismən ödənilib" : "Borc var"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {sale.customer && (
              <Card>
                <CardHeader>
                  <CardTitle>Müştəri borcu</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cari ümumi borc</span>
                    <span className={sale.customer.total_debt > 0 ? "text-destructive font-medium" : "text-emerald-600 font-medium"}>
                      {formatCurrency(sale.customer.total_debt)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Satış üzrə ödəniş al</DialogTitle>
            <DialogDescription>
              {sale.sale_number} üzrə qalıq borcdan ödəniş qəbul edin.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="detail-payment-amount">Məbləğ</Label>
              <Input
                id="detail-payment-amount"
                type="number"
                min="0.01"
                step="0.01"
                max={sale.debt_amount}
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
              <Label htmlFor="detail-payment-date">Tarix</Label>
              <Input
                id="detail-payment-date"
                type="date"
                value={paymentForm.transaction_date}
                onChange={(event) => setPaymentForm((current) => ({ ...current, transaction_date: event.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="detail-payment-note">Qeyd</Label>
              <Textarea
                id="detail-payment-note"
                value={paymentForm.note}
                onChange={(event) => setPaymentForm((current) => ({ ...current, note: event.target.value }))}
                placeholder="Ödəniş haqqında qeyd"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>Ləğv et</Button>
            <Button onClick={submitPayment} disabled={isPaying}>
              {isPaying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Ödənişi qeydə al
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  )
}

function SummaryRow({
  label,
  value,
  strong = false,
  className = "",
}: {
  label: string
  value: string
  strong?: boolean
  className?: string
}) {
  return (
    <div className={`flex justify-between text-sm ${className}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? "font-semibold" : "font-medium"}>{value}</span>
    </div>
  )
}
