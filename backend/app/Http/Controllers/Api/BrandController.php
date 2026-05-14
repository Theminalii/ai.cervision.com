<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Catalog\UpsertBrandRequest;
use App\Http\Resources\BrandResource;
use App\Models\Brand;
use Illuminate\Http\Request;

class BrandController extends Controller
{
    public function index(Request $request)
    {
        $brands = Brand::query()
            ->when($request->status, fn ($query) => $query->where('status', $request->status))
            ->orderBy('name')
            ->get();

        return BrandResource::collection($brands);
    }

    public function store(UpsertBrandRequest $request)
    {
        return new BrandResource(Brand::create($request->validated()));
    }

    public function update(UpsertBrandRequest $request, Brand $brand)
    {
        $brand->update($request->validated());

        return new BrandResource($brand);
    }

    public function destroy(Brand $brand)
    {
        $brand->delete();

        return response()->json(['message' => 'Brend silindi.']);
    }
}
