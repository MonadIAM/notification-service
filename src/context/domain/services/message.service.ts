import { Injectable, Scope } from "@nestjs/common";

@Injectable({ scope: Scope.DEFAULT })
export class MessageService implements Services.Message.Contract {
    public markSent(props: Services.Message.MarkSent.Props): Services.Message.MarkSent.Result {
        const { transaction, input } = props;
        input.message.markSent();
        transaction.merge(input.message);
    }

    public markDelivered(props: Services.Message.MarkDelivered.Props): Services.Message.MarkDelivered.Result {
        const { transaction, input } = props;
        input.message.markDelivered();
        transaction.merge(input.message);
    }

    public markFailed(props: Services.Message.MarkFailed.Props): Services.Message.MarkFailed.Result {
        const { transaction, input } = props;
        input.message.markFailed({ reason: input.reason, error: input.error });
        transaction.merge(input.message);
    }

    public markRead(props: Services.Message.MarkRead.Props): Services.Message.MarkRead.Result {
        const { transaction, input } = props;
        input.message.markRead();
        transaction.merge(input.message);
    }
}
