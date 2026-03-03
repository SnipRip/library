import { NextResponse } from "next/server";

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
