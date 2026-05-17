<?php

namespace App\Services;

use App\Models\AiTokenLicense;

class AiTokenLicenseService
{
    public function validate(?string $tokenCode): array
    {
        if (! filled($tokenCode)) {
            return ['valid' => false, 'message' => 'Token kodu daxil edilməyib.', 'license' => null];
        }

        $license = AiTokenLicense::query()->where('token_code', $tokenCode)->first();
        if (! $license) {
            return ['valid' => false, 'message' => 'Token kodu tapılmadı.', 'license' => null];
        }

        if ($license->status !== 'active') {
            return ['valid' => false, 'message' => 'Token kodu aktiv deyil.', 'license' => $license];
        }

        if ($license->start_date && now()->lt($license->start_date)) {
            return ['valid' => false, 'message' => 'Token kodunun aktivlik tarixi başlamayıb.', 'license' => $license];
        }

        if ($license->end_date && now()->gt($license->end_date)) {
            return ['valid' => false, 'message' => 'Token kodunun müddəti bitib.', 'license' => $license];
        }

        if ($license->monthly_token_limit > 0 && $license->used_tokens >= $license->monthly_token_limit) {
            return ['valid' => false, 'message' => 'Aylıq token limiti dolub.', 'license' => $license];
        }

        return ['valid' => true, 'message' => 'Token aktivdir.', 'license' => $license];
    }

    public function consume(?AiTokenLicense $license, int $tokens): void
    {
        if (! $license || $tokens <= 0) {
            return;
        }

        $license->increment('used_tokens', $tokens);
    }
}
