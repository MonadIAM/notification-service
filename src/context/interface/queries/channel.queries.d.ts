import { QueryMode } from "~context/enums";

declare global {
    namespace Queries {
        namespace Channel {
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
                    channel: string;
                    actor: string;
                };

                type ManageProps = {
                    mode: QueryMode.MANAGE;
                    channel: string;
                };

                type Props = DefaultProps | ManageProps;
                type Result = Promise<Entities.Channel>;
            }

            namespace FindMany {
                type DefaultProps = {
                    mode: QueryMode.DEFAULT;
                    filters: Adapters.Channel.Filters;
                    sort: Adapters.Channel.Sort;
                    pagination: Pagination;
                    actor: string;
                };

                type ManageProps = {
                    mode: QueryMode.MANAGE;
                    filters: Adapters.Channel.Filters;
                    sort: Adapters.Channel.Sort;
                    pagination: Pagination;
                };

                type Props = DefaultProps | ManageProps;
                type Result = Promise<[Entities.Channel[], number]>;
            }
        }
    }
}
