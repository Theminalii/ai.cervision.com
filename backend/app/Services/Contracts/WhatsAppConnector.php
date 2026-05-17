<?php

namespace App\Services\Contracts;

interface WhatsAppConnector
{
    public function status(): array;

    public function connect(): array;

    public function disconnect(): void;

    public function sendMessage(string $recipient, string $body): array;
}
