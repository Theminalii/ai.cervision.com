<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AiAgentTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(DatabaseSeeder::class);
        $user = User::where('email', 'admin@bestsol.az')->firstOrFail();
        Sanctum::actingAs($user);
    }

    public function test_ai_agent_overview_endpoint_returns_health_score(): void
    {
        $response = $this->getJson('/api/ai-agent/overview');

        $response->assertOk()
            ->assertJsonStructure([
                'health_score',
                'key_risks',
                'key_opportunities',
                'dashboard_cards',
                'recommendations',
                'action_suggestions',
            ]);
    }

    public function test_ai_agent_chat_endpoint_returns_message(): void
    {
        $response = $this->postJson('/api/ai-agent/chat', [
            'message' => 'Bu ay nə qədər mənfəət etmişəm?',
        ]);

        $response->assertOk()
            ->assertJsonStructure([
                'message',
                'used_ai',
            ]);
    }
}
