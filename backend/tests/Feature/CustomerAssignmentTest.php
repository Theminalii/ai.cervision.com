<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Product;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CustomerAssignmentTest extends TestCase
{
    use RefreshDatabase;

    public function test_sales_representative_only_sees_assigned_customers(): void
    {
        $this->seed(DatabaseSeeder::class);

        $salesRepRole = Role::where('name', 'Satış Nümayəndəsi')->firstOrFail();

        $repOne = User::factory()->create([
            'role_id' => $salesRepRole->id,
            'status' => 'active',
        ]);

        $repTwo = User::factory()->create([
            'role_id' => $salesRepRole->id,
            'status' => 'active',
        ]);

        $ownedCustomer = Customer::factory()->create([
            'assigned_user_id' => $repOne->id,
            'phone' => '+994501111111',
        ]);

        Customer::factory()->create([
            'assigned_user_id' => $repTwo->id,
            'phone' => '+994502222222',
        ]);

        Sanctum::actingAs($repOne);

        $response = $this->getJson('/api/customers?search=222222');
        $response->assertOk();
        $response->assertJsonCount(0, 'data');

        $fullResponse = $this->getJson('/api/customers');
        $fullResponse->assertOk();
        $fullResponse->assertJsonCount(1, 'data');
        $fullResponse->assertJsonPath('data.0.id', $ownedCustomer->id);
    }

    public function test_sales_representative_cannot_create_sale_for_another_reps_customer(): void
    {
        $this->seed(DatabaseSeeder::class);

        $salesRepRole = Role::where('name', 'Satış Nümayəndəsi')->firstOrFail();

        $repOne = User::factory()->create([
            'role_id' => $salesRepRole->id,
            'status' => 'active',
        ]);

        $repTwo = User::factory()->create([
            'role_id' => $salesRepRole->id,
            'status' => 'active',
        ]);

        $foreignCustomer = Customer::factory()->create([
            'assigned_user_id' => $repTwo->id,
            'total_debt' => 0,
        ]);

        $product = Product::with('stock')->firstOrFail();

        Sanctum::actingAs($repOne);

        $response = $this->postJson('/api/sales', [
            'customer_id' => $foreignCustomer->id,
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

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['customer_id']);
    }
}
