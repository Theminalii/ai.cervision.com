<?php

namespace App\Http\Requests\Party;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpsertCustomerRequest extends FormRequest
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
        $customerId = $this->route('customer')?->id ?? $this->route('customer');

        return [
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:50', 'unique:customers,phone,'.$customerId],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string'],
            'assigned_user_id' => ['nullable', 'exists:users,id'],
            'total_debt' => ['nullable', 'numeric', 'min:0'],
            'status' => ['required', 'in:active,passive'],
        ];
    }
}
