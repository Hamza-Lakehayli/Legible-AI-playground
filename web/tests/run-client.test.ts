import { describe, expect, it, vi } from "vitest";
import { createRunClient, RunCreationUncertain } from "../lib/run-client";

const token = () => ({ token: "test-only", expiresAt: Date.now() / 1000 + 300, runtimeUrl: "http://runtime.test" });

describe("runtime client", () => {
  it("checks connectivity without minting a token or creating runs", async () => {
    const request = vi.fn().mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue(new Response(JSON.stringify({ ok: true })));
    const client = createRunClient(request);
    await expect(client.checkConnection("http://runtime.test")).rejects.toThrow();
    await client.checkConnection("http://runtime.test");
    expect(request.mock.calls.map(([url]) => url)).toEqual(["http://runtime.test/healthz", "http://runtime.test/healthz"]);
  });

  it("reuses valid tokens and refreshes expired ones", async () => {
    vi.useFakeTimers();
    try {
      const request = vi.fn().mockImplementation(async () => new Response(JSON.stringify(token())));
      const client = createRunClient(request);
      const first = await client.issueToken();
      expect(await client.issueToken()).toBe(first);
      expect(request).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(301_000);
      expect(await client.issueToken()).not.toBe(first);
      expect(request).toHaveBeenCalledTimes(2);
    } finally { vi.useRealTimers(); }
  });

  it("does not retry ambiguous creation failures", async () => {
    const request = vi.fn().mockRejectedValue(new Error("lost response"));
    await expect(createRunClient(request).createRun(token(), {})).rejects.toBeInstanceOf(RunCreationUncertain);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("treats a lost or invalid success body as uncertain", async () => {
    const request = vi.fn().mockResolvedValue(new Response("invalid"));
    await expect(createRunClient(request).createRun(token(), {})).rejects.toBeInstanceOf(RunCreationUncertain);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("does not retry server errors and reports explicit client rejections", async () => {
    const request = vi.fn().mockResolvedValueOnce(new Response("upstream failure", { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ detail: "invalid graph" }), { status: 422 }));
    const client = createRunClient(request);
    await expect(client.createRun(token(), {})).rejects.toBeInstanceOf(RunCreationUncertain);
    expect(request).toHaveBeenCalledTimes(1);
    await expect(client.createRun(token(), {})).rejects.toThrow("invalid graph");
    expect(request).toHaveBeenCalledTimes(2);
  });
});
