<?php

namespace App\Services;

use App\Models\Product;
use App\Models\PurchaseItem;
use App\Models\SaleItem;
use App\Models\Stock;
use Illuminate\Support\Collection;

class ProductAnalysisService
{
    public function __construct(protected AnalyticsService $analytics)
    {
    }

    public function analyze(): array
    {
        $last30 = $this->analytics->rangeStart(30);
        $last90 = $this->analytics->rangeStart(90);
        $prev30Start = $this->analytics->rangeStart(60);
        $prev30End = $this->analytics->rangeStart(31);

        $products = Product::with('stock', 'category', 'brand')->get()->keyBy('id');

        $sales = SaleItem::query()
            ->selectRaw('product_id, SUM(quantity) as qty, SUM(total_price) as revenue')
            ->whereHas('sale', fn ($query) => $query->whereDate('sale_date', '>=', $last90))
            ->groupBy('product_id')
            ->get()
            ->keyBy('product_id');

        $sales30 = SaleItem::query()
            ->selectRaw('product_id, SUM(quantity) as qty, SUM(total_price) as revenue')
            ->whereHas('sale', fn ($query) => $query->whereDate('sale_date', '>=', $last30))
            ->groupBy('product_id')
            ->get()
            ->keyBy('product_id');

        $lastSoldDates = SaleItem::query()
            ->selectRaw('product_id, MAX(sales.sale_date) as last_sale_date')
            ->join('sales', 'sales.id', '=', 'sale_items.sale_id')
            ->groupBy('product_id')
            ->pluck('last_sale_date', 'product_id');

        $purchaseCurrent = PurchaseItem::query()
            ->selectRaw('product_id, AVG(purchase_price) as avg_price')
            ->whereHas('purchase', fn ($query) => $query->whereDate('purchase_date', '>=', $last30))
            ->groupBy('product_id')
            ->pluck('avg_price', 'product_id');

        $purchasePrevious = PurchaseItem::query()
            ->selectRaw('product_id, AVG(purchase_price) as avg_price')
            ->whereHas('purchase', fn ($query) => $query
                ->whereDate('purchase_date', '>=', $prev30Start)
                ->whereDate('purchase_date', '<=', $prev30End))
            ->groupBy('product_id')
            ->pluck('avg_price', 'product_id');

        $rows = $products->map(function (Product $product) use ($sales, $sales30, $lastSoldDates, $purchaseCurrent, $purchasePrevious) {
            $stock = $product->stock;
            $sales90 = $sales->get($product->id);
            $salesRecent = $sales30->get($product->id);
            $qty90 = (float) ($sales90->qty ?? 0);
            $qty30 = (float) ($salesRecent->qty ?? 0);
            $revenue90 = (float) ($sales90->revenue ?? 0);
            $revenue30 = (float) ($salesRecent->revenue ?? 0);
            $cost = (float) $product->cost_price;
            $profit30 = round($revenue30 - ($qty30 * $cost), 2);
            $margin30 = $revenue30 > 0 ? round(($profit30 / $revenue30) * 100, 2) : 0;
            $realStock = (float) ($stock?->real_quantity ?? 0);
            $minimum = (float) ($stock?->minimum_quantity ?? $product->minimum_stock);
            $dailyVelocity = round($qty30 / 30, 3);
            $daysLeft = $dailyVelocity > 0 ? round($realStock / $dailyVelocity, 1) : null;
            $currentPurchase = (float) ($purchaseCurrent[$product->id] ?? 0);
            $previousPurchase = (float) ($purchasePrevious[$product->id] ?? 0);
            $purchaseIncreasePercent = $previousPurchase > 0
                ? round((($currentPurchase - $previousPurchase) / $previousPurchase) * 100, 2)
                : null;

            return [
                'id' => $product->id,
                'name' => $product->name,
                'product_code' => $product->product_code,
                'category' => $product->category?->name,
                'brand' => $product->brand?->name,
                'cash_sale_price' => (float) $product->cash_sale_price,
                'official_sale_price' => (float) $product->official_sale_price,
                'cost_price' => $cost,
                'real_stock' => $realStock,
                'minimum_stock' => $minimum,
                'qty_90d' => $qty90,
                'qty_30d' => $qty30,
                'revenue_30d' => $revenue30,
                'profit_30d' => $profit30,
                'margin_30d' => $margin30,
                'last_sale_date' => $lastSoldDates[$product->id] ?? null,
                'days_left' => $daysLeft,
                'purchase_price_change_percent' => $purchaseIncreasePercent,
            ];
        })->values();

        $deadStock = $rows->filter(fn (array $row) => $row['real_stock'] > 0 && (($row['last_sale_date'] === null) || $row['qty_90d'] <= 0))
            ->sortByDesc('real_stock')->values();
        $slowMoving = $rows->sortBy('qty_30d')->values();
        $topSelling = $rows->sortByDesc('qty_30d')->values();
        $longUnsold = $rows->filter(function (array $row) {
            if (!$row['last_sale_date']) {
                return true;
            }
            return now()->diffInDays($row['last_sale_date']) >= 45;
        })->sortByDesc('real_stock')->values();
        $overstock = $rows->filter(fn (array $row) => $row['real_stock'] > max($row['minimum_stock'] * 3, 20) && $row['qty_30d'] <= 2)
            ->sortByDesc('real_stock')->values();
        $critical = $rows->filter(fn (array $row) => $row['real_stock'] <= $row['minimum_stock'])
            ->sortBy('real_stock')->values();
        $discountCandidates = $overstock->merge($deadStock)->unique('id')->values();
        $priceIncreaseCandidates = $rows->filter(fn (array $row) => $row['qty_30d'] >= 10 && $row['margin_30d'] < 18)
            ->sortBy('margin_30d')->values();
        $highPurchaseCost = $rows->filter(fn (array $row) => ($row['purchase_price_change_percent'] ?? 0) >= 10)
            ->sortByDesc('purchase_price_change_percent')->values();
        $lossMaking = $rows->filter(fn (array $row) => $row['profit_30d'] < 0 || ($row['margin_30d'] > 0 && $row['margin_30d'] < 10))
            ->sortBy('margin_30d')->values();

        $recommendations = [];

        if ($critical->isNotEmpty()) {
            $product = $critical->first();
            $recommendations[] = $this->analytics->recommendation(
                "{$product['name']} kritik stokdadır",
                "{$product['name']} üzrə mövcud real stok minimum həddə çatıb.",
                "Cari stok {$product['real_stock']} ədəd, minimum hədd isə {$product['minimum_stock']} ədəddir.",
                'critical',
                'Təcili olaraq yenidən sifariş planı yaradın və təhlükəsizlik stokunu artırın.',
                'Satış itkisi və stok-out riski azalacaq.',
                'products',
                ['id' => $product['id'], 'type' => 'product']
            );
        }

        if ($discountCandidates->isNotEmpty()) {
            $product = $discountCandidates->first();
            $recommendations[] = $this->analytics->recommendation(
                "{$product['name']} üçün endirim kampaniyası düşünün",
                "{$product['name']} stokda çox qalıb və son dövrdə satışı zəifdir.",
                "Son 30 gündə satış {$product['qty_30d']} ədəd olub, stok isə {$product['real_stock']} ədəddir.",
                'high',
                '5-10% endirim və bundle təklifi yaradın.',
                'Ölü stokun pul dövriyyəsinə çevrilməsi sürətlənəcək.',
                'products',
                ['id' => $product['id'], 'type' => 'product']
            );
        }

        if ($priceIncreaseCandidates->isNotEmpty()) {
            $product = $priceIncreaseCandidates->first();
            $recommendations[] = $this->analytics->recommendation(
                "{$product['name']} qiymət optimizasiyasına uyğundur",
                "{$product['name']} yaxşı satılır, amma marjası aşağıdır.",
                "Son 30 gündə {$product['qty_30d']} ədəd satılıb və marja {$product['margin_30d']}%-dir.",
                'medium',
                'Qiyməti mərhələli şəkildə 3-5% artırıb konversiyanı izləyin.',
                'Mənfəət marjası yüksələcək.',
                'products',
                ['id' => $product['id'], 'type' => 'product']
            );
        }

        return [
            'top_selling' => $this->analytics->topCollection($topSelling, 6),
            'least_selling' => $this->analytics->topCollection($slowMoving, 6),
            'dead_stock' => $this->analytics->topCollection($deadStock, 6),
            'long_unsold' => $this->analytics->topCollection($longUnsold, 6),
            'overstocked' => $this->analytics->topCollection($overstock, 6),
            'critical_stock' => $this->analytics->topCollection($critical, 6),
            'discount_candidates' => $this->analytics->topCollection($discountCandidates, 6),
            'price_increase_candidates' => $this->analytics->topCollection($priceIncreaseCandidates, 6),
            'high_purchase_cost' => $this->analytics->topCollection($highPurchaseCost, 6),
            'low_margin_or_loss_products' => $this->analytics->topCollection($lossMaking, 6),
            'recommendations' => $recommendations,
        ];
    }
}
