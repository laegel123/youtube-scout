import { describe, it, expect } from "vitest";
import type { RawVideo } from "@/types/youtube";
import { deriveMetrics, scoreVideos } from "@/lib/score";

const DAY = 86_400_000;
const now = new Date("2026-06-14T00:00:00.000Z");
const daysAgo = (n: number) => new Date(now.getTime() - n * DAY).toISOString();

function makeVideo(over: Partial<RawVideo> & { id: string }): RawVideo {
  return {
    title: "t",
    channelTitle: "c",
    publishedAt: daysAgo(10),
    tags: [],
    ...over,
  };
}

describe("deriveMetrics", () => {
  it("derives ageDays from publishedAt and now", () => {
    const m = deriveMetrics(makeVideo({ id: "a", publishedAt: daysAgo(10) }), now);
    expect(m.ageDays).toBe(10);
  });

  it("supports fractional ageDays", () => {
    const m = deriveMetrics(makeVideo({ id: "a", publishedAt: daysAgo(2.5) }), now);
    expect(m.ageDays).toBeCloseTo(2.5, 6);
  });

  it("floors ageDays at 1 for a video published just now", () => {
    const m = deriveMetrics(makeVideo({ id: "a", publishedAt: daysAgo(0) }), now);
    expect(m.ageDays).toBe(1);
  });

  it("floors ageDays at 1 for a video published in the future", () => {
    const m = deriveMetrics(makeVideo({ id: "a", publishedAt: daysAgo(-5) }), now);
    expect(m.ageDays).toBe(1);
  });

  it("computes engagement = (likes + comments) / max(1, views)", () => {
    const m = deriveMetrics(
      makeVideo({ id: "a", viewCount: 100, likeCount: 10, commentCount: 5 }),
      now,
    );
    expect(m.engagement).toBeCloseTo(0.15, 6);
  });

  it("uses max(1, views) so zero-view videos do not divide by zero", () => {
    const m = deriveMetrics(
      makeVideo({ id: "a", viewCount: 0, likeCount: 2, commentCount: 3 }),
      now,
    );
    expect(m.engagement).toBe(5); // (2 + 3) / max(1, 0)
  });

  it("computes velocity = views / ageDays", () => {
    const m = deriveMetrics(
      makeVideo({ id: "a", viewCount: 1000, publishedAt: daysAgo(10) }),
      now,
    );
    expect(m.velocity).toBe(100);
  });

  it("maps missing viewCount to 0 and missing like/comment counts to null", () => {
    const m = deriveMetrics(makeVideo({ id: "a" }), now);
    expect(m.views).toBe(0);
    expect(m.likes).toBeNull();
    expect(m.comments).toBeNull();
    expect(m.engagement).toBe(0); // (0 + 0) / max(1, 0)
  });
});

