declare namespace TransactionManager {
    namespace ChangeLogSubscriber {
        type BuildDelta = {
            originalEntity?: UnknownObject;
            type: ORM.ChangeSetType;
            entity?: ORM.AnyEntity;
            payload: UnknownObject;
        };
    }
}
