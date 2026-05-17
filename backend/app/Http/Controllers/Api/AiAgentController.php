<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AiAgent\AiAgentChatRequest;
use App\Http\Requests\AiAgent\AiAgentRecommendationRequest;
use App\Services\AiAgentService;
use App\Services\CustomerAnalysisService;
use App\Services\EmployeeAnalysisService;
use App\Services\FinanceAnalysisService;
use App\Services\ProductAnalysisService;
use App\Services\PurchaseAnalysisService;
use App\Services\SalesAnalysisService;
use App\Services\SettingsNotificationService;
use App\Services\StockAnalysisService;

class AiAgentController extends Controller
{
    public function __construct(
        protected AiAgentService $aiAgentService,
        protected ProductAnalysisService $productAnalysisService,
        protected SalesAnalysisService $salesAnalysisService,
        protected PurchaseAnalysisService $purchaseAnalysisService,
        protected StockAnalysisService $stockAnalysisService,
        protected EmployeeAnalysisService $employeeAnalysisService,
        protected CustomerAnalysisService $customerAnalysisService,
        protected FinanceAnalysisService $financeAnalysisService,
        protected SettingsNotificationService $notificationService,
    ) {
    }

    public function overview()
    {
        $overview = $this->aiAgentService->overview();
        $this->notificationService->notifyAiInsightDigest($overview);

        return response()->json($overview);
    }

    public function products()
    {
        return response()->json($this->productAnalysisService->analyze());
    }

    public function sales()
    {
        return response()->json($this->salesAnalysisService->analyze());
    }

    public function purchases()
    {
        return response()->json($this->purchaseAnalysisService->analyze());
    }

    public function stocks()
    {
        return response()->json($this->stockAnalysisService->analyze());
    }

    public function employees()
    {
        return response()->json($this->employeeAnalysisService->analyze());
    }

    public function customers()
    {
        return response()->json($this->customerAnalysisService->analyze());
    }

    public function finance()
    {
        return response()->json($this->financeAnalysisService->analyze());
    }

    public function chat(AiAgentChatRequest $request)
    {
        return response()->json($this->aiAgentService->chat($request->validated('message')));
    }

    public function recommendations(AiAgentRecommendationRequest $request)
    {
        return response()->json($this->aiAgentService->recommendations($request->validated('focus')));
    }
}
