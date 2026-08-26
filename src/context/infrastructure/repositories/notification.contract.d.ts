declare namespace Repositories {
    namespace Notification {
        interface Contract extends Repositories.Base.Contract<
            Entities.Notification,
            Repositories.Mappers.Notification.Types
        > {}

        interface QueryContract extends Pick<Contract, "findUniqueOrThrow" | "findMany"> {}
    }
}
