<?php

namespace App\Services;

use App\Models\PriceCoefficient;
use App\Models\Product;
use App\Models\Supplier;

class PricingService
{
    public function resolveCoefficient(Product $product, ?Supplier $supplier = null): PriceCoefficient
    {
        return PriceCoefficient::query()
            ->where('status', 'active')
            ->whereDate('active_from', '<=', now()->toDateString())
            ->where(function ($query) use ($product, $supplier): void {
                $query->whereNull('category_id')->orWhere('category_id', $product->category_id);
            })
            ->where(function ($query) use ($product): void {
                $query->whereNull('brand_id')->orWhere('brand_id', $product->brand_id);
            })
            ->where(function ($query) use ($supplier): void {
                $query->whereNull('supplier_id');

                if ($supplier) {
                    $query->orWhere('supplier_id', $supplier->id);
                }
            })
            ->orderByDesc('supplier_id')
            ->orderByDesc('brand_id')
            ->orderByDesc('category_id')
            ->orderByDesc('active_from')
            ->firstOr(function (): PriceCoefficient {
                return new PriceCoefficient([
                    'category_coefficient' => 1,
                    'supplier_coefficient' => 1,
                    'brand_coefficient' => 1,
                    'company_coefficient' => 1,
                    'vat_percent' => 18,
                ]);
            });
    }

    public function calculateProductPricing(Product $product, float $purchasePrice, ?Supplier $supplier = null): array
    {
        $coefficient = $this->resolveCoefficient($product, $supplier);

        $costBase = $purchasePrice * (float) $coefficient->category_coefficient * (float) $coefficient->supplier_coefficient;
        $purchaseBase = $costBase * (float) $coefficient->category_coefficient * (float) $coefficient->brand_coefficient * (float) $coefficient->company_coefficient;
        $cashSalePrice = $purchaseBase * (1 + ((float) $coefficient->vat_percent / 100));

        return [
            'cost_price' => round($costBase, 2),
            'official_sale_price' => round($purchaseBase, 2),
            'cash_sale_price' => round($cashSalePrice, 2),
            'vat_percent' => (float) $coefficient->vat_percent,
        ];
    }
}
