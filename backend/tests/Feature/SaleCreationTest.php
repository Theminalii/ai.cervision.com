<?php

namespace Tests\Feature;

use App\Models\CashAccount;
use App\Models\Customer;
use App\Models\Product;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SaleCreationTest extends TestCase
{
    use RefreshDatabase;

    public function test_sale_creation_updates_stock_finance_and_customer_debt(): void
    {
        $this->seed(DatabaseSeeder::class);

        $user = User::where('email', 'admin@bestsol.az')->firstOrFail();
        Sanctum::actingAs($user);

        $customer = Customer::factory()->create(['total_debt' => 0]);
        $product = Product::with('stock')->firstOrFail();
        $cashAccount = CashAccount::where('type', 'cash')->firstOrFail();

        $initialStock = (float) $product->stock->real_quantity;
        $unitPrice = (float) $product->cash_sale_price;

        $response = $this->postJson('/api/sales', [
            'customer_id' => $customer->id,
            'sale_type' => 'cash',
            'payment_status' => 'partial',
            'payment_method' => 'cash',
            'paid_amount' => 200,
            'stock_output' => true,
            'sale_date' => now()->toDateString(),
            'items' => [
                [
                    'product_id' => $product->id,
                    'quantity' => 2,
                    'unit_price' => $unitPrice,
                    'stock_type' => 'real',
                ],
            ],
        ]);

        $response->assertCreated();

        $customer->refresh();
        $product->refresh();
        $cashAccount->refresh();
        $product->load('stock');

        $this->assertSame($initialStock - 2.0, (float) $product->stock->real_quantity);
        $this->assertSame(200.0, (float) $cashAccount->balance);
        $this->assertSame(($unitPrice * 2) - 200.0, (float) $customer->total_debt);
    }
}
