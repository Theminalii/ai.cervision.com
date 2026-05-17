<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CrmDeal;
use App\Services\CrmService;
use Illuminate\Http\Request;

class CrmDealController extends Controller
{
    public function __construct(protected CrmService $crmService)
    {
    }

    public function index(Request $request)
    {
        $this->crmService->ensureDefaultPipeline();

        $items = $this->crmService->scopeDeals($request->user())
            ->when($request->filled('search'), fn ($builder) => $builder->where('title', 'like', '%'.$request->string('search')->trim().'%'))
            ->when($request->filled('stage') && $request->stage !== 'all', fn ($builder) => $builder->whereHas('stage', fn ($stage) => $stage->where('key', $request->stage)))
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 50));

        return response()->json([
            'data' => $items->items(),
            'meta' => [
                'current_page' => $items->currentPage(),
                'last_page' => $items->lastPage(),
                'per_page' => $items->perPage(),
                'total' => $items->total(),
            ],
            'pipeline' => $this->crmService->ensureDefaultPipeline()->load('stages'),
        ]);
    }

    public function store(Request $request)
    {
        $pipeline = $this->crmService->ensureDefaultPipeline();
        $defaultStage = $pipeline->stages()->where('key', 'new')->first();

        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'customer_id' => ['nullable', 'exists:customers,id'],
            'company_id' => ['nullable', 'exists:crm_companies,id'],
            'contact_id' => ['nullable', 'exists:crm_contacts,id'],
            'lead_id' => ['nullable', 'exists:crm_leads,id'],
            'owner_user_id' => ['nullable', 'exists:users,id'],
            'expected_amount' => ['nullable', 'numeric', 'min:0'],
            'probability' => ['nullable', 'integer', 'min:0', 'max:100'],
            'expected_close_date' => ['nullable', 'date'],
            'products' => ['nullable', 'array'],
            'notes' => ['nullable', 'string'],
            'stage_id' => ['nullable', 'exists:crm_deal_stages,id'],
            'lost_reason' => ['nullable', 'string', 'max:255'],
        ]);

        $deal = CrmDeal::create([
            ...$data,
            'pipeline_id' => $pipeline->id,
            'stage_id' => $data['stage_id'] ?? $defaultStage?->id,
            'owner_user_id' => $this->crmService->canViewAll($request->user()) ? ($data['owner_user_id'] ?? $request->user()->id) : $request->user()->id,
        ])->load(['owner', 'customer', 'company', 'contact', 'lead', 'stage', 'pipeline']);

        $this->crmService->logActivity('sale', 'Deal yaradıldı', $deal->title.' pipeline-a əlavə olundu.', $request->user(), [
            'deal_id' => $deal->id,
            'customer_id' => $deal->customer_id,
            'lead_id' => $deal->lead_id,
            'company_id' => $deal->company_id,
            'contact_id' => $deal->contact_id,
        ]);

        return response()->json(['data' => $deal]);
    }

    public function update(Request $request, CrmDeal $deal)
    {
        $deal = $this->crmService->scopeDeals($request->user())->findOrFail($deal->id);
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'customer_id' => ['nullable', 'exists:customers,id'],
            'company_id' => ['nullable', 'exists:crm_companies,id'],
            'contact_id' => ['nullable', 'exists:crm_contacts,id'],
            'lead_id' => ['nullable', 'exists:crm_leads,id'],
            'owner_user_id' => ['nullable', 'exists:users,id'],
            'expected_amount' => ['nullable', 'numeric', 'min:0'],
            'probability' => ['nullable', 'integer', 'min:0', 'max:100'],
            'expected_close_date' => ['nullable', 'date'],
            'products' => ['nullable', 'array'],
            'notes' => ['nullable', 'string'],
            'stage_id' => ['nullable', 'exists:crm_deal_stages,id'],
            'lost_reason' => ['nullable', 'string', 'max:255'],
        ]);

        $deal->update($data);

        return response()->json(['data' => $deal->fresh(['owner', 'customer', 'company', 'contact', 'lead', 'stage', 'pipeline'])]);
    }

    public function destroy(Request $request, CrmDeal $deal)
    {
        $deal = $this->crmService->scopeDeals($request->user())->findOrFail($deal->id);
        $deal->delete();

        return response()->json(['message' => 'Deal silindi.']);
    }

    public function stage(Request $request, CrmDeal $deal)
    {
        $deal = $this->crmService->scopeDeals($request->user())->findOrFail($deal->id);
        $data = $request->validate([
            'stage_id' => ['nullable', 'exists:crm_deal_stages,id'],
            'stage_key' => ['nullable', 'string'],
            'lost_reason' => ['nullable', 'string', 'max:255'],
        ]);

        $stage = isset($data['stage_id'])
            ? \App\Models\CrmDealStage::findOrFail($data['stage_id'])
            : $this->crmService->stageByKey((string) ($data['stage_key'] ?? ''));

        if (! $stage) {
            return response()->json(['message' => 'Mərhələ tapılmadı.'], 422);
        }

        $deal->update([
            'stage_id' => $stage->id,
            'lost_reason' => $stage->key === 'lost' ? ($data['lost_reason'] ?? $deal->lost_reason) : null,
        ]);

        $this->crmService->logActivity('system', 'Deal mərhələsi dəyişdi', $deal->title.' '.$stage->name.' mərhələsinə keçdi.', $request->user(), [
            'deal_id' => $deal->id,
            'customer_id' => $deal->customer_id,
            'lead_id' => $deal->lead_id,
        ]);

        return response()->json(['data' => $deal->fresh(['owner', 'customer', 'company', 'contact', 'lead', 'stage', 'pipeline'])]);
    }
}
