import { createCookie } from "react-router";

const COOKIE_NAME = "pl_sid";
const ONE_YEAR = 60 * 60 * 24 * 365;

export function sessionCookie(secret: string) {
  return createCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secrets: [secret],
    secure: true,
    maxAge: ONE_YEAR,
  });
}

export async function readOrIssueSession(
  request: Request,
  secret: string,
): Promise<{ sessionId: string; setCookie: string | null }> {
  const cookie = sessionCookie(secret);
  const existing = (await cookie.parse(request.headers.get("Cookie"))) as
    | string
    | null;
  if (existing) return { sessionId: existing, setCookie: null };

  const sessionId = crypto.randomUUID();
  const setCookie = await cookie.serialize(sessionId);
  return { sessionId, setCookie };
}
