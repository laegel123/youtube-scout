# Step 1: core-types

## 읽어야 할 파일

먼저 아래 파일들을 읽고 설계 의도를 파악하라:

- `/CLAUDE.md`
- `/docs/ARCHITECTURE.md`
- `/docs/ADR.md`
- `/package.json`, `/vitest.config.ts`, `/tsconfig.json` (step 0 산출물)

## 작업

도메인 타입과 사용자 입력 파서를 만든다. **TDD: 테스트를 먼저 작성한 뒤 통과하는 구현을 작성하라.**

1. `src/types/youtube.ts` — 타입 정의:

```ts
// YouTube에서 정규화해 들고 다닐 영상 도메인 타입
export interface RawVideo {
  id: string;
  title: string;
  channelTitle: string;
  publishedAt: string;   // ISO 8601
  tags: string[];        // 없으면 빈 배열
  viewCount?: number;    // 비공개/누락 시 undefined
  likeCount?: number;
  commentCount?: number;
}

// 사용자 입력 파싱 결과
export type ParsedInput =
  | { type: 'video'; videoId: string }
  | { type: 'query'; query: string };
```

2. `src/lib/parseVideoId.ts` — `export function parseInput(raw: string): ParsedInput`
   - `youtu.be/<id>`, `youtube.com/watch?v=<id>`, `youtube.com/shorts/<id>`, `youtube.com/embed/<id>` → `{ type: 'video', videoId }`
   - 11자 영상 ID 단독 입력 → `{ type: 'video', videoId }`
   - 그 외 텍스트 → `{ type: 'query', query }` (trim 적용)
   - 빈 문자열/공백만 → `throw new Error('input is empty')`

3. `src/lib/parseVideoId.test.ts` — 위 각 케이스를 **먼저** 테스트로 작성.

## Acceptance Criteria

```bash
npm run build
npm run test
```

## 검증 절차

1. AC 커맨드를 실행한다.
2. 아키텍처 체크: 타입은 `src/types/`, 순수 유틸은 `src/lib/`에 있는가? 네트워크 호출이 없는가?
3. `phases/0-mvp/index.json`의 step 1을 업데이트한다.

## 금지사항

- 네트워크/외부 API 호출을 넣지 마라. 이유: 이 레이어는 순수 함수여야 테스트가 가능하다.
- 구현을 먼저 쓰고 테스트를 나중에 쓰지 마라. 이유: TDD 위반.
- 기존 테스트를 깨뜨리지 마라.
