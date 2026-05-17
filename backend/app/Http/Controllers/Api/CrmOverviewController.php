<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\CrmService;
use Illuminate\Http\Request;

class CrmOverviewController extends Controller
{
    public function __construct(protected CrmService $crmService)
    {
    }

    public function overview(Request $request)
    {
        return response()->json($this->crmService->overview($request->user()));
    }

    public function reports(Request $request)
    {
        return response()->json($this->crmService->reports($request->user()));
    }
}
