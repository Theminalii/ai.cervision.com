<?php

namespace App\Http\Requests\Operations;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StorePurchaseRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'supplier_id' => ['required', 'exists:suppliers,id'],
            'payment_method' => ['required', 'in:cash,bank'],
            'paid_amount' => ['nullable', 'numeric', 'min:0'],
            'road_cost' => ['nullable', 'numeric', 'min:0'],
            'customs_cost' => ['nullable', 'numeric', 'min:0'],
            'purchase_date' => ['required', 'date'],
            'note' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'exists:products,id'],
            'items.*.order_quantity' => ['required', 'numeric', 'gt:0'],
            'items.*.actual_received_quantity' => ['required', 'numeric', 'gte:0'],
            'items.*.purchase_price' => ['required', 'numeric', 'min:0'],
        ];
    }
}
