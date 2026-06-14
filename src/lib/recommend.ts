import type { ScoredVideo, VideoMetrics } from "@/lib/score";

// ADR-005: LLM/네트워크 없이 정량 지표 + 텍스트 빈도만으로 "다음 콘텐츠"를 추천한다.
// MVP 제외 사항: 형태소 분석기 미사용. 공백/구두점 토큰화 + stopword 로 충분.

export interface Recommendation {
  pattern: string; // 예: "'주말 루틴' 포맷이 상위 영상에 반복 등장"
  evidence: string; // 예: "상위 5개 중 4개 제목·태그에 등장"
  suggestedTopic: string; // 예: "주말 루틴 꿀팁"
}

// 한/영 기본 stopword (조사·관사·대명사 등). 공백 토큰화에 걸리는 독립형 위주.
const STOPWORDS = new Set([
  // 영어
  "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "with",
  "is", "are", "be", "this", "that", "my", "your", "you", "i", "it", "at",
  "by", "how", "best", "top",
  // 한국어
  "그리고", "그", "저", "것", "수", "등", "및", "더", "내", "나의",
  "이", "가", "은", "는", "을", "를", "에", "의", "도", "와", "과",
]);

const DEFAULT_TOP_N = 5;
const MAX_RECOMMENDATIONS = 3;

// 공백/구두점/기호 기준 분리(유니코드 letter·number 만 남김) 후 소문자화.
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length > 0 && !STOPWORDS.has(t));
}

// 한 영상의 텍스트(제목 + 각 태그)에서 1~2gram 집합을 만든다.
// Set 으로 모아 같은 영상 내 중복은 1회로 센다(= document frequency 용).
function gramsForVideo(v: ScoredVideo): Set<string> {
  const sequences = [tokenize(v.video.title), ...v.video.tags.map(tokenize)];
  const grams = new Set<string>();
  for (const seq of sequences) {
    for (let i = 0; i < seq.length; i++) {
      grams.add(seq[i]); // 1-gram
      if (i + 1 < seq.length) grams.add(`${seq[i]} ${seq[i + 1]}`); // 2-gram
    }
  }
  return grams;
}

interface GramStat {
  gram: string;
  words: string[];
  freq: number; // 몇 개 영상(document)에 등장했는가
}

// 등장 영상 수 기준으로 gram 후보를 집계·정렬한다.
function rankGrams(considered: ScoredVideo[]): GramStat[] {
  const docFreq = new Map<string, number>();
  for (const v of considered) {
    for (const gram of gramsForVideo(v)) {
      docFreq.set(gram, (docFreq.get(gram) ?? 0) + 1);
    }
  }

  // 1개 영상만 보면 freq>=1, 2개 이상이면 "패턴"이라 부르려면 최소 2개에 등장해야 한다.
  const minDocFreq = Math.min(2, considered.length);

  return [...docFreq.entries()]
    .filter(([, freq]) => freq >= minDocFreq)
    .map(([gram, freq]) => ({ gram, words: gram.split(" "), freq }))
    .sort(
      (a, b) =>
        b.freq - a.freq || // 더 자주 등장
        b.words.length - a.words.length || // 구문(2-gram) 우선
        b.gram.length - a.gram.length || // 더 긴 키워드 우선
        (a.gram < b.gram ? -1 : a.gram > b.gram ? 1 : 0), // 결정적 정렬
    );
}

// 토큰이 겹치지 않게 상위에서 골라 서로 다른 주제의 추천을 만든다.
function selectDiverse(ranked: GramStat[]): GramStat[] {
  const selected: GramStat[] = [];
  const used = new Set<string>();
  for (const stat of ranked) {
    if (stat.words.some((w) => used.has(w))) continue;
    selected.push(stat);
    stat.words.forEach((w) => used.add(w));
    if (selected.length >= MAX_RECOMMENDATIONS) break;
  }
  return selected;
}

const avg = (nums: number[]): number =>
  nums.length === 0 ? 0 : nums.reduce((s, n) => s + n, 0) / nums.length;

const ratioText = (topAvg: number, seedVal: number): string =>
  seedVal > 0 ? `${(topAvg / seedVal).toFixed(1)}배` : "내 영상에 없는 강점";

// seed 가 있으면 상위 평균 지표가 내 영상 대비 얼마나 앞서는지 문장으로 만든다.
function seedComparison(seed: VideoMetrics, considered: ScoredVideo[]): string {
  const topEng = avg(considered.map((c) => c.metrics.engagement));
  const topVel = avg(considered.map((c) => c.metrics.velocity));
  return ` · 상위 평균 참여율 ${ratioText(topEng, seed.engagement)}, 조회속도 ${ratioText(topVel, seed.velocity)}`;
}

// gram 을 다른 상위 키워드와 합쳐 1~3 단어짜리 "다음 콘텐츠" 주제 문구로 만든다.
function buildTopic(gram: string, selectedGrams: string[]): string {
  const words: string[] = [];
  const add = (w: string) => {
    if (!words.includes(w)) words.push(w);
  };
  for (const w of gram.split(" ")) add(w);
  for (const other of selectedGrams) {
    if (other === gram) continue;
    for (const w of other.split(" ")) add(w);
    if (words.length >= 3) break;
  }
  return words.slice(0, 3).join(" ");
}

/**
 * 상위 영상들의 제목/태그 빈도 패턴과 (있다면) seed 대비 지표 격차로 "다음 콘텐츠"를 추천한다.
 * - 순수 함수: 네트워크/LLM 없음.
 * - 입력이 비거나 반복 패턴이 없으면 빈 배열.
 */
export function recommendNext(
  top: ScoredVideo[],
  seed: VideoMetrics | null,
  opts?: { topN?: number },
): Recommendation[] {
  if (top.length === 0) return [];

  const topN = opts?.topN ?? DEFAULT_TOP_N;
  const considered = top.slice(0, topN);
  const consideredN = considered.length;

  const selected = selectDiverse(rankGrams(considered));
  if (selected.length === 0) return [];

  const selectedGrams = selected.map((s) => s.gram);
  const comparison = seed ? seedComparison(seed, considered) : "";

  return selected.map(({ gram, words, freq }) => {
    const isPhrase = words.length >= 2;
    return {
      pattern: isPhrase
        ? `'${gram}' 포맷이 상위 영상에 반복 등장`
        : `'${gram}' 키워드가 상위 영상에 자주 등장`,
      evidence: `상위 ${consideredN}개 중 ${freq}개 제목·태그에 등장${comparison}`,
      suggestedTopic: buildTopic(gram, selectedGrams),
    };
  });
}
