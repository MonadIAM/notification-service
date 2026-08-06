declare namespace Repositories {
    namespace Recipient {
        interface Contract extends Repositories.Base.Contract<Entities.Recipient, Adapters.Recipient.Types> {}

        interface QueryContract extends Pick<Contract, "findUniqueOrThrow" | "findMany"> {}
    }
}
