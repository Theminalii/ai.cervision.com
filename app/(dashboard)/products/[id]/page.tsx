"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { backendFetch, ensureBackendToken } from "@/lib/backend-api"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ArrowLeft,
  DollarSign,
  Edit,
  History,
  Loader2,
  Package,
  TrendingDown,
  TrendingUp,
  Warehouse,
} from "lucide-react"

type ProductResponse = {
  id: number
  product_code: string
  name: string
  description: string | null
  image: string | null
  cash_sale_price: number
  official_sale_price: number
  price_type: "automatic" | "manual"
  cost_price: number
  is_active: boolean
  minimum_stock: number
  category: { id: number; name: string } | null
  brand: { id: number; name: string } | null
  stock: {
    real_quantity: number
    official_quantity: number
    minimum_quantity: number
  } | null
}

type StockMovement = {
  id: number
  type: "purchase" | "sale" | "adjustment"
  stock_type: "real" | "official"
  quantity: number
  direction: "in" | "out"
  note: string | null
  created_at: string
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("az-AZ", {
    style: "currency",
    currency: "AZN",
    minimumFractionDigits: 2,
  }).format(value)

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>()
  const productId = params.id

  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [product, setProduct] = useState<ProductResponse | null>(null)
  const [movements, setMovements] = useState<StockMovement[]>([])

  useEffect(() => {
    void bootstrap()
  }, [productId])

  const bootstrap = async () => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const token = await ensureBackendToken("bestsol-product-detail-web")
      const [productResponse, movementsResponse] = await Promise.all([
        backendFetch(`/products/${productId}`, token),
        backendFetch(`/stock-movements?product_id=${productId}&per_page=100`, token),
      ])

      const productJson = await productResponse.json()
      const movementsJson = await movementsResponse.json()

      setProduct(productJson.data ?? productJson)
      setMovements(movementsJson.data ?? [])
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Məhsul detalları yüklənmədi.")
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header title="Məhsul Detalları" />
        <div className="flex flex-1 items-center justify-center">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Məhsul detalları yüklənir...
          </div>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header title="Məhsul Tapılmadı" />
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="text-center">
            <Package className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">Məhsul tapılmadı</p>
            <p className="mt-2 text-sm text-muted-foreground">{errorMessage}</p>
            <Link href="/products">
              <Button className="mt-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Geri qayıt
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const realStock = Number(product.stock?.real_quantity ?? 0)
  const officialStock = Number(product.stock?.official_quantity ?? 0)
  const minimumStock = Number(product.stock?.minimum_quantity ?? product.minimum_stock)

  return (
    <div className="flex min-h-screen flex-col">
      <Header title="Məhsul Detalları" />

      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-between">
          <Link href="/products">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Geri
            </Button>
          </Link>
          <Link href={`/products/new?edit=${product.id}`}>
            <Button>
              <Edit className="mr-2 h-4 w-4" />
              Redaktə et
            </Button>
          </Link>
        </div>

        {errorMessage && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </div>
        )}

        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col gap-6 md:flex-row">
              <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-xl bg-muted shrink-0">
                {product.image ? (
                  <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
                ) : (
                  <Package className="h-16 w-16 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="mb-2 flex items-center gap-3">
                      <Badge variant="outline" className="font-mono">{product.product_code}</Badge>
                      <Badge variant={product.is_active ? "default" : "secondary"}>
                        {product.is_active ? "Aktiv" : "Passiv"}
                      </Badge>
                      <Badge variant="outline">
                        {product.price_type === "automatic" ? "Avto Qiymət" : "Manual Qiymət"}
                      </Badge>
                    </div>
                    <h2 className="text-2xl font-bold">{product.name}</h2>
                    <p className="text-muted-foreground">
                      {product.category?.name ?? "-"} • {product.brand?.name ?? "-"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t pt-4 md:grid-cols-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Nağd Satış Qiyməti</p>
                    <p className="text-xl font-bold text-chart-1">{formatCurrency(product.cash_sale_price)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Rəsmi Satış Qiyməti</p>
                    <p className="text-xl font-bold text-chart-2">{formatCurrency(product.official_sale_price)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Real Stok</p>
                    <p className="text-xl font-bold">{realStock} ədəd</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Rəsmi Stok</p>
                    <p className="text-xl font-bold">{officialStock} ədəd</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="stock" className="space-y-4">
          <TabsList>
            <TabsTrigger value="stock"><Warehouse className="mr-2 h-4 w-4" /> Stok Məlumatları</TabsTrigger>
            <TabsTrigger value="pricing"><DollarSign className="mr-2 h-4 w-4" /> Qiymət Məlumatları</TabsTrigger>
            <TabsTrigger value="movements"><History className="mr-2 h-4 w-4" /> Hərəkətlər</TabsTrigger>
          </TabsList>

          <TabsContent value="stock" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Real Stok Vəziyyəti</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className={`rounded-lg p-2 ${realStock <= minimumStock ? "bg-destructive/10" : "bg-success/10"}`}>
                      <Package className={`h-5 w-5 ${realStock <= minimumStock ? "text-destructive" : "text-success"}`} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{realStock}</p>
                      <p className="text-sm text-muted-foreground">Min: {minimumStock}</p>
                    </div>
                  </div>
                  {realStock <= minimumStock && (
                    <Badge variant="outline" className="mt-3 border-destructive/50 bg-destructive/10 text-destructive">
                      Kritik Səviyyə
                    </Badge>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Rəsmi Stok Vəziyyəti</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="rounded-lg bg-info/10 p-2">
                      <Package className="h-5 w-5 text-info" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{officialStock}</p>
                      <p className="text-sm text-muted-foreground">Rəsmi qeyd</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Stok Dəyəri</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="rounded-lg bg-chart-3/10 p-2">
                      <DollarSign className="h-5 w-5 text-chart-3" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{formatCurrency(realStock * product.cost_price)}</p>
                      <p className="text-sm text-muted-foreground">Maya üzrə dəyər</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="pricing">
            <Card>
              <CardHeader>
                <CardTitle>Qiymət Məlumatları</CardTitle>
                <CardDescription>Bu məhsulun qiymət və maya strukturu</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-lg bg-muted p-4">
                    <p className="mb-1 text-sm text-muted-foreground">Maya Dəyəri</p>
                    <p className="text-2xl font-bold">{formatCurrency(product.cost_price)}</p>
                  </div>
                  <div className="rounded-lg bg-muted p-4">
                    <p className="mb-1 text-sm text-muted-foreground">Nağd Satış Qiyməti</p>
                    <p className="text-2xl font-bold text-chart-1">{formatCurrency(product.cash_sale_price)}</p>
                  </div>
                  <div className="rounded-lg bg-muted p-4">
                    <p className="mb-1 text-sm text-muted-foreground">Rəsmi Satış Qiyməti</p>
                    <p className="text-2xl font-bold text-chart-2">{formatCurrency(product.official_sale_price)}</p>
                  </div>
                </div>
                {product.price_type === "manual" && (
                  <div className="rounded-lg border border-warning/50 bg-warning/10 p-4">
                    <p className="text-sm text-warning-foreground">
                      Bu məhsulun qiyməti manual olaraq təyin edilib. Sistem avtomatik qiyməti əvəz etmir.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {product.description && (
              <Card>
                <CardHeader>
                  <CardTitle>Təsvir</CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  {product.description}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="movements">
            <Card>
              <CardHeader>
                <CardTitle>Stok Hərəkətləri</CardTitle>
                <CardDescription>Son stok daxilolma və çıxışları</CardDescription>
              </CardHeader>
              <CardContent>
                {movements.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tarix</TableHead>
                        <TableHead>Növ</TableHead>
                        <TableHead>Stok tipi</TableHead>
                        <TableHead>Miqdar</TableHead>
                        <TableHead>Qeyd</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {movements.map((movement) => (
                        <TableRow key={movement.id}>
                          <TableCell>{new Date(movement.created_at).toLocaleString("az-AZ")}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                movement.direction === "in"
                                  ? "border-success/50 bg-success/10 text-success"
                                  : "border-destructive/50 bg-destructive/10 text-destructive"
                              }
                            >
                              {movement.direction === "in" ? <TrendingUp className="mr-1 h-3 w-3" /> : <TrendingDown className="mr-1 h-3 w-3" />}
                              {movement.direction === "in" ? "Daxil" : "Çıxış"}
                            </Badge>
                          </TableCell>
                          <TableCell>{movement.stock_type === "real" ? "Real" : "Rəsmi"}</TableCell>
                          <TableCell className="font-medium">
                            {movement.direction === "in" ? "+" : "-"}
                            {movement.quantity}
                          </TableCell>
                          <TableCell>{movement.note ?? movement.type}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="py-8 text-center">
                    <History className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                    <p className="text-muted-foreground">Hərəkət tapılmadı</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
