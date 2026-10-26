import { dataset } from "@monadiam/shared/datasets/system/notification";
import { Seeder } from "@mikro-orm/seeder";

export class System extends Seeder {
    private readonly schema: string = "notification";

    public async run(entityManager: ORM.EntityManager): Promise<void> {
        const platform = entityManager.getPlatform();
        const seedOrder = [
            dataset.Recipients,
            dataset.Channels,
            dataset.Preferences,
            dataset.Notifications,
            dataset.Messages,
        ].filter((table) => table.postgresql.length > 0);

        await entityManager.transactional(async (manager) => {
            await manager.execute(`
                TRUNCATE TABLE
                    notification.recipient,
                    notification.channel,
                    notification.preference,
                    notification.notification,
                    notification.message,
                    system.outbox,
                    system.change_log,
                    system.audit_log
                RESTART IDENTITY CASCADE
            `);

            for await (const entry of seedOrder) {
                const query = platform
                    .createNativeQueryBuilder()
                    .into(`${this.schema}.${entry.name}`)
                    .insert(entry.postgresql);
                await manager.execute(query, [], "run");
            }
        });
    }
}
