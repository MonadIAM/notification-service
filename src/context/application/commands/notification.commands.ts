import { Inject, Injectable, Scope } from "@nestjs/common";

import { TRANSACTIONAL_SERVICE } from "~common/transaction-manager";
import { RECIPIENT_REPOSITORY } from "~context/domain/repositories";

import { NOTIFICATION_SERVICE } from "../services";

@Injectable({ scope: Scope.DEFAULT })
export class NotificationCommands implements Commands.Notification.Contract {
    private readonly resource = "Notification";

    public constructor(
        @Inject(TRANSACTIONAL_SERVICE)
        private readonly transactionalService: TransactionManager.Service.PublicContract,
        @Inject(RECIPIENT_REPOSITORY)
        private readonly recipientRepository: Repositories.Recipient.Contract,
        @Inject(NOTIFICATION_SERVICE)
        private readonly notificationService: Services.Notification.Contract,
    ) {}

    public async create(props: Commands.Notification.Create.Props): Commands.Notification.Create.Result {
        const recipient = await this.recipientRepository.findUniqueOrThrow({
            options: { populate: ["channels", "preferences", "defaultOtpChannel"] },
            where: { account: props.account },
        });

        await this.transactionalService.run({
            resource: this.resource,
            execute: (transaction) => {
                this.notificationService.create({
                    input: {
                        sourceService: props.sourceService,
                        dedupKey: props.dedupKey,
                        category: props.category,
                        template: props.template,
                        realm: props.realm,
                        title: props.title,
                        body: props.body,
                        recipient,
                    },
                    transaction,
                });
            },
        });
    }
}
