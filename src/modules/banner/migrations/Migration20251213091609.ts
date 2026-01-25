import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20251213091609 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "banner" ("id" text not null, "text" text not null, "enabled" boolean not null default true, "background_color" text null, "text_color" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "banner_pkey" primary key ("id"));`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_banner_deleted_at" ON "banner" ("deleted_at") WHERE deleted_at IS NULL;`
    );
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "banner" cascade;`);
  }
}
