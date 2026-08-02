import { ReauthenticationConsumer } from "./reauthentication.consumer";
import { NotificationConsumer } from "./notification.consumer";
import { AccessCacheConsumer } from "./access-cache.consumer";
import { BlacklistConsumer } from "./blacklist.consumer";
import { DispatchConsumer } from "./dispatch.consumer";
import { RetryConsumer } from "./retry.consumer";

export const CONSUMERS = [
    ReauthenticationConsumer,
    NotificationConsumer,
    AccessCacheConsumer,
    BlacklistConsumer,
    DispatchConsumer,
    RetryConsumer,
];

export {
    ReauthenticationConsumer,
    NotificationConsumer,
    AccessCacheConsumer,
    BlacklistConsumer,
    DispatchConsumer,
    RetryConsumer,
};
