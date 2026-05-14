<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\StockMovement;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StockAdjustmentTest extends TestCase
{
    use RefreshDatabase;

    public function test_stock_adjustment_endpoint_updates_stock_and_creates_movement(): void
    {
        $this->seed(DatabaseSeeder::class);

        $user = User::where('email', 'admin@bestsol.az')->firstOrFail();
        Sanctum::actingAs($user);

        $product = Product::with('stock')->firstOrFail();
        $initialReal = (float) $product->stock->real_quantity;

        $response = $this->postJson('/api/stocks/adjustment', [
            'product_id' => $product->id,
            'stock_type' => 'real',
            'quantity' => 5,
            'note' => 'Test adjustment',
        ]);

        $response->assertOk();

        $product->refresh();
        $product->load('stock');

        $this->assertSame($initialReal + 5.0, (float) $product->stock->real_quantity);
        $this->assertDatabaseHas('stock_movements', [
            'product_id' => $product->id,
            'type' => 'adjustment',
            'stock_type' => 'real',
            'direction' => 'in',
        ]);
    }
}
