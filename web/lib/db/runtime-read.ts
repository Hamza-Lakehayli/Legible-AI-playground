import "server-only";

/**
 * Read-only view of the runtime schema (spec: the web app reads
 * `runtime` through a read-only role; it never writes to it). The
 * runtime service owns these tables — treat every query here as
 * read-only discipline.
 */
import { pgSchema, text, integer, timestamp, jsonb, uuid, primaryKey } from "drizzle-orm/pg-core";

export const runtime = pgSchema("runtime");

export const runs = runtime.table("runs", {
  id: text("id").primaryKey(),
  workspaceId: uuid("workspace_id").notNull(),
  userId: uuid("user_id").notNull(),
  demo: text("demo").notNull(),
  status: text("status").notNull(),
  model: text("model"),
  tokensIn: integer("tokens_in").notNull().default(0),
  tokensOut: integer("tokens_out").notNull().default(0),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
});

export const runEvents = runtime.table(
  "run_events",
  {
    runId: text("run_id").notNull(),
    seq: integer("seq").notNull(),
    type: text("type").notNull(),
    payload: jsonb("payload").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.runId, t.seq] })],
);

export const approvals = runtime.table("approvals", {
  id: text("id").primaryKey(),
  runId: text("run_id").notNull(),
  workspaceId: uuid("workspace_id").notNull(),
  tool: text("tool").notNull(),
  arguments: jsonb("arguments").notNull(),
  risk: text("risk").notNull(),
  status: text("status").notNull(),
  decidedBy: uuid("decided_by"),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});
