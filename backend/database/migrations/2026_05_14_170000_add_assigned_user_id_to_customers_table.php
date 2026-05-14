<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table): void {
            $table->foreignId('assigned_user_id')
                ->nullable()
                ->after('address')
                ->constrained('users')
                ->nullOnDelete();
        });

        DB::table('customers')
            ->orderBy('id')
            ->select(['id'])
            ->lazy()
            ->each(function (object $customer): void {
                $firstSaleUserId = DB::table('sales')
                    ->where('customer_id', $customer->id)
                    ->orderBy('sale_date')
                    ->orderBy('id')
                    ->value('user_id');

                if ($firstSaleUserId) {
                    DB::table('customers')
                        ->where('id', $customer->id)
                        ->update(['assigned_user_id' => $firstSaleUserId]);
                }
            });
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('assigned_user_id');
        });
    }
};
