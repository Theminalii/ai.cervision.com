<?php

namespace App\Services;

use App\Models\AiProviderCredential;
use App\Models\AiSetting;

class AiProviderService
{
    public function settings(): AiSetting
    {
        return AiSetting::query()->firstOrCreate([], [
            'enabled' => false,
            'provider' => 'openai',
            'model' => env('OPENAI_AI_AGENT_MODEL', 'gpt-5.2'),
            'auto_reply_enabled' => false,
            'operator_approval_required' => true,
            'confidence_min' => 75,
            'license_required' => false,
        ]);
    }

    public function credential(string $provider = 'openai'): AiProviderCredential
    {
        return AiProviderCredential::query()->firstOrCreate(
            ['provider' => $provider],
            ['is_active' => false]
        );
    }

    public function resolvedApiKey(): ?string
    {
        $credential = $this->credential('openai');

        return $credential->api_key ?: (filled(env('OPENAI_API_KEY')) ? (string) env('OPENAI_API_KEY') : null);
    }

    public function maskedKey(?string $value): ?string
    {
        if (! filled($value)) {
            return null;
        }

        $plain = (string) $value;
        if (mb_strlen($plain) <= 8) {
            return str_repeat('*', max(4, mb_strlen($plain)));
        }

        return mb_substr($plain, 0, 3).'****'.mb_substr($plain, -4);
    }
}
