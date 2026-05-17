<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CrmActivity;
use App\Services\CrmService;
use Illuminate\Http\Request;

class CrmActivityController extends Controller
{
    public function __construct(protected CrmService $crmService)
    {
    }

    public function index(Request $request)
    {
        $items = $this->crmService->scopeActivities($request->user())
            ->when($request->filled('type') && $request->type !== 'all', fn ($builder) => $builder->where('type', $request->type))
            ->latest()
            ->paginate($request->integer('per_page', 25));

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
            'type' => ['required', 'in:call,meeting,email,note,task,sale,system'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'customer_id' => ['nullable', 'exists:customers,id'],
            'lead_id' => ['nullable', 'exists:crm_leads,id'],
            'deal_id' => ['nullable', 'exists:crm_deals,id'],
            'task_id' => ['nullable', 'exists:crm_tasks,id'],
            'company_id' => ['nullable', 'exists:crm_companies,id'],
            'contact_id' => ['nullable', 'exists:crm_contacts,id'],
            'meta' => ['nullable', 'array'],
        ]);

        $activity = $this->crmService->logActivity(
            $data['type'],
            $data['title'],
            $data['description'] ?? null,
            $request->user(),
            $data,
            $data['meta'] ?? [],
        )->load(['user', 'customer', 'lead', 'deal', 'task', 'company', 'contact']);

        return response()->json(['data' => $activity]);
    }
}
