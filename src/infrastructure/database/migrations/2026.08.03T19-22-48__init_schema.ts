import { Migration } from '@mikro-orm/migrations';

export class Migration20260803192248_init_schema extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`create schema if not exists "notification";`);
    this.addSql(`create schema if not exists "system";`);
    this.addSql(`create type "notification"."notification_category" as enum ('SECURITY', 'INVITES', 'SYSTEM', 'OTHER');`);
    this.addSql(`create type "notification"."channel_type" as enum ('IN_APP', 'EMAIL', 'SMS');`);
    this.addSql(`create type "notification"."notification_source_service" as enum ('access-control-service', 'notification-service', 'certificate-service', 'identity-service');`);
    this.addSql(`create type "notification"."message_status" as enum ('QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'CANCELLED');`);
    this.addSql(`create type "notification"."message_failure_reason" as enum ('SUPPRESSED', 'COMPLAINT', 'PROVIDER', 'INTERNAL', 'BOUNCE');`);
    this.addSql(`create table "system"."audit_log" ("id" uuid not null, "action_type" varchar(64) not null, "entity_type" varchar(64) not null, "realm" uuid null, "actor" uuid not null, "ip" inet null, "user_agent" text null, "input" jsonb null, "created_at" timestamptz(3) not null, primary key ("id"));`);
    this.addSql(`create index "audit_log_realm_idx" on "system"."audit_log" ("realm");`);
    this.addSql(`create index "audit_log_actor_created_at_idx" on "system"."audit_log" ("actor", "created_at");`);
    this.addSql(`create index "audit_log_entity_type_action_type_idx" on "system"."audit_log" ("entity_type", "action_type");`);

    this.addSql(`create table "system"."change_log" ("id" uuid not null, "audit_entry_id" uuid not null, "change_type" varchar(16) not null, "entity_type" varchar(64) not null, "entity" uuid not null, "delta" jsonb not null, "created_at" timestamptz(3) not null, primary key ("id"));`);
    this.addSql(`create index "change_log_audit_entry_idx" on "system"."change_log" ("audit_entry_id");`);
    this.addSql(`create index "change_log_entity_type_entity_id_idx" on "system"."change_log" ("entity_type", "entity");`);

    this.addSql(`create table "system"."outbox" ("id" uuid not null, "sequence_number" bigserial, "action_type" varchar(64) not null, "destination_topic" varchar(128) not null, "payload" jsonb not null, "metadata" jsonb null, "created_at" timestamptz(3) not null, primary key ("id"));`);
    this.addSql(`create index "outbox_sequence_number_idx" on "system"."outbox" ("sequence_number");`);

    this.addSql(`create table "notification"."recipient" ("id" uuid not null, "timezone" text not null, "account" uuid not null, "locale" text not null, "default_otp_channel_id" uuid null, "updated_at" timestamptz(3) null, "created_at" timestamptz(3) not null, "version" int not null default 1, primary key ("id"));`);
    this.addSql(`alter table "notification"."recipient" add constraint "recipient_account_unique" unique ("account");`);

    this.addSql(`create table "notification"."preference" ("id" uuid not null, "category" "notification"."notification_category" not null, "channel_type" "notification"."channel_type" not null, "is_duplication_enabled" boolean not null, "recipient_id" uuid not null, "updated_at" timestamptz(3) null, "created_at" timestamptz(3) not null, "version" int not null default 1, primary key ("id"));`);
    this.addSql(`alter table "notification"."preference" add constraint "preference_recipient_channel_category_unique" unique ("recipient_id", "channel_type", "category");`);

    this.addSql(`create table "notification"."notification" ("id" uuid not null, "source_service" "notification"."notification_source_service" not null, "category" "notification"."notification_category" not null, "dedup_key" text null, "realm" uuid null, "title" text null, "body" text null, "template" text not null, "recipient_id" uuid not null, "created_at" timestamptz(3) not null, "version" int not null default 1, primary key ("id"));`);
    this.addSql(`create index "notification_realm_idx" on "notification"."notification" ("realm");`);
    this.addSql(`alter table "notification"."notification" add constraint "notification_recipient_dedup_key_unique" unique ("recipient_id", "dedup_key");`);

    this.addSql(`create table "notification"."channel" ("id" uuid not null, "type" "notification"."channel_type" not null, "source_identifier" uuid null, "address" text null, "sound_enabled" boolean null, "is_verified" boolean not null, "recipient_id" uuid not null, "verified_at" timestamptz(3) null, "updated_at" timestamptz(3) null, "created_at" timestamptz(3) not null, "version" int not null default 1, primary key ("id"));`);
    this.addSql(`alter table "notification"."channel" add constraint "channel_recipient_type_unique" unique ("recipient_id", "type");`);

    this.addSql(`create table "notification"."message" ("id" uuid not null, "channel_type" "notification"."channel_type" not null, "status" "notification"."message_status" not null, "failure_reason" "notification"."message_failure_reason" null, "retry_count" smallint not null, "error" text null, "address" text not null, "notification_id" uuid not null, "channel_id" uuid null, "cancelled_at" timestamptz(3) null, "delivered_at" timestamptz(3) null, "failed_at" timestamptz(3) null, "read_at" timestamptz(3) null, "sent_at" timestamptz(3) null, "created_at" timestamptz(3) not null, "version" int not null default 1, primary key ("id"));`);
    this.addSql(`create index "message_notification_idx" on "notification"."message" ("notification_id");`);
    this.addSql(`create index "message_channel_idx" on "notification"."message" ("channel_id");`);
    this.addSql(`create index "message_status_idx" on "notification"."message" ("status");`);

    this.addSql(`alter table "notification"."recipient" add constraint "recipient_default_otp_channel_id_foreign" foreign key ("default_otp_channel_id") references "notification"."channel" ("id") on delete set null;`);

    this.addSql(`alter table "notification"."preference" add constraint "preference_recipient_id_foreign" foreign key ("recipient_id") references "notification"."recipient" ("id") on delete cascade;`);

    this.addSql(`alter table "notification"."notification" add constraint "notification_recipient_id_foreign" foreign key ("recipient_id") references "notification"."recipient" ("id") on delete cascade;`);

    this.addSql(`alter table "notification"."channel" add constraint "channel_recipient_id_foreign" foreign key ("recipient_id") references "notification"."recipient" ("id") on delete cascade;`);

    this.addSql(`alter table "notification"."message" add constraint "message_notification_id_foreign" foreign key ("notification_id") references "notification"."notification" ("id") on delete cascade;`);
    this.addSql(`alter table "notification"."message" add constraint "message_channel_id_foreign" foreign key ("channel_id") references "notification"."channel" ("id") on delete set null;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "notification"."preference" drop constraint "preference_recipient_id_foreign";`);
    this.addSql(`alter table "notification"."notification" drop constraint "notification_recipient_id_foreign";`);
    this.addSql(`alter table "notification"."channel" drop constraint "channel_recipient_id_foreign";`);
    this.addSql(`alter table "notification"."message" drop constraint "message_notification_id_foreign";`);
    this.addSql(`alter table "notification"."recipient" drop constraint "recipient_default_otp_channel_id_foreign";`);
    this.addSql(`alter table "notification"."message" drop constraint "message_channel_id_foreign";`);

    this.addSql(`drop table if exists "system"."audit_log" cascade;`);
    this.addSql(`drop table if exists "system"."change_log" cascade;`);
    this.addSql(`drop table if exists "system"."outbox" cascade;`);
    this.addSql(`drop table if exists "notification"."recipient" cascade;`);
    this.addSql(`drop table if exists "notification"."preference" cascade;`);
    this.addSql(`drop table if exists "notification"."notification" cascade;`);
    this.addSql(`drop table if exists "notification"."channel" cascade;`);
    this.addSql(`drop table if exists "notification"."message" cascade;`);

    this.addSql(`drop type "notification"."notification_category";`);
    this.addSql(`drop type "notification"."channel_type";`);
    this.addSql(`drop type "notification"."notification_source_service";`);
    this.addSql(`drop type "notification"."message_status";`);
    this.addSql(`drop type "notification"."message_failure_reason";`);
    this.addSql(`drop schema if exists "notification";`);
    this.addSql(`drop schema if exists "system";`);
  }

}
