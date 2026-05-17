<?php

namespace App\Services;

use App\Models\AiConversationLog;
use App\Models\AiUsageLog;
use App\Models\User;

class AiUsageService
{
    public function logUsage(array $payload, ?User $user = null): AiUsageLog
    {
        return AiUsageLog::create([
            'provider' => $payload['provider'] ?? null,
            'model' => $payload['model'] ?? null,
            'prompt_tokens' => (int) ($payload['prompt_tokens'] ?? 0),
            'completion_tokens' => (int) ($payload['completion_tokens'] ?? 0),
            'total_tokens' => (int) ($payload['total_tokens'] ?? 0),
            'cost_estimate' => (float) ($payload['cost_estimate'] ?? 0),
            'module' => $payload['module'] ?? 'omnichannel',
            'action_type' => $payload['action_type'] ?? 'reply',
            'user_id' => $user?->id,
            'company_id' => $payload['company_id'] ?? null,
            'meta' => $payload['meta'] ?? [],
        ]);
    }

    public function logConversation(array $payload): AiConversationLog
    {
        return AiConversationLog::create([
            'module' => $payload['module'] ?? 'omnichannel',
            'conversation_id' => $payload['conversation_id'] ?? null,
            'prompt_summary' => $payload['prompt_summary'] ?? null,
            'response_summary' => $payload['response_summary'] ?? null,
            'confidence_score' => (int) ($payload['confidence_score'] ?? 0),
            'data_sources' => $payload['data_sources'] ?? [],
            'sent_automatically' => (bool) ($payload['sent_automatically'] ?? false),
        ]);
    }
}
