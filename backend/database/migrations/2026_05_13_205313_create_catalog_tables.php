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
        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('parent_id')->nullable()->constrained('categories')->nullOnDelete();
            $table->string('name');
            $table->enum('status', ['active', 'passive'])->default('active');
            $table->timestamps();
        });

        Schema::create('brands', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->enum('status', ['active', 'passive'])->default('active');
            $table->timestamps();
        });

        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('product_code')->unique();
            $table->string('name');
            $table->foreignId('category_id')->constrained()->restrictOnDelete();
            $table->foreignId('brand_id')->constrained()->restrictOnDelete();
            $table->string('image')->nullable();
            $table->decimal('cash_sale_price', 14, 2)->default(0);
            $table->decimal('official_sale_price', 14, 2)->default(0);
            $table->enum('price_type', ['automatic', 'manual'])->default('automatic');
            $table->decimal('cost_price', 14, 2)->default(0);
            $table->boolean('is_active')->default(true);
            $table->decimal('minimum_stock', 14, 3)->default(0);
            $table->timestamps();
        });

        Schema::create('price_coefficients', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('brand_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('supplier_id')->nullable()->constrained()->nullOnDelete();
            $table->decimal('category_coefficient', 10, 4)->default(1);
            $table->decimal('supplier_coefficient', 10, 4)->default(1);
            $table->decimal('brand_coefficient', 10, 4)->default(1);
            $table->decimal('company_coefficient', 10, 4)->default(1);
            $table->decimal('vat_percent', 8, 2)->default(18);
            $table->date('active_from');
            $table->enum('status', ['active', 'passive'])->default('active');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('price_coefficients');
        Schema::dropIfExists('products');
        Schema::dropIfExists('brands');
        Schema::dropIfExists('categories');
    }
};
