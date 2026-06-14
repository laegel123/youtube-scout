# Step 6: ui

## 읽어야 할 파일

먼저 아래 파일들을 읽고 설계 의도를 파악하라:

- `/docs/PRD.md` (UX/디자인)
- `/docs/ARCHITECTURE.md` (패턴/상태 관리)
- `/CLAUDE.md` (CRITICAL: 클라이언트에서 외부 API 직접 호출 금지)
- `/src/app/api/analyze/route.ts`, `/src/types/youtube.ts`, `/src/lib/score.ts`, `/src/lib/recommend.ts` (step 2, 3, 5)

## 작업

결과 화면 UI를 만든다. Tailwind를 사용한다.

- `src/components/AnalyzeForm.tsx` (`'use client'`): 입력창 1개 + 예시 칩(누르면 입력 자동 채움) + [분석하기] 버튼. 제출 시 `fetch('/api/analyze', { method: 'POST', body: JSON.stringify({ input }) })`. 로딩/에러 상태는 `useState`로 관리. **외부 YouTube API를 직접 호출하지 마라 — 반드시 `/api/analyze`만 호출.**
- `src/components/VideoCard.tsx`: 시드 영상 요약 카드(제목, 종합점수, "전체 N위/M").
- `src/components/RankingTable.tsx`: `ranked` 목록 표. 열 = #, 제목, 조회수, 참여율, 속도, 종합점수(막대). **시드 영상 행은 하이라이트.** 비공개 지표는 "비공개"로 표시.
- `src/components/Recommendations.tsx`: `Recommendation` 카드 2~3개(pattern / evidence / suggestedTopic).
- `src/app/page.tsx`: 위 컴포넌트를 조립. 결과가 없으면 폼만, 있으면 VideoCard → RankingTable → Recommendations 순으로 표시.

숫자 포맷(예: 12K) · 퍼센트 포맷 헬퍼는 `src/lib/`에 작은 순수 함수로 두고 테스트해도 좋다(선택).

## Acceptance Criteria

```bash
npm run lint
npm run build
npm run test
```

## 검증 절차

1. AC 커맨드를 모두 실행한다(키 없이도 build 성공해야 함).
2. (수동, 선택) `.env.local`에 키가 있으면 `npm run dev` 후 영상 URL을 입력해 순위표·추천이 뜨는지 확인.
3. 아키텍처 체크: 컴포넌트는 `src/components/`에 있는가? `AnalyzeForm`만 Client Component인가? 클라이언트에서 외부 API/키에 접근하지 않는가?
4. `phases/0-mvp/index.json`의 step 6을 업데이트한다.

## 금지사항

- 클라이언트 컴포넌트에서 YouTube API/키에 접근하지 마라. 이유: 키 노출 + CRITICAL 규칙 위반.
- build가 API 키에 의존하게 만들지 마라. 이유: 키 없이 build가 성공해야 한다.
- 기존 테스트를 깨뜨리지 마라.
