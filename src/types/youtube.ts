// YouTube에서 정규화해 들고 다닐 영상 도메인 타입
export interface RawVideo {
  id: string;
  title: string;
  channelTitle: string;
  publishedAt: string; // ISO 8601
  tags: string[]; // 없으면 빈 배열
  viewCount?: number; // 비공개/누락 시 undefined
  likeCount?: number;
  commentCount?: number;
}

// 사용자 입력 파싱 결과
export type ParsedInput =
  | { type: "video"; videoId: string }
  | { type: "query"; query: string };
