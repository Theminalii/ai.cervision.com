<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Catalog\UpsertProductRequest;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use App\Models\Stock;
use App\Services\StockService;
use App\Support\InlineImage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProductController extends Controller
{
    public function __construct(protected StockService $stockService)
    {
    }

    public function index(Request $request)
    {
        $products = Product::with(['category', 'brand', 'stock'])
            ->when($request->search, fn ($query) => $query
                ->where('name', 'like', '%'.$request->search.'%')
                ->orWhere('product_code', 'like', '%'.$request->search.'%'))
            ->when($request->category_id, fn ($query) => $query->where('category_id', $request->category_id))
            ->when($request->brand_id, fn ($query) => $query->where('brand_id', $request->brand_id))
            ->when($request->filled('is_active'), fn ($query) => $query->where('is_active', $request->boolean('is_active')))
            ->orderBy($request->get('sort', 'id'), $request->get('direction', 'desc'))
            ->paginate($request->integer('per_page', 15));

        return ProductResource::collection($products);
    }

    public function store(UpsertProductRequest $request)
    {
        $product = DB::transaction(function () use ($request) {
            $data = $request->validated();
            $initialRealQuantity = (float) ($data['initial_real_quantity'] ?? 0);
            $initialOfficialQuantity = (float) ($data['initial_official_quantity'] ?? 0);
            unset($data['initial_real_quantity'], $data['initial_official_quantity']);

            $product = Product::create($data);

            Stock::create([
                'product_id' => $product->id,
                'minimum_quantity' => $product->minimum_stock,
            ]);

            if ($initialRealQuantity > 0) {
                $this->stockService->increase(
                    $product,
                    'real',
                    $initialRealQuantity,
                    'adjustment',
                    null,
                    $request->user(),
                    'İlkin real stok yaradıldı'
                );
            }

            if ($initialOfficialQuantity > 0) {
                $this->stockService->increase(
                    $product,
                    'official',
                    $initialOfficialQuantity,
                    'adjustment',
                    null,
                    $request->user(),
                    'İlkin rəsmi stok yaradıldı'
                );
            }

            return $product;
        });

        return new ProductResource($product->load(['category', 'brand', 'stock']));
    }

    public function show(Product $product)
    {
        return new ProductResource($product->load(['category', 'brand', 'stock']));
    }

    public function update(UpsertProductRequest $request, Product $product)
    {
        $product = DB::transaction(function () use ($request, $product) {
            $data = $request->validated();
            $targetRealQuantity = array_key_exists('initial_real_quantity', $data) ? (float) ($data['initial_real_quantity'] ?? 0) : null;
            $targetOfficialQuantity = array_key_exists('initial_official_quantity', $data) ? (float) ($data['initial_official_quantity'] ?? 0) : null;
            unset($data['initial_real_quantity'], $data['initial_official_quantity']);

            $product->update($data);
            $stock = $this->stockService->ensureStock($product);
            $stock->update(['minimum_quantity' => $product->minimum_stock]);

            if ($targetRealQuantity !== null) {
                $currentRealQuantity = (float) $stock->real_quantity;
                $realDelta = round($targetRealQuantity - $currentRealQuantity, 3);
                if ($realDelta !== 0.0) {
                    $this->stockService->adjust($product, 'real', $realDelta, $request->user(), 'Məhsul redaktəsindən real stok yeniləndi');
                }
            }

            if ($targetOfficialQuantity !== null) {
                $currentOfficialQuantity = (float) $stock->official_quantity;
                $officialDelta = round($targetOfficialQuantity - $currentOfficialQuantity, 3);
                if ($officialDelta !== 0.0) {
                    $this->stockService->adjust($product, 'official', $officialDelta, $request->user(), 'Məhsul redaktəsindən rəsmi stok yeniləndi');
                }
            }

            return $product;
        });

        return new ProductResource($product->load(['category', 'brand', 'stock']));
    }

    public function destroy(Product $product)
    {
        if ($product->saleItems()->exists() || $product->purchaseItems()->exists() || $product->stockMovements()->exists()) {
            return response()->json([
                'message' => 'Satış, satınalma və ya stok tarixçəsi olan məhsul silinə bilməz.',
            ], 422);
        }

        $product->delete();

        return response()->json(['message' => 'Məhsul silindi.']);
    }

    public function uploadImage(Request $request, Product $product)
    {
        if ($request->hasFile('image')) {
            $request->validate([
                'image' => InlineImage::rules(),
            ]);

            $file = $request->file('image');
            $image = InlineImage::fromUpload($file);
        } else {
            $request->validate([
                'image' => [
                    'required',
                    'string',
                    function (string $attribute, mixed $value, \Closure $fail): void {
                        if (! is_string($value) || ! InlineImage::isSafeDataUrl($value)) {
                            $fail('Yalnız JPEG, PNG, WEBP və ya GIF formatında təhlükəsiz şəkil qəbul edilir.');
                        }
                    },
                ],
            ]);

            $image = $request->string('image')->toString();
        }

        $product->update(['image' => $image]);

        return new ProductResource($product->load(['category', 'brand', 'stock']));
    }
}
