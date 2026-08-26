import { QueryMode } from "~context/enums";

declare global {
    namespace Queries {
        namespace Preference {
            interface Contract extends ControllerContract {}

            interface ControllerContract {
                findMany: FindMany.Signature;
            }

            namespace FindMany {
                type DefaultProps = {
                    mode: QueryMode.DEFAULT;
                    filters: Repositories.Mappers.Preference.Filters;
                    sort: Repositories.Mappers.Preference.Sort;
                    pagination: Pagination;
                    actor: string;
                };

                type ManageProps = {
                    mode: QueryMode.MANAGE;
                    filters: Repositories.Mappers.Preference.Filters;
                    sort: Repositories.Mappers.Preference.Sort;
                    pagination: Pagination;
                };

                type Props = DefaultProps | ManageProps;

                type Result = Promise<[Entities.Preference[], number]>;

                type Signature = (props: Props) => Result;
            }
        }
    }
}
