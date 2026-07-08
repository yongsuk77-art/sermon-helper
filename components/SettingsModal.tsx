"use client";

import {
  type AppSettings,
  SIZE_OPTIONS,
  ACCENT_OPTIONS,
  DEFAULT_SETTINGS,
} from "@/lib/settings";

export default function SettingsModal({
  settings,
  onChange,
  onClose,
}: {
  settings: AppSettings;
  onChange: (s: AppSettings) => void;
  onClose: () => void;
}) {
  const set = (patch: Partial<AppSettings>) =>
    onChange({ ...settings, ...patch });

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onClose}
    >
      <div
        className="safe-pb max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-ink-900">⚙️ 설정</h2>
          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-ink-700 hover:bg-ink-50"
          >
            닫기 ✕
          </button>
        </div>

        {/* 글자 크기 */}
        <section className="mb-5">
          <p className="mb-2 text-sm font-semibold text-ink-800">글자 크기</p>
          <div className="flex flex-wrap gap-1.5">
            {SIZE_OPTIONS.map((o) => {
              const on = settings.readingSize === o.px;
              return (
                <button
                  key={o.key}
                  onClick={() => set({ readingSize: o.px })}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    on
                      ? "border-gold-500 bg-gold-600 text-white"
                      : "border-ink-100 text-ink-700 hover:bg-ink-50"
                  }`}
                  style={{ fontSize: Math.min(o.px, 18) }}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
          <p
            className="mt-3 rounded-lg bg-ink-50 px-3 py-2 text-ink-800"
            style={{ fontSize: settings.readingSize }}
          >
            가나다 미리보기 — 이 크기로 분석 결과가 보입니다.
          </p>
        </section>

        {/* 강조 색 */}
        <section className="mb-5">
          <p className="mb-2 text-sm font-semibold text-ink-800">앱 강조 색</p>
          <div className="flex flex-wrap gap-2">
            {ACCENT_OPTIONS.map((a) => {
              const on = settings.accent === a.key;
              return (
                <button
                  key={a.key}
                  onClick={() => set({ accent: a.key })}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${
                    on ? "border-ink-800" : "border-ink-100"
                  }`}
                >
                  <span
                    className="inline-block h-4 w-4 rounded-full"
                    style={{ backgroundColor: a.color }}
                  />
                  {a.label}
                  {on ? " ✓" : ""}
                </button>
              );
            })}
          </div>
        </section>

        {/* 글꼴 */}
        <section className="mb-5">
          <p className="mb-2 text-sm font-semibold text-ink-800">결과 글꼴</p>
          <div className="flex gap-1.5">
            <button
              onClick={() => set({ serif: false })}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                !settings.serif
                  ? "border-gold-500 bg-gold-600 text-white"
                  : "border-ink-100 text-ink-700 hover:bg-ink-50"
              }`}
            >
              고딕 (기본)
            </button>
            <button
              onClick={() => set({ serif: true })}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                settings.serif
                  ? "border-gold-500 bg-gold-600 text-white"
                  : "border-ink-100 text-ink-700 hover:bg-ink-50"
              }`}
              style={{ fontFamily: "Georgia, 'Nanum Myeongjo', serif" }}
            >
              명조 (세리프)
            </button>
          </div>
        </section>

        <button
          onClick={() => onChange({ ...DEFAULT_SETTINGS })}
          className="w-full rounded-lg border border-ink-100 py-2 text-sm text-ink-700 hover:bg-ink-50"
        >
          기본값으로 되돌리기
        </button>
      </div>
    </div>
  );
}
