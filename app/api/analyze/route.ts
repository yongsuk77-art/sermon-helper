import Anthropic from "@anthropic-ai/sdk";
import { buildMessages, buildQaMessages } from "@/lib/prompts";
import { isModeId, type ModeId, type SermonContext } from "@/lib/types";
import type { Provider } from "@/lib/models";

export const runtime = "nodejs";
export const maxDuration = 300;

const EFFORT = (process.env.SERMON_EFFORT || "high") as
  | "low"
  | "medium"
  | "high"
  | "xhigh";
type AiProvider = Exclude<Provider, "free">;

interface Body {
  mode: ModeId | "qa";
  context: SermonContext;
  provider?: Provider;
  model?: string;
  question?: string;
  priorResults?: string;
}

type OnText = (t: string) => void;
interface RunArgs {
  model: string;
  system: string;
  user: string;
}

function normalizeProvider(value: unknown): Provider {
  if (
    value === "free" ||
    value === "claude" ||
    value === "openai" ||
    value === "gemini"
  ) {
    return value;
  }
  return "claude";
}

function providerLabel(provider: AiProvider) {
  if (provider === "openai") return "OpenAI";
  if (provider === "gemini") return "Gemini";
  return "Claude";
}

function getErrorText(err: unknown) {
  const parts: string[] = [];
  if (err instanceof Error) parts.push(err.message);
  if (err && typeof err === "object") {
    const info = err as {
      status?: unknown;
      type?: unknown;
      code?: unknown;
      error?: unknown;
    };
    if (info.status) parts.push(String(info.status));
    if (info.type) parts.push(String(info.type));
    if (info.code) parts.push(String(info.code));
    if (info.error) {
      try {
        parts.push(JSON.stringify(info.error));
      } catch {
        parts.push(String(info.error));
      }
    }
  }
  return parts.join(" ");
}

function formatProviderError(provider: AiProvider, err: unknown) {
  const raw = getErrorText(err) || String(err || "");
  const lower = raw.toLowerCase();
  const label = providerLabel(provider);

  if (
    lower.includes("authentication_error") ||
    lower.includes("api_key") ||
    lower.includes("invalid x-api-key") ||
    lower.includes("incorrect api key") ||
    lower.includes("invalid api key") ||
    lower.includes("설정되지") ||
    lower.includes("401")
  ) {
    const envName =
      provider === "openai"
        ? "OPENAI_API_KEY"
        : provider === "gemini"
          ? "GEMINI_API_KEY"
          : "ANTHROPIC_API_KEY";
    return `${label} API 키가 없거나 올바르지 않습니다. Vercel Project Settings > Environment Variables에서 ${envName} 값을 새 키로 저장한 뒤 Redeploy 해 주세요.`;
  }

  if (
    lower.includes("model") &&
    (lower.includes("not found") ||
      lower.includes("not_found") ||
      lower.includes("invalid"))
  ) {
    const modelName =
      provider === "openai"
        ? "OPENAI_MODEL"
        : provider === "gemini"
          ? "GEMINI_MODEL"
          : "SERMON_MODEL";
    return `${label} 모델 이름을 확인해 주세요. Vercel 환경 변수 ${modelName} 값이 현재 API에서 사용 가능한 모델 ID여야 합니다.`;
  }

  if (
    lower.includes("quota") ||
    lower.includes("billing") ||
    lower.includes("credit") ||
    lower.includes("insufficient") ||
    lower.includes("usage limit") ||
    lower.includes("rate_limit")
  ) {
    return `${label} 계정의 사용량 한도나 결제 상태를 확인해 주세요.`;
  }

  return `${label} 호출 중 문제가 발생했습니다. 잠시 후 다시 시도하거나 다른 AI를 선택해 주세요.`;
}

// ── 공통 SSE 리더 (OpenAI · Gemini) ─────────────────────────
async function readSSE(
  res: Response,
  onData: (json: any) => void,
  doneToken?: string,
) {
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let buf = "";
  const handle = (line: string) => {
    const t = line.trim();
    if (!t.startsWith("data:")) return;
    const data = t.slice(5).trim();
    if (!data || (doneToken && data === doneToken)) return;
    try {
      onData(JSON.parse(data));
    } catch {
      /* 부분 청크 무시 */
    }
  };
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) handle(line);
  }
  if (buf) handle(buf);
}

