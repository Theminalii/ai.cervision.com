<?php

namespace App\Services;

use App\Models\Conversation;
use App\Models\HumanHandoff;
use App\Models\Message;
use App\Models\User;

class HumanHandoffService
{
    public function create(Conversation $conversation, ?Message $message, ?User $user, string $reason): HumanHandoff
    {
        $conversation->update(['status' => 'human_required']);

        return HumanHandoff::create([
            'conversation_id' => $conversation->id,
            'message_id' => $message?->id,
            'assigned_user_id' => $user?->id,
            'reason' => $reason,
            'status' => 'open',
            'meta' => [],
        ]);
    }
}
