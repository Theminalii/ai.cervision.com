<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AiConversationLog extends Model
{
    protected $fillable = [
        'module',
        'conversation_id',
        'prompt_summary',
        'response_summary',
        'confidence_score',
        'data_sources',
        'sent_automatically',
    ];

    protected function casts(): array
    {
        return [
            'data_sources' => 'array',
            'sent_automatically' => 'boolean',
        ];
    }
}
