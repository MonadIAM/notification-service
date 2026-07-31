declare namespace Repositories {
    namespace Message {
        interface Contract extends Repositories.Base.Contract<Entities.Message, Adapters.Message.Types> {}
        interface QueryContract extends Pick<Contract, "findUniqueOrThrow" | "findMany"> {}
    }
}
