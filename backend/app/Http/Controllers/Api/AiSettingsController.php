<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AiAutomationRule;
use App\Models\AiTokenLicense;
use App\Models\AiUsageLog;
use App\Models\IntegrationSetting;
use App\Services\AiProviderService;
use App\Services\AiTokenLicenseService;
use App\Services\GmailChannelService;
use App\Services\OpenAiService;
use Illuminate\Http\Request;

class AiSettingsController extends Controller
{
    public function __construct(
        protected AiProviderService $providerService,
        protected AiTokenLicenseService $licenseService,
        protected OpenAiService $openAiService,
        protected GmailChannelService $gmailChannelService,
    ) {
    }

    public function show()
    {
        $settings = $this->providerService->settings();
        $credential = $this->providerService->credential($settings->provider);
        $rule = AiAutomationRule::query()->first();
        $license = $this->licenseService->validate($credential->token_code)['license'] ?? null;

        return response()->json([
            'settings' => [
                'enabled' => $settings->enabled,
                'provider' => $settings->provider,
                'model' => $settings->model,
                'daily_limit' => $settings->daily_limit,
                'monthly_limit' => $settings->monthly_limit,
                'auto_reply_enabled' => $settings->auto_reply_enabled,
                'operator_approval_required' => $settings->operator_approval_required,
                'confidence_min' => $settings->confidence_min,
                'license_required' => $settings->license_required,
                'masked_api_key' => $this->providerService->maskedKey($credential->api_key),
                'masked_token_code' => $this->providerService->maskedKey($credential->token_code),
            ],
            'license' => $license ? [
                'status' => $license->status,
                'monthlyTokenLimit' => $license->monthly_token_limit,
                'usedTokens' => $license->used_tokens,
                'startDate' => optional($license->start_date)->toDateString(),
                'endDate' => optional($license->end_date)->toDateString(),
            ] : null,
            'automation' => $rule,
            'usage' => [
                'monthly_tokens' => (int) AiUsageLog::query()->whereMonth('created_at', now()->month)->sum('total_tokens'),
                'daily_tokens' => (int) AiUsageLog::query()->whereDate('created_at', now()->toDateString())->sum('total_tokens'),
                'recent_logs' => AiUsageLog::query()->latest()->take(10)->get(),
                'failed_requests' => AiUsageLog::query()->where('action_type', 'failed')->count(),
                'auto_replies' => AiUsageLog::query()->where('module', 'omnichannel')->count(),
            ],
        ]);
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'enabled' => ['required', 'boolean'],
            'provider' => ['required', 'in:openai'],
            'api_key' => ['nullable', 'string'],
            'token_code' => ['nullable', 'string'],
            'model' => ['required', 'string', 'max:255'],
            'daily_limit' => ['nullable', 'integer', 'min:0'],
            'monthly_limit' => ['nullable', 'integer', 'min:0'],
            'auto_reply_enabled' => ['required', 'boolean'],
            'operator_approval_required' => ['required', 'boolean'],
            'confidence_min' => ['required', 'integer', 'min:1', 'max:100'],
            'license_required' => ['required', 'boolean'],
        ]);

        $settings = $this->providerService->settings();
        $settings->update($data);

        $credential = $this->providerService->credential($data['provider']);
        $credential->update([
            'api_key' => $data['api_key'] ?: $credential->api_key,
            'token_code' => $data['token_code'] ?: $credential->token_code,
            'is_active' => (bool) $data['enabled'],
        ]);

        return response()->json(['message' => 'AI ayarları yadda saxlanıldı.']);
    }

    public function test(Request $request)
    {
        if (! $this->openAiService->isEnabled()) {
            return response()->json(['message' => 'OpenAI açarı tapılmadı.'], 422);
        }

        $reply = $this->openAiService->text(
            'Reply with a short Azerbaijani confirmation.',
            ['message' => 'BESTSOL AI connection test']
        );

        if (! ($reply['text'] ?? null)) {
            return response()->json(['message' => 'AI bağlantısı təsdiqlənmədi.'], 422);
        }

        return response()->json(['message' => 'AI bağlantısı uğurludur.', 'reply' => $reply['text']]);
    }

    public function validateToken(Request $request)
    {
        $data = $request->validate([
            'token_code' => ['required', 'string'],
        ]);

        $result = $this->licenseService->validate($data['token_code']);

        return response()->json([
            'valid' => $result['valid'],
            'message' => $result['message'],
            'license' => $result['license'],
        ], $result['valid'] ? 200 : 422);
    }

    public function usage()
    {
        return response()->json([
            'daily' => (int) AiUsageLog::query()->whereDate('created_at', now()->toDateString())->sum('total_tokens'),
            'monthly' => (int) AiUsageLog::query()->whereMonth('created_at', now()->month)->sum('total_tokens'),
            'logs' => AiUsageLog::query()->latest()->take(50)->get(),
        ]);
    }

    public function logs()
    {
        return response()->json([
            'data' => AiUsageLog::query()->latest()->paginate(50),
        ]);
    }

    public function whatsapp()
    {
        $setting = IntegrationSetting::query()->firstOrCreate(['channel' => 'whatsapp'], ['connection_type' => 'whatsapp_web']);

        return response()->json([
            'setting' => [
                'enabled' => $setting->enabled,
                'connection_type' => $setting->connection_type,
                'public_meta' => $setting->public_meta ?? [],
            ],
        ]);
    }

    public function updateWhatsapp(Request $request)
    {
        $data = $request->validate([
            'enabled' => ['required', 'boolean'],
            'connection_type' => ['required', 'in:whatsapp_web,whatsapp_cloud'],
            'cloud_access_token' => ['nullable', 'string'],
            'phone_number_id' => ['nullable', 'string'],
            'verify_token' => ['nullable', 'string'],
        ]);

        $setting = IntegrationSetting::query()->firstOrCreate(['channel' => 'whatsapp']);
        $setting->update([
            'enabled' => $data['enabled'],
            'connection_type' => $data['connection_type'],
            'public_meta' => [
                'webhook_url' => url('/api/integrations/whatsapp-cloud/webhook'),
            ],
            'secret_meta' => [
                'cloud_access_token' => $data['cloud_access_token'] ?? null,
                'phone_number_id' => $data['phone_number_id'] ?? null,
                'verify_token' => $data['verify_token'] ?? null,
            ],
        ]);

        return response()->json(['message' => 'WhatsApp ayarları yadda saxlanıldı.']);
    }

    public function instagram()
    {
        $setting = IntegrationSetting::query()->firstOrCreate(['channel' => 'instagram']);

        return response()->json([
            'setting' => [
                'enabled' => $setting->enabled,
                'connection_type' => $setting->connection_type,
                'public_meta' => $setting->public_meta ?? [],
            ],
        ]);
    }

    public function updateInstagram(Request $request)
    {
        $data = $request->validate([
            'enabled' => ['required', 'boolean'],
            'access_token' => ['nullable', 'string'],
            'business_account_id' => ['nullable', 'string'],
            'app_secret' => ['nullable', 'string'],
            'verify_token' => ['nullable', 'string'],
        ]);

        $setting = IntegrationSetting::query()->firstOrCreate(['channel' => 'instagram']);
        $setting->update([
            'enabled' => $data['enabled'],
            'connection_type' => 'instagram_messaging',
            'public_meta' => [
                'webhook_url' => url('/api/integrations/instagram/webhook'),
                'business_account_id' => $data['business_account_id'] ?? null,
            ],
            'secret_meta' => [
                'access_token' => $data['access_token'] ?? null,
                'app_secret' => $data['app_secret'] ?? null,
                'verify_token' => $data['verify_token'] ?? null,
            ],
        ]);

        return response()->json(['message' => 'Instagram ayarları yadda saxlanıldı.']);
    }

    public function gmail()
    {
        $setting = IntegrationSetting::query()->firstOrCreate(['channel' => 'gmail']);
        $secretMeta = is_array($setting->secret_meta) ? $setting->secret_meta : [];

        return response()->json([
            'setting' => [
                'enabled' => $setting->enabled,
                'connection_type' => $setting->connection_type,
                'public_meta' => $setting->public_meta ?? [],
                'has_credentials' => [
                    'username' => filled($secretMeta['username'] ?? null),
                    'password' => filled($secretMeta['password'] ?? null),
                ],
            ],
        ]);
    }

    public function updateGmail(Request $request)
    {
        $data = $request->validate([
            'enabled' => ['required', 'boolean'],
            'imap_host' => ['nullable', 'string'],
            'imap_port' => ['nullable', 'integer'],
            'imap_encryption' => ['nullable', 'string'],
            'smtp_host' => ['nullable', 'string'],
            'smtp_port' => ['nullable', 'integer'],
            'smtp_encryption' => ['nullable', 'string'],
            'email_address' => ['nullable', 'email'],
            'username' => ['nullable', 'string'],
            'password' => ['nullable', 'string'],
            'from_name' => ['nullable', 'string'],
            'auto_reply_enabled' => ['required', 'boolean'],
            'operator_approval_required' => ['required', 'boolean'],
            'sync_interval_minutes' => ['nullable', 'integer', 'min:1', 'max:120'],
            'monitored_folders' => ['nullable', 'array'],
        ]);

        $setting = IntegrationSetting::query()->firstOrCreate(['channel' => 'gmail']);
        $existingSecrets = is_array($setting->secret_meta) ? $setting->secret_meta : [];
        $setting->update([
            'enabled' => $data['enabled'],
            'connection_type' => 'imap_smtp',
            'public_meta' => [
                'email_address' => $data['email_address'] ?? null,
                'from_name' => $data['from_name'] ?? null,
                'imap_host' => $data['imap_host'] ?? null,
                'imap_port' => $data['imap_port'] ?? 993,
                'imap_encryption' => $data['imap_encryption'] ?? 'ssl',
                'smtp_host' => $data['smtp_host'] ?? null,
                'smtp_port' => $data['smtp_port'] ?? 465,
                'smtp_encryption' => $data['smtp_encryption'] ?? 'ssl',
                'auto_reply_enabled' => $data['auto_reply_enabled'],
                'operator_approval_required' => $data['operator_approval_required'],
                'sync_interval_minutes' => $data['sync_interval_minutes'] ?? 5,
                'monitored_folders' => $data['monitored_folders'] ?? ['INBOX'],
            ],
            'secret_meta' => [
                'username' => filled($data['username'] ?? null) ? $data['username'] : ($existingSecrets['username'] ?? null),
                'password' => filled($data['password'] ?? null) ? $data['password'] : ($existingSecrets['password'] ?? null),
            ],
        ]);

        return response()->json([
            'message' => 'Mail ayarları yadda saxlanıldı.',
        ]);
    }

    public function syncGmail(Request $request)
    {
        $data = $request->validate([
            'limit' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $result = $this->gmailChannelService->sync((int) ($data['limit'] ?? 20));

        return response()->json([
            'message' => 'Mail sync tamamlandı.',
            'data' => $result,
        ]);
    }

    public function automation()
    {
        return response()->json([
            'rule' => AiAutomationRule::query()->firstOrCreate([], []),
        ]);
    }

    public function updateAutomation(Request $request)
    {
        $data = $request->validate([
            'auto_reply_all' => ['required', 'boolean'],
            'work_hours_only' => ['required', 'boolean'],
            'product_stock_only' => ['required', 'boolean'],
            'price_questions' => ['required', 'boolean'],
            'order_questions' => ['required', 'boolean'],
            'hide_finance_data' => ['required', 'boolean'],
            'low_confidence_handoff' => ['required', 'boolean'],
            'analyze_voice' => ['required', 'boolean'],
            'analyze_image' => ['required', 'boolean'],
            'create_lead_if_missing' => ['required', 'boolean'],
            'human_handoff_enabled' => ['required', 'boolean'],
            'blacklist_words' => ['nullable', 'array'],
            'template_replies' => ['nullable', 'array'],
        ]);

        $rule = AiAutomationRule::query()->firstOrCreate([], []);
        $rule->update($data);

        return response()->json(['message' => 'Automation qaydaları yeniləndi.']);
    }
}
