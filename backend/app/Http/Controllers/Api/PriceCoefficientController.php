<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Catalog\UpsertPriceCoefficientRequest;
use App\Http\Resources\PriceCoefficientResource;
use App\Models\PriceCoefficient;
use Illuminate\Http\Request;

class PriceCoefficientController extends Controller
{
    public function index(Request $request)
    {
        $coefficients = PriceCoefficient::with(['category', 'brand', 'supplier'])
            ->when($request->filled('category_id'), fn ($query) => $query->where('category_id', $request->category_id))
            ->when($request->filled('brand_id'), fn ($query) => $query->where('brand_id', $request->brand_id))
            ->when($request->filled('supplier_id'), fn ($query) => $query->where('supplier_id', $request->supplier_id))
            ->when($request->status, fn ($query) => $query->where('status', $request->status))
            ->orderByDesc('active_from')
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 100));

        return PriceCoefficientResource::collection($coefficients);
    }

    public function store(UpsertPriceCoefficientRequest $request)
    {
        $coefficient = PriceCoefficient::create($request->validated());

        return new PriceCoefficientResource($coefficient->load(['category', 'brand', 'supplier']));
    }

    public function update(UpsertPriceCoefficientRequest $request, PriceCoefficient $priceCoefficient)
    {
        $priceCoefficient->update($request->validated());

        return new PriceCoefficientResource($priceCoefficient->load(['category', 'brand', 'supplier']));
    }

    public function destroy(PriceCoefficient $priceCoefficient)
    {
        $priceCoefficient->delete();

        return response()->json(['message' => 'Əmsal silindi.']);
    }
}
