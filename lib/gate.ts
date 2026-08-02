// Shared passcode-gate helpers for Vercel Edge Middleware + App Router route handler.
// Copy this file to the OSIRIS fork at: lib/gate.ts

export const COOKIE_NAME = "osiris_gate";
export const MAX_AGE_SECONDS = 12 * 60 * 60; // 12 hours

export function getPasscode(): string {
  return (process.env.GATE_PASSCODE ?? "00100").trim();
}

export function getSecret(): string {
  return process.env.GATE_SECRET ?? "";
}

function b64url(bytes: ArrayBuffer): string {
  const s = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function sign(value: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(value));
  return `${value}.${b64url(sig)}`;
}

export async function verify(token: string): Promise<boolean> {
  if (!token || !getSecret()) return false;
  const i = token.lastIndexOf(".");
  if (i === -1) return false;
  const value = token.slice(0, i);
  if (value !== getPasscode()) return false;
  const expected = await sign(value);
  // Constant-ish time compare
  if (expected.length !== token.length) return false;
  let diff = 0;
  for (let k = 0; k < expected.length; k++) diff |= expected.charCodeAt(k) ^ token.charCodeAt(k);
  return diff === 0;
}

export function gateHtml(error?: string): string {
  const errorBlock = error
    ? `<div class="err"><strong>Access denied.</strong><br/>${error}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Protected | RUPES OSINT</title>
  <style>
    *{box-sizing:border-box}
    html,body{margin:0;height:100%;background:#0B0F14;color:#E5E7EB;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;display:flex;align-items:center;justify-content:center}
    .card{background:#10161D;border:1px solid #1F2937;border-radius:12px;padding:40px;width:100%;max-width:400px;text-align:center;box-shadow:0 20px 40px rgba(0,0,0,.35)}
    .logo{color:#D4A84A;font-weight:700;font-size:22px;letter-spacing:.05em;margin-bottom:8px}
    .subtitle{color:#9CA3AF;font-size:14px;margin-bottom:28px}
    input{width:100%;padding:14px;font-size:18px;letter-spacing:.25em;text-align:center;background:#0B0F14;border:1px solid #374151;border-radius:8px;color:#F9FAFB;outline:none;margin-bottom:16px}
    input:focus{border-color:#D4A84A}
    button{width:100%;padding:14px;background:#D4A84A;color:#0B0F14;border:none;border-radius:8px;font-weight:700;font-size:16px;cursor:pointer}
    button:hover{background:#C49A3F}
    .err{background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.35);border-radius:8px;padding:12px;margin-bottom:16px;color:#FCA5A5;font-size:13px;text-align:left}
  </style>
</head>
<body>
  <form class="card" method="POST" action="/___gate/unlock" enctype="application/x-www-form-urlencoded">
    <div class="logo">RUPES OSINT</div>
    <div class="subtitle">Enter access code to continue</div>
    ${errorBlock}
    <input name="passcode" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="10" autocomplete="off" placeholder="•••••" required autofocus />
    <button type="submit">Unlock</button>
  </form>
</body>
</html>`;
}
