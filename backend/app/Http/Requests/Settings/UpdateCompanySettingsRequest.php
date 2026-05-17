<?php

namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCompanySettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'company_name' => ['required', 'string', 'max:255'],
            'tax_id' => ['nullable', 'string', 'max:255'],
            'email' => ['required', 'email'],
            'phone' => ['nullable', 'string', 'max:255'],
            'address' => ['nullable', 'string'],
            'currency' => ['required', 'string', 'max:10'],
            'language' => ['required', 'string', 'max:10'],
            'timezone' => ['required', 'timezone:all'],
            'invoice_template' => ['required', 'string', 'max:50'],
            'receipt_size' => ['required', 'string', 'max:50'],
            'auto_print_receipt' => ['required', 'boolean'],
            'show_logo_on_print' => ['required', 'boolean'],
            'logo_url' => ['nullable', 'string'],
        ];
    }
}
