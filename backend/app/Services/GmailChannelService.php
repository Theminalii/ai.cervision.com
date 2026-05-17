<?php

namespace App\Services;

use App\Models\Conversation;
use App\Models\IntegrationSetting;
use App\Models\Message;
use App\Models\MessageLog;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use RuntimeException;

class GmailChannelService
{
    public function __construct(
        protected ConversationService $conversationService,
        protected MessageRouterService $routerService,
    ) {
    }

    public function sync(int $limit = 20): array
    {
        $setting = IntegrationSetting::query()->firstOrCreate(['channel' => 'gmail']);
        $meta = is_array($setting->public_meta) ? $setting->public_meta : [];
        $secrets = is_array($setting->secret_meta) ? $setting->secret_meta : [];

        if (! $setting->enabled) {
            throw new RuntimeException('Mail inteqrasiyası aktiv deyil.');
        }

        $username = (string) ($secrets['username'] ?? '');
        $password = (string) ($secrets['password'] ?? '');
        $imapHost = (string) ($meta['imap_host'] ?? '');

        if ($username === '' || $password === '' || $imapHost === '') {
            throw new RuntimeException('IMAP konfiqurasiyası tam deyil.');
        }

        $folders = collect($meta['monitored_folders'] ?? ['INBOX'])
            ->filter(fn ($folder) => is_string($folder) && trim($folder) !== '')
            ->map(fn ($folder) => trim((string) $folder))
            ->values()
            ->all();

        $messages = [];
        foreach ($folders as $folder) {
            $messages = [...$messages, ...$this->fetchFolderMessages([
                'host' => $imapHost,
                'port' => (int) ($meta['imap_port'] ?? 993),
                'encryption' => (string) ($meta['imap_encryption'] ?? 'ssl'),
                'username' => $username,
                'password' => $password,
                'folder' => $folder,
                'limit' => $limit,
            ])];
        }

        $grouped = collect($messages)
            ->filter(fn (array $message) => filled($message['message_id'] ?? null))
            ->sortBy(fn (array $message) => $message['date'] ?? now()->toIso8601String())
            ->groupBy(fn (array $message) => (string) ($message['thread_key'] ?? $message['from_email'] ?? $message['message_id']));

        $syncedConversations = 0;
        $syncedMessages = 0;
        $autoReplies = 0;

        foreach ($grouped as $threadMessages) {
            $first = $threadMessages->first();
            if (! is_array($first)) {
                continue;
            }

            $conversation = $this->conversationService->syncExternalConversation([
                'channel' => 'gmail',
                'sync_source' => 'gmail_imap',
                'external_thread_id' => $first['thread_key'] ?? $first['from_email'] ?? $first['message_id'],
                'customer_name' => $first['from_name'] ?? $first['from_email'] ?? 'Email contact',
                'customer_identifier' => $first['from_email'] ?? $first['message_id'],
                'messages' => $threadMessages->map(fn (array $message) => [
                    'external_message_id' => $message['message_id'],
                    'body' => $message['body'],
                    'direction' => 'incoming',
                    'sender_type' => 'customer',
                    'message_type' => 'text',
                    'status' => 'received',
                    'sent_at' => $message['date'],
                    'meta' => [
                        'subject' => $message['subject'],
                        'from_email' => $message['from_email'],
                        'from_name' => $message['from_name'],
                        'folder' => $message['folder'],
                        'references' => $message['references'],
                        'in_reply_to' => $message['in_reply_to'],
                    ],
                ])->values()->all(),
            ]);

            $syncedConversations++;
            $syncedMessages += $threadMessages->count();

            if (($meta['auto_reply_enabled'] ?? false) && ! ($meta['operator_approval_required'] ?? true)) {
                $latestIncoming = $conversation->messages()
                    ->where('direction', 'incoming')
                    ->latest('id')
                    ->first();

                if ($latestIncoming && $this->shouldAutoReply($conversation, $latestIncoming)) {
                    $suggestion = $this->routerService->suggest($conversation);
                    if (! $suggestion->approval_required && filled($suggestion->reply_text)) {
                        $reply = $this->conversationService->sendReply($conversation, $suggestion->reply_text, 'ai');
                        $this->sendConversationReply($conversation, $reply);
                        $suggestion->update(['was_sent' => true]);
                        $this->markAutoReply($conversation, $latestIncoming);
                        $autoReplies++;
                    }
                }
            }
        }

        $setting->update([
            'public_meta' => [
                ...$meta,
                'last_sync_run_at' => now()->toIso8601String(),
                'last_sync_status' => 'ok',
                'last_sync_result' => [
                    'conversations' => $syncedConversations,
                    'messages' => $syncedMessages,
                    'auto_replies' => $autoReplies,
                ],
            ],
        ]);

        return [
            'conversations' => $syncedConversations,
            'messages' => $syncedMessages,
            'auto_replies' => $autoReplies,
        ];
    }

