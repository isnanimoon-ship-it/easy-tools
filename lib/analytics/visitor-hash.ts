function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

/**
 * IP 원문을 저장하지 않기 위한 방문자 식별 해시.
 * 날짜가 바뀌면 값도 바뀌므로 장기 추적에는 쓸 수 없고, 당일 재방문 판별에만 쓸 수 있다.
 */
export async function hashVisitor(ip: string, userAgent: string, now: Date = new Date()) {
  const input = `${ip}|${userAgent}|${toDateKey(now)}`;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}
