import { parseInput } from "@/lib/parseVideoId";
import { scoreVideos, type ScoredVideo } from "@/lib/score";
import { recommendNext, type Recommendation } from "@/lib/recommend";
import {
  getApiKey,
  fetchVideoById,
  searchVideoIds,
  fetchVideosByIds,
} from "@/services/youtube";
import type { RawVideo } from "@/types/youtube";

// CRITICAL(CLAUDE.md): 모든 외부 API 로직은 이 라우트(서버)에서만 일어난다.
// 키는 서버 전용이며 응답/로그에 노출하지 않는다.

const SEARCH_MAX = 25;
const SEED_TAG_LIMIT = 3; // 검색어를 만들 때 시드 영상에서 쓸 상위 태그 수.

interface AnalyzeResponse {
  seed: ScoredVideo | null;
  ranked: ScoredVideo[];
  recommendations: Recommendation[];
}

const EMPTY_RESULT: AnalyzeResponse = { seed: null, ranked: [], recommendations: [] };

/** 시드 영상의 제목 + 상위 태그 몇 개로 검색 키워드를 만든다. */
function buildSearchQuery(seed: RawVideo): string {
  const topTags = seed.tags.slice(0, SEED_TAG_LIMIT);
  return [seed.title, ...topTags].join(" ").trim();
}

export async function POST(req: Request): Promise<Response> {
  // 1. 입력 파싱·검증. 없거나 빈 값이면 400.
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const input = (body as { input?: unknown } | null)?.input;
  if (typeof input !== "string" || input.trim() === "") {
    return Response.json({ error: "input is required" }, { status: 400 });
  }

  try {
    // 키 누락이면 즉시 throw → 아래 catch에서 500. (fetchVideoById는 에러를 삼키므로 fail-fast)
    getApiKey();

    // 2. 입력 분류: video → 시드 조회 후 키워드 생성, query → 그대로 검색어.
    const parsed = parseInput(input);
    let seedVideo: RawVideo | null = null;
    let query: string;
    if (parsed.type === "video") {
      seedVideo = await fetchVideoById(parsed.videoId);
      query = seedVideo ? buildSearchQuery(seedVideo) : "";
    } else {
      query = parsed.query;
    }

    // 검색어가 비면(시드 조회 실패 등) 분석할 풀이 없다 → 빈 결과.
    if (query.trim() === "") {
      return Response.json(EMPTY_RESULT);
    }

    // 3. 후보 ID 수집. 시드가 있으면 같은 풀에 넣어 "내 영상 순위"를 보여준다.
    const searchIds = await searchVideoIds(query, SEARCH_MAX);
    if (searchIds.length === 0) {
      return Response.json(EMPTY_RESULT);
    }
    const seedId = seedVideo?.id ?? null;
    const ids = seedId
      ? [seedId, ...searchIds.filter((id) => id !== seedId)]
      : searchIds;

    // 4. 통계 batch 조회 → RawVideo[].
    const videos = await fetchVideosByIds(ids);

    // 5. 점수화·순위화. 시드의 순위를 함께 찾는다.
    const ranked = scoreVideos(videos);
    const seedScored = seedId
      ? (ranked.find((r) => r.video.id === seedId) ?? null)
      : null;

    // 6. 상위 패턴 + 시드 지표 격차로 다음 콘텐츠 추천.
    const recommendations = recommendNext(ranked, seedScored?.metrics ?? null);

    // 7. JSON 응답.
    const payload: AnalyzeResponse = { seed: seedScored, ranked, recommendations };
    return Response.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message.includes("YOUTUBE_API_KEY missing")) {
      return Response.json({ error: "YOUTUBE_API_KEY missing" }, { status: 500 });
    }
    return Response.json({ error: "analysis failed" }, { status: 500 });
  }
}