    public function maybeAutoSync(int $limit = 20, int $intervalSeconds = 60): ?array
    {
        $setting = IntegrationSetting::query()->firstOrCreate(['channel' => 'gmail']);
        $meta = is_array($setting->public_meta) ? $setting->public_meta : [];

        if (! $setting->enabled) {
            return null;
        }

        $lastRunAt = $meta['last_sync_run_at'] ?? null;
        if ($lastRunAt) {
            $lastRun = strtotime((string) $lastRunAt);
            if ($lastRun && (time() - $lastRun) < $intervalSeconds) {
                return null;
            }
        }

        try {
            return $this->sync($limit);
        } catch (\Throwable $exception) {
            Log::warning('Gmail auto sync failed.', ['message' => $exception->getMessage()]);
            $setting->update([
                'public_meta' => [
                    ...$meta,
                    'last_sync_run_at' => now()->toIso8601String(),
                    'last_sync_status' => 'failed',
                    'last_sync_error' => $exception->getMessage(),
                ],
            ]);

            return null;
        }
    }

    public function sendConversationReply(Conversation $conversation, Message $message): void
    {
        $setting = IntegrationSetting::query()->firstOrCreate(['channel' => 'gmail']);
        $meta = is_array($setting->public_meta) ? $setting->public_meta : [];
        $secrets = is_array($setting->secret_meta) ? $setting->secret_meta : [];

        if (! $setting->enabled) {
            throw new RuntimeException('Mail inteqrasiyası aktiv deyil.');
        }

        $recipient = (string) ($conversation->customer_identifier ?: $conversation->customer_username ?: '');
        if ($recipient === '') {
            throw new RuntimeException('Mail recipient tapılmadı.');
        }

        config([
            'mail.default' => 'smtp',
            'mail.mailers.smtp.transport' => 'smtp',
            'mail.mailers.smtp.host' => (string) ($meta['smtp_host'] ?? ''),
            'mail.mailers.smtp.port' => (int) ($meta['smtp_port'] ?? 465),
            'mail.mailers.smtp.username' => (string) ($secrets['username'] ?? ''),
            'mail.mailers.smtp.password' => (string) ($secrets['password'] ?? ''),
            'mail.mailers.smtp.scheme' => $this->smtpScheme((string) ($meta['smtp_encryption'] ?? 'ssl')),
            'mail.from.address' => (string) ($meta['email_address'] ?? ''),
            'mail.from.name' => (string) ($meta['from_name'] ?? 'BESTSOL'),
        ]);

        $latestIncoming = $conversation->messages()
            ->where('direction', 'incoming')
            ->latest('id')
            ->first();

        $subject = $this->buildReplySubject((string) (($latestIncoming?->meta['subject'] ?? null) ?: 'Yeni məktub'));

        Mail::raw((string) $message->body, function ($mail) use ($recipient, $subject, $latestIncoming): void {
            $mail->to($recipient)->subject($subject);

            $messageId = $latestIncoming?->external_message_id;
            $references = (string) ($latestIncoming?->meta['references'] ?? '');
            if ($messageId) {
                $mail->getSymfonyMessage()->getHeaders()->addTextHeader('In-Reply-To', $messageId);
            }
            if ($references !== '') {
                $mail->getSymfonyMessage()->getHeaders()->addTextHeader('References', trim($references.' '.$messageId));
            }
        });

        $message->update([
            'status' => 'sent',
            'meta' => [
                ...((array) $message->meta),
                'subject' => $subject,
                'transport' => 'smtp',
                'sent_via' => 'gmail_channel',
            ],
        ]);

        MessageLog::create([
            'conversation_id' => $conversation->id,
            'message_id' => $message->id,
            'channel' => 'gmail',
            'action' => 'email_sent',
            'status' => 'ok',
            'detail' => 'Email reply sent over configured SMTP.',
        ]);
    }

