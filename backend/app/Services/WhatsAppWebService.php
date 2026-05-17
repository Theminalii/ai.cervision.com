<?php

namespace App\Services;

use App\Models\ChannelAccount;
use App\Models\ChannelSession;
use App\Services\Contracts\WhatsAppWebConnector;

class WhatsAppWebService implements WhatsAppWebConnector
{
    public function status(): array
    {
        $session = ChannelSession::query()->where('channel', 'whatsapp_web')->latest()->first();

        return [
            'experimental' => true,
            'status' => $session?->status ?? 'disconnected',
            'last_connected_at' => $session?->last_connected_at?->toIso8601String(),
            'session_expires_at' => $session?->expires_at?->toIso8601String(),
            'warning' => 'WhatsApp Web bağlantısı rəsmi API deyil, stabil işləməyə bilər. Production üçün WhatsApp Business Cloud API tövsiyə olunur.',
        ];
    }

    public function connect(): array
    {
        $account = ChannelAccount::query()->firstOrCreate(
            ['channel' => 'whatsapp_web', 'external_id' => 'experimental'],
            ['name' => 'WhatsApp Web Experimental', 'status' => 'pending']
        );

        $session = ChannelSession::query()->updateOrCreate(
            ['channel' => 'whatsapp_web'],
            [
                'channel_account_id' => $account->id,
                'status' => 'qr_required',
                'qr_payload' => 'BESTSOL-WA-WEB-QR-'.strtoupper(substr(sha1((string) now()), 0, 16)),
                'expires_at' => now()->addMinutes(10),
                'meta' => ['mode' => 'experimental'],
            ]
        );

        $account->update(['status' => 'pending']);

        return [
            'status' => $session->status,
            'qr_payload' => $session->qr_payload,
        ];
    }

    public function disconnect(): void
    {
        ChannelSession::query()->where('channel', 'whatsapp_web')->update([
            'status' => 'disconnected',
            'qr_payload' => null,
            'session_payload' => null,
        ]);

        ChannelAccount::query()->where('channel', 'whatsapp_web')->update(['status' => 'disconnected']);
    }

    public function sendMessage(string $recipient, string $body): array
    {
        return [
            'recipient' => $recipient,
            'body' => $body,
            'status' => 'queued',
            'experimental' => true,
        ];
    }
}
