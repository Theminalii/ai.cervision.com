<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('sales', function (Blueprint $table) {
            $table->id();
            $table->string('sale_number')->unique();
            $table->foreignId('customer_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->enum('sale_type', ['cash', 'official']);
            $table->enum('payment_status', ['paid', 'partial', 'debt']);
            $table->enum('payment_method', ['cash', 'bank']);
            $table->decimal('subtotal', 14, 2);
            $table->decimal('vat_amount', 14, 2)->default(0);
            $table->decimal('total_amount', 14, 2);
            $table->decimal('paid_amount', 14, 2)->default(0);
            $table->decimal('debt_amount', 14, 2)->default(0);
            $table->boolean('stock_output')->default(true);
            $table->text('note')->nullable();
            $table->date('sale_date');
            $table->timestamps();
        });

        Schema::create('sale_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sale_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->decimal('quantity', 14, 3);
            $table->decimal('unit_price', 14, 2);
            $table->decimal('total_price', 14, 2);
            $table->enum('stock_type', ['real', 'official', 'none'])->default('none');
            $table->timestamps();
        });

        Schema::create('purchases', function (Blueprint $table) {
            $table->id();
            $table->string('purchase_number')->unique();
            $table->foreignId('supplier_id')->constrained()->restrictOnDelete();
            $table->enum('payment_method', ['cash', 'bank']);
            $table->decimal('total_amount', 14, 2);
            $table->decimal('paid_amount', 14, 2)->default(0);
            $table->decimal('debt_amount', 14, 2)->default(0);
            $table->decimal('road_cost', 14, 2)->default(0);
            $table->decimal('customs_cost', 14, 2)->default(0);
            $table->date('purchase_date');
            $table->text('note')->nullable();
            $table->timestamps();
        });

        Schema::create('purchase_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->decimal('order_quantity', 14, 3);
            $table->decimal('actual_received_quantity', 14, 3);
            $table->decimal('purchase_price', 14, 2);
            $table->decimal('distributed_extra_cost', 14, 2)->default(0);
            $table->decimal('final_unit_cost', 14, 2)->default(0);
            $table->decimal('total_cost', 14, 2)->default(0);
            $table->timestamps();
        });

        Schema::create('stocks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->unique()->constrained()->cascadeOnDelete();
            $table->decimal('official_quantity', 14, 3)->default(0);
            $table->decimal('real_quantity', 14, 3)->default(0);
            $table->decimal('minimum_quantity', 14, 3)->default(0);
            $table->timestamps();
        });

        Schema::create('stock_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->enum('type', ['purchase', 'sale', 'adjustment']);
            $table->enum('stock_type', ['real', 'official']);
            $table->decimal('quantity', 14, 3);
            $table->enum('direction', ['in', 'out']);
            $table->nullableMorphs('reference');
            $table->text('note')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stock_movements');
        Schema::dropIfExists('stocks');
        Schema::dropIfExists('purchase_items');
        Schema::dropIfExists('purchases');
        Schema::dropIfExists('sale_items');
        Schema::dropIfExists('sales');
    }
};