    protected function shouldAutoReply(Conversation $conversation, Message $incoming): bool
    {
        $meta = is_array($conversation->meta) ? $conversation->meta : [];
        return (int) ($meta['last_gmail_auto_reply_message_id'] ?? 0) !== $incoming->id;
    }

    protected function markAutoReply(Conversation $conversation, Message $incoming): void
    {
        $meta = is_array($conversation->meta) ? $conversation->meta : [];
        $meta['last_gmail_auto_reply_message_id'] = $incoming->id;
        $conversation->update(['meta' => $meta]);
    }

    protected function buildReplySubject(string $subject): string
    {
        return str_starts_with(mb_strtolower($subject), 're:') ? $subject : 'Re: '.$subject;
    }

    protected function smtpScheme(string $encryption): ?string
    {
        return match (strtolower($encryption)) {
            'ssl' => 'smtps',
            'tls' => null,
            default => null,
        };
    }

    protected function fetchFolderMessages(array $config): array
    {
        $client = new RawImapClient(
            host: (string) $config['host'],
            port: (int) $config['port'],
            encryption: (string) $config['encryption'],
            username: (string) $config['username'],
            password: (string) $config['password'],
        );

        try {
            $client->connect();
            $client->selectMailbox((string) $config['folder']);
            $uids = $client->searchUids();
            $uids = array_slice($uids, max(0, count($uids) - (int) $config['limit']));

            $messages = [];
            foreach ($uids as $uid) {
                $raw = $client->fetchRfc822($uid);
                if ($raw === null || $raw === '') {
                    continue;
                }

                $parsed = $this->parseRawEmail($raw);
                if (! filled($parsed['message_id'] ?? null)) {
                    continue;
                }

                $messages[] = [
                    ...$parsed,
                    'folder' => (string) $config['folder'],
                ];
            }

            return $messages;
        } finally {
            $client->disconnect();
        }
    }

    protected function parseRawEmail(string $raw): array
    {
        [$headerText, $bodyText] = preg_split("/\r\n\r\n|\n\n/", $raw, 2) + ['', ''];
        $headers = $this->parseHeaders($headerText);

        $subject = $this->decodeHeaderValue($headers['subject'] ?? '');
        $fromRaw = $this->decodeHeaderValue($headers['from'] ?? '');
        $messageId = trim((string) ($headers['message-id'] ?? ''));
        $references = trim((string) ($headers['references'] ?? ''));
        $inReplyTo = trim((string) ($headers['in-reply-to'] ?? ''));
        $date = $this->normalizeDate((string) ($headers['date'] ?? ''));
        [$fromName, $fromEmail] = $this->parseAddress($fromRaw);

        $body = $this->extractReadableBody($headers, $bodyText);
        $threadKey = $references !== '' ? $this->firstMessageId($references) : ($inReplyTo !== '' ? $inReplyTo : ($fromEmail ?: $messageId));

        return [
            'subject' => $subject !== '' ? $subject : 'Yeni məktub',
            'from_name' => $fromName,
            'from_email' => $fromEmail,
            'message_id' => $messageId,
            'references' => $references,
            'in_reply_to' => $inReplyTo,
            'date' => $date,
            'body' => $body !== '' ? $body : '(Boş məktub məzmunu)',
            'thread_key' => $threadKey,
        ];
    }

