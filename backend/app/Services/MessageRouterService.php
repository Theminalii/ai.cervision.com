<?php

namespace App\Services;

use App\Models\AiReplySuggestion;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;

class MessageRouterService
{
    public function __construct(
        protected ConversationService $conversationService,
        protected AiReplyGeneratorService $replyGenerator,
        protected AiUsageService $usageService,
        protected HumanHandoffService $handoffService,
        protected AiTokenLicenseService $licenseService,
        protected AiProviderService $providerService,
    ) {
    }

    public function suggest(Conversation $conversation, ?Message $message = null, ?User $user = null): AiReplySuggestion
    {
        $sourceMessage = $message ?: $conversation->messages()->latest()->firstOrFail();
        $result = $this->replyGenerator->generate($conversation, (string) ($sourceMessage->body ?? ''));

        $suggestion = AiReplySuggestion::create([
            'conversation_id' => $conversation->id,
            'message_id' => $sourceMessage->id,
            'reply_text' => $result['reply_text'],
            'confidence_score' => (int) $result['confidence_score'],
            'data_sources' => $result['data_sources'] ?? [],
            'risk_warning' => $result['risk_warning'] ?? null,
            'approval_required' => (bool) ($result['approval_required'] ?? true),
            'was_sent' => false,
        ]);

        $this->usageService->logConversation([
            'conversation_id' => $conversation->id,
            'prompt_summary' => $sourceMessage->body,
            'response_summary' => $result['reply_text'],
            'confidence_score' => $result['confidence_score'],
            'data_sources' => $result['data_sources'] ?? [],
            'sent_automatically' => false,
        ]);

        $usage = $result['usage'] ?? [];
        $totalTokens = (int) ($usage['total_tokens'] ?? 0);
        $licenseValidation = $this->licenseService->validate($this->providerService->credential('openai')->token_code);
        $this->licenseService->consume($licenseValidation['license'] ?? null, $totalTokens);
        $this->usageService->logUsage([
            'provider' => 'openai',
            'model' => $result['model'] ?? $this->providerService->settings()->model,
            'prompt_tokens' => (int) ($usage['input_tokens'] ?? 0),
            'completion_tokens' => (int) ($usage['output_tokens'] ?? 0),
            'total_tokens' => $totalTokens,
            'module' => 'omnichannel',
            'action_type' => 'suggest',
            'meta' => ['conversation_id' => $conversation->id],
        ], $user);

        if (($result['risk_warning'] ?? null) && ($result['confidence_score'] ?? 0) < 60) {
            $this->handoffService->create($conversation, $sourceMessage, $user, (string) $result['risk_warning']);
        }

        return $suggestion;
    }
}
