<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CrmCompany;
use App\Services\CrmService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CrmCompanyController extends Controller
{
    public function __construct(protected CrmService $crmService)
    {
    }

    public function index(Request $request)
    {
        $items = $this->crmService->scopeCompanies($request->user())
            ->when($request->filled('search'), fn ($builder) => $builder->where(function ($nested) use ($request): void {
                $like = '%'.$request->string('search')->trim().'%';
                $nested->where('name', 'like', $like)->orWhere('phone', 'like', $like)->orWhere('email', 'like', $like)->orWhere('tax_id', 'like', $like);
            }))
            ->when($request->filled('status') && $request->status !== 'all', fn ($builder) => $builder->where('status', $request->status))
            ->orderBy('name')
            ->paginate($request->integer('per_page', 15));

        return response()->json([
            'data' => $items->items(),
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
            'tax_id' => ['nullable', 'string', 'max:100'],
            'email' => ['nullable', 'email'],
            'phone' => ['nullable', 'string', 'max:50'],
            'website' => ['nullable', 'string', 'max:255'],
            'segment' => ['nullable', 'string', 'max:100'],
            'status' => ['required', 'in:lead,active,inactive,vip,blocked'],
            'address' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
            'customer_id' => ['nullable', 'exists:customers,id'],
        ]);

        $company = CrmCompany::create([
            ...$data,
            'owner_user_id' => $request->user()->id,
        ])->load(['owner', 'customer']);

        $this->crmService->logActivity('note', 'CRM şirkəti yaradıldı', $company->name.' yaradıldı.', $request->user(), [
            'company_id' => $company->id,
            'customer_id' => $company->customer_id,
        ]);

        return response()->json(['data' => $company]);
    }

    public function show(Request $request, CrmCompany $company)
    {
        $company = $this->crmService->scopeCompanies($request->user())->findOrFail($company->id);

        return response()->json([
            'data' => [
                ...$company->toArray(),
                'contacts' => $company->contacts()->latest()->get(),
                'deals' => $company->deals()->with(['stage', 'owner'])->latest()->get(),
                'customer' => $company->customer,
            ],
        ]);
    }

    public function update(Request $request, CrmCompany $company)
    {
        $company = $this->crmService->scopeCompanies($request->user())->findOrFail($company->id);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'tax_id' => ['nullable', 'string', 'max:100'],
            'email' => ['nullable', 'email'],
            'phone' => ['nullable', 'string', 'max:50'],
            'website' => ['nullable', 'string', 'max:255'],
            'segment' => ['nullable', 'string', 'max:100'],
            'status' => ['required', 'in:lead,active,inactive,vip,blocked'],
            'address' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
            'customer_id' => ['nullable', 'exists:customers,id'],
            'owner_user_id' => ['nullable', 'exists:users,id'],
        ]);

        $company->update($data);

        return response()->json(['data' => $company->fresh(['owner', 'customer'])]);
    }

    public function destroy(Request $request, CrmCompany $company)
    {
        $company = $this->crmService->scopeCompanies($request->user())->findOrFail($company->id);
        $company->delete();

        return response()->json(['message' => 'CRM şirkəti silindi.']);
    }
}
