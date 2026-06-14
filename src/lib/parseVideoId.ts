import type { ParsedInput } from "@/types/youtube";

// YouTube 영상 ID는 항상 11자, [A-Za-z0-9_-] 문자만 사용한다.
const VIDEO_ID = "[A-Za-z0-9_-]{11}";
const BARE_VIDEO_ID = new RegExp(`^${VIDEO_ID}$`);

// 지원하는 URL 형태에서 영상 ID를 추출하는 패턴들.
// youtu.be/<id>, watch?v=<id>, shorts/<id>, embed/<id>
const URL_PATTERNS: RegExp[] = [
  new RegExp(`youtu\\.be/(${VIDEO_ID})`),
  new RegExp(`[?&]v=(${VIDEO_ID})`),
  new RegExp(`/shorts/(${VIDEO_ID})`),
  new RegExp(`/embed/(${VIDEO_ID})`),
];

/**
 * 사용자 입력을 파싱해 영상 ID 또는 검색어로 분류한다.
 * - YouTube URL / 단독 11자 ID → { type: 'video' }
 * - 그 외 텍스트 → { type: 'query' }
 * - 빈 문자열 / 공백만 → throw
 */
export function parseInput(raw: string): ParsedInput {
  const input = raw.trim();
  if (input === "") {
    throw new Error("input is empty");
  }

  for (const pattern of URL_PATTERNS) {
    const match = input.match(pattern);
    if (match) {
      return { type: "video", videoId: match[1] };
    }
  }

  if (BARE_VIDEO_ID.test(input)) {
    return { type: "video", videoId: input };
  }

  return { type: "query", query: input };
}
