"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RunStateKind } from "@/components/console/run-state";

export type RunEvent = {
  run_id: string;
  seq: number;
  type: string;
  payload: Record<string, unknown>;
  ts: number;
};

export type Approval = {
  id: string;
  tool: string;
  arguments: Record<string, unknown>;
  risk: string;
  reason: string;
};

type TokenResponse = {
  token: string;
  runtimeUrl: string;
};

async function responseError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string; detail?: string };
    return body.error ?? body.detail ?? `Request failed (${response.status}).`;
  } catch {
    return `Request failed (${response.status}).`;
  }
}

/**
 * The run plumbing shared by every builder surface: token issue, SSE reader
 * with reconnect + resume, approval decisions, run state. The UI lives in
 * RunTrace / ApprovalCard / RunState so the surfaces cannot drift.
 *
 * `buildBody` is read through a ref, so callers can close over live editor
 * state without re-subscribing the stream.
 */
export function useRunSession(
  buildBody: (input: string) => Record<string, unknown>,
) {
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [runId, setRunId] = useState<string | null>(null);
  const [runState, setRunState] = useState<RunStateKind | null>(null);
  const [approval, setApproval] = useState<Approval | null>(null);
  const [editedArguments, setEditedArguments] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastEventId = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  const bodyRef = useRef(buildBody);

  useEffect(() => {
    bodyRef.current = buildBody;
  });

  const runActive =
    runState === "queued" || runState === "running" || runState === "waiting";

  const applyEvent = useCallback((event: RunEvent) => {
    lastEventId.current = event.seq;
    setEvents((current) =>
      current.some((item) => item.seq === event.seq)
        ? current
        : [...current, event],
    );
    if (event.type === "approval.required") {
      const payload = event.payload;
      const nextApproval = {
        id: String(payload.approval_id),
        tool: String(payload.tool),
        arguments: (payload.arguments ?? {}) as Record<string, unknown>,
        risk: String(payload.risk ?? "high"),
        reason: String(payload.reason ?? "A human decision is required."),
      };
      setApproval(nextApproval);
      setEditedArguments(JSON.stringify(nextApproval.arguments, null, 2));
      setRunState("waiting");
    } else if (event.type === "run.started") {
      setRunState("running");
    } else if (event.type === "run.completed") {
      setRunState("completed");
      sessionStorage.removeItem("legible.activeRun");
    } else if (event.type === "run.failed") {
      setRunState("failed");
      sessionStorage.removeItem("legible.activeRun");
    } else if (event.type === "run.expired") {
      setRunState("expired");
      sessionStorage.removeItem("legible.activeRun");
    } else if (event.type === "approval.resolved") {
      setApproval(null);
    }
  }, []);

  const connectToRun = useCallback(
    async (id: string, token: string, runtimeUrl: string, signal: AbortSignal) => {
      const response = await fetch(
        `${runtimeUrl.replace(/\/$/, "")}/runs/${encodeURIComponent(id)}/events`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Last-Event-ID": String(lastEventId.current),
          },
          signal,
        },
      );
      if (!response.ok) throw new Error(await responseError(response));
      if (!response.body) throw new Error("The runtime returned no event stream.");
      setError(null);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let eventType = "message";
      let data: string[] = [];
      let streamEnded = false;

      const dispatch = () => {
        if (data.length) {
          if (eventType === "stream.end") {
            streamEnded = true;
            sessionStorage.removeItem("legible.activeRun");
          } else {
            const event = JSON.parse(data.join("\n")) as RunEvent;
            applyEvent(event);
          }
        }
        eventType = "message";
        data = [];
      };

      while (true) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        const frames = buffer.split(/\r?\n\r?\n/);
        buffer = frames.pop() ?? "";
        for (const frame of frames) {
          for (const line of frame.split(/\r?\n/)) {
            if (line.startsWith("event:")) eventType = line.slice(6).trim();
            else if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
          }
          dispatch();
        }
        if (done) {
          dispatch();
          return streamEnded;
        }
      }
    },
    [applyEvent],
  );

  const issueToken = useCallback(async (): Promise<TokenResponse> => {
    const response = await fetch("/api/playground/token", { method: "POST" });
    if (!response.ok) throw new Error(await responseError(response));
    return (await response.json()) as TokenResponse;
  }, []);

  const watchRun = useCallback(
    async (
      id: string,
      initialToken: string,
      initialRuntimeUrl: string,
      signal: AbortSignal,
    ) => {
      let token = initialToken;
      let runtimeUrl = initialRuntimeUrl;
      let attempts = 0;
      while (!signal.aborted) {
        try {
          const ended = await connectToRun(id, token, runtimeUrl, signal);
          if (ended) return;
          setError("Connection interrupted. Reconnecting to the saved event stream.");
        } catch (reason) {
          if (signal.aborted) throw reason;
          setError(
            reason instanceof Error
              ? `Stream disconnected: ${reason.message}. Reconnecting…`
              : "Stream disconnected. Reconnecting…",
          );
        }
        await new Promise((resolve) =>
          window.setTimeout(resolve, Math.min(1000 * 2 ** attempts++, 5000)),
        );
        const refreshed = await issueToken();
        token = refreshed.token;
        runtimeUrl = refreshed.runtimeUrl;
      }
    },
    [connectToRun, issueToken],
  );

  useEffect(() => {
    let mounted = true;
    const activeRun = sessionStorage.getItem("legible.activeRun");
    if (activeRun) {
      try {
        const saved = JSON.parse(activeRun) as { runId: string };
        if (!saved.runId) throw new Error("Missing run id");
        void (async () => {
          setBusy(true);
          try {
            const { token, runtimeUrl } = await issueToken();
            if (!mounted) return;
            setRunId(saved.runId);
            setRunState("running");
            setBusy(false);
            const controller = new AbortController();
            controllerRef.current = controller;
            await watchRun(saved.runId, token, runtimeUrl, controller.signal);
          } catch (reason) {
            if (
              mounted &&
              !(reason instanceof DOMException && reason.name === "AbortError")
            ) {
              setError(
                reason instanceof Error ? reason.message : "Could not resume the run.",
              );
            }
          } finally {
            if (mounted) setBusy(false);
          }
        })();
      } catch {
        sessionStorage.removeItem("legible.activeRun");
      }
    }
    return () => {
      mounted = false;
      controllerRef.current?.abort();
    };
  }, [issueToken, watchRun]);

  const start = useCallback(
    async (input: string) => {
      setBusy(true);
      setError(null);
      setEvents([]);
      setApproval(null);
      lastEventId.current = 0;
      try {
        const { token, runtimeUrl } = await issueToken();
        const response = await fetch(`${runtimeUrl.replace(/\/$/, "")}/runs`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(bodyRef.current(input)),
        });
        if (!response.ok) throw new Error(await responseError(response));
        const result = (await response.json()) as { run_id: string };
        setRunId(result.run_id);
        setRunState("queued");
        sessionStorage.setItem(
          "legible.activeRun",
          JSON.stringify({ runId: result.run_id }),
        );
        setBusy(false);
        const controller = new AbortController();
        controllerRef.current = controller;
        await watchRun(result.run_id, token, runtimeUrl, controller.signal);
      } catch (reason) {
        if (!(reason instanceof DOMException && reason.name === "AbortError")) {
          setError(reason instanceof Error ? reason.message : "Could not start the run.");
          if (!sessionStorage.getItem("legible.activeRun")) setRunState("failed");
        }
      } finally {
        setBusy(false);
      }
    },
    [issueToken, watchRun],
  );

  const decideApproval = useCallback(
    async (decision: "approved" | "edited" | "rejected") => {
      if (!approval) return;
      setBusy(true);
      setError(null);
      try {
        let argumentsValue: Record<string, unknown> | undefined;
        if (decision === "edited") {
          const parsed: unknown = JSON.parse(editedArguments);
          if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
            throw new Error("Edited arguments must be a JSON object.");
          }
          argumentsValue = parsed as Record<string, unknown>;
        }
        const { token, runtimeUrl } = await issueToken();
        const response = await fetch(
          `${runtimeUrl.replace(/\/$/, "")}/approvals/${encodeURIComponent(approval.id)}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              decision,
              ...(argumentsValue ? { arguments: argumentsValue } : {}),
            }),
          },
        );
        if (!response.ok) throw new Error(await responseError(response));
      } catch (reason) {
        setError(
          reason instanceof Error ? reason.message : "Could not submit the decision.",
        );
      } finally {
        setBusy(false);
      }
    },
    [approval, editedArguments, issueToken],
  );

  return {
    events,
    runId,
    runState,
    approval,
    editedArguments,
    setEditedArguments,
    busy,
    error,
    runActive,
    start,
    decideApproval,
  };
}
