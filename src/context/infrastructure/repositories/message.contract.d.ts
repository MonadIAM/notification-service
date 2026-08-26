declare namespace Repositories {
    namespace Message {
        interface Contract extends Repositories.Base.Contract<Entities.Message, Repositories.Mappers.Message.Types> {}

        interface QueryContract extends Pick<Contract, "findUniqueOrThrow" | "findMany"> {}
    }
}
