// Mock data for BESTSOL ERP System

export const categories = [
  { id: 1, name: "Təkərlər", slug: "tekeler" },
  { id: 2, name: "Yağlar", slug: "yaglar" },
  { id: 3, name: "Aşınan hissələr", slug: "asinan-hisseler" },
  { id: 4, name: "Filtrlər", slug: "filtrler" },
  { id: 5, name: "Ehtiyat hissələr", slug: "ehtiyat-hisseler" },
  { id: 6, name: "İstehsalat avadanlıqları", slug: "istehsalat-avadanliqları" },
]

export const brands = [
  { id: 1, name: "Michelin" },
  { id: 2, name: "Continental" },
  { id: 3, name: "Mobil" },
  { id: 4, name: "Castrol" },
  { id: 5, name: "Bosch" },
  { id: 6, name: "Mann-Filter" },
  { id: 7, name: "SKF" },
  { id: 8, name: "Gates" },
]

export const products = [
  {
    id: 1,
    code: "TKR-001",
    name: "Michelin Primacy 4 205/55R16",
    category: "Təkərlər",
    brand: "Michelin",
    image: null,
    cashPrice: 245.00,
    officialPrice: 289.00,
    priceType: "auto",
    status: "active",
    realStock: 24,
    officialStock: 20,
    minStock: 10,
  },
  {
    id: 2,
    code: "TKR-002",
    name: "Continental PremiumContact 6 225/45R17",
    category: "Təkərlər",
    brand: "Continental",
    image: null,
    cashPrice: 320.00,
    officialPrice: 378.00,
    priceType: "auto",
    status: "active",
    realStock: 16,
    officialStock: 15,
    minStock: 8,
  },
  {
    id: 3,
    code: "YAG-001",
    name: "Mobil 1 5W-30 4L",
    category: "Yağlar",
    brand: "Mobil",
    image: null,
    cashPrice: 85.00,
    officialPrice: 99.00,
    priceType: "auto",
    status: "active",
    realStock: 45,
    officialStock: 40,
    minStock: 15,
  },
  {
    id: 4,
    code: "YAG-002",
    name: "Castrol Edge 5W-40 4L",
    category: "Yağlar",
    brand: "Castrol",
    image: null,
    cashPrice: 92.00,
    officialPrice: 108.00,
    priceType: "manual",
    status: "active",
    realStock: 38,
    officialStock: 35,
    minStock: 12,
  },
  {
    id: 5,
    code: "FLT-001",
    name: "Bosch Yağ Filtri",
    category: "Filtrlər",
    brand: "Bosch",
    image: null,
    cashPrice: 18.00,
    officialPrice: 22.00,
    priceType: "auto",
    status: "active",
    realStock: 120,
    officialStock: 100,
    minStock: 30,
  },
  {
    id: 6,
    code: "FLT-002",
    name: "Mann-Filter Hava Filtri",
    category: "Filtrlər",
    brand: "Mann-Filter",
    image: null,
    cashPrice: 24.00,
    officialPrice: 29.00,
    priceType: "auto",
    status: "active",
    realStock: 85,
    officialStock: 80,
    minStock: 25,
  },
  {
    id: 7,
    code: "EHT-001",
    name: "SKF Ön Rulman Dəsti",
    category: "Ehtiyat hissələr",
    brand: "SKF",
    image: null,
    cashPrice: 145.00,
    officialPrice: 172.00,
    priceType: "auto",
    status: "active",
    realStock: 8,
    officialStock: 8,
    minStock: 5,
  },
  {
    id: 8,
    code: "EHT-002",
    name: "Gates Timing Belt Kit",
    category: "Ehtiyat hissələr",
    brand: "Gates",
    image: null,
    cashPrice: 210.00,
    officialPrice: 248.00,
    priceType: "auto",
    status: "passive",
    realStock: 3,
    officialStock: 3,
    minStock: 5,
  },
]

