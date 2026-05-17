<?php

namespace App\Services;

class InstagramService
{
    public function verify(string $verifyToken, string $mode, string $challenge): ?string
    {
        if ($mode === 'subscribe' && filled(env('INSTAGRAM_VERIFY_TOKEN')) && hash_equals((string) env('INSTAGRAM_VERIFY_TOKEN'), $verifyToken)) {
            return $challenge;
        }

        return null;
    }
}
