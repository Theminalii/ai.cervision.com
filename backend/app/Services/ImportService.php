<?php

namespace App\Services;

use App\Models\CashAccount;
use App\Models\Category;
use App\Models\Customer;
use App\Models\PriceCoefficient;
use App\Models\Product;
use App\Models\Stock;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class ImportService
{
    public function importProducts(array $rows): void
    {
        foreach ($rows as $row) {
            Product::updateOrCreate(
                ['product_code' => $row['product_code']],
                $row
            );
        }
    }

    public function importCustomers(array $rows): void
    {
        foreach ($rows as $row) {
            Customer::updateOrCreate(['phone' => $row['phone']], $row);
        }
    }

    public function importStocks(array $rows): void
    {
        foreach ($rows as $row) {
            Stock::updateOrCreate(['product_id' => $row['product_id']], $row);
        }
    }

    public function importBalances(array $data, ?User $user = null): void
    {
        DB::transaction(function () use ($data, $user): void {
            CashAccount::where('type', 'cash')->update(['balance' => (float) ($data['cash_balance'] ?? 0)]);
            CashAccount::where('type', 'bank')->update(['balance' => (float) ($data['bank_balance'] ?? 0)]);

            \App\Models\InitialBalance::create([
                'bank_balance' => (float) ($data['bank_balance'] ?? 0),
                'cash_balance' => (float) ($data['cash_balance'] ?? 0),
                'customer_debts' => (float) ($data['customer_debts'] ?? 0),
                'supplier_debts' => (float) ($data['supplier_debts'] ?? 0),
                'stock_value' => (float) ($data['stock_value'] ?? 0),
                'imported_by' => $user?->id,
            ]);
        });
    }

    public function importDebts(array $rows): void
    {
        foreach ($rows as $row) {
            if (($row['type'] ?? 'customer') === 'supplier') {
                Supplier::whereKey($row['id'])->update(['total_debt' => $row['total_debt']]);
            } else {
                Customer::whereKey($row['id'])->update(['total_debt' => $row['total_debt']]);
            }
        }
    }

    public function importCoefficients(array $rows): void
    {
        foreach ($rows as $row) {
            PriceCoefficient::updateOrCreate(
                [
                    'category_id' => $row['category_id'] ?? null,
                    'brand_id' => $row['brand_id'] ?? null,
                    'supplier_id' => $row['supplier_id'] ?? null,
                    'active_from' => $row['active_from'],
                ],
                $row
            );
        }
    }
}
