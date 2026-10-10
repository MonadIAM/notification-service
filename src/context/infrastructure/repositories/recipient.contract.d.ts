declare namespace Repositories.Recipient {
    interface Contract extends Repositories.Base.Contract<Entities.Recipient, Repositories.Mappers.Recipient.Types> {}

    interface QueryContract extends Pick<Contract, "findUniqueOrThrow" | "findMany"> {}
}
