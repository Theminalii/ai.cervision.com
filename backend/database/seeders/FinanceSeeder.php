<?php

namespace Database\Seeders;

use App\Models\CashAccount;
use Illuminate\Database\Seeder;

class FinanceSeeder extends Seeder
{
    public function run(): void
    {
        CashAccount::updateOrCreate(
            ['name' => 'Nağd kassa'],
            ['type' => 'cash', 'balance' => 0, 'status' => 'active']
        );

        CashAccount::updateOrCreate(
            ['name' => 'Bank hesabı'],
            ['type' => 'bank', 'balance' => 0, 'status' => 'active']
        );
    }
}
