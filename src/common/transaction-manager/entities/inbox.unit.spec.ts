import { describe, expect, it, jest } from "@jest/globals";

import { Inbox } from "./inbox.entity";

describe("Inbox", () => {
    it("maps the incoming event and source metadata", () => {
        jest.useFakeTimers().setSystemTime(new Date("2026-09-14T00:00:00.000Z"));

        const entity = new Inbox({
            source: { topic: "source-topic", partition: 2, offset: "42" },
            consumerKey: "notification.notification.v1",
            event: "event-1",
        });

        expect(entity).toEqual({
            processedAt: new Date("2026-09-14T00:00:00.000Z"),
            consumerKey: "notification.notification.v1",
            topic: "source-topic",
            event: "event-1",
            partition: 2,
            offset: "42",
        });

        jest.useRealTimers();
    });

    it("keeps source metadata optional", () => {
        const entity = new Inbox({ consumerKey: "notification.notification.v1", event: "event-1" });

        expect(entity.topic).toBeUndefined();
        expect(entity.partition).toBeUndefined();
        expect(entity.offset).toBeUndefined();
    });
});
