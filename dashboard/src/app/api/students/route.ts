import { NextResponse } from "next/server";

function getApiBaseUrl() {
  return process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";
}

export async function GET(req: Request) {
  const baseUrl = getApiBaseUrl();
  const url = new URL(req.url);

  try {
    const upstream = await fetch(`${baseUrl}/students${url.search}`, {
      method: "GET",
      headers: {
        Authorization: req.headers.get("authorization") || "",
      },
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
        message: upstream.ok ? "Unexpected upstream response" : "Failed to load students",
        details: text?.slice(0, 500) || undefined,
      },
      { status: upstream.status || 500 },
    );
  } catch {
    return NextResponse.json(
      { message: "Student service unreachable. Is the API server running and reachable?" },
      { status: 502 },
    );
  }
}

export async function POST(req: Request) {
  const baseUrl = getApiBaseUrl();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const upstream = await fetch(`${baseUrl}/students`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: req.headers.get("authorization") || "",
      },
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
        message: upstream.ok ? "Unexpected upstream response" : "Failed to create student",
        details: text?.slice(0, 500) || undefined,
      },
      { status: upstream.status || 500 },
    );
  } catch {
    return NextResponse.json(
      { message: "Student service unreachable. Is the API server running and reachable?" },
      { status: 502 },
    );
  }
}
