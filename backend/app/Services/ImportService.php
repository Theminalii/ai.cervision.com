<?php

namespace App\Services;

use App\Models\Brand;
use App\Models\CashAccount;
use App\Models\Category;
use App\Models\Customer;
use App\Models\Purchase;
use App\Models\PriceCoefficient;
use App\Models\Product;
use App\Models\Sale;
use App\Models\Stock;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class ImportService
{
    public function __construct(
        protected StockService $stockService,
        protected SaleService $saleService,
        protected PurchaseService $purchaseService,
    ) {
    }

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

    public function importExcelProducts(array $rows, User $user): array
    {
        $created = 0;
        $skippedDuplicates = 0;

        DB::transaction(function () use ($rows, $user, &$created, &$skippedDuplicates): void {
            foreach ($rows as $row) {
                $productCode = trim((string) ($row['product_code'] ?? ''));
                if ($productCode === '') {
                    continue;
                }

                if (Product::where('product_code', $productCode)->exists()) {
                    $skippedDuplicates++;
                    continue;
                }

                $category = Category::firstOrCreate(
                    ['name' => trim((string) ($row['category_name'] ?? 'Adsız Kateqoriya'))],
                    ['status' => 'active']
                );

                $brand = Brand::firstOrCreate(
                    ['name' => trim((string) ($row['brand_name'] ?? 'Adsız Brend'))],
                    ['status' => 'active']
                );

                $product = Product::create([
                    'product_code' => $productCode,
                    'name' => trim((string) ($row['name'] ?? '')),
                    'description' => $row['description'] ?? null,
                    'category_id' => $category->id,
                    'brand_id' => $brand->id,
                    'cash_sale_price' => (float) ($row['cash_sale_price'] ?? 0),
                    'official_sale_price' => (float) ($row['official_sale_price'] ?? 0),
                    'price_type' => $row['price_type'] ?? 'automatic',
                    'cost_price' => (float) ($row['cost_price'] ?? 0),
                    'is_active' => (bool) ($row['is_active'] ?? true),
                    'minimum_stock' => (float) ($row['minimum_stock'] ?? 0),
                ]);

                Stock::create([
                    'product_id' => $product->id,
                    'minimum_quantity' => (float) ($row['minimum_stock'] ?? 0),
                ]);

                $initialRealQuantity = (float) ($row['initial_real_quantity'] ?? 0);
                $initialOfficialQuantity = (float) ($row['initial_official_quantity'] ?? 0);

                if ($initialRealQuantity > 0) {
                    $this->stockService->increase($product, 'real', $initialRealQuantity, 'adjustment', null, $user, 'Excel import ilkin real stok');
                }

                if ($initialOfficialQuantity > 0) {
                    $this->stockService->increase($product, 'official', $initialOfficialQuantity, 'adjustment', null, $user, 'Excel import ilkin rəsmi stok');
                }

                $created++;
            }
        });

        return [
            'created' => $created,
            'skipped_duplicates' => $skippedDuplicates,
            'skipped_errors' => 0,
            'message' => "{$created} məhsul əlavə edildi, {$skippedDuplicates} dublikat sətr keçirilmədi.",
        ];
    }

    public function importExcelSales(array $rows, User $user): array
    {
        $created = 0;
        $skippedDuplicates = 0;
        $groups = $this->groupRowsByKey($rows, 'sale_number', ['customer_name', 'sale_date', 'sale_type', 'payment_method', 'note']);

        foreach ($groups as $groupRows) {
            $first = $groupRows[0];
            $subtotal = round(collect($groupRows)->sum(fn (array $row) => (float) ($row['line_total'] ?? ((float) ($row['quantity'] ?? 0) * (float) ($row['unit_price'] ?? 0)))), 2);
            $duplicateExists = Sale::query()
                ->whereDate('sale_date', $first['sale_date'])
                ->where('total_amount', $subtotal)
                ->whereHas('customer', function ($query) use ($first): void {
                    $query->where('name', $first['customer_name'] ?? '');
                })
                ->exists();

            if ($duplicateExists) {
                $skippedDuplicates++;
                continue;
            }

            $customerId = null;
            $customerName = trim((string) ($first['customer_name'] ?? ''));
            if ($customerName !== '') {
                $phone = trim((string) ($first['customer_phone'] ?? ''));
                $customer = $phone !== ''
                    ? Customer::firstOrCreate(
                        ['phone' => $phone],
                        [
                            'name' => $customerName,
                            'email' => $first['customer_email'] ?? null,
                            'address' => null,
                            'status' => 'active',
                        ]
                    )
                    : Customer::firstOrCreate(
                        ['phone' => $this->placeholderPhone('sale', $customerName, $created + $skippedDuplicates)],
                        [
                            'name' => $customerName,
                            'email' => $first['customer_email'] ?? null,
                            'address' => null,
                            'status' => 'active',
                        ]
                    );

                $customerId = $customer->id;
            }

            $this->saleService->create([
                'customer_id' => $customerId,
                'sale_type' => $first['sale_type'] ?? 'cash',
                'payment_status' => $first['payment_status'] ?? 'paid',
                'payment_method' => $first['payment_method'] ?? 'cash',
                'paid_amount' => (float) ($first['paid_amount'] ?? $subtotal),
                'stock_output' => (bool) ($first['stock_output'] ?? true),
                'note' => $first['note'] ?? null,
                'sale_date' => $first['sale_date'],
                'items' => collect($groupRows)->map(fn (array $row) => [
                    'product_id' => (int) $row['product_id'],
                    'quantity' => (float) ($row['quantity'] ?? 0),
                    'unit_price' => (float) ($row['unit_price'] ?? 0),
                    'stock_type' => $row['stock_type'] ?? 'real',
                ])->all(),
            ], $user);

            $created++;
        }

        return [
            'created' => $created,
            'skipped_duplicates' => $skippedDuplicates,
            'skipped_errors' => 0,
            'message' => "{$created} satış əlavə edildi, {$skippedDuplicates} dublikat satış keçirilmədi.",
        ];
    }

    public function importExcelPurchases(array $rows, User $user): array
    {
        $created = 0;
        $skippedDuplicates = 0;
        $groups = $this->groupRowsByKey($rows, 'purchase_number', ['supplier_name', 'purchase_date', 'payment_method', 'note']);

        foreach ($groups as $groupRows) {
            $first = $groupRows[0];
            $subtotal = round(collect($groupRows)->sum(fn (array $row) => (float) ($row['order_quantity'] ?? 0) * (float) ($row['purchase_price'] ?? 0)), 2);
            $total = round($subtotal + (float) ($first['road_cost'] ?? 0) + (float) ($first['customs_cost'] ?? 0), 2);

            $duplicateExists = Purchase::query()
                ->whereDate('purchase_date', $first['purchase_date'])
                ->where('total_amount', $total)
                ->whereHas('supplier', function ($query) use ($first): void {
                    $query->where('name', $first['supplier_name'] ?? '');
                })
                ->exists();

            if ($duplicateExists) {
                $skippedDuplicates++;
                continue;
            }

            $supplierName = trim((string) ($first['supplier_name'] ?? ''));
            $phone = trim((string) ($first['supplier_phone'] ?? ''));
            $supplier = $phone !== ''
                ? Supplier::firstOrCreate(
                    ['phone' => $phone],
                    [
                        'name' => $supplierName,
                        'email' => $first['supplier_email'] ?? null,
                        'address' => null,
                        'status' => 'active',
                    ]
                )
                : Supplier::firstOrCreate(
                    ['phone' => $this->placeholderPhone('purchase', $supplierName, $created + $skippedDuplicates)],
                    [
                        'name' => $supplierName,
                        'email' => $first['supplier_email'] ?? null,
                        'address' => null,
                        'status' => 'active',
                    ]
                );

            $this->purchaseService->create([
                'supplier_id' => $supplier->id,
                'payment_method' => $first['payment_method'] ?? 'cash',
                'paid_amount' => (float) ($first['paid_amount'] ?? 0),
                'road_cost' => (float) ($first['road_cost'] ?? 0),
                'customs_cost' => (float) ($first['customs_cost'] ?? 0),
                'purchase_date' => $first['purchase_date'],
                'note' => $first['note'] ?? null,
                'items' => collect($groupRows)->map(fn (array $row) => [
                    'product_id' => (int) $row['product_id'],
                    'order_quantity' => (float) ($row['order_quantity'] ?? 0),
                    'actual_received_quantity' => (float) ($row['actual_received_quantity'] ?? 0),
                    'purchase_price' => (float) ($row['purchase_price'] ?? 0),
                ])->all(),
            ], $user);

            $created++;
        }

        return [
            'created' => $created,
            'skipped_duplicates' => $skippedDuplicates,
            'skipped_errors' => 0,
            'message' => "{$created} satınalma əlavə edildi, {$skippedDuplicates} dublikat alış keçirilmədi.",
        ];
    }

    protected function groupRowsByKey(array $rows, string $numberKey, array $fallbackKeys): array
    {
        return collect($rows)
            ->groupBy(function (array $row) use ($numberKey, $fallbackKeys): string {
                $number = trim((string) ($row[$numberKey] ?? ''));
                if ($number !== '') {
                    return $number;
                }

                return collect($fallbackKeys)
                    ->map(fn (string $key) => trim((string) ($row[$key] ?? '')))
                    ->implode('|');
            })
            ->values()
            ->map(fn ($group) => $group->values()->all())
            ->all();
    }

    protected function placeholderPhone(string $prefix, string $name, int $index): string
    {
        $slug = preg_replace('/[^a-z0-9]+/i', '', mb_strtolower($name)) ?: $prefix;

        return substr($prefix.'-'.$slug.'-'.$index.'-'.time(), 0, 50);
    }
}
