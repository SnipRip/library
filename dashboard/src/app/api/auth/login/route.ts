import { NextResponse } from "next/server";

const DEV_ADMIN_USERNAME = "admin";
const DEV_ADMIN_PASSWORD = "Feelpain@1";
const DEV_ADMIN_TOKEN = "dev-admin-token";

function isDevAuthEnabled() {
  if (process.env.NODE_ENV === "production") return false;
  // Allows opting out in dev via env var.
  return (process.env.ENABLE_DEV_AUTH || "true").toLowerCase() === "true";
}

function getApiBaseUrl() {
  return process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  // Dev-only shortcut so the frontend can be exercised without the upstream API.
  if (isDevAuthEnabled() && body && typeof body === "object") {
    const maybe = body as Record<string, unknown>;
    const identifier = (maybe.email ?? maybe.username ?? maybe.identifier) as unknown;
    const password = maybe.password as unknown;

    if (typeof identifier === "string" && typeof password === "string") {
      if (identifier === DEV_ADMIN_USERNAME && password === DEV_ADMIN_PASSWORD) {
        return NextResponse.json(
          {
            token: DEV_ADMIN_TOKEN,
            user: {
              id: "dev-admin",
              username: DEV_ADMIN_USERNAME,
              role: "admin",
            },
          },
          { status: 200 },
        );
      }
    }
  }

  const baseUrl = getApiBaseUrl();

  try {
    const upstream = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const contentType = upstream.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const json = await upstream.json();
      return NextResponse.json(json, { status: upstream.status });
    }

    const text = await upstream.text();
    return NextResponse.json(
      {
        message: upstream.ok ? "Unexpected upstream response" : "Login failed",
        details: text?.slice(0, 500) || undefined,
      },
      { status: upstream.status || 500 },
    );
  } catch {
    return NextResponse.json(
      { message: "Auth service unreachable. Is the API server running on http://localhost:3001?" },
      { status: 502 },
    );
  }
}
