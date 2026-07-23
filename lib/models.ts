// 앱에서 고를 수 있는 AI 목록. 클라이언트 드롭다운 + 서버 검증에 공용으로 쓴다.
export type Provider = "free" | "claude" | "openai" | "gemini";

export interface AiOption {
  key: string; // 드롭다운 값
  provider: Provider;
  model: string; // 빈 문자열이면 서버의 환경변수 기본값 사용
  label: string;
  note: string;
}

export const AI_OPTIONS: AiOption[] = [
  {
    key: "free",
    provider: "free",
    model: "",
    label: "AI 없이 기본값",
    note: "API 키·비용 없음",
  },
  {
    key: "claude-opus",
    provider: "claude",
    model: "claude-opus-4-8",
    label: "Claude Opus 4.8",
    note: "최고 품질 · 원어/신학 최강",
  },
  {
    key: "claude-sonnet",
    provider: "claude",
    model: "claude-sonnet-5",
    label: "Claude Sonnet 5",
    note: "빠르고 저렴 · 균형",
  },
  {
    key: "claude-haiku",
    provider: "claude",
    model: "claude-haiku-4-5",
    label: "Claude Haiku 4.5",
    note: "가장 빠름 · 간단한 작업",
  },
  {
    key: "openai",
    provider: "openai",
    model: "", // 서버 OPENAI_MODEL 기본값(gpt-4o)
    label: "GPT (OpenAI)",
    note: "OpenAI API 키 필요",
  },
  {
    key: "gemini",
    provider: "gemini",
    model: "", // 서버 GEMINI_MODEL 기본값(gemini-3.5-flash)
    label: "Gemini (Google)",
    note: "Google AI Studio 키 필요",
  },
];

export const DEFAULT_AI_KEY = "free";

export function findAi(key: string): AiOption {
  return AI_OPTIONS.find((o) => o.key === key) || AI_OPTIONS[0];
}
