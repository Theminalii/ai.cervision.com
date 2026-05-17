<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Collection;

class AnalyticsService
{
    public function now(): Carbon
    {
        return now();
    }

    public function rangeStart(int $days): Carbon
    {
        return $this->now()->copy()->subDays($days)->startOfDay();
    }

    public function monthStart(): Carbon
    {
        return $this->now()->copy()->startOfMonth();
    }

    public function score(float $value): int
    {
        return (int) max(0, min(100, round($value)));
    }

    public function recommendation(
        string $title,
        string $description,
        string $reason,
        string $impact,
        string $action,
        string $expected,
        string $module,
        ?array $entity = null,
    ): array {
        return [
            'title' => $title,
            'description' => $description,
            'reason' => $reason,
            'impact_level' => $impact,
            'recommended_action' => $action,
            'expected_result' => $expected,
            'module' => $module,
            'entity' => $entity,
        ];
    }

    public function topCollection(Collection $items, int $limit = 5): array
    {
        return $items->take($limit)->values()->all();
    }

    public function pairKey(int $first, int $second): string
    {
        return $first < $second ? "{$first}:{$second}" : "{$second}:{$first}";
    }
}
