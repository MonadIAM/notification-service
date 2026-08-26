import { Inject, Injectable, Scope } from "@nestjs/common";

import { CHANNEL_REPOSITORY } from "~context/infrastructure/repositories";
import { QueryMode } from "~context/enums";

@Injectable({ scope: Scope.DEFAULT })
export class ChannelQueries implements Queries.Channel.Contract {
    public constructor(
        @Inject(CHANNEL_REPOSITORY)
        private readonly channelRepository: Repositories.Channel.QueryContract,
    ) {}

    public findUnique(props: Queries.Channel.FindUnique.Props): Queries.Channel.FindUnique.Result {
        const where: ORM.FilterQuery<Entities.Channel> = { id: props.channel };

        if (props.mode === QueryMode.DEFAULT) {
            where.recipient = { account: props.actor };
        }

        return this.channelRepository.findUniqueOrThrow({ where });
    }

    public findMany(props: Queries.Channel.FindMany.Props): Queries.Channel.FindMany.Result {
        const prefilter: ORM.ObjectQuery<Entities.Channel> = {};

        if (props.mode === QueryMode.DEFAULT) {
            prefilter.recipient = { account: props.actor };
        }

        return this.channelRepository.findMany({
            pagination: props.pagination,
            filters: props.filters,
            sort: props.sort,
            prefilter,
        });
    }
}
