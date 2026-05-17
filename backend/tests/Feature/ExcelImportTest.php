<?php

namespace Tests\Feature;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\Supplier;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ExcelImportTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(DatabaseSeeder::class);
        $user = User::where('email', 'admin@bestsol.az')->firstOrFail();
        Sanctum::actingAs($user);
    }

    public function test_product_excel_import_creates_product_and_stock(): void
    {
        $response = $this->postJson('/api/import/products/excel', [
            'rows' => [
                [
                    'product_code' => 'IMP-001',
                    'name' => 'Import Məhsulu',
                    'category_name' => 'Import Kateqoriya',
                    'brand_name' => 'Import Brend',
                    'cash_sale_price' => 15,
                    'official_sale_price' => 18,
                    'cost_price' => 10,
                    'price_type' => 'automatic',
                    'initial_real_quantity' => 8,
                    'initial_official_quantity' => 5,
                    'minimum_stock' => 2,
                    'is_active' => true,
                ],
            ],
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('products', [
            'product_code' => 'IMP-001',
            'name' => 'Import Məhsulu',
        ]);
        $product = Product::where('product_code', 'IMP-001')->firstOrFail();
        $this->assertDatabaseHas('stocks', [
            'product_id' => $product->id,
        ]);
    }

    public function test_sales_excel_import_creates_sale_and_items(): void
    {
        $category = Category::create(['name' => 'Satış Kateqoriyası', 'status' => 'active']);
        $brand = Brand::create(['name' => 'Satış Brendi', 'status' => 'active']);
        $product = Product::factory()->create([
            'category_id' => $category->id,
            'brand_id' => $brand->id,
            'product_code' => 'SAL-001',
            'cash_sale_price' => 20,
            'official_sale_price' => 25,
        ]);

        $response = $this->postJson('/api/import/sales/excel', [
            'rows' => [
                [
                    'sale_number' => 'ROW-1',
                    'sale_date' => now()->toDateString(),
                    'customer_name' => 'Excel Customer',
                    'customer_phone' => '994500001122',
                    'sale_type' => 'cash',
                    'payment_status' => 'paid',
                    'payment_method' => 'cash',
                    'stock_output' => false,
                    'product_id' => $product->id,
                    'quantity' => 2,
                    'unit_price' => 20,
                    'line_total' => 40,
                    'paid_amount' => 40,
                    'stock_type' => 'none',
                ],
            ],
        ]);

        $response->assertOk();
        $this->assertDatabaseCount('sales', 1);
        $this->assertDatabaseHas('sale_items', [
            'product_id' => $product->id,
        ]);
    }

    public function test_purchase_excel_import_creates_purchase_and_supplier(): void
    {
        $category = Category::create(['name' => 'Alış Kateqoriyası', 'status' => 'active']);
        $brand = Brand::create(['name' => 'Alış Brendi', 'status' => 'active']);
        $product = Product::factory()->create([
            'category_id' => $category->id,
            'brand_id' => $brand->id,
            'product_code' => 'PUR-001',
        ]);

        $response = $this->postJson('/api/import/purchases/excel', [
            'rows' => [
                [
                    'purchase_number' => 'ROW-1',
                    'purchase_date' => now()->toDateString(),
                    'supplier_name' => 'Excel Supplier',
                    'supplier_phone' => '994500009988',
                    'payment_method' => 'cash',
                    'product_id' => $product->id,
                    'order_quantity' => 4,
                    'actual_received_quantity' => 4,
                    'purchase_price' => 12,
                    'paid_amount' => 0,
                    'road_cost' => 0,
                    'customs_cost' => 0,
                ],
            ],
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('suppliers', [
            'name' => 'Excel Supplier',
            'phone' => '994500009988',
        ]);
        $supplier = Supplier::where('phone', '994500009988')->firstOrFail();
        $this->assertDatabaseHas('purchases', [
            'supplier_id' => $supplier->id,
        ]);
    }
}
