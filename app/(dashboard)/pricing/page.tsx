"use client"

import { useEffect, useMemo, useState } from "react"
import { backendFetch, ensureBackendToken } from "@/lib/backend-api"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  AlertTriangle,
  Building2,
  Calculator,
  Layers,
  Loader2,
  Percent,
  Save,
  Tag,
} from "lucide-react"

type Category = {
  id: number
  name: string
}

type Brand = {
  id: number
  name: string
}

type Supplier = {
  id: number
  name: string
}

type Coefficient = {
  id: number
  category_id: number | null
  brand_id: number | null
  supplier_id: number | null
  category_coefficient: number
  supplier_coefficient: number
  brand_coefficient: number
  company_coefficient: number
  vat_percent: number
  active_from: string
  status: "active" | "passive"
}

const today = new Date().toISOString().slice(0, 10)

export default function PricingPage() {
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [coefficients, setCoefficients] = useState<Coefficient[]>([])
  const [categoryInputs, setCategoryInputs] = useState<Record<number, string>>({})
  const [brandInputs, setBrandInputs] = useState<Record<number, string>>({})
  const [supplierInputs, setSupplierInputs] = useState<Record<number, string>>({})
  const [generalInputs, setGeneralInputs] = useState({
    company_coefficient: "1",
    vat_percent: "18",
  })

  useEffect(() => {
    void bootstrap()
  }, [])

  const bootstrap = async () => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const activeToken = await ensureBackendToken("bestsol-pricing-web")
      setToken(activeToken)
      await loadData(activeToken)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Qiymət əmsalları yüklənmədi.")
    } finally {
      setIsLoading(false)
    }
  }

  const loadData = async (activeToken: string) => {
    const [categoriesResponse, brandsResponse, suppliersResponse, coefficientsResponse] = await Promise.all([
      backendFetch("/categories", activeToken),
      backendFetch("/brands", activeToken),
      backendFetch("/suppliers?per_page=200", activeToken),
      backendFetch("/price-coefficients?per_page=500", activeToken),
    ])

    const categoriesJson = await categoriesResponse.json()
    const brandsJson = await brandsResponse.json()
    const suppliersJson = await suppliersResponse.json()
    const coefficientsJson = await coefficientsResponse.json()

    const nextCategories = categoriesJson.data ?? []
    const nextBrands = brandsJson.data ?? []
    const nextSuppliers = suppliersJson.data ?? []
    const nextCoefficients = coefficientsJson.data ?? []

    setCategories(nextCategories)
    setBrands(nextBrands)
    setSuppliers(nextSuppliers)
    setCoefficients(nextCoefficients)

    const nextCategoryInputs: Record<number, string> = {}
    const nextBrandInputs: Record<number, string> = {}
    const nextSupplierInputs: Record<number, string> = {}

    nextCategories.forEach((category: Category) => {
      const coefficient = findLatestCoefficient(nextCoefficients, { category_id: category.id, brand_id: null, supplier_id: null })
      nextCategoryInputs[category.id] = String(coefficient?.category_coefficient ?? 1)
    })

    nextBrands.forEach((brand: Brand) => {
      const coefficient = findLatestCoefficient(nextCoefficients, { category_id: null, brand_id: brand.id, supplier_id: null })
      nextBrandInputs[brand.id] = String(coefficient?.brand_coefficient ?? 1)
    })

    nextSuppliers.forEach((supplier: Supplier) => {
      const coefficient = findLatestCoefficient(nextCoefficients, { category_id: null, brand_id: null, supplier_id: supplier.id })
      nextSupplierInputs[supplier.id] = String(coefficient?.supplier_coefficient ?? 1)
    })

    const generalCoefficient = findLatestCoefficient(nextCoefficients, { category_id: null, brand_id: null, supplier_id: null })
    setCategoryInputs(nextCategoryInputs)
    setBrandInputs(nextBrandInputs)
    setSupplierInputs(nextSupplierInputs)
    setGeneralInputs({
      company_coefficient: String(generalCoefficient?.company_coefficient ?? 1),
      vat_percent: String(generalCoefficient?.vat_percent ?? 18),
    })
  }

  const generalCoefficient = useMemo(
    () => findLatestCoefficient(coefficients, { category_id: null, brand_id: null, supplier_id: null }),
    [coefficients],
  )

  const saveCoefficient = async ({
    existing,
    payload,
    loadingKey,
  }: {
    existing: Coefficient | undefined
    payload: Partial<Coefficient> & {
      category_coefficient: number
      supplier_coefficient: number
      brand_coefficient: number
      company_coefficient: number
      vat_percent: number
    }
    loadingKey: string
  }) => {
    if (!token) return

    setIsSaving(loadingKey)
    setErrorMessage(null)
    setSaveMessage(null)

    try {
      await backendFetch(
        existing ? `/price-coefficients/${existing.id}` : "/price-coefficients",
        token,
        {
          method: existing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category_id: payload.category_id ?? null,
            brand_id: payload.brand_id ?? null,
            supplier_id: payload.supplier_id ?? null,
            category_coefficient: payload.category_coefficient,
            supplier_coefficient: payload.supplier_coefficient,
            brand_coefficient: payload.brand_coefficient,
            company_coefficient: payload.company_coefficient,
            vat_percent: payload.vat_percent,
            active_from: existing?.active_from ?? today,
            status: "active",
          }),
        },
      )

      setSaveMessage("Əmsal uğurla yadda saxlanıldı.")
      await loadData(token)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Əmsal yadda saxlanmadı.")
    } finally {
      setIsSaving(null)
    }
  }

  const saveCategory = async (categoryId: number) => {
    const existing = findLatestCoefficient(coefficients, { category_id: categoryId, brand_id: null, supplier_id: null })
    await saveCoefficient({
      existing,
      loadingKey: `category-${categoryId}`,
      payload: {
        category_id: categoryId,
        brand_id: null,
        supplier_id: null,
        category_coefficient: Number(categoryInputs[categoryId] ?? 1),
        supplier_coefficient: existing?.supplier_coefficient ?? 1,
        brand_coefficient: existing?.brand_coefficient ?? 1,
        company_coefficient: existing?.company_coefficient ?? generalCoefficient?.company_coefficient ?? 1,
        vat_percent: existing?.vat_percent ?? generalCoefficient?.vat_percent ?? 18,
      },
    })
  }

  const saveBrand = async (brandId: number) => {
    const existing = findLatestCoefficient(coefficients, { category_id: null, brand_id: brandId, supplier_id: null })
    await saveCoefficient({
      existing,
      loadingKey: `brand-${brandId}`,
      payload: {
        category_id: null,
        brand_id: brandId,
        supplier_id: null,
        category_coefficient: existing?.category_coefficient ?? 1,
        supplier_coefficient: existing?.supplier_coefficient ?? 1,
        brand_coefficient: Number(brandInputs[brandId] ?? 1),
        company_coefficient: existing?.company_coefficient ?? generalCoefficient?.company_coefficient ?? 1,
        vat_percent: existing?.vat_percent ?? generalCoefficient?.vat_percent ?? 18,
      },
    })
  }

  const saveSupplier = async (supplierId: number) => {
    const existing = findLatestCoefficient(coefficients, { category_id: null, brand_id: null, supplier_id: supplierId })
    await saveCoefficient({
      existing,
      loadingKey: `supplier-${supplierId}`,
      payload: {
        category_id: null,
        brand_id: null,
        supplier_id: supplierId,
        category_coefficient: existing?.category_coefficient ?? 1,
        supplier_coefficient: Number(supplierInputs[supplierId] ?? 1),
        brand_coefficient: existing?.brand_coefficient ?? 1,
        company_coefficient: existing?.company_coefficient ?? generalCoefficient?.company_coefficient ?? 1,
        vat_percent: existing?.vat_percent ?? generalCoefficient?.vat_percent ?? 18,
      },
    })
  }

  const saveGeneral = async () => {
    await saveCoefficient({
      existing: generalCoefficient,
      loadingKey: "general",
      payload: {
        category_id: null,
        brand_id: null,
        supplier_id: null,
        category_coefficient: generalCoefficient?.category_coefficient ?? 1,
        supplier_coefficient: generalCoefficient?.supplier_coefficient ?? 1,
        brand_coefficient: generalCoefficient?.brand_coefficient ?? 1,
        company_coefficient: Number(generalInputs.company_coefficient),
        vat_percent: Number(generalInputs.vat_percent),
      },
    })
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header title="Qiymət Əmsalları" />
        <div className="flex flex-1 items-center justify-center">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Qiymət əmsalları yüklənir...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Qiymət Əmsalları" />

      <div className="flex-1 p-6 space-y-6">
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

        <div className="grid gap-4 lg:grid-cols-3">
          <FormulaCard
            className="border-chart-1/20 bg-gradient-to-br from-chart-1/10 to-chart-1/5"
            iconClassName="text-chart-1"
            title="Maya Dəyəri"
            badges={["Alış Qiyməti", "Kateqoriya Əmsalı", "Satınalınan Şirkət Əmsalı"]}
          />
          <FormulaCard
            className="border-chart-2/20 bg-gradient-to-br from-chart-2/10 to-chart-2/5"
            iconClassName="text-chart-2"
            title="Satınalma Dəyəri"
            badges={["Maya Dəyəri", "Kateqoriya Əmsalı", "Brend Əmsalı", "Şirkət Əmsalı"]}
          />
          <FormulaCard
            className="border-chart-3/20 bg-gradient-to-br from-chart-3/10 to-chart-3/5"
            iconClassName="text-chart-3"
            title="Nağd Satış Qiyməti"
            badges={["Satınalma Dəyəri", "(1 + ƏDV Faizi)"]}
          />
        </div>

        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="flex items-start gap-4 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
            <div>
              <p className="font-medium text-warning-foreground">Vacib Qeyd</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Qiymət manual dəyişdirilərsə, sistem avtomatik qiyməti əvəz etmir. Manual qiymətləndirmə seçilmiş məhsullar üçün bu əmsallar tətbiq olunmur.
              </p>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="category" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 lg:inline-flex lg:w-auto">
            <TabsTrigger value="category"><Layers className="mr-2 h-4 w-4" /> Kateqoriya</TabsTrigger>
            <TabsTrigger value="supplier"><Building2 className="mr-2 h-4 w-4" /> Təchizatçı</TabsTrigger>
            <TabsTrigger value="brand"><Tag className="mr-2 h-4 w-4" /> Brend</TabsTrigger>
            <TabsTrigger value="general"><Percent className="mr-2 h-4 w-4" /> Ümumi</TabsTrigger>
          </TabsList>

          <TabsContent value="category">
            <CoefficientTable
              title="Kateqoriya Əmsalları"
              description="Hər kateqoriya üçün qiymət əmsalını təyin edin"
              rows={categories.map((category) => ({
                id: category.id,
                label: category.name,
                currentValue: Number(categoryInputs[category.id] ?? 1),
                inputValue: categoryInputs[category.id] ?? "1",
                onInputChange: (value) => setCategoryInputs((current) => ({ ...current, [category.id]: value })),
                onSave: () => void saveCategory(category.id),
                isSaving: isSaving === `category-${category.id}`,
              }))}
              labelHeading="Kateqoriya"
            />
          </TabsContent>

          <TabsContent value="supplier">
            <CoefficientTable
              title="Təchizatçı Əmsalları"
              description="Satınalınan şirkətlər üçün qiymət əmsalını təyin edin"
              rows={suppliers.map((supplier) => ({
                id: supplier.id,
                label: supplier.name,
                currentValue: Number(supplierInputs[supplier.id] ?? 1),
                inputValue: supplierInputs[supplier.id] ?? "1",
                onInputChange: (value) => setSupplierInputs((current) => ({ ...current, [supplier.id]: value })),
                onSave: () => void saveSupplier(supplier.id),
                isSaving: isSaving === `supplier-${supplier.id}`,
              }))}
              labelHeading="Təchizatçı"
            />
          </TabsContent>

          <TabsContent value="brand">
            <CoefficientTable
              title="Brend Əmsalları"
              description="Hər brend üçün qiymət əmsalını təyin edin"
              rows={brands.map((brand) => ({
                id: brand.id,
                label: brand.name,
                currentValue: Number(brandInputs[brand.id] ?? 1),
                inputValue: brandInputs[brand.id] ?? "1",
                onInputChange: (value) => setBrandInputs((current) => ({ ...current, [brand.id]: value })),
                onSave: () => void saveBrand(brand.id),
                isSaving: isSaving === `brand-${brand.id}`,
              }))}
              labelHeading="Brend"
            />
          </TabsContent>

          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>Ümumi Əmsallar</CardTitle>
                <CardDescription>Şirkət əmsalı və ƏDV faizini təyin edin</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="companyCoeff">Şirkət Əmsalı</Label>
                    <div className="flex gap-2">
                      <Input
                        id="companyCoeff"
                        type="number"
                        step="0.01"
                        value={generalInputs.company_coefficient}
                        onChange={(event) => setGeneralInputs((current) => ({ ...current, company_coefficient: event.target.value }))}
                        className="flex-1"
                      />
                      <Button variant="outline" onClick={() => void saveGeneral()} disabled={isSaving === "general"}>
                        {isSaving === "general" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Yadda saxla
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Bütün məhsullara tətbiq olunan ümumi şirkət marjası</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vat">ƏDV Faizi (%)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="vat"
                        type="number"
                        step="0.01"
                        value={generalInputs.vat_percent}
                        onChange={(event) => setGeneralInputs((current) => ({ ...current, vat_percent: event.target.value }))}
                        className="flex-1"
                      />
                      <Button variant="outline" onClick={() => void saveGeneral()} disabled={isSaving === "general"}>
                        {isSaving === "general" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Yadda saxla
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Rəsmi satışlara əlavə olunan ƏDV faizi</p>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cari şirkət əmsalı</span>
                    <span className="font-medium">{generalCoefficient?.company_coefficient ?? 1}</span>
                  </div>
                  <div className="mt-2 flex justify-between">
                    <span className="text-muted-foreground">Cari ƏDV faizi</span>
                    <span className="font-medium">{generalCoefficient?.vat_percent ?? 18}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

function findLatestCoefficient(
  coefficients: Coefficient[],
  selector: { category_id: number | null; brand_id: number | null; supplier_id: number | null },
) {
  return coefficients.find((coefficient) =>
    coefficient.category_id === selector.category_id &&
    coefficient.brand_id === selector.brand_id &&
    coefficient.supplier_id === selector.supplier_id &&
    coefficient.status === "active",
  )
}

function FormulaCard({
  className,
  iconClassName,
  title,
  badges,
}: {
  className: string
  iconClassName: string
  title: string
  badges: string[]
}) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calculator className={`h-5 w-5 ${iconClassName}`} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {badges.map((badge, index) => (
            <div key={badge} className="flex items-center gap-2">
              {index > 0 && <span>×</span>}
              <Badge variant="outline">{badge}</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function CoefficientTable({
  title,
  description,
  labelHeading,
  rows,
}: {
  title: string
  description: string
  labelHeading: string
  rows: Array<{
    id: number
    label: string
    currentValue: number
    inputValue: string
    onInputChange: (value: string) => void
    onSave: () => void
    isSaving: boolean
  }>
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{labelHeading}</TableHead>
              <TableHead>Cari Əmsal</TableHead>
              <TableHead>Yeni Əmsal</TableHead>
              <TableHead className="text-right">Əməliyyat</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.label}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{row.currentValue}</Badge>
                </TableCell>
                <TableCell>
                  <Input type="number" step="0.01" value={row.inputValue} onChange={(event) => row.onInputChange(event.target.value)} className="w-24" />
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" onClick={row.onSave} disabled={row.isSaving}>
                    {row.isSaving ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Save className="mr-2 h-3 w-3" />}
                    Yadda saxla
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
