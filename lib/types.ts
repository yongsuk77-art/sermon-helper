export type ModeId =
  | "original"
  | "insight"
  | "translations"
  | "jewish"
  | "commentary"
  | "outline";

export interface ModeMeta {
  id: ModeId;
  label: string; // 탭 라벨
  short: string; // 짧은 이름
  icon: string; // 이모지
  blurb: string; // 한 줄 설명
}

// 분석 순서 = 설교 준비 순서 (원어 → 통찰 → 번역 → 유대 → 주석 → 개요)
export const MODES: ModeMeta[] = [
  {
    id: "original",
    label: "원어 분석 · 파싱",
    short: "원어",
    icon: "📜",
    blurb: "히브리어/헬라어 단어별 분해, 어형(파싱), 핵심 단어 의미와 어근",
  },
  {
    id: "insight",
    label: "영적 통찰",
    short: "통찰",
    icon: "🕊️",
    blurb: "그리스도 중심 해석, 핵심 주제, 신학적 통찰과 적용의 씨앗",
  },
  {
    id: "translations",
    label: "번역본 비교",
    short: "번역",
    icon: "📖",
    blurb: "개역개정·새번역·공동번역·NIV·ESV·KJV·직역 대조와 차이 분석",
  },
  {
    id: "jewish",
    label: "유대적 관점",
    short: "유대",
    icon: "✡️",
    blurb: "미드라쉬·탈무드·타르굼, PaRDeS 해석, 제2성전기 배경",
  },
  {
    id: "commentary",
    label: "주석 · 강해",
    short: "주석",
    icon: "🗂️",
    blurb: "본문 구조, 절별 주석, 역사·문법적 해석",
  },
  {
    id: "outline",
    label: "설교 개요",
    short: "설교",
    icon: "✍️",
    blurb: "제목·핵심 한 문장·서론·대지·예화·적용·결론·기도",
  },
];

export interface SermonContext {
  passage: string; // 본문 (예: 요한복음 3:16-21)
  theme?: string; // 설교 주제/방향
  audience?: string; // 청중 (장년/청년/새신자 등)
  occasion?: string; // 절기/상황 (주일/부활절/심방 등)
  notes?: string; // 추가 메모
}

export interface SavedSession {
  id: string;
  passage: string;
  context: SermonContext;
  results: Partial<Record<ModeId | "qa", string>>;
  qaLog?: { q: string; a: string }[];
  createdAt: number;
  updatedAt: number;
}
