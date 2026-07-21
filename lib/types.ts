export type ModeId =
  | "exegesis"
  | "theology"
  | "voices"
  | "application"
  | "outline"
  | "review";

export type ResultKey = ModeId | "qa";

export interface ModeMeta {
  id: ModeId;
  label: string;
  short: string;
  icon: string;
  blurb: string;
}

// 설교가 깊어지는 실제 순서: 본문 → 신학 → 설교 유산 → 삶 → 설계 → 검토
export const MODES: ModeMeta[] = [
  {
    id: "exegesis",
    label: "본문 해석 · 원문",
    short: "본문 해석",
    icon: "🔎",
    blurb: "단락 경계·문맥·구조·원어·번역·본문비평을 묶어 본문의 의도를 정확히 찾습니다.",
  },
  {
    id: "theology",
    label: "신학 · 복음 · 통찰",
    short: "신학 통찰",
    icon: "🕯️",
    blurb: "본문에서 하나님과 인간, 그리스도와 복음, 교회를 향한 영적 핵심을 길어 올립니다.",
  },
  {
    id: "voices",
    label: "설교자 · 고전 · 교회사",
    short: "설교 유산",
    icon: "🏛️",
    blurb: "교부·종교개혁자·청교도·현대 강해자의 설교를 출처 중심으로 비교하고 배웁니다.",
  },
  {
    id: "application",
    label: "삶 · 목회 적용",
    short: "삶의 적용",
    icon: "👣",
    blurb: "청중의 마음과 현실에 복음이 닿도록 개인·가정·교회·일터의 구체적 순종을 설계합니다.",
  },
  {
    id: "outline",
    label: "설교 설계 · 개요",
    short: "설교 설계",
    icon: "✍️",
    blurb: "앞선 연구를 하나의 중심 문장과 흐름, 전환, 예화, 적용, 기도로 통합합니다.",
  },
  {
    id: "review",
    label: "본문 충실도 · 최종 검토",
    short: "최종 검토",
    icon: "🛡️",
    blurb: "원어·문맥·신학·출처·적용을 다시 대조해 과장과 오류를 잡고 설교를 다듬습니다.",
  },
];

const MODE_IDS = new Set<string>(MODES.map((mode) => mode.id));

export function isModeId(value: unknown): value is ModeId {
  return typeof value === "string" && MODE_IDS.has(value);
}

export interface SermonContext {
  passage: string;
  theme?: string;
  audience?: string;
  occasion?: string;
  pastoralNeed?: string;
  tradition?: string;
  preferredVoices?: string;
  duration?: string;
  notes?: string;
}

export interface SavedSession {
  id: string;
  passage: string;
  context: SermonContext;
  results: Partial<Record<ResultKey, string>>;
  qaLog?: { q: string; a: string }[];
  createdAt: number;
  updatedAt: number;
}
