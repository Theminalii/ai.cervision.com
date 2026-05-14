<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FinancialTransactionResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'account_id' => $this->account_id,
            'account_name' => $this->account?->name,
            'type' => $this->type,
            'source_type' => $this->source_type,
            'source_id' => $this->source_id,
            'amount' => (float) $this->amount,
            'description' => $this->description,
            'transaction_date' => $this->transaction_date?->toDateString(),
        ];
    }
}
