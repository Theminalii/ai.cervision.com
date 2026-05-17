<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class AiAgentService
{
    public function __construct(
        protected AnalyticsService $analytics,
        protected ProductAnalysisService $productAnalysis,
        protected SalesAnalysisService $salesAnalysis,
        protected PurchaseAnalysisService $purchaseAnalysis,
        protected StockAnalysisService $stockAnalysis,
        protected EmployeeAnalysisService $employeeAnalysis,
        protected CustomerAnalysisService $customerAnalysis,
        protected FinanceAnalysisService $financeAnalysis,
    ) {
    }

    public function overview(): array
    {
        $products = $this->productAnalysis->analyze();
        $sales = $this->salesAnalysis->analyze();
        $purchases = $this->purchaseAnalysis->analyze();
        $stocks = $this->stockAnalysis->analyze();
        $employees = $this->employeeAnalysis->analyze();
        $customers = $this->customerAnalysis->analyze();
        $finance = $this->financeAnalysis->analyze();

        $allRecommendations = collect([
            ...$products['recommendations'],
            ...$sales['recommendations'],
            ...$purchases['recommendations'],
            ...$stocks['recommendations'],
            ...$employees['recommendations'],
            ...$customers['recommendations'],
            ...$finance['recommendations'],
        ]);

        $riskCount = $allRecommendations->whereIn('impact_level', ['critical', 'high'])->count();
        $opportunityCount = $allRecommendations->whereIn('impact_level', ['medium', 'low'])->count();
        $healthScore = $this->analytics->score(
            100
            - (count($stocks['critical_stock']) * 6)
            - (count($products['dead_stock']) * 3)
            - (count($customers['risky_customers']) * 3)
            - (($finance['estimated_profit'] < 0 ? 15 : 0))
            - (($finance['customer_debt_total'] > $finance['total_revenue'] * 0.4 ? 10 : 0))
        );

        return [
            'health_score' => $healthScore,
            'key_risks' => $allRecommendations->whereIn('impact_level', ['critical', 'high'])->take(6)->values()->all(),
            'key_opportunities' => $allRecommendations->whereIn('impact_level', ['medium', 'low'])->take(6)->values()->all(),
            'dashboard_cards' => [
                ['title' => 'Top satılan məhsullar', 'value' => count($products['top_selling']), 'module' => 'products'],
                ['title' => 'Ölü stoklar', 'value' => count($products['dead_stock']), 'module' => 'stocks'],
                ['title' => 'Kritik stoklar', 'value' => count($stocks['critical_stock']), 'module' => 'stocks'],
                ['title' => 'Ən aktiv işçilər', 'value' => count($employees['most_active']), 'module' => 'users'],
                ['title' => 'Passiv işçilər', 'value' => count($employees['passive_users']), 'module' => 'users'],
                ['title' => 'Ən sərfəli təchizatçılar', 'value' => count($purchases['cheapest_suppliers']), 'module' => 'purchases'],
                ['title' => 'Zərərli məhsullar', 'value' => count($finance['loss_products']), 'module' => 'finance'],
                ['title' => 'Yüksək mənfəətli məhsullar', 'value' => count($finance['high_profit_products']), 'module' => 'finance'],
                ['title' => 'Bu ay satış', 'value' => $finance['total_revenue'], 'module' => 'sales'],
                ['title' => 'Bu ay mənfəət', 'value' => $finance['estimated_profit'], 'module' => 'finance'],
                ['title' => 'AI risk xəbərdarlıqları', 'value' => $riskCount, 'module' => 'ai-agent'],
                ['title' => 'AI fürsət tövsiyələri', 'value' => $opportunityCount, 'module' => 'ai-agent'],
            ],
            'recommendations' => $allRecommendations->values()->all(),
            'action_suggestions' => $allRecommendations->take(8)->map(function (array $recommendation) {
                return [
                    ...$recommendation,
                    'actions' => ['apply' => 'Tətbiq et', 'later' => 'Sonra', 'reject' => 'Rədd et'],
                ];
            })->values()->all(),
            'section_snapshots' => [
                'products' => [
                    'top_selling' => $products['top_selling'],
                    'dead_stock' => $products['dead_stock'],
                ],
                'sales' => [
                    'month_sales_total' => $sales['month_sales_total'],
                    'best_weekdays' => $sales['best_weekdays'],
                ],
                'finance' => [
                    'revenue' => $finance['total_revenue'],
                    'profit' => $finance['estimated_profit'],
                ],
            ],
        ];
    }

    public function chat(string $message): array
    {
        $context = [
            'overview' => $this->overview(),
            'products' => $this->productAnalysis->analyze(),
            'sales' => $this->salesAnalysis->analyze(),
            'purchases' => $this->purchaseAnalysis->analyze(),
            'stocks' => $this->stockAnalysis->analyze(),
            'employees' => $this->employeeAnalysis->analyze(),
            'customers' => $this->customerAnalysis->analyze(),
            'finance' => $this->financeAnalysis->analyze(),
        ];

        $reply = $this->askOpenAi($message, $context);
        if (!$reply) {
            $reply = $this->fallbackChatReply($message, $context);
        }

        return [
            'message' => $reply,
            'used_ai' => (bool) $this->openAiEnabled(),
        ];
    }

    public function recommendations(?string $focus = null): array
    {
        $overview = $this->overview();
        $recommendations = collect($overview['recommendations']);

        if ($focus) {
            $recommendations = $recommendations->filter(fn (array $item) => $item['module'] === $focus);
        }

        return [
            'recommendations' => $recommendations->values()->all(),
            'summary' => $this->askOpenAi(
                'Bu tövsiyələri qısa şəkildə prioritetləşdir.',
                ['recommendations' => $recommendations->values()->all()]
            ) ?? 'Tövsiyələr təsir səviyyəsinə görə sıralanıb. Əvvəlcə critical və high təsirli bəndləri icra edin.',
        ];
    }

    protected function openAiEnabled(): bool
    {
        return filled(env('OPENAI_API_KEY'));
    }

    protected function askOpenAi(string $message, array $context): ?string
    {
        if (!$this->openAiEnabled()) {
            return null;
        }

        try {
            $response = Http::connectTimeout(3)
                ->timeout(12)
                ->withToken((string) env('OPENAI_API_KEY'))
                ->post('https://api.openai.com/v1/responses', [
                    'model' => env('OPENAI_AI_AGENT_MODEL', 'gpt-5.2'),
                    'input' => [
                        [
                            'role' => 'system',
                            'content' => [[
                                'type' => 'input_text',
                                'text' => 'You are an ERP business analyst. Use only the provided structured context. If context is insufficient, say so clearly. Respond in Azerbaijani.',
                            ]],
                        ],
                        [
                            'role' => 'user',
                            'content' => [[
                                'type' => 'input_text',
                                'text' => json_encode([
                                    'question' => $message,
                                    'context' => $context,
                                ], JSON_UNESCAPED_UNICODE),
                            ]],
                        ],
                    ],
                ]);

            if (!$response->successful()) {
                return null;
            }

            return trim((string) ($response->json('output_text') ?? '')) ?: null;
        } catch (Throwable $exception) {
            Log::warning('AI Agent OpenAI sorğusu uğursuz oldu.', ['message' => $exception->getMessage()]);
            return null;
        }
    }

    protected function fallbackChatReply(string $message, array $context): string
    {
        $question = mb_strtolower($message);

        if (str_contains($question, 'ən çox sat')) {
            $item = $context['products']['top_selling'][0] ?? null;
            return $item
                ? "{$item['name']} hazırda ən çox satılan məhsullardandır. Son 30 gündə {$item['qty_30d']} ədəd satış görünür."
                : 'Bu analiz üçün kifayət qədər məlumat yoxdur.';
        }

        if (str_contains($question, 'ölü stok')) {
            $items = $context['products']['dead_stock'] ?? [];
            if (count($items) === 0) {
                return 'Hazırda ölü stok görünmür və ya kifayət qədər məlumat yoxdur.';
            }

            $names = collect($items)->take(3)->pluck('name')->implode(', ');
            return "Ölü stok riski olan məhsullar: {$names}. Bunlar üçün endirim və bundle kampaniyası düşünmək olar.";
        }

        if (str_contains($question, 'işçi') || str_contains($question, 'aktiv')) {
            $user = $context['employees']['most_active'][0] ?? null;
            return $user
                ? "{$user['name']} son 30 gündə ən aktiv istifadəçilərdən biridir. Ümumi əməliyyat sayı {$user['total_operations_30d']} olub."
                : 'İşçi aktivliyi üçün kifayət qədər məlumat yoxdur.';
        }

        if (str_contains($question, 'təchizatçı')) {
            $item = $context['purchases']['cheapest_suppliers'][0]['best_supplier'] ?? null;
            return $item
                ? "{$item['supplier_name']} hazırda ən sərfəli təchizatçılardan biri görünür. Orta alış qiyməti {$item['avg_purchase_price']} AZN-dir."
                : 'Təchizatçı müqayisəsi üçün kifayət qədər məlumat yoxdur.';
        }

        if (str_contains($question, 'mənfəət')) {
            return "Bu ay üçün təxmini mənfəət {$context['finance']['estimated_profit']} AZN-dir. Hesablama satış, cari maya dəyəri və xərclər əsasında aparılıb.";
        }

        return 'Bu analiz üçün kifayət qədər məlumat yoxdur və ya sual daha dəqiq formada verilməlidir.';
    }
}
