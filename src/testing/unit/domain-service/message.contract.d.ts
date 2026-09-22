declare namespace Unit.Domain.Message {
    interface Contract extends Core.Contract {
        service: Service.Signature;
    }

    namespace Service {
        type Props = {
            recipient?: Entities.Recipient;
        };

        type Result = {
            repositories: RepositoryMocks.Contract;
            service: Services.Message.Contract;
            transaction: Core.Transaction;
        };

        type Signature = (props?: Props) => Result;
    }
}
