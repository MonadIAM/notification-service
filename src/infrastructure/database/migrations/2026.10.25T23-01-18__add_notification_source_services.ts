import { Migration } from '@mikro-orm/migrations';

export class Migration20261025230118_add_notification_source_services extends Migration {

  override name = 'Migration20261025230118_add_notification_source_services';

  override up(): void | Promise<void> {
    this.addSql(`alter type "notification"."notification_source_service" add value if not exists 'organization-service' after 'notification-service';`);
    this.addSql(`alter type "notification"."notification_source_service" add value if not exists 'hr-service' after 'template-service';`);
  }

}
