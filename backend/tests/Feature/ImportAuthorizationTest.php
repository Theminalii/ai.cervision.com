<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ImportAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_customer_import_requires_sales_permission(): void
    {
        $this->seed(DatabaseSeeder::class);

        $role = Role::where('name', 'Maliyyə Meneceri')->firstOrFail();
        $user = User::factory()->create([
            'role_id' => $role->id,
            'status' => 'active',
        ]);

        Sanctum::actingAs($user);

        $response = $this->postJson('/api/import/customers', [
            'data' => [
                ['name' => 'Test', 'phone' => '+994500000001'],
            ],
        ]);

        $response->assertForbidden();
    }
}
