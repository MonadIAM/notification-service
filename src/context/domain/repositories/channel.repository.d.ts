declare namespace Repositories {
    namespace Channel {
        interface Contract extends Repositories.Base.Contract<Entities.Channel, Adapters.Channel.Types> {}

        interface QueryContract extends Pick<Contract, "findUniqueOrThrow" | "findMany"> {}
    }
}
