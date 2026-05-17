import * as XLSX from "xlsx"
import { importTargetConfigs } from "@/lib/excel-import/config"
import type {
  AiAnalysisSummary,
  ColumnMapping,
  ImportPreviewPayload,
  ImportTarget,
  PreviewRow,
  PreviewStatus,
} from "@/lib/excel-import/types"

type BackendProduct = {
  id: number
  product_code: string
  name: string
}

type BackendCategory = { id: number; name: string }
type BackendBrand = { id: number; name: string }
type BackendCustomer = { id: number; name: string; phone: string }
type BackendSupplier = { id: number; name: string; phone: string }
type BackendSale = { id: number; sale_date: string; total_amount: number; customer: { name: string } | null }
type BackendPurchase = { id: number; purchase_date: string; total_amount: number; supplier: { name: string } | null }
type BackendMe = { id: number; name: string; email: string }

type PreviewContext = {
  products: BackendProduct[]
  categories: BackendCategory[]
  brands: BackendBrand[]
  customers: BackendCustomer[]
  suppliers: BackendSupplier[]
  sales: BackendSale[]
  purchases: BackendPurchase[]
  me: BackendMe | null
}

type RawSheetRow = Record<string, string>

type BuildPreviewInput = {
  fileName: string
  buffer: ArrayBuffer
  target: ImportTarget
  backendToken: string
}

type AiHeaderMap = Record<string, string | null>

const OPENAI_MODEL = process.env.OPENAI_IMPORT_MODEL ?? "gpt-5.2"

export async function buildImportPreview(input: BuildPreviewInput): Promise<ImportPreviewPayload> {
  const workbook = XLSX.read(Buffer.from(input.buffer), { type: "buffer" })
  const firstSheetName = workbook.SheetNames[0]
  if (!firstSheetName) {
    throw new Error("Excel faylında oxuna bilən sheet tapılmadı.")
  }

  const worksheet = workbook.Sheets[firstSheetName]
  const rows = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(worksheet, {
    header: 1,
    blankrows: false,
    defval: "",
    raw: false,
    dateNF: "yyyy-mm-dd",
  })

  const headerRowIndex = rows.findIndex((row) => row.some((cell) => String(cell ?? "").trim() !== ""))
  if (headerRowIndex < 0) {
    throw new Error("Excel faylında başlıq sətri tapılmadı.")
  }

  const headers = rows[headerRowIndex].map((cell) => String(cell ?? "").trim())
  const dataRows = rows
    .slice(headerRowIndex + 1)
    .filter((row) => row.some((cell) => String(cell ?? "").trim() !== ""))
    .map((row) =>
      headers.reduce<RawSheetRow>((acc, header, index) => {
        acc[header] = String(row[index] ?? "").trim()
        return acc
      }, {}),
    )

  const config = importTargetConfigs[input.target]
  const ai = await getAiHeaderMapping(headers, input.target)
  const mappings = buildColumnMappings(headers, config.fields, ai.mappings)
  const context = await fetchPreviewContext(input.target, input.backendToken)

  const preview =
    input.target === "products"
      ? buildProductsPreview(dataRows, mappings, input, firstSheetName, ai, context)
      : input.target === "sales"
        ? buildSalesPreview(dataRows, mappings, input, firstSheetName, ai, context)
        : buildPurchasesPreview(dataRows, mappings, input, firstSheetName, ai, context)

  return {
    ...preview,
    headers,
    mappings,
    unmappedColumns: mappings.filter((mapping) => !mapping.fieldKey).map((mapping) => mapping.column),
  }
}

