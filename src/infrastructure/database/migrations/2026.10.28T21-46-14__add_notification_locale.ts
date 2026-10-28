import { Migration } from '@mikro-orm/migrations';

export class Migration20261028214614_add_notification_locale extends Migration {

  override name = 'Migration20261028214614_add_notification_locale';

  override up(): void | Promise<void> {
    this.addSql(`alter table "notification"."notification" add column "locale" text null;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "notification"."notification" drop column "locale";`);
  }

}
