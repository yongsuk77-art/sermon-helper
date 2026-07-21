import { RESEARCH_SOURCES, sourceSearchText } from "@/lib/research";

export function ResearchLibrary({
  passage,
  onCopy,
}: {
  passage: string;
  onCopy: (text: string) => void;
}) {
  return (
    <aside className="mb-3 rounded-2xl border border-gold-200 bg-gold-50/60 p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-ink-900">검증된 공개 설교·고전 자료실</h2>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-ink-700/70">
            AI가 제안한 제목과 인용은 아래 원출처에서 다시 확인하세요. 서로 다른 시대와
            전통의 해석은 본문을 대신하는 정답이 아니라 비교하고 배우는 증언입니다.
          </p>
        </div>
        <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-gold-700">
          링크 확인 2026-07
        </span>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {RESEARCH_SOURCES.map((source) => (
          <div key={source.name} className="rounded-xl border border-ink-100 bg-white p-3">
            <div className="flex items-center justify-between gap-2">
              <a
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-bold text-gold-700 hover:underline"
              >
                {source.name} ↗
              </a>
              <span className="text-[10px] text-ink-700/50">{source.era}</span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-700/70">
              {source.description}
            </p>
            <button
              type="button"
              onClick={() => onCopy(sourceSearchText(source, passage))}
              disabled={!passage.trim()}
              className="mt-2 text-[11px] font-medium text-ink-700/60 hover:text-gold-700 hover:underline disabled:opacity-40"
            >
              이 본문 검색어 복사
            </button>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-ink-700/60">
        영문 사이트에서는 본문을 영어 표기(예: John 3:16–21)로 검색하면 더 정확합니다.
        저작권이 있는 현대 설교는 출처를 밝히고 아이디어를 그대로 베끼지 마세요.
      </p>
    </aside>
  );
}
