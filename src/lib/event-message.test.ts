import { describe, expect, it } from "vitest";
import { decodeEventAiMessage, encodeEventAiMessage, readableMessage } from "./event-message";

describe("event AI message envelope", () => {
  it("round-trips structured actions without exposing storage syntax", () => {
    const content = encodeEventAiMessage({
      action: "offer_choices",
      text: "周五七点还是七点半？",
      options: ["周五 19:00", "周五 19:30"],
    });

    expect(decodeEventAiMessage(content)).toEqual({
      action: "offer_choices",
      text: "周五七点还是七点半？",
      options: ["周五 19:00", "周五 19:30"],
    });
    expect(readableMessage(content)).toBe("周五七点还是七点半？");
  });

  it("keeps existing plain messages unchanged", () => {
    expect(decodeEventAiMessage("普通消息")).toBeNull();
    expect(readableMessage("普通消息")).toBe("普通消息");
  });
});
