import { QueryMode } from "~context/enums";

declare global {
    namespace Queries {
        namespace Notification {
            interface Contract extends ControllerContract {}

            interface ControllerContract {
                findUnique: FindUnique.Signature;
                findMany: FindMany.Signature;
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

                type Signature = (props: Props) => Result;
            }
        }
    }
}
