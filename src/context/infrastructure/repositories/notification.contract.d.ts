declare namespace Repositories.Notification {
    interface Contract extends Repositories.Base.Contract<Entities.Notification, Repositories.Mappers.Notification.Types> {
        count: Count.Signature;
    }

    interface QueryContract extends Pick<Contract, "findUniqueOrThrow" | "findMany" | "count"> {}

    namespace Count {
        type Props = {
            transaction?: ORM.EntityManager;
            where: ORM.FilterQuery<Entities.Notification>;
        };

        type Result = Promise<number>;

        type Signature = (props: Props) => Result;
    }
}
