# Step 3: recommend

## 읽어야 할 파일

먼저 아래 파일들을 읽고 설계 의도를 파악하라:

- `/CLAUDE.md`
- `/docs/ARCHITECTURE.md`
- `/docs/ADR.md` (ADR-005: LLM 미사용)
- `/src/types/youtube.ts`, `/src/lib/score.ts` (step 1, 2)

## 작업

정량 + 텍스트 빈도 기반 "다음 콘텐츠 추천" 순수 함수를 만든다(LLM/네트워크 없음). **TDD: 테스트 먼저.**

`src/lib/recommend.ts`:

```ts
import type { ScoredVideo, VideoMetrics } from '@/lib/score';

export interface Recommendation {
  pattern: string;        // 예: "'꿀팁·루틴' 포맷이 상위에 많음"
  evidence: string;       // 예: "상위 5개 중 4개 제목에 등장"
  suggestedTopic: string; // 예: "주말 루틴 꿀팁"
}

export function recommendNext(
  top: ScoredVideo[],
  seed: VideoMetrics | null,
  opts?: { topN?: number },
): Recommendation[];
```

로직:

- 상위 `topN`(기본 5)개 영상의 제목 + 태그를 토큰화(공백/구두점 split, 소문자화).
- 짧은 stopword 리스트(한/영 기본 조사·관사 등)를 제거.
- 1~2gram 빈도를 집계해 상위 키워드/구문을 뽑는다.
- 빈도 상위 항목으로 `Recommendation` 2~3개를 구성한다. `evidence`에는 "상위 N개 중 M개"와, seed가 있으면 지표 비교(참여율/velocity 격차)를 담는다.
- 입력이 비면 빈 배열을 반환한다.

`src/lib/recommend.test.ts` — 빈도 집계, topN 경계, 빈 입력, seed 유무를 **먼저** 테스트.

## Acceptance Criteria

```bash
npm run test
```

## 검증 절차

1. AC 커맨드를 실행한다.
2. 아키텍처 체크: `src/lib/` 순수 함수인가? 무거운 NLP 의존성을 추가하지 않았는가?
3. `phases/0-mvp/index.json`의 step 3을 업데이트한다.

## 금지사항

- 형태소 분석기 등 무거운 NLP 의존성을 추가하지 마라. 이유: MVP 단순성. 공백/구두점 split + stopword로 충분.
- 네트워크/LLM 호출 금지.
- 기존 테스트를 깨뜨리지 마라.
