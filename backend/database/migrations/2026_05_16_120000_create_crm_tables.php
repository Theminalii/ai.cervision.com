<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('crm_pipelines', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->boolean('is_default')->default(false);
            $table->boolean('status')->default(true);
            $table->timestamps();
        });

        Schema::create('crm_deal_stages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pipeline_id')->constrained('crm_pipelines')->cascadeOnDelete();
            $table->string('name');
            $table->string('key')->unique();
            $table->unsignedInteger('sort_order')->default(0);
            $table->string('color')->default('slate');
            $table->boolean('is_terminal')->default(false);
            $table->timestamps();
        });

        Schema::create('crm_companies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('owner_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $table->string('name');
            $table->string('tax_id')->nullable();
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->string('website')->nullable();
            $table->string('segment')->nullable();
            $table->enum('status', ['lead', 'active', 'inactive', 'vip', 'blocked'])->default('active');
            $table->text('address')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::table('customers', function (Blueprint $table) {
            $table->foreignId('company_id')->nullable()->after('assigned_user_id')->constrained('crm_companies')->nullOnDelete();
            $table->enum('entity_type', ['company', 'individual'])->default('individual')->after('name');
            $table->string('tax_id')->nullable()->after('address');
            $table->enum('crm_status', ['lead', 'active', 'inactive', 'vip', 'blocked'])->default('active')->after('status');
            $table->enum('source', ['website', 'referral', 'social_media', 'call', 'walk_in', 'other'])->nullable()->after('crm_status');
            $table->json('tags')->nullable()->after('source');
            $table->timestamp('last_contact_at')->nullable()->after('tags');
            $table->timestamp('next_follow_up_at')->nullable()->after('last_contact_at');
            $table->string('next_action')->nullable()->after('next_follow_up_at');
            $table->text('crm_note')->nullable()->after('next_action');
        });

        Schema::create('crm_contacts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->nullable()->constrained('crm_companies')->nullOnDelete();
            $table->foreignId('customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $table->foreignId('owner_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('first_name');
            $table->string('last_name')->nullable();
            $table->string('job_title')->nullable();
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->json('social_links')->nullable();
            $table->boolean('is_primary')->default(false);
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('crm_tags', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('color')->default('slate');
            $table->timestamps();
        });

        Schema::create('crm_taggables', function (Blueprint $table) {
            $table->id();
            $table->foreignId('crm_tag_id')->constrained('crm_tags')->cascadeOnDelete();
            $table->morphs('taggable');
        });

        Schema::create('crm_leads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('owner_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $table->foreignId('company_id')->nullable()->constrained('crm_companies')->nullOnDelete();
            $table->foreignId('contact_id')->nullable()->constrained('crm_contacts')->nullOnDelete();
            $table->string('title');
            $table->string('name');
            $table->string('company_name')->nullable();
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->enum('source', ['website', 'referral', 'social_media', 'call', 'walk_in', 'other'])->default('other');
            $table->enum('status', ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'])->default('new');
            $table->unsignedInteger('score')->default(0);
            $table->decimal('expected_value', 14, 2)->default(0);
            $table->date('follow_up_date')->nullable();
            $table->string('lost_reason')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('crm_deals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pipeline_id')->nullable()->constrained('crm_pipelines')->nullOnDelete();
            $table->foreignId('stage_id')->nullable()->constrained('crm_deal_stages')->nullOnDelete();
            $table->foreignId('owner_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $table->foreignId('company_id')->nullable()->constrained('crm_companies')->nullOnDelete();
            $table->foreignId('contact_id')->nullable()->constrained('crm_contacts')->nullOnDelete();
            $table->foreignId('lead_id')->nullable()->constrained('crm_leads')->nullOnDelete();
            $table->foreignId('won_sale_id')->nullable()->constrained('sales')->nullOnDelete();
            $table->string('title');
            $table->decimal('expected_amount', 14, 2)->default(0);
            $table->unsignedInteger('probability')->default(0);
            $table->date('expected_close_date')->nullable();
            $table->json('products')->nullable();
            $table->string('lost_reason')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('crm_tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('owner_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $table->foreignId('lead_id')->nullable()->constrained('crm_leads')->nullOnDelete();
            $table->foreignId('deal_id')->nullable()->constrained('crm_deals')->nullOnDelete();
            $table->enum('type', ['call', 'email', 'meeting', 'proposal', 'document', 'payment_reminder'])->default('call');
            $table->string('title');
            $table->text('description')->nullable();
            $table->enum('status', ['pending', 'in_progress', 'completed', 'overdue'])->default('pending');
            $table->enum('priority', ['low', 'medium', 'high', 'urgent'])->default('medium');
            $table->dateTime('deadline')->nullable();
            $table->dateTime('completed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('crm_activities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $table->foreignId('lead_id')->nullable()->constrained('crm_leads')->nullOnDelete();
            $table->foreignId('deal_id')->nullable()->constrained('crm_deals')->nullOnDelete();
            $table->foreignId('task_id')->nullable()->constrained('crm_tasks')->nullOnDelete();
            $table->foreignId('company_id')->nullable()->constrained('crm_companies')->nullOnDelete();
            $table->foreignId('contact_id')->nullable()->constrained('crm_contacts')->nullOnDelete();
            $table->enum('type', ['call', 'meeting', 'email', 'note', 'task', 'sale', 'system'])->default('note');
            $table->string('title');
            $table->text('description')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();
        });

        Schema::create('crm_notes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->morphs('noteable');
            $table->text('body');
            $table->timestamps();
        });

        Schema::create('crm_attachments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->morphs('attachable');
            $table->string('file_name');
            $table->string('file_path');
            $table->string('mime_type')->nullable();
            $table->unsignedBigInteger('file_size')->default(0);
            $table->timestamps();
        });

        Schema::create('crm_report_snapshots', function (Blueprint $table) {
            $table->id();
            $table->string('report_type');
            $table->date('snapshot_date');
            $table->json('payload');
            $table->json('meta')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('crm_report_snapshots');
        Schema::dropIfExists('crm_attachments');
        Schema::dropIfExists('crm_notes');
        Schema::dropIfExists('crm_activities');
        Schema::dropIfExists('crm_tasks');
        Schema::dropIfExists('crm_deals');
        Schema::dropIfExists('crm_leads');
        Schema::dropIfExists('crm_taggables');
        Schema::dropIfExists('crm_tags');
        Schema::dropIfExists('crm_contacts');

        Schema::table('customers', function (Blueprint $table) {
            $table->dropConstrainedForeignId('company_id');
            $table->dropColumn([
                'entity_type',
                'tax_id',
                'crm_status',
                'source',
                'tags',
                'last_contact_at',
                'next_follow_up_at',
                'next_action',
                'crm_note',
            ]);
        });

        Schema::dropIfExists('crm_companies');
        Schema::dropIfExists('crm_deal_stages');
        Schema::dropIfExists('crm_pipelines');
    }
};
