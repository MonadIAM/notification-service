import { QueryMode } from "~context/enums";

declare global {
    namespace Queries {
        namespace Message {
            interface Contract extends ControllerContract {}

            interface ControllerContract {
                findUnique: FindUnique.Signature;
                findMany: FindMany.Signature;
            }

            namespace FindUnique {
                type Props = {
                    mode: QueryMode.MANAGE;
                    message: string;
                };

                type Result = Promise<Entities.Message>;

                type Signature = (props: Props) => Result;
            }

            namespace FindMany {
                type DefaultProps = {
                    mode: QueryMode.DEFAULT;
                    sort: Repositories.Mappers.Message.Sort;
                    pagination: Pagination;
                    notification: string;
                    actor: string;
                };

                type ManageProps = {
                    mode: QueryMode.MANAGE;
                    filters: Repositories.Mappers.Message.Filters;
                    sort: Repositories.Mappers.Message.Sort;
                    pagination: Pagination;
                };

                type Props = DefaultProps | ManageProps;

                type Result = Promise<[Entities.Message[], number]>;

                type Signature = (props: Props) => Result;
            }
        }
    }
}
