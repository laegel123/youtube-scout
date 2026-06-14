# Step 2: score

## 읽어야 할 파일

먼저 아래 파일들을 읽고 설계 의도를 파악하라:

- `/CLAUDE.md`
- `/docs/ARCHITECTURE.md`
- `/docs/ADR.md` (ADR-005: 정량 지표 점수화)
- `/src/types/youtube.ts` (step 1)

## 작업

정량 지표 점수화 순수 함수를 만든다. **TDD: 테스트 먼저.** 네트워크 호출 절대 금지.

`src/lib/score.ts`:

```ts
import type { RawVideo } from '@/types/youtube';

export const DEFAULT_WEIGHTS = {
  views: 0.20, likes: 0.20, comments: 0.15, engagement: 0.25, velocity: 0.20,
} as const;
export type Weights = typeof DEFAULT_WEIGHTS;

export interface VideoMetrics {
  views: number;
  likes: number | null;      // 비공개면 null
  comments: number | null;
  ageDays: number;           // 최소 1
  engagement: number;        // (likes+comments)/max(1,views)
  velocity: number;          // views / ageDays
}

export interface ScoredVideo {
  video: RawVideo;
  metrics: VideoMetrics;
  score: number;             // 0~1
  rank: number;              // 1부터
}

export function deriveMetrics(v: RawVideo, now: Date): VideoMetrics;
export function scoreVideos(videos: RawVideo[], weights?: Weights, now?: Date): ScoredVideo[];
```

핵심 규칙(반드시 지킬 것):

- `ageDays = max(1, (now - publishedAt) / 하루)`. 이유: 0으로 나누기 방지.
- `engagement = ((likes ?? 0) + (comments ?? 0)) / max(1, views)`.
- `velocity = views / ageDays`.
- 정규화는 지표별 min-max: `(x - min) / (max - min)`. `max === min`이면 0.5를 반환하라. 이유: 전부 같은 값일 때 NaN 방지.
- `likes`/`comments`가 null인 영상은 해당 지표의 min/max 계산 모집단에서 제외하고, 그 영상의 정규값은 0.5로 imputation 하라. 이유: 비공개를 0점 처리하면 부당하게 하위로 밀린다.
- 어떤 지표가 풀 전체에서 전부 null/부재면 그 가중치를 0으로 두고 나머지 가중치를 비례 재정규화(합=1 유지)하라. 이유: NaN/편향 방지.
- 최종 정렬: score 내림차순, 동점이면 views 내림차순으로 tie-break, 그 순서대로 rank를 1부터 부여.

`src/lib/score.test.ts` — min-max 경계(`max==min`→0.5), null imputation, velocity 계산, "전부 null 지표" 가중치 재정규화, tie-break, rank 순서를 **먼저** 테스트.

## Acceptance Criteria

```bash
npm run test
```

## 검증 절차

1. AC 커맨드를 실행한다.
2. 아키텍처 체크: `src/lib/`의 순수 함수인가? 네트워크 호출이 없는가?
3. `phases/0-mvp/index.json`의 step 2를 업데이트한다.

## 금지사항

- 네트워크/외부 모듈 호출 금지. 이유: 순수 함수를 유지해야 테스트 가능.
- `now`를 함수 내부에서 `new Date()`로 굳히지 마라. 인자로 주입받아 테스트 가능하게 하라. 이유: 시간 의존 테스트 고정.
- 기존 테스트를 깨뜨리지 마라.
