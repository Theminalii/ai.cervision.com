<?php

namespace Database\Seeders;

use App\Models\Brand;
use App\Models\Category;
use App\Models\PriceCoefficient;
use App\Models\Product;
use App\Models\Stock;
use Illuminate\Database\Seeder;

class CatalogSeeder extends Seeder
{
    public function run(): void
    {
        $categoryNames = [
            'Təkərlər',
            'Yağlar',
            'Aşınan hissələr',
            'Filtrlər',
            'Ehtiyat hissələr',
            'İstehsalat avadanlıqları',
        ];

        foreach ($categoryNames as $categoryName) {
            Category::updateOrCreate(
                ['name' => $categoryName],
                ['status' => 'active']
            );
        }

        foreach (['Michelin', 'Continental', 'Mobil', 'Castrol', 'Bosch', 'Mann-Filter', 'SKF', 'Gates'] as $brandName) {
            Brand::updateOrCreate(
                ['name' => $brandName],
                ['status' => 'active']
            );
        }

        $defaultProducts = [
            ['product_code' => 'TKR-001', 'name' => 'Michelin Primacy 4 205/55R16', 'category' => 'Təkərlər', 'brand' => 'Michelin', 'cash_sale_price' => 245, 'official_sale_price' => 289, 'cost_price' => 180, 'minimum_stock' => 10],
            ['product_code' => 'TKR-002', 'name' => 'Continental PremiumContact 6 225/45R17', 'category' => 'Təkərlər', 'brand' => 'Continental', 'cash_sale_price' => 320, 'official_sale_price' => 378, 'cost_price' => 240, 'minimum_stock' => 8],
            ['product_code' => 'YAG-001', 'name' => 'Mobil 1 5W-30 4L', 'category' => 'Yağlar', 'brand' => 'Mobil', 'cash_sale_price' => 85, 'official_sale_price' => 99, 'cost_price' => 55, 'minimum_stock' => 15],
            ['product_code' => 'FLT-001', 'name' => 'Bosch Yağ Filtri', 'category' => 'Filtrlər', 'brand' => 'Bosch', 'cash_sale_price' => 18, 'official_sale_price' => 22, 'cost_price' => 10, 'minimum_stock' => 30],
        ];

        foreach ($defaultProducts as $productData) {
            $product = Product::updateOrCreate(
                ['product_code' => $productData['product_code']],
                [
                    'name' => $productData['name'],
                    'category_id' => Category::where('name', $productData['category'])->value('id'),
                    'brand_id' => Brand::where('name', $productData['brand'])->value('id'),
                    'cash_sale_price' => $productData['cash_sale_price'],
                    'official_sale_price' => $productData['official_sale_price'],
                    'price_type' => 'automatic',
                    'cost_price' => $productData['cost_price'],
                    'is_active' => true,
                    'minimum_stock' => $productData['minimum_stock'],
                ]
            );

            Stock::updateOrCreate(
                ['product_id' => $product->id],
                [
                    'official_quantity' => 50,
                    'real_quantity' => 45,
                    'minimum_quantity' => $productData['minimum_stock'],
                ]
            );
        }

        PriceCoefficient::updateOrCreate(
            ['active_from' => now()->toDateString(), 'category_id' => null, 'brand_id' => null, 'supplier_id' => null],
            [
                'category_coefficient' => 1.15,
                'supplier_coefficient' => 1.05,
                'brand_coefficient' => 1.10,
                'company_coefficient' => 1.25,
                'vat_percent' => 18,
                'status' => 'active',
            ]
        );
    }
}
