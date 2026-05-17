<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AiAutomationRule extends Model
{
    protected $fillable = [
        'auto_reply_all',
        'work_hours_only',
        'product_stock_only',
        'price_questions',
        'order_questions',
        'hide_finance_data',
        'low_confidence_handoff',
        'analyze_voice',
        'analyze_image',
        'create_lead_if_missing',
        'human_handoff_enabled',
        'blacklist_words',
        'template_replies',
        'business_hours',
    ];

    protected function casts(): array
    {
        return [
            'auto_reply_all' => 'boolean',
            'work_hours_only' => 'boolean',
            'product_stock_only' => 'boolean',
            'price_questions' => 'boolean',
            'order_questions' => 'boolean',
            'hide_finance_data' => 'boolean',
            'low_confidence_handoff' => 'boolean',
            'analyze_voice' => 'boolean',
            'analyze_image' => 'boolean',
            'create_lead_if_missing' => 'boolean',
            'human_handoff_enabled' => 'boolean',
            'blacklist_words' => 'array',
            'template_replies' => 'array',
            'business_hours' => 'array',
        ];
    }
}
