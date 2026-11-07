import { createPrivateKey, sign, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getWorkspaceForUser } from "@/lib/data/workspace";
import { getEntitlements } from "@/lib/entitlements";
import { env } from "@/lib/env";

const TOKEN_TTL_SECONDS = 5 * 60;

function encode(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

export async function POST() {
  if (process.env.PLAYGROUND_LIVE_RUNS_ENABLED !== "true") {
    return NextResponse.json(
      { error: "Live runs are disabled for this deployment." },
      { status: 503 },
    );
  }

  const session = await getSession();
  if (!session?.user?.id || !session.user.workspaceId) {
    return NextResponse.json({ error: "Sign in to start a live run." }, { status: 401 });
  }

  const workspace = await getWorkspaceForUser(session.user.id);
  if (!workspace || workspace.id !== session.user.workspaceId) {
    return NextResponse.json({ error: "Workspace not found." }, { status: 403 });
  }
  if (!env.RUNTIME_TOKEN_PRIVATE_KEY) {
    return NextResponse.json(
      { error: "Runtime token signing is not configured." },
      { status: 503 },
    );
  }
  if (!env.NEXT_PUBLIC_RUNTIME_URL) {
    return NextResponse.json(
      { error: "Runtime URL is not configured." },
      { status: 503 },
    );
  }

  const entitlements = await getEntitlements(workspace.id);
  const now = Math.floor(Date.now() / 1000);
  const payload = encode(
    JSON.stringify({
      sub: session.user.id,
      ws: workspace.id,
      demo: "governed-agent",
      plan: entitlements.plan,
      limits: {
        runs_per_day: entitlements.runsPerDay,
        history_days: entitlements.historyDays,
      },
      iat: now,
      exp: now + TOKEN_TTL_SECONDS,
      jti: randomUUID(),
    }),
  );

  let privateKey;
  try {
    privateKey = createPrivateKey(
      env.RUNTIME_TOKEN_PRIVATE_KEY.replace(/\\n/g, "\n"),
    );
    if (privateKey.asymmetricKeyType !== "ed25519") {
      throw new Error("Expected Ed25519 private key");
    }
  } catch {
    return NextResponse.json(
      { error: "Runtime token signing key is invalid." },
      { status: 503 },
    );
  }

  let signature: Buffer;
  try {
    signature = sign(null, Buffer.from(payload, "base64url"), privateKey);
  } catch {
    return NextResponse.json(
      { error: "Runtime token could not be signed." },
      { status: 503 },
    );
  }
  return NextResponse.json({
    token: `${payload}.${encode(signature)}`,
    expiresAt: now + TOKEN_TTL_SECONDS,
    runtimeUrl: env.NEXT_PUBLIC_RUNTIME_URL,
  });
}
