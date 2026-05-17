<?php

namespace App\Services;

use App\Services\Contracts\WhatsAppCloudApiConnector;

class WhatsAppCloudService implements WhatsAppCloudApiConnector
{
    public function status(): array
    {
        return ['status' => 'configured'];
    }

    public function connect(): array
    {
        return ['status' => 'configured'];
    }

    public function disconnect(): void
    {
    }

    public function verify(string $verifyToken, string $mode, string $challenge): ?string
    {
        if ($mode === 'subscribe' && filled(env('WHATSAPP_VERIFY_TOKEN')) && hash_equals((string) env('WHATSAPP_VERIFY_TOKEN'), $verifyToken)) {
            return $challenge;
        }

        return null;
    }

    public function sendMessage(string $recipient, string $body): array
    {
        return [
            'recipient' => $recipient,
            'body' => $body,
            'status' => 'ready_for_official_api',
        ];
    }
}
