<?php

namespace Tests\Feature;

use App\Models\Brand;
use App\Models\Category;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProductCreationTest extends TestCase
{
    use RefreshDatabase;

    public function test_product_creation_stores_initial_stock_and_details(): void
    {
        $this->seed(DatabaseSeeder::class);

        $user = User::where('email', 'admin@bestsol.az')->firstOrFail();
        Sanctum::actingAs($user);

        $category = Category::firstOrFail();
        $brand = Brand::firstOrFail();

        $response = $this->postJson('/api/products', [
            'product_code' => 'TEST-100',
            'name' => 'Test məhsul',
            'description' => 'Backend məhsul testi',
            'category_id' => $category->id,
            'brand_id' => $brand->id,
            'cash_sale_price' => 120,
            'official_sale_price' => 150,
            'price_type' => 'manual',
            'cost_price' => 90,
            'is_active' => true,
            'minimum_stock' => 4,
            'initial_real_quantity' => 7,
            'initial_official_quantity' => 5,
        ]);

        $response->assertCreated();
        $response->assertJsonPath('data.description', 'Backend məhsul testi');
        $response->assertJsonPath('data.stock.real_quantity', 7);
        $response->assertJsonPath('data.stock.official_quantity', 5);
        $response->assertJsonPath('data.stock.minimum_quantity', 4);
    }
}
