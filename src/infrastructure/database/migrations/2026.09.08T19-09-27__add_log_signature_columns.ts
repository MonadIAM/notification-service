import { Migration } from '@mikro-orm/migrations';

export class Migration20260908190927_add_log_signature_columns extends Migration {

  override name = 'Migration20260908190927_add_log_signature_columns';

  override up(): void | Promise<void> {
    this.addSql(`alter table "system"."audit_log" add "signature" text not null, add "key_version" int not null;`);

    this.addSql(`alter table "system"."change_log" add "signature" text not null, add "key_version" int not null;`);

    this.addSql(`alter type "notification"."notification_source_service" add value if not exists 'template-service' after 'identity-service';`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "system"."audit_log" drop column "signature", drop column "key_version";`);

    this.addSql(`alter table "system"."change_log" drop column "signature", drop column "key_version";`);
  }

}
