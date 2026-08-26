import { Inject, Injectable, Scope } from "@nestjs/common";

import { RECIPIENT_REPOSITORY } from "~context/infrastructure/repositories";
import { QueryMode } from "~context/enums";

@Injectable({ scope: Scope.DEFAULT })
export class RecipientQueries implements Queries.Recipient.Contract {
    public constructor(
        @Inject(RECIPIENT_REPOSITORY)
        private readonly recipientRepository: Repositories.Recipient.QueryContract,
    ) {}

    public findUnique(props: Queries.Recipient.FindUnique.Props): Queries.Recipient.FindUnique.Result {
        const account = props.mode === QueryMode.DEFAULT ? props.actor : props.account;

        return this.recipientRepository.findUniqueOrThrow({
            options: { populate: ["defaultOtpChannel"] },
            where: { account },
        });
    }
}
