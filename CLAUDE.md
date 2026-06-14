# 프로젝트: TubeScout

크리에이터가 시드 영상(또는 주제)을 입력하면, 비슷한 영상들을 YouTube에서 찾아
정량 지표로 비교·순위화하고, "다음에 만들면 좋을 콘텐츠"를 추천하는 웹 앱.

## 기술 스택
- Next.js 15 (App Router)
- TypeScript (strict mode)
- Tailwind CSS
- Vitest (단위 테스트)
- 데이터 소스: YouTube Data API v3 (정량 지표만 사용)

## 아키텍처 규칙
- CRITICAL: 모든 외부 API 로직은 `src/app/api/` 라우트 핸들러에서만 처리한다.
- CRITICAL: 클라이언트 컴포넌트에서 직접 외부 API를 호출하지 말 것. YouTube API 키는 서버 전용이며 절대 클라이언트 번들에 노출하지 않는다 (`NEXT_PUBLIC_` 접두사 금지).
- 컴포넌트는 `src/components/`, 타입은 `src/types/`, 유틸/순수 로직은 `src/lib/`, 외부 API 래퍼는 `src/services/`에 분리한다.
- Server Components를 기본으로 하고, 사용자 인터랙션이 필요한 곳만 Client Component(`'use client'`)로 만든다.

## 개발 프로세스
- CRITICAL: 새 기능 구현 시 반드시 테스트를 먼저 작성하고, 테스트가 통과하는 구현을 작성할 것 (TDD). 특히 `src/lib/`의 순수 함수가 대상이다.
- 커밋 메시지는 conventional commits 형식을 따를 것 (feat:, fix:, docs:, refactor:)

## 명령어
npm run dev      # 개발 서버
npm run build    # 프로덕션 빌드
npm run lint     # ESLint
npm run test     # 테스트 (vitest run — watch 모드 금지)
