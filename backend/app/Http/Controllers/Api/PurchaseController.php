<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Operations\StorePurchaseRequest;
use App\Http\Resources\PurchaseResource;
use App\Models\Purchase;
use App\Services\PurchaseService;
use Illuminate\Http\Request;

class PurchaseController extends Controller
{
    public function __construct(protected PurchaseService $purchaseService)
    {
    }

    public function index(Request $request)
    {
        return PurchaseResource::collection(
            Purchase::with(['supplier', 'items.product'])
                ->orderByDesc('purchase_date')
                ->paginate($request->integer('per_page', 15))
        );
    }

    public function store(StorePurchaseRequest $request)
    {
        return new PurchaseResource($this->purchaseService->create($request->validated(), $request->user()));
    }

    public function show(Purchase $purchase)
    {
        return new PurchaseResource($purchase->load(['supplier', 'items.product']));
    }

    public function destroy(Purchase $purchase)
    {
        $purchase->delete();

        return response()->json(['message' => 'Satınalma silindi.']);
    }
}
