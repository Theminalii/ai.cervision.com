<?php

namespace App\Services;

use App\Models\Product;
use App\Models\Sale;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

class SettingsNotificationService
{
    protected const IN_APP_NOTIFICATIONS_KEY = 'in_app_notifications';
    protected const AI_AGENT_NOTIFICATION_STATE_KEY = 'ai_agent_notification_state';

    public function __construct(protected SystemSettingsService $settingsService)
    {
    }

    public function sendEmailTest(): void
    {
        $settings = $this->settingsService->get('notification_settings', []);
        $emailConfig = $settings['channels']['email'] ?? [];

        $recipient = $emailConfig['recipient'] ?: $emailConfig['username'] ?: null;

        if (empty($emailConfig['enabled']) || empty($emailConfig['host']) || empty($emailConfig['username']) || empty($emailConfig['password']) || empty($recipient)) {
            throw new \RuntimeException('E-poçt konfiqurasiyası tam deyil.');
        }

        config([
            'mail.default' => 'smtp',
            'mail.mailers.smtp.transport' => 'smtp',
            'mail.mailers.smtp.host' => $emailConfig['host'],
            'mail.mailers.smtp.port' => (int) ($emailConfig['port'] ?? 587),
            'mail.mailers.smtp.encryption' => $emailConfig['encryption'] ?: null,
            'mail.mailers.smtp.username' => $emailConfig['username'],
            'mail.mailers.smtp.password' => $emailConfig['password'],
            'mail.from.address' => $emailConfig['from_address'] ?: $emailConfig['username'],
            'mail.from.name' => $emailConfig['from_name'] ?: 'BESTSOL',
        ]);

        Mail::raw('BESTSOL bildiriş sistemi aktivdir.', function ($message) use ($emailConfig, $recipient): void {
            $message
                ->to($recipient)
                ->subject('BESTSOL test bildirişi');
        });
    }

    public function sendTelegramTest(): void
    {
        $settings = $this->settingsService->get('notification_settings', []);
        $telegramConfig = $settings['channels']['telegram'] ?? [];

        if (empty($telegramConfig['enabled']) || empty($telegramConfig['bot_token']) || empty($telegramConfig['chat_id'])) {
            throw new \RuntimeException('Telegram konfiqurasiyası tam deyil.');
        }

        $this->sendTelegramMessage(
            $telegramConfig['bot_token'],
            $telegramConfig['chat_id'],
            "BESTSOL test bildirişi aktivdir."
        );
    }

    public function notifyLowStock(Product $product): void
    {
        $settings = $this->settingsService->get('notification_settings', []);

        if (!($settings['events']['low_stock'] ?? false)) {
            return;
        }

        $stock = $product->stock;
        if (!$stock || (float) $stock->real_quantity > (float) $stock->minimum_quantity) {
            return;
        }

        $message = "Aşağı stok xəbərdarlığı: {$product->name} minimum səviyyəyə düşüb. Cari stok: {$stock->real_quantity}";
        $this->dispatch($settings, $message, 'Aşağı stok xəbərdarlığı');
    }

    public function notifyNewOrder(Sale $sale): void
    {
        $settings = $this->settingsService->get('notification_settings', []);

        if (!($settings['events']['new_order'] ?? false)) {
            return;
        }

        $message = "Yeni sifariş yaradıldı: {$sale->sale_number}. Məbləğ: {$sale->total_amount} AZN";
        $this->dispatch($settings, $message, 'Yeni sifariş');
    }

    public function notifyPayment(string $title, string $body): void
    {
        $settings = $this->settingsService->get('notification_settings', []);

        if (!($settings['events']['payment'] ?? false)) {
            return;
        }

        $this->dispatch($settings, $body, $title);
    }

    public function notifyFailedLogin(string $email): void
    {
        $settings = $this->settingsService->get('notification_settings', []);

        if (!($settings['events']['failed_login'] ?? false)) {
            return;
        }

        $this->dispatch($settings, "Uğursuz login cəhdi: {$email}", 'Uğursuz giriş cəhdi');
    }

