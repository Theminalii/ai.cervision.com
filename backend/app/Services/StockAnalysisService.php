<?php

namespace App\Services;

use App\Models\Product;
use App\Models\Stock;
use App\Models\Warehouse;
use App\Models\WarehouseTransfer;

class StockAnalysisService
{
    public function __construct(protected AnalyticsService $analytics)
    {
    }

    public function analyze(): array
    {
        $last30 = $this->analytics->rangeStart(30);
        $salesStats = Product::with('stock')->get()->map(function (Product $product) use ($last30) {
            $qty30 = (float) $product->saleItems()->whereHas('sale', fn ($query) => $query->whereDate('sale_date', '>=', $last30))->sum('quantity');
            $realStock = (float) ($product->stock?->real_quantity ?? 0);
            $minimum = (float) ($product->stock?->minimum_quantity ?? $product->minimum_stock);
            $dailyVelocity = round($qty30 / 30, 3);
            $daysLeft = $dailyVelocity > 0 ? round($realStock / $dailyVelocity, 1) : null;
            $recommendedOrder = $dailyVelocity > 0
                ? max(0, round(($dailyVelocity * 21) - $realStock, 0))
                : 0;

            return [
                'product_id' => $product->id,
                'product_name' => $product->name,
                'real_stock' => $realStock,
                'minimum_stock' => $minimum,
                'sold_30d' => $qty30,
                'daily_velocity' => $dailyVelocity,
                'days_left' => $daysLeft,
                'recommended_order_quantity' => $recommendedOrder,
                'turnover_ratio' => $realStock > 0 ? round($qty30 / max($realStock, 1), 2) : 0,
            ];
        });

        $critical = $salesStats->filter(fn (array $row) => $row['real_stock'] <= $row['minimum_stock'])->sortBy('real_stock')->values();
        $excess = $salesStats->filter(fn (array $row) => $row['real_stock'] > max($row['minimum_stock'] * 3, 20) && $row['sold_30d'] <= 2)->sortByDesc('real_stock')->values();
        $deadStock = $salesStats->filter(fn (array $row) => $row['real_stock'] > 0 && $row['sold_30d'] <= 0)->sortByDesc('real_stock')->values();
        $fastMoving = $salesStats->sortByDesc('sold_30d')->values();
        $reorderPlan = $salesStats->filter(fn (array $row) => $row['recommended_order_quantity'] > 0)->sortByDesc('recommended_order_quantity')->values();

        $warehouses = Warehouse::all()->map(function (Warehouse $warehouse) {
            $transferCount = WarehouseTransfer::query()
                ->where('from_warehouse_id', $warehouse->id)
                ->orWhere('to_warehouse_id', $warehouse->id)
                ->count();

            $utilization = (float) $warehouse->capacity > 0
                ? round(((float) $warehouse->used_capacity / (float) $warehouse->capacity) * 100, 2)
                : 0;

            return [
                'warehouse_id' => $warehouse->id,
                'name' => $warehouse->name,
                'code' => $warehouse->code,
                'status' => $warehouse->status,
                'utilization_percent' => $utilization,
                'transfer_count' => $transferCount,
                'manager_name' => $warehouse->manager_name,
            ];
        })->sortByDesc('transfer_count')->values();

        $recommendations = [];

        if ($critical->isNotEmpty()) {
            $item = $critical->first();
            $recommendations[] = $this->analytics->recommendation(
                "{$item['product_name']} üçün sifariş açılmalıdır",
                "{$item['product_name']} üzrə stok tükənmə riski yaranıb.",
                "Stok {$item['real_stock']} ədəd, proqnoz qalan gün {$item['days_left']} gündür.",
                'critical',
                "Ən azı {$item['recommended_order_quantity']} ədəd sifariş planlayın.",
                'Stok-out və təcili alış riski azalacaq.',
                'stocks',
                ['id' => $item['product_id'], 'type' => 'product']
            );
        }

        if ($warehouses->isNotEmpty()) {
            $problemWarehouse = $warehouses->sortByDesc('utilization_percent')->first();
            if (($problemWarehouse['utilization_percent'] ?? 0) >= 85) {
                $recommendations[] = $this->analytics->recommendation(
                    "{$problemWarehouse['name']} anbarında sıxlıq var",
                    "Anbarın istifadə səviyyəsi yüksəkdir.",
                    "Utilization {$problemWarehouse['utilization_percent']}% səviyyəsinə çatıb.",
                    'high',
                    'Transfer və ya yenidən yerləşdirmə planı hazırlayın.',
                    'Anbar darboğazı və yerləşdirmə problemi azalacaq.',
                    'warehouses',
                    ['id' => $problemWarehouse['warehouse_id'], 'type' => 'warehouse']
                );
            }
        }

        return [
            'critical_stock' => $this->analytics->topCollection($critical, 6),
            'excess_stock' => $this->analytics->topCollection($excess, 6),
            'dead_stock' => $this->analytics->topCollection($deadStock, 6),
            'fast_moving' => $this->analytics->topCollection($fastMoving, 6),
            'stock_turnover' => $this->analytics->topCollection($salesStats->sortByDesc('turnover_ratio')->values(), 8),
            'days_of_stock_left' => $this->analytics->topCollection($salesStats->sortBy('days_left')->filter(fn (array $row) => $row['days_left'] !== null)->values(), 8),
            'reorder_plan' => $this->analytics->topCollection($reorderPlan, 8),
            'warehouse_activity' => $this->analytics->topCollection($warehouses, 6),
            'warehouse_notes' => [
                'message' => 'Məhsul-anbar səviyyəsində stok bölgüsü schema-da yoxdur. Anbar analizi transfer aktivliyi və capacity istifadəsinə əsaslanır.',
            ],
            'recommendations' => $recommendations,
        ];
    }
}
