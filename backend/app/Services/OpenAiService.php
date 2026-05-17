<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class OpenAiService
{
    public function __construct(protected AiProviderService $providerService)
    {
    }

    public function isEnabled(): bool
    {
        return filled($this->providerService->resolvedApiKey());
    }

    public function text(string $system, array $payload, ?string $model = null): ?array
    {
        $key = $this->providerService->resolvedApiKey();
        if (! $key) {
            return null;
        }

        try {
            $response = Http::connectTimeout(3)
                ->timeout(15)
                ->withToken($key)
                ->post('https://api.openai.com/v1/responses', [
                    'model' => $model ?: env('OPENAI_AI_AGENT_MODEL', 'gpt-5.2'),
                    'input' => [
                        ['role' => 'system', 'content' => [['type' => 'input_text', 'text' => $system]]],
                        ['role' => 'user', 'content' => [['type' => 'input_text', 'text' => json_encode($payload, JSON_UNESCAPED_UNICODE)]]],
                    ],
                ]);

            if (! $response->successful()) {
                return null;
            }

            return [
                'text' => trim((string) ($response->json('output_text') ?? '')) ?: null,
                'usage' => $response->json('usage') ?? [],
                'model' => $model ?: env('OPENAI_AI_AGENT_MODEL', 'gpt-5.2'),
            ];
        } catch (Throwable $exception) {
            Log::warning('OpenAI sorğusu uğursuz oldu.', ['message' => $exception->getMessage()]);
            return null;
        }
    }
}
