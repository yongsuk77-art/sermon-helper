"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MODES,
  type ModeId,
  type ResultKey,
  type SermonContext,
  type SavedSession,
} from "@/lib/types";
import {
  loadSessions,
  saveSession,
  deleteSession,
  newId,
  exportSessionsJson,
  importSessionsJson,
} from "@/lib/storage";
import MarkdownView from "@/components/MarkdownView";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import { markdownToDocxBlob } from "@/lib/docx";
import { AI_OPTIONS, DEFAULT_AI_KEY, findAi } from "@/lib/models";
import { buildWorksheet, buildWorksheetSet } from "@/lib/worksheet";
import SettingsModal from "@/components/SettingsModal";
import ManuscriptModal from "@/components/ManuscriptModal";
import { ResearchLibrary } from "@/components/ResearchLibrary";
import {
  type AppSettings,
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  applySettings,
} from "@/lib/settings";

const EMPTY_CTX: SermonContext = {
  passage: "",
  theme: "",
  audience: "",
  occasion: "",
  pastoralNeed: "",
  tradition: "",
  preferredVoices: "",
  duration: "",
  notes: "",
};

const AI_ERROR_MARK = "⚠️";
const AI_MODE_VERSION = "2";

function collectPriorResults(
  mode: ModeId,
  results: Partial<Record<ResultKey, string>>,
) {
  const targetIndex = MODES.findIndex((item) => item.id === mode);
  if (targetIndex <= 0) return "";
  return MODES.slice(0, targetIndex)
    .flatMap((item) => {
      const text = results[item.id]?.trim();
      return text
        ? [`# 앞 단계: ${item.label}\n\n${text.slice(0, 5000)}`]
        : [];
    })
    .join("\n\n---\n\n")
    .slice(0, 28000);
}

function collectAllResults(results: Partial<Record<ResultKey, string>>) {
  return MODES.flatMap((item) => {
    const text = results[item.id]?.trim();
    return text ? [`# ${item.label}\n\n${text.slice(0, 3500)}`] : [];
  })
    .join("\n\n---\n\n")
    .slice(0, 20000);
}

function isAiError(text: string) {
  return text.trimStart().startsWith(AI_ERROR_MARK);
}

function cleanAiError(text: string) {
  return text
    .replace(/^⚠️\s*(AI 연결 오류|오류):\s*/u, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220);
}

function buildFallbackWorksheet(mode: ModeId, ctx: SermonContext, errorText?: string) {
  const note = errorText
    ? `\n\n> 확인 메시지: ${cleanAiError(errorText)}`
    : "";

  return `${buildWorksheet(mode, ctx)}

---

> AI 연결에 문제가 있어 API 호출 없이 작성 가능한 기본 워크시트로 자동 전환했습니다. Vercel 환경 변수의 API 키와 모델명을 확인한 뒤 같은 항목에서 다시 AI 보강을 누르면 됩니다.${note}`;
}

function buildQaFallback(question: string, errorText?: string) {
  const note = errorText
    ? `\n\n확인 메시지: ${cleanAiError(errorText)}`
    : "";

  return `AI 연결이 필요해 이 질문의 답변은 생성하지 못했습니다.

- 질문: ${question}
- 지금은 API 호출 없이 무료 워크시트로 설교 준비를 계속할 수 있습니다.
- Vercel 환경 변수에 사용할 모델의 API 키를 넣은 뒤 다시 질문해 주세요.${note}`;
}

