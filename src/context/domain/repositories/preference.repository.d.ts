declare namespace Repositories {
    namespace Preference {
        interface Contract extends Repositories.Base.Contract<Entities.Preference, Adapters.Preference.Types> {}

        interface QueryContract extends Pick<Contract, "findUniqueOrThrow" | "findMany"> {}
    }
}
