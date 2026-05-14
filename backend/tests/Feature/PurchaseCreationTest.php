<?php

namespace Tests\Feature;

use App\Models\CashAccount;
use App\Models\Product;
use App\Models\Supplier;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PurchaseCreationTest extends TestCase
{
    use RefreshDatabase;

    public function test_purchase_creation_updates_stocks_finance_and_supplier_debt(): void
    {
        $this->seed(DatabaseSeeder::class);

        $user = User::where('email', 'admin@bestsol.az')->firstOrFail();
        Sanctum::actingAs($user);

        $supplier = Supplier::factory()->create(['total_debt' => 0]);
        $product = Product::with('stock')->firstOrFail();
        $cashAccount = CashAccount::where('type', 'cash')->firstOrFail();
        $cashAccount->update(['balance' => 2000]);

        $initialOfficial = (float) $product->stock->official_quantity;
        $initialReal = (float) $product->stock->real_quantity;

        $response = $this->postJson('/api/purchases', [
            'supplier_id' => $supplier->id,
            'payment_method' => 'cash',
            'paid_amount' => 500,
            'road_cost' => 20,
            'customs_cost' => 30,
            'purchase_date' => now()->toDateString(),
            'items' => [
                [
                    'product_id' => $product->id,
                    'order_quantity' => 10,
                    'actual_received_quantity' => 8,
                    'purchase_price' => 100,
                ],
            ],
        ]);

        $response->assertCreated();

        $supplier->refresh();
        $product->refresh();
        $product->load('stock');
        $cashAccount->refresh();

        $this->assertSame($initialOfficial + 10.0, (float) $product->stock->official_quantity);
        $this->assertSame($initialReal + 8.0, (float) $product->stock->real_quantity);
        $this->assertSame(1500.0, (float) $cashAccount->balance);
        $this->assertSame(550.0, (float) $supplier->total_debt);
    }
}
