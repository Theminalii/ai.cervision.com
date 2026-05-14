<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Operations\StoreSaleRequest;
use App\Http\Requests\Party\UpsertCustomerRequest;
use App\Http\Resources\CustomerResource;
use App\Http\Resources\ProductResource;
use App\Http\Resources\SaleResource;
use App\Models\Customer;
use App\Models\Product;
use App\Models\Sale;
use App\Models\User;
use App\Services\DashboardService;
use App\Services\SaleService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class MobileController extends Controller
{
    public function __construct(
        protected SaleService $saleService,
        protected DashboardService $dashboardService,
    ) {
    }

    public function login(LoginRequest $request)
    {
        $user = User::where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            return response()->json(['message' => 'Email və ya şifrə yanlışdır.'], 422);
        }

        return response()->json([
            'token' => $user->createToken('bestsol-mobile')->plainTextToken,
        ]);
    }

    public function products(Request $request)
    {
        return ProductResource::collection(
            Product::with(['category', 'brand', 'stock'])
                ->where('is_active', true)
                ->paginate($request->integer('per_page', 20))
        );
    }

    public function customers(Request $request)
    {
        return CustomerResource::collection(
            Customer::query()
                ->with('assignedUser')
                ->when(
                    $request->user()->isSalesRepresentative(),
                    fn ($query) => $query->where('assigned_user_id', $request->user()->id)
                )
                ->orderBy('name')
                ->paginate($request->integer('per_page', 20))
        );
    }

    public function storeCustomer(UpsertCustomerRequest $request)
    {
        $data = $request->validated();
        $data['assigned_user_id'] = $request->user()->isSalesRepresentative()
            ? $request->user()->id
            : ($data['assigned_user_id'] ?? null);

        return new CustomerResource(Customer::create($data)->load('assignedUser'));
    }

    public function storeSale(StoreSaleRequest $request)
    {
        return new SaleResource($this->saleService->create($request->validated(), $request->user()));
    }

    public function mySales(Request $request)
    {
        return SaleResource::collection(
            Sale::with(['customer', 'items.product'])
                ->where('user_id', $request->user()->id)
                ->latest('sale_date')
                ->paginate($request->integer('per_page', 15))
        );
    }

    public function dashboard(Request $request)
    {
        return response()->json([
            'my_sales_total' => (float) Sale::where('user_id', $request->user()->id)->sum('total_amount'),
            'my_sales_count' => (int) Sale::where('user_id', $request->user()->id)->count(),
            'summary' => $this->dashboardService->summary(),
        ]);
    }
}
