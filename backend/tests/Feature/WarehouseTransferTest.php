<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Warehouse;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class WarehouseTransferTest extends TestCase
{
    use RefreshDatabase;

    public function test_warehouse_transfer_updates_used_capacity_and_creates_log(): void
    {
        $this->seed(DatabaseSeeder::class);

        $user = User::where('email', 'admin@bestsol.az')->firstOrFail();
        Sanctum::actingAs($user);

        $fromWarehouse = Warehouse::where('code', 'WH-001')->firstOrFail();
        $toWarehouse = Warehouse::where('code', 'WH-002')->firstOrFail();

        $response = $this->postJson('/api/warehouses/transfer', [
            'from_warehouse_id' => $fromWarehouse->id,
            'to_warehouse_id' => $toWarehouse->id,
            'quantity' => 200,
            'note' => 'Test transfer',
            'transfer_date' => now()->toDateString(),
        ]);

        $response->assertCreated();

        $fromWarehouse->refresh();
        $toWarehouse->refresh();

        $this->assertSame(9000.0, (float) $fromWarehouse->used_capacity);
        $this->assertSame(5300.0, (float) $toWarehouse->used_capacity);
        $this->assertDatabaseHas('warehouse_transfers', [
            'from_warehouse_id' => $fromWarehouse->id,
            'to_warehouse_id' => $toWarehouse->id,
            'quantity' => 200,
        ]);
    }
}
