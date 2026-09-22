import { ChangeSetType } from "@mikro-orm/core";
import { randomUUID } from "node:crypto";

import { EntityFactoryRegistry } from "~testing/entity-factory.registry";
import { DeltaChanges } from "~common/transaction-manager/value-objects";
import {
    NotificationCategory,
    PlatformService,
    MessageStatus,
    FailureReason,
    ChannelType,
    ActionType,
    EntityType,
} from "~context/enums";

export class CoreFixture implements Fixtures.Core.Contract {
    private readonly entities = new EntityFactoryRegistry();
    private sequence = 0;

    public constructor(private readonly entityManager: ORM.EntityManager) {}

    public async createRecipient(props: Fixtures.Core.CreateRecipient.Props = {}): Fixtures.Core.CreateRecipient.Result {
        const recipient = this.entities.createRecipient({
            account: props.account ?? randomUUID(),
            timezone: props.timezone ?? "UTC",
            locale: props.locale ?? "en-US",
        });

        recipient.updatedAt = props.updatedAt;
        recipient.createdAt = props.createdAt ?? recipient.createdAt;

        return await this.persist(recipient);
    }

    public async createChannel(props: Fixtures.Core.CreateChannel.Props): Fixtures.Core.CreateChannel.Result {
        const type = props.type ?? ChannelType.EMAIL;
        const channel = this.entities.createChannel({
            address: "address" in props ? props.address : this.nextAddress(type),
            sourceIdentifier: props.sourceIdentifier,
            isVerified: props.isVerified ?? false,
            recipient: props.recipient,
            type,
        });

        return await this.persist(channel);
    }

    public async createNotification(
        props: Fixtures.Core.CreateNotification.Props,
    ): Fixtures.Core.CreateNotification.Result {
        const notification = this.entities.createNotification({
            sourceService: props.sourceService ?? PlatformService.NOTIFICATION_SERVICE,
            category: props.category ?? NotificationCategory.SYSTEM,
            template: props.template ?? "test-template",
            recipient: props.recipient,
            dedupKey: props.dedupKey,
            realm: props.realm,
            title: props.title,
            body: props.body,
        });

        return await this.persist(notification);
    }

    public async createMessage(props: Fixtures.Core.CreateMessage.Props): Fixtures.Core.CreateMessage.Result {
        const channelType = props.channelType ?? props.channel?.type ?? ChannelType.EMAIL;
        const message = this.entities.createMessage({
            address: props.address ?? this.nextAddress(channelType),
            notification: props.notification,
            channel: props.channel,
            channelType,
        });

        if (props.status === MessageStatus.SENT) {
            message.markSent();
        } else if (props.status === MessageStatus.DELIVERED) {
            message.markSent();
            message.markDelivered();
        } else if (props.status === MessageStatus.CANCELLED) {
            message.markCancelled();
        } else if (props.status === MessageStatus.FAILED) {
            message.markSent();
            message.markFailed({
                reason: props.failureReason ?? FailureReason.PROVIDER,
                error: props.error ?? "Provider rejected the message",
            });
        }

        return await this.persist(message);
    }

    public async createPreference(props: Fixtures.Core.CreatePreference.Props): Fixtures.Core.CreatePreference.Result {
        const preference = this.entities.createPreference({
            category: props.category ?? NotificationCategory.SYSTEM,
            channelType: props.channelType ?? ChannelType.EMAIL,
            isDuplicationEnabled: props.isDuplicationEnabled ?? true,
            recipient: props.recipient,
        });

        return await this.persist(preference);
    }

    public async createAuditLog(props: Fixtures.Core.CreateAuditLog.Props = {}): Fixtures.Core.CreateAuditLog.Result {
        const auditLog = this.entities.createAuditLog({
            entityType: props.entityType ?? EntityType.NOTIFICATION,
            actionType: props.actionType ?? ActionType.CREATE,
            actor: props.actor ?? randomUUID(),
            realm: props.realm ?? randomUUID(),
            input: props.input,
            context: {
                ip: props.context?.ip ?? "127.0.0.1",
                userAgent: props.context?.userAgent ?? "notification-test",
            },
        });

        auditLog.sign({ keyVersion: 1, signature: "test-signature" });

        return await this.persist(auditLog);
    }

    public async createChangeLog(props: Fixtures.Core.CreateChangeLog.Props = {}): Fixtures.Core.CreateChangeLog.Result {
        const auditEntry = props.auditEntry ?? (await this.createAuditLog());
        const changeLog = this.entities.createChangeLog({
            entityType: props.entityType ?? EntityType.NOTIFICATION,
            changeType: props.changeType ?? ChangeSetType.CREATE,
            entity: props.entity ?? randomUUID(),
            auditEntry: auditEntry.id,
            delta:
                props.delta ??
                new DeltaChanges({
                    title: { old: null, new: "Updated Title" },
                }),
        });

        changeLog.sign({ keyVersion: 1, signature: "test-signature" });

        return await this.persist(changeLog);
    }

    private async persist<Entity extends ORM.AnyEntity>(entity: Entity): Promise<Entity> {
        this.entityManager.persist(entity);
        await this.entityManager.flush();
        return entity;
    }

    private nextAddress(type: ChannelType): string {
        if (type === ChannelType.SMS) {
            return `+1555000${this.nextSequence()}`;
        } else if (type === ChannelType.IN_APP) {
            return `in-app:${this.nextSequence()}`;
        } else {
            return `${this.nextCode("recipient")}@example.test`;
        }
    }

    private nextCode(prefix: string): string {
        return `${prefix}.${this.nextSequence()}`;
    }

    private nextSequence(): number {
        this.sequence += 1;
        return this.sequence;
    }
}
