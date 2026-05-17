<?php

namespace Tests\Feature;

use App\Models\SystemSetting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class SystemSettingEncryptionTest extends TestCase
{
    use RefreshDatabase;

    public function test_system_setting_values_are_encrypted_at_rest(): void
    {
        $setting = SystemSetting::create([
            'key' => 'notification_settings',
            'value' => ['channels' => ['email' => ['password' => 'super-secret']]],
        ]);

        $rawValue = DB::table('system_settings')->where('id', $setting->id)->value('value');

        $this->assertIsString($rawValue);
        $this->assertStringNotContainsString('super-secret', $rawValue);
        $this->assertSame('super-secret', $setting->fresh()->value['channels']['email']['password']);
    }
}
