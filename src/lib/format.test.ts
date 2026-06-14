import { describe, it, expect } from "vitest";
import { formatCount, formatPercent } from "@/lib/format";

describe("formatCount", () => {
  it("1000 미만은 축약 없이 표시한다", () => {
    expect(formatCount(0)).toBe("0");
    expect(formatCount(42)).toBe("42");
    expect(formatCount(999)).toBe("999");
  });

  it("천 단위는 K로 축약한다", () => {
    expect(formatCount(1000)).toBe("1K");
    expect(formatCount(1500)).toBe("1.5K");
    expect(formatCount(12000)).toBe("12K");
    expect(formatCount(12340)).toBe("12.3K");
  });

  it("백만 단위는 M으로 축약한다", () => {
    expect(formatCount(1_200_000)).toBe("1.2M");
    expect(formatCount(2_000_000)).toBe("2M");
  });

  it("십억 단위는 B로 축약한다", () => {
    expect(formatCount(3_400_000_000)).toBe("3.4B");
  });

  it("소수는 1자리로 다듬는다", () => {
    expect(formatCount(0.5)).toBe("0.5");
    expect(formatCount(12.34)).toBe("12.3");
  });
});

describe("formatPercent", () => {
  it("비율(0~1)을 퍼센트 문자열로 만든다", () => {
    expect(formatPercent(0)).toBe("0%");
    expect(formatPercent(0.123)).toBe("12.3%");
    expect(formatPercent(0.12)).toBe("12%");
    expect(formatPercent(1)).toBe("100%");
  });
});
