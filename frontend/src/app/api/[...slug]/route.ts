import { NextRequest, NextResponse } from "next/server";

function getBackendUrl() {
  const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
  return backendUrl.replace(/\/$/, "");
}

async function proxyRequest(request: NextRequest, slug: string[]) {
  const backendUrl = getBackendUrl();
  const pathname = slug.length > 0 ? `/${slug.join("/")}` : "/";
  const upstreamUrl = `${backendUrl}${pathname}`;

  try {
    const headers = new Headers(request.headers);
    headers.delete("host");
    headers.delete("content-length");

    const body = ["GET", "HEAD"].includes(request.method) ? undefined : await request.arrayBuffer();

    const upstreamResponse = await fetch(upstreamUrl, {
      method: request.method,
      headers,
      body,
      redirect: "manual",
    });

    const responseHeaders = new Headers();
    upstreamResponse.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (!["content-encoding", "transfer-encoding", "connection", "keep-alive"].includes(lowerKey)) {
        responseHeaders.set(key, value);
      }
    });

    const responseBody = await upstreamResponse.arrayBuffer();

    return new NextResponse(responseBody, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("API proxy error:", error);
    return NextResponse.json(
      {
        error: "Backend unavailable",
        detail: "The FastAPI backend is not reachable from this Vercel app.",
      },
      { status: 502 }
    );
  }
}

export async function GET(request: NextRequest, context: { params: Promise<{ slug?: string[] }> | { slug?: string[] } }) {
  const params = await context.params;
  return proxyRequest(request, params.slug ?? []);
}

export async function POST(request: NextRequest, context: { params: Promise<{ slug?: string[] }> | { slug?: string[] } }) {
  const params = await context.params;
  return proxyRequest(request, params.slug ?? []);
}

export async function PUT(request: NextRequest, context: { params: Promise<{ slug?: string[] }> | { slug?: string[] } }) {
  const params = await context.params;
  return proxyRequest(request, params.slug ?? []);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ slug?: string[] }> | { slug?: string[] } }) {
  const params = await context.params;
  return proxyRequest(request, params.slug ?? []);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ slug?: string[] }> | { slug?: string[] } }) {
  const params = await context.params;
  return proxyRequest(request, params.slug ?? []);
}

export async function OPTIONS(request: NextRequest, context: { params: Promise<{ slug?: string[] }> | { slug?: string[] } }) {
  const params = await context.params;
  return proxyRequest(request, params.slug ?? []);
}
