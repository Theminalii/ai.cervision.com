<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Operations\StockAdjustmentRequest;
use App\Http\Resources\StockResource;
use App\Models\Product;
use App\Models\Stock;
use App\Models\StockMovement;
use App\Services\StockService;
use Illuminate\Http\Request;

class StockController extends Controller
{
    public function __construct(protected StockService $stockService)
    {
    }

    public function index(Request $request)
    {
        return StockResource::collection(
            Stock::with('product.category', 'product.brand')
                ->paginate($request->integer('per_page', 15))
        );
    }

    public function show(Product $product)
    {
        return new StockResource($product->stock()->firstOrFail());
    }

    public function movements(Request $request)
    {
        return response()->json(
            StockMovement::with(['product', 'creator'])
                ->when($request->product_id, fn ($query) => $query->where('product_id', $request->product_id))
                ->latest()
                ->paginate($request->integer('per_page', 20))
        );
    }

    public function adjustment(StockAdjustmentRequest $request)
    {
        $product = Product::findOrFail($request->product_id);
        $stock = $this->stockService->adjust($product, $request->stock_type, (float) $request->quantity, $request->user(), $request->note);

        return new StockResource($stock);
    }

    public function lowStock(Request $request)
    {
        return StockResource::collection(
            Stock::with('product')
                ->whereColumn('real_quantity', '<=', 'minimum_quantity')
                ->paginate($request->integer('per_page', 15))
        );
    }
}