async function fetchPreviewContext(target: ImportTarget, token: string): Promise<PreviewContext> {
  const [products, categories, brands, customers, suppliers, sales, purchases, me] = await Promise.all([
    target === "products" || target === "sales" || target === "purchases" ? fetchBackendCollection<BackendProduct>("/products?per_page=500&sort=id&direction=asc", token) : Promise.resolve([]),
    target === "products" ? fetchBackendCollection<BackendCategory>("/categories", token) : Promise.resolve([]),
    target === "products" ? fetchBackendCollection<BackendBrand>("/brands", token) : Promise.resolve([]),
    target === "sales" ? fetchBackendCollection<BackendCustomer>("/customers?per_page=500&sort=id&direction=asc", token) : Promise.resolve([]),
    target === "purchases" ? fetchBackendCollection<BackendSupplier>("/suppliers?per_page=500&sort=id&direction=asc", token) : Promise.resolve([]),
    target === "sales" ? fetchBackendCollection<BackendSale>("/sales?per_page=500", token) : Promise.resolve([]),
    target === "purchases" ? fetchBackendCollection<BackendPurchase>("/purchases?per_page=500", token) : Promise.resolve([]),
    target === "sales" ? fetchBackendObject<BackendMe>("/me", token).catch(() => null) : Promise.resolve(null),
  ])

  return { products, categories, brands, customers, suppliers, sales, purchases, me }
}

async function fetchBackendCollection<T>(path: string, token: string): Promise<T[]> {
  const response = await fetch(`${getBackendApiBase()}${path}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`Backend preview sorğusu alınmadı: ${path}`)
  }

  const json = await response.json()
  if (Array.isArray(json)) {
    return json as T[]
  }

  return (json.data ?? []) as T[]
}

async function fetchBackendObject<T>(path: string, token: string): Promise<T> {
  const response = await fetch(`${getBackendApiBase()}${path}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`Backend preview sorğusu alınmadı: ${path}`)
  }

  const json = await response.json()
  return (json.data ?? json) as T
}

function getBackendApiBase() {
  const base = process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "http://127.0.0.1:8000/api"
  return base.endsWith("/") ? base.slice(0, -1) : base
}

function buildColumnMappings(headers: string[], fields: typeof importTargetConfigs.products.fields, aiMappings: AiHeaderMap): ColumnMapping[] {
  return headers.map((header) => {
    const normalizedColumn = normalizeHeader(header)
    const heuristicField = fields.find((field) =>
      field.aliases.some((alias) => normalizeHeader(alias) === normalizedColumn),
    )

    const aiFieldKey = aiMappings[header] ?? null
    const aiField = aiFieldKey ? fields.find((field) => field.key === aiFieldKey) ?? null : null

    const field = heuristicField ?? aiField
    const source = heuristicField ? "heuristic" : aiField ? "ai" : "unmapped"

    return {
      column: header,
      normalizedColumn,
      fieldKey: field?.key ?? null,
      fieldLabel: field?.label ?? null,
      source,
      confidence: heuristicField ? 1 : aiField ? 0.74 : 0,
      supported: field?.supported !== false,
    }
  })
}

