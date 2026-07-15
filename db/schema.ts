import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const resultReports = sqliteTable(
  "result_reports",
  {
    id: text("id").primaryKey(),
    meetId: text("meet_id").notNull(),
    kind: text("kind").notNull(),
    category: text("category").notNull(),
    roundName: text("round_name").notNull(),
    event: text("event").notNull(),
    stage: text("stage").notNull(),
    isFinal: integer("is_final", { mode: "boolean" }).notNull(),
    rowCount: integer("row_count").notNull(),
    serverJobId: text("server_job_id").notNull(),
    placeId: text("place_id").notNull(),
    universeId: text("universe_id").notNull(),
    capturedAt: text("captured_at").notNull(),
    receivedAt: text("received_at").notNull(),
    payloadJson: text("payload_json").notNull(),
  },
  (table) => [
    index("result_reports_received_at_idx").on(table.receivedAt),
    index("result_reports_event_idx").on(table.event),
    index("result_reports_kind_idx").on(table.kind),
    index("result_reports_server_job_idx").on(table.serverJobId),
  ],
);

export const liveRaces = sqliteTable(
  "live_races",
  {
    raceId: text("race_id").primaryKey(),
    meetId: text("meet_id").notNull(),
    status: text("status").notNull(),
    category: text("category").notNull(),
    roundName: text("round_name").notNull(),
    event: text("event").notNull(),
    serverJobId: text("server_job_id").notNull(),
    capturedAt: text("captured_at").notNull(),
    receivedAt: text("received_at").notNull(),
    payloadJson: text("payload_json").notNull(),
  },
  (table) => [
    index("live_races_received_at_idx").on(table.receivedAt),
    index("live_races_status_idx").on(table.status),
    index("live_races_server_job_idx").on(table.serverJobId),
  ],
);
