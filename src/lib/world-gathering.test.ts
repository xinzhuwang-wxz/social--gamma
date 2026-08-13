import { describe, expect, it } from "vitest";
import { draftToSeedCard } from "./world-gathering";

describe("draftToSeedCard", () => {
  it("maps the world publish draft into the persisted seed card shape", () => {
    expect(
      draftToSeedCard({
        idea: "轻松爬山",
        time: "本周六 下午",
        place: "学校附近",
        people: "2-4 人",
        companion: "新手友好",
        habit: "节奏轻松",
        activityDetail: "轻松路线，不赶时间",
      })
    ).toEqual({
      title: "轻松爬山",
      what: "轻松爬山",
      whenText: "本周六 下午",
      whereText: "学校附近",
      groupSize: "2-4 人",
      requirements: {
        must: ["轻松路线，不赶时间"],
        flexible: ["新手友好", "节奏轻松"],
      },
      tags: ["运动"],
    });
  });
});
