import { describe, expect, it } from "vitest";
import type { Notification } from "@/shared/api/types";
import { groupNotifications } from "@/features/notifications/pages/NotificationsPage";

function makeNotification(id: number, createdAt: string): Notification {
  return {
    id,
    userId: 1,
    message: `Aviso ${id}`,
    createdAt,
  };
}

describe("groupNotifications", () => {
  it("muestra los días y los avisos del más nuevo al más viejo", () => {
    const groups = groupNotifications([
      makeNotification(1, "2026-10-27T13:00:00Z"),
      makeNotification(2, "2026-10-27T20:00:00Z"),
      makeNotification(3, "2026-10-28T14:00:00Z"),
      makeNotification(4, "2026-10-28T18:00:00Z"),
    ]);

    expect(groups.map((group) => group.key)).toEqual(["2026-10-28", "2026-10-27"]);
    expect(groups[0].items.map((item) => item.id)).toEqual([4, 3]);
    expect(groups[1].items.map((item) => item.id)).toEqual([2, 1]);
  });
});
