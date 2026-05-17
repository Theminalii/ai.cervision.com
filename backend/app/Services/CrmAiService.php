<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class CrmAiService
{
    public function __construct(protected CrmService $crmService)
    {
    }

    public function recommendations(User $user): array
    {
        return [
            'recommendations' => $this->crmService->recommendations($user),
            'summary' => 'CRM tövsiyələri follow-up, riskli deal və yüksək potensial lead-lərə görə prioritetləşdirilib.',
        ];
    }

    public function chat(User $user, string $message): array
    {
        $context = [
            'overview' => $this->crmService->overview($user),
            'reports' => $this->crmService->reports($user),
            'recommendations' => $this->crmService->recommendations($user),
        ];

        $reply = $this->askOpenAi($message, $context) ?? $this->fallbackReply($message, $context);

        return [
            'message' => $reply,
            'used_ai' => filled(env('OPENAI_API_KEY')),
        ];
    }

    protected function askOpenAi(string $message, array $context): ?string
    {
        if (! filled(env('OPENAI_API_KEY'))) {
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
                                'text' => 'You are a CRM assistant for an ERP. Use only the provided structured context. If information is insufficient, say so clearly. Reply in Azerbaijani.',
                            ]],
                        ],
                        [
                            'role' => 'user',
                            'content' => [[
                                'type' => 'input_text',
                                'text' => json_encode(['question' => $message, 'context' => $context], JSON_UNESCAPED_UNICODE),
                            ]],
                        ],
                    ],
                ]);

            if (! $response->successful()) {
                return null;
            }

            return trim((string) ($response->json('output_text') ?? '')) ?: null;
        } catch (Throwable $exception) {
            Log::warning('CRM AI sorğusu uğursuz oldu.', ['message' => $exception->getMessage()]);
            return null;
        }
    }

    protected function fallbackReply(string $message, array $context): string
    {
        $question = mb_strtolower($message);

        if (str_contains($question, 'kimlərlə əlaqə')) {
            $item = $context['recommendations'][0] ?? null;

            return $item
                ? "{$item['title']}. Səbəb: {$item['reason']}"
                : 'Bu gün üçün prioritet follow-up məlumatı kifayət deyil.';
        }

        if (str_contains($question, 'risk')) {
            $item = collect($context['recommendations'])->first(fn (array $recommendation) => $recommendation['entity']['type'] ?? null === 'deal');

            return $item
                ? "{$item['title']}. Tövsiyə: {$item['recommended_action']}"
                : 'Riskdə olan deal üçün kifayət qədər məlumat yoxdur.';
        }

        if (str_contains($question, 'dəyərli müştəri')) {
            $customer = $context['reports']['valuable_customers'][0] ?? null;

            return $customer
                ? "{$customer['name']} hazırda ən dəyərli müştərilərdəndir. Lifetime value: {$customer['lifetime_value']} AZN."
                : 'Dəyərli müştəri analizi üçün kifayət qədər məlumat yoxdur.';
        }

        if (str_contains($question, 'passiv')) {
            $customer = $context['reports']['passive_customers'][0] ?? null;

            return $customer
                ? "{$customer['name']} passiv müştərilərdən biridir. Yenidən aktivləşdirmə kampaniyası təklif olunur."
                : 'Passiv müştəri görünmür və ya məlumat yetərli deyil.';
        }

        if (str_contains($question, 'təklif hazırla') || str_contains($question, 'satış mesajı')) {
            return 'Salam, sizin üçün uyğun həll və qiymət təklifi hazırlamışıq. Ehtiyacınıza uyğun paketləri paylaşa bilərəm. Uyğun vaxtda qısa danışaq?';
        }

        return 'Bu CRM analizi üçün kifayət qədər məlumat yoxdur və ya sualı bir az daha konkret yazmaq lazımdır.';
    }
}
