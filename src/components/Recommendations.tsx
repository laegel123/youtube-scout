import type { Recommendation } from "@/lib/recommend";

// 다음 콘텐츠 추천 카드 묶음. pattern / evidence / suggestedTopic 를 보여준다.
export function Recommendations({ items }: { items: Recommendation[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((rec, i) => (
        <article
          key={`${rec.suggestedTopic}-${i}`}
          className="flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">
            추천 {i + 1}
          </p>
          <h3 className="mt-1 font-semibold text-gray-900">{rec.suggestedTopic}</h3>
          <p className="mt-2 text-sm text-gray-600">{rec.pattern}</p>
          <p className="mt-auto pt-3 text-xs text-gray-400">{rec.evidence}</p>
        </article>
      ))}
    </div>
  );
}
