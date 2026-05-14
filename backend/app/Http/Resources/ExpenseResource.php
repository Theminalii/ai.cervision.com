<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ExpenseResource extends JsonResource
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
            'title' => $this->title,
            'category_id' => $this->category_id,
            'category_name' => $this->category?->name,
            'expense_type' => $this->expense_type,
            'payment_method' => $this->payment_method,
            'amount' => (float) $this->amount,
            'note' => $this->note,
            'expense_date' => $this->expense_date?->toDateString(),
        ];
    }
}
