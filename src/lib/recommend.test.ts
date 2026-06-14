import { describe, it, expect } from "vitest";
import type { RawVideo } from "@/types/youtube";
import type { ScoredVideo, VideoMetrics } from "@/lib/score";
import { recommendNext } from "@/lib/recommend";

// 점수화가 끝난 ScoredVideo 를 손쉽게 만드는 테스트 헬퍼.
// recommend 는 텍스트(title/tags)와 metrics(seed 비교)만 사용하므로 그 둘만 의미를 갖는다.
function scored(
  id: string,
  title: string,
  tags: string[] = [],
  metrics: Partial<VideoMetrics> = {},
  rank = 1,
): ScoredVideo {
  const video: RawVideo = {
    id,
    title,
    channelTitle: "c",
    publishedAt: "2026-01-01T00:00:00.000Z",
    tags,
    viewCount: 0,
  };
  return {
    video,
    metrics: {
      views: 0,
      likes: null,
      comments: null,
      ageDays: 10,
      engagement: 0.1,
      velocity: 100,
      ...metrics,
    },
    score: 0.5,
    rank,
  };
}

describe("recommendNext — 빈 입력", () => {
  it("영상이 없으면 빈 배열을 반환한다 (seed 유무 무관)", () => {
    expect(recommendNext([], null)).toEqual([]);
    const seed: VideoMetrics = {
      views: 1,
      likes: 1,
      comments: 1,
      ageDays: 1,
      engagement: 0.1,
      velocity: 1,
    };
    expect(recommendNext([], seed)).toEqual([]);
  });

  it("반복되는 키워드가 없으면(패턴 없음) 빈 배열을 반환한다", () => {
    const recs = recommendNext(
      [scored("1", "알파"), scored("2", "브라보"), scored("3", "찰리")],
      null,
    );
    expect(recs).toEqual([]);
  });
});

describe("recommendNext — 빈도 집계", () => {
  it("상위 영상에 반복 등장하는 키워드를 추천으로 끌어올린다", () => {
    const recs = recommendNext(
      [
        scored("1", "주말 꿀팁 모음"),
        scored("2", "꿀팁 대방출"),
        scored("3", "최고의 꿀팁"),
        scored("4", "무관한 제목"),
      ],
      null,
    );
    expect(recs.length).toBeGreaterThan(0);
    // '꿀팁' 이 상위 4개 중 3개에 등장 → 1순위 키워드
    expect(recs[0].suggestedTopic).toContain("꿀팁");
    expect(recs[0].evidence).toContain("상위 4개 중 3개");
  });

  it("대소문자를 구분하지 않고 집계한다", () => {
    const recs = recommendNext(
      [
        scored("1", "Cooking Tips"),
        scored("2", "cooking hacks"),
        scored("3", "COOKING guide"),
      ],
      null,
    );
    expect(recs).toHaveLength(1);
    expect(recs[0].suggestedTopic).toBe("cooking");
    expect(recs[0].evidence).toContain("상위 3개 중 3개");
  });

  it("제목뿐 아니라 태그의 키워드도 집계한다", () => {
    const recs = recommendNext(
      [
        scored("1", "가나다", ["여행"]),
        scored("2", "라마바", ["여행", "브이로그"]),
        scored("3", "사아자", ["여행"]),
      ],
      null,
    );
    expect(recs).toHaveLength(1);
    expect(recs[0].suggestedTopic).toBe("여행");
  });

  it("자주 등장해도 stopword 는 키워드로 뽑지 않는다", () => {
    const recs = recommendNext(
      [
        scored("1", "the best recipe"),
        scored("2", "the easy recipe"),
        scored("3", "the quick recipe"),
      ],
      null,
    );
    // 'the' 가 3개 모두에 있지만 stopword → 'recipe' 만 surface
    expect(recs).toHaveLength(1);
    expect(recs[0].suggestedTopic).toBe("recipe");
  });

  it("반복되는 2-gram(구문)을 감지하고 그 구성 unigram보다 우선한다", () => {
    const recs = recommendNext(
      [
        scored("1", "morning routine ideas"),
        scored("2", "morning routine tips"),
        scored("3", "best morning routine"),
      ],
      null,
    );
    expect(recs).toHaveLength(1);
    expect(recs[0].pattern).toContain("morning routine");
    expect(recs[0].evidence).toContain("상위 3개 중 3개");
  });
});

describe("recommendNext — topN 경계", () => {
  it("기본 topN=5 윈도 밖의 영상은 무시하고, opts.topN 으로 확장할 수 있다", () => {
    const videos = [
      scored("1", "알파"),
      scored("2", "브라보"),
      scored("3", "찰리"),
      scored("4", "델타"),
      scored("5", "에코"),
      scored("6", "공통 레시피"),
      scored("7", "특별 레시피"),
    ];

    // 기본 top5: 1~5 는 각자 고유 단어뿐 → 패턴 없음. '레시피'(6,7위)는 윈도 밖 → 무시
    const withDefault = recommendNext(videos, null);
    expect(JSON.stringify(withDefault)).not.toContain("레시피");

    // topN=7 로 확장하면 '레시피'가 2개에 등장 → surface
    const withWindow = recommendNext(videos, null, { topN: 7 });
    expect(JSON.stringify(withWindow)).toContain("레시피");
    expect(withWindow[0].evidence).toContain("상위 7개 중 2개");
  });

  it("추천은 최대 3개까지만 반환한다", () => {
    const videos = [
      scored("1", "apple banana cherry date elderberry fig grape"),
      scored("2", "apple banana cherry date elderberry fig grape"),
    ];
    const recs = recommendNext(videos, null);
    expect(recs.length).toBeGreaterThan(0);
    expect(recs.length).toBeLessThanOrEqual(3);
  });
});

describe("recommendNext — seed 유무", () => {
  it("seed가 있을 때만 evidence에 지표 비교(배수)를 담는다", () => {
    const videos = [
      scored("1", "vlog daily", [], { engagement: 0.2, velocity: 200 }),
      scored("2", "vlog weekly", [], { engagement: 0.2, velocity: 200 }),
    ];

    const withoutSeed = recommendNext(videos, null);
    expect(withoutSeed[0].evidence).not.toContain("배");

    const seed: VideoMetrics = {
      views: 100,
      likes: 5,
      comments: 5,
      ageDays: 10,
      engagement: 0.1,
      velocity: 100,
    };
    const withSeed = recommendNext(videos, seed);
    // 상위 평균 engagement 0.2 / seed 0.1 = 2.0배, velocity 200/100 = 2.0배
    expect(withSeed[0].evidence).toContain("배");
    expect(withSeed[0].evidence).toContain("2.0배");
  });
});
