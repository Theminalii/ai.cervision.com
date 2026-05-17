<?php

namespace App\Services;

use App\Models\Message;
use App\Models\VoiceTranscription;

class SpeechToTextService
{
    public function transcribe(Message $message): VoiceTranscription
    {
        return VoiceTranscription::create([
            'message_id' => $message->id,
            'provider' => 'pending',
            'transcript' => $message->body ?: 'Səs mesajı qəbul edildi, transcription provider qoşulduqda mətn burada yaranacaq.',
            'confidence_score' => 0,
            'meta' => ['status' => 'placeholder'],
        ]);
    }
}
