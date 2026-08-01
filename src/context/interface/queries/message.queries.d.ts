import { QueryMode } from "~context/enums";

declare global {
    namespace Queries {
        namespace Message {
            interface ControllerContract {
                findUnique(props: FindUnique.Props): FindUnique.Result;
                findMany(props: FindMany.DefaultProps): FindMany.Result;
                findMany(props: FindMany.ManageProps): FindMany.Result;
            }

            interface Contract extends ControllerContract {}

            namespace FindUnique {
                type Props = {
                    mode: QueryMode.MANAGE;
                    message: string;
                };

                type Result = Promise<Entities.Message>;
            }

            namespace FindMany {
                type DefaultProps = {
                    mode: QueryMode.DEFAULT;
                    sort: Adapters.Message.Sort;
                    pagination: Pagination;
                    notification: string;
                    actor: string;
                };

                type ManageProps = {
                    mode: QueryMode.MANAGE;
                    filters: Adapters.Message.Filters;
                    sort: Adapters.Message.Sort;
                    pagination: Pagination;
                };

                type Props = DefaultProps | ManageProps;
                type Result = Promise<[Entities.Message[], number]>;
            }
        }
    }
}
