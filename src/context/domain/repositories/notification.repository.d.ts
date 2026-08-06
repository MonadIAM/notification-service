declare namespace Repositories {
    namespace Notification {
        interface Contract extends Repositories.Base.Contract<Entities.Notification, Adapters.Notification.Types> {}

        interface QueryContract extends Pick<Contract, "findUniqueOrThrow" | "findMany"> {}
    }
}
