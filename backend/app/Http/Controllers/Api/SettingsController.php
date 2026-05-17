<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\ChangePasswordRequest;
use App\Http\Requests\Settings\UpdateAppearanceSettingsRequest;
use App\Http\Requests\Settings\UpdateCompanySettingsRequest;
use App\Http\Requests\Settings\UpdateNotificationSettingsRequest;
use App\Services\SettingsNotificationService;
use App\Services\SystemSettingsService;
use App\Support\InlineImage;
use Throwable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class SettingsController extends Controller
{
    public function __construct(
        protected SystemSettingsService $settingsService,
        protected SettingsNotificationService $notificationService,
    ) {
    }

    public function index(Request $request)
    {
        return response()->json([
            'company' => $this->settingsService->get('company_settings', [
                'company_name' => 'BESTSOL MMC',
                'tax_id' => '1234567890',
                'email' => 'info@bestsol.az',
                'phone' => '+994 12 555 55 55',
                'address' => 'Bakı şəhəri, Nəsimi rayonu',
                'currency' => 'AZN',
                'language' => 'az',
                'timezone' => 'Asia/Baku',
                'invoice_template' => 'standard',
                'receipt_size' => '80mm',
                'auto_print_receipt' => true,
                'show_logo_on_print' => true,
                'logo_url' => null,
            ]),
            'notifications' => $this->settingsService->get('notification_settings', [
                'channels' => [
                    'email' => [
                        'enabled' => false,
                        'host' => '',
                        'port' => 587,
                        'encryption' => 'tls',
                        'username' => '',
                        'password' => '',
                        'from_address' => '',
                        'from_name' => 'BESTSOL',
                        'recipient' => '',
                    ],
                    'telegram' => [
                        'enabled' => false,
                        'bot_token' => '',
                        'chat_id' => '',
                    ],
                ],
                'events' => [
                    'low_stock' => true,
                    'new_order' => true,
                    'payment' => true,
                    'weekly_summary' => true,
                    'failed_login' => true,
                    'ai_agent' => true,
                ],
            ]),
            'appearance' => $this->settingsService->get('appearance_settings', [
                'compact_sidebar' => false,
                'hover_expand' => true,
                'dense_tables' => false,
                'theme' => 'light',
            ]),
            'sessions' => $request->user()->tokens()->get()->map(function ($token) use ($request) {
                return [
                    'id' => $token->id,
                    'device' => $token->name,
                    'location' => 'API sessiyası',
                    'time' => optional($token->last_used_at ?? $token->created_at)?->diffForHumans(),
                    'current' => $request->user()->currentAccessToken()?->id === $token->id,
                    'created_at' => $token->created_at,
                    'last_used_at' => $token->last_used_at,
                ];
            })->values(),
        ]);
    }

    public function updateCompany(UpdateCompanySettingsRequest $request)
    {
        $this->settingsService->set('company_settings', $request->validated());

        return response()->json(['message' => 'Şirkət parametrləri yeniləndi.']);
    }

    public function uploadLogo(Request $request)
    {
        $request->validate([
            'logo' => InlineImage::rules(),
        ]);

        $file = $request->file('logo');
        $dataUrl = InlineImage::fromUpload($file);

        $companySettings = $this->settingsService->get('company_settings', []);
        $companySettings['logo_url'] = $dataUrl;
        $this->settingsService->set('company_settings', $companySettings);

        return response()->json([
            'message' => 'Logo yükləndi.',
            'logo_url' => $dataUrl,
        ]);
    }

    public function updateNotifications(UpdateNotificationSettingsRequest $request)
    {
        $this->settingsService->set('notification_settings', $request->validated());

        return response()->json(['message' => 'Bildiriş parametrləri yeniləndi.']);
    }

    public function testEmail()
    {
        try {
            $this->notificationService->sendEmailTest();
        } catch (Throwable $exception) {
            return response()->json([
                'message' => 'Test email göndərilmədi: ' . $exception->getMessage(),
            ], 422);
        }

        return response()->json(['message' => 'Test email göndərildi.']);
    }

    public function testTelegram()
    {
        try {
            $this->notificationService->sendTelegramTest();
        } catch (Throwable $exception) {
            return response()->json([
                'message' => 'Telegram test mesajı göndərilmədi: ' . $exception->getMessage(),
            ], 422);
        }

        return response()->json(['message' => 'Telegram test mesajı göndərildi.']);
    }

    public function updateAppearance(UpdateAppearanceSettingsRequest $request)
    {
        $this->settingsService->set('appearance_settings', $request->validated());

        return response()->json(['message' => 'Görünüş parametrləri yeniləndi.']);
    }

    public function changePassword(ChangePasswordRequest $request)
    {
        $user = $request->user();

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json(['message' => 'Cari şifrə yanlışdır.'], 422);
        }

        $user->update([
            'password' => Hash::make($request->new_password),
        ]);

        return response()->json(['message' => 'Şifrə uğurla yeniləndi.']);
    }

    public function revokeSession(Request $request, string $tokenId)
    {
        $request->user()->tokens()->whereKey($tokenId)->delete();

        return response()->json(['message' => 'Sessiya bağlandı.']);
    }

    public function revokeOtherSessions(Request $request)
    {
        $currentId = $request->user()->currentAccessToken()?->id;
        $request->user()->tokens()->where('id', '!=', $currentId)->delete();

        return response()->json(['message' => 'Digər sessiyalar bağlandı.']);
    }
}
