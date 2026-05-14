<?php

namespace Tests\Feature;

use App\Models\CashAccount;
use App\Models\Customer;
use App\Models\Product;
use App\Models\Sale;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SalePaymentTest extends TestCase
{
    use RefreshDatabase;

    public function test_sale_payment_reduces_sale_debt_and_customer_debt_and_increases_balance(): void
    {
        $this->seed(DatabaseSeeder::class);

        $user = User::where('email', 'admin@bestsol.az')->firstOrFail();
        Sanctum::actingAs($user);

        $customer = Customer::factory()->create(['total_debt' => 0]);
        $product = Product::with('stock')->firstOrFail();
        $bankAccount = CashAccount::where('type', 'bank')->firstOrFail();

        $saleResponse = $this->postJson('/api/sales', [
            'customer_id' => $customer->id,
            'sale_type' => 'official',
            'payment_status' => 'partial',
            'payment_method' => 'bank',
            'paid_amount' => 100,
            'stock_output' => false,
            'sale_date' => now()->toDateString(),
            'items' => [
                [
                    'product_id' => $product->id,
                    'quantity' => 2,
                    'unit_price' => 150,
                    'stock_type' => 'none',
                ],
            ],
        ]);

        $saleResponse->assertCreated();

        /** @var Sale $sale */
        $sale = Sale::firstOrFail();

        $paymentResponse = $this->postJson("/api/sales/{$sale->id}/payment", [
            'amount' => 50,
            'payment_method' => 'bank',
            'note' => 'Qismən borc ödənişi',
            'transaction_date' => now()->toDateString(),
        ]);

        $paymentResponse->assertOk();

        $sale->refresh();
        $customer->refresh();
        $bankAccount->refresh();

        $this->assertSame(150.0, (float) $sale->paid_amount);
        $this->assertSame(150.0, (float) $sale->debt_amount);
        $this->assertSame('partial', $sale->payment_status);
        $this->assertSame(150.0, (float) $customer->total_debt);
        $this->assertSame(150.0, (float) $bankAccount->balance);
    }
}
