<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\Sale;

class CustomerAnalysisService
{
    public function __construct(protected AnalyticsService $analytics)
    {
    }

    public function analyze(): array
    {
        $last60 = $this->analytics->rangeStart(60);
        $last120 = $this->analytics->rangeStart(120);

        $rows = Customer::with('assignedUser')->get()->map(function (Customer $customer) use ($last60, $last120) {
            $sales = Sale::query()->where('customer_id', $customer->id)->get();
            $lastSale = $sales->max('sale_date');
            $revenue120 = (float) Sale::query()->where('customer_id', $customer->id)->whereDate('sale_date', '>=', $last120)->sum('total_amount');
            $orders120 = Sale::query()->where('customer_id', $customer->id)->whereDate('sale_date', '>=', $last120)->count();

            return [
                'customer_id' => $customer->id,
                'name' => $customer->name,
                'phone' => $customer->phone,
                'email' => $customer->email,
                'status' => $customer->status,
                'assigned_user' => $customer->assignedUser?->name,
                'total_debt' => (float) $customer->total_debt,
                'orders_120d' => $orders120,
                'revenue_120d' => round($revenue120, 2),
                'last_sale_date' => $lastSale,
                'inactive_days' => $lastSale ? now()->diffInDays($lastSale) : null,
            ];
        })->values();

        $topCustomers = $rows->sortByDesc('revenue_120d')->values();
        $inactive = $rows->filter(fn (array $row) => $row['inactive_days'] === null || $row['inactive_days'] >= 60)->sortByDesc('revenue_120d')->values();
        $debtors = $rows->filter(fn (array $row) => $row['total_debt'] > 0)->sortByDesc('total_debt')->values();
        $vip = $rows->filter(fn (array $row) => $row['revenue_120d'] > 0 && $row['orders_120d'] >= 3)->sortByDesc('revenue_120d')->values();
        $campaign = $inactive->filter(fn (array $row) => $row['revenue_120d'] > 0)->values();
        $risky = $rows->filter(fn (array $row) => $row['total_debt'] > 0 && (($row['inactive_days'] ?? 999) > 30))->sortByDesc('total_debt')->values();

        $recommendations = [];
        if ($campaign->isNotEmpty()) {
            $customer = $campaign->first();
            $recommendations[] = $this->analytics->recommendation(
                "{$customer['name']} yenidən aktivləşdirilə bilər",
                "Bu müştəri əvvəllər alış edib, amma son dövrdə passivdir.",
                "Son satışdan {$customer['inactive_days']} gün keçib, əvvəlki dövrdə {$customer['revenue_120d']} AZN alış edib.",
                'medium',
                'Endirim, yeni məhsul və ya fərdi kampaniya ilə əlaqə yaradın.',
                'Müştərinin geri dönüş ehtimalı yüksələcək.',
                'customers',
                ['id' => $customer['customer_id'], 'type' => 'customer']
            );
        }

        if ($risky->isNotEmpty()) {
            $customer = $risky->first();
            $recommendations[] = $this->analytics->recommendation(
                "{$customer['name']} riskli borclu müştəridir",
                "Borcu var və son aktivliyi zəifdir.",
                "Cari borc {$customer['total_debt']} AZN, son satışdan {$customer['inactive_days']} gün keçib.",
                'high',
                'Yığım planı və kredit limit qaydası tətbiq edin.',
                'Gecikmiş borc riski azalacaq.',
                'customers',
                ['id' => $customer['customer_id'], 'type' => 'customer']
            );
        }

        return [
            'top_customers' => $this->analytics->topCollection($topCustomers, 6),
            'inactive_customers' => $this->analytics->topCollection($inactive, 6),
            'debtors' => $this->analytics->topCollection($debtors, 6),
            'vip_customers' => $this->analytics->topCollection($vip, 6),
            'campaign_candidates' => $this->analytics->topCollection($campaign, 6),
            'risky_customers' => $this->analytics->topCollection($risky, 6),
            'recommendations' => $recommendations,
        ];
    }
}
