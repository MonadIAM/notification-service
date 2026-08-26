import { Inject, Injectable, Scope } from "@nestjs/common";

import { MESSAGE_REPOSITORY } from "~context/infrastructure/repositories";
import { ChannelType, MessageStatus, QueryMode } from "~context/enums";

@Injectable({ scope: Scope.DEFAULT })
export class MessageQueries implements Queries.Message.Contract {
    public constructor(
        @Inject(MESSAGE_REPOSITORY)
        private readonly messageRepository: Repositories.Message.QueryContract,
    ) {}

    public findUnique(props: Queries.Message.FindUnique.Props): Queries.Message.FindUnique.Result {
        return this.messageRepository.findUniqueOrThrow({ where: { id: props.message } });
    }

    public findMany(props: Queries.Message.FindMany.Props): Queries.Message.FindMany.Result {
        if (props.mode === QueryMode.DEFAULT) {
            return this.messageRepository.findMany({
                prefilter: {
                    notification: { id: props.notification, recipient: { account: props.actor } },
                    channelType: ChannelType.IN_APP,
                    status: MessageStatus.DELIVERED,
                },
                pagination: props.pagination,
                sort: props.sort,
                filters: {},
            });
        } else {
            return this.messageRepository.findMany({
                pagination: props.pagination,
                filters: props.filters,
                sort: props.sort,
            });
        }
    }
}
