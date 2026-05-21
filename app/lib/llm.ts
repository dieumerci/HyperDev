import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-haiku-4-5-20251001";
const MAX_TOKENS = 1024;
const SYSTEM_PROMPT =
  "You are a concise, helpful assistant. Prefer short, direct answers.";

export type Turn = { role: "user" | "assistant"; content: string };

export class LLMError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function complete(
  history: Turn[],
  apiKey: string,
): Promise<string> {
  if (!apiKey) {
    throw new LLMError("Missing Anthropic API key.", 500);
  }

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: history.map((t) => ({ role: t.role, content: t.content })),
    });

    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");

    if (!text) {
      throw new LLMError("Empty response from model.", 502);
    }
    return text;
  } catch (err) {
    if (err instanceof LLMError) throw err;
    if (err instanceof Anthropic.APIError) {
      throw new LLMError(err.message, err.status ?? 502);
    }
    throw new LLMError("LLM request failed.", 502);
  }
}