    public function notifyAiInsightDigest(array $overview): void
    {
        $settings = $this->settingsService->get('notification_settings', []);

        if (! ($settings['events']['ai_agent'] ?? false)) {
            return;
        }

        $healthScore = (int) ($overview['health_score'] ?? 0);
        $risk = collect($overview['key_risks'] ?? [])->first();
        $opportunity = collect($overview['key_opportunities'] ?? [])->first();

        if (! $risk && ! $opportunity) {
            return;
        }

        $title = "AI Agent xülasəsi • Sağlamlıq skoru {$healthScore}";
        $messageParts = [];

        if ($risk) {
            $messageParts[] = "Əsas risk: {$risk['title']}. {$risk['description']}";
        }

        if ($opportunity) {
            $messageParts[] = "Əsas fürsət: {$opportunity['title']}. {$opportunity['recommended_action']}";
        }

        $message = implode(' ', $messageParts);
        $digestHash = sha1(json_encode([
            'health_score' => $healthScore,
            'risk' => $risk['title'] ?? null,
            'opportunity' => $opportunity['title'] ?? null,
        ], JSON_UNESCAPED_UNICODE));

        $state = $this->settingsService->get(self::AI_AGENT_NOTIFICATION_STATE_KEY, []);
        $lastHash = $state['hash'] ?? null;
        $lastSentAt = isset($state['sent_at']) ? Carbon::parse($state['sent_at']) : null;

        if ($lastHash === $digestHash && $lastSentAt && $lastSentAt->gt(now()->subHours(6))) {
            return;
        }

        $this->storeInAppNotification($title, $message, 'info', [
            'module' => 'ai-agent',
            'health_score' => $healthScore,
            'risk_title' => $risk['title'] ?? null,
            'opportunity_title' => $opportunity['title'] ?? null,
        ], 'ai-agent-'.$digestHash);

        $this->dispatch($settings, $message, $title);

        $this->settingsService->set(self::AI_AGENT_NOTIFICATION_STATE_KEY, [
            'hash' => $digestHash,
            'sent_at' => now()->toIso8601String(),
        ]);
    }

    public function getInAppNotifications(int $limit = 8): array
    {
        return collect($this->settingsService->get(self::IN_APP_NOTIFICATIONS_KEY, []))
            ->sortByDesc('created_at')
            ->take($limit)
            ->values()
            ->all();
    }

    public function storeInAppNotification(
        string $title,
        string $message,
        string $tone = 'info',
        array $meta = [],
        ?string $dedupeKey = null,
    ): void {
        $notifications = collect($this->settingsService->get(self::IN_APP_NOTIFICATIONS_KEY, []));

        if ($dedupeKey) {
            $notifications = $notifications->reject(fn (array $item) => ($item['dedupe_key'] ?? null) === $dedupeKey);
        }

        $notifications->prepend([
            'title' => $title,
            'body' => $message,
            'tone' => $tone,
            'meta' => $meta,
            'dedupe_key' => $dedupeKey,
            'created_at' => now()->toIso8601String(),
        ]);

        $this->settingsService->set(
            self::IN_APP_NOTIFICATIONS_KEY,
            $notifications->take(20)->values()->all(),
        );
    }

    protected function dispatch(array $settings, string $message, string $subject): void
    {
        $emailConfig = $settings['channels']['email'] ?? [];
        if ($emailConfig['enabled'] ?? false) {
            $this->dispatchSafely('email', fn () => $this->sendEmailMessage($emailConfig, $subject, $message));
        }

        $telegramConfig = $settings['channels']['telegram'] ?? [];
        if ($telegramConfig['enabled'] ?? false) {
            $this->dispatchSafely('telegram', fn () => $this->sendTelegramMessage(
                $telegramConfig['bot_token'] ?? '',
                $telegramConfig['chat_id'] ?? '',
                $message
            ));
        }
    }

    protected function dispatchSafely(string $channel, callable $callback): void
    {
        try {
            $callback();
        } catch (Throwable $exception) {
            Log::warning("BESTSOL {$channel} bildirişi göndərilə bilmədi.", [
                'channel' => $channel,
                'message' => $exception->getMessage(),
            ]);
        }
    }

    protected function sendEmailMessage(array $emailConfig, string $subject, string $message): void
    {
        $recipient = $emailConfig['recipient'] ?: $emailConfig['username'] ?: null;

        if (empty($emailConfig['host']) || empty($emailConfig['username']) || empty($emailConfig['password']) || empty($recipient)) {
            return;
        }

        config([
            'mail.default' => 'smtp',
            'mail.mailers.smtp.transport' => 'smtp',
            'mail.mailers.smtp.host' => $emailConfig['host'],
            'mail.mailers.smtp.port' => (int) ($emailConfig['port'] ?? 587),
            'mail.mailers.smtp.encryption' => $emailConfig['encryption'] ?: null,
            'mail.mailers.smtp.username' => $emailConfig['username'],
            'mail.mailers.smtp.password' => $emailConfig['password'],
            'mail.from.address' => $emailConfig['from_address'] ?: $emailConfig['username'],
            'mail.from.name' => $emailConfig['from_name'] ?: 'BESTSOL',
        ]);

        Mail::raw($message, function ($mail) use ($recipient, $subject): void {
            $mail->to($recipient)->subject($subject);
        });
    }

    protected function sendTelegramMessage(string $botToken, string $chatId, string $message): void
    {
        if (!$botToken || !$chatId) {
            return;
        }

        Http::connectTimeout(3)->timeout(5)->post("https://api.telegram.org/bot{$botToken}/sendMessage", [
            'chat_id' => $chatId,
            'text' => $message,
        ])->throw();
    }
}
