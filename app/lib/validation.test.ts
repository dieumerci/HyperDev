import { describe, expect, it } from "vitest";
import { promptSchema } from "./validation";

describe("promptSchema", () => {
  it("trims and accepts a normal prompt", () => {
    const r = promptSchema.parse({ prompt: "  hello  " });
    expect(r.prompt).toBe("hello");
  });

  it("rejects empty prompts", () => {
    expect(() => promptSchema.parse({ prompt: "   " })).toThrow();
  });

  it("rejects prompts over 4000 chars", () => {
    expect(() =>
      promptSchema.parse({ prompt: "a".repeat(4001) }),
    ).toThrow();
  });

  it("rejects malformed conversation ids", () => {
    expect(() =>
      promptSchema.parse({ prompt: "ok", conversationId: "not-a-uuid" }),
    ).toThrow();
  });

  it("accepts a valid uuid conversation id", () => {
    const id = "550e8400-e29b-41d4-a716-446655440000";
    const r = promptSchema.parse({ prompt: "ok", conversationId: id });
    expect(r.conversationId).toBe(id);
  });
});
