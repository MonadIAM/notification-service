import { describe, expect, it, jest } from "@jest/globals";

import { Inbox } from "./inbox.entity";

describe("[Entity] - Inbox", () => {
    describe("[Method] - constructor", () => {
        it("[case] - maps the incoming event and source metadata", () => {
            // Arrange
            jest.useFakeTimers().setSystemTime(new Date("2026-09-14T00:00:00.000Z"));

            // Act
            const entity = new Inbox({
                source: { topic: "source-topic", partition: 2, offset: "42" },
                consumerKey: "notification.notification.v1",
                event: "event-1",
            });
            const result = entity;
            jest.useRealTimers();

            // Assert
            expect(result).toEqual({
                processedAt: new Date("2026-09-14T00:00:00.000Z"),
                consumerKey: "notification.notification.v1",
                topic: "source-topic",
                event: "event-1",
                partition: 2,
                offset: "42",
            });
        });

        it("[case] - keeps source metadata optional", () => {
            // Arrange

            // Act
            const entity = new Inbox({ consumerKey: "notification.notification.v1", event: "event-1" });
            const result = entity.topic;
            const result1 = entity.partition;

            // Assert
            expect(result).toBeUndefined();
            expect(result1).toBeUndefined();
            expect(entity.offset).toBeUndefined();
        });
    });
});
