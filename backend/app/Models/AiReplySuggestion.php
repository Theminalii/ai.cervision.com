<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiReplySuggestion extends Model
{
    protected $fillable = [
        'conversation_id',
        'message_id',
        'reply_text',
        'confidence_score',
        'data_sources',
        'risk_warning',
        'approval_required',
        'was_sent',
    ];

    protected function casts(): array
    {
        return [
            'data_sources' => 'array',
            'approval_required' => 'boolean',
            'was_sent' => 'boolean',
        ];
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }
}