// ── Claude ──────────────────────────────────────────────────
async function runClaude(onText: OnText, { model, system, user }: RunArgs) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey)
    throw new Error(
      "ANTHROPIC_API_KEY가 설정되지 않았습니다. Vercel 환경 변수에 추가하세요.",
    );
  const client = new Anthropic({ apiKey });
  const params = {
    model,
    max_tokens: 20000,
    thinking: { type: "adaptive" },
    output_config: { effort: EFFORT },
    system,
    messages: [{ role: "user", content: user }],
  } as unknown as Anthropic.MessageStreamParams;
  const stream = client.messages.stream(params);
  stream.on("text", onText);
  await stream.finalMessage();
}

// ── OpenAI (GPT) ────────────────────────────────────────────
async function runOpenAI(onText: OnText, { model, system, user }: RunArgs) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey)
    throw new Error(
      "OPENAI_API_KEY가 설정되지 않았습니다. Vercel 환경 변수에 OpenAI 키를 추가하세요.",
    );
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      stream: true,
      max_tokens: 8000,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) {
    throw new Error(`OpenAI 오류 ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  await readSSE(
    res,
    (j) => {
      const d = j?.choices?.[0]?.delta?.content;
      if (d) onText(d);
    },
    "[DONE]",
  );
}

// ── Gemini (Google) ─────────────────────────────────────────
async function runGemini(onText: OnText, { model, system, user }: RunArgs) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey)
    throw new Error(
      "GEMINI_API_KEY가 설정되지 않았습니다. Vercel 환경 변수에 Google AI 키를 추가하세요.",
    );
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: { maxOutputTokens: 8192 },
    }),
  });
  if (!res.ok) {
    throw new Error(`Gemini 오류 ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  await readSSE(res, (j) => {
    const parts = j?.candidates?.[0]?.content?.parts;
    if (Array.isArray(parts)) for (const p of parts) if (p?.text) onText(p.text);
  });
}

function resolveModel(provider: AiProvider, clientModel?: string): string {
  if (provider === "openai") return process.env.OPENAI_MODEL || "gpt-4o";
  if (provider === "gemini") return process.env.GEMINI_MODEL || "gemini-3.5-flash";
  // claude — 클라이언트가 고른 티어만 허용(안전)
  if (clientModel && clientModel.startsWith("claude-")) return clientModel;
  return process.env.SERMON_MODEL || "claude-opus-4-8";
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const { mode, context, question } = body;
  const priorResults = (body.priorResults || "").slice(0, 30000);
  const provider = normalizeProvider(body.provider);
  if (!context?.passage?.trim()) {
    return Response.json({ error: "성경 본문을 입력하세요." }, { status: 400 });
  }
  if (mode === "qa" && !question?.trim()) {
    return Response.json({ error: "질문을 입력하세요." }, { status: 400 });
  }
  if (mode !== "qa" && !isModeId(mode)) {
    return Response.json({ error: "지원하지 않는 연구 단계입니다." }, { status: 400 });
  }
  if (provider === "free") {
    return Response.json(
      { error: "AI 없이 기본값 모드는 API 호출이 필요 없습니다." },
      { status: 400 },
    );
  }

  const { system, user } =
    mode === "qa"
      ? buildQaMessages(context, question || "", priorResults || "")
      : buildMessages(mode, context, priorResults);

  const model = resolveModel(provider, body.model);
  const args: RunArgs = { model, system, user };

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const onText: OnText = (t) => controller.enqueue(encoder.encode(t));
      try {
        if (provider === "openai") await runOpenAI(onText, args);
        else if (provider === "gemini") await runGemini(onText, args);
        else await runClaude(onText, args);
      } catch (err) {
        controller.enqueue(
          encoder.encode(`\n\n⚠️ AI 연결 오류: ${formatProviderError(provider, err)}`),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
