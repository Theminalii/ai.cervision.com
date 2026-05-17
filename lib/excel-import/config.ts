import type { ImportFieldDefinition, ImportTarget } from "@/lib/excel-import/types"

type ImportTargetConfig = {
  title: string
  description: string
  fields: ImportFieldDefinition[]
}

export const importTargetConfigs: Record<ImportTarget, ImportTargetConfig> = {
  products: {
    title: "Məhsul Excel Import",
    description: "Məhsul kataloqunu Excel faylından oxuyub preview ilə sistemə əlavə edin.",
    fields: [
      { key: "product_code", label: "Məhsul kodu", required: true, description: "Unikal məhsul kodu", aliases: ["product code", "kod", "məhsul kodu", "sku", "code", "item code"] },
      { key: "name", label: "Məhsul adı", required: true, description: "Məhsulun adı", aliases: ["product name", "məhsul adı", "mal adı", "name", "item", "product"] },
      { key: "description", label: "Təsvir", description: "Məhsul təsviri", aliases: ["description", "təsvir", "qeyd", "note"] },
      { key: "category_name", label: "Kateqoriya", required: true, description: "Kateqoriya adı", aliases: ["category", "kateqoriya", "kategoriya", "group"] },
      { key: "brand_name", label: "Brend", required: true, description: "Brend və ya marka", aliases: ["brand", "brend", "marka", "manufacturer"] },
      { key: "cash_sale_price", label: "Nağd qiymət", required: true, description: "Nağd satış qiyməti", aliases: ["cash sale price", "nağd qiymət", "price", "satış qiyməti", "cash price", "qiymət"] },
      { key: "official_sale_price", label: "Rəsmi qiymət", required: true, description: "Rəsmi satış qiyməti", aliases: ["official sale price", "rəsmi qiymət", "official price", "invoice price"] },
      { key: "cost_price", label: "Alış qiyməti", description: "Məhsulun maya dəyəri", aliases: ["cost price", "alış qiyməti", "purchase price", "maya dəyəri", "cost"] },
      { key: "price_type", label: "Qiymət tipi", description: "automatic və ya manual", aliases: ["price type", "qiymət tipi", "pricing mode"] },
      { key: "real_stock", label: "Real stok", description: "İlkin real stok", aliases: ["real stock", "real stok", "stok", "current stock", "real quantity"] },
      { key: "official_stock", label: "Rəsmi stok", description: "İlkin rəsmi stok", aliases: ["official stock", "rəsmi stok", "official quantity", "book stock"] },
      { key: "minimum_stock", label: "Minimum stok", description: "Minimum stok həddi", aliases: ["minimum stock", "min stock", "minimum stok", "safety stock"] },
      { key: "status", label: "Status", description: "Aktiv və ya passiv", aliases: ["status", "active", "is active", "state"] },
    ],
  },
  sales: {
    title: "Satış Excel Import",
    description: "Satış sətirlərini AI dəstəkli preview ilə oxuyub əməliyyatlara çevirin.",
    fields: [
      { key: "sale_number", label: "Satış nömrəsi", description: "Eyni satış sətirlərini qruplaşdırmaq üçün istifadə olunur", aliases: ["sale number", "satış nömrəsi", "invoice no", "sifariş nömrəsi", "ref"] },
      { key: "sale_date", label: "Tarix", required: true, description: "Satış tarixi", aliases: ["date", "tarix", "sale date", "invoice date"] },
      { key: "customer_name", label: "Müştəri", description: "Müştəri adı", aliases: ["customer", "müştəri", "customer name", "client", "alıcı"] },
      { key: "customer_phone", label: "Müştəri telefonu", description: "Yeni müştəri yaratmaq üçün istifadə oluna bilər", aliases: ["customer phone", "phone", "telefon", "müştəri telefonu"] },
      { key: "customer_email", label: "Müştəri email", description: "Əlavə məlumat", aliases: ["customer email", "email", "e-poçt"] },
      { key: "sales_representative", label: "Satış nümayəndəsi", description: "Mövcud istifadəçi adı və ya email", aliases: ["sales representative", "satıcı", "manager", "sales rep", "representative"] },
      { key: "sale_type", label: "Satış tipi", description: "cash və ya official", aliases: ["sale type", "satış tipi", "type", "nağd/rəsmi"] },
      { key: "payment_status", label: "Ödəniş statusu", description: "paid, partial və ya debt", aliases: ["payment status", "status", "ödəniş statusu", "debt status"] },
      { key: "payment_method", label: "Ödəniş üsulu", description: "cash və ya bank", aliases: ["payment method", "ödəniş üsulu", "cash/bank", "payment type"] },
      { key: "stock_output", label: "Stok çıxışı", description: "true/false", aliases: ["stock output", "stok çıxışı", "warehouse output"] },
      { key: "product_name", label: "Məhsul", required: true, description: "Məhsul adı", aliases: ["product", "məhsul", "product name", "mal adı", "item"] },
      { key: "product_code", label: "Məhsul kodu", description: "Məhsulu kodla tapmaq üçün", aliases: ["product code", "kod", "sku", "item code"] },
      { key: "quantity", label: "Miqdar", required: true, description: "Satılan miqdar", aliases: ["quantity", "miqdar", "qty", "count"] },
      { key: "unit_price", label: "Vahid qiymət", description: "Bir vahidin qiyməti", aliases: ["unit price", "price", "qiymət", "sale price", "satış qiyməti"] },
      { key: "discount", label: "Endirim", description: "Sətir üzrə endirim", aliases: ["discount", "endirim", "discount amount"] },
      { key: "line_total", label: "Sətir cəmi", description: "Məhsul sətrinin yekunu", aliases: ["line total", "total", "məbləğ", "sum", "item total"] },
      { key: "paid_amount", label: "Ödənilən məbləğ", description: "Satış üzrə ödənilən məbləğ", aliases: ["paid amount", "ödənilən", "paid", "received"] },
      { key: "total_amount", label: "Ümumi məbləğ", description: "Satış yekunu", aliases: ["total amount", "ümumi məbləğ", "grand total"] },
      { key: "note", label: "Qeyd", description: "Əlavə qeyd", aliases: ["note", "qeyd", "comment", "remark"] },
      { key: "stock_type", label: "Stok tipi", description: "real, official və ya none", aliases: ["stock type", "stok tipi", "warehouse type"] },
    ],
  },
  purchases: {
    title: "Satınalma Excel Import",
    description: "Satınalma sətirlərini sistemin purchase məntiqinə uyğun import edin.",
    fields: [
      { key: "purchase_number", label: "Satınalma nömrəsi", description: "Qruplaşdırma üçün istifadə olunur", aliases: ["purchase number", "alış nömrəsi", "satınalma nömrəsi", "ref"] },
      { key: "purchase_date", label: "Tarix", required: true, description: "Satınalma tarixi", aliases: ["date", "tarix", "purchase date", "invoice date"] },
      { key: "supplier_name", label: "Təchizatçı", required: true, description: "Təchizatçı adı", aliases: ["supplier", "təchizatçı", "vendor", "supplier name"] },
      { key: "supplier_phone", label: "Təchizatçı telefonu", description: "Yeni təchizatçı yaratmaq üçün", aliases: ["supplier phone", "phone", "telefon"] },
      { key: "supplier_email", label: "Təchizatçı email", description: "Əlavə məlumat", aliases: ["supplier email", "email", "e-poçt"] },
      { key: "product_name", label: "Məhsul", required: true, description: "Məhsul adı", aliases: ["product", "məhsul", "product name", "mal adı", "item"] },
      { key: "product_code", label: "Məhsul kodu", description: "Məhsulu kodla tapmaq üçün", aliases: ["product code", "kod", "sku", "item code"] },
      { key: "order_quantity", label: "Sifariş miqdarı", required: true, description: "Sifariş olunan miqdar", aliases: ["order quantity", "sifariş miqdarı", "quantity", "qty"] },
      { key: "actual_received_quantity", label: "Qəbul edilən miqdar", description: "Faktiki daxil olan miqdar", aliases: ["received quantity", "actual received quantity", "faktiki miqdar", "daxil olan"] },
      { key: "purchase_price", label: "Alış qiyməti", required: true, description: "Bir vahidin alış qiyməti", aliases: ["purchase price", "alış qiyməti", "cost", "unit cost", "price"] },
      { key: "line_total", label: "Sətir cəmi", description: "Sətir yekunu", aliases: ["line total", "total", "məbləğ", "sum", "item total"] },
      { key: "paid_amount", label: "Ödənilən məbləğ", description: "Satınalma üzrə ödənilən məbləğ", aliases: ["paid amount", "ödənilən", "paid"] },
      { key: "payment_method", label: "Ödəniş üsulu", description: "cash və ya bank", aliases: ["payment method", "ödəniş üsulu", "cash/bank", "payment type"] },
      { key: "road_cost", label: "Yol xərci", description: "Əlavə daşınma xərci", aliases: ["road cost", "shipping", "delivery cost", "yol xərci"] },
      { key: "customs_cost", label: "Gömrük xərci", description: "Gömrük xərci", aliases: ["customs cost", "gömrük", "customs"] },
      { key: "note", label: "Qeyd", description: "Əlavə qeyd", aliases: ["note", "qeyd", "remark", "comment"] },
      { key: "warehouse", label: "Anbar", description: "Məlumat üçün analiz edilir, hazırkı schema-da yazılmır", aliases: ["warehouse", "anbar"], supported: false },
      { key: "status", label: "Status", description: "Məlumat üçün analiz edilir, hazırkı schema-da yazılmır", aliases: ["status", "vəziyyət"], supported: false },
    ],
  },
}
