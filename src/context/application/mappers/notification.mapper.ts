import { ChannelType } from "~context/enums";

export class NotificationMapper implements Mappers.Notification.Contract {
    public messageDispatchPayload(
        props: Mappers.Notification.MessageDispatchPayload.Props,
    ): Mappers.Notification.MessageDispatchPayload.Result {
        return props.messages
            .filter(({ channelType }) => channelType !== ChannelType.IN_APP)
            .map(({ id }) => ({ message: id }));
    }
}
