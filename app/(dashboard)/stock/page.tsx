"use client"

import { useEffect, useMemo, useState } from "react"
import { backendFetch, ensureBackendToken } from "@/lib/backend-api"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Filter,
  History,
  Loader2,
  Package,
  Search,
  TrendingDown,
  TrendingUp,
  Warehouse,
} from "lucide-react"

type StockItem = {
  id: number
  product_id: number
  product: {
    id: number
    product_code: string
    name: string
    image: string | null
    cash_sale_price: number
    category: { id: number; name: string } | null
    brand: { id: number; name: string } | null
  } | null
  official_quantity: number
  real_quantity: number
  minimum_quantity: number
}

type Category = {
  id: number
  name: string
}

type Movement = {
  id: number
  product: {
    id: number
    name: string
  } | null
  stock_type: "real" | "official"
  direction: "in" | "out"
  quantity: number
  type: "purchase" | "sale" | "adjustment"
  note: string | null
  created_at: string
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("az-AZ", {
    style: "currency",
    currency: "AZN",
    minimumFractionDigits: 2,
  }).format(value)

export default function StockPage() {
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAdjusting, setIsAdjusting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [stocks, setStocks] = useState<StockItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [movements, setMovements] = useState<Movement[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [adjustmentOpen, setAdjustmentOpen] = useState(false)
  const [adjustmentForm, setAdjustmentForm] = useState({
    product_id: "",
    stock_type: "real",
    quantity: "",
    note: "",
  })

  async function bootstrap() {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const activeToken = await ensureBackendToken("bestsol-stock-web")
      setToken(activeToken)
      await loadData(activeToken)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Stok məlumatları yüklənmədi.")
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

  async function loadData(activeToken: string) {
    const [stocksResponse, categoriesResponse, movementsResponse] = await Promise.all([
      backendFetch("/stocks?per_page=300", activeToken),
      backendFetch("/categories", activeToken),
      backendFetch("/stock-movements?per_page=200", activeToken),
    ])

    const stocksJson = await stocksResponse.json()
    const categoriesJson = await categoriesResponse.json()
    const movementsJson = await movementsResponse.json()

    setStocks(stocksJson.data ?? [])
    setCategories(categoriesJson.data ?? [])
    setMovements(movementsJson.data ?? [])
  }

  const filteredStocks = useMemo(() => {
    return stocks.filter((stock) => {
      const productName = stock.product?.name ?? ""
      const productCode = stock.product?.product_code ?? ""
      const matchesSearch =
        productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        productCode.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = categoryFilter === "all" || String(stock.product?.category?.id) === categoryFilter

      let matchesStatus = true
      if (statusFilter === "low") {
        matchesStatus = stock.real_quantity <= stock.minimum_quantity
      } else if (statusFilter === "critical") {
        matchesStatus = stock.real_quantity < stock.minimum_quantity * 0.5
      } else if (statusFilter === "normal") {
        matchesStatus = stock.real_quantity > stock.minimum_quantity
      }

      return matchesSearch && matchesCategory && matchesStatus
    })
  }, [categoryFilter, searchQuery, statusFilter, stocks])

  const totalRealStock = useMemo(
    () => stocks.reduce((sum, stock) => sum + stock.real_quantity, 0),
    [stocks],
  )
  const totalOfficialStock = useMemo(
    () => stocks.reduce((sum, stock) => sum + stock.official_quantity, 0),
    [stocks],
  )
  const realStockValue = useMemo(
    () => stocks.reduce((sum, stock) => sum + stock.real_quantity * Number(stock.product?.cash_sale_price ?? 0), 0),
    [stocks],
  )
  const lowStockCount = useMemo(
    () => stocks.filter((stock) => stock.real_quantity <= stock.minimum_quantity).length,
    [stocks],
  )

  const getStockStatus = (stock: StockItem) => {
    if (stock.real_quantity < stock.minimum_quantity * 0.5) {
      return { label: "Kritik", className: "border-destructive/50 bg-destructive/10 text-destructive" }
    }
    if (stock.real_quantity <= stock.minimum_quantity) {
      return { label: "Az qalıb", className: "border-warning/50 bg-warning/10 text-warning" }
    }
    return { label: "Normal", className: "border-success/50 bg-success/10 text-success" }
  }

  const openAdjustment = (stock?: StockItem, stockType: "real" | "official" = "real") => {
    setAdjustmentForm({
      product_id: stock ? String(stock.product_id) : "",
      stock_type: stockType,
      quantity: "",
      note: "",
    })
    setAdjustmentOpen(true)
  }

  const submitAdjustment = async () => {
    if (!token) return

    setIsAdjusting(true)
    setErrorMessage(null)
    setSaveMessage(null)

    try {
      await backendFetch("/stocks/adjustment", token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: Number(adjustmentForm.product_id),
          stock_type: adjustmentForm.stock_type,
          quantity: Number(adjustmentForm.quantity),
          note: adjustmentForm.note || null,
        }),
      })

      setAdjustmentOpen(false)
      setSaveMessage("Stok düzəlişi uğurla qeydə alındı.")
      await loadData(token)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Stok düzəlişi qeydə alınmadı.")
    } finally {
      setIsAdjusting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header title="Anbar / Stok" />
        <div className="flex flex-1 items-center justify-center">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Stok məlumatları yüklənir...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Anbar / Stok" />

      <div className="flex-1 space-y-6 p-6">
        {errorMessage && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </div>
        )}

        {saveMessage && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
            {saveMessage}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-4">
          <StatCard icon={<Package className="h-5 w-5 text-chart-1" />} label="Real Stok (ədəd)" value={String(totalRealStock)} className="bg-chart-1/10" />
          <StatCard icon={<Warehouse className="h-5 w-5 text-info" />} label="Rəsmi Stok (ədəd)" value={String(totalOfficialStock)} className="bg-info/10" />
          <StatCard icon={<TrendingUp className="h-5 w-5 text-success" />} label="Stok Dəyəri" value={formatCurrency(realStockValue)} className="bg-success/10" />
          <StatCard icon={<AlertTriangle className="h-5 w-5 text-warning" />} label="Az Stok Məhsulu" value={String(lowStockCount)} className="bg-warning/10" />
        </div>

        <Tabs defaultValue="stock" className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="stock"><Warehouse className="mr-2 h-4 w-4" /> Stok Siyahısı</TabsTrigger>
              <TabsTrigger value="movements"><History className="mr-2 h-4 w-4" /> Stok Hərəkətləri</TabsTrigger>
            </TabsList>
            <Button onClick={() => openAdjustment()}>
              Düzəliş əlavə et
            </Button>
          </div>

          <TabsContent value="stock">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle>Stok Siyahısı</CardTitle>
                <CardDescription>Bütün məhsulların real və rəsmi stok vəziyyəti</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6 flex flex-col gap-4 md:flex-row">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="Məhsul axtar..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="pl-9" />
                  </div>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-full md:w-[180px]">
                      <Filter className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="Kateqoriya" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Bütün Kateqoriyalar</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={String(category.id)}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full md:w-[160px]">
                      <SelectValue placeholder="Stok Statusu" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Bütün</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="low">Az qalıb</SelectItem>
                      <SelectItem value="critical">Kritik</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">Kod</TableHead>
                        <TableHead>Məhsul</TableHead>
                        <TableHead>Kateqoriya</TableHead>
                        <TableHead className="text-center">Real Stok</TableHead>
                        <TableHead className="text-center">Rəsmi Stok</TableHead>
                        <TableHead className="text-center">Fərq</TableHead>
                        <TableHead className="text-center">Min. Səviyyə</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-right">Əməliyyat</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStocks.map((stock) => {
                        const status = getStockStatus(stock)
                        const diff = stock.real_quantity - stock.official_quantity

                        return (
                          <TableRow key={stock.id}>
                            <TableCell className="font-mono">{stock.product?.product_code ?? "-"}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-muted">
                                  {stock.product?.image ? (
                                    <img src={stock.product.image} alt={stock.product.name} className="h-full w-full object-cover" />
                                  ) : (
                                    <Package className="h-5 w-5 text-muted-foreground" />
                                  )}
                                </div>
                                <div>
                                  <p className="font-medium">{stock.product?.name ?? "-"}</p>
                                  <p className="text-xs text-muted-foreground">{stock.product?.brand?.name ?? "-"}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{stock.product?.category?.name ?? "-"}</TableCell>
                            <TableCell className="text-center text-lg font-bold">{stock.real_quantity}</TableCell>
                            <TableCell className="text-center text-lg font-medium text-muted-foreground">{stock.official_quantity}</TableCell>
                            <TableCell className="text-center">
                              <Badge
                                variant="outline"
                                className={
                                  diff > 0
                                    ? "border-success/50 bg-success/10 text-success"
                                    : diff < 0
                                      ? "border-destructive/50 bg-destructive/10 text-destructive"
                                      : ""
                                }
                              >
                                {diff > 0 ? "+" : ""}{diff}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">{stock.minimum_quantity}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className={status.className}>{status.label}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button variant="outline" size="sm" onClick={() => openAdjustment(stock, "real")}>Real düzəliş</Button>
                                <Button variant="outline" size="sm" onClick={() => openAdjustment(stock, "official")}>Rəsmi düzəliş</Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="movements">
            <Card>
              <CardHeader>
                <CardTitle>Stok Hərəkətləri</CardTitle>
                <CardDescription>Son stok daxilolma və çıxışları</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tarix</TableHead>
                        <TableHead>Məhsul</TableHead>
                        <TableHead className="text-center">Növ</TableHead>
                        <TableHead className="text-center">Stok tipi</TableHead>
                        <TableHead className="text-center">Miqdar</TableHead>
                        <TableHead>Səbəb</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {movements.map((movement) => (
                        <TableRow key={movement.id}>
                          <TableCell>{new Date(movement.created_at).toLocaleString("az-AZ")}</TableCell>
                          <TableCell className="font-medium">{movement.product?.name ?? "-"}</TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className={
                                movement.direction === "in"
                                  ? "border-success/50 bg-success/10 text-success"
                                  : "border-destructive/50 bg-destructive/10 text-destructive"
                              }
                            >
                              {movement.direction === "in" ? <ArrowUpRight className="mr-1 h-3 w-3" /> : <ArrowDownRight className="mr-1 h-3 w-3" />}
                              {movement.direction === "in" ? "Daxil" : "Çıxış"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">{movement.stock_type === "real" ? "Real" : "Rəsmi"}</TableCell>
                          <TableCell className="text-center font-bold">
                            <span className={movement.direction === "in" ? "text-success" : "text-destructive"}>
                              {movement.direction === "in" ? "+" : "-"}{movement.quantity}
                            </span>
                          </TableCell>
                          <TableCell>{movement.note ?? movement.type}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card>
          <CardHeader>
            <CardTitle>Stok Hərəkət Qaydaları</CardTitle>
            <CardDescription>Satış və satınalma əməliyyatlarının stoka təsiri</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <h4 className="flex items-center gap-2 font-medium">
                  <TrendingUp className="h-4 w-4 text-success" />
                  Satınalma Təsiri
                </h4>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>Rəsmi stok sifariş miqdarı qədər artır.</p>
                  <p>Real stok faktiki daxil olan miqdar qədər artır.</p>
                  <p>Əlavə xərclər məhsullar arasında mütənasib bölünür.</p>
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="flex items-center gap-2 font-medium">
                  <TrendingDown className="h-4 w-4 text-destructive" />
                  Satış Təsiri
                </h4>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>Nağd satışda real stok azalır.</p>
                  <p>Rəsmi satışda rəsmi stok azalır.</p>
                  <p>Manual düzəlişlər `stok düzəlişi` kimi tarixçəyə düşür.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={adjustmentOpen} onOpenChange={setAdjustmentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Stok Düzəlişi</DialogTitle>
            <DialogDescription>Real və ya rəsmi stok üçün düzəliş əlavə edin</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Məhsul</Label>
              <Select value={adjustmentForm.product_id} onValueChange={(value) => setAdjustmentForm((current) => ({ ...current, product_id: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Məhsul seçin" />
                </SelectTrigger>
                <SelectContent>
                  {stocks.map((stock) => (
                    <SelectItem key={stock.product_id} value={String(stock.product_id)}>
                      {stock.product?.name ?? `Məhsul #${stock.product_id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Stok tipi</Label>
              <Select
                value={adjustmentForm.stock_type}
                onValueChange={(value: "real" | "official") => setAdjustmentForm((current) => ({ ...current, stock_type: value }))}
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

            <div className="space-y-2">
              <Label>Miqdar</Label>
              <Input
                type="number"
                step="0.001"
                value={adjustmentForm.quantity}
                onChange={(event) => setAdjustmentForm((current) => ({ ...current, quantity: event.target.value }))}
                placeholder="Müsbət və ya mənfi dəyər"
              />
            </div>

            <div className="space-y-2">
              <Label>Qeyd</Label>
              <Textarea
                value={adjustmentForm.note}
                onChange={(event) => setAdjustmentForm((current) => ({ ...current, note: event.target.value }))}
                placeholder="Düzəliş səbəbi"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustmentOpen(false)}>Ləğv et</Button>
            <Button onClick={submitAdjustment} disabled={isAdjusting}>
              {isAdjusting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Yadda saxla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  className,
}: {
  icon: React.ReactNode
  label: string
  value: string
  className: string
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className={`rounded-lg p-2 ${className}`}>{icon}</div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
