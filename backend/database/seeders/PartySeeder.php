<?php

namespace Database\Seeders;

use App\Models\Customer;
use App\Models\Supplier;
use Illuminate\Database\Seeder;

class PartySeeder extends Seeder
{
    public function run(): void
    {
        foreach ([
            ['name' => 'AutoServis Bakı MMC', 'phone' => '+994505551234', 'email' => 'info@autoservis.az', 'address' => 'Bakı, Nərimanov r., Atatürk pr. 45', 'total_debt' => 650],
            ['name' => 'Premium Auto LLC', 'phone' => '+994556667890', 'email' => 'contact@premiumauto.az', 'address' => 'Bakı, Xətai r., Babək pr. 120', 'total_debt' => 0],
            ['name' => 'Qaraj Plus', 'phone' => '+994704445678', 'email' => 'qarajplus@mail.az', 'address' => 'Sumqayıt, Sülh küç. 15', 'total_debt' => 490],
        ] as $customer) {
            Customer::updateOrCreate(
                ['phone' => $customer['phone']],
                $customer + ['status' => 'active']
            );
        }

        foreach ([
            ['name' => 'Global Tire Import', 'phone' => '+994125550001', 'email' => 'orders@globaltire.az', 'address' => 'Bakı', 'total_debt' => 3000],
            ['name' => 'LubeOil Distribution', 'phone' => '+994125550002', 'email' => 'sales@lubeoil.az', 'address' => 'Bakı', 'total_debt' => 0],
            ['name' => 'AutoParts Europe', 'phone' => '+994125550003', 'email' => 'procurement@autoparts.eu', 'address' => 'Bakı', 'total_debt' => 1500],
        ] as $supplier) {
            Supplier::updateOrCreate(
                ['phone' => $supplier['phone']],
                $supplier + ['status' => 'active']
            );
        }
    }
}