export const customers = [
  {
    id: 1,
    name: "AutoServis Bakı MMC",
    phone: "+994 50 555 1234",
    email: "info@autoservis.az",
    address: "Bakı, Nərimanov r., Atatürk pr. 45",
    totalDebt: 2450.00,
    paidAmount: 1800.00,
    remainingDebt: 650.00,
  },
  {
    id: 2,
    name: "Premium Auto LLC",
    phone: "+994 55 666 7890",
    email: "contact@premiumauto.az",
    address: "Bakı, Xətai r., Babək pr. 120",
    totalDebt: 5200.00,
    paidAmount: 5200.00,
    remainingDebt: 0,
  },
  {
    id: 3,
    name: "Qaraj Plus",
    phone: "+994 70 444 5678",
    email: "qarajplus@mail.az",
    address: "Sumqayıt, Sülh küç. 15",
    totalDebt: 890.00,
    paidAmount: 400.00,
    remainingDebt: 490.00,
  },
  {
    id: 4,
    name: "Master Auto",
    phone: "+994 51 333 9012",
    email: "masterauto@gmail.com",
    address: "Gəncə, Nizami küç. 78",
    totalDebt: 3100.00,
    paidAmount: 2100.00,
    remainingDebt: 1000.00,
  },
  {
    id: 5,
    name: "Turbo Service",
    phone: "+994 55 222 3456",
    email: "turboservice@outlook.com",
    address: "Bakı, Yasamal r., M.Hadi küç. 33",
    totalDebt: 1750.00,
    paidAmount: 1750.00,
    remainingDebt: 0,
  },
]

export const suppliers = [
  {
    id: 1,
    name: "Global Tire Import",
    phone: "+994 12 555 0001",
    email: "orders@globaltire.az",
    country: "Türkiyə",
    totalDebt: 15000.00,
    paidAmount: 12000.00,
    remainingDebt: 3000.00,
  },
  {
    id: 2,
    name: "LubeOil Distribution",
    phone: "+994 12 555 0002",
    email: "sales@lubeoil.az",
    country: "Almaniya",
    totalDebt: 8500.00,
    paidAmount: 8500.00,
    remainingDebt: 0,
  },
  {
    id: 3,
    name: "AutoParts Europe",
    phone: "+994 12 555 0003",
    email: "info@autoparts-eu.com",
    country: "Polşa",
    totalDebt: 22000.00,
    paidAmount: 18000.00,
    remainingDebt: 4000.00,
  },
]

export const sales = [
  {
    id: 1,
    date: "2024-01-15",
    customer: "AutoServis Bakı MMC",
    products: [
      { name: "Mobil 1 5W-30 4L", quantity: 5, unitPrice: 85.00, total: 425.00 },
      { name: "Bosch Yağ Filtri", quantity: 5, unitPrice: 18.00, total: 90.00 },
    ],
    totalAmount: 515.00,
    saleType: "cash",
    paymentStatus: "paid",
    salesRep: "Elvin Həsənov",
    stockOutput: true,
  },
  {
    id: 2,
    date: "2024-01-15",
    customer: "Premium Auto LLC",
    products: [
      { name: "Michelin Primacy 4 205/55R16", quantity: 4, unitPrice: 289.00, total: 1156.00 },
    ],
    totalAmount: 1156.00,
    saleType: "official",
    paymentStatus: "paid",
    salesRep: "Kamran Əliyev",
    stockOutput: true,
  },
  {
    id: 3,
    date: "2024-01-14",
    customer: "Qaraj Plus",
    products: [
      { name: "Castrol Edge 5W-40 4L", quantity: 3, unitPrice: 92.00, total: 276.00 },
      { name: "Mann-Filter Hava Filtri", quantity: 3, unitPrice: 24.00, total: 72.00 },
    ],
    totalAmount: 348.00,
    saleType: "cash",
    paymentStatus: "partial",
    paidAmount: 200.00,
    salesRep: "Elvin Həsənov",
    stockOutput: true,
  },
  {
    id: 4,
    date: "2024-01-14",
    customer: "Master Auto",
    products: [
      { name: "SKF Ön Rulman Dəsti", quantity: 2, unitPrice: 145.00, total: 290.00 },
    ],
    totalAmount: 290.00,
    saleType: "cash",
    paymentStatus: "credit",
    salesRep: "Kamran Əliyev",
    stockOutput: true,
  },
  {
    id: 5,
    date: "2024-01-13",
    customer: "Turbo Service",
    products: [
      { name: "Continental PremiumContact 6 225/45R17", quantity: 2, unitPrice: 378.00, total: 756.00 },
      { name: "Mobil 1 5W-30 4L", quantity: 2, unitPrice: 99.00, total: 198.00 },
    ],
    totalAmount: 954.00,
    saleType: "official",
    paymentStatus: "paid",
    salesRep: "Elvin Həsənov",
    stockOutput: true,
  },
]

