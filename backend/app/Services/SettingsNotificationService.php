<?php

namespace App\Services;

use App\Models\Product;
use App\Models\Sale;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;

class SettingsNotificationService
{
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

    protected function dispatch(array $settings, string $message, string $subject): void
    {
        $emailConfig = $settings['channels']['email'] ?? [];
        if ($emailConfig['enabled'] ?? false) {
            $this->sendEmailMessage($emailConfig, $subject, $message);
        }

        $telegramConfig = $settings['channels']['telegram'] ?? [];
        if ($telegramConfig['enabled'] ?? false) {
            $this->sendTelegramMessage(
                $telegramConfig['bot_token'] ?? '',
                $telegramConfig['chat_id'] ?? '',
                $message
            );
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

        Http::timeout(10)->post("https://api.telegram.org/bot{$botToken}/sendMessage", [
            'chat_id' => $chatId,
            'text' => $message,
        ])->throw();
    }
}
