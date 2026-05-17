<?php

namespace App\Services;

use App\Models\Product;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use Illuminate\Support\Collection;

class PurchaseAnalysisService
{
    public function __construct(protected AnalyticsService $analytics)
    {
    }

    public function analyze(): array
    {
        $last30 = $this->analytics->rangeStart(30);
        $prev30Start = $this->analytics->rangeStart(60);
        $prev30End = $this->analytics->rangeStart(31);

        $purchaseItems = PurchaseItem::with(['product', 'purchase.supplier'])
            ->whereHas('purchase', fn ($query) => $query->whereDate('purchase_date', '>=', $this->analytics->rangeStart(180)))
            ->get();

        $comparison = $purchaseItems
            ->groupBy(fn (PurchaseItem $item) => $item->product_id)
            ->map(function (Collection $items) {
                $product = $items->first()?->product;
                $suppliers = $items->groupBy(fn (PurchaseItem $item) => $item->purchase?->supplier_id)
                    ->map(function (Collection $supplierItems) {
                        $supplier = $supplierItems->first()?->purchase?->supplier;
                        $avgPrice = round($supplierItems->avg('purchase_price'), 2);
                        $avgFinal = round($supplierItems->avg('final_unit_cost'), 2);
                        $fulfillment = round($supplierItems->avg(function (PurchaseItem $item) {
                            $ordered = (float) $item->order_quantity;
                            return $ordered > 0 ? ((float) $item->actual_received_quantity / $ordered) * 100 : 0;
                        }), 2);

                        return [
                            'supplier_id' => $supplier?->id,
                            'supplier_name' => $supplier?->name,
                            'avg_purchase_price' => $avgPrice,
                            'avg_final_unit_cost' => $avgFinal,
                            'fulfillment_rate' => $fulfillment,
                            'orders' => $supplierItems->count(),
                        ];
                    })->sortBy('avg_purchase_price')->values();

                return [
                    'product_id' => $product?->id,
                    'product_name' => $product?->name,
                    'suppliers' => $suppliers->all(),
                    'best_supplier' => $suppliers->first(),
                ];
            })->values();

        $currentPrices = PurchaseItem::query()
            ->selectRaw('product_id, AVG(purchase_price) as avg_price')
            ->whereHas('purchase', fn ($query) => $query->whereDate('purchase_date', '>=', $last30))
            ->groupBy('product_id')
            ->pluck('avg_price', 'product_id');

        $previousPrices = PurchaseItem::query()
            ->selectRaw('product_id, AVG(purchase_price) as avg_price')
            ->whereHas('purchase', fn ($query) => $query
                ->whereDate('purchase_date', '>=', $prev30Start)
                ->whereDate('purchase_date', '<=', $prev30End))
            ->groupBy('product_id')
            ->pluck('avg_price', 'product_id');

        $products = Product::all()->keyBy('id');

        $risingCosts = collect($currentPrices)->map(function ($avgPrice, $productId) use ($previousPrices, $products) {
            $previous = (float) ($previousPrices[$productId] ?? 0);
            if ($previous <= 0) {
                return null;
            }

            $change = round((((float) $avgPrice - $previous) / $previous) * 100, 2);
            if ($change <= 0) {
                return null;
            }

            return [
                'product_id' => (int) $productId,
                'product_name' => $products[$productId]?->name,
                'current_avg_purchase_price' => round((float) $avgPrice, 2),
                'previous_avg_purchase_price' => round($previous, 2),
                'change_percent' => $change,
            ];
        })->filter()->sortByDesc('change_percent')->values();

        $marginComparison = $products->map(function (Product $product) use ($currentPrices) {
            $purchasePrice = (float) ($currentPrices[$product->id] ?? $product->cost_price);
            $cashMargin = round((float) $product->cash_sale_price - $purchasePrice, 2);
            $officialMargin = round((float) $product->official_sale_price - $purchasePrice, 2);

            return [
                'product_id' => $product->id,
                'product_name' => $product->name,
                'purchase_price' => $purchasePrice,
                'cash_sale_price' => (float) $product->cash_sale_price,
                'official_sale_price' => (float) $product->official_sale_price,
                'cash_margin' => $cashMargin,
                'official_margin' => $officialMargin,
            ];
        })->sortBy('cash_margin')->values();

        $recommendations = [];
        if ($comparison->isNotEmpty() && !empty($comparison->first()['best_supplier'])) {
            $entry = $comparison->first();
            $best = $entry['best_supplier'];
            $recommendations[] = $this->analytics->recommendation(
                "{$entry['product_name']} üçün sərfəli təchizatçı seçimi görünür",
                "{$entry['product_name']} üçün ən ucuz orta alış qiyməti {$best['supplier_name']} tərəfindədir.",
                "Orta alış qiyməti {$best['avg_purchase_price']} AZN, fulfillment isə {$best['fulfillment_rate']}%-dir.",
                'medium',
                'Yeni alış sifarişlərində bu təchizatçını prioritetləşdirin.',
                'Alış maya dəyəri azalacaq.',
                'purchases',
                ['id' => $best['supplier_id'], 'type' => 'supplier']
            );
        }

        if ($risingCosts->isNotEmpty()) {
            $product = $risingCosts->first();
            $recommendations[] = $this->analytics->recommendation(
                "{$product['product_name']} üzrə alış qiyməti artır",
                "Bu məhsulun orta alış qiyməti son dövrdə yüksəlib.",
                "Qiymət dəyişimi {$product['change_percent']}% təşkil edib.",
                'high',
                'Qiymət yeniləməsi və ya alternativ təchizatçı müqayisəsi edin.',
                'Marjanın aşınması yavaşıyacaq.',
                'purchases',
                ['id' => $product['product_id'], 'type' => 'product']
            );
        }

        return [
            'supplier_comparison' => $this->analytics->topCollection($comparison, 6),
            'cheapest_suppliers' => $comparison->map(fn (array $row) => [
                'product_id' => $row['product_id'],
                'product_name' => $row['product_name'],
                'best_supplier' => $row['best_supplier'],
            ])->take(6)->values()->all(),
            'quality_price_notes' => [
                'message' => 'Sistemdə təchizatçı keyfiyyət balı və çatdırılma lead-time sahəsi yoxdur. Mövcud dataya əsasən fulfillment rate və orta alış qiyməti müqayisə olunub.',
            ],
            'rising_purchase_prices' => $this->analytics->topCollection($risingCosts, 6),
            'margin_comparison' => $this->analytics->topCollection($marginComparison, 8),
            'recommendations' => $recommendations,
        ];
    }
}
