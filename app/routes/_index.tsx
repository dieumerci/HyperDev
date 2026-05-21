import { data, Form, redirect, useNavigation } from "react-router";
import { desc, eq } from "drizzle-orm";
import { useEffect, useRef } from "react";

import type { Route } from "./+types/_index";
import { createDb } from "~/lib/db/client";
import { conversations, messages } from "~/lib/db/schema";
import { complete, LLMError, type Turn } from "~/lib/llm";
import { promptSchema } from "~/lib/validation";
import { readOrIssueSession } from "~/lib/session";
import { ApiKeyField } from "~/components/api-key-field";
import { Message } from "~/components/message";

export function meta() {
  return [{ title: "HyperDev" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.cloudflare.env;
  const { sessionId, setCookie } = await readOrIssueSession(
    request,
    env.SESSION_SECRET,
  );
  const db = createDb(env.DATABASE_URL);
  const url = new URL(request.url);
  const activeId = url.searchParams.get("c");

  const list = await db.query.conversations.findMany({
    where: eq(conversations.sessionId, sessionId),
    orderBy: [desc(conversations.createdAt)],
    limit: 50,
  });

  const active =
    activeId && list.some((c) => c.id === activeId)
      ? await db.query.messages.findMany({
          where: eq(messages.conversationId, activeId),
          orderBy: [messages.createdAt],
        })
      : [];

  return data(
    { conversations: list, activeId, messages: active },
    setCookie ? { headers: { "Set-Cookie": setCookie } } : undefined,
  );
}

export async function action({ request, context }: Route.ActionArgs) {
  const env = context.cloudflare.env;
  const { sessionId, setCookie } = await readOrIssueSession(
    request,
    env.SESSION_SECRET,
  );

  const form = await request.formData();
  const parsed = promptSchema.safeParse({
    prompt: form.get("prompt"),
    conversationId: form.get("conversationId") || undefined,
  });

  if (!parsed.success) {
    return data(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const userKey = (form.get("apiKey") as string | null)?.trim() || null;
  const apiKey = userKey || env.ANTHROPIC_API_KEY;

  const db = createDb(env.DATABASE_URL);

  let conversationId = parsed.data.conversationId;
  if (conversationId) {
    const owns = await db.query.conversations.findFirst({
      where: eq(conversations.id, conversationId),
      columns: { sessionId: true },
    });
    if (!owns || owns.sessionId !== sessionId) {
      return data({ error: "Conversation not found" }, { status: 404 });
    }
  } else {
    const [row] = await db
      .insert(conversations)
      .values({
        sessionId,
        title: parsed.data.prompt.slice(0, 60),
      })
      .returning({ id: conversations.id });
    conversationId = row.id;
  }

  const prior = await db.query.messages.findMany({
    where: eq(messages.conversationId, conversationId),
    orderBy: [messages.createdAt],
  });

  const history: Turn[] = [
    ...prior.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: parsed.data.prompt },
  ];

  let reply: string;
  try {
    reply = await complete(history, apiKey);
  } catch (err) {
    const status = err instanceof LLMError ? err.status : 500;
    const message =
      err instanceof LLMError ? err.message : "Unexpected server error";
    return data({ error: message }, { status });
  }

  await db.insert(messages).values([
    { conversationId, role: "user", content: parsed.data.prompt },
    { conversationId, role: "assistant", content: reply },
  ]);

  const headers = new Headers();
  if (setCookie) headers.append("Set-Cookie", setCookie);
  return redirect(`/?c=${conversationId}`, { headers });
}

export default function Index({ loaderData, actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const isSending = navigation.state === "submitting";
  const formRef = useRef<HTMLFormElement>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isSending && navigation.state === "idle") {
      formRef.current?.reset();
      promptRef.current?.focus();
    }
  }, [isSending, navigation.state]);

  return (
    <div className="flex h-dvh flex-col bg-neutral-50 text-neutral-900 md:flex-row">
      <aside className="border-b border-neutral-200 bg-white p-4 md:w-72 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold tracking-tight">HyperDev</h1>
          <a
            href="/"
            className="rounded-md border border-neutral-200 px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-100"
          >
            New chat
          </a>
        </div>

        <ul className="mt-4 max-h-48 space-y-1 overflow-y-auto md:max-h-full">
          {loaderData.conversations.length === 0 ? (
            <li className="text-sm text-neutral-500">No conversations yet.</li>
          ) : (
            loaderData.conversations.map((c) => {
              const active = c.id === loaderData.activeId;
              return (
                <li key={c.id}>
                  <a
                    href={`/?c=${c.id}`}
                    className={
                      "block truncate rounded-md px-2 py-1.5 text-sm " +
                      (active
                        ? "bg-neutral-900 text-white"
                        : "text-neutral-700 hover:bg-neutral-100")
                    }
                  >
                    {c.title || "Untitled"}
                  </a>
                </li>
              );
            })
          )}
        </ul>
      </aside>

      <main className="flex flex-1 flex-col">
        <div className="flex-1 overflow-y-auto p-4">
          {loaderData.messages.length === 0 ? (
            <p className="mx-auto mt-12 max-w-md text-center text-sm text-neutral-500">
              Send a prompt to get started. Your conversation will appear here.
            </p>
          ) : (
            <ol
              className="mx-auto flex max-w-2xl flex-col gap-4"
              aria-live="polite"
            >
              {loaderData.messages.map((m) => (
                <Message key={m.id} role={m.role} content={m.content} />
              ))}
            </ol>
          )}
        </div>

        <div className="border-t border-neutral-200 bg-white p-4">
          <Form
            ref={formRef}
            method="post"
            className="mx-auto flex max-w-2xl flex-col gap-2"
          >
            {loaderData.activeId && (
              <input
                type="hidden"
                name="conversationId"
                value={loaderData.activeId}
              />
            )}
            <ApiKeyField />
            <div className="flex items-end gap-2">
              <textarea
                ref={promptRef}
                name="prompt"
                rows={2}
                required
                aria-label="Prompt"
                placeholder="Ask anything..."
                className="flex-1 resize-none rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    e.currentTarget.form?.requestSubmit();
                  }
                }}
              />
              <button
                type="submit"
                disabled={isSending}
                className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {isSending ? "Sending" : "Send"}
              </button>
            </div>
            {actionData && "error" in actionData && (
              <p role="alert" className="text-sm text-red-600">
                {actionData.error}
              </p>
            )}
          </Form>
        </div>
      </main>
    </div>
  );
}