export default function Page() {
  const [ctx, setCtx] = useState<SermonContext>(EMPTY_CTX);
  const [results, setResults] = useState<Partial<Record<ResultKey, string>>>({});
  const [active, setActive] = useState<ResultKey>("exegesis");
  const [loading, setLoading] = useState<ResultKey | null>(null);
  const [runningAll, setRunningAll] = useState(false);

  const [sessions, setSessions] = useState<SavedSession[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const currentId = useRef<string | null>(null);

  const [qaQuestion, setQaQuestion] = useState("");
  const [qaLog, setQaLog] = useState<{ q: string; a: string }[]>([]);
  const [qaStreaming, setQaStreaming] = useState("");

  const [toast, setToast] = useState("");
  const toastTimer = useRef<number | null>(null);

  // 선택한 AI (기기에 저장)
  const [aiKey, setAiKey] = useState<string>(DEFAULT_AI_KEY);
  const ai = findAi(aiKey);

  // 설정(글자 크기·색상)
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [showManuscript, setShowManuscript] = useState(false);

  useEffect(() => {
    setSessions(loadSessions());
    const saved = localStorage.getItem("sermon-helper:ai");
    const savedVersion = localStorage.getItem("sermon-helper:ai-version");
    if (
      savedVersion === AI_MODE_VERSION &&
      saved &&
      AI_OPTIONS.some((o) => o.key === saved)
    ) {
      setAiKey(saved);
    } else {
      setAiKey(DEFAULT_AI_KEY);
      try {
        localStorage.setItem("sermon-helper:ai", DEFAULT_AI_KEY);
        localStorage.setItem("sermon-helper:ai-version", AI_MODE_VERSION);
      } catch {
        /* 무시 */
      }
    }
    const s = loadSettings();
    setSettings(s);
    applySettings(s);
    return () => {
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    };
  }, []);

  const changeSettings = useCallback((s: AppSettings) => {
    setSettings(s);
    saveSettings(s);
    applySettings(s);
  }, []);

  const changeAi = useCallback((key: string) => {
    setAiKey(key);
    try {
      localStorage.setItem("sermon-helper:ai", key);
      localStorage.setItem("sermon-helper:ai-version", AI_MODE_VERSION);
    } catch {
      /* 무시 */
    }
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 2200);
  }, []);

  const confirmAiUse = useCallback((task: string, calls = 1) => {
    return window.confirm(
      `${task}\n\nAI API를 ${calls}회 호출합니다. 사용량에 따라 비용이 발생할 수 있습니다. 계속할까요?`,
    );
  }, []);

  // 저장은 스트리밍 완료 직후에 일어나는데, 그 시점의 results 상태는 아직
  // 반영 전이라 stale 하다. 그래서 "완료된 결과"를 ref로 들고 있다가 저장한다.
  const resultsRef = useRef<Partial<Record<ResultKey, string>>>({});
  const qaLogRef = useRef<{ q: string; a: string }[]>([]);

  // ── 현재 상태를 세션으로 저장 (명시적 데이터로 저장) ──────
  const persistData = useCallback(
    (
      resultsObj: Partial<Record<ResultKey, string>>,
      qaLogArr: { q: string; a: string }[],
    ) => {
      if (!ctx.passage.trim()) return;
      if (!currentId.current) currentId.current = newId();
      const now = Date.now();
      const existing = loadSessions().find((s) => s.id === currentId.current);
      const session: SavedSession = {
        id: currentId.current,
        passage: ctx.passage.trim(),
        context: ctx,
        results: resultsObj,
        qaLog: qaLogArr,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      setSessions(saveSession(session));
    },
    [ctx],
  );

  // ── 공통 스트리밍 호출 ───────────────────────────────────
  const callStream = useCallback(
    async (
      payload: Record<string, unknown>,
      onDelta: (acc: string) => void,
    ): Promise<string> => {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok || !res.body) {
        const j = (await res
          .json()
          .catch(() => ({ error: `오류 ${res.status}` }))) as { error?: string };
        const msg = `⚠️ ${j.error || "요청에 실패했습니다."}`;
        onDelta(msg);
        return msg;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        onDelta(acc);
      }
      return acc;
    },
    [],
  );

  // ── 비용 없는 워크시트 생성 ───────────────────────────────
  const runWorksheet = useCallback(
    (mode: ModeId) => {
      if (!ctx.passage.trim()) {
        showToast("먼저 성경 본문을 입력하세요.");
        return;
      }
      if (loading || runningAll) return;
      const text = buildWorksheet(mode, ctx);
      const nextResults = { ...resultsRef.current, [mode]: text };
      resultsRef.current = nextResults;
      setActive(mode);
      setResults(nextResults);
      persistData(nextResults, qaLogRef.current);
      showToast("AI 없이 무료 워크시트를 만들었습니다.");
    },
    [ctx, loading, runningAll, persistData, showToast],
  );

  const runAllWorksheets = useCallback(() => {
    if (!ctx.passage.trim()) {
      showToast("먼저 성경 본문을 입력하세요.");
      return;
    }
    if (loading || runningAll) return;
    const nextResults = { ...resultsRef.current, ...buildWorksheetSet(ctx) };
    resultsRef.current = nextResults;
    setActive("exegesis");
    setResults(nextResults);
    persistData(nextResults, qaLogRef.current);
    showToast("AI 없이 전체 워크시트를 만들었습니다.");
  }, [ctx, loading, runningAll, persistData, showToast]);

  // ── 한 모드 생성 ─────────────────────────────────────────
  const run = useCallback(
    async (mode: ModeId) => {
      if (!ctx.passage.trim()) {
        showToast("먼저 성경 본문을 입력하세요.");
        return;
      }
      if (loading) return;
      if (ai.provider === "free") {
        runWorksheet(mode);
        return;
      }
      const modeLabel = MODES.find((m) => m.id === mode)?.label || "선택 항목";
      if (!confirmAiUse(`${modeLabel}을 AI로 생성/보강합니다.`)) return;
      setActive(mode);
      setLoading(mode);
      setResults((p) => ({ ...p, [mode]: "" }));
      let finalText = "";
      try {
        const streamed = await callStream(
          {
            mode,
            context: ctx,
            priorResults: collectPriorResults(mode, resultsRef.current),
            provider: ai.provider,
            model: ai.model,
          },
          (acc) => setResults((p) => ({ ...p, [mode]: acc })),
        );
        if (isAiError(streamed)) {
          finalText = buildFallbackWorksheet(mode, ctx, streamed);
          showToast("AI 연결 실패로 무료 워크시트로 전환했습니다.");
        } else {
          finalText = streamed;
        }
      } catch (e) {
        finalText = buildFallbackWorksheet(
          mode,
          ctx,
          `⚠️ 오류: ${e instanceof Error ? e.message : String(e)}`,
        );
        showToast("AI 연결 실패로 무료 워크시트로 전환했습니다.");
        setResults((p) => ({ ...p, [mode]: finalText }));
      } finally {
        resultsRef.current = { ...resultsRef.current, [mode]: finalText };
        setResults((p) => ({ ...p, [mode]: finalText }));
        setLoading(null);
        persistData(resultsRef.current, qaLogRef.current);
      }
    },
    [ctx, loading, callStream, persistData, showToast, ai, confirmAiUse, runWorksheet],
  );

  // ── 전체 순서대로 생성 ───────────────────────────────────
  const runAll = useCallback(async () => {
    if (!ctx.passage.trim()) {
      showToast("먼저 성경 본문을 입력하세요.");
      return;
    }
    if (loading || runningAll) return;
    if (ai.provider === "free") {
      runAllWorksheets();
      return;
    }
    if (
      !confirmAiUse(
        `연결된 ${MODES.length}단계 깊이 연구를 시작합니다. 각 단계는 앞선 결과를 이어받습니다.`,
        MODES.length,
      )
    ) {
      return;
    }
    setRunningAll(true);
    let usedFallback = false;
    for (const m of MODES) {
      setActive(m.id);
      setLoading(m.id);
      setResults((p) => ({ ...p, [m.id]: "" }));
      let finalText = "";
      try {
        if (usedFallback) {
          finalText = buildFallbackWorksheet(m.id, ctx);
        } else {
          const streamed = await callStream(
            {
              mode: m.id,
              context: ctx,
              priorResults: collectPriorResults(m.id, resultsRef.current),
              provider: ai.provider,
              model: ai.model,
            },
            (acc) => setResults((p) => ({ ...p, [m.id]: acc })),
          );
          if (isAiError(streamed)) {
            usedFallback = true;
            finalText = buildFallbackWorksheet(m.id, ctx, streamed);
          } else {
            finalText = streamed;
          }
        }
      } catch (e) {
        usedFallback = true;
        finalText = buildFallbackWorksheet(
          m.id,
          ctx,
          `⚠️ 오류: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
      resultsRef.current = { ...resultsRef.current, [m.id]: finalText };
      setResults((p) => ({ ...p, [m.id]: finalText }));
      setLoading(null);
      persistData(resultsRef.current, qaLogRef.current);
    }
    setRunningAll(false);
    showToast(
      usedFallback
        ? "AI 연결 실패로 기본 워크시트까지 채웠습니다."
        : "전체 연구가 완료되었습니다.",
    );
  }, [
    ctx,
    loading,
    runningAll,
    callStream,
    persistData,
    showToast,
    ai,
    confirmAiUse,
    runAllWorksheets,
  ]);

  // ── 자유 질문 ────────────────────────────────────────────
  const ask = useCallback(async () => {
    const q = qaQuestion.trim();
    if (!q) return;
    if (!ctx.passage.trim()) {
      showToast("먼저 성경 본문을 입력하세요.");
      return;
    }
    if (loading) return;
    if (ai.provider === "free") {
      const answer = buildQaFallback(q);
      qaLogRef.current = [...qaLogRef.current, { q, a: answer }];
      setQaLog(qaLogRef.current);
      setQaQuestion("");
      setActive("qa");
      persistData(resultsRef.current, qaLogRef.current);
      showToast("자유 질문은 AI 모델을 선택한 뒤 사용할 수 있습니다.");
      return;
    }
    if (!confirmAiUse("자유 질문 답변을 AI로 생성합니다.")) return;
    setActive("qa");
    setLoading("qa");
    setQaStreaming("");
    const prior = collectAllResults(results);
    let answer = "";
    try {
      answer = await callStream(
        {
          mode: "qa",
          context: ctx,
          question: q,
          priorResults: prior,
          provider: ai.provider,
          model: ai.model,
        },
        (acc) => setQaStreaming(acc),
      );
      if (isAiError(answer)) {
        answer = buildQaFallback(q, answer);
        showToast("AI 연결 오류를 확인해 주세요.");
      }
    } catch (e) {
      answer = buildQaFallback(
        q,
        `⚠️ 오류: ${e instanceof Error ? e.message : String(e)}`,
      );
      showToast("AI 연결 오류를 확인해 주세요.");
    }
    qaLogRef.current = [...qaLogRef.current, { q, a: answer }];
    setQaLog(qaLogRef.current);
    setQaStreaming("");
    setQaQuestion("");
    setLoading(null);
    persistData(resultsRef.current, qaLogRef.current);
  }, [qaQuestion, ctx, loading, results, callStream, persistData, showToast, ai, confirmAiUse]);

  // ── 세션 불러오기 / 새로 시작 / 삭제 ─────────────────────
  const openSession = useCallback((s: SavedSession) => {
    currentId.current = s.id;
    resultsRef.current = s.results || {};
    qaLogRef.current = s.qaLog || [];
    setCtx({ ...EMPTY_CTX, ...s.context, passage: s.passage });
    setResults(s.results || {});
    setQaLog(s.qaLog || []);
    setQaStreaming("");
    setActive("exegesis");
    setShowHistory(false);
  }, []);

  const startNew = useCallback(() => {
    currentId.current = null;
    resultsRef.current = {};
    qaLogRef.current = [];
    setCtx(EMPTY_CTX);
    setResults({});
    setQaLog([]);
    setQaStreaming("");
    setActive("exegesis");
    setShowHistory(false);
  }, []);

  const removeSession = useCallback(
    (id: string) => {
      setSessions(deleteSession(id));
      if (currentId.current === id) startNew();
    },
    [startNew],
  );

  // ── 전체 백업(내보내기/불러오기) ─────────────────────────
  const importRef = useRef<HTMLInputElement>(null);

  const backupExport = useCallback(() => {
    const blob = new Blob([exportSessionsJson()], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const d = new Date();
    const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
    a.href = url;
    a.download = `설교준비_백업_${stamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("백업 파일을 내려받았습니다.");
  }, [showToast]);

  const backupImport = useCallback(
    async (file: File) => {
      try {
        const text = await file.text();
        const n = importSessionsJson(text);
        setSessions(loadSessions());
        showToast(n > 0 ? `${n}개 연구를 불러왔습니다.` : "새로 불러온 연구가 없습니다.");
      } catch {
        showToast("백업 파일을 읽지 못했습니다.");
      }
    },
    [showToast],
  );

  // ── 복사 / 내보내기 ──────────────────────────────────────
  const copyText = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        showToast("복사했습니다.");
      } catch {
        showToast("복사에 실패했습니다.");
      }
    },
    [showToast],
  );

  const compileAll = useCallback(() => {
    const parts: string[] = [`# 설교 준비 — ${ctx.passage}`, ""];
    if (ctx.theme) parts.push(`**주제/방향:** ${ctx.theme}`);
    if (ctx.audience) parts.push(`**청중:** ${ctx.audience}`);
    if (ctx.occasion) parts.push(`**절기/상황:** ${ctx.occasion}`);
    parts.push("");
    for (const m of MODES) {
      if (results[m.id]) {
        parts.push(`\n\n---\n\n## ${m.icon} ${m.label}\n\n${results[m.id]}`);
      }
    }
    if (qaLog.length) {
      parts.push(`\n\n---\n\n## 💬 자유 질문`);
      qaLog.forEach(({ q, a }) => parts.push(`\n**Q. ${q}**\n\n${a}`));
    }
    return parts.join("\n");
  }, [ctx, results, qaLog]);

  const saveBlob = useCallback((blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // 워드(.docx)로 내려받기
  const downloadDocx = useCallback(
    async (text: string, baseName: string, title: string) => {
      if (!text.trim()) {
        showToast("먼저 내용을 생성하세요.");
        return;
      }
      try {
        showToast("워드 문서를 만드는 중…");
        const blob = await markdownToDocxBlob(text, title);
        saveBlob(blob, `${baseName}.docx`);
        showToast("워드 문서로 내려받았습니다.");
      } catch {
        // 변환 실패 시 마크다운으로라도 저장
        saveBlob(
          new Blob([text], { type: "text/markdown;charset=utf-8" }),
          `${baseName}.md`,
        );
        showToast("워드 변환 실패 — 텍스트(.md)로 저장했습니다.");
      }
    },
    [saveBlob, showToast],
  );

  const safeName = useMemo(
    () => (ctx.passage || "설교준비").replace(/[\\/:*?"<>|\s]+/g, "_"),
    [ctx.passage],
  );

  const hasAny = MODES.some((m) => results[m.id]) || qaLog.length > 0;
  const activeMode = MODES.find((m) => m.id === active);
  const completedCount = MODES.filter((m) => results[m.id]?.trim()).length;
  const currentStage = MODES.find((m) => m.id === loading);
  const isFreeMode = ai.provider === "free";

  return (
    <div className="min-h-screen">
      <ServiceWorkerRegister />

      {/* 헤더 */}
      <header className="safe-pt sticky top-0 z-30 border-b border-ink-100/70 bg-[#fffdf7]/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-3 py-3 sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-xl sm:text-2xl">📖</span>
            <div>
              <h1 className="whitespace-nowrap text-base font-bold leading-tight text-ink-900 sm:text-lg">
                설교 준비 어시스트
              </h1>
              <p className="hidden text-[11px] text-ink-700/70 sm:block">
                정확한 해석에서 깊은 적용까지, 연결형 설교 연구
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <button
              onClick={startNew}
              aria-label="새 연구"
              className="rounded-lg border border-ink-100 px-2.5 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-50 sm:px-3"
            >
              <span aria-hidden="true">＋</span>
              <span className="hidden sm:inline"> 새 연구</span>
            </button>
            <button
              onClick={() => {
                setSessions(loadSessions());
                setShowHistory(true);
              }}
              aria-label="저장된 연구"
              className="rounded-lg border border-ink-100 px-2.5 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-50 sm:px-3"
            >
              <span aria-hidden="true">📚</span>
              <span className="hidden sm:inline"> 기록</span>
            </button>
            <button
              onClick={() => setShowManuscript(true)}
              aria-label="원고 도구"
              className="rounded-lg border border-ink-100 px-2.5 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-50 sm:px-3"
            >
              <span aria-hidden="true">📄</span>
              <span className="hidden sm:inline"> 원고</span>
            </button>
            <button
              onClick={() => setShowSettings(true)}
              aria-label="설정"
              className="rounded-lg border border-ink-100 px-2.5 py-1.5 text-sm text-ink-700 hover:bg-ink-50"
            >
              ⚙️
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-28 pt-4">
        {/* 입력 카드 */}
        <section className="rounded-2xl border border-ink-100 bg-white/70 p-4 shadow-sm">
          {/* 작업 방식 선택 */}
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl bg-ink-50/60 px-3 py-2">
            <span className="text-xs font-semibold text-ink-700">🧭 작업 방식</span>
            <select
              value={aiKey}
              onChange={(e) => changeAi(e.target.value)}
              className="rounded-lg border border-ink-100 bg-white px-2 py-1.5 text-xs font-medium text-ink-800 outline-none focus:border-gold-400"
            >
              {AI_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label} — {o.note}
                </option>
              ))}
            </select>
            <span className="text-[11px] text-ink-700/50">
              {isFreeMode
                ? "기본 · API 호출 없음"
                : ai.provider === "claude"
                  ? "AI 보강 · Vercel에 Anthropic 키 필요"
                  : "AI 보강 · 해당 제공자 API 키 필요"}
            </span>
            <span className="basis-full text-[11px] leading-relaxed text-ink-700/60">
              {isFreeMode
                ? "현재는 비용 없이 기본 워크시트를 만듭니다. Claude/GPT/Gemini를 선택하면 6단계가 앞선 연구를 이어받아 한 흐름으로 보강됩니다."
                : "6단계가 앞선 연구를 이어받아 주해부터 최종 검토까지 완성합니다. 키가 없거나 틀리면 자동으로 기본 워크시트로 전환됩니다."}
            </span>
          </div>

          <label className="mb-1 block text-xs font-semibold text-ink-700">
            성경 본문 <span className="text-gold-600">*</span>
          </label>
          <input
            value={ctx.passage}
            onChange={(e) => setCtx((c) => ({ ...c, passage: e.target.value }))}
            placeholder="예: 요한복음 3:16-21, 창세기 1:1-5, 시편 23편"
            className="w-full rounded-xl border border-ink-100 bg-white px-3 py-2.5 text-[15px] outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20"
          />

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field
              label="설교 주제 / 방향"
              value={ctx.theme || ""}
              placeholder="예: 하나님의 사랑과 구원"
              onChange={(v) => setCtx((c) => ({ ...c, theme: v }))}
            />
            <Field
              label="청중"
              value={ctx.audience || ""}
              placeholder="예: 장년 / 청년 / 새신자"
              onChange={(v) => setCtx((c) => ({ ...c, audience: v }))}
            />
            <Field
              label="절기 / 상황"
              value={ctx.occasion || ""}
              placeholder="예: 주일 낮예배 / 부활절"
              onChange={(v) => setCtx((c) => ({ ...c, occasion: v }))}
            />
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field
              label="청중의 현실 / 목회적 필요"
              value={ctx.pastoralNeed || ""}
              placeholder="예: 불안과 번아웃, 관계 단절, 믿음의 침체"
              onChange={(v) => setCtx((c) => ({ ...c, pastoralNeed: v }))}
            />
            <Field
              label="신학 전통 / 해석 관점"
              value={ctx.tradition || ""}
              placeholder="예: 장로교 개혁주의 / 주요 견해 균형 비교"
              onChange={(v) => setCtx((c) => ({ ...c, tradition: v }))}
            />
            <Field
              label="참고하고 싶은 설교자 / 저자"
              value={ctx.preferredVoices || ""}
              placeholder="예: 어거스틴, 칼뱅, 스펄전, 로이드존스, 팀 켈러"
              onChange={(v) => setCtx((c) => ({ ...c, preferredVoices: v }))}
            />
            <Field
              label="설교 시간"
              value={ctx.duration || ""}
              placeholder="예: 25분"
              onChange={(v) => setCtx((c) => ({ ...c, duration: v }))}
            />
          </div>

          <div className="mt-3">
            <label className="mb-1 block text-xs font-semibold text-ink-700">
              메모 (선택)
            </label>
            <textarea
              value={ctx.notes || ""}
              onChange={(e) => setCtx((c) => ({ ...c, notes: e.target.value }))}
              placeholder="이미 묵상한 내용, 반드시 살릴 통찰, 피하고 싶은 표현 등"
              rows={2}
              className="w-full resize-y rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20"
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              onClick={runAllWorksheets}
              disabled={!!loading || runningAll}
              className="inline-flex items-center gap-2 rounded-xl border border-gold-200 bg-white px-4 py-2.5 text-sm font-semibold text-gold-700 shadow-sm hover:bg-gold-50 disabled:opacity-50"
            >
              📝 AI 없이 전체 워크시트
            </button>
            <button
              onClick={runAll}
              disabled={!!loading || runningAll}
              className="inline-flex items-center gap-2 rounded-xl bg-gold-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-gold-500 disabled:opacity-50"
            >
              {runningAll ? <Spinner /> : isFreeMode ? "📝" : "✨"}{" "}
              {isFreeMode ? "기본값으로 전체 작업" : "6단계 깊이 연구 시작"}
            </button>
            {hasAny && (
              <>
                <button
                  onClick={() => copyText(compileAll())}
                  className="rounded-xl border border-ink-100 px-3 py-2.5 text-sm font-medium text-ink-700 hover:bg-ink-50"
                >
                  전체 복사
                </button>
                <button
                  onClick={() =>
                    downloadDocx(
                      compileAll(),
                      `${safeName}_설교준비`,
                      `설교 준비 — ${ctx.passage}`,
                    )
                  }
                  className="rounded-xl border border-ink-100 px-3 py-2.5 text-sm font-medium text-ink-700 hover:bg-ink-50"
                >
                  전체 워드 내려받기(.docx)
                </button>
              </>
            )}
          </div>
          <div className="mt-4 rounded-xl border border-ink-100 bg-ink-50/50 p-3">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="font-semibold text-ink-800">
                {currentStage
                  ? `${currentStage.icon} ${currentStage.label} 진행 중`
                  : completedCount === MODES.length
                    ? "6단계 자료가 모두 준비되었습니다."
                    : "연결형 설교 준비 진행률"}
              </span>
              <span className="shrink-0 font-medium text-ink-700/60">
                {completedCount}/{MODES.length}
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-100">
              <div
                className="h-full rounded-full bg-gold-600 transition-all duration-500"
                style={{ width: `${(completedCount / MODES.length) * 100}%` }}
              />
            </div>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-ink-700/60">
            무료 워크시트는 API 호출이 없습니다. AI 보강과 자유 질문은 모델을 선택한 뒤 비용 확인창을 거칩니다.
            AI 결과는 참고 초안이므로 원문·주석·인용 출처를 직접 확인하세요. 결과는 이 기기에 자동 저장됩니다.
          </p>
        </section>

        {/* 탭 */}
        <nav className="sticky top-[60px] z-20 -mx-4 mt-4 overflow-x-auto bg-[#fffdf7]/80 px-4 py-2 backdrop-blur">
          <div className="flex gap-1.5">
            {MODES.map((m, index) => {
              const on = active === m.id;
              const done = !!results[m.id];
              const busy = loading === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setActive(m.id)}
                  className={`flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    on
                      ? "border-gold-500 bg-gold-600 text-white"
                      : "border-ink-100 bg-white text-ink-700 hover:bg-ink-50"
                  }`}
                >
                  <span className={on ? "text-white/75" : "text-ink-700/40"}>
                    {index + 1}
                  </span>
                  <span>{m.icon}</span>
                  <span>{m.short}</span>
                  {busy ? (
                    <Spinner small />
                  ) : done ? (
                    <span className={on ? "text-white" : "text-green-600"}>
                      ✓
                    </span>
                  ) : null}
                </button>
              );
            })}
            <button
              onClick={() => setActive("qa")}
              className={`flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                active === "qa"
                  ? "border-gold-500 bg-gold-600 text-white"
                  : "border-ink-100 bg-white text-ink-700 hover:bg-ink-50"
              }`}
            >
              💬 질문
            </button>
          </div>
        </nav>

        {/* 결과 영역 */}
        <section className="mt-3">
          {active === "qa" ? (
            <QaPanel
              passage={ctx.passage}
              qaLog={qaLog}
              streaming={qaStreaming}
              loading={loading === "qa"}
              question={qaQuestion}
              setQuestion={setQaQuestion}
              onAsk={ask}
              onCopy={copyText}
              freeMode={isFreeMode}
            />
          ) : (
            <>
              {active === "voices" && (
                <ResearchLibrary passage={ctx.passage} onCopy={copyText} />
              )}
              <ResultPanel
                key={active}
                icon={activeMode?.icon || ""}
                label={activeMode?.label || ""}
                blurb={activeMode?.blurb || ""}
                text={results[active as ModeId]}
                loading={loading === (active as ModeId)}
                freeMode={isFreeMode}
                onWorksheet={() => runWorksheet(active as ModeId)}
                onRun={() => run(active as ModeId)}
                onCopy={() => copyText(results[active as ModeId] || "")}
                onDownload={() =>
                  downloadDocx(
                    results[active as ModeId] || "",
                    `${safeName}_${activeMode?.short}`,
                    `${ctx.passage} — ${activeMode?.label}`,
                  )
                }
              />
            </>
          )}
        </section>
      </main>

      {/* 기록 드로어 */}
      {showHistory && (
        <div
          className="fixed inset-0 z-40 bg-black/30"
          onClick={() => setShowHistory(false)}
        >
          <div
            className="safe-pt absolute right-0 top-0 h-full w-[86%] max-w-sm overflow-y-auto bg-white p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-ink-900">📚 저장된 연구</h2>
              <button
                onClick={() => setShowHistory(false)}
                className="rounded-lg px-2 py-1 text-sm text-ink-700 hover:bg-ink-50"
              >
                닫기 ✕
              </button>
            </div>

            {/* 백업 */}
            <div className="mb-4 flex gap-2">
              <button
                onClick={backupExport}
                className="flex-1 rounded-lg border border-ink-100 py-2 text-xs font-medium text-ink-700 hover:bg-ink-50"
              >
                ⬇️ 전체 백업 저장
              </button>
              <button
                onClick={() => importRef.current?.click()}
                className="flex-1 rounded-lg border border-ink-100 py-2 text-xs font-medium text-ink-700 hover:bg-ink-50"
              >
                ⬆️ 백업 불러오기
              </button>
              <input
                ref={importRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) backupImport(f);
                  e.target.value = "";
                }}
              />
            </div>
            <p className="mb-3 text-[11px] leading-relaxed text-ink-700/60">
              「전체 백업 저장」으로 모든 연구를 파일 1개로 보관하세요. 다른
              기기나 앱 재설치 후 「백업 불러오기」로 그대로 되살릴 수 있습니다.
            </p>
            {sessions.length === 0 ? (
              <p className="mt-8 text-center text-sm text-ink-700/60">
                아직 저장된 연구가 없습니다.
              </p>
            ) : (
              <ul className="space-y-2">
                {sessions.map((s) => (
                  <li
                    key={s.id}
                    className="rounded-xl border border-ink-100 p-3 hover:bg-ink-50"
                  >
                    <button
                      onClick={() => openSession(s)}
                      className="block w-full text-left"
                    >
                      <p className="font-semibold text-ink-900">{s.passage}</p>
                      {s.context.theme ? (
                        <p className="mt-0.5 text-xs text-ink-700/70">
                          {s.context.theme}
                        </p>
                      ) : null}
                      <p className="mt-1 text-[11px] text-ink-700/50">
                        {new Date(s.updatedAt).toLocaleString("ko-KR")} ·{" "}
                        {
                          MODES.filter((m) => s.results?.[m.id]).length
                        }
                        /{MODES.length} 단계
                      </p>
                    </button>
                    <button
                      onClick={() => removeSession(s.id)}
                      className="mt-2 text-[11px] text-red-500 hover:underline"
                    >
                      삭제
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* 원고 성경구절 삽입 */}
      {showManuscript && (
        <ManuscriptModal onClose={() => setShowManuscript(false)} />
      )}

      {/* 설정 */}
      {showSettings && (
        <SettingsModal
          settings={settings}
          onChange={changeSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* 토스트 */}
      {toast && (
        <div className="safe-pb fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink-900 px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

// ── 작은 컴포넌트들 ────────────────────────────────────────────
function Field({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-ink-700">
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20"
      />
    </div>
  );
}

function Spinner({ small }: { small?: boolean }) {
  return (
    <span
      className={`spin inline-block rounded-full border-2 border-current border-t-transparent ${
        small ? "h-3 w-3" : "h-4 w-4"
      }`}
    />
  );
}

function ResultPanel({
  icon,
  label,
  blurb,
  text,
  loading,
  freeMode,
  onWorksheet,
  onRun,
  onCopy,
  onDownload,
}: {
  icon: string;
  label: string;
  blurb: string;
  text?: string;
  loading: boolean;
  freeMode: boolean;
  onWorksheet: () => void;
  onRun: () => void;
  onCopy: () => void;
  onDownload: () => void;
}) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold text-ink-900">
            <span>{icon}</span> {label}
          </h2>
          <p className="mt-0.5 text-xs text-ink-700/60">{blurb}</p>
        </div>
        <div className="flex shrink-0 gap-1.5">
          {text && !loading && (
            <>
              <button
                onClick={onCopy}
                className="rounded-lg border border-ink-100 px-2.5 py-1.5 text-xs text-ink-700 hover:bg-ink-50"
              >
                복사
              </button>
              <button
                onClick={onDownload}
                className="rounded-lg border border-ink-100 px-2.5 py-1.5 text-xs text-ink-700 hover:bg-ink-50"
              >
                저장
              </button>
            </>
          )}
          <button
            onClick={onWorksheet}
            disabled={loading}
            className="rounded-lg border border-gold-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gold-700 hover:bg-gold-50 disabled:opacity-50"
          >
            {text ? "무료 양식 다시" : "무료 양식"}
          </button>
          <button
            onClick={onRun}
            disabled={loading}
            className="rounded-lg bg-gold-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gold-500 disabled:opacity-50"
          >
            {loading
              ? freeMode
                ? "생성 중…"
                : "AI 생성 중…"
              : freeMode
                ? text
                  ? "기본값 다시"
                  : "기본값 생성"
                : text
                  ? "AI 보강"
                  : "AI 생성"}
          </button>
        </div>
      </div>

      {!text && !loading && (
        <div className="py-12 text-center text-sm text-ink-700/50">
          비용 없이 시작하려면 「무료 양식」을 누르세요. 필요할 때만 AI로 보강할 수 있습니다.
        </div>
      )}
      {loading && !text && (
        <div className="flex items-center gap-2 py-12 text-sm text-ink-700/70">
          <Spinner /> 본문을 묵상하며 분석하고 있습니다…
        </div>
      )}
      {text && <MarkdownView>{text}</MarkdownView>}
      {loading && text && (
        <p className="mt-2 flex items-center gap-2 text-xs text-ink-700/60">
          <Spinner small /> 생성 중…
        </p>
      )}
    </div>
  );
}

function QaPanel({
  passage,
  qaLog,
  streaming,
  loading,
  question,
  setQuestion,
  onAsk,
  onCopy,
  freeMode,
}: {
  passage: string;
  qaLog: { q: string; a: string }[];
  streaming: string;
  loading: boolean;
  question: string;
  setQuestion: (v: string) => void;
  onAsk: () => void;
  onCopy: (t: string) => void;
  freeMode: boolean;
}) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-sm sm:p-6">
      <h2 className="flex items-center gap-2 text-base font-bold text-ink-900">
        💬 자유 질문
      </h2>
      <p className="mt-0.5 text-xs text-ink-700/60">
        {freeMode
          ? "현재는 AI 없이 기본값 모드입니다. 질문 답변은 Claude/GPT/Gemini를 선택한 뒤 사용할 수 있습니다."
          : `본문${passage ? ` (${passage})` : ""}과 현재 연구에 대해 질문하세요. 원어, 다른 견해, 출처 검증, 적용 점검 등에 사용할 수 있습니다.`}
      </p>

      <div className="mt-3 flex gap-2">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") onAsk();
          }}
          placeholder="예: 이 본문에서 '믿다'의 헬라어 뉘앙스는? (Ctrl/⌘+Enter 전송)"
          rows={2}
          className="flex-1 resize-y rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20"
        />
        <button
          onClick={onAsk}
          disabled={loading || !question.trim()}
          className="shrink-0 rounded-xl bg-gold-600 px-4 text-sm font-semibold text-white hover:bg-gold-500 disabled:opacity-50"
        >
          {loading ? <Spinner /> : freeMode ? "AI 선택 필요" : "AI 질문"}
        </button>
      </div>

      <div className="mt-5 space-y-5">
        {streaming && (
          <div>
            <p className="mb-1 text-sm font-semibold text-gold-700">
              Q. {question || "…"}
            </p>
            <MarkdownView>{streaming}</MarkdownView>
            <p className="mt-1 flex items-center gap-2 text-xs text-ink-700/60">
              <Spinner small /> 답변 생성 중…
            </p>
          </div>
        )}
        {[...qaLog].reverse().map((qa, i) => (
          <div key={i} className="border-t border-ink-100 pt-4">
            <div className="mb-1 flex items-center justify-between">
              <p className="text-sm font-semibold text-gold-700">Q. {qa.q}</p>
              <button
                onClick={() => onCopy(`Q. ${qa.q}\n\n${qa.a}`)}
                className="text-[11px] text-ink-700/60 hover:underline"
              >
                복사
              </button>
            </div>
            <MarkdownView>{qa.a}</MarkdownView>
          </div>
        ))}
        {!streaming && qaLog.length === 0 && (
          <p className="py-8 text-center text-sm text-ink-700/50">
            아직 질문이 없습니다.
          </p>
        )}
      </div>
    </div>
  );
}