    protected function parseHeaders(string $headerText): array
    {
        $headers = [];
        $current = null;

        foreach (preg_split("/\r\n|\n|\r/", $headerText) ?: [] as $line) {
            if ($line === '') {
                continue;
            }

            if (preg_match('/^\s+/', $line) === 1 && $current) {
                $headers[$current] .= ' '.trim($line);
                continue;
            }

            [$name, $value] = array_pad(explode(':', $line, 2), 2, null);
            if ($value === null) {
                continue;
            }

            $current = strtolower(trim($name));
            $headers[$current] = trim($value);
        }

        return $headers;
    }

    protected function decodeHeaderValue(string $value): string
    {
        if ($value === '') {
            return '';
        }

        $decoded = @iconv_mime_decode($value, ICONV_MIME_DECODE_CONTINUE_ON_ERROR, 'UTF-8');

        return trim($decoded !== false ? $decoded : mb_decode_mimeheader($value));
    }

    protected function parseAddress(string $value): array
    {
        if (preg_match('/^(.*)<([^>]+)>$/', $value, $matches) === 1) {
            return [trim(trim($matches[1]), "\"' "), trim($matches[2])];
        }

        return ['', trim($value)];
    }

    protected function normalizeDate(string $value): string
    {
        $timestamp = strtotime($value);
        return $timestamp ? now()->createFromTimestamp($timestamp)->toIso8601String() : now()->toIso8601String();
    }

    protected function firstMessageId(string $references): string
    {
        preg_match('/<[^>]+>/', $references, $matches);
        return $matches[0] ?? $references;
    }

    protected function extractReadableBody(array $headers, string $body): string
    {
        $contentType = strtolower((string) ($headers['content-type'] ?? 'text/plain'));
        $encoding = strtolower((string) ($headers['content-transfer-encoding'] ?? ''));

        if (str_contains($contentType, 'multipart/')) {
            $boundary = null;
            if (preg_match('/boundary="?([^";]+)"?/i', $contentType, $matches) === 1) {
                $boundary = $matches[1];
            }

            if ($boundary) {
                $parts = preg_split('/--'.preg_quote($boundary, '/').'(--)?\s*/', $body) ?: [];
                foreach ($parts as $part) {
                    if (! str_contains($part, 'Content-Type:')) {
                        continue;
                    }

                    [$partHeadersText, $partBody] = preg_split("/\r\n\r\n|\n\n/", $part, 2) + ['', ''];
                    $partHeaders = $this->parseHeaders($partHeadersText);
                    $partType = strtolower((string) ($partHeaders['content-type'] ?? 'text/plain'));
                    if (! str_contains($partType, 'text/plain') && ! str_contains($partType, 'text/html')) {
                        continue;
                    }

                    $decoded = $this->decodeBodyByEncoding((string) ($partHeaders['content-transfer-encoding'] ?? ''), $partBody);
                    return $this->cleanBody(str_contains($partType, 'text/html') ? strip_tags($decoded) : $decoded);
                }
            }
        }

        $decoded = $this->decodeBodyByEncoding($encoding, $body);
        return $this->cleanBody(str_contains($contentType, 'text/html') ? strip_tags($decoded) : $decoded);
    }

    protected function decodeBodyByEncoding(string $encoding, string $body): string
    {
        return match (strtolower($encoding)) {
            'base64' => (string) base64_decode(trim($body), true),
            'quoted-printable' => quoted_printable_decode($body),
            default => $body,
        };
    }

