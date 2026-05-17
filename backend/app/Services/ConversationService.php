<?php

namespace App\Services;

use App\Models\AiReplySuggestion;
use App\Models\Conversation;
use App\Models\ConversationCustomerLink;
use App\Models\CrmLead;
use App\Models\Customer;
use App\Models\Message;
use App\Models\MessageLog;
use App\Models\Product;
use App\Models\User;

class ConversationService
{
    public function __construct(
        protected CrmService $crmService,
        protected SettingsNotificationService $notificationService,
    ) {
    }

    public function inbox(?User $user): array
    {
        $query = Conversation::query()
            ->with(['links.customer', 'links.lead', 'messages' => fn ($q) => $q->latest()->take(1)])
            ->orderByDesc('last_message_at')
            ->orderByDesc('updated_at');

        if ($user && ! $this->crmService->canViewAll($user)) {
            $query->where('assigned_user_id', $user->id);
        }

        return $query->take(100)->get()->map(fn (Conversation $conversation) => $this->serializeConversation($conversation))->all();
    }

    public function detail(Conversation $conversation): array
    {
        $conversation->load(['messages.attachments', 'links.customer.sales', 'links.lead', 'assignedUser']);
        $customer = $conversation->links->first()?->customer;
        $lead = $conversation->links->first()?->lead;
        $suggestion = AiReplySuggestion::query()->where('conversation_id', $conversation->id)->latest()->first();
        $aiLastMessage = $conversation->messages()->where('sender_type', 'ai')->latest()->first();

        return [
            ...$this->serializeConversation($conversation),
            'messages' => $conversation->messages()->with('attachments')->oldest()->get(),
            'customer' => $customer,
            'lead' => $lead,
            'ai_suggestion' => $suggestion,
            'interested_products' => $conversation->meta['interested_products'] ?? [],
            'ai_last_message' => $aiLastMessage ? [
                'id' => $aiLastMessage->id,
                'body' => $aiLastMessage->body,
                'created_at' => $aiLastMessage->created_at?->toIso8601String(),
            ] : null,
            'related_sales' => $customer?->sales()->latest('sale_date')->take(5)->get() ?? [],
        ];
    }

    public function syncExternalConversation(array $payload, ?User $responsibleUser = null): Conversation
    {
        $externalThreadId = (string) ($payload['external_thread_id'] ?? $payload['customer_identifier'] ?? $payload['customer_phone'] ?? '');
        $customerIdentifier = $payload['customer_identifier'] ?? $payload['customer_phone'] ?? $payload['customer_username'] ?? $externalThreadId;

        $conversation = Conversation::query()->firstOrNew([
            'channel' => $payload['channel'],
            'external_thread_id' => $externalThreadId,
        ]);

        if (! $conversation->exists) {
            $conversation->status = 'new';
            $conversation->assigned_user_id = $responsibleUser?->id;
        }

        $conversation->fill([
            'customer_name' => $payload['customer_name'] ?? $conversation->customer_name,
            'customer_identifier' => $customerIdentifier,
            'customer_phone' => $payload['customer_phone'] ?? $conversation->customer_phone,
            'customer_username' => $payload['customer_username'] ?? $conversation->customer_username,
        ]);
        $conversation->save();

        $messages = collect($payload['messages'] ?? [])
            ->filter(fn ($message) => filled($message['external_message_id'] ?? null) || filled($message['body'] ?? null))
            ->sortBy(fn ($message) => $message['sent_at'] ?? now()->toIso8601String())
            ->values();

        foreach ($messages as $messagePayload) {
            $lookup = ['conversation_id' => $conversation->id];

            if (filled($messagePayload['external_message_id'] ?? null)) {
                $lookup['external_message_id'] = $messagePayload['external_message_id'];
            } else {
                $lookup['body'] = $messagePayload['body'] ?? null;
                $lookup['sender_type'] = $messagePayload['sender_type'] ?? 'customer';
                $lookup['sent_at'] = $messagePayload['sent_at'] ?? null;
            }

            Message::query()->updateOrCreate($lookup, [
                'channel' => $payload['channel'],
                'direction' => $messagePayload['direction'] ?? 'incoming',
                'message_type' => $messagePayload['message_type'] ?? 'text',
                'sender_type' => $messagePayload['sender_type'] ?? 'customer',
                'body' => $messagePayload['body'] ?? null,
                'status' => $messagePayload['status'] ?? 'received',
                'meta' => $messagePayload['meta'] ?? [],
                'sent_at' => $messagePayload['sent_at'] ?? null,
            ]);
        }

        $lastMessage = $conversation->messages()
            ->orderByRaw('COALESCE(sent_at, created_at) desc')
            ->latest('id')
            ->first();

        $meta = $conversation->meta ?? [];
        $meta['sync_source'] = $payload['sync_source'] ?? ($payload['channel'] ?? 'external');
        $meta['interested_products'] = $this->detectInterestedProducts($conversation);
        $meta['last_synced_at'] = now()->toIso8601String();

        $conversation->update([
            'last_message_id' => $lastMessage?->id,
            'last_message_at' => $lastMessage?->sent_at ?? $lastMessage?->created_at ?? now(),
            'meta' => $meta,
        ]);

        $this->linkCustomerOrLead($conversation, [
            'channel' => $payload['channel'],
            'customer_name' => $payload['customer_name'] ?? null,
            'customer_phone' => $payload['customer_phone'] ?? null,
            'customer_identifier' => $customerIdentifier,
            'customer_username' => $payload['customer_username'] ?? null,
            'body' => $lastMessage?->body,
        ], $responsibleUser);

        $this->syncInterestNotes($conversation);

        return $conversation->fresh(['links.customer', 'links.lead', 'messages', 'assignedUser']);
    }

