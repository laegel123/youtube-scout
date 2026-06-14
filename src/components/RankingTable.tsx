import type { ScoredVideo } from "@/lib/score";
import { formatCount, formatPercent } from "@/lib/format";

// 비공개(누락) 지표는 "비공개"로 표시한다.
// - 조회수/속도: viewCount 가 없으면 의미가 없으므로 비공개.
// - 참여율: 좋아요·댓글이 모두 비공개면 계산이 무의미하므로 비공개.
function viewsCell(v: ScoredVideo): string {
  return v.video.viewCount === undefined ? "비공개" : formatCount(v.video.viewCount);
}
function engagementCell(v: ScoredVideo): string {
  const { likeCount, commentCount } = v.video;
  if (likeCount === undefined && commentCount === undefined) return "비공개";
  return formatPercent(v.metrics.engagement);
}
function velocityCell(v: ScoredVideo): string {
  return v.video.viewCount === undefined ? "비공개" : `${formatCount(v.metrics.velocity)}/일`;
}

// ranked 순위표. 시드 영상 행은 하이라이트한다.
export function RankingTable({
  ranked,
  seedId,
}: {
  ranked: ScoredVideo[];
  seedId: string | null;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
            <th className="px-3 py-2 font-medium">#</th>
            <th className="px-3 py-2 font-medium">제목</th>
            <th className="px-3 py-2 text-right font-medium">조회수</th>
            <th className="px-3 py-2 text-right font-medium">참여율</th>
            <th className="px-3 py-2 text-right font-medium">속도</th>
            <th className="px-3 py-2 font-medium">종합점수</th>
          </tr>
        </thead>
        <tbody>
          {ranked.map((v) => {
            const isSeed = seedId !== null && v.video.id === seedId;
            return (
              <tr
                key={v.video.id}
                className={`border-b border-gray-100 last:border-0 ${
                  isSeed ? "bg-indigo-50" : ""
                }`}
              >
                <td className="px-3 py-2 font-semibold text-gray-500">{v.rank}</td>
                <td className="max-w-[22rem] px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium text-gray-900">{v.video.title}</span>
                    {isSeed && (
                      <span className="shrink-0 rounded bg-indigo-600 px-1.5 py-0.5 text-xs font-medium text-white">
                        내 영상
                      </span>
                    )}
                  </div>
                  <span className="block truncate text-xs text-gray-400">
                    {v.video.channelTitle}
                  </span>
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-gray-700">{viewsCell(v)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-gray-700">
                  {engagementCell(v)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-gray-700">
                  {velocityCell(v)}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-indigo-600"
                        style={{ width: `${Math.round(v.score * 100)}%` }}
                      />
                    </div>
                    <span className="tabular-nums text-xs text-gray-500">
                      {formatPercent(v.score)}
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
