import type { ScoredVideo } from "@/lib/score";
import { formatPercent } from "@/lib/format";

// 시드(내) 영상 요약 카드: 제목 · 종합점수 · "전체 N위/M".
// 클라이언트 상태가 아닌 props 만 받는 순수 프레젠테이션 컴포넌트.
export function VideoCard({ seed, total }: { seed: ScoredVideo; total: number }) {
  return (
    <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">내 영상</p>
      <h2 className="mt-1 text-lg font-semibold text-gray-900">{seed.video.title}</h2>
      <p className="mt-0.5 text-sm text-gray-500">{seed.video.channelTitle}</p>

      <div className="mt-4 flex items-baseline gap-8">
        <div>
          <p className="text-sm text-gray-500">종합점수</p>
          <p className="text-2xl font-bold tabular-nums text-gray-900">
            {formatPercent(seed.score)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">순위</p>
          <p className="text-2xl font-bold tabular-nums text-indigo-600">
            전체 {seed.rank}위
            <span className="ml-1 text-base font-normal text-gray-400">/ {total}</span>
          </p>
        </div>
      </div>
    </article>
  );
}