async function getAiHeaderMapping(headers: string[], target: ImportTarget): Promise<{ mappings: AiHeaderMap; ai: AiAnalysisSummary }> {
  if (!process.env.OPENAI_API_KEY) {
    return {
      mappings: {},
      ai: {
        enabled: false,
        used: false,
        model: null,
        note: "OPENAI_API_KEY tapılmadığı üçün AI mapping deaktivdir. Heuristik uyğunlaşdırma istifadə ediləcək.",
      },
    }
  }

  try {
    const config = importTargetConfigs[target]
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text: "You map spreadsheet headers to ERP import fields. Return only JSON.",
              },
            ],
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: JSON.stringify({
                  target,
                  headers,
                  fields: config.fields.map((field) => ({
                    key: field.key,
                    label: field.label,
                    description: field.description,
                    aliases: field.aliases,
                  })),
                  task: "Map each header to at most one field key. Use null when no reasonable mapping exists.",
                }),
              },
            ],
          },
        ],
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI response status ${response.status}`)
    }

    const json = await response.json()
    const outputText = typeof json.output_text === "string" ? json.output_text : ""
    const parsed = JSON.parse(extractJsonObject(outputText)) as { mappings?: AiHeaderMap }

    return {
      mappings: parsed.mappings ?? {},
      ai: {
        enabled: true,
        used: true,
        model: OPENAI_MODEL,
        note: "AI sütun uyğunlaşdırması istifadə olundu.",
      },
    }
  } catch {
    return {
      mappings: {},
      ai: {
        enabled: true,
        used: false,
        model: OPENAI_MODEL,
        note: "AI uyğunlaşdırması alınmadı, heuristik mapping-ə fallback edildi.",
      },
    }
  }
}

function buildProductsPreview(
  dataRows: RawSheetRow[],
  mappings: ColumnMapping[],
  input: BuildPreviewInput,
  sheetName: string,
  aiResult: { ai: AiAnalysisSummary },
  context: PreviewContext,
): ImportPreviewPayload {
  const existingCodes = new Set(context.products.map((product) => product.product_code.trim().toLowerCase()))
  const seenCodes = new Set<string>()
  const rows = dataRows.map((raw, index) => {
    const normalized = mapRawRow(raw, mappings)
    const errors: string[] = []
    const warnings: string[] = []
    const code = getString(normalized.product_code)
    const name = getString(normalized.name)
    const categoryName = getString(normalized.category_name)
    const brandName = getString(normalized.brand_name)
    const cashSalePrice = parseNumber(normalized.cash_sale_price)
    const officialSalePrice = parseNumber(normalized.official_sale_price) ?? cashSalePrice
    const costPrice = parseNumber(normalized.cost_price) ?? cashSalePrice ?? 0
    const realStock = parseNumber(normalized.real_stock) ?? 0
    const officialStock = parseNumber(normalized.official_stock) ?? realStock
    const minimumStock = parseNumber(normalized.minimum_stock) ?? 0
    const statusValue = parseStatusBoolean(normalized.status)
    const priceType = parsePriceType(normalized.price_type)

    if (!code) errors.push("Məhsul kodu boşdur.")
    if (!name) errors.push("Məhsul adı boşdur.")
    if (!categoryName) errors.push("Kateqoriya boşdur.")
    if (!brandName) errors.push("Brend boşdur.")
    if (cashSalePrice === null) errors.push("Nağd qiymət tapılmadı və ya format yanlışdır.")
    if (officialSalePrice === null) errors.push("Rəsmi qiymət tapılmadı və ya format yanlışdır.")
    if (code && existingCodes.has(code.toLowerCase())) errors.push("Bu məhsul kodu artıq sistemdə mövcuddur.")
    if (code && seenCodes.has(code.toLowerCase())) errors.push("Bu məhsul kodu fayl daxilində təkrarlanır.")

    if (categoryName && !context.categories.some((item) => item.name.trim().toLowerCase() === categoryName.toLowerCase())) {
      warnings.push("Yeni kateqoriya yaradılacaq.")
    }

    if (brandName && !context.brands.some((item) => item.name.trim().toLowerCase() === brandName.toLowerCase())) {
      warnings.push("Yeni brend yaradılacaq.")
    }

    if (code) {
      seenCodes.add(code.toLowerCase())
    }

    const previewRow: PreviewRow = {
      rowNumber: index + 2,
      entityLabel: name || code || `Sətir ${index + 2}`,
      status: getRowStatus(errors, warnings),
      errors,
      warnings,
      raw,
      normalized: {
        product_code: code,
        name,
        description: getString(normalized.description) || null,
        category_name: categoryName,
        brand_name: brandName,
        cash_sale_price: cashSalePrice,
        official_sale_price: officialSalePrice,
        cost_price: costPrice,
        price_type: priceType,
        initial_real_quantity: realStock,
        initial_official_quantity: officialStock,
        minimum_stock: minimumStock,
        is_active: statusValue,
      },
    }

    return previewRow
  })

  return {
    target: input.target,
    fileName: input.fileName,
    sheetName,
    headers: [],
    mappings: [],
    unmappedColumns: [],
    rows,
    totals: buildTotals(rows),
    ai: aiResult.ai,
  }
}

function buildSalesPreview(
  dataRows: RawSheetRow[],
  mappings: ColumnMapping[],
  input: BuildPreviewInput,
  sheetName: string,
  aiResult: { ai: AiAnalysisSummary },
  context: PreviewContext,
): ImportPreviewPayload {
  const rows = dataRows.map((raw, index) => {
    const normalized = mapRawRow(raw, mappings)
    const errors: string[] = []
    const warnings: string[] = []
    const quantity = parseNumber(normalized.quantity)
    const discount = parseNumber(normalized.discount) ?? 0
    const lineTotal = parseNumber(normalized.line_total) ?? parseNumber(normalized.total_amount)
    const unitPrice =
      parseNumber(normalized.unit_price) ??
      (quantity && lineTotal !== null ? roundMoney((lineTotal + discount) / quantity) : null)
    const product = resolveProduct(context.products, getString(normalized.product_code), getString(normalized.product_name))
    const saleDate = parseDateString(normalized.sale_date)
    const saleType = parseSaleType(normalized.sale_type)
    const paymentMethod = parsePaymentMethod(normalized.payment_method) ?? (saleType === "official" ? "bank" : "cash")
    const stockType = parseStockType(normalized.stock_type) ?? (saleType === "official" ? "official" : "real")
    const customerName = getString(normalized.customer_name)
    const customerPhone = getString(normalized.customer_phone)
    const groupKey = getString(normalized.sale_number) || [
      customerName || "__cash__",
      saleDate || "__date__",
      saleType,
      paymentMethod,
      getString(normalized.note) || "",
    ].join("|")

    if (!saleDate) errors.push("Satış tarixi boşdur və ya format yanlışdır.")
    if (!product) errors.push("Məhsul tapılmadı.")
    if (!quantity || quantity <= 0) errors.push("Miqdar 0-dan böyük olmalıdır.")
    if (unitPrice === null || unitPrice < 0) errors.push("Qiymət düzgün deyil.")
    if (customerName && !resolveCustomer(context.customers, customerName, customerPhone)) {
      warnings.push(customerPhone ? "Yeni müştəri yaradılacaq." : "Müştəri üçün telefon verilmədiyi halda sistem placeholder telefon yaradacaq.")
    }

    if (getString(normalized.sales_representative) && context.me) {
      const rep = getString(normalized.sales_representative).toLowerCase()
      if (rep !== context.me.name.toLowerCase() && rep !== context.me.email.toLowerCase()) {
        warnings.push("Satış nümayəndəsi sütunu yalnız analiz üçün istifadə olunur; əməliyyat cari istifadəçi ilə yaradılacaq.")
      }
    }

    return {
      rowNumber: index + 2,
      entityLabel: `${customerName || "Nağd satış"} • ${(product?.name ?? getString(normalized.product_name)) || "Məhsul"}`,
      groupKey,
      status: getRowStatus(errors, warnings),
      errors,
      warnings,
      raw,
      normalized: {
        sale_number: getString(normalized.sale_number) || null,
        sale_date: saleDate,
        customer_name: customerName || null,
        customer_phone: customerPhone || null,
        customer_email: getString(normalized.customer_email) || null,
        sales_representative: getString(normalized.sales_representative) || null,
        sale_type: saleType,
        payment_status: parsePaymentStatus(normalized.payment_status) || null,
        payment_method: paymentMethod,
        stock_output: parseBoolean(normalized.stock_output) ?? true,
        product_id: product?.id ?? null,
        product_name: (product?.name ?? getString(normalized.product_name)) || null,
        quantity,
        unit_price: unitPrice,
        discount,
        line_total: lineTotal ?? (quantity && unitPrice !== null ? roundMoney(quantity * unitPrice - discount) : null),
        paid_amount: parseNumber(normalized.paid_amount),
        total_amount: parseNumber(normalized.total_amount),
        note: getString(normalized.note) || null,
        stock_type: stockType,
      },
    } satisfies PreviewRow
  })

  const rowsWithGroupValidation = applySalesGroupValidation(rows, context.sales)

  return {
    target: input.target,
    fileName: input.fileName,
    sheetName,
    headers: [],
    mappings: [],
    unmappedColumns: [],
    rows: rowsWithGroupValidation,
    totals: buildTotals(rowsWithGroupValidation),
    ai: aiResult.ai,
  }
}

function buildPurchasesPreview(
  dataRows: RawSheetRow[],
  mappings: ColumnMapping[],
  input: BuildPreviewInput,
  sheetName: string,
  aiResult: { ai: AiAnalysisSummary },
  context: PreviewContext,
): ImportPreviewPayload {
  const rows = dataRows.map((raw, index) => {
    const normalized = mapRawRow(raw, mappings)
    const errors: string[] = []
    const warnings: string[] = []
    const product = resolveProduct(context.products, getString(normalized.product_code), getString(normalized.product_name))
    const orderQuantity = parseNumber(normalized.order_quantity)
    const actualReceivedQuantity = parseNumber(normalized.actual_received_quantity) ?? orderQuantity
    const purchasePrice = parseNumber(normalized.purchase_price) ?? (orderQuantity ? safeDivide(parseNumber(normalized.line_total), orderQuantity) : null)
    const supplierName = getString(normalized.supplier_name)
    const supplierPhone = getString(normalized.supplier_phone)
    const purchaseDate = parseDateString(normalized.purchase_date)
    const paymentMethod = parsePaymentMethod(normalized.payment_method) ?? "cash"
    const groupKey = getString(normalized.purchase_number) || [
      supplierName || "__supplier__",
      purchaseDate || "__date__",
      paymentMethod,
      getString(normalized.note) || "",
    ].join("|")

    if (!purchaseDate) errors.push("Satınalma tarixi boşdur və ya format yanlışdır.")
    if (!supplierName) errors.push("Təchizatçı adı boşdur.")
    if (!product) errors.push("Məhsul tapılmadı.")
    if (!orderQuantity || orderQuantity <= 0) errors.push("Sifariş miqdarı 0-dan böyük olmalıdır.")
    if (actualReceivedQuantity !== null && orderQuantity !== null && actualReceivedQuantity > orderQuantity) errors.push("Qəbul edilən miqdar sifariş miqdarından böyük ola bilməz.")
    if (purchasePrice === null || purchasePrice <= 0) errors.push("Alış qiyməti düzgün deyil.")
    if (supplierName && !resolveSupplier(context.suppliers, supplierName, supplierPhone)) {
      warnings.push(supplierPhone ? "Yeni təchizatçı yaradılacaq." : "Təchizatçı üçün telefon verilmədiyi halda sistem placeholder telefon yaradacaq.")
    }
    if (getString(normalized.warehouse)) warnings.push("Anbar sütunu analiz edildi, lakin hazırkı schema-da saxlanmır.")
    if (getString(normalized.status)) warnings.push("Status sütunu analiz edildi, lakin hazırkı schema-da saxlanmır.")

    return {
      rowNumber: index + 2,
      entityLabel: `${supplierName || "Təchizatçı"} • ${(product?.name ?? getString(normalized.product_name)) || "Məhsul"}`,
      groupKey,
      status: getRowStatus(errors, warnings),
      errors,
      warnings,
      raw,
      normalized: {
        purchase_number: getString(normalized.purchase_number) || null,
        purchase_date: purchaseDate,
        supplier_name: supplierName || null,
        supplier_phone: supplierPhone || null,
        supplier_email: getString(normalized.supplier_email) || null,
        payment_method: paymentMethod,
        product_id: product?.id ?? null,
        product_name: (product?.name ?? getString(normalized.product_name)) || null,
        order_quantity: orderQuantity,
        actual_received_quantity: actualReceivedQuantity,
        purchase_price: purchasePrice,
        line_total: parseNumber(normalized.line_total),
        paid_amount: parseNumber(normalized.paid_amount),
        road_cost: parseNumber(normalized.road_cost) ?? 0,
        customs_cost: parseNumber(normalized.customs_cost) ?? 0,
        note: getString(normalized.note) || null,
      },
    } satisfies PreviewRow
  })

  const rowsWithGroupValidation = applyPurchaseGroupValidation(rows, context.purchases)

  return {
    target: input.target,
    fileName: input.fileName,
    sheetName,
    headers: [],
    mappings: [],
    unmappedColumns: [],
    rows: rowsWithGroupValidation,
    totals: buildTotals(rowsWithGroupValidation),
    ai: aiResult.ai,
  }
}

function applySalesGroupValidation(rows: PreviewRow[], existingSales: BackendSale[]) {
  const duplicateFingerprints = new Set(
    existingSales.map((sale) => `${(sale.customer?.name ?? "").trim().toLowerCase()}|${sale.sale_date}|${roundMoney(sale.total_amount).toFixed(2)}`),
  )

  const grouped = groupBy(rows, (row) => row.groupKey ?? `row-${row.rowNumber}`)
  return rows.map((row) => {
    const groupRows = grouped.get(row.groupKey ?? `row-${row.rowNumber}`) ?? [row]
    const saleDateValues = uniqueValues(groupRows.map((item) => String(item.normalized.sale_date ?? "")))
    const customerValues = uniqueValues(groupRows.map((item) => String(item.normalized.customer_name ?? "")))
    const subtotal = roundMoney(groupRows.reduce((sum, item) => sum + Number(item.normalized.line_total ?? 0), 0))
    const paidAmounts = uniqueValues(groupRows.map((item) => String(item.normalized.paid_amount ?? ""))).filter(Boolean)
    const paymentStatuses = uniqueValues(groupRows.map((item) => String(item.normalized.payment_status ?? ""))).filter(Boolean)
    const localErrors = [...row.errors]
    const localWarnings = [...row.warnings]

    if (saleDateValues.length > 1) localErrors.push("Eyni satış qrupunda fərqli tarixlər tapıldı.")
    if (customerValues.length > 1) localErrors.push("Eyni satış qrupunda fərqli müştərilər tapıldı.")

    const paidAmount = paidAmounts.length > 0 ? parseNumber(paidAmounts[0]) : null
    const paymentStatus = paymentStatuses[0] || inferPaymentStatus(paidAmount, subtotal)

    if (paymentStatuses.length > 1) localErrors.push("Eyni satış qrupunda fərqli ödəniş statusları var.")
    if (paidAmounts.length > 1) localErrors.push("Eyni satış qrupunda fərqli ödənilən məbləğlər var.")
    if (paidAmount !== null && paidAmount > subtotal) localErrors.push("Ödənilən məbləğ satış yekunundan çoxdur.")
    if (Number(row.normalized.total_amount ?? subtotal) && Math.abs(Number(row.normalized.total_amount ?? subtotal) - subtotal) > 0.01) {
      localWarnings.push("Excel-dəki ümumi məbləğ sətir cəmi ilə fərqlənir; sistem sətir məbləğini əsas götürəcək.")
    }

    const duplicateKey = `${String(row.normalized.customer_name ?? "").trim().toLowerCase()}|${String(row.normalized.sale_date ?? "")}|${subtotal.toFixed(2)}`
    const isDuplicate = duplicateFingerprints.has(duplicateKey)
    if (isDuplicate) {
      localErrors.push("Bu satışa bənzər əməliyyat artıq sistemdə mövcuddur.")
    }

    return {
      ...row,
      errors: dedupe(localErrors),
      warnings: dedupe(localWarnings),
      normalized: {
        ...row.normalized,
        paid_amount: paymentStatus === "paid" ? subtotal : paymentStatus === "debt" ? 0 : paidAmount,
        payment_status: paymentStatus,
        total_amount: subtotal,
      },
      status: isDuplicate ? "duplicate" : getRowStatus(dedupe(localErrors), dedupe(localWarnings)),
    } satisfies PreviewRow
  })
}

function applyPurchaseGroupValidation(rows: PreviewRow[], existingPurchases: BackendPurchase[]) {
  const duplicateFingerprints = new Set(
    existingPurchases.map((purchase) => `${(purchase.supplier?.name ?? "").trim().toLowerCase()}|${purchase.purchase_date}|${roundMoney(purchase.total_amount).toFixed(2)}`),
  )

  const grouped = groupBy(rows, (row) => row.groupKey ?? `row-${row.rowNumber}`)
  return rows.map((row) => {
    const groupRows = grouped.get(row.groupKey ?? `row-${row.rowNumber}`) ?? [row]
    const purchaseDateValues = uniqueValues(groupRows.map((item) => String(item.normalized.purchase_date ?? "")))
    const supplierValues = uniqueValues(groupRows.map((item) => String(item.normalized.supplier_name ?? "")))
    const paidAmounts = uniqueValues(groupRows.map((item) => String(item.normalized.paid_amount ?? ""))).filter(Boolean)
    const roadCosts = uniqueValues(groupRows.map((item) => String(item.normalized.road_cost ?? ""))).filter(Boolean)
    const customsCosts = uniqueValues(groupRows.map((item) => String(item.normalized.customs_cost ?? ""))).filter(Boolean)
    const subtotal = roundMoney(groupRows.reduce((sum, item) => sum + roundMoney(Number(item.normalized.order_quantity ?? 0) * Number(item.normalized.purchase_price ?? 0)), 0))
    const roadCost = roadCosts.length > 0 ? parseNumber(roadCosts[0]) ?? 0 : 0
    const customsCost = customsCosts.length > 0 ? parseNumber(customsCosts[0]) ?? 0 : 0
    const total = roundMoney(subtotal + roadCost + customsCost)
    const paidAmount = paidAmounts.length > 0 ? parseNumber(paidAmounts[0]) : null
    const localErrors = [...row.errors]
    const localWarnings = [...row.warnings]

    if (purchaseDateValues.length > 1) localErrors.push("Eyni satınalma qrupunda fərqli tarixlər tapıldı.")
    if (supplierValues.length > 1) localErrors.push("Eyni satınalma qrupunda fərqli təchizatçılar tapıldı.")
    if (paidAmounts.length > 1) localErrors.push("Eyni satınalma qrupunda fərqli ödənilən məbləğlər var.")
    if (roadCosts.length > 1) localWarnings.push("Yol xərci sətirlər arasında fərqlənir; ilk dəyər əsas götürüləcək.")
    if (customsCosts.length > 1) localWarnings.push("Gömrük xərci sətirlər arasında fərqlənir; ilk dəyər əsas götürüləcək.")
    if (paidAmount !== null && paidAmount > total) localErrors.push("Ödənilən məbləğ alış yekunundan çoxdur.")

    const duplicateKey = `${String(row.normalized.supplier_name ?? "").trim().toLowerCase()}|${String(row.normalized.purchase_date ?? "")}|${total.toFixed(2)}`
    const isDuplicate = duplicateFingerprints.has(duplicateKey)
    if (isDuplicate) {
      localErrors.push("Bu satınalmaya bənzər əməliyyat artıq sistemdə mövcuddur.")
    }

    return {
      ...row,
      errors: dedupe(localErrors),
      warnings: dedupe(localWarnings),
      normalized: {
        ...row.normalized,
        paid_amount: paidAmount,
        road_cost: roadCost,
        customs_cost: customsCost,
        total_amount: total,
      },
      status: isDuplicate ? "duplicate" : getRowStatus(dedupe(localErrors), dedupe(localWarnings)),
    } satisfies PreviewRow
  })
}

function buildTotals(rows: PreviewRow[]) {
  const validRows = rows.filter((row) => row.status === "valid").length
  const warningRows = rows.filter((row) => row.status === "warning").length
  const errorRows = rows.filter((row) => row.status === "error").length
  const duplicateRows = rows.filter((row) => row.status === "duplicate").length

  return {
    totalRows: rows.length,
    validRows,
    warningRows,
    errorRows,
    duplicateRows,
    importableRows: validRows + warningRows,
  }
}

function mapRawRow(raw: RawSheetRow, mappings: ColumnMapping[]) {
  return mappings.reduce<Record<string, string>>((acc, mapping) => {
    if (mapping.fieldKey) {
      acc[mapping.fieldKey] = raw[mapping.column] ?? ""
    }
    return acc
  }, {})
}

function getString(value: unknown) {
  return String(value ?? "").trim()
}

function parseNumber(value: unknown) {
  const raw = getString(value)
  if (!raw) return null
  const normalized = raw
    .replace(/[₼$€£%]/g, "")
    .replace(/\s/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".")
  const result = Number(normalized)
  return Number.isFinite(result) ? result : null
}

function parseBoolean(value: unknown) {
  const normalized = normalizeHeader(getString(value))
  if (!normalized) return null
  if (["true", "yes", "he", "beli", "1", "active"].includes(normalized)) return true
  if (["false", "no", "yox", "0", "passive"].includes(normalized)) return false
  return null
}

function parseStatusBoolean(value: unknown) {
  const booleanValue = parseBoolean(value)
  if (booleanValue !== null) return booleanValue
  return true
}

function parseDateString(value: unknown) {
  const raw = getString(value)
  if (!raw) return null
  const normalized = raw.replace(/\./g, "-").replace(/\//g, "-")
  const parts = normalized.split("-").map((part) => part.trim())
  if (parts.length === 3 && parts[0].length === 4) {
    const iso = `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`
    return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : null
  }
  if (parts.length === 3 && parts[2].length === 4) {
    const iso = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`
    return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : null
  }
  const timestamp = Date.parse(raw)
  if (Number.isNaN(timestamp)) return null
  return new Date(timestamp).toISOString().slice(0, 10)
}

