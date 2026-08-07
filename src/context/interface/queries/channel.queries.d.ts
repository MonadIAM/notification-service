import { QueryMode } from "~context/enums";

declare global {
    namespace Queries {
        namespace Channel {
            interface Contract extends ControllerContract {}

            interface ControllerContract {
                findUnique: FindUnique.Signature;
                findMany: FindMany.Signature;
            }

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

                type Signature = (props: Props) => Result;
            }

            namespace FindMany {
                type DefaultProps = {
                    mode: QueryMode.DEFAULT;
                    filters: Repositories.Mappers.Channel.Filters;
                    sort: Repositories.Mappers.Channel.Sort;
                    pagination: Pagination;
                    actor: string;
                };

                type ManageProps = {
                    mode: QueryMode.MANAGE;
                    filters: Repositories.Mappers.Channel.Filters;
                    sort: Repositories.Mappers.Channel.Sort;
                    pagination: Pagination;
                };

                type Props = DefaultProps | ManageProps;

                type Result = Promise<[Entities.Channel[], number]>;

                type Signature = (props: Props) => Result;
            }
        }
    }
}
