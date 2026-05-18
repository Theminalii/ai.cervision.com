<?php

use App\Services\GmailChannelService;
use Illuminate\Foundation\Inspiring;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schedule;
use Illuminate\Support\Facades\Schema;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('db:copy-sqlite-to-mysql {sqlite_path?} {--chunk=500} {--keep-existing} {--skip=*}', function (): int {
    $sqlitePath = $this->argument('sqlite_path') ?: env('SQLITE_IMPORT_PATH');

    if (! $sqlitePath) {
        $this->error('SQLite fayl yolu verilməyib. Məsələn: php artisan db:copy-sqlite-to-mysql /tam/yol/database.sqlite');
        return 1;
    }

    if (! file_exists($sqlitePath)) {
        $this->error("SQLite faylı tapılmadı: {$sqlitePath}");
        return 1;
    }

    $destinationConnection = config('database.default');
    if ($destinationConnection !== 'mysql') {
        $this->error("Hazırkı default DB connection `{$destinationConnection}`-dır. Əvvəl .env-də DB_CONNECTION=mysql yaz.");
        return 1;
    }

    $sourceConnection = 'sqlite_import';
    config([
        "database.connections.{$sourceConnection}" => [
            'driver' => 'sqlite',
            'database' => $sqlitePath,
            'prefix' => '',
            'foreign_key_constraints' => true,
        ],
    ]);

    $defaultSkip = [
        'cache',
        'cache_locks',
        'failed_jobs',
        'job_batches',
        'jobs',
        'migrations',
        'sessions',
    ];

    $skipTables = array_values(array_unique(array_merge($defaultSkip, (array) $this->option('skip'))));
    $chunkSize = max(50, (int) $this->option('chunk'));
    $keepExisting = (bool) $this->option('keep-existing');

    $tables = collect(DB::connection($sourceConnection)->select("
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
          AND name NOT LIKE 'sqlite_%'
        ORDER BY name
    "))->map(fn ($row) => $row->name)->reject(fn (string $name) => in_array($name, $skipTables, true))->values();

    if ($tables->isEmpty()) {
        $this->warn('Kopyalanacaq cədvəl tapılmadı.');
        return 0;
    }

    $this->info('SQLite -> MySQL data copy başlayır...');
    $this->line("Mənbə: {$sqlitePath}");
    $this->line('Hədəf connection: mysql');
    $this->line('Chunk size: '.$chunkSize);

    $databaseName = DB::connection($destinationConnection)->getDatabaseName();
    $warnedColumns = [];
    $nullifyOversizedColumns = ['image', 'logo', 'avatar', 'icon', 'thumbnail'];

    $getDestinationColumnMeta = function (string $table) use ($destinationConnection, $databaseName): array {
        $columns = DB::connection($destinationConnection)->select(
            'SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
             FROM information_schema.columns
             WHERE table_schema = ?
               AND table_name = ?',
            [$databaseName, $table]
        );

        $meta = [];
        foreach ($columns as $column) {
            $meta[$column->COLUMN_NAME] = [
                'type' => strtolower((string) $column->DATA_TYPE),
                'max' => $column->CHARACTER_MAXIMUM_LENGTH !== null
                    ? (int) $column->CHARACTER_MAXIMUM_LENGTH
                    : null,
            ];
        }

        return $meta;
    };

    $transformRow = function (string $table, array $row, array $columnMeta) use (&$warnedColumns, $nullifyOversizedColumns): array {
        foreach ($row as $column => $value) {
            if ($value === null || ! is_string($value)) {
                continue;
            }

            $meta = $columnMeta[$column] ?? null;
            if (! $meta || $meta['max'] === null || $meta['max'] <= 0) {
                continue;
            }

            if (mb_strlen($value) <= $meta['max']) {
                continue;
            }

            $warningKey = "{$table}.{$column}";
            $looksLikeInlinePayload = str_starts_with($value, 'data:')
                || preg_match('/^[A-Za-z0-9+\/=\r\n]{1024,}$/', $value) === 1;

            if (in_array($column, $nullifyOversizedColumns, true) || $looksLikeInlinePayload) {
                $row[$column] = null;

                if (! isset($warnedColumns[$warningKey])) {
                    $warnedColumns[$warningKey] = true;
                    $this->warn("`{$table}.{$column}` çox böyük inline data olduğu üçün null edildi.");
                }

                continue;
            }

            $row[$column] = mb_substr($value, 0, $meta['max']);

            if (! isset($warnedColumns[$warningKey])) {
                $warnedColumns[$warningKey] = true;
                $this->warn("`{$table}.{$column}` MySQL limitinə görə kəsildi ({$meta['max']} simvol).");
            }
        }

        return $row;
    };

    $insertBatch = function (string $table, array $batch) use ($destinationConnection): void {
        if ($batch === []) {
            return;
        }

        try {
            DB::connection($destinationConnection)->table($table)->insert($batch);
        } catch (QueryException $exception) {
            foreach ($batch as $row) {
                DB::connection($destinationConnection)->table($table)->insert($row);
            }
        }
    };

    DB::connection($destinationConnection)->statement('SET FOREIGN_KEY_CHECKS=0');

    try {
        foreach ($tables as $table) {
            if (! Schema::connection($destinationConnection)->hasTable($table)) {
                $this->warn("MySQL-də `{$table}` cədvəli yoxdur, keçilir.");
                continue;
            }

            $columns = Schema::connection($sourceConnection)->getColumnListing($table);
            if ($columns === []) {
                $this->warn("`{$table}` üçün sütun tapılmadı, keçilir.");
                continue;
            }

            $destinationColumnMeta = $getDestinationColumnMeta($table);

            if (! $keepExisting) {
                DB::connection($destinationConnection)->table($table)->truncate();
            }

            $count = 0;
            $batch = [];

            foreach (DB::connection($sourceConnection)->table($table)->cursor() as $row) {
                $normalizedRow = array_intersect_key((array) $row, array_flip($columns));
                $batch[] = $transformRow($table, $normalizedRow, $destinationColumnMeta);

                if (count($batch) >= $chunkSize) {
                    $insertBatch($table, $batch);
                    $count += count($batch);
                    $batch = [];
                }
            }

            if ($batch !== []) {
                $insertBatch($table, $batch);
                $count += count($batch);
            }

            $this->info("`{$table}`: {$count} sətir kopyalandı.");
        }
    } finally {
        DB::connection($destinationConnection)->statement('SET FOREIGN_KEY_CHECKS=1');
    }

    $this->newLine();
    $this->info('SQLite -> MySQL data copy tamamlandı.');

    return 0;
})->purpose('Copy business data from a SQLite database into the current MySQL database');

Schedule::call(function (GmailChannelService $gmailChannelService): void {
    $gmailChannelService->maybeAutoSync(20, 60);
})->everyMinute()->name('gmail-auto-sync')->withoutOverlapping();
