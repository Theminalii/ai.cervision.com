<?php

namespace App\Services;

use App\Models\Conversation;

class AiReplyGeneratorService
{
    public function __construct(
        protected OpenAiService $openAi,
        protected AiContextBuilderService $contextBuilder,
        protected AiSecurityService $security,
        protected AiProviderService $providerService,
    ) {
    }

    public function generate(Conversation $conversation, string $message): array
    {
        $rules = $this->security->rules();
        $risk = $this->security->detectRisk($message, $rules);
        $context = $this->contextBuilder->build($conversation, $message);

        if ($risk) {
            return [
                'reply_text' => 'Bu məlumat sistemdə avtomatik paylaşılmır. Sizi operatora yönləndirirəm.',
                'confidence_score' => 35,
                'data_sources' => ['security_rules'],
                'risk_warning' => $risk,
                'approval_required' => true,
            ];
        }

        $system = 'You are an omnichannel ERP assistant. Use only provided ERP/CRM context. Never invent stock or prices. If data is missing, explicitly say it was not found and hand off to operator. Respond in Azerbaijani.';
        $ai = $this->openAi->text($system, [
            'message' => $message,
            'context' => $context,
        ]);

        if ($ai && filled($ai['text'] ?? null)) {
            return [
                'reply_text' => (string) $ai['text'],
                'confidence_score' => $context['products'] ? 88 : 62,
                'data_sources' => array_values(array_filter([
                    $context['products'] ? 'products' : null,
                    $context['customer'] ? 'customer' : null,
                    'faq',
                ])),
                'risk_warning' => null,
                'approval_required' => $this->providerService->settings()->operator_approval_required,
                'usage' => $ai['usage'] ?? [],
                'model' => $ai['model'] ?? null,
            ];
        }

        if (! empty($context['products'])) {
            $first = $context['products'][0];
            return [
                'reply_text' => "{$first['name']} məhsulu sistemdə tapıldı. Cari satış qiyməti {$first['sale_price']} AZN, stok qalığı təxminən {$first['stock']} ədəddir. İstəsəniz operator sifariş draftı hazırlasın.",
                'confidence_score' => 86,
                'data_sources' => ['products', 'stock'],
                'risk_warning' => null,
                'approval_required' => true,
            ];
        }

        return [
            'reply_text' => 'Bu məlumat sistemdə tapılmadı. Sizi operatora yönləndirirəm.',
            'confidence_score' => 40,
            'data_sources' => ['fallback'],
            'risk_warning' => 'ERP datasında uyğun nəticə yoxdur.',
            'approval_required' => true,
        ];
    }
}
