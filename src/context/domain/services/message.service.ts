import { Inject, Injectable, Scope } from "@nestjs/common";

import { MESSAGE_REPOSITORY } from "~context/infrastructure/repositories";
import { DISPATCH_DELAY_QUEUE } from "~context/infrastructure/queues/tokens";
import { ChannelType, MessageStatus } from "~context/enums";
import { Exception } from "~common/exceptions";

@Injectable({ scope: Scope.DEFAULT })
export class MessageService implements Services.Message.Contract {
    private readonly dictionaryPath = "services.message";

    public constructor(
        @Inject(MESSAGE_REPOSITORY)
        private readonly messageRepository: Repositories.Message.Contract,
        @Inject(DISPATCH_DELAY_QUEUE)
        private readonly dispatchDelayQueue: Queues.DispatchDelay.Contract,
    ) {}

    public async markSent(props: Services.Message.MarkSent.Props): Services.Message.MarkSent.Result {
        const { transaction, input } = props;
        const message = await this.messageRepository.findUniqueOrThrow({
            where: { id: input.message },
            transaction,
        });

        message.markSent();
    }

    public async markDelivered(props: Services.Message.MarkDelivered.Props): Services.Message.MarkDelivered.Result {
        const { transaction, input } = props;
        const message = await this.messageRepository.findUniqueOrThrow({
            where: { id: input.message },
            transaction,
        });

        message.markDelivered();
    }

    public async markFailed(props: Services.Message.MarkFailed.Props): Services.Message.MarkFailed.Result {
        const { transaction, input } = props;
        const message = await this.messageRepository.findUniqueOrThrow({
            where: { id: input.message },
            transaction,
        });

        message.markFailed({ reason: input.reason, error: input.error });
    }

    public async markRead(props: Services.Message.MarkRead.Props): Services.Message.MarkRead.Result {
        const { transaction, input } = props;
        const message = await this.messageRepository.findUniqueOrThrow({
            options: { populate: ["notification", "notification.recipient"] },
            where: { id: input.message },
            transaction,
        });

        if (message.notification.recipient.account === input.actor) {
            message.markRead();
        } else {
            throw Exception.notFound({ messageKey: `${this.dictionaryPath}.NOT_FOUND` });
        }
    }

    public async cancelDispatch(props: Services.Message.CancelDispatch.Props): Services.Message.CancelDispatch.Result {
        const { input, transaction } = props;
        const inApp = input.messages.filter((message) => message.channelType === ChannelType.IN_APP);
        const pending = input.messages.filter(
            (message) => message.channelType !== ChannelType.IN_APP && message.status === MessageStatus.QUEUED,
        );
        const cancelled = await Promise.all(pending.map(({ id }) => this.dispatchDelayQueue.cancel({ message: id })));

        if (cancelled.includes(false)) {
            return false;
        }

        const messages = [...inApp, ...pending];
        if (messages.length) {
            this.markCancelled({ input: { messages }, transaction });
        }

        return true;
    }

    public markCancelled(props: Services.Message.MarkCancelled.Props): Services.Message.MarkCancelled.Result {
        const { transaction, input } = props;
        for (const message of input.messages) {
            transaction.merge(message);
            message.markCancelled();
        }
    }
}
