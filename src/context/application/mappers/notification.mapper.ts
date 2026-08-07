import { ChannelType } from "~context/enums";

export class NotificationMapper implements Commands.Mappers.Notification.Contract {
    public messageDispatchPayload(
        props: Commands.Mappers.Notification.MessageDispatchPayload.Props,
    ): Commands.Mappers.Notification.MessageDispatchPayload.Result {
        return props.messages
            .filter(({ channelType }) => channelType !== ChannelType.IN_APP)
            .map(({ id }) => ({ message: id }));
    }
}
