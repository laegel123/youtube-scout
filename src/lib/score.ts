import type { RawVideo } from "@/types/youtube";

// ADR-005: 정량 지표를 min-max 정규화 후 가중합해 점수화한다.
export const DEFAULT_WEIGHTS = {
  views: 0.2,
  likes: 0.2,
  comments: 0.15,
  engagement: 0.25,
  velocity: 0.2,
} as const;
export type Weights = typeof DEFAULT_WEIGHTS;

export interface VideoMetrics {
  views: number;
  likes: number | null; // 비공개면 null
  comments: number | null;
  ageDays: number; // 최소 1
  engagement: number; // (likes+comments)/max(1,views)
  velocity: number; // views / ageDays
}

export interface ScoredVideo {
  video: RawVideo;
  metrics: VideoMetrics;
  score: number; // 0~1
  rank: number; // 1부터
}

const MS_PER_DAY = 86_400_000;

// 점수화에 쓰이는 지표 키 (가중치 키와 1:1 대응). ageDays 는 점수 대상이 아니다.
const METRIC_KEYS = ["views", "likes", "comments", "engagement", "velocity"] as const;
type MetricKey = (typeof METRIC_KEYS)[number];

/**
 * 한 영상의 원시 지표를 점수화용 파생 지표로 변환한다.
 * - ageDays 는 0 나눗셈 방지를 위해 최소 1.
 * - 비공개(누락)인 likes/comments 는 null 로 둔다(정규화 단계에서 imputation).
 */
export function deriveMetrics(v: RawVideo, now: Date): VideoMetrics {
  const views = v.viewCount ?? 0;
  const likes = v.likeCount ?? null;
  const comments = v.commentCount ?? null;

  const rawAgeDays = (now.getTime() - new Date(v.publishedAt).getTime()) / MS_PER_DAY;
  const ageDays = Math.max(1, rawAgeDays);

  const engagement = ((likes ?? 0) + (comments ?? 0)) / Math.max(1, views);
  const velocity = views / ageDays;

  return { views, likes, comments, ageDays, engagement, velocity };
}

/**
 * 한 지표를 min-max 정규화한다.
 * - null(비공개)은 모집단에서 제외하고 정규값 0.5 로 imputation.
 * - max === min 이면 NaN 방지를 위해 모두 0.5.
 * - 전부 null 이면 present:false (호출부에서 가중치 제거).
 */
function normalizeMetric(values: Array<number | null>): { norm: number[]; present: boolean } {
  const population = values.filter((v): v is number => v !== null);
  if (population.length === 0) {
    return { norm: values.map(() => 0.5), present: false };
  }
  const min = Math.min(...population);
  const max = Math.max(...population);
  const span = max - min;
  const norm = values.map((v) => {
    if (v === null) return 0.5; // imputation
    if (span === 0) return 0.5; // max === min
    return (v - min) / span;
  });
  return { norm, present: true };
}

/**
 * 영상 풀을 정량 지표로 점수화·순위화한다.
 * - 정렬: score 내림차순, 동점이면 views 내림차순. rank 는 1부터.
 * - now 는 테스트 고정을 위해 주입받는다.
 */
export function scoreVideos(
  videos: RawVideo[],
  weights: Weights = DEFAULT_WEIGHTS,
  now: Date = new Date(),
): ScoredVideo[] {
  const metrics = videos.map((v) => deriveMetrics(v, now));

  const normalized = {} as Record<MetricKey, { norm: number[]; present: boolean }>;
  for (const key of METRIC_KEYS) {
    normalized[key] = normalizeMetric(metrics.map((m) => m[key]));
  }

  // 전부 부재한 지표는 가중치 0, 나머지를 비례 재정규화(합=1 유지).
  const totalPresentWeight = METRIC_KEYS.reduce(
    (sum, key) => sum + (normalized[key].present ? weights[key] : 0),
    0,
  );
  const effectiveWeight = {} as Record<MetricKey, number>;
  for (const key of METRIC_KEYS) {
    effectiveWeight[key] =
      normalized[key].present && totalPresentWeight > 0 ? weights[key] / totalPresentWeight : 0;
  }

  const scored: ScoredVideo[] = videos.map((video, i) => {
    const score = METRIC_KEYS.reduce(
      (sum, key) => sum + effectiveWeight[key] * normalized[key].norm[i],
      0,
    );
    return { video, metrics: metrics[i], score, rank: 0 };
  });

  scored.sort((a, b) => b.score - a.score || b.metrics.views - a.metrics.views);
  scored.forEach((s, i) => {
    s.rank = i + 1;
  });

  return scored;
}
