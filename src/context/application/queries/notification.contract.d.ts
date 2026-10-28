import { QueryMode, ChannelType } from "~context/enums";

declare global {
    namespace Queries.Notification {
        type Data = Entities.Notification & {
            message: Nullable<Entities.Message>;
            duplicatedTo: ChannelType[];
        };

        interface Contract extends InternalContract, ControllerContract {}

        interface InternalContract {
            mapNotification: MapNotification.Signature;
        }

        namespace MapNotification {
            type Props = { notification: Entities.Notification };

            type Result = Data;

            type Signature = (props: Props) => Result;
        }

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

            type Result = Promise<Data>;

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

            type Result = Promise<[Data[], number]>;

            type Signature = (props: Props) => Result;
        }
    }
}
