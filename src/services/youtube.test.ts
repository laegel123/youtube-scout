import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { searchVideoIds, fetchVideosByIds } from "@/services/youtube";

// search.list 응답: id.videoId만 의미가 있다.
const SEARCH_RESPONSE = {
  items: [
    { id: { kind: "youtube#video", videoId: "aaaaaaaaaaa" } },
    { id: { kind: "youtube#video", videoId: "bbbbbbbbbbb" } },
  ],
};

// videos.list 응답: 첫 영상은 통계 완비, 둘째는 tags/likeCount/commentCount 누락.
const VIDEOS_RESPONSE = {
  items: [
    {
      id: "aaaaaaaaaaa",
      snippet: {
        title: "First",
        channelTitle: "Chan A",
        publishedAt: "2026-01-01T00:00:00Z",
        tags: ["x", "y"],
      },
      statistics: { viewCount: "1000", likeCount: "50", commentCount: "7" },
    },
    {
      id: "bbbbbbbbbbb",
      snippet: {
        title: "Second",
        channelTitle: "Chan B",
        publishedAt: "2026-02-01T00:00:00Z",
        // tags 누락
      },
      statistics: { viewCount: "2000" }, // likeCount/commentCount 누락
    },
  ],
};

function jsonResponse(body: unknown) {
  return { ok: true, status: 200, json: async () => body };
}

beforeEach(() => {
  process.env.YOUTUBE_API_KEY = "test-key";
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.YOUTUBE_API_KEY;
});

describe("youtube service (happy path)", () => {
  it("searches for ids, then batch-fetches and parses videos in one call", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(SEARCH_RESPONSE))
      .mockResolvedValueOnce(jsonResponse(VIDEOS_RESPONSE));
    vi.stubGlobal("fetch", fetchMock);

    const ids = await searchVideoIds("cooking", 25);
    expect(ids).toEqual(["aaaaaaaaaaa", "bbbbbbbbbbb"]);

    const videos = await fetchVideosByIds(ids);
    expect(videos).toHaveLength(2);

    // 통계 완비 영상: 문자열 → number 변환.
    expect(videos[0]).toEqual({
      id: "aaaaaaaaaaa",
      title: "First",
      channelTitle: "Chan A",
      publishedAt: "2026-01-01T00:00:00Z",
      tags: ["x", "y"],
      viewCount: 1000,
      likeCount: 50,
      commentCount: 7,
    });

    // 누락 처리: tags → [], 누락 통계는 0이 아니라 undefined로 유지.
    expect(videos[1].tags).toEqual([]);
    expect(videos[1].viewCount).toBe(2000);
    expect(videos[1].likeCount).toBeUndefined();
    expect(videos[1].commentCount).toBeUndefined();

    // 후보 통계는 영상별 개별 호출이 아니라 단일 batch (검색 1 + videos 1 = 2회).
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const searchUrl = fetchMock.mock.calls[0][0] as string;
    expect(searchUrl).toContain("/youtube/v3/search");
    expect(searchUrl).toContain("type=video");
    expect(searchUrl).toContain("maxResults=25");
    // relatedToVideoId는 2023년 제거되어 절대 쓰지 않는다.
    expect(searchUrl).not.toContain("relatedToVideoId");

    const videosUrl = decodeURIComponent(fetchMock.mock.calls[1][0] as string);
    expect(videosUrl).toContain("/youtube/v3/videos");
    expect(videosUrl).toContain("part=snippet,statistics,contentDetails");
    // 두 id가 한 번의 호출에 콤마로 묶여 들어간다.
    expect(videosUrl).toContain("id=aaaaaaaaaaa,bbbbbbbbbbb");
  });
});
