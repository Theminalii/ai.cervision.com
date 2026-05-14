<?php

namespace App\Http\Requests\Finance;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreExpenseRequest extends FormRequest
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
            'title' => ['required', 'string', 'max:255'],
            'category_id' => ['nullable', 'exists:categories,id'],
            'expense_type' => ['required', 'in:official,cash'],
            'payment_method' => ['required', 'in:cash,bank'],
            'amount' => ['required', 'numeric', 'gt:0'],
            'note' => ['nullable', 'string'],
            'expense_date' => ['required', 'date'],
        ];
    }
}
