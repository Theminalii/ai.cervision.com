<?php

namespace Database\Seeders;

use App\Models\Warehouse;
use Illuminate\Database\Seeder;

class WarehouseSeeder extends Seeder
{
    public function run(): void
    {
        $warehouses = [
            [
                'name' => 'Mərkəzi Anbar',
                'code' => 'WH-001',
                'address' => 'Bakı, Binəqədi',
                'capacity' => 12000,
                'used_capacity' => 9200,
                'manager_name' => 'Aydın Quliyev',
                'status' => 'active',
            ],
            [
                'name' => 'Şimal Filialı',
                'code' => 'WH-002',
                'address' => 'Sumqayıt, Sənaye zonası',
                'capacity' => 8000,
                'used_capacity' => 5100,
                'manager_name' => 'Kamran Məmmədli',
                'status' => 'active',
            ],
            [
                'name' => 'Gəncə Anbarı',
                'code' => 'WH-003',
                'address' => 'Gəncə, Nizami rayonu',
                'capacity' => 6000,
                'used_capacity' => 5800,
                'manager_name' => 'Leyla Hüseynova',
                'status' => 'active',
            ],
        ];

        foreach ($warehouses as $warehouse) {
            Warehouse::updateOrCreate(
                ['code' => $warehouse['code']],
                $warehouse
            );
        }
    }
}
