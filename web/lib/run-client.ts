export type ConnectionState = "idle" | "checking" | "reachable" | "unreachable" | "uncertain";
export type RuntimeToken = { token: string; runtimeUrl: string; expiresAt: number };

export async function responseError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string; detail?: string };
    return body.error ?? body.detail ?? `Request failed (${response.status}).`;
  } catch {
    return `Request failed (${response.status}).`;
  }
}

export class RunCreationUncertain extends Error {
  constructor() {
    super("The run request lost its response. It may have started. Check Dashboard → Runs before starting another run.");
  }
}

/** Connectivity retries never create runs. Tokens live in memory, not storage. */
export function createRunClient(request: typeof fetch = fetch) {
  let cached: RuntimeToken | null = null;
  let pending: Promise<RuntimeToken> | null = null;
  return {
    async checkConnection(runtimeUrl: string) {
      if (!runtimeUrl) throw new Error("Runtime URL is not configured.");
      const response = await request(`${runtimeUrl.replace(/\/$/, "")}/healthz`, {
        signal: AbortSignal.timeout(3000), cache: "no-store",
      });
      if (!response.ok) throw new Error("Cannot reach runtime. Check the runtime service and try again.");
      const body = await response.json();
      if (body?.ok !== true) throw new Error("Runtime health check failed.");
    },
    async issueToken(): Promise<RuntimeToken> {
      if (cached && cached.expiresAt * 1000 > Date.now() + 10_000) return cached;
      if (!pending) {
        pending = (async () => {
          const response = await request("/api/playground/token", {
            method: "POST", signal: AbortSignal.timeout(10_000),
          });
          if (!response.ok) throw new Error(await responseError(response));
          const value = await response.json() as RuntimeToken;
          if (!value.token || !value.runtimeUrl || !Number.isFinite(value.expiresAt)) {
            throw new Error("Invalid runtime token response.");
          }
          cached = value;
          return value;
        })().finally(() => { pending = null; });
      }
      return pending;
    },
    async createRun(auth: RuntimeToken, body: Record<string, unknown>): Promise<string> {
      // Never retry POST /runs: without an idempotency key a network failure
      // cannot distinguish a rejected request from an accepted-but-lost response.
      let response: Response;
      try {
        response = await request(`${auth.runtimeUrl.replace(/\/$/, "")}/runs`, {
          method: "POST",
          headers: { Authorization: `Bearer ${auth.token}`, "Content-Type": "application/json" },
          body: JSON.stringify(body), signal: AbortSignal.timeout(15_000),
        });
      } catch {
        throw new RunCreationUncertain();
      }
      if (!response.ok) {
        if (response.status >= 500) throw new RunCreationUncertain();
        throw new Error(await responseError(response));
      }
      try {
        const result = await response.json() as { run_id?: string };
        if (!result.run_id) throw new Error("Missing run id");
        return result.run_id;
      } catch {
        throw new RunCreationUncertain();
      }
    },
  };
}