export const purchases = [
  {
    id: 1,
    date: "2024-01-10",
    supplier: "Global Tire Import",
    products: [
      { name: "Michelin Primacy 4 205/55R16", orderQty: 50, receivedQty: 48, unitPrice: 180.00 },
      { name: "Continental PremiumContact 6 225/45R17", orderQty: 30, receivedQty: 30, unitPrice: 240.00 },
    ],
    shippingCost: 450.00,
    customsCost: 1200.00,
    totalAmount: 17850.00,
    paymentType: "bank",
  },
  {
    id: 2,
    date: "2024-01-08",
    supplier: "LubeOil Distribution",
    products: [
      { name: "Mobil 1 5W-30 4L", orderQty: 100, receivedQty: 100, unitPrice: 55.00 },
      { name: "Castrol Edge 5W-40 4L", orderQty: 80, receivedQty: 78, unitPrice: 60.00 },
    ],
    shippingCost: 200.00,
    customsCost: 0,
    totalAmount: 10480.00,
    paymentType: "cash",
  },
  {
    id: 3,
    date: "2024-01-05",
    supplier: "AutoParts Europe",
    products: [
      { name: "Bosch Yağ Filtri", orderQty: 200, receivedQty: 195, unitPrice: 10.00 },
      { name: "Mann-Filter Hava Filtri", orderQty: 150, receivedQty: 150, unitPrice: 14.00 },
      { name: "SKF Ön Rulman Dəsti", orderQty: 20, receivedQty: 20, unitPrice: 95.00 },
    ],
    shippingCost: 350.00,
    customsCost: 800.00,
    totalAmount: 6250.00,
    paymentType: "bank",
  },
]

export const expenses = [
  { id: 1, date: "2024-01-15", category: "Ofis xərcləri", description: "Ofis ləvazimatları", amount: 150.00, type: "cash" },
  { id: 2, date: "2024-01-14", category: "Kommunal", description: "Elektrik ödənişi", amount: 420.00, type: "official" },
  { id: 3, date: "2024-01-14", category: "Nəqliyyat", description: "Yanacaq", amount: 280.00, type: "cash" },
  { id: 4, date: "2024-01-13", category: "Əmək haqqı", description: "İşçi maaşları", amount: 8500.00, type: "official" },
  { id: 5, date: "2024-01-12", category: "İcarə", description: "Anbar icarəsi", amount: 2000.00, type: "official" },
  { id: 6, date: "2024-01-10", category: "Təmir", description: "Avadanlıq təmiri", amount: 350.00, type: "cash" },
]

