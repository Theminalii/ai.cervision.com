<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Finance\DebtPaymentRequest;
use App\Http\Requests\Party\UpsertCustomerRequest;
use App\Http\Resources\CustomerResource;
use App\Models\Customer;
use App\Models\User;
use App\Services\DebtService;
use App\Services\FinanceService;
use App\Services\SettingsNotificationService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CustomerController extends Controller
{
    public function __construct(
        protected DebtService $debtService,
        protected FinanceService $financeService,
        protected SettingsNotificationService $notificationService,
    ) {
    }

    protected function accessibleCustomers(Request $request): Builder
    {
        return Customer::query()
            ->with('assignedUser')
            ->when(
                $request->user()->isSalesRepresentative(),
                fn (Builder $query) => $query->where('assigned_user_id', $request->user()->id)
            );
    }

    protected function ensureCustomerAccess(Request $request, Customer $customer): Customer
    {
        if ($request->user()->isSalesRepresentative() && (int) $customer->assigned_user_id !== (int) $request->user()->id) {
            abort(403, 'Yalnız öz müştərilərinizə baxa bilərsiniz.');
        }

        return $customer;
    }

    public function index(Request $request)
    {
        $customers = $this->accessibleCustomers($request)
            ->when($request->search, fn ($query) => $query->where(function (Builder $searchQuery) use ($request): void {
                $searchQuery
                    ->where('name', 'like', '%'.$request->search.'%')
                    ->orWhere('phone', 'like', '%'.$request->search.'%');
            }))
            ->orderBy($request->get('sort', 'id'), $request->get('direction', 'desc'))
            ->paginate($request->integer('per_page', 15));

        return CustomerResource::collection($customers);
    }

    public function meta(Request $request)
    {
        return response()->json([
            'current_user' => [
                'id' => $request->user()->id,
                'name' => $request->user()->name,
                'role' => $request->user()->role?->name,
            ],
            'can_assign_customers' => $request->user()->canAssignCustomers(),
            'sales_reps' => User::query()
                ->with('role')
                ->whereHas('role', fn (Builder $query) => $query->where('name', 'Satış Nümayəndəsi'))
                ->orderBy('name')
                ->get()
                ->map(fn (User $user) => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                ]),
        ]);
    }

    public function store(UpsertCustomerRequest $request)
    {
        $data = $request->validated();
        $data['assigned_user_id'] = $request->user()->isSalesRepresentative()
            ? $request->user()->id
            : ($request->user()->canAssignCustomers() ? ($data['assigned_user_id'] ?? null) : null);

        return new CustomerResource(
            Customer::create($data)->load('assignedUser')
        );
    }

    public function show(Request $request, Customer $customer)
    {
        return new CustomerResource(
            $this->ensureCustomerAccess($request, $customer)->load('assignedUser')
        );
    }

    public function update(UpsertCustomerRequest $request, Customer $customer)
    {
        $this->ensureCustomerAccess($request, $customer);

        $data = $request->validated();
        $data['assigned_user_id'] = $request->user()->isSalesRepresentative()
            ? $request->user()->id
            : ($request->user()->canAssignCustomers() ? ($data['assigned_user_id'] ?? $customer->assigned_user_id) : $customer->assigned_user_id);

        $customer->update($data);

        return new CustomerResource($customer->load('assignedUser'));
    }

    public function destroy(Request $request, Customer $customer)
    {
        $this->ensureCustomerAccess($request, $customer);

        if ($customer->sales()->exists()) {
            return response()->json([
                'message' => 'Satış tarixçəsi olan müştəri silinə bilməz.',
            ], 422);
        }

        if ($customer->debtTransactions()->exists()) {
            return response()->json([
                'message' => 'Borc əməliyyatı olan müştəri silinə bilməz.',
            ], 422);
        }

        $customer->delete();

        return response()->json([
            'message' => 'Müştəri silindi.',
        ]);
    }

    public function debts(Request $request, Customer $customer)
    {
        $this->ensureCustomerAccess($request, $customer);

        return response()->json([
            'customer' => new CustomerResource($customer->load('assignedUser')),
            'transactions' => $customer->debtTransactions()->latest('transaction_date')->get(),
        ]);
    }

    public function payment(DebtPaymentRequest $request, Customer $customer)
    {
        $this->ensureCustomerAccess($request, $customer);

        DB::transaction(function () use ($request, $customer): void {
            $this->debtService->payDebt($customer, (float) $request->amount, null, $request->note, $request->transaction_date);
            $account = $this->financeService->getAccountByType($request->payment_method);
            $this->financeService->increaseBalance($account, (float) $request->amount, 'customer_debt_payment', $customer->id, $customer->name.' borc ödənişi', $request->transaction_date);
            $this->notificationService->notifyPayment('Müştəri ödənişi', "{$customer->name} tərəfindən {$request->amount} AZN ödəniş edildi.");
        });

        return new CustomerResource($customer->refresh());
    }
}
