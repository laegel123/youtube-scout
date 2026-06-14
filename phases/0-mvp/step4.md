# Step 4: youtube-service

## 읽어야 할 파일

먼저 아래 파일들을 읽고 설계 의도를 파악하라:

- `/CLAUDE.md` (CRITICAL: 키는 서버 전용)
- `/docs/ARCHITECTURE.md`
- `/docs/ADR.md` (ADR-003 키워드 검색, ADR-004 batch 통계 조회)
- `/src/types/youtube.ts`

## 작업

YouTube Data API v3 래퍼를 만든다. **파일 첫 줄에 `import 'server-only';`** 를 둔다. 이유: 클라이언트 번들 유입 차단, 키 보호.

`src/services/youtube.ts`:

```ts
import 'server-only';
import type { RawVideo } from '@/types/youtube';

export function getApiKey(): string;                                   // process.env.YOUTUBE_API_KEY, 없으면 throw new Error('YOUTUBE_API_KEY missing')
export async function fetchVideoById(videoId: string): Promise<RawVideo | null>;
export async function searchVideoIds(query: string, max?: number): Promise<string[]>;  // search.list, max 기본 25
export async function fetchVideosByIds(ids: string[]): Promise<RawVideo[]>;             // videos.list batch
```

규칙(반드시 지킬 것):

- `relatedToVideoId`를 절대 쓰지 마라. 이유: 2023년 제거되어 응답하지 않는다. 유사 영상은 `searchVideoIds(query)`로만 찾는다.
- `searchVideoIds`: `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=<query>&maxResults=<max>&key=<key>` — 결과에서 videoId만 수집.
- `fetchVideosByIds`: `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=<콤마로 최대 50개>&key=<key>` — **한 번의 호출로 batch**. 영상별 개별 호출 금지(이유: quota 50배 낭비). 50개 초과면 50개씩 청크.
- 통계 파싱: `viewCount/likeCount/commentCount`는 문자열이거나 누락된다. `Number(x)`로 변환하되 **누락이면 `undefined`로 유지**(0으로 채우지 마라). `tags`는 없으면 `[]`.
- 네트워크 실패/404는 `fetchVideoById`에서 `null` 반환. 그 외는 빈 배열 반환 또는 명확한 throw.

테스트: `global.fetch`를 mock 해 happy-path 1개(검색 → batch 파싱)만 검증한다. 실제 네트워크 호출 금지.

## Acceptance Criteria

```bash
npm run build
npm run test
```

## 검증 절차

1. AC 커맨드를 실행한다.
2. 아키텍처 체크: `src/services/`에 있고 `import 'server-only'`가 있는가? `relatedToVideoId`를 안 쓰는가? 후보 통계를 batch로 조회하는가?
3. `phases/0-mvp/index.json`의 step 4를 업데이트한다.

## 금지사항

- `relatedToVideoId` 사용 금지. 이유: 응답이 오지 않아 빈 결과가 된다.
- API 키를 클라이언트로 노출 금지(`NEXT_PUBLIC_` 금지, `server-only` 유지).
- 후보 통계를 영상마다 개별 호출 금지. 이유: quota 낭비.
- 기존 테스트를 깨뜨리지 마라.
