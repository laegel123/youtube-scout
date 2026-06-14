"use client";

import { useState, type FormEvent } from "react";
import type { ScoredVideo } from "@/lib/score";
import type { Recommendation } from "@/lib/recommend";
import { VideoCard } from "@/components/VideoCard";
import { RankingTable } from "@/components/RankingTable";
import { Recommendations } from "@/components/Recommendations";

// /api/analyze 의 성공 응답 형태 (route.ts AnalyzeResponse 와 동일 구조).
export interface AnalyzeResponse {
  seed: ScoredVideo | null;
  ranked: ScoredVideo[];
  recommendations: Recommendation[];
}

// 입력창을 자동으로 채워주는 예시 칩.
const EXAMPLES = [
  { label: "영상 URL", value: "https://youtu.be/dQw4w9WgXcQ" },
  { label: "백종원 레시피", value: "백종원 레시피" },
  { label: "홈카페 브이로그", value: "홈카페 브이로그" },
];

export function AnalyzeForm() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = input.trim();
    if (trimmed === "" || loading) return;

    setLoading(true);
    setError(null);
    try {
      // CLAUDE.md CRITICAL: YouTube API 를 직접 호출하지 않고 서버 라우트만 호출한다.
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: trimmed }),
      });
      const data = (await res.json()) as AnalyzeResponse | { error?: string };
      if (!res.ok) {
        const message =
          "error" in data && data.error ? data.error : "분석에 실패했습니다.";
        setError(message);
        setResult(null);
        return;
      }
      setResult(data as AnalyzeResponse);
    } catch {
      setError("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="유튜브 영상 URL/ID 또는 주제 (예: 백종원 레시피)"
          aria-label="분석할 영상 또는 주제"
          className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <button
          type="submit"
          disabled={loading || input.trim() === ""}
          className="rounded-lg bg-indigo-600 px-5 py-3 font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "분석 중…" : "분석하기"}
        </button>
      </form>

      <div className="mt-3 flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex.value}
            type="button"
            onClick={() => setInput(ex.value)}
            className="rounded-full border border-gray-300 px-3 py-1 text-sm text-gray-600 transition hover:border-indigo-400 hover:text-indigo-600"
          >
            {ex.label}
          </button>
        ))}
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {loading && (
        <p className="mt-6 text-sm text-gray-500">비슷한 영상을 찾아 비교하는 중입니다…</p>
      )}

      {/* 결과 상태는 이 컴포넌트가 소유하므로 결과 영역도 여기서 조립한다.
          순서: 내 영상 카드 → 순위표 → 다음 콘텐츠 추천 (PRD 디자인). */}
      {result && result.ranked.length > 0 && (
        <section className="mt-8 space-y-8">
          {result.seed && (
            <VideoCard seed={result.seed} total={result.ranked.length} />
          )}

          <div>
            <h2 className="mb-3 text-lg font-semibold text-gray-900">비슷한 영상 순위</h2>
            <RankingTable
              ranked={result.ranked}
              seedId={result.seed?.video.id ?? null}
            />
          </div>

          {result.recommendations.length > 0 && (
            <div>
              <h2 className="mb-3 text-lg font-semibold text-gray-900">
                다음에 만들면 좋을 콘텐츠
              </h2>
              <Recommendations items={result.recommendations} />
            </div>
          )}
        </section>
      )}

      {result && result.ranked.length === 0 && !loading && (
        <p className="mt-6 rounded-lg border border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-500">
          비슷한 영상을 찾지 못했어요. 다른 영상이나 주제로 다시 시도해 보세요.
        </p>
      )}
    </div>
  );
}
