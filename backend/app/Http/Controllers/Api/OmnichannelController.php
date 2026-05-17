<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Services\ConversationService;
use App\Services\GmailChannelService;
use App\Services\HumanHandoffService;
use App\Services\MessageRouterService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OmnichannelController extends Controller
{
    public function __construct(
        protected ConversationService $conversationService,
        protected MessageRouterService $routerService,
        protected HumanHandoffService $handoffService,
        protected GmailChannelService $gmailChannelService,
    ) {
    }

    public function inbox(Request $request)
    {
        $this->gmailChannelService->maybeAutoSync(20, 60);

        return response()->json([
            'data' => $this->conversationService->inbox($request->user()),
        ]);
    }

    public function show(Request $request, Conversation $conversation)
    {
        return response()->json([
            'data' => $this->conversationService->detail($conversation),
        ]);
    }

    public function reply(Request $request, Conversation $conversation)
    {
        $data = $request->validate([
            'body' => ['required', 'string', 'max:5000'],
            'sender' => ['nullable', 'in:operator,ai'],
        ]);

        $message = $this->conversationService->sendReply($conversation, $data['body'], $data['sender'] ?? 'operator', $request->user());

        if ($conversation->channel === 'gmail') {
            $this->gmailChannelService->sendConversationReply($conversation, $message);
        }

        return response()->json(['data' => $message]);
    }

    public function aiSuggest(Request $request, Conversation $conversation)
    {
        return response()->json([
            'data' => $this->routerService->suggest($conversation, null, $request->user()),
        ]);
    }

    public function handoff(Request $request, Conversation $conversation)
    {
        $data = $request->validate([
            'reason' => ['required', 'string', 'max:255'],
        ]);

        $handoff = $this->handoffService->create($conversation, null, $request->user(), $data['reason']);

        return response()->json(['data' => $handoff]);
    }

    public function toggleAi(Request $request, Conversation $conversation)
    {
        $data = $request->validate([
            'paused' => ['required', 'boolean'],
        ]);

        return response()->json([
            'data' => $this->conversationService->setAiPaused($conversation, (bool) $data['paused']),
        ]);
    }

    public function settings()
    {
        return response()->json([
            'summary' => [
                'inbox_count' => Conversation::query()->count(),
                'new_count' => Conversation::query()->where('status', 'new')->count(),
                'human_required_count' => Conversation::query()->where('status', 'human_required')->count(),
            ],
        ]);
    }

    public function updateSettings(Request $request)
    {
        return response()->json(['message' => 'Omnichannel əsas ayarları CRM və AI settings üzərindən idarə olunur.']);
    }

    public function logs()
    {
        return response()->json([
            'data' => \App\Models\MessageLog::query()->latest()->take(100)->get(),
        ]);
    }

    public function syncWhatsApp(Request $request): JsonResponse
    {
        $secret = (string) env('APP_AI_LICENSE_SECRET', '');
        $provided = (string) $request->header('X-BESTSOL-INTERNAL-SECRET', '');

        abort_unless($secret !== '' && hash_equals($secret, $provided), 403, 'Forbidden');

        $data = $request->validate([
            'external_thread_id' => ['required', 'string', 'max:255'],
            'customer_name' => ['nullable', 'string', 'max:255'],
            'customer_identifier' => ['nullable', 'string', 'max:255'],
            'customer_phone' => ['nullable', 'string', 'max:255'],
            'customer_username' => ['nullable', 'string', 'max:255'],
            'messages' => ['array'],
            'messages.*.external_message_id' => ['nullable', 'string', 'max:255'],
            'messages.*.body' => ['nullable', 'string'],
            'messages.*.direction' => ['required', 'in:incoming,outgoing'],
            'messages.*.sender_type' => ['required', 'in:customer,ai,operator,system'],
            'messages.*.message_type' => ['nullable', 'in:text,audio,image,video,file'],
            'messages.*.status' => ['nullable', 'string', 'max:50'],
            'messages.*.sent_at' => ['nullable', 'date'],
            'messages.*.meta' => ['nullable', 'array'],
        ]);

        $conversation = $this->conversationService->syncExternalConversation([
            ...$data,
            'channel' => 'whatsapp',
        ]);

        return response()->json([
            'data' => $this->conversationService->detail($conversation),
        ]);
    }
}