function parseSaleType(value: unknown): "cash" | "official" {
  const normalized = normalizeHeader(getString(value))
  if (["official", "resmi", "rəsmi", "invoice"].includes(normalized)) return "official"
  return "cash"
}

function parsePaymentMethod(value: unknown): "cash" | "bank" | null {
  const normalized = normalizeHeader(getString(value))
  if (!normalized) return null
  if (["bank", "kart", "card"].includes(normalized)) return "bank"
  return "cash"
}

function parsePaymentStatus(value: unknown): "paid" | "partial" | "debt" | null {
  const normalized = normalizeHeader(getString(value))
  if (!normalized) return null
  if (["paid", "odenilib", "ödənilib", "tam", "full"].includes(normalized)) return "paid"
  if (["partial", "qismen", "qismən"].includes(normalized)) return "partial"
  return "debt"
}

function inferPaymentStatus(paidAmount: number | null, total: number) {
  if ((paidAmount ?? 0) <= 0) return "debt"
  if ((paidAmount ?? 0) >= total) return "paid"
  return "partial"
}

function parseStockType(value: unknown): "real" | "official" | "none" | null {
  const normalized = normalizeHeader(getString(value))
  if (!normalized) return null
  if (["real", "faktiki"].includes(normalized)) return "real"
  if (["official", "resmi", "rəsmi"].includes(normalized)) return "official"
  return "none"
}

