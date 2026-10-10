declare namespace Repositories.Channel {
    interface Contract extends Repositories.Base.Contract<Entities.Channel, Repositories.Mappers.Channel.Types> {}

    interface QueryContract extends Pick<Contract, "findUniqueOrThrow" | "findMany"> {}
}
