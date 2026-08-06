import { QueryMode } from "~context/enums";

declare global {
    namespace Queries {
        namespace Recipient {
            interface Contract extends ControllerContract {}

            interface ControllerContract {
                findUnique: FindUnique.Signature;
            }

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

                type Signature = (props: Props) => Result;
            }
        }
    }
}
