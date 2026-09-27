declare namespace Unit.Domain.Notification {
    interface Contract extends Core.Contract {
        service: Service.Signature;
    }

    namespace Service {
        type Props = {
            recipient?: Entities.Recipient;
        };

        type Result = {
            dispatchDelayQueue: Jest.Mocked<Pick<Queues.DispatchDelay.Contract, "cancel">>;
            service: Services.Notification.Contract;
            repositories: RepositoryMocks.Contract;
            transaction: Core.Transaction;
        };

        type Signature = (props?: Props) => Result;
    }
}
