<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ConversationService;
use App\Services\WhatsAppCloudService;
use Illuminate\Http\Request;

class WhatsAppCloudController extends Controller
{
    public function __construct(
        protected WhatsAppCloudService $service,
        protected ConversationService $conversationService,
    ) {
    }

    public function verify(Request $request)
    {
        $challenge = $this->service->verify(
            (string) $request->query('hub_verify_token', ''),
            (string) $request->query('hub_mode', ''),
            (string) $request->query('hub_challenge', '')
        );

        return $challenge ? response($challenge, 200) : response('Forbidden', 403);
    }

    public function webhook(Request $request)
    {
        $value = $request->input('entry.0.changes.0.value', []);
        $message = $value['messages'][0] ?? [];
        $from = $message['from'] ?? 'unknown';
        $text = $message['text']['body'] ?? 'Yeni WhatsApp mesajı';

        $conversation = $this->conversationService->receiveIncoming([
            'channel' => 'whatsapp',
            'customer_identifier' => $from,
            'customer_phone' => $from,
            'customer_name' => $from,
            'body' => $text,
            'message_type' => 'text',
            'external_message_id' => $message['id'] ?? null,
            'meta' => $request->all(),
        ]);

        return response()->json(['received' => true, 'conversation_id' => $conversation->id]);
    }

    public function sendMessage(Request $request)
    {
        return response()->json(['message' => 'WhatsApp Cloud send structure hazırdır. Rəsmi token qoşulduqdan sonra aktivləşdirilə bilər.']);
    }
}
