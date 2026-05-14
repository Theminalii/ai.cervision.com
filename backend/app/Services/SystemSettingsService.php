<?php

namespace App\Services;

use App\Models\SystemSetting;

class SystemSettingsService
{
    public function get(string $key, mixed $default = null): mixed
    {
        return SystemSetting::query()->where('key', $key)->first()?->value ?? $default;
    }

    public function set(string $key, mixed $value): SystemSetting
    {
        return SystemSetting::updateOrCreate(
            ['key' => $key],
            ['value' => $value]
        );
    }

    public function all(array $defaults = []): array
    {
        $settings = SystemSetting::query()->get()->pluck('value', 'key')->all();

        return array_replace($defaults, $settings);
    }
}
