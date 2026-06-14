// UI 표시용 숫자/퍼센트 포맷 헬퍼. 순수 함수 — 네트워크/상태 의존 없음.

// 소수 1자리까지 반올림하고 불필요한 0을 떼어낸다. 12.0 → "12", 1.5 → "1.5".
function trim1(x: number): string {
  return Number(x.toFixed(1)).toString();
}

/** 큰 수를 12K / 1.2M / 3.4B 처럼 축약한다. 1000 미만은 소수 1자리까지 그대로. */
export function formatCount(n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs < 1_000) return sign + trim1(abs);
  if (abs < 1_000_000) return sign + trim1(abs / 1_000) + "K";
  if (abs < 1_000_000_000) return sign + trim1(abs / 1_000_000) + "M";
  return sign + trim1(abs / 1_000_000_000) + "B";
}

/** 비율(0~1)을 "12.3%" 형태의 퍼센트 문자열로 만든다. */
export function formatPercent(ratio: number): string {
  return trim1(ratio * 100) + "%";
}
