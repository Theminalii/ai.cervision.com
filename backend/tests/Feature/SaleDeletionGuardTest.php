<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SaleDeletionGuardTest extends TestCase
{
    use RefreshDatabase;

    public function test_sale_with_stock_or_finance_side_effects_cannot_be_deleted(): void
    {
        $this->seed(DatabaseSeeder::class);

        $user = User::where('email', 'admin@bestsol.az')->firstOrFail();
        Sanctum::actingAs($user);

        $product = Product::with('stock')->firstOrFail();

        $saleResponse = $this->postJson('/api/sales', [
            'sale_type' => 'cash',
            'payment_status' => 'paid',
            'payment_method' => 'cash',
            'stock_output' => false,
            'sale_date' => now()->toDateString(),
            'items' => [
                [
                    'product_id' => $product->id,
                    'quantity' => 1,
                    'unit_price' => (float) $product->cash_sale_price,
                    'stock_type' => 'none',
                ],
            ],
        ]);

        $saleId = $saleResponse->json('data.id');

        $deleteResponse = $this->deleteJson("/api/sales/{$saleId}");

        $deleteResponse->assertStatus(422);
        $deleteResponse->assertJsonPath('message', 'Stok, maliyyə və ya borc qeydləri yaranmış satış silinə bilməz.');
    }
}
