<?php

namespace App\Services;

use App\Models\CrmActivity;
use App\Models\CrmCompany;
use App\Models\CrmContact;
use App\Models\CrmDeal;
use App\Models\CrmDealStage;
use App\Models\CrmLead;
use App\Models\CrmPipeline;
use App\Models\CrmTask;
use App\Models\Customer;
use App\Models\Sale;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class CrmService
{
    public function __construct(protected AnalyticsService $analytics)
    {
    }

    public function canViewAll(User $user): bool
    {
        return $user->hasPermission('users_manage') || in_array($user->role?->name, ['Super Admin', 'Satış Meneceri'], true);
    }

    public function scopeCustomers(User $user): Builder
    {
        return Customer::query()
            ->with(['assignedUser', 'company'])
            ->when(! $this->canViewAll($user), fn (Builder $query) => $query->where('assigned_user_id', $user->id));
    }

    public function scopeCompanies(User $user): Builder
    {
        return CrmCompany::query()
            ->with(['owner', 'customer'])
            ->when(! $this->canViewAll($user), fn (Builder $query) => $query->where('owner_user_id', $user->id));
    }

    public function scopeContacts(User $user): Builder
    {
        return CrmContact::query()
            ->with(['company', 'customer', 'owner'])
            ->when(! $this->canViewAll($user), fn (Builder $query) => $query->where('owner_user_id', $user->id));
    }

    public function scopeLeads(User $user): Builder
    {
        return CrmLead::query()
            ->with(['owner', 'customer', 'company', 'contact'])
            ->when(! $this->canViewAll($user), fn (Builder $query) => $query->where('owner_user_id', $user->id));
    }

    public function scopeDeals(User $user): Builder
    {
        return CrmDeal::query()
            ->with(['owner', 'customer', 'company', 'contact', 'lead', 'stage', 'pipeline'])
            ->when(! $this->canViewAll($user), fn (Builder $query) => $query->where('owner_user_id', $user->id));
    }

    public function scopeTasks(User $user): Builder
    {
        return CrmTask::query()
            ->with(['owner', 'customer', 'lead', 'deal'])
            ->when(! $this->canViewAll($user), fn (Builder $query) => $query->where('owner_user_id', $user->id));
    }

    public function scopeActivities(User $user): Builder
    {
        return CrmActivity::query()
            ->with(['user', 'customer', 'lead', 'deal', 'task', 'company', 'contact'])
            ->when(
                ! $this->canViewAll($user),
                fn (Builder $query) => $query->where(function (Builder $nested) use ($user): void {
                    $nested->where('user_id', $user->id)
                        ->orWhereHas('customer', fn (Builder $customer) => $customer->where('assigned_user_id', $user->id))
                        ->orWhereHas('lead', fn (Builder $lead) => $lead->where('owner_user_id', $user->id))
                        ->orWhereHas('deal', fn (Builder $deal) => $deal->where('owner_user_id', $user->id))
                        ->orWhereHas('task', fn (Builder $task) => $task->where('owner_user_id', $user->id));
                })
            );
    }

    public function ensureDefaultPipeline(): CrmPipeline
    {
        $pipeline = CrmPipeline::query()->with('stages')->where('is_default', true)->first();

        if ($pipeline) {
            return $pipeline;
        }

        $pipeline = CrmPipeline::create([
            'name' => 'Əsas Pipeline',
            'is_default' => true,
            'status' => true,
        ]);

        $stages = [
            ['name' => 'New', 'key' => 'new', 'sort_order' => 1, 'color' => 'slate', 'is_terminal' => false],
            ['name' => 'Contacted', 'key' => 'contacted', 'sort_order' => 2, 'color' => 'sky', 'is_terminal' => false],
            ['name' => 'Qualified', 'key' => 'qualified', 'sort_order' => 3, 'color' => 'amber', 'is_terminal' => false],
            ['name' => 'Proposal Sent', 'key' => 'proposal_sent', 'sort_order' => 4, 'color' => 'violet', 'is_terminal' => false],
            ['name' => 'Negotiation', 'key' => 'negotiation', 'sort_order' => 5, 'color' => 'orange', 'is_terminal' => false],
            ['name' => 'Won', 'key' => 'won', 'sort_order' => 6, 'color' => 'emerald', 'is_terminal' => true],
            ['name' => 'Lost', 'key' => 'lost', 'sort_order' => 7, 'color' => 'rose', 'is_terminal' => true],
        ];

        foreach ($stages as $stage) {
            $pipeline->stages()->create($stage);
        }

        return $pipeline->fresh('stages');
    }

    public function stageByKey(string $key): ?CrmDealStage
    {
        return CrmDealStage::query()->where('key', $key)->first();
    }

    public function computeLeadScore(array $data): int
    {
        $score = 35;
        $score += filled($data['phone'] ?? null) ? 15 : 0;
        $score += filled($data['email'] ?? null) ? 15 : 0;
        $score += filled($data['company_name'] ?? null) ? 10 : 0;
        $score += (($data['expected_value'] ?? 0) > 0) ? 10 : 0;
        $score += in_array(($data['source'] ?? 'other'), ['referral', 'website', 'walk_in'], true) ? 10 : 0;
        $score += in_array(($data['status'] ?? 'new'), ['qualified', 'proposal'], true) ? 5 : 0;

        return max(0, min(100, $score));
    }

    public function formatCustomer(Customer $customer): array
    {
        $salesTotal = (float) $customer->sales()->sum('total_amount');
        $lastSaleDate = $customer->sales()->max('sale_date');

        return [
            'id' => $customer->id,
            'name' => $customer->name,
            'entity_type' => $customer->entity_type,
            'phone' => $customer->phone,
            'email' => $customer->email,
            'address' => $customer->address,
            'tax_id' => $customer->tax_id,
            'assigned_user_id' => $customer->assigned_user_id,
            'assigned_user' => $customer->assignedUser ? [
                'id' => $customer->assignedUser->id,
                'name' => $customer->assignedUser->name,
                'email' => $customer->assignedUser->email,
            ] : null,
            'company' => $customer->company ? [
                'id' => $customer->company->id,
                'name' => $customer->company->name,
            ] : null,
            'total_debt' => (float) $customer->total_debt,
            'status' => $customer->status,
            'crm_status' => $customer->crm_status,
            'source' => $customer->source,
            'tags' => $customer->tags ?? [],
            'crm_note' => $customer->crm_note,
            'last_contact_at' => $customer->last_contact_at?->toIso8601String(),
            'next_follow_up_at' => $customer->next_follow_up_at?->toIso8601String(),
            'next_action' => $customer->next_action,
            'lifetime_value' => round($salesTotal, 2),
            'last_sale_date' => $lastSaleDate,
            'sales_count' => $customer->sales()->count(),
            'created_at' => $customer->created_at?->toIso8601String(),
        ];
    }

    public function overview(User $user): array
    {
        $customers = $this->scopeCustomers($user)->get();
        $leads = $this->scopeLeads($user)->get();
        $deals = $this->scopeDeals($user)->get();
        $tasks = $this->scopeTasks($user)->get();

        $monthStart = $this->analytics->monthStart()->toDateString();
        $activeCustomers = $customers->where('crm_status', 'active')->count();
        $passiveCustomers = $customers->where('crm_status', 'inactive')->count();
        $openDeals = $deals->filter(fn (CrmDeal $deal) => ! in_array($deal->stage?->key, ['won', 'lost'], true))->count();
        $wonDeals = $deals->filter(fn (CrmDeal $deal) => $deal->stage?->key === 'won')->count();
        $lostDeals = $deals->filter(fn (CrmDeal $deal) => $deal->stage?->key === 'lost')->count();
        $monthOpportunities = $deals->filter(fn (CrmDeal $deal) => optional($deal->expected_close_date)?->toDateString() >= $monthStart)->count();
        $expectedRevenue = round($deals->sum(fn (CrmDeal $deal) => ((float) $deal->expected_amount) * ((int) $deal->probability / 100)), 2);
        $followUps = $customers->filter(fn (Customer $customer) => $customer->next_follow_up_at && $customer->next_follow_up_at->isPast())->count()
            + $leads->filter(fn (CrmLead $lead) => $lead->follow_up_date && $lead->follow_up_date->isPast())->count();
        $overdueTasks = $tasks->filter(fn (CrmTask $task) => $task->status !== 'completed' && $task->deadline && $task->deadline->isPast())->count();
        $conversionRate = $leads->count() > 0 ? round(($leads->where('status', 'won')->count() / $leads->count()) * 100, 1) : 0;

        return [
            'total_customers' => $customers->count(),
            'active_customers' => $activeCustomers,
            'passive_customers' => $passiveCustomers,
            'new_leads' => $leads->where('status', 'new')->count(),
            'open_deals' => $openDeals,
            'closed_deals' => $wonDeals + $lostDeals,
            'won_deals' => $wonDeals,
            'lost_deals' => $lostDeals,
            'month_opportunities' => $monthOpportunities,
            'expected_revenue' => $expectedRevenue,
            'conversion_rate' => $conversionRate,
            'follow_up_waiting' => $followUps,
            'overdue_tasks' => $overdueTasks,
            'top_customers' => $customers->sortByDesc(fn (Customer $customer) => $customer->sales()->sum('total_amount'))->take(5)->map(fn (Customer $customer) => $this->formatCustomer($customer))->values()->all(),
            'ai_recommendations' => $this->recommendations($user),
        ];
    }

    public function reports(User $user): array
    {
        $leads = $this->scopeLeads($user)->get();
        $deals = $this->scopeDeals($user)->get();
        $tasks = $this->scopeTasks($user)->get();
        $customers = $this->scopeCustomers($user)->get();
        $activities = $this->scopeActivities($user)->get();

        $employeePerformance = $deals
            ->groupBy('owner_user_id')
            ->map(function (Collection $rows, $ownerId) use ($tasks): array {
                $first = $rows->first();
                $taskCount = $tasks->where('owner_user_id', (int) $ownerId)->count();

                return [
                    'owner_user_id' => (int) $ownerId,
                    'owner_name' => $first?->owner?->name ?? 'İşçi',
                    'deals' => $rows->count(),
                    'won' => $rows->filter(fn (CrmDeal $deal) => $deal->stage?->key === 'won')->count(),
                    'expected_revenue' => round($rows->sum('expected_amount'), 2),
                    'tasks' => $taskCount,
                ];
            })
            ->values()
            ->sortByDesc('won')
            ->all();

        return [
            'lead_conversion' => [
                'total' => $leads->count(),
                'won' => $leads->where('status', 'won')->count(),
                'lost' => $leads->where('status', 'lost')->count(),
                'qualified' => $leads->where('status', 'qualified')->count(),
            ],
            'pipeline' => $deals->groupBy(fn (CrmDeal $deal) => $deal->stage?->name ?? 'Mərhələ yoxdur')->map(fn (Collection $rows, string $stage) => [
                'stage' => $stage,
                'count' => $rows->count(),
                'expected_amount' => round($rows->sum('expected_amount'), 2),
            ])->values()->all(),
            'employee_performance' => $employeePerformance,
            'customer_activity' => $customers->map(fn (Customer $customer) => [
                'customer_id' => $customer->id,
                'name' => $customer->name,
                'last_contact_at' => $customer->last_contact_at?->toDateString(),
                'next_follow_up_at' => $customer->next_follow_up_at?->toDateString(),
                'activities' => $activities->where('customer_id', $customer->id)->count(),
                'sales_count' => $customer->sales()->count(),
                'lifetime_value' => round((float) $customer->sales()->sum('total_amount'), 2),
            ])->sortByDesc('lifetime_value')->take(10)->values()->all(),
            'valuable_customers' => $customers->sortByDesc(fn (Customer $customer) => $customer->sales()->sum('total_amount'))->take(10)->map(fn (Customer $customer) => $this->formatCustomer($customer))->values()->all(),
            'passive_customers' => $customers->filter(fn (Customer $customer) => $customer->crm_status === 'inactive')->map(fn (Customer $customer) => $this->formatCustomer($customer))->values()->all(),
            'lost_reasons' => $deals->whereNotNull('lost_reason')->groupBy('lost_reason')->map(fn (Collection $rows, string $reason) => [
                'reason' => $reason,
                'count' => $rows->count(),
            ])->values()->all(),
            'expected_revenue' => round($deals->sum(fn (CrmDeal $deal) => ((float) $deal->expected_amount) * ((int) $deal->probability / 100)), 2),
            'monthly_performance' => collect(range(0, 5))->map(function (int $monthOffset) use ($deals, $leads): array {
                $date = now()->copy()->subMonths($monthOffset);
                $label = $date->format('Y-m');

                return [
                    'month' => $label,
                    'deals' => $deals->filter(fn (CrmDeal $deal) => $deal->created_at?->format('Y-m') === $label)->count(),
                    'won_deals' => $deals->filter(fn (CrmDeal $deal) => $deal->created_at?->format('Y-m') === $label && $deal->stage?->key === 'won')->count(),
                    'leads' => $leads->filter(fn (CrmLead $lead) => $lead->created_at?->format('Y-m') === $label)->count(),
                ];
            })->reverse()->values()->all(),
        ];
    }

    public function recommendations(User $user): array
    {
        $customers = $this->scopeCustomers($user)->get();
        $leads = $this->scopeLeads($user)->get();
        $deals = $this->scopeDeals($user)->get();
        $tasks = $this->scopeTasks($user)->get();

        $recommendations = [];

        $followUpCustomer = $customers->first(fn (Customer $customer) => $customer->next_follow_up_at && $customer->next_follow_up_at->isPast());
        if ($followUpCustomer) {
            $recommendations[] = $this->analytics->recommendation(
                "{$followUpCustomer->name} ilə bu gün əlaqə saxlayın",
                'Follow-up tarixi keçib və növbəti addım gözlənir.',
                "Növbəti əlaqə tarixi {$followUpCustomer->next_follow_up_at?->format('Y-m-d H:i')} idi.",
                'high',
                'Zəng və ya email tapşırığı yaradın.',
                'Müştəri itkisi riski azalacaq.',
                'crm',
                ['id' => $followUpCustomer->id, 'type' => 'customer']
            );
        }

        $hotLead = $leads->sortByDesc('score')->first(fn (CrmLead $lead) => ! in_array($lead->status, ['won', 'lost'], true));
        if ($hotLead) {
            $recommendations[] = $this->analytics->recommendation(
                "{$hotLead->name} yüksək potensial lead-dir",
                'Lead score göstəricisi yüksəkdir.',
                "Skor {$hotLead->score}, status {$hotLead->status}.",
                'medium',
                'Deal-a çevirin və təklif göndərin.',
                'Satışa çevrilmə ehtimalı yüksələcək.',
                'crm',
                ['id' => $hotLead->id, 'type' => 'lead']
            );
        }

        $riskyDeal = $deals->first(fn (CrmDeal $deal) => $deal->expected_close_date && $deal->expected_close_date->isPast() && ! in_array($deal->stage?->key, ['won', 'lost'], true));
        if ($riskyDeal) {
            $recommendations[] = $this->analytics->recommendation(
                "{$riskyDeal->title} deal-i riskdədir",
                'Bağlanma tarixi keçib, amma deal hələ açıqdır.',
                "Planlaşdırılmış bağlanma {$riskyDeal->expected_close_date?->format('Y-m-d')} idi.",
                'high',
                'Mərhələni yeniləyin və növbəti addımı təyin edin.',
                'Pipeline dəqiqliyi və forecast keyfiyyəti artacaq.',
                'crm',
                ['id' => $riskyDeal->id, 'type' => 'deal']
            );
        }

        $overdueTask = $tasks->first(fn (CrmTask $task) => $task->status !== 'completed' && $task->deadline && $task->deadline->isPast());
        if ($overdueTask) {
            $recommendations[] = $this->analytics->recommendation(
                "{$overdueTask->title} tapşırığı gecikib",
                'Deadline keçib və hələ tamamlanmayıb.',
                "Deadline {$overdueTask->deadline?->format('Y-m-d H:i')} idi.",
                'critical',
                'Tapşırığı yenidən planlaşdırın və prioritetləşdirin.',
                'Follow-up intizamı yaxşılaşacaq.',
                'crm',
                ['id' => $overdueTask->id, 'type' => 'task']
            );
        }

        return $recommendations;
    }

    public function logActivity(
        string $type,
        string $title,
        ?string $description,
        ?User $user,
        array $references = [],
        array $meta = [],
    ): CrmActivity {
        return CrmActivity::create([
            'type' => $type,
            'title' => $title,
            'description' => $description,
            'user_id' => $user?->id,
            'customer_id' => $references['customer_id'] ?? null,
            'lead_id' => $references['lead_id'] ?? null,
            'deal_id' => $references['deal_id'] ?? null,
            'task_id' => $references['task_id'] ?? null,
            'company_id' => $references['company_id'] ?? null,
            'contact_id' => $references['contact_id'] ?? null,
            'meta' => $meta,
        ]);
    }

    public function searchLike(?string $value): ?string
    {
        return filled($value) ? '%'.trim((string) $value).'%' : null;
    }

    public function slug(string $value): string
    {
        return Str::slug($value);
    }
}
