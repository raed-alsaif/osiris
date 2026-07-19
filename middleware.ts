import { NextRequest, NextResponse } from "next/server";

const PASSCODE = process.env.GATE_PASSCODE?.trim() ?? "00100";
const SECRET = process.env.GATE_SECRET ?? "";
const COOKIE_NAME = "osiris_gate";
const MAX_AGE_SECONDS = 12 * 60 * 60;

const BYPASS_PATHS = ["/_next/static", "/static", "/favicon.ico", "/robots.txt"];

function isBypass(path: string) {
  return BYPASS_PATHS.some((p) => path.startsWith(p));
}

async function sign(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  const b64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
  return `${value}.${b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;
}

async function verify(token: string): Promise<boolean> {
  const lastDot = token.lastIndexOf(".");
  if (lastDot === -1 || !SECRET) return false;
  const value = token.slice(0, lastDot);
  const expected = await sign(value);
  return token === expected && value === PASSCODE;
}

function gateHtml(error?: string): string {
  const errorBlock = error
    ? `<div class="err"><p>${error}</p></div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Protected | RUPES OSINT</title>
  <style>
    * { box-sizing: border-box; }
    html, body {
      margin: 0; height: 100%;
      background: #0B0F14; color: #E5E7EB;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex; align-items: center; justify-content: center;
    }
    .card {
      background: #10161D; border: 1px solid #1F2937;
      border-radius: 12px; padding: 40px;
      width: 100%; max-width: 400px; text-align: center;
      box-shadow: 0 20px 40px rgba(0,0,0,0.35);
    }
    .logo { color: #D4A84A; font-weight: 700; font-size: 22px; letter-spacing: 0.05em; margin-bottom: 8px; }
    .subtitle { color: #9CA3AF; font-size: 14px; margin-bottom: 28px; }
    input {
      width: 100%; padding: 14px; font-size: 18px;
      letter-spacing: 0.25em; text-align: center;
      background: #0B0F14; border: 1px solid #374151;
      border-radius: 8px; color: #F9FAFB; outline: none; margin-bottom: 16px;
    }
    input:focus { border-color: #D4A84A; }
    button {
      width: 100%; padding: 14px; background: #D4A84A;
      color: #0B0F14; border: none; border-radius: 8px;
      font-weight: 700; font-size: 16px; cursor: pointer;
    }
    button:hover { background: #C49A3F; }
    .err {
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.35);
      border-radius: 8px; padding: 12px; margin-bottom: 16px;
      color: #FCA5A5; font-size: 14px;
    }
  </style>
</head>
<body>
  <form class="card" method="post" action="/___gate/unlock">
    <div class="logo">RUPES OSINT</div>
    <div class="subtitle">Enter access code to continue</div>
    ${errorBlock}
    <input name="passcode" type="password" inputmode="numeric" pattern="[0-9]*"
      maxlength="10" autocomplete="off" placeholder="•••••" required autofocus />
    <button type="submit">Unlock</button>
  </form>
</body>
</html>`;
}

export async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const path = url.pathname;

  if (isBypass(path)) return NextResponse.next();

  if (path === "/___gate/unlock" && req.method === "POST") {
    const form = await req.formData();
    const entered = String(form.get("passcode") ?? "").trim();

    if (entered === PASSCODE) {
      const token = await sign(PASSCODE);
      const res = NextResponse.redirect(new URL("/", req.url));
      res.cookies.set(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: MAX_AGE_SECONDS,
        path: "/",
      });
      return res;
    }

    const html = gateHtml("Access denied. The code you entered is incorrect.");
    return new NextResponse(html, {
      status: 401,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  const valid = cookie ? await verify(cookie) : false;

  if (!valid) {
    return new NextResponse(gateHtml(), {
      status: 403,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
