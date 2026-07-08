// 앱 화면 설정 (글자 크기 · 강조 색). 기기에 저장하고 CSS로 적용한다.
export interface AppSettings {
  readingSize: number; // 결과/본문 글자 크기(px)
  accent: string; // 강조 색 키
  serif: boolean; // 결과를 명조(세리프)로 볼지
}

export const SIZE_OPTIONS = [
  { key: "s", label: "작게", px: 14 },
  { key: "m", label: "보통", px: 16 },
  { key: "l", label: "크게", px: 18 },
  { key: "xl", label: "아주 크게", px: 21 },
  { key: "xxl", label: "최대", px: 24 },
];

export const ACCENT_OPTIONS = [
  { key: "gold", label: "골드", color: "#9a7322" },
  { key: "blue", label: "블루", color: "#2563eb" },
  { key: "green", label: "그린", color: "#16a34a" },
  { key: "purple", label: "퍼플", color: "#7c3aed" },
  { key: "rose", label: "로즈", color: "#e11d48" },
  { key: "teal", label: "청록", color: "#0d9488" },
];

export const DEFAULT_SETTINGS: AppSettings = {
  readingSize: 16,
  accent: "gold",
  serif: false,
};

const KEY = "sermon-helper:settings";

export function loadSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<AppSettings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: AppSettings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* 무시 */
  }
}

export function applySettings(s: AppSettings) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--reading-size", `${s.readingSize}px`);
  root.style.setProperty(
    "--reading-font",
    s.serif ? "Georgia, 'Nanum Myeongjo', serif" : "inherit",
  );
  root.setAttribute("data-accent", s.accent);
}
