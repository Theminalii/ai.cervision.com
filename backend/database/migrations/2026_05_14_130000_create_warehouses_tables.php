<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('warehouses', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code')->unique();
            $table->string('address')->nullable();
            $table->decimal('capacity', 14, 3)->default(0);
            $table->decimal('used_capacity', 14, 3)->default(0);
            $table->string('manager_name')->nullable();
            $table->enum('status', ['active', 'passive'])->default('active');
            $table->timestamps();
        });

        Schema::create('warehouse_transfers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('from_warehouse_id')->constrained('warehouses')->restrictOnDelete();
            $table->foreignId('to_warehouse_id')->constrained('warehouses')->restrictOnDelete();
            $table->decimal('quantity', 14, 3);
            $table->text('note')->nullable();
            $table->date('transfer_date');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('warehouse_transfers');
        Schema::dropIfExists('warehouses');
    }
};
