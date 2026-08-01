import { QueryMode } from "~context/enums";

declare global {
    namespace Queries {
        namespace Recipient {
            interface ControllerContract {
                findUnique(props: FindUnique.DefaultProps): FindUnique.Result;
                findUnique(props: FindUnique.ManageProps): FindUnique.Result;
            }

            interface Contract extends ControllerContract {}

            namespace FindUnique {
                type DefaultProps = {
                    mode: QueryMode.DEFAULT;
                    actor: string;
                };

                type ManageProps = {
                    mode: QueryMode.MANAGE;
                    account: string;
                };

                type Props = DefaultProps | ManageProps;
                type Result = Promise<Entities.Recipient>;
            }
        }
    }
}
