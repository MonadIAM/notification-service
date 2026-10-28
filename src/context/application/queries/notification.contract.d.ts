import { QueryMode } from "~context/enums";

declare global {
    namespace Queries.Notification {
        interface Contract extends ControllerContract {}

        interface ControllerContract {
            countUnread: CountUnread.Signature;
            findUnique: FindUnique.Signature;
            findMany: FindMany.Signature;
        }

        namespace CountUnread {
            type Props = { actor: string };

            type Result = Promise<{ count: number }>;

            type Signature = (props: Props) => Result;
        }

        namespace FindUnique {
            type DefaultProps = {
                mode: QueryMode.DEFAULT;
                notification: string;
                actor: string;
            };

            type ManageProps = {
                mode: QueryMode.MANAGE;
                notification: string;
            };

            type Props = DefaultProps | ManageProps;

            type Result = Promise<Entities.Notification>;

            type Signature = (props: Props) => Result;
        }

        namespace FindMany {
            type DefaultProps = {
                mode: QueryMode.DEFAULT;
                filters: Repositories.Mappers.Notification.Filters;
                sort: Repositories.Mappers.Notification.Sort;
                pagination: Pagination;
                actor: string;
            };

            type ManageProps = {
                mode: QueryMode.MANAGE;
                filters: Repositories.Mappers.Notification.Filters;
                sort: Repositories.Mappers.Notification.Sort;
                pagination: Pagination;
            };

            type Props = DefaultProps | ManageProps;

            type Result = Promise<[Entities.Notification[], number]>;

            type Signature = (props: Props) => Result;
        }
    }
}
