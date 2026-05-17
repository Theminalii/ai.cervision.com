<?php

namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;

class UpdateNotificationSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'channels.email.enabled' => ['required', 'boolean'],
            'channels.email.host' => ['nullable', 'string'],
            'channels.email.port' => ['nullable', 'integer'],
            'channels.email.encryption' => ['nullable', 'string'],
            'channels.email.username' => ['nullable', 'string'],
            'channels.email.password' => ['nullable', 'string'],
            'channels.email.from_address' => ['nullable', 'email'],
            'channels.email.from_name' => ['nullable', 'string'],
            'channels.email.recipient' => ['nullable', 'email'],
            'channels.telegram.enabled' => ['required', 'boolean'],
            'channels.telegram.bot_token' => ['nullable', 'string'],
            'channels.telegram.chat_id' => ['nullable', 'string'],
            'events.low_stock' => ['required', 'boolean'],
            'events.new_order' => ['required', 'boolean'],
            'events.payment' => ['required', 'boolean'],
            'events.weekly_summary' => ['required', 'boolean'],
            'events.failed_login' => ['required', 'boolean'],
            'events.ai_agent' => ['required', 'boolean'],
        ];
    }
}
