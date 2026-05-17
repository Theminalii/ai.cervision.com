<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CrmContact;
use App\Services\CrmService;
use Illuminate\Http\Request;

class CrmContactController extends Controller
{
    public function __construct(protected CrmService $crmService)
    {
    }

    public function index(Request $request)
    {
        $items = $this->crmService->scopeContacts($request->user())
            ->when($request->filled('search'), fn ($builder) => $builder->where(function ($nested) use ($request): void {
                $like = '%'.$request->string('search')->trim().'%';
                $nested->where('first_name', 'like', $like)->orWhere('last_name', 'like', $like)->orWhere('phone', 'like', $like)->orWhere('email', 'like', $like);
            }))
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
            'company_id' => ['nullable', 'exists:crm_companies,id'],
            'customer_id' => ['nullable', 'exists:customers,id'],
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['nullable', 'string', 'max:255'],
            'job_title' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email'],
            'social_links' => ['nullable', 'array'],
            'is_primary' => ['required', 'boolean'],
            'notes' => ['nullable', 'string'],
        ]);

        $contact = CrmContact::create([
            ...$data,
            'owner_user_id' => $request->user()->id,
        ])->load(['company', 'customer', 'owner']);

        return response()->json(['data' => $contact]);
    }

    public function update(Request $request, CrmContact $contact)
    {
        $contact = $this->crmService->scopeContacts($request->user())->findOrFail($contact->id);
        $data = $request->validate([
            'company_id' => ['nullable', 'exists:crm_companies,id'],
            'customer_id' => ['nullable', 'exists:customers,id'],
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['nullable', 'string', 'max:255'],
            'job_title' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email'],
            'social_links' => ['nullable', 'array'],
            'is_primary' => ['required', 'boolean'],
            'notes' => ['nullable', 'string'],
        ]);

        $contact->update($data);

        return response()->json(['data' => $contact->fresh(['company', 'customer', 'owner'])]);
    }

    public function destroy(Request $request, CrmContact $contact)
    {
        $contact = $this->crmService->scopeContacts($request->user())->findOrFail($contact->id);
        $contact->delete();

        return response()->json(['message' => 'Kontakt silindi.']);
    }
}
