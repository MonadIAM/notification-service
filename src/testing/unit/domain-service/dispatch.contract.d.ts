declare namespace Unit.Domain.Dispatch {
    interface Contract extends Core.Contract {
        service: Service.Signature;
    }

    namespace Service {
        type Result = {
            service: Services.Dispatch.Contract;
            services: ServiceMocks.Contract;
            transaction: Core.Transaction;
        };

        type Signature = () => Result;
    }
}
