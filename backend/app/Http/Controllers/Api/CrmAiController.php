<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\CrmAiService;
use Illuminate\Http\Request;

class CrmAiController extends Controller
{
    public function __construct(protected CrmAiService $crmAiService)
    {
    }

    public function recommendations(Request $request)
    {
        return response()->json($this->crmAiService->recommendations($request->user()));
    }

    public function chat(Request $request)
    {
        $data = $request->validate([
            'message' => ['required', 'string', 'max:5000'],
        ]);

        return response()->json($this->crmAiService->chat($request->user(), $data['message']));
    }
}
