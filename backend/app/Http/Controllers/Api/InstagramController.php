<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ConversationService;
use App\Services\InstagramService;
use Illuminate\Http\Request;

class InstagramController extends Controller
{
    public function __construct(
        protected InstagramService $service,
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
        $entry = $request->input('entry.0.messaging.0', []);
        $sender = $entry['sender']['id'] ?? 'instagram-user';
        $text = $entry['message']['text'] ?? 'Yeni Instagram mesajı';

        $conversation = $this->conversationService->receiveIncoming([
            'channel' => 'instagram',
            'customer_identifier' => $sender,
            'customer_username' => $sender,
            'customer_name' => $sender,
            'body' => $text,
            'message_type' => 'text',
            'meta' => $request->all(),
        ]);

        return response()->json(['received' => true, 'conversation_id' => $conversation->id]);
    }

    public function sendMessage()
    {
        return response()->json(['message' => 'Instagram send structure hazırdır. Rəsmi token qoşulduqdan sonra aktivləşdirilə bilər.']);
    }
}
