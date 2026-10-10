declare namespace Repositories.Preference {
    interface Contract extends Repositories.Base.Contract<Entities.Preference, Repositories.Mappers.Preference.Types> {}

    interface QueryContract extends Pick<Contract, "findUniqueOrThrow" | "findMany"> {}
}
