import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const COOKIE_NAME = "osint_gate";
const COOKIE_MAX_AGE = 60 * 60 * 12; // 12 hours
const encoder = new TextEncoder();

function base64Url(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function hmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(message),
  );

  return base64Url(signature);
}

function safeRedirectPath(value: FormDataEntryValue | null): string {
  const path = String(value ?? "/");

  // Only permit internal relative paths.
  if (!path.startsWith("/") || path.startsWith("//")) {
    return "/";
  }

  return path;
}

export async function POST(request: NextRequest): Promise<Response> {
  const secret = process.env.GATE_SECRET;
  const expectedPasscode = process.env.GATE_PASSCODE;

  if (!secret || !expectedPasscode) {
    return new Response(
      "Gate misconfigured: GATE_SECRET or GATE_PASSCODE is missing.",
      {
        status: 500,
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "cache-control": "no-store",
        },
      },
    );
  }

  const formData = await request.formData();
  const submittedPasscode = String(formData.get("passcode") ?? "");
  const nextPath = safeRedirectPath(formData.get("next"));

  if (submittedPasscode !== expectedPasscode) {
    return new Response(
      `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <title>Access denied</title>
  <style>
    html,body {
      margin:0;
      min-height:100%;
      background:#0B0F14;
      color:#E8EAED;
      font-family:system-ui,sans-serif;
    }
    main {
      min-height:100vh;
      display:flex;
      align-items:center;
      justify-content:center;
      padding:24px;
    }
    section {
      width:100%;
      max-width:360px;
      padding:24px;
      background:#10161D;
      border:1px solid #27313D;
    }
    h1 { color:#D4A84A; font-size:18px; }
    p { color:#FCA5A5; }
    a { color:#D4A84A; }
  </style>
</head>
<body>
  <main>
    <section>
      <h1>RUPES OSINT</h1>
      <p>Invalid access code.</p>
      <a href="${nextPath}">Try again</a>
    </section>
  </main>
</body>
</html>`,
      {
        status: 401,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store",
          "x-robots-tag": "noindex, nofollow",
        },
      },
    );
  }

  const timestamp = Date.now().toString();
  const signature = await hmac(secret, timestamp);

  const response = NextResponse.redirect(
    new URL(nextPath, request.url),
    303,
  );

  response.cookies.set(
    COOKIE_NAME,
    `${timestamp}.${signature}`,
    {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: COOKIE_MAX_AGE,
    },
  );

  return response;
}

export function GET(request: NextRequest): Response {
  return NextResponse.redirect(new URL("/", request.url), 303);
}
