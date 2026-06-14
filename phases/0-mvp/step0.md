# Step 0: project-setup

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md`
- `/docs/ARCHITECTURE.md`
- `/docs/ADR.md`
- `/docs/PRD.md`

## 작업

Next.js 15 (App Router) + TypeScript(strict) + Tailwind CSS + Vitest 프로젝트 스캐폴드를 구성한다.

- 이 디렉토리에는 이미 `CLAUDE.md`, `docs/`, `scripts/`, `phases/`, `.gitignore`, `.env.local`이 존재한다. **`create-next-app`을 이 디렉토리에서 그대로 실행하지 마라. 이유: 비어있지 않은 디렉토리에서 실패한다.** `package.json`과 설정 파일을 직접 생성한 뒤 `npm install`로 의존성을 설치하라.
- `package.json`의 scripts:
  - `"dev": "next dev"`
  - `"build": "next build"`
  - `"start": "next start"`
  - `"lint": "next lint"`
  - `"test": "vitest run --passWithNoTests"`  (이유: 테스트가 아직 없는 step에서도 `npm run test`가 통과해야 한다)
- 디렉토리 구조는 ARCHITECTURE.md를 따른다: `src/app/`, `src/components/`, `src/lib/`, `src/services/`, `src/types/`.
- `tsconfig.json`: `"strict": true`, 경로 별칭 `"@/*": ["./src/*"]` 설정.
- 생성할 파일:
  - `src/app/layout.tsx` (루트 레이아웃, `globals.css` import)
  - `src/app/globals.css` (Tailwind 지시문)
  - `src/app/page.tsx` (임시 플레이스홀더 — "TubeScout" 제목만)
  - `vitest.config.ts` (node 환경, `@/` 별칭 인식, `src/**/*.test.ts(x)` 인식)
  - Tailwind / PostCSS 설정, `next.config.js`, ESLint 설정(eslint-config-next)

## Acceptance Criteria

```bash
npm install
npm run lint
npm run build
npm run test
```

## 검증 절차

1. 위 AC 커맨드를 모두 실행해 exit 0을 확인한다.
2. 아키텍처 체크리스트:
   - `src/` 구조가 ARCHITECTURE.md와 일치하는가?
   - TypeScript strict가 켜져 있는가?
   - test 스크립트가 watch가 아닌 `vitest run`인가?
3. 결과에 따라 `phases/0-mvp/index.json`의 step 0을 업데이트한다 (completed/summary, error/error_message, blocked/blocked_reason).

## 금지사항

- `create-next-app`을 비어있지 않은 이 디렉토리에서 실행하지 마라. 이유: 기존 파일과 충돌해 실패한다.
- test 스크립트를 watch 모드(`vitest`)로 두지 마라. 이유: Stop 훅(`npm run test`)이 끝나지 않는다.
- `.env.local`을 덮어쓰지 마라. 이유: 사용자의 API 키가 들어 있다.
- 기존 테스트를 깨뜨리지 마라.
