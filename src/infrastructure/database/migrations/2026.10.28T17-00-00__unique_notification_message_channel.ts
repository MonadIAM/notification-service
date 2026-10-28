import { Migration } from '@mikro-orm/migrations';

export class Migration20261028170000_unique_notification_message_channel extends Migration {

  override name = 'Migration20261028170000_unique_notification_message_channel';

  override up(): void | Promise<void> {
    this.addSql(`alter table "notification"."message" add constraint "message_notification_channel_type_unique" unique ("notification_id", "channel_type");`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "notification"."message" drop constraint "message_notification_channel_type_unique";`);
  }

}