export const users = [
  { id: 1, name: "Rəşad Məmmədov", email: "rashad@bestsol.az", role: "Super Admin", status: "active" },
  { id: 2, name: "Nigar Əliyeva", email: "nigar@bestsol.az", role: "Maliyyə Meneceri", status: "active" },
  { id: 3, name: "Kamran Əliyev", email: "kamran@bestsol.az", role: "Satış Meneceri", status: "active" },
  { id: 4, name: "Elvin Həsənov", email: "elvin@bestsol.az", role: "Satış Nümayəndəsi", status: "active" },
  { id: 5, name: "Aydın Quliyev", email: "aydin@bestsol.az", role: "Anbar Məsulu", status: "active" },
  { id: 6, name: "Leyla Hüseynova", email: "leyla@bestsol.az", role: "Mühasib", status: "passive" },
]

export const roles = [
  { id: 1, name: "Super Admin", description: "Tam sistem girişi" },
  { id: 2, name: "Maliyyə Meneceri", description: "Maliyyə və hesabatlar" },
  { id: 3, name: "Satış Meneceri", description: "Satış idarəetməsi" },
  { id: 4, name: "Satış Nümayəndəsi", description: "Satış əməliyyatları" },
  { id: 5, name: "Anbar Məsulu", description: "Stok idarəetməsi" },
  { id: 6, name: "Mühasib", description: "Mühasibat əməliyyatları" },
]

export const permissions = [
  { id: 1, name: "Satış əlavə et", key: "sales_add" },
  { id: 2, name: "Satınalma əlavə et", key: "purchase_add" },
  { id: 3, name: "Stok görüntülə", key: "stock_view" },
  { id: 4, name: "Xərclər görüntülə", key: "expenses_view" },
  { id: 5, name: "Hesabatlar", key: "reports" },
  { id: 6, name: "Əmsallar dəyişdir", key: "coefficients" },
  { id: 7, name: "İstifadəçi idarəetmə", key: "user_management" },
]

export const rolePermissions: Record<string, string[]> = {
  "Super Admin": ["sales_add", "purchase_add", "stock_view", "expenses_view", "reports", "coefficients", "user_management"],
  "Maliyyə Meneceri": ["expenses_view", "reports", "coefficients"],
  "Satış Meneceri": ["sales_add", "stock_view", "reports"],
  "Satış Nümayəndəsi": ["sales_add", "stock_view"],
  "Anbar Məsulu": ["purchase_add", "stock_view"],
  "Mühasib": ["expenses_view", "reports"],
}

export const dashboardStats = {
  todaySales: 1671.00,
  monthlySales: 45890.00,
  cashBalance: 28500.00,
  bankBalance: 156000.00,
  customerDebt: 2140.00,
  supplierDebt: 7000.00,
  realStockValue: 185000.00,
  officialStockValue: 172000.00,
}

export const salesChartData = [
  { month: "Yan", sales: 32000, expenses: 18000 },
  { month: "Fev", sales: 38000, expenses: 21000 },
  { month: "Mar", sales: 45000, expenses: 24000 },
  { month: "Apr", sales: 42000, expenses: 22000 },
  { month: "May", sales: 48000, expenses: 25000 },
  { month: "İyn", sales: 52000, expenses: 28000 },
  { month: "İyl", sales: 55000, expenses: 30000 },
  { month: "Avq", sales: 51000, expenses: 27000 },
  { month: "Sen", sales: 47000, expenses: 25000 },
  { month: "Okt", sales: 53000, expenses: 29000 },
  { month: "Noy", sales: 58000, expenses: 31000 },
  { month: "Dek", sales: 62000, expenses: 34000 },
]

export const expenseChartData = [
  { name: "Əmək haqqı", value: 42000, color: "#0ea5e9" },
  { name: "İcarə", value: 12000, color: "#22c55e" },
  { name: "Kommunal", value: 5000, color: "#f59e0b" },
  { name: "Nəqliyyat", value: 8000, color: "#ef4444" },
  { name: "Digər", value: 3000, color: "#8b5cf6" },
]

