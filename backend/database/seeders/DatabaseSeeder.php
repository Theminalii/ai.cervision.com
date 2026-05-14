<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            RolePermissionSeeder::class,
            CatalogSeeder::class,
            PartySeeder::class,
            FinanceSeeder::class,
            WarehouseSeeder::class,
        ]);

        $superAdminRole = Role::where('name', 'Super Admin')->first();

        User::updateOrCreate([
            'email' => 'admin@bestsol.az',
        ], [
            'name' => 'BESTSOL Super Admin',
            'password' => Hash::make('password'),
            'role_id' => $superAdminRole?->id,
            'status' => 'active',
            'email_verified_at' => now(),
        ]);
    }
}