    public function receiveIncoming(array $payload, ?User $responsibleUser = null): Conversation
    {
        $conversation = Conversation::query()->firstOrCreate(
            [
                'channel' => $payload['channel'],
                'customer_identifier' => $payload['customer_identifier'],
            ],
            [
                'customer_name' => $payload['customer_name'] ?? null,
                'customer_phone' => $payload['customer_phone'] ?? null,
                'customer_username' => $payload['customer_username'] ?? null,
                'status' => 'new',
                'assigned_user_id' => $responsibleUser?->id,
                'last_message_at' => now(),
            ]
        );

        $message = Message::create([
            'conversation_id' => $conversation->id,
            'channel' => $payload['channel'],
            'direction' => 'incoming',
            'message_type' => $payload['message_type'] ?? 'text',
            'sender_type' => 'customer',
            'body' => $payload['body'] ?? null,
            'external_message_id' => $payload['external_message_id'] ?? null,
            'status' => 'received',
            'meta' => $payload['meta'] ?? [],
        ]);

        $conversation->update([
            'last_message_id' => $message->id,
            'last_message_at' => now(),
            'status' => 'new',
        ]);

        $this->linkCustomerOrLead($conversation, $payload, $responsibleUser);
        MessageLog::create([
            'conversation_id' => $conversation->id,
            'message_id' => $message->id,
            'channel' => $conversation->channel,
            'action' => 'incoming_received',
            'status' => 'ok',
            'detail' => 'Incoming message accepted.',
        ]);

        return $conversation->fresh();
    }

    public function sendReply(Conversation $conversation, string $body, string $sender = 'operator', ?User $user = null): Message
    {
        $message = Message::create([
            'conversation_id' => $conversation->id,
            'channel' => $conversation->channel,
            'direction' => 'outgoing',
            'message_type' => 'text',
            'sender_type' => $sender,
            'user_id' => $user?->id,
            'body' => $body,
            'status' => 'queued',
            'sent_at' => now(),
        ]);

        $conversation->update([
            'last_message_id' => $message->id,
            'last_message_at' => now(),
            'status' => 'replied',
        ]);

        MessageLog::create([
            'conversation_id' => $conversation->id,
            'message_id' => $message->id,
            'channel' => $conversation->channel,
            'action' => 'reply_sent',
            'status' => 'ok',
            'detail' => 'Reply queued/sent from ERP.',
        ]);

        return $message;
    }

    public function setAiPaused(Conversation $conversation, bool $paused): Conversation
    {
        $meta = $conversation->meta ?? [];
        $meta['ai_paused'] = $paused;
        $meta['ai_pause_updated_at'] = now()->toIso8601String();

        $conversation->update([
            'meta' => $meta,
        ]);

        MessageLog::create([
            'conversation_id' => $conversation->id,
            'channel' => $conversation->channel,
            'action' => $paused ? 'ai_paused' : 'ai_resumed',
            'status' => 'ok',
            'detail' => $paused ? 'AI conversation paused by operator.' : 'AI conversation resumed by operator.',
        ]);

        return $conversation->fresh(['links.customer', 'links.lead', 'messages', 'assignedUser']);
    }

