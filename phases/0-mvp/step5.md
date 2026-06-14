# Step 5: api-route

## 읽어야 할 파일

먼저 아래 파일들을 읽고 설계 의도를 파악하라:

- `/CLAUDE.md` (CRITICAL: 모든 외부 API 로직은 `src/app/api/`에서만)
- `/docs/ARCHITECTURE.md` (데이터 흐름)
- `/src/lib/parseVideoId.ts`, `/src/lib/score.ts`, `/src/lib/recommend.ts`, `/src/services/youtube.ts`, `/src/types/youtube.ts` (step 1~4)

## 작업

분석 엔드포인트를 만든다. `src/app/api/analyze/route.ts` — `export async function POST(req: Request)`.

흐름:

1. body에서 `{ input: string }`를 파싱·검증한다. 없거나 빈 값이면 400.
2. `parseInput(input)`:
   - `video` → `fetchVideoById(videoId)`. 시드 영상의 제목 + 상위 태그 몇 개로 검색 키워드를 만든다.
   - `query` → 그 텍스트를 검색어로 사용.
3. `searchVideoIds(query, 25)` → 후보 ID. 시드 영상이 있으면 그 ID도 목록에 포함한다.
4. `fetchVideosByIds(ids)` (batch) → `RawVideo[]`.
5. `scoreVideos(videos)` → 순위. 시드 영상의 rank를 찾아 함께 반환한다.
6. `recommendNext(top, seedMetrics)`.
7. JSON 응답:

```ts
interface AnalyzeResponse {
  seed: ScoredVideo | null;
  ranked: ScoredVideo[];
  recommendations: Recommendation[];
}
```

규칙(반드시):

- 모든 외부 호출은 이 라우트(서버)에서만 일어난다. 키 누락 시 `getApiKey()`가 throw → **500 + `{ error: 'YOUTUBE_API_KEY missing' }`** 로 친절히 응답.
- 검색 결과 0건이면 200 + 빈 `ranked` + 빈 `recommendations`로 응답.

(서비스 로직 테스트는 step 4의 mock으로 커버한다. 라우트 단위 테스트는 선택. AC는 build.)

## Acceptance Criteria

```bash
npm run build
```

## 검증 절차

1. AC 커맨드를 실행한다(키 없이도 build 성공해야 함).
2. 아키텍처 체크: 외부 호출이 이 라우트 밖(컴포넌트 등)으로 새지 않는가? 키를 응답/로그에 노출하지 않는가?
3. `phases/0-mvp/index.json`의 step 5를 업데이트한다.

## 금지사항

- 클라이언트 컴포넌트에서 호출할 외부 API 로직을 라우트 밖으로 빼지 마라. 이유: CRITICAL 규칙 위반.
- 키를 응답 본문이나 로그에 출력하지 마라. 이유: 키 유출.
- build가 API 키에 의존하게 만들지 마라(키 없이 build 성공해야 함).
- 기존 테스트를 깨뜨리지 마라.
