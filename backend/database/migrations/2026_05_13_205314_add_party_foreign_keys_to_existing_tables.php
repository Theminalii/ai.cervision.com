<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('price_coefficients', function (Blueprint $table) {
            $table->foreign('supplier_id')
                ->references('id')
                ->on('suppliers')
                ->nullOnDelete();
        });

        Schema::table('sales', function (Blueprint $table) {
            $table->foreign('customer_id')
                ->references('id')
                ->on('customers')
                ->nullOnDelete();
        });

        Schema::table('purchases', function (Blueprint $table) {
            $table->foreign('supplier_id')
                ->references('id')
                ->on('suppliers')
                ->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('purchases', function (Blueprint $table) {
            $table->dropForeign(['supplier_id']);
        });

        Schema::table('sales', function (Blueprint $table) {
            $table->dropForeign(['customer_id']);
        });

        Schema::table('price_coefficients', function (Blueprint $table) {
            $table->dropForeign(['supplier_id']);
        });
    }
};
