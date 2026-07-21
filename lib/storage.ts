import { MODES, type ResultKey, type SavedSession, type SermonContext } from "./types";

const KEY = "sermon-helper:sessions";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function joinLegacyResults(
  raw: Record<string, unknown>,
  sections: { key: string; label: string }[],
) {
  return sections
    .map(({ key, label }) =>
      typeof raw[key] === "string" && raw[key]
        ? `## ${label}\n\n${raw[key]}`
        : "",
    )
    .filter(Boolean)
    .join("\n\n---\n\n");
}

// 1.x의 원어·번역·유대·주석 결과를 2.x의 연결형 연구 단계로 보존한다.
function migrateResults(value: unknown): Partial<Record<ResultKey, string>> {
  const raw = asRecord(value) ?? {};
  const next: Partial<Record<ResultKey, string>> = {};

  for (const mode of MODES) {
    if (typeof raw[mode.id] === "string") next[mode.id] = raw[mode.id] as string;
  }
  if (typeof raw.qa === "string") next.qa = raw.qa;

  if (!next.exegesis) {
    const exegesis = joinLegacyResults(raw, [
      { key: "commentary", label: "기존 주석·강해" },
      { key: "original", label: "기존 원어 분석" },
      { key: "translations", label: "기존 번역 비교" },
      { key: "jewish", label: "기존 유대 배경" },
    ]);
    if (exegesis) next.exegesis = exegesis;
  }
  if (!next.theology && typeof raw.insight === "string") {
    next.theology = raw.insight;
  }
  if (!next.outline && typeof raw.outline === "string") {
    next.outline = raw.outline;
  }
  return next;
}

function normalizeSession(value: unknown): SavedSession | null {
  const raw = asRecord(value);
  if (!raw || typeof raw.id !== "string") return null;
  const rawContext = asRecord(raw.context) ?? {};
  const passage =
    typeof raw.passage === "string"
      ? raw.passage
      : typeof rawContext.passage === "string"
        ? rawContext.passage
        : "";
  if (!passage.trim()) return null;

  const context = { ...rawContext, passage } as unknown as SermonContext;
  const qaLog = Array.isArray(raw.qaLog)
    ? raw.qaLog.flatMap((item) => {
        const entry = asRecord(item);
        return entry && typeof entry.q === "string" && typeof entry.a === "string"
          ? [{ q: entry.q, a: entry.a }]
          : [];
      })
    : [];

  return {
    id: raw.id,
    passage,
    context,
    results: migrateResults(raw.results),
    qaLog,
    createdAt: typeof raw.createdAt === "number" ? raw.createdAt : Date.now(),
    updatedAt: typeof raw.updatedAt === "number" ? raw.updatedAt : Date.now(),
  };
}

export function loadSessions(): SavedSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr: unknown = JSON.parse(raw);
    return Array.isArray(arr)
      ? arr
          .map(normalizeSession)
          .filter((session): session is SavedSession => Boolean(session))
          .sort((a, b) => b.updatedAt - a.updatedAt)
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
    { app: "sermon-helper", version: 2, exportedAt: Date.now(), sessions: loadSessions() },
    null,
    2,
  );
}

// 가져온 세션을 기존 것과 병합(같은 id는 더 최근 것 유지). 병합된 개수 반환.
export function importSessionsJson(json: string): number {
  const data: unknown = JSON.parse(json);
  const dataRecord = asRecord(data);
  const rawIncoming = Array.isArray(data)
    ? data
    : Array.isArray(dataRecord?.sessions)
      ? dataRecord.sessions
      : [];
  const incoming = rawIncoming
    .map(normalizeSession)
    .filter((session): session is SavedSession => Boolean(session));
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
