import { describe, expect, it, vi, beforeEach } from "vitest";

const createMock = vi.fn();

vi.mock("@anthropic-ai/sdk", () => {
  class APIError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  }
  function Anthropic(this: { messages: { create: typeof createMock } }) {
    this.messages = { create: createMock };
  }
  (Anthropic as unknown as { APIError: typeof APIError }).APIError = APIError;
  return { default: Anthropic };
});

import Anthropic from "@anthropic-ai/sdk";
import { complete, LLMError } from "./llm";

beforeEach(() => createMock.mockReset());

describe("complete", () => {
  it("returns concatenated text blocks", async () => {
    createMock.mockResolvedValueOnce({
      content: [
        { type: "text", text: "hello " },
        { type: "tool_use" },
        { type: "text", text: "world" },
      ],
    });
    const out = await complete([{ role: "user", content: "hi" }], "k");
    expect(out).toBe("hello world");
  });

  it("rejects when no API key is supplied", async () => {
    await expect(
      complete([{ role: "user", content: "hi" }], ""),
    ).rejects.toBeInstanceOf(LLMError);
  });

  it("wraps SDK errors as LLMError with status", async () => {
    const ApiError = (Anthropic as unknown as {
      APIError: new (msg: string, status: number) => Error;
    }).APIError;
    createMock.mockRejectedValueOnce(new ApiError("bad", 429));
    await expect(
      complete([{ role: "user", content: "hi" }], "k"),
    ).rejects.toMatchObject({ status: 429 });
  });

  it("treats an empty response as a 502", async () => {
    createMock.mockResolvedValueOnce({ content: [{ type: "text", text: "" }] });
    await expect(
      complete([{ role: "user", content: "hi" }], "k"),
    ).rejects.toMatchObject({ status: 502 });
  });
});