    protected function cleanBody(string $body): string
    {
        $text = preg_replace("/\r\n|\r/", "\n", $body) ?? $body;
        $text = preg_replace("/\n{3,}/", "\n\n", $text) ?? $text;
        return trim(mb_substr($text, 0, 5000));
    }
}

class RawImapClient
{
    protected $stream = null;

    protected int $tagCounter = 0;

    public function __construct(
        protected string $host,
        protected int $port,
        protected string $encryption,
        protected string $username,
        protected string $password,
    ) {
    }

    public function connect(): void
    {
        $scheme = strtolower($this->encryption) === 'ssl' ? 'ssl' : 'tcp';
        $this->stream = @stream_socket_client(
            sprintf('%s://%s:%d', $scheme, $this->host, $this->port),
            $errno,
            $errstr,
            20
        );

        if (! $this->stream) {
            throw new RuntimeException('IMAP bağlantısı alınmadı: '.$errstr);
        }

        stream_set_timeout($this->stream, 20);
        $this->readGreeting();

        if (strtolower($this->encryption) === 'tls') {
            $this->command('STARTTLS');
            if (! @stream_socket_enable_crypto($this->stream, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                throw new RuntimeException('STARTTLS aktivləşdirilmədi.');
            }
        }

        $this->command(sprintf('LOGIN %s %s', $this->quote($this->username), $this->quote($this->password)));
    }

    public function disconnect(): void
    {
        if (is_resource($this->stream)) {
            try {
                $this->command('LOGOUT');
            } catch (\Throwable) {
            }
            fclose($this->stream);
        }

        $this->stream = null;
    }

    public function selectMailbox(string $mailbox): void
    {
        $this->command('SELECT '.$this->quote($mailbox));
    }

    public function searchUids(): array
    {
        $response = $this->command('UID SEARCH ALL');
        foreach ($response['untagged'] as $line) {
            if (preg_match('/^\* SEARCH(.*)$/', $line, $matches) === 1) {
                return array_values(array_filter(array_map('trim', explode(' ', trim($matches[1])))));
            }
        }

        return [];
    }

    public function fetchRfc822(string $uid): ?string
    {
        $response = $this->command('UID FETCH '.$uid.' (RFC822)');
        foreach ($response['literals'] as $literal) {
            if (trim($literal) !== '') {
                return $literal;
            }
        }

        return null;
    }

    protected function command(string $command): array
    {
        if (! is_resource($this->stream)) {
            throw new RuntimeException('IMAP stream açıq deyil.');
        }

        $tag = 'A'.str_pad((string) (++$this->tagCounter), 4, '0', STR_PAD_LEFT);
        fwrite($this->stream, $tag.' '.$command."\r\n");

        $untagged = [];
        $literals = [];

        while (($line = fgets($this->stream)) !== false) {
            $untagged[] = rtrim($line, "\r\n");

            if (preg_match('/\{(\d+)\}\r?$/', $line, $matches) === 1) {
                $length = (int) $matches[1];
                $literal = '';
                while (strlen($literal) < $length) {
                    $chunk = fread($this->stream, $length - strlen($literal));
                    if ($chunk === false || $chunk === '') {
                        break;
                    }
                    $literal .= $chunk;
                }
                $literals[] = $literal;
            }

            if (str_starts_with($line, $tag.' ')) {
                if (! str_contains($line, 'OK')) {
                    throw new RuntimeException('IMAP command failed: '.trim($line));
                }
                break;
            }
        }

        return ['untagged' => $untagged, 'literals' => $literals];
    }

    protected function readGreeting(): void
    {
        $line = fgets($this->stream);
        if ($line === false || ! str_starts_with($line, '* OK')) {
            throw new RuntimeException('IMAP greeting alınmadı.');
        }
    }

    protected function quote(string $value): string
    {
        return '"'.addcslashes($value, "\\\"").'"';
    }
}
