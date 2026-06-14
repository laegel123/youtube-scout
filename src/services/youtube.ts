import "server-only";
import type { RawVideo } from "@/types/youtube";

// YouTube Data API v3 엔드포인트.
const SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";
const VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos";

const DEFAULT_SEARCH_MAX = 25;
const MAX_BATCH = 50; // videos.list는 1회 호출당 최대 50개 id.

// ---- 응답 형태 (필요한 필드만) ---------------------------------------------

interface SearchItem {
  id?: { videoId?: string };
}

interface VideoItem {
  id?: string;
  snippet?: {
    title?: string;
    channelTitle?: string;
    publishedAt?: string;
    tags?: string[];
  };
  statistics?: {
    viewCount?: string;
    likeCount?: string;
    commentCount?: string;
  };
}

// ---- 내부 헬퍼 -------------------------------------------------------------

/** 통계는 문자열이거나 누락된다. 누락이면 undefined로 유지(0으로 채우지 않는다). */
function parseCount(raw: string | undefined): number | undefined {
  if (raw === undefined || raw === null) return undefined;
  const n = Number(raw);
  return Number.isNaN(n) ? undefined : n;
}

/** videos.list 항목을 도메인 타입으로 정규화한다. */
function toRawVideo(item: VideoItem): RawVideo {
  const snippet = item.snippet ?? {};
  const statistics = item.statistics ?? {};
  return {
    id: item.id ?? "",
    title: snippet.title ?? "",
    channelTitle: snippet.channelTitle ?? "",
    publishedAt: snippet.publishedAt ?? "",
    tags: snippet.tags ?? [],
    viewCount: parseCount(statistics.viewCount),
    likeCount: parseCount(statistics.likeCount),
    commentCount: parseCount(statistics.commentCount),
  };
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

// ---- 공개 API --------------------------------------------------------------

/** 서버 전용 API 키. 없으면 명확히 throw 한다. */
export function getApiKey(): string {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    throw new Error("YOUTUBE_API_KEY missing");
  }
  return key;
}

/**
 * 시드 영상 1개를 조회한다.
 * 네트워크 실패/404/미존재는 null을 반환한다(throw 하지 않는다).
 */
export async function fetchVideoById(videoId: string): Promise<RawVideo | null> {
  try {
    const videos = await fetchVideosByIds([videoId]);
    return videos[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * 키워드로 유사 영상의 videoId 목록을 수집한다 (search.list).
 * relatedToVideoId는 2023년 제거되어 응답하지 않으므로 절대 쓰지 않는다 (ADR-003).
 */
export async function searchVideoIds(
  query: string,
  max: number = DEFAULT_SEARCH_MAX,
): Promise<string[]> {
  const key = getApiKey();
  const url = new URL(SEARCH_URL);
  url.searchParams.set("part", "snippet");
  url.searchParams.set("type", "video");
  url.searchParams.set("q", query);
  url.searchParams.set("maxResults", String(max));
  url.searchParams.set("key", key);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`search.list failed: ${res.status}`);
  }

  const data: unknown = await res.json();
  const items = (data as { items?: SearchItem[] })?.items ?? [];
  const ids: string[] = [];
  for (const item of items) {
    const id = item?.id?.videoId;
    if (typeof id === "string") {
      ids.push(id);
    }
  }
  return ids;
}

/**
 * 후보 id들의 통계를 videos.list로 batch 조회한다 (ADR-004).
 * search.list는 통계를 반환하지 않으므로 2차 조회가 필요하다.
 * 영상별 개별 호출은 quota 50배 낭비이므로 금지. 50개 초과면 50개씩 청크.
 */
export async function fetchVideosByIds(ids: string[]): Promise<RawVideo[]> {
  if (ids.length === 0) return [];
  const key = getApiKey();

  const videos: RawVideo[] = [];
  for (const batch of chunk(ids, MAX_BATCH)) {
    const url = new URL(VIDEOS_URL);
    url.searchParams.set("part", "snippet,statistics,contentDetails");
    url.searchParams.set("id", batch.join(","));
    url.searchParams.set("key", key);

    const res = await fetch(url.toString());
    if (!res.ok) {
      throw new Error(`videos.list failed: ${res.status}`);
    }

    const data: unknown = await res.json();
    const items = (data as { items?: VideoItem[] })?.items ?? [];
    for (const item of items) {
      videos.push(toRawVideo(item));
    }
  }
  return videos;
}
