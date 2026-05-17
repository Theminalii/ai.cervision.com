<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ConversationService;
use App\Services\WhatsAppWebService;
use Illuminate\Http\Request;

class WhatsAppWebController extends Controller
{
    public function __construct(
        protected WhatsAppWebService $service,
        protected ConversationService $conversationService,
    ) {
    }

    public function status()
    {
        return response()->json($this->service->status());
    }

    public function qr()
    {
        return response()->json($this->service->connect());
    }

    public function connect()
    {
        return response()->json($this->service->connect());
    }

    public function disconnect()
    {
        $this->service->disconnect();

        return response()->json(['message' => 'WhatsApp Web bağlantısı ayrıldı.']);
    }

    public function sendMessage(Request $request)
    {
        $data = $request->validate([
            'customer_identifier' => ['required', 'string'],
            'body' => ['required', 'string'],
        ]);

        $conversation = $this->conversationService->receiveIncoming([
            'channel' => 'whatsapp',
            'customer_identifier' => $data['customer_identifier'],
            'customer_phone' => $data['customer_identifier'],
            'customer_name' => $data['customer_identifier'],
            'body' => 'Test outgoing request',
        ], $request->user());

        $message = $this->conversationService->sendReply($conversation, $data['body'], 'operator', $request->user());

        return response()->json(['data' => $message]);
    }
}
