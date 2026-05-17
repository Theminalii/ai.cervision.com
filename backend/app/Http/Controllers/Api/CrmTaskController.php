<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CrmTask;
use App\Services\CrmService;
use Illuminate\Http\Request;

class CrmTaskController extends Controller
{
    public function __construct(protected CrmService $crmService)
    {
    }

    public function index(Request $request)
    {
        $items = $this->crmService->scopeTasks($request->user())
            ->when($request->filled('search'), fn ($builder) => $builder->where('title', 'like', '%'.$request->string('search')->trim().'%'))
            ->when($request->filled('status') && $request->status !== 'all', fn ($builder) => $builder->where('status', $request->status))
            ->when($request->filled('priority') && $request->priority !== 'all', fn ($builder) => $builder->where('priority', $request->priority))
            ->orderByRaw("CASE WHEN status = 'overdue' THEN 0 ELSE 1 END")
            ->orderBy('deadline')
            ->paginate($request->integer('per_page', 25));

        return response()->json([
            'data' => collect($items->items())->map(function (CrmTask $task) {
                if ($task->status !== 'completed' && $task->deadline && $task->deadline->isPast()) {
                    $task->status = 'overdue';
                }

                return $task;
            })->all(),
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
            'type' => ['required', 'in:call,email,meeting,proposal,document,payment_reminder'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'status' => ['required', 'in:pending,in_progress,completed,overdue'],
            'priority' => ['required', 'in:low,medium,high,urgent'],
            'deadline' => ['nullable', 'date'],
            'customer_id' => ['nullable', 'exists:customers,id'],
            'lead_id' => ['nullable', 'exists:crm_leads,id'],
            'deal_id' => ['nullable', 'exists:crm_deals,id'],
            'owner_user_id' => ['nullable', 'exists:users,id'],
        ]);

        $task = CrmTask::create([
            ...$data,
            'owner_user_id' => $this->crmService->canViewAll($request->user()) ? ($data['owner_user_id'] ?? $request->user()->id) : $request->user()->id,
            'completed_at' => $data['status'] === 'completed' ? now() : null,
        ])->load(['owner', 'customer', 'lead', 'deal']);

        $this->crmService->logActivity('task', 'CRM tapşırığı yaradıldı', $task->title, $request->user(), [
            'task_id' => $task->id,
            'customer_id' => $task->customer_id,
            'lead_id' => $task->lead_id,
            'deal_id' => $task->deal_id,
        ]);

        return response()->json(['data' => $task]);
    }

    public function update(Request $request, CrmTask $task)
    {
        $task = $this->crmService->scopeTasks($request->user())->findOrFail($task->id);
        $data = $request->validate([
            'type' => ['required', 'in:call,email,meeting,proposal,document,payment_reminder'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'status' => ['required', 'in:pending,in_progress,completed,overdue'],
            'priority' => ['required', 'in:low,medium,high,urgent'],
            'deadline' => ['nullable', 'date'],
            'customer_id' => ['nullable', 'exists:customers,id'],
            'lead_id' => ['nullable', 'exists:crm_leads,id'],
            'deal_id' => ['nullable', 'exists:crm_deals,id'],
            'owner_user_id' => ['nullable', 'exists:users,id'],
        ]);

        $task->update([
            ...$data,
            'completed_at' => $data['status'] === 'completed' ? now() : null,
        ]);

        return response()->json(['data' => $task->fresh(['owner', 'customer', 'lead', 'deal'])]);
    }

    public function destroy(Request $request, CrmTask $task)
    {
        $task = $this->crmService->scopeTasks($request->user())->findOrFail($task->id);
        $task->delete();

        return response()->json(['message' => 'Tapşırıq silindi.']);
    }

    public function status(Request $request, CrmTask $task)
    {
        $task = $this->crmService->scopeTasks($request->user())->findOrFail($task->id);
        $data = $request->validate([
            'status' => ['required', 'in:pending,in_progress,completed,overdue'],
        ]);

        $task->update([
            'status' => $data['status'],
            'completed_at' => $data['status'] === 'completed' ? now() : null,
        ]);

        $this->crmService->logActivity('task', 'Tapşırıq statusu dəyişdi', $task->title.' '.$data['status'].' oldu.', $request->user(), [
            'task_id' => $task->id,
            'customer_id' => $task->customer_id,
            'lead_id' => $task->lead_id,
            'deal_id' => $task->deal_id,
        ]);

        return response()->json(['data' => $task->fresh(['owner', 'customer', 'lead', 'deal'])]);
    }
}
