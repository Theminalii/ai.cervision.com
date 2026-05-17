<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Message extends Model
{
    protected $fillable = [
        'conversation_id',
        'channel',
        'direction',
        'message_type',
        'sender_type',
        'user_id',
        'body',
        'external_message_id',
        'confidence_score',
        'status',
        'data_sources',
        'meta',
        'sent_at',
    ];

    protected function casts(): array
    {
        return [
            'data_sources' => 'array',
            'meta' => 'array',
            'sent_at' => 'datetime',
        ];
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(MessageAttachment::class);
    }
}
