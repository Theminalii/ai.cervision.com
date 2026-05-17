<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Services\CrmService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CrmCustomerController extends Controller
{
    public function __construct(protected CrmService $crmService)
    {
    }

    public function index(Request $request)
    {
        $query = $this->crmService->scopeCustomers($request->user())
            ->when($request->filled('search'), fn ($builder) => $builder->where(function ($nested) use ($request): void {
                $like = '%'.$request->string('search')->trim().'%';
                $nested->where('name', 'like', $like)
                    ->orWhere('phone', 'like', $like)
                    ->orWhere('email', 'like', $like)
                    ->orWhere('tax_id', 'like', $like);
            }))
            ->when($request->filled('crm_status') && $request->crm_status !== 'all', fn ($builder) => $builder->where('crm_status', $request->crm_status))
            ->when($request->filled('source') && $request->source !== 'all', fn ($builder) => $builder->where('source', $request->source))
            ->orderBy($request->get('sort', 'id'), $request->get('direction', 'desc'));

        $items = $query->paginate($request->integer('per_page', 15));

        return response()->json([
            'data' => collect($items->items())->map(fn (Customer $customer) => $this->crmService->formatCustomer($customer))->all(),
            'meta' => [
                'current_page' => $items->currentPage(),
                'last_page' => $items->lastPage(),
                'per_page' => $items->perPage(),
                'total' => $items->total(),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'entity_type' => ['required', 'in:company,individual'],
            'phone' => ['required', 'string', 'max:50', 'unique:customers,phone'],
            'email' => ['nullable', 'email', 'max:255', 'unique:customers,email'],
            'address' => ['nullable', 'string'],
            'tax_id' => ['nullable', 'string', 'max:100'],
            'company_id' => ['nullable', 'exists:crm_companies,id'],
            'assigned_user_id' => ['nullable', 'exists:users,id'],
            'crm_status' => ['required', 'in:lead,active,inactive,vip,blocked'],
            'source' => ['nullable', 'in:website,referral,social_media,call,walk_in,other'],
            'tags' => ['nullable', 'array'],
            'crm_note' => ['nullable', 'string'],
            'next_action' => ['nullable', 'string', 'max:255'],
            'next_follow_up_at' => ['nullable', 'date'],
            'status' => ['required', 'in:active,passive'],
        ]);

        $duplicate = Customer::query()
            ->where('phone', $data['phone'])
            ->orWhere(fn ($query) => ! empty($data['email']) ? $query->where('email', $data['email']) : $query)
            ->exists();

        if ($duplicate) {
            return response()->json(['message' => 'Telefon və ya email üzrə təkrar müştəri mövcuddur.'], 422);
        }

        $customer = Customer::create([
            ...$data,
            'total_debt' => 0,
            'last_contact_at' => now(),
        ])->load(['assignedUser', 'company']);

        $this->crmService->logActivity('note', 'CRM müştəri yaradıldı', $customer->name.' CRM modulunda yaradıldı.', $request->user(), [
            'customer_id' => $customer->id,
            'company_id' => $customer->company_id,
        ]);

        return response()->json(['data' => $this->crmService->formatCustomer($customer)]);
    }

    public function show(Request $request, Customer $customer)
    {
        $customer = $this->crmService->scopeCustomers($request->user())->findOrFail($customer->id);

        return response()->json([
            'data' => [
                ...$this->crmService->formatCustomer($customer),
                'sales' => $customer->sales()->latest('sale_date')->take(10)->get()->map(fn ($sale) => [
                    'id' => $sale->id,
                    'sale_number' => $sale->sale_number,
                    'sale_date' => $sale->sale_date?->toDateString(),
                    'total_amount' => (float) $sale->total_amount,
                    'payment_status' => $sale->payment_status,
                ])->all(),
                'contacts' => $customer->contacts()->latest()->get(),
                'deals' => $customer->deals()->with(['stage', 'owner'])->latest()->get(),
                'tasks' => $customer->tasks()->with('owner')->latest()->get(),
                'activities' => $customer->activities()->with('user')->latest()->take(20)->get(),
                'documents' => [],
                'debts' => $customer->debtTransactions()->latest('transaction_date')->take(20)->get(),
            ],
        ]);
    }

    public function update(Request $request, Customer $customer)
    {
        $customer = $this->crmService->scopeCustomers($request->user())->findOrFail($customer->id);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'entity_type' => ['required', 'in:company,individual'],
            'phone' => ['required', 'string', 'max:50', Rule::unique('customers', 'phone')->ignore($customer->id)],
            'email' => ['nullable', 'email', 'max:255', Rule::unique('customers', 'email')->ignore($customer->id)],
            'address' => ['nullable', 'string'],
            'tax_id' => ['nullable', 'string', 'max:100'],
            'company_id' => ['nullable', 'exists:crm_companies,id'],
            'assigned_user_id' => ['nullable', 'exists:users,id'],
            'crm_status' => ['required', 'in:lead,active,inactive,vip,blocked'],
            'source' => ['nullable', 'in:website,referral,social_media,call,walk_in,other'],
            'tags' => ['nullable', 'array'],
            'crm_note' => ['nullable', 'string'],
            'next_action' => ['nullable', 'string', 'max:255'],
            'next_follow_up_at' => ['nullable', 'date'],
            'status' => ['required', 'in:active,passive'],
            'last_contact_at' => ['nullable', 'date'],
        ]);

        $customer->update($data);

        $this->crmService->logActivity('note', 'CRM müştəri yeniləndi', $customer->name.' məlumatları yeniləndi.', $request->user(), [
            'customer_id' => $customer->id,
            'company_id' => $customer->company_id,
        ]);

        return response()->json(['data' => $this->crmService->formatCustomer($customer->fresh(['assignedUser', 'company']))]);
    }

    public function destroy(Request $request, Customer $customer)
    {
        $customer = $this->crmService->scopeCustomers($request->user())->findOrFail($customer->id);

        $this->crmService->logActivity('system', 'CRM müştəri silindi', $customer->name.' silindi.', $request->user(), [
            'customer_id' => $customer->id,
            'company_id' => $customer->company_id,
        ]);

        $customer->delete();

        return response()->json(['message' => 'CRM müştəri silindi.']);
    }
}
