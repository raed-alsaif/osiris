// App Router route handler for the passcode unlock endpoint.
// Copy this file to the OSIRIS fork at: app/___gate/unlock/route.ts
//
// This MUST exist as a real route handler — without it, Vercel returns
// 405 INVALID_REQUEST_METHOD for POST before middleware can respond.

import { NextRequest, NextResponse } from "next/server";
import {
  COOKIE_NAME,
  MAX_AGE_SECONDS,
  getPasscode,
  sign,
  gateHtml,
} from "@/lib/gate";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let entered = "";
  const ct = req.headers.get("content-type") ?? "";

  try {
    if (ct.includes("application/x-www-form-urlencoded") || ct.includes("multipart/form-data")) {
      const form = await req.formData();
      entered = String(form.get("passcode") ?? "").trim();
    } else if (ct.includes("application/json")) {
      const body = await req.json().catch(() => ({}));
      entered = String(body?.passcode ?? "").trim();
    } else {
      // Fallback: read raw body and parse as urlencoded
      const raw = await req.text();
      const params = new URLSearchParams(raw);
      entered = String(params.get("passcode") ?? "").trim();
    }
  } catch {
    entered = "";
  }

  if (entered === getPasscode()) {
    const token = await sign(getPasscode());
    const res = NextResponse.redirect(new URL("/", req.url), { status: 303 });
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: MAX_AGE_SECONDS,
      path: "/",
    });
    return res;
  }

  return new NextResponse(
    gateHtml("The code you entered is incorrect. Please try again."),
    { status: 401, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

// GET on the unlock URL just bounces to the gate (root).
export async function GET(req: NextRequest) {
  return NextResponse.redirect(new URL("/", req.url), { status: 303 });
}
