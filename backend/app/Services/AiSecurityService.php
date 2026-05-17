<?php

namespace App\Services;

use App\Models\AiAutomationRule;

class AiSecurityService
{
    public function rules(): AiAutomationRule
    {
        return AiAutomationRule::query()->firstOrCreate([], [
            'product_stock_only' => true,
            'price_questions' => true,
            'order_questions' => true,
            'hide_finance_data' => true,
            'low_confidence_handoff' => true,
            'analyze_voice' => true,
            'analyze_image' => true,
            'create_lead_if_missing' => true,
            'human_handoff_enabled' => true,
            'blacklist_words' => [],
            'template_replies' => [],
            'business_hours' => [
                'start' => '09:00',
                'end' => '18:00',
                'days' => [1, 2, 3, 4, 5, 6],
            ],
        ]);
    }

    public function detectRisk(string $message, AiAutomationRule $rules): ?string
    {
        $lower = mb_strtolower($message);
        foreach (($rules->blacklist_words ?? []) as $word) {
            if ($word && str_contains($lower, mb_strtolower((string) $word))) {
                return 'Qara siyahı sözü aşkarlandı.';
            }
        }

        if (($rules->hide_finance_data ?? true) && (str_contains($lower, 'borc') || str_contains($lower, 'kredit'))) {
            return 'Maliyyə məlumatı operator təsdiqi tələb edir.';
        }

        return null;
    }
}
