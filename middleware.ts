// Vercel Edge Middleware — passcode gate for osiris.raedalsaif.com
// Place at repo root as `middleware.ts`. Runs on every request before any asset is served.
//
// Required Vercel env vars (Project Settings → Environment Variables):
//   GATE_PASSCODE   e.g. 00100
//   GATE_SECRET     any long random string (used to sign the unlock cookie)

import { NextRequest, NextResponse } from 'next/server';

export const config = {
  // Match everything except Next internals + the unlock endpoint itself.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|gate/unlock).*)'],
};

const COOKIE_NAME = 'osint_gate';
const COOKIE_MAX_AGE = 60 * 60 * 12; // 12h

const enc = new TextEncoder();

async function hmac(secret: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(msg));
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function isValidCookie(value: string | undefined, secret: string): Promise<boolean> {
  if (!value) return false;
  const [ts, sig] = value.split('.');
  if (!ts || !sig) return false;
  const age = Date.now() - Number(ts);
  if (!Number.isFinite(age) || age < 0 || age > COOKIE_MAX_AGE * 1000) return false;
  const expected = await hmac(secret, ts);
  return expected === sig;
}

function gatePage(error?: string): Response {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>RUPES OSINT · Restricted</title>
<style>
  :root { color-scheme: dark; }
  html,body { margin:0; height:100%; background:#0B0F14; color:#E8EAED; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  .wrap { min-height:100dvh; display:flex; align-items:center; justify-content:center; padding:24px; }
  form { width:100%; max-width:360px; background:hsl(220 20% 7%); border:1px solid hsl(220 15% 14%); padding:24px; }
  .tag { font-size:10px; letter-spacing:.25em; text-transform:uppercase; color:hsl(43 78% 58%); display:flex; gap:8px; align-items:center; }
  h1 { font-size:14px; margin:14px 0 4px; font-weight:600; }
  p { font-size:11px; margin:0 0 16px; color:hsl(220 10% 55%); }
  input { width:100%; box-sizing:border-box; padding:10px 12px; background:hsl(220 18% 10%); border:1px solid ${error ? '#ef4444' : 'hsl(220 15% 14%)'}; color:#E8EAED; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing:.3em; font-size:14px; outline:none; }
  button { margin-top:12px; width:100%; padding:10px; background:hsl(43 78% 58%); color:#0B0F14; border:0; font-weight:700; font-size:11px; letter-spacing:.2em; text-transform:uppercase; cursor:pointer; }
  .err { color:#ef4444; font-size:11px; margin-top:8px; }
</style>
</head>
<body>
<div class="wrap">
  <form method="POST" action="/__gate/unlock">
    <div class="tag">◆ RUPES OSINT · Restricted</div>
    <h1>Enter passcode to access</h1>
    <p>Global Intelligence Collection &amp; Visualization</p>
    <input name="passcode" type="password" inputmode="numeric" autofocus autocomplete="off" placeholder="•••••" />
    ${error ? `<div class="err">${error}</div>` : ''}
    <input type="hidden" name="next" value="__NEXT__" />
    <button type="submit">Unlock</button>
  </form>
</div>
</body></html>`;
  return new Response(html, {
    status: 401,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex, nofollow',
    },
  });
}

export async function middleware(req: NextRequest) {
  const secret = process.env.GATE_SECRET;
  const passcode = process.env.GATE_PASSCODE;

  if (!secret || !passcode) {
    return new Response('Gate misconfigured: set GATE_PASSCODE and GATE_SECRET env vars.', {
      status: 500, headers: { 'content-type': 'text/plain' },
    });
  }

  const url = new URL(req.url);

  // Everything else — require valid cookie.
  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  if (await isValidCookie(cookie, secret)) {
    return NextResponse.next();
  }

  const nextPath = url.pathname + url.search;
  const page = await gatePage();
  const body = (await page.text()).replace('__NEXT__', escapeAttr(nextPath));
  return new Response(body, {
    status: 401,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex, nofollow',
    },
  });
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
