import "server-only";
import Anthropic from "@anthropic-ai/sdk";

export const MODEL = "claude-opus-5-5";

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY 환경 변수가 없습니다.");
  client ??= new Anthropic(); // ANTHROPIC_API_KEY 를 읽음
  return client;
}

interface GenerateOptions {
  system: string;
  prompt: string;
  effort: "low" | "medium" | "high";
  maxTokens: number;
  webSearch?: boolean;
}

// 서버 도구(web search)가 10회 루프 제한에 걸리면 pause_turn 으로 끊기므로 이어서 요청
const MAX_CONTINUATIONS = 3;

export async function generateText(options: GenerateOptions): Promise<string> {
  try {
    return await request(options);
  } catch (error) {
    if (error instanceof Anthropic.APIConnectionError) throw new Error("Claude API에 연결하지 못했습니다.");
    if (error instanceof Anthropic.APIError) {
      const detail = (error.error as { error?: { message?: string } } | undefined)?.error?.message ?? error.message;
      throw new Error(`Claude API 오류 (${error.status ?? "알 수 없음"}): ${detail}`);
    }
    throw error;
  }
}

async function request({ system, prompt, effort, maxTokens, webSearch }: GenerateOptions): Promise<string> {
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: prompt }];

  for (let i = 0; i <= MAX_CONTINUATIONS; i++) {
    const message = await getClient()
      .beta.messages.stream({
        model: MODEL,
        max_tokens: maxTokens,
        system,
        messages,
        thinking: { type: "adaptive" },
        output_config: { effort },
        // 안전 분류기가 거절하면 서버가 다른 모델로 다시 시도
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        ...(webSearch ? { tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 5 }] } : {}),
      })
      .finalMessage();

    if (message.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: message.content });
      continue;
    }
    if (message.stop_reason === "refusal") {
      throw new Error(`모델이 요청을 거절했습니다 (${message.stop_details?.category ?? "사유 없음"}).`);
    }
    if (message.stop_reason === "max_tokens") {
      throw new Error("모델 응답이 최대 길이에서 잘렸습니다.");
    }

    const text = message.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    if (!text) throw new Error("모델 응답에 텍스트가 없습니다.");
    return text;
  }
  throw new Error("자료 조사가 너무 길어져 중단했습니다.");
}
