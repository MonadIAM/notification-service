import { MessageEvent } from "@nestjs/common";
import { Observable } from "rxjs";

declare global {
    namespace InfrastructureServices.NotificationStream {
        type Change = {
            message: Nullable<string>;
            account: string;
        };

        interface Contract extends PublicContract, InternalContract {}

        interface InternalContract {
            snapshot: Snapshot.Signature;
        }

        namespace Snapshot {
            type Props = {
                change: Nullable<Change>;
                account: string;
            };

            type Result = Promise<MessageEvent>;

            type Signature = (props: Props) => Result;
        }

        interface PublicContract {
            publishMessages: PublishMessages.Signature;
            publish: Publish.Signature;
            watch: Watch.Signature;
        }

        namespace Watch {
            type Props = Extract.Session.Auth;

            type Result = Observable<MessageEvent>;

            type Signature = (props: Props) => Result;
        }

        namespace Publish {
            type Props = Change;

            type Result = Promise<void>;

            type Signature = (props: Props) => Result;
        }

        namespace PublishMessages {
            type Props = {
                messages: Entities.Message[];
            };

            type Result = Promise<void>;

            type Signature = (props: Props) => Result;
        }
    }
}
