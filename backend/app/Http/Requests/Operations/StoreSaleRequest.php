<?php

namespace App\Http\Requests\Operations;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreSaleRequest extends FormRequest
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
            'customer_id' => ['nullable', 'exists:customers,id'],
            'sale_type' => ['required', 'in:cash,official'],
            'payment_status' => ['required', 'in:paid,partial,debt'],
            'payment_method' => ['required', 'in:cash,bank'],
            'paid_amount' => ['nullable', 'numeric', 'min:0'],
            'stock_output' => ['required', 'boolean'],
            'note' => ['nullable', 'string'],
            'sale_date' => ['required', 'date'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'exists:products,id'],
            'items.*.quantity' => ['required', 'numeric', 'gt:0'],
            'items.*.unit_price' => ['nullable', 'numeric', 'min:0'],
            'items.*.stock_type' => ['nullable', 'in:real,official,none'],
        ];
    }
}
