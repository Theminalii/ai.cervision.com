<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Catalog\UpsertCategoryRequest;
use App\Http\Resources\CategoryResource;
use App\Models\Category;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    public function index(Request $request)
    {
        $categories = Category::with('children')
            ->when($request->status, fn ($query) => $query->where('status', $request->status))
            ->whereNull('parent_id')
            ->orderBy('name')
            ->get();

        return CategoryResource::collection($categories);
    }

    public function store(UpsertCategoryRequest $request)
    {
        return new CategoryResource(Category::create($request->validated()));
    }

    public function update(UpsertCategoryRequest $request, Category $category)
    {
        $category->update($request->validated());

        return new CategoryResource($category->load('children'));
    }

    public function destroy(Category $category)
    {
        $category->delete();

        return response()->json(['message' => 'Kateqoriya silindi.']);
    }
}