describe("scoreVideos", () => {
  it("returns an empty array for an empty pool", () => {
    expect(scoreVideos([], undefined, now)).toEqual([]);
  });

  it("returns one entry per input video with score in [0, 1]", () => {
    const result = scoreVideos(
      [
        makeVideo({ id: "a", viewCount: 100, likeCount: 10, commentCount: 5 }),
        makeVideo({ id: "b", viewCount: 200, likeCount: 20, commentCount: 1 }),
      ],
      undefined,
      now,
    );
    expect(result).toHaveLength(2);
    for (const r of result) {
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(1);
    }
  });

  it("normalizes a metric to 0.5 when max === min (identical videos score 0.5)", () => {
    const v = { viewCount: 500, likeCount: 50, commentCount: 5, publishedAt: daysAgo(10) };
    const result = scoreVideos(
      [makeVideo({ id: "a", ...v }), makeVideo({ id: "b", ...v })],
      undefined,
      now,
    );
    expect(result[0].score).toBeCloseTo(0.5, 6);
    expect(result[1].score).toBeCloseTo(0.5, 6);
  });

  it("imputes null likes to 0.5 instead of bottom-ranking the private video", () => {
    // 모든 영상 views/comments/velocity 동일, likes 만 [10, null, 100]
    const base = { viewCount: 100, commentCount: 10, publishedAt: daysAgo(10) };
    const result = scoreVideos(
      [
        makeVideo({ id: "low", ...base, likeCount: 10 }),
        makeVideo({ id: "private", ...base }), // likeCount 누락 → null → 0.5 imputation
        makeVideo({ id: "high", ...base, likeCount: 100 }),
      ],
      undefined,
      now,
    );
    const byId = Object.fromEntries(result.map((r) => [r.video.id, r]));
    // high: likes=1, low: likes=0, private: likes imputed 0.5
    expect(byId.high.score).toBeCloseTo(0.725, 6);
    expect(byId.private.score).toBeCloseTo(0.375, 6);
    expect(byId.low.score).toBeCloseTo(0.3, 6);
    // 비공개 영상이 likes 0점인 영상보다 위에 와야 한다
    expect(byId.private.rank).toBeLessThan(byId.low.rank);
  });

  it("drops the weight of an all-null metric and renormalizes the rest (sum stays 1)", () => {
    // comments 전부 null → comments 가중치(0.15) 제거, 나머지 0.85 비례 재정규화
    const result = scoreVideos(
      [
        makeVideo({ id: "a", viewCount: 100, likeCount: 10, publishedAt: daysAgo(10) }),
        makeVideo({ id: "b", viewCount: 200, likeCount: 20, publishedAt: daysAgo(10) }),
      ],
      undefined,
      now,
    );
    const byId = Object.fromEntries(result.map((r) => [r.video.id, r]));
    // 재정규화 가중치 = 원가중치 / 0.85
    // a: views0,likes0,eng0.5,vel0 → (0.25*0.5)/0.85 = 0.125/0.85
    // b: views1,likes1,eng0.5,vel1 → (0.20+0.20+0.20+0.25*0.5)/0.85 = 0.725/0.85
    expect(byId.a.score).toBeCloseTo(0.125 / 0.85, 6);
    expect(byId.b.score).toBeCloseTo(0.725 / 0.85, 6);
  });

  it("assigns ranks by score descending and tie-breaks by views descending", () => {
    // likes/comments 전부 null → 두 가중치 제거(잔여 합 0.65).
    // views 와 velocity 가중치가 같아(0.20) 정확히 동점이 되도록 구성.
    // a: 높은 views, 낮은 velocity / b: 낮은 views, 높은 velocity → score 동점 0.5
    const a = makeVideo({ id: "a", viewCount: 1000, publishedAt: daysAgo(100) }); // vel 10
    const b = makeVideo({ id: "b", viewCount: 500, publishedAt: daysAgo(10) }); // vel 50

    for (const pool of [[a, b], [b, a]]) {
      const result = scoreVideos(pool, undefined, now);
      expect(result[0].score).toBeCloseTo(0.5, 6);
      expect(result[1].score).toBeCloseTo(0.5, 6);
      // 동점이면 views 높은 a 가 1위
      expect(result[0].video.id).toBe("a");
      expect(result[0].rank).toBe(1);
      expect(result[1].video.id).toBe("b");
      expect(result[1].rank).toBe(2);
    }
  });

  it("ranks a mixed pool with all metrics present (full hand-computed)", () => {
    const result = scoreVideos(
      [
        makeVideo({ id: "v1", viewCount: 1000, likeCount: 100, commentCount: 50, publishedAt: daysAgo(100) }),
        makeVideo({ id: "v2", viewCount: 500, likeCount: 200, commentCount: 10, publishedAt: daysAgo(50) }),
        makeVideo({ id: "v3", viewCount: 2000, likeCount: 50, commentCount: 100, publishedAt: daysAgo(200) }),
      ],
      undefined,
      now,
    );
    expect(result.map((r) => r.video.id)).toEqual(["v2", "v3", "v1"]);
    expect(result.map((r) => r.rank)).toEqual([1, 2, 3]);
    const byId = Object.fromEntries(result.map((r) => [r.video.id, r]));
    expect(byId.v2.score).toBeCloseTo(0.55, 5);
    expect(byId.v3.score).toBeCloseTo(0.45, 5);
    expect(byId.v1.score).toBeCloseTo(0.35435, 5);
    // velocity 가 전부 10 → max===min → 0.5 (max==min 경계 동시 검증)
    expect(byId.v1.metrics.velocity).toBe(10);
    expect(byId.v2.metrics.velocity).toBe(10);
    expect(byId.v3.metrics.velocity).toBe(10);
  });
});
