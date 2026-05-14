<?php

namespace Tests\Feature;

use App\Models\CashAccount;
use App\Models\Customer;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DebtPaymentTest extends TestCase
{
    use RefreshDatabase;

    public function test_customer_debt_payment_reduces_debt_and_increases_cash(): void
    {
        $this->seed(DatabaseSeeder::class);

        $user = User::where('email', 'admin@bestsol.az')->firstOrFail();
        Sanctum::actingAs($user);

        $customer = Customer::factory()->create(['total_debt' => 300]);
        $cashAccount = CashAccount::where('type', 'cash')->firstOrFail();

        $response = $this->postJson("/api/customers/{$customer->id}/payment", [
            'amount' => 100,
            'payment_method' => 'cash',
            'transaction_date' => now()->toDateString(),
        ]);

        $response->assertOk();

        $customer->refresh();
        $cashAccount->refresh();

        $this->assertSame(200.0, (float) $customer->total_debt);
        $this->assertSame(100.0, (float) $cashAccount->balance);
    }
}
