"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Header } from "@/components/layout/header"
import { backendFetch, ensureBackendToken } from "@/lib/backend-api"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ArrowUpDown,
  ChevronRight,
  Edit,
  Eye,
  Grid3X3,
  List,
  Loader2,
  MoreHorizontal,
  Package,
  Plus,
  Search,
  Trash2,
} from "lucide-react"

type ProductItem = {
  id: number
  product_code: string
  name: string
  image: string | null
  cash_sale_price: number
  official_sale_price: number
  price_type: "automatic" | "manual"
  cost_price: number
  is_active: boolean
  minimum_stock: number
  category: {
    id: number
    name: string
  } | null
  brand: {
    id: number
    name: string
  } | null
  stock: {
    real_quantity: number
    official_quantity: number
    minimum_quantity: number
  } | null
}

type Category = {
  id: number
  name: string
}

type Brand = {
  id: number
  name: string
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("az-AZ", {
    minimumFractionDigits: 2,
  }).format(value)

export default function ProductsPage() {
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [products, setProducts] = useState<ProductItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [brandFilter, setBrandFilter] = useState<string>("all")
  const [view, setView] = useState<"grid" | "list">("list")
  const [sortField, setSortField] = useState<"name" | "product_code" | "cash_sale_price">("name")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  useEffect(() => {
    void bootstrap()
  }, [])

  const bootstrap = async () => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const activeToken = await ensureBackendToken("bestsol-products-web")
      setToken(activeToken)
      await loadData(activeToken)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Məhsullar yüklənmədi.")
    } finally {
      setIsLoading(false)
    }
  }

  const loadData = async (activeToken: string) => {
    const [productsResponse, categoriesResponse, brandsResponse] = await Promise.all([
      backendFetch("/products?per_page=300&sort=id&direction=desc", activeToken),
      backendFetch("/categories", activeToken),
      backendFetch("/brands", activeToken),
    ])

    const productsJson = await productsResponse.json()
    const categoriesJson = await categoriesResponse.json()
    const brandsJson = await brandsResponse.json()

    setProducts(productsJson.data ?? [])
    setCategories((categoriesJson.data ?? []).map((item: Category) => ({ id: item.id, name: item.name })))
    setBrands((brandsJson.data ?? []).map((item: Brand) => ({ id: item.id, name: item.name })))
  }

  const deleteProduct = async (productId: number) => {
    if (!token) return

    setErrorMessage(null)

    try {
      await backendFetch(`/products/${productId}`, token, { method: "DELETE" })
      setProducts((current) => current.filter((product) => product.id !== productId))
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Məhsul silinmədi.")
    }
  }

  const filteredProducts = useMemo(() => {
    const loweredQuery = searchQuery.toLowerCase()

    return [...products]
      .filter((product) => {
        const matchesSearch =
          product.name.toLowerCase().includes(loweredQuery) ||
          product.product_code.toLowerCase().includes(loweredQuery)
        const matchesCategory = categoryFilter === "all" || String(product.category?.id) === categoryFilter
        const matchesBrand = brandFilter === "all" || String(product.brand?.id) === brandFilter
        return matchesSearch && matchesCategory && matchesBrand
      })
      .sort((left, right) => {
        const factor = sortDirection === "asc" ? 1 : -1

        if (sortField === "cash_sale_price") {
          return (left.cash_sale_price - right.cash_sale_price) * factor
        }

        const leftValue = sortField === "name" ? left.name : left.product_code
        const rightValue = sortField === "name" ? right.name : right.product_code
        return leftValue.localeCompare(rightValue, "az") * factor
      })
  }, [brandFilter, categoryFilter, products, searchQuery, sortDirection, sortField])

  const stats = useMemo(() => ([
    { label: "Cəmi Məhsul", value: products.length, color: "text-foreground" },
    { label: "Aktiv", value: products.filter((product) => product.is_active).length, color: "text-success" },
    { label: "Passiv", value: products.filter((product) => !product.is_active).length, color: "text-muted-foreground" },
    {
      label: "Az Stok",
      value: products.filter((product) => Number(product.stock?.real_quantity ?? 0) <= Number(product.stock?.minimum_quantity ?? product.minimum_stock)).length,
      color: "text-warning",
    },
  ]), [products])

  const toggleSort = (field: "name" | "product_code" | "cash_sale_price") => {
    if (sortField === field) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"))
      return
    }

    setSortField(field)
    setSortDirection("asc")
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header title="Məhsullar" subtitle="Məhsul kataloqu və stok idarəsi" />
        <div className="flex flex-1 items-center justify-center">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Məhsullar yüklənir...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Məhsullar" subtitle="Məhsul kataloqu və stok idarəsi" />

      <div className="flex-1 p-6 space-y-6">
        {errorMessage && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </div>
        )}

        <div className="flex items-center gap-6 border-b border-border pb-4">
          {stats.map((stat, index) => (
            <div key={stat.label} className="flex items-center gap-4">
              {index > 0 && <div className="h-8 w-px bg-border" />}
              <div>
                <p className={`text-2xl font-semibold tabular-nums ${stat.color}`}>{stat.value}</p>
                <p className="text-[12px] text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Məhsul axtar..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="h-9 border-0 bg-secondary/50 pl-9 focus-visible:ring-1"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-9 w-[180px] border-0 bg-secondary/50">
                <SelectValue placeholder="Kateqoriya" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={String(category.id)}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={brandFilter} onValueChange={setBrandFilter}>
              <SelectTrigger className="h-9 w-[160px] border-0 bg-secondary/50">
                <SelectValue placeholder="Brend" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün</SelectItem>
                {brands.map((brand) => (
                  <SelectItem key={brand.id} value={String(brand.id)}>
                    {brand.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg bg-secondary/50 p-1">
              <Button variant={view === "list" ? "secondary" : "ghost"} size="icon" className="h-7 w-7" onClick={() => setView("list")}>
                <List className="h-4 w-4" />
              </Button>
              <Button variant={view === "grid" ? "secondary" : "ghost"} size="icon" className="h-7 w-7" onClick={() => setView("grid")}>
                <Grid3X3 className="h-4 w-4" />
              </Button>
            </div>
            <Link href="/products/new">
              <Button size="sm" className="h-9 gap-1.5">
                <Plus className="h-4 w-4" />
                Yeni Məhsul
              </Button>
            </Link>
          </div>
        </div>

        {view === "list" ? (
          <Card className="overflow-hidden border-border">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-3 text-left text-[12px] font-medium text-muted-foreground">
                      <button className="flex items-center gap-1 transition-colors hover:text-foreground" onClick={() => toggleSort("name")}>
                        Məhsul <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left text-[12px] font-medium text-muted-foreground">
                      <button className="flex items-center gap-1 transition-colors hover:text-foreground" onClick={() => toggleSort("product_code")}>
                        Kod <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left text-[12px] font-medium text-muted-foreground">Kateqoriya</th>
                    <th className="px-4 py-3 text-left text-[12px] font-medium text-muted-foreground">Brend</th>
                    <th className="px-4 py-3 text-right text-[12px] font-medium text-muted-foreground">
                      <button className="ml-auto flex items-center gap-1 transition-colors hover:text-foreground" onClick={() => toggleSort("cash_sale_price")}>
                        Nağd Qiymət <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-right text-[12px] font-medium text-muted-foreground">Rəsmi Qiymət</th>
                    <th className="px-4 py-3 text-center text-[12px] font-medium text-muted-foreground">Real Stok</th>
                    <th className="px-4 py-3 text-center text-[12px] font-medium text-muted-foreground">Status</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredProducts.map((product) => {
                    const realStock = Number(product.stock?.real_quantity ?? 0)
                    const minimumStock = Number(product.stock?.minimum_quantity ?? product.minimum_stock)

                    return (
                      <tr key={product.id} className="group transition-colors hover:bg-muted/20">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border border-border bg-gradient-to-br from-muted to-muted/50">
                              {product.image ? (
                                <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
                              ) : (
                                <Package className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                            <div>
                              <p className="text-[13px] font-medium transition-colors group-hover:text-primary">{product.name}</p>
                              <p className="text-[11px] text-muted-foreground">{product.price_type === "automatic" ? "Avto qiymət" : "Manual"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <code className="rounded bg-muted px-1.5 py-0.5 text-[12px] font-mono text-muted-foreground">{product.product_code}</code>
                        </td>
                        <td className="px-4 py-3 text-[13px] text-muted-foreground">{product.category?.name ?? "-"}</td>
                        <td className="px-4 py-3 text-[13px] text-muted-foreground">{product.brand?.name ?? "-"}</td>
                        <td className="px-4 py-3 text-right text-[13px] font-medium tabular-nums">{formatCurrency(product.cash_sale_price)} AZN</td>
                        <td className="px-4 py-3 text-right text-[13px] font-medium tabular-nums">{formatCurrency(product.official_sale_price)} AZN</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex min-w-[32px] items-center justify-center rounded-full px-2 h-6 text-[12px] font-medium tabular-nums ${
                            realStock <= minimumStock
                              ? "bg-destructive/10 text-destructive"
                              : realStock <= minimumStock * 1.5
                                ? "bg-warning/10 text-warning"
                                : "bg-success/10 text-success"
                          }`}>
                            {realStock}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-medium ${
                            product.is_active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                          }`}>
                            {product.is_active ? "Aktiv" : "Passiv"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem asChild className="text-[13px]">
                                <Link href={`/products/${product.id}`}>
                                  <Eye className="mr-2 h-4 w-4" /> Bax
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild className="text-[13px]">
                                <Link href={`/products/new?edit=${product.id}`}>
                                  <Edit className="mr-2 h-4 w-4" /> Redaktə
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-[13px] text-destructive" onClick={() => deleteProduct(product.id)}>
                                <Trash2 className="mr-2 h-4 w-4" /> Sil
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map((product) => {
              const realStock = Number(product.stock?.real_quantity ?? 0)
              const minimumStock = Number(product.stock?.minimum_quantity ?? product.minimum_stock)

              return (
                <Card key={product.id} className="group overflow-hidden border-border transition-all hover:border-primary/30">
                  <CardContent className="p-0">
                    <div className="relative aspect-square bg-gradient-to-br from-muted to-muted/30 flex items-center justify-center overflow-hidden">
                      {product.image ? (
                        <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
                      ) : (
                        <Package className="h-12 w-12 text-muted-foreground/50" />
                      )}
                      <span className={`absolute right-3 top-3 flex h-6 items-center rounded-full px-2 text-[11px] font-medium ${
                        product.is_active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                      }`}>
                        {product.is_active ? "Aktiv" : "Passiv"}
                      </span>
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="truncate text-[14px] font-medium transition-colors group-hover:text-primary">{product.name}</h3>
                          <p className="mt-0.5 text-[12px] text-muted-foreground">
                            {product.brand?.name ?? "-"} · {product.category?.name ?? "-"}
                          </p>
                        </div>
                        <code className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">{product.product_code}</code>
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                        <div>
                          <p className="text-[16px] font-semibold tabular-nums">{formatCurrency(product.cash_sale_price)} AZN</p>
                          <p className="text-[11px] text-muted-foreground">Nağd qiymət</p>
                        </div>
                        <div className={`rounded-lg px-2.5 py-1 text-center ${realStock <= minimumStock ? "bg-destructive/10" : "bg-success/10"}`}>
                          <p className={`text-[14px] font-semibold tabular-nums ${realStock <= minimumStock ? "text-destructive" : "text-success"}`}>{realStock}</p>
                          <p className="text-[10px] text-muted-foreground">stok</p>
                        </div>
                      </div>

                      <div className="mt-3 flex gap-2">
                        <Link href={`/products/${product.id}`} className="flex-1">
                          <Button variant="ghost" className="w-full justify-between text-[13px] group-hover:bg-primary/5 group-hover:text-primary">
                            Ətraflı bax
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link href={`/products/new?edit=${product.id}`}>
                          <Button variant="outline" size="icon" className="h-10 w-10">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {filteredProducts.length === 0 && (
          <div className="py-16 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-[15px] font-medium">Məhsul tapılmadı</p>
            <p className="mt-1 text-[13px] text-muted-foreground">Axtarış kriteriyalarınızı dəyişdirin</p>
          </div>
        )}
      </div>
    </div>
  )
}