export const stockMovements = [
  { id: 1, date: "2024-01-15", product: "Mobil 1 5W-30 4L", type: "out", quantity: 5, reason: "Satış #1" },
  { id: 2, date: "2024-01-15", product: "Bosch Yağ Filtri", type: "out", quantity: 5, reason: "Satış #1" },
  { id: 3, date: "2024-01-15", product: "Michelin Primacy 4 205/55R16", type: "out", quantity: 4, reason: "Satış #2" },
  { id: 4, date: "2024-01-10", product: "Michelin Primacy 4 205/55R16", type: "in", quantity: 48, reason: "Satınalma #1" },
  { id: 5, date: "2024-01-10", product: "Continental PremiumContact 6", type: "in", quantity: 30, reason: "Satınalma #1" },
]

export const coefficients = {
  categoryCoefficients: {
    "Təkərlər": 1.15,
    "Yağlar": 1.20,
    "Aşınan hissələr": 1.25,
    "Filtrlər": 1.30,
    "Ehtiyat hissələr": 1.18,
    "İstehsalat avadanlıqları": 1.10,
  },
  supplierCoefficients: {
    "Global Tire Import": 1.05,
    "LubeOil Distribution": 1.08,
    "AutoParts Europe": 1.06,
  },
  brandCoefficients: {
    "Michelin": 1.12,
    "Continental": 1.10,
    "Mobil": 1.08,
    "Castrol": 1.07,
    "Bosch": 1.15,
    "Mann-Filter": 1.12,
    "SKF": 1.18,
    "Gates": 1.14,
  },
  companyCoefficient: 1.25,
  vatPercentage: 18,
}

// Backward-compatible aliases for pages that still use the older mock* naming.
export const mockProducts = products.map((product) => ({
  id: String(product.id),
  name: product.name,
  sku: product.code,
  category: product.category,
  salePrice: product.cashPrice,
  stock: product.realStock,
}))

export const mockCustomers = customers.map((customer, index) => ({
  id: String(customer.id),
  name: customer.name,
  phone: customer.phone,
  email: customer.email,
  address: customer.address,
  totalOrders: index + 2,
  totalPurchases: customer.totalDebt,
  balance: customer.remainingDebt > 0 ? -customer.remainingDebt : 0,
}))

export const mockSuppliers = suppliers.map((supplier, index) => ({
  id: String(supplier.id),
  name: supplier.name,
  contactPerson: `Əlaqəli şəxs ${index + 1}`,
  phone: supplier.phone,
  email: supplier.email,
  status: supplier.remainingDebt > 0 ? "active" : "inactive",
  totalPurchases: supplier.totalDebt,
  balance: supplier.remainingDebt > 0 ? -supplier.remainingDebt : 0,
}))

export const mockSales = sales.map((sale) => ({
  id: String(sale.id),
  customerName: sale.customer,
  items: sale.products,
  total: sale.totalAmount,
  status: sale.paymentStatus === "paid" ? "completed" : "pending",
  date: sale.date,
}))

export const mockPurchases = purchases.map((purchase) => ({
  id: String(purchase.id),
  supplierName: purchase.supplier,
  items: purchase.products,
  total: purchase.totalAmount,
  date: purchase.date,
}))

export const mockWarehouses = [
  {
    id: "1",
    name: "Mərkəzi Anbar",
    code: "WH-001",
    address: "Bakı, Binəqədi",
    capacity: 12000,
    usedCapacity: 9200,
    manager: "Aydın Quliyev",
  },
  {
    id: "2",
    name: "Şimal Filialı",
    code: "WH-002",
    address: "Sumqayıt, Sənaye zonası",
    capacity: 8000,
    usedCapacity: 5100,
    manager: "Kamran Məmmədli",
  },
  {
    id: "3",
    name: "Gəncə Anbarı",
    code: "WH-003",
    address: "Gəncə, Nizami rayonu",
    capacity: 6000,
    usedCapacity: 5800,
    manager: "Leyla Hüseynova",
  },
]
