import { describe, expect, it } from "@jest/globals";
import { ChangeSetType } from "@mikro-orm/core";

import { RecipientCommandIntegrationHelpers } from "~testing/integration/application-command/recipient.helpers";
import { Channel, Message, Notification, Preference, Recipient } from "~context/domain/entities";
import { AuditLog, ChangeLog, Outbox } from "~common/transaction-manager/entities";
import { ActionType, ChannelType, EntityType, KafkaTopic } from "~context/enums";
import { CoreFixture } from "~testing/integration/repositories/core.fixture";
import { postgresSuite } from "~testing/integration/postgres.suite";

const helpers = new RecipientCommandIntegrationHelpers();

describe("RecipientCommands integration", () => {
    const suite = postgresSuite({
        repository: (context) => helpers.service(context),
        fixture: (entityManager) => new CoreFixture(entityManager),
    });

    it("purges the recipient graph with one audited recipient change", async () => {
        const recipient = await suite.fixtures().createRecipient();
        const channel = await suite.fixtures().createChannel({ recipient, type: ChannelType.EMAIL });
        const preference = await suite.fixtures().createPreference({ recipient });
        const notification = await suite.fixtures().createNotification({ recipient });
        const message = await suite.fixtures().createMessage({ notification, channel });
        const untouched = await suite.fixtures().createRecipient();

        await suite.repository().recipientCommands.purge({
            context: { ip: "127.0.0.1", userAgent: "recipient-command-integration" },
            input: { account: recipient.account },
        });

        const readManager = suite.repository().readManager;
        readManager.clear();

        await expect(readManager.count(Recipient, { id: recipient.id })).resolves.toBe(0);
        await expect(readManager.count(Channel, { id: channel.id })).resolves.toBe(0);
        await expect(readManager.count(Preference, { id: preference.id })).resolves.toBe(0);
        await expect(readManager.count(Notification, { id: notification.id })).resolves.toBe(0);
        await expect(readManager.count(Message, { id: message.id })).resolves.toBe(0);
        await expect(readManager.count(Recipient, { id: untouched.id })).resolves.toBe(1);

        const auditLogs = await readManager.find(AuditLog, {});
        const changeLogs = await readManager.find(ChangeLog, {});
        const outbox = await readManager.find(Outbox, {}, { orderBy: { sequenceNumber: "asc" } });

        expect({ audits: auditLogs.length, changes: changeLogs.length, outbox: outbox.length }).toEqual({
            changes: 1,
            audits: 1,
            outbox: 2,
        });
        expect(auditLogs[0]).toEqual(
            expect.objectContaining({
                signature: expect.stringContaining("signed:AuditLog:"),
                userAgent: "recipient-command-integration",
                input: { account: recipient.account },
                entityType: EntityType.RECIPIENT,
                actionType: ActionType.DELETE,
                ip: "127.0.0.1",
                keyVersion: 7,
            }),
        );
        expect(changeLogs).toHaveLength(1);
        expect(changeLogs[0]).toEqual(
            expect.objectContaining({
                signature: expect.stringContaining("signed:ChangeLog:"),
                changeType: ChangeSetType.DELETE,
                auditEntry: auditLogs[0]?.id,
                entityType: Recipient.name,
                entity: recipient.id,
                keyVersion: 7,
            }),
        );
        expect(outbox.map(({ destinationTopic }) => destinationTopic).sort()).toEqual(
            [KafkaTopic.AUDIT_LOG_ARCHIVE, KafkaTopic.CHANGE_LOG_ARCHIVE].sort(),
        );
    });
});
