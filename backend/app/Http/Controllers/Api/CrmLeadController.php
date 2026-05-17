<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CrmCompany;
use App\Models\CrmContact;
use App\Models\CrmLead;
use App\Models\Customer;
use App\Services\CrmService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CrmLeadController extends Controller
{
    public function __construct(protected CrmService $crmService)
    {
    }

    public function index(Request $request)
    {
        $items = $this->crmService->scopeLeads($request->user())
            ->when($request->filled('search'), fn ($builder) => $builder->where(function ($nested) use ($request): void {
                $like = '%'.$request->string('search')->trim().'%';
                $nested->where('title', 'like', $like)->orWhere('name', 'like', $like)->orWhere('phone', 'like', $like)->orWhere('email', 'like', $like)->orWhere('company_name', 'like', $like);
            }))
            ->when($request->filled('status') && $request->status !== 'all', fn ($builder) => $builder->where('status', $request->status))
            ->when($request->filled('source') && $request->source !== 'all', fn ($builder) => $builder->where('source', $request->source))
            ->orderByDesc('id')
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
            'title' => ['required', 'string', 'max:255'],
            'name' => ['required', 'string', 'max:255'],
            'company_name' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email'],
            'source' => ['required', 'in:website,referral,social_media,call,walk_in,other'],
            'status' => ['required', 'in:new,contacted,qualified,proposal,won,lost'],
            'expected_value' => ['nullable', 'numeric', 'min:0'],
            'follow_up_date' => ['nullable', 'date'],
            'lost_reason' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
            'customer_id' => ['nullable', 'exists:customers,id'],
            'company_id' => ['nullable', 'exists:crm_companies,id'],
            'contact_id' => ['nullable', 'exists:crm_contacts,id'],
            'owner_user_id' => ['nullable', 'exists:users,id'],
        ]);

        $data['score'] = $this->crmService->computeLeadScore($data);
        $data['owner_user_id'] = $this->crmService->canViewAll($request->user()) ? ($data['owner_user_id'] ?? $request->user()->id) : $request->user()->id;

        $lead = CrmLead::create($data)->load(['owner', 'customer', 'company', 'contact']);
        $this->crmService->logActivity('note', 'Lead yaradıldı', $lead->title, $request->user(), [
            'lead_id' => $lead->id,
            'customer_id' => $lead->customer_id,
            'company_id' => $lead->company_id,
            'contact_id' => $lead->contact_id,
        ]);

        return response()->json(['data' => $lead]);
    }

    public function update(Request $request, CrmLead $lead)
    {
        $lead = $this->crmService->scopeLeads($request->user())->findOrFail($lead->id);
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'name' => ['required', 'string', 'max:255'],
            'company_name' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email'],
            'source' => ['required', 'in:website,referral,social_media,call,walk_in,other'],
            'status' => ['required', 'in:new,contacted,qualified,proposal,won,lost'],
            'expected_value' => ['nullable', 'numeric', 'min:0'],
            'follow_up_date' => ['nullable', 'date'],
            'lost_reason' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
            'customer_id' => ['nullable', 'exists:customers,id'],
            'company_id' => ['nullable', 'exists:crm_companies,id'],
            'contact_id' => ['nullable', 'exists:crm_contacts,id'],
            'owner_user_id' => ['nullable', 'exists:users,id'],
        ]);

        $data['score'] = $this->crmService->computeLeadScore($data);
        $lead->update($data);

        return response()->json(['data' => $lead->fresh(['owner', 'customer', 'company', 'contact'])]);
    }

    public function destroy(Request $request, CrmLead $lead)
    {
        $lead = $this->crmService->scopeLeads($request->user())->findOrFail($lead->id);
        $lead->delete();

        return response()->json(['message' => 'Lead silindi.']);
    }

    public function convert(Request $request, CrmLead $lead)
    {
        $lead = $this->crmService->scopeLeads($request->user())->findOrFail($lead->id);

        $data = $request->validate([
            'target' => ['nullable', 'in:customer,deal,both'],
        ]);

        $target = $data['target'] ?? 'both';

        $result = DB::transaction(function () use ($request, $lead, $target) {
            $customer = $lead->customer;
            $company = $lead->company;
            $deal = null;

            if (in_array($target, ['customer', 'both'], true) && ! $customer) {
                $customer = Customer::create([
                    'name' => $lead->name,
                    'entity_type' => $lead->company_name ? 'company' : 'individual',
                    'phone' => $lead->phone ?: ('crm-'.$lead->id.'-'.random_int(1000, 9999)),
                    'email' => $lead->email,
                    'address' => null,
                    'assigned_user_id' => $lead->owner_user_id ?? $request->user()->id,
                    'company_id' => $company?->id,
                    'tax_id' => null,
                    'total_debt' => 0,
                    'status' => 'active',
                    'crm_status' => 'active',
                    'source' => $lead->source,
                    'tags' => [],
                    'crm_note' => $lead->notes,
                    'last_contact_at' => now(),
                ]);
            }

            if ($lead->company_name && ! $company) {
                $company = CrmCompany::create([
                    'owner_user_id' => $lead->owner_user_id ?? $request->user()->id,
                    'customer_id' => $customer?->id,
                    'name' => $lead->company_name,
                    'email' => $lead->email,
                    'phone' => $lead->phone,
                    'status' => 'active',
                ]);
            }

            if (in_array($target, ['deal', 'both'], true)) {
                $pipeline = $this->crmService->ensureDefaultPipeline();
                $stage = $pipeline->stages()->where('key', 'new')->first();

                $deal = $lead->deals()->create([
                    'pipeline_id' => $pipeline->id,
                    'stage_id' => $stage?->id,
                    'owner_user_id' => $lead->owner_user_id ?? $request->user()->id,
                    'customer_id' => $customer?->id,
                    'company_id' => $company?->id,
                    'contact_id' => $lead->contact_id,
                    'title' => $lead->title,
                    'expected_amount' => $lead->expected_value ?? 0,
                    'probability' => min(100, max(10, $lead->score)),
                    'expected_close_date' => optional($lead->follow_up_date)->copy()?->addDays(14),
                    'products' => [],
                    'notes' => $lead->notes,
                ]);
            }

            $lead->update([
                'customer_id' => $customer?->id,
                'company_id' => $company?->id,
                'status' => $deal ? 'won' : 'qualified',
            ]);

            $this->crmService->logActivity('system', 'Lead çevrildi', $lead->title.' CRM çevrilməsi edildi.', $request->user(), [
                'lead_id' => $lead->id,
                'customer_id' => $customer?->id,
                'deal_id' => $deal?->id,
                'company_id' => $company?->id,
            ]);

            return compact('customer', 'deal', 'company');
        });

        return response()->json(['data' => $result]);
    }
}
