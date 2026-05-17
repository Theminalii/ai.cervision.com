<?php

namespace App\Services;

use App\Models\ImageAnalysis;
use App\Models\Message;

class ImageVisionService
{
    public function analyze(Message $message): ImageAnalysis
    {
        return ImageAnalysis::create([
            'message_id' => $message->id,
            'provider' => 'pending',
            'summary' => 'Şəkil qəbul edildi. Vision/OCR provider qoşulduqda ətraflı analiz burada saxlanacaq.',
            'matched_products' => [],
            'ocr_payload' => [],
            'meta' => ['status' => 'placeholder'],
        ]);
    }
}
