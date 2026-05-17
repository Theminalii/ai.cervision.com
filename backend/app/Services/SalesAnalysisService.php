<?php

namespace App\Services;

use App\Models\Sale;
use App\Models\SaleItem;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class SalesAnalysisService
{
    public function __construct(protected AnalyticsService $analytics)
    {
    }

    public function analyze(): array
    {
        $last30 = $this->analytics->rangeStart(30);
        $monthStart = $this->analytics->monthStart();

        $sales = Sale::with(['items.product', 'customer', 'user'])
            ->whereDate('sale_date', '>=', $this->analytics->rangeStart(120))
            ->get();

        $sales30 = $sales->filter(fn (Sale $sale) => $sale->sale_date->gte($last30));
        $salesMonth = $sales->filter(fn (Sale $sale) => $sale->sale_date->gte($monthStart));

        $daily = $sales30->groupBy(fn (Sale $sale) => $sale->sale_date->toDateString())
            ->map(fn (Collection $items, string $date) => [
                'date' => $date,
                'total_sales' => round($items->sum('total_amount'), 2),
                'transactions' => $items->count(),
            ])->sortBy('date')->values();

        $weekdayStats = $sales30->groupBy(fn (Sale $sale) => $sale->sale_date->format('l'))
            ->map(fn (Collection $items, string $weekday) => [
                'weekday' => $weekday,
                'sales_total' => round($items->sum('total_amount'), 2),
                'avg_ticket' => $items->count() > 0 ? round($items->sum('total_amount') / $items->count(), 2) : 0,
                'transactions' => $items->count(),
            ])->sortByDesc('sales_total')->values();

        $productStats = collect();
        foreach ($sales30 as $sale) {
            foreach ($sale->items as $item) {
                $existing = $productStats->get($item->product_id, [
                    'product_id' => $item->product_id,
                    'name' => $item->product?->name,
                    'quantity' => 0,
                    'revenue' => 0,
                    'profit' => 0,
                ]);

                $cost = (float) ($item->product?->cost_price ?? 0);
                $existing['quantity'] += (float) $item->quantity;
                $existing['revenue'] += (float) $item->total_price;
                $existing['profit'] += round(((float) $item->unit_price - $cost) * (float) $item->quantity, 2);
                $productStats->put($item->product_id, $existing);
            }
        }

        $topRevenue = $productStats->sortByDesc('revenue')->values();
        $topProfit = $productStats->sortByDesc('profit')->values();

        $bundleCounts = [];
        foreach ($sales30 as $sale) {
            $productIds = $sale->items->pluck('product_id')->unique()->values()->all();
            sort($productIds);
            for ($i = 0; $i < count($productIds); $i++) {
                for ($j = $i + 1; $j < count($productIds); $j++) {
                    $key = $this->analytics->pairKey($productIds[$i], $productIds[$j]);
                    $bundleCounts[$key] = ($bundleCounts[$key] ?? 0) + 1;
                }
            }
        }

        $bundleRows = collect($bundleCounts)->map(function (int $count, string $key) use ($sales30) {
            [$first, $second] = array_map('intval', explode(':', $key));
            $firstItem = SaleItem::with('product')->where('product_id', $first)->first();
            $secondItem = SaleItem::with('product')->where('product_id', $second)->first();

            return [
                'pair_key' => $key,
                'count' => $count,
                'products' => [
                    ['id' => $first, 'name' => $firstItem?->product?->name],
                    ['id' => $second, 'name' => $secondItem?->product?->name],
                ],
            ];
        })->sortByDesc('count')->values();

        $weakDays = $weekdayStats->sortBy('sales_total')->values();
        $recommendations = [];

        if ($weakDays->isNotEmpty()) {
            $day = $weakDays->first();
            $recommendations[] = $this->analytics->recommendation(
                "{$day['weekday']} satışları zəifdir",
                "Bu gün üzrə satış performansı digər günlərlə müqayisədə aşağıdır.",
                "{$day['weekday']} günlərində son 30 gündə cəmi {$day['sales_total']} AZN satış olub.",
                'medium',
                'Həmin gün üçün xüsusi kampaniya və ya bundle təklifi planlaşdırın.',
                'Zəif günlərdə trafik və çevrilmə yüksələ bilər.',
                'sales'
            );
        }

        if ($topProfit->isNotEmpty()) {
            $product = $topProfit->first();
            $recommendations[] = $this->analytics->recommendation(
                "{$product['name']} əsas mənfəət məhsuludur",
                "Bu məhsul ən yüksək mənfəət yaradan məhsullar arasındadır.",
                "Son 30 gündə mənfəət töhfəsi {$product['profit']} AZN olub.",
                'high',
                'Bu məhsulu vitrin, POS və kampaniyalarda daha görünən edin.',
                'Yüksək marjalı satışların payı artacaq.',
                'sales',
                ['id' => $product['product_id'], 'type' => 'product']
            );
        }

        return [
            'daily_performance' => $daily->all(),
            'weekly_performance' => $this->aggregateByWeek($sales30),
            'monthly_performance' => $this->aggregateByMonth($sales),
            'top_revenue_products' => $this->analytics->topCollection($topRevenue, 6),
            'top_profit_products' => $this->analytics->topCollection($topProfit, 6),
            'weak_periods' => $this->analytics->topCollection($weakDays, 3),
            'best_weekdays' => $this->analytics->topCollection($weekdayStats, 3),
            'frequently_bought_together' => $this->analytics->topCollection($bundleRows, 5),
            'campaign_candidates' => $this->analytics->topCollection($topRevenue->slice(2), 4),
            'month_sales_total' => round($salesMonth->sum('total_amount'), 2),
            'month_transactions' => $salesMonth->count(),
            'recommendations' => $recommendations,
        ];
    }

    protected function aggregateByWeek(Collection $sales): array
    {
        return $sales->groupBy(fn (Sale $sale) => Carbon::parse($sale->sale_date)->startOfWeek()->toDateString())
            ->map(fn (Collection $items, string $week) => [
                'week_start' => $week,
                'total_sales' => round($items->sum('total_amount'), 2),
                'transactions' => $items->count(),
            ])->sortBy('week_start')->values()->all();
    }

    protected function aggregateByMonth(Collection $sales): array
    {
        return $sales->groupBy(fn (Sale $sale) => Carbon::parse($sale->sale_date)->format('Y-m'))
            ->map(fn (Collection $items, string $month) => [
                'month' => $month,
                'total_sales' => round($items->sum('total_amount'), 2),
                'transactions' => $items->count(),
            ])->sortBy('month')->values()->all();
    }
}
