<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Conversation extends Model
{
    protected $fillable = [
        'channel',
        'channel_account_id',
        'external_thread_id',
        'customer_name',
        'customer_identifier',
        'customer_phone',
        'customer_username',
        'status',
        'assigned_user_id',
        'last_message_id',
        'last_message_at',
        'meta',
    ];

    protected function casts(): array
    {
        return [
            'last_message_at' => 'datetime',
            'meta' => 'array',
        ];
    }

    public function messages(): HasMany
    {
        return $this->hasMany(Message::class);
    }

    public function links(): HasMany
    {
        return $this->hasMany(ConversationCustomerLink::class);
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(ChannelAccount::class, 'channel_account_id');
    }

    public function assignedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_user_id');
    }
}
