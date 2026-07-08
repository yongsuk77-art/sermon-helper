import type { SavedSession } from "./types";

const KEY = "sermon-helper:sessions";

export function loadSessions(): SavedSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as SavedSession[];
    return Array.isArray(arr)
      ? arr.sort((a, b) => b.updatedAt - a.updatedAt)
      : [];
  } catch {
    return [];
  }
}

export function saveSession(session: SavedSession): SavedSession[] {
  const all = loadSessions().filter((s) => s.id !== session.id);
  all.unshift(session);
  const trimmed = all.slice(0, 100); // 최대 100개 보관
  try {
    localStorage.setItem(KEY, JSON.stringify(trimmed));
  } catch {
    // 용량 초과 시 가장 오래된 것 제거하며 재시도
    try {
      localStorage.setItem(KEY, JSON.stringify(trimmed.slice(0, 30)));
    } catch {
      /* 무시 */
    }
  }
  return trimmed;
}

export function deleteSession(id: string): SavedSession[] {
  const all = loadSessions().filter((s) => s.id !== id);
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* 무시 */
  }
  return all;
}

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// ── 백업(내보내기/불러오기) — 자료를 파일로 보관해 어느 기기에서도 복원 ──
export function exportSessionsJson(): string {
  return JSON.stringify(
    { app: "sermon-helper", version: 1, exportedAt: Date.now(), sessions: loadSessions() },
    null,
    2,
  );
}

// 가져온 세션을 기존 것과 병합(같은 id는 더 최근 것 유지). 병합된 개수 반환.
export function importSessionsJson(json: string): number {
  const data = JSON.parse(json);
  const incoming: SavedSession[] = Array.isArray(data)
    ? data
    : Array.isArray(data?.sessions)
      ? data.sessions
      : [];
  if (incoming.length === 0) return 0;

  const byId = new Map<string, SavedSession>();
  for (const s of loadSessions()) byId.set(s.id, s);
  let added = 0;
  for (const s of incoming) {
    if (!s?.id || !s?.passage) continue;
    const cur = byId.get(s.id);
    if (!cur || (s.updatedAt ?? 0) >= (cur.updatedAt ?? 0)) {
      byId.set(s.id, s);
      added++;
    }
  }
  const merged = Array.from(byId.values()).sort(
    (a, b) => b.updatedAt - a.updatedAt,
  );
  localStorage.setItem(KEY, JSON.stringify(merged.slice(0, 200)));
  return added;
}
