"use client";

import { useCallback, useRef, useState } from "react";
import { processManuscript, type ManuscriptResult } from "@/lib/manuscript";

export default function ManuscriptModal({ onClose }: { onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [result, setResult] = useState<ManuscriptResult | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setResult(null);
    setError("");
    setLog([]);
  };

  const start = useCallback(async () => {
    if (!file || busy) return;
    reset();
    setBusy(true);
    try {
      const r = await processManuscript(file, (m) =>
        setLog((p) => [...p, m]),
      );
      setResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "처리 중 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  }, [file, busy]);

  const download = useCallback(() => {
    if (!result || !file) return;
    const base = file.name.replace(/\.docx$/i, "");
    const url = URL.createObjectURL(result.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${base}_구절삽입.docx`;
    a.click();
    URL.revokeObjectURL(url);
  }, [result, file]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onClose}
    >
      <div
        className="safe-pb max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-base font-bold text-ink-900">
            📄 원고에 성경구절 삽입
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-ink-700 hover:bg-ink-50"
          >
            닫기 ✕
          </button>
        </div>
        <p className="mb-4 text-xs leading-relaxed text-ink-700/70">
          설교 원고 워드(.docx)를 올리면, 원고 속 성경구절(예: 요한복음 3:16)을
          찾아 <b>개역개정 본문을 네모 박스</b>로 그 문단 아래에 넣어 드립니다.
          원본 서식은 그대로 유지됩니다.
        </p>

        {/* 파일 선택 */}
        <div className="mb-3">
          <button
            onClick={() => inputRef.current?.click()}
            className="w-full rounded-xl border-2 border-dashed border-ink-100 py-6 text-sm text-ink-700 hover:bg-ink-50"
          >
            {file ? (
              <>
                📎 <b>{file.name}</b>
                <br />
                <span className="text-xs text-ink-700/60">다른 파일 선택</span>
              </>
            ) : (
              <>워드 원고(.docx) 선택하기</>
            )}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0] || null;
              setFile(f);
              reset();
              e.target.value = "";
            }}
          />
        </div>

        {/* 시작 버튼 */}
        {file && !result && (
          <button
            onClick={start}
            disabled={busy}
            className="mb-3 w-full rounded-xl bg-gold-600 py-3 text-sm font-semibold text-white hover:bg-gold-500 disabled:opacity-50"
          >
            {busy ? "처리 중…" : "✨ 개역개정 구절 삽입하기"}
          </button>
        )}

        {/* 진행 로그 */}
        {log.length > 0 && !result && (
          <div className="mb-3 rounded-lg bg-ink-50 p-3 text-xs text-ink-700">
            {log.map((l, i) => (
              <p key={i}>• {l}</p>
            ))}
          </div>
        )}

        {/* 오류 */}
        {error && (
          <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            ⚠️ {error}
          </div>
        )}

        {/* 결과 */}
        {result && (
          <div className="space-y-3">
            <div className="rounded-lg bg-green-50 p-3 text-sm text-green-800">
              ✅ 성경구절 <b>{result.insertedLabels.length}개</b>의 개역개정
              본문을 삽입했습니다.
              {result.failedLabels.length > 0 && (
                <div className="mt-1 text-xs text-red-600">
                  불러오지 못한 구절: {result.failedLabels.join(", ")}
                </div>
              )}
            </div>
            <button
              onClick={download}
              className="w-full rounded-xl bg-gold-600 py-3 text-sm font-semibold text-white hover:bg-gold-500"
            >
              ⬇️ 완성된 워드 문서 내려받기
            </button>
            <details className="text-xs text-ink-700/70">
              <summary className="cursor-pointer">삽입된 구절 목록 보기</summary>
              <p className="mt-1 leading-relaxed">
                {result.insertedLabels.join(" · ")}
              </p>
            </details>
          </div>
        )}

        <p className="mt-4 text-[11px] leading-relaxed text-ink-700/50">
          본문 출처: 대한성서공회(개역개정). 개인 설교 준비용으로만 사용하세요.
          구절은 「책 장:절」 또는 「책 장:절-절」 형식을 인식합니다.
        </p>
      </div>
    </div>
  );
}