    protected function linkCustomerOrLead(Conversation $conversation, array $payload, ?User $responsibleUser): void
    {
        if ($conversation->links()->exists()) {
            return;
        }

        $customer = null;
        if (filled($payload['customer_phone'] ?? null)) {
            $customer = Customer::query()->where('phone', $payload['customer_phone'])->first();
        }

        if (! $customer && filled($payload['customer_identifier'] ?? null)) {
            $customer = Customer::query()->where('phone', $payload['customer_identifier'])->orWhere('email', $payload['customer_identifier'])->first();
        }

        if ($customer) {
            ConversationCustomerLink::create([
                'conversation_id' => $conversation->id,
                'customer_id' => $customer->id,
                'match_type' => 'matched',
            ]);

            return;
        }

        $channel = (string) ($payload['channel'] ?? 'other');
        $leadSource = match ($channel) {
            'instagram' => 'social_media',
            'gmail' => 'other',
            default => 'call',
        };

        $lead = CrmLead::create([
            'owner_user_id' => $responsibleUser?->id,
            'title' => 'Omnichannel lead: '.($payload['customer_name'] ?? $payload['customer_identifier'] ?? 'Yeni mesaj'),
            'name' => $payload['customer_name'] ?? ($payload['customer_identifier'] ?? 'Yeni kontakt'),
            'phone' => $payload['customer_phone'] ?? null,
            'email' => $channel === 'gmail' ? ($payload['customer_identifier'] ?? null) : null,
            'source' => $leadSource,
            'status' => 'new',
            'score' => $this->crmService->computeLeadScore([
                'phone' => $payload['customer_phone'] ?? null,
                'status' => 'new',
                'source' => $leadSource,
            ]),
            'notes' => $payload['body'] ?? null,
        ]);

        ConversationCustomerLink::create([
            'conversation_id' => $conversation->id,
            'lead_id' => $lead->id,
            'match_type' => 'lead_created',
        ]);
    }

    protected function serializeConversation(Conversation $conversation): array
    {
        $last = $conversation->messages->first();
        $customer = $conversation->links->first()?->customer;
        $lead = $conversation->links->first()?->lead;

        return [
            'id' => $conversation->id,
            'channel' => $conversation->channel,
            'customer_name' => $conversation->customer_name ?? $customer?->name ?? $lead?->name,
            'customer_identifier' => $conversation->customer_phone ?: $conversation->customer_username ?: $conversation->customer_identifier,
            'status' => $conversation->status,
            'ai_paused' => (bool) ($conversation->meta['ai_paused'] ?? false),
            'interested_products' => $conversation->meta['interested_products'] ?? [],
            'last_message' => $last?->body,
            'last_message_at' => $conversation->last_message_at?->toIso8601String(),
            'assigned_user' => $conversation->assignedUser ? ['id' => $conversation->assignedUser->id, 'name' => $conversation->assignedUser->name] : null,
        ];
    }

    protected function detectInterestedProducts(Conversation $conversation): array
    {
        $incomingBodies = $conversation->messages()
            ->where('sender_type', 'customer')
            ->whereNotNull('body')
            ->latest('sent_at')
            ->take(15)
            ->pluck('body')
            ->filter()
            ->map(fn ($body) => mb_strtolower((string) $body))
            ->implode(' ');

        if (! filled($incomingBodies)) {
            return [];
        }

        return Product::query()
            ->where('is_active', true)
            ->select(['id', 'name', 'product_code'])
            ->get()
            ->map(function (Product $product) use ($incomingBodies) {
                $score = 0;
                $name = mb_strtolower($product->name);
                $code = filled($product->product_code) ? mb_strtolower((string) $product->product_code) : null;

                if ($name !== '' && str_contains($incomingBodies, $name)) {
                    $score += 3;
                }

                if ($code && str_contains($incomingBodies, $code)) {
                    $score += 2;
                }

                return $score > 0 ? [
                    'id' => $product->id,
                    'name' => $product->name,
                    'product_code' => $product->product_code,
                    'score' => $score,
                ] : null;
            })
            ->filter()
            ->sortByDesc('score')
            ->take(5)
            ->values()
            ->all();
    }

    protected function syncInterestNotes(Conversation $conversation): void
    {
        $products = collect($conversation->meta['interested_products'] ?? [])
            ->pluck('name')
            ->filter()
            ->unique()
            ->values();

        if ($products->isEmpty()) {
            return;
        }

        $label = match ($conversation->channel) {
            'gmail' => 'Mail maraqi',
            'instagram' => 'Instagram maraqi',
            default => 'WhatsApp maraqi',
        };
        $noteLine = $label.': '.$products->implode(', ');
        $customer = $conversation->links->first()?->customer;
        $lead = $conversation->links->first()?->lead;

        if ($customer) {
            $existing = (string) ($customer->crm_note ?? '');
            if (! str_contains($existing, $noteLine)) {
                $customer->update([
                    'crm_note' => trim($existing."\n".$noteLine),
                    'last_contact_at' => now(),
                    'next_action' => $products->count() ? 'WhatsApp sorğusuna geri dönüş et' : $customer->next_action,
                ]);
            }
        }

        if ($lead) {
            $existing = (string) ($lead->notes ?? '');
            if (! str_contains($existing, $noteLine)) {
                $lead->update([
                    'notes' => trim($existing."\n".$noteLine),
                ]);
            }
        }
    }
}
