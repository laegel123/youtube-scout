# 아키텍처

## 디렉토리 구조
```
src/
├── app/               # 페이지 + API 라우트
│   ├── page.tsx           # 입력 폼 + 결과 (Server 셸)
│   ├── layout.tsx
│   ├── globals.css
│   └── api/analyze/route.ts   # 유일한 API 진입점 (POST), 서버 전용
├── components/        # UI 컴포넌트 (AnalyzeForm, RankingTable, VideoCard, Recommendations)
├── types/             # TypeScript 타입 정의 (youtube.ts)
├── lib/               # 순수 유틸 (parseVideoId, score, recommend) — 네트워크 의존 없음
└── services/          # 외부 API 래퍼 (youtube.ts, server-only)
```

## 패턴
- Server Components 기본. 사용자 입력 인터랙션이 필요한 `AnalyzeForm`만 Client Component(`'use client'`).
- 외부 API 호출은 `services/`에 격리하고 `import 'server-only'`로 클라이언트 번들 유입을 차단한다.
- 점수·추천 같은 비즈니스 로직은 `lib/`의 순수 함수로 분리해 단위 테스트(TDD) 가능하게 한다.
- API 키는 서버 환경변수(`YOUTUBE_API_KEY`)로만 읽고, route 핸들러/서비스 레이어에서만 접근한다.

## 데이터 흐름
```
사용자 입력
  → AnalyzeForm (Client)            : fetch('/api/analyze', { input })
  → app/api/analyze/route.ts (Server): 입력 검증
  → services/youtube.ts             : videos.list(시드) → search.list(키워드) → videos.list(후보 batch)
  → lib/score.ts                    : 지표 정규화 + 가중합 → 순위
  → lib/recommend.ts                : 상위 영상 패턴 → 다음 콘텐츠 추천
  → route.ts                        : JSON 응답
  → UI 업데이트                      : RankingTable + Recommendations
```

## 상태 관리
- 클라이언트 상태는 `AnalyzeForm` 내부 `useState`로만 관리한다 (입력값, 로딩, 결과, 에러).
- 서버 상태/외부 데이터는 저장하지 않는다(무상태). 매 요청마다 YouTube에서 새로 조회한다.
