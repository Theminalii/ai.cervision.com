<?php

namespace App\Services;

use App\Models\Product;
use App\Models\Purchase;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class PurchaseService
{
    public function __construct(
        protected FinanceService $financeService,
        protected StockService $stockService,
        protected DebtService $debtService,
        protected PricingService $pricingService,
    ) {
    }

    public function create(array $data, User $user): Purchase
    {
        return DB::transaction(function () use ($data, $user): Purchase {
            $supplier = Supplier::findOrFail($data['supplier_id']);
            $baseItems = collect($data['items'])->map(function (array $item) {
                $product = Product::findOrFail($item['product_id']);
                $orderQuantity = (float) $item['order_quantity'];
                $actualReceivedQuantity = (float) $item['actual_received_quantity'];
                $purchasePrice = (float) $item['purchase_price'];

                if ($actualReceivedQuantity > $orderQuantity) {
                    throw new RuntimeException("{$product->name} üçün faktiki daxil olan miqdar sifariş miqdarından çox ola bilməz.");
                }

                return [
                    'product' => $product,
                    'order_quantity' => $orderQuantity,
                    'actual_received_quantity' => $actualReceivedQuantity,
                    'purchase_price' => $purchasePrice,
                    'base_total' => round($orderQuantity * $purchasePrice, 2),
                ];
            });

            $baseTotal = (float) $baseItems->sum('base_total');
            $extraCost = (float) ($data['road_cost'] ?? 0) + (float) ($data['customs_cost'] ?? 0);

            $items = $baseItems->map(function (array $item) use ($baseTotal, $extraCost, $supplier) {
                $share = $baseTotal > 0 ? ($item['base_total'] / $baseTotal) : 0;
                $distributedExtraCost = round($extraCost * $share, 2);
                $finalUnitCost = round(($item['base_total'] + $distributedExtraCost) / $item['order_quantity'], 2);

                $pricing = $this->pricingService->calculateProductPricing($item['product'], $finalUnitCost, $supplier);

                if ($item['product']->price_type === 'automatic') {
                    $item['product']->update($pricing);
                } else {
                    $item['product']->update([
                        'cost_price' => $pricing['cost_price'],
                    ]);
                }

                return $item + [
                    'distributed_extra_cost' => $distributedExtraCost,
                    'final_unit_cost' => $finalUnitCost,
                    'total_cost' => round($item['base_total'] + $distributedExtraCost, 2),
                ];
            });

            $totalAmount = round($items->sum('total_cost'), 2);
            $paidAmount = (float) ($data['paid_amount'] ?? 0);

            if ($paidAmount > $totalAmount) {
                throw new RuntimeException('Ödənilən məbləğ toplam satınalma məbləğini aşa bilməz.');
            }

            $debtAmount = round($totalAmount - $paidAmount, 2);

            $purchase = Purchase::create([
                'purchase_number' => $this->nextNumber(),
                'supplier_id' => $supplier->id,
                'payment_method' => $data['payment_method'],
                'total_amount' => $totalAmount,
                'paid_amount' => $paidAmount,
                'debt_amount' => $debtAmount,
                'road_cost' => (float) ($data['road_cost'] ?? 0),
                'customs_cost' => (float) ($data['customs_cost'] ?? 0),
                'purchase_date' => $data['purchase_date'],
                'note' => $data['note'] ?? null,
            ]);

            foreach ($items as $item) {
                $purchase->items()->create([
                    'product_id' => $item['product']->id,
                    'order_quantity' => $item['order_quantity'],
                    'actual_received_quantity' => $item['actual_received_quantity'],
                    'purchase_price' => $item['purchase_price'],
                    'distributed_extra_cost' => $item['distributed_extra_cost'],
                    'final_unit_cost' => $item['final_unit_cost'],
                    'total_cost' => $item['total_cost'],
                ]);

                $this->stockService->increase($item['product'], 'official', $item['order_quantity'], 'purchase', $purchase, $user, 'Satınalma daxilolması');
                $this->stockService->increase($item['product'], 'real', $item['actual_received_quantity'], 'purchase', $purchase, $user, 'Satınalma faktiki daxilolma');
            }

            if ($paidAmount > 0) {
                $account = $this->financeService->getAccountByType($data['payment_method']);
                $this->financeService->decreaseBalance(
                    $account,
                    $paidAmount,
                    'purchase',
                    $purchase->id,
                    "Satınalma ödənişi {$purchase->purchase_number}",
                    $purchase->purchase_date->toDateString()
                );
            }

            if ($debtAmount > 0) {
                $this->debtService->createDebt(
                    $supplier,
                    $debtAmount,
                    $purchase,
                    'Satınalmadan yaranan borc',
                    $purchase->purchase_date->toDateString()
                );
            }

            return $purchase->load(['supplier', 'items.product']);
        });
    }

    protected function nextNumber(): string
    {
        $nextId = (Purchase::max('id') ?? 0) + 1;

        return 'PR-' . str_pad((string) $nextId, 6, '0', STR_PAD_LEFT);
    }
}
