<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MobileLoginTest extends TestCase
{
    use RefreshDatabase;

    public function test_inactive_mobile_user_cannot_log_in(): void
    {
        $this->seed(DatabaseSeeder::class);

        $user = User::where('email', 'admin@bestsol.az')->firstOrFail();
        $user->update(['status' => 'passive']);

        $response = $this->postJson('/api/mobile/login', [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $response->assertStatus(403);
        $response->assertJsonPath('message', 'İstifadəçi deaktiv edilib.');
    }
}
