import { QueryMode } from "~context/enums";

declare global {
    namespace Queries {
        namespace Notification {
            interface ControllerContract {
                findUnique(props: FindUnique.DefaultProps): FindUnique.Result;
                findUnique(props: FindUnique.ManageProps): FindUnique.Result;
                findMany(props: FindMany.DefaultProps): FindMany.Result;
                findMany(props: FindMany.ManageProps): FindMany.Result;
            }

            interface Contract extends ControllerContract {}

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
            }

            namespace FindMany {
                type DefaultProps = {
                    mode: QueryMode.DEFAULT;
                    filters: Adapters.Notification.Filters;
                    sort: Adapters.Notification.Sort;
                    pagination: Pagination;
                    actor: string;
                };

                type ManageProps = {
                    mode: QueryMode.MANAGE;
                    filters: Adapters.Notification.Filters;
                    sort: Adapters.Notification.Sort;
                    pagination: Pagination;
                };

                type Props = DefaultProps | ManageProps;
                type Result = Promise<[Entities.Notification[], number]>;
            }
        }
    }
}