function parsePriceType(value: unknown): "automatic" | "manual" {
  const normalized = normalizeHeader(getString(value))
  return normalized === "manual" ? "manual" : "automatic"
}

function resolveProduct(products: BackendProduct[], productCode: string, productName: string) {
  return products.find((product) => productCode && product.product_code.trim().toLowerCase() === productCode.toLowerCase())
    ?? products.find((product) => productName && product.name.trim().toLowerCase() === productName.toLowerCase())
    ?? null
}

function resolveCustomer(customers: BackendCustomer[], name: string, phone: string) {
  return customers.find((customer) => phone && customer.phone.trim() === phone)
    ?? customers.find((customer) => name && customer.name.trim().toLowerCase() === name.toLowerCase())
    ?? null
}

function resolveSupplier(suppliers: BackendSupplier[], name: string, phone: string) {
  return suppliers.find((supplier) => phone && supplier.phone.trim() === phone)
    ?? suppliers.find((supplier) => name && supplier.name.trim().toLowerCase() === name.toLowerCase())
    ?? null
}

function normalizeHeader(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

function getRowStatus(errors: string[], warnings: string[]): PreviewStatus {
  if (errors.length > 0) return "error"
  if (warnings.length > 0) return "warning"
  return "valid"
}

function extractJsonObject(text: string) {
  const start = text.indexOf("{")
  const end = text.lastIndexOf("}")
  if (start === -1 || end === -1 || end <= start) {
    return "{}"
  }
  return text.slice(start, end + 1)
}

function groupBy<T>(items: T[], getKey: (item: T) => string) {
  const map = new Map<string, T[]>()
  items.forEach((item) => {
    const key = getKey(item)
    map.set(key, [...(map.get(key) ?? []), item])
  })
  return map
}

function uniqueValues(values: string[]) {
  return [...new Set(values.filter(Boolean))]
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100
}

function safeDivide(value: number | null, by: number) {
  if (value === null || !by) return null
  return roundMoney(value / by)
}

function dedupe(values: string[]) {
  return [...new Set(values)]
}
