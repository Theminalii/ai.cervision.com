<?php

namespace App\Http\Requests\AiAgent;

use Illuminate\Foundation\Http\FormRequest;

class AiAgentChatRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'message' => ['required', 'string', 'min:2', 'max:2000'],
        ];
    }
}
