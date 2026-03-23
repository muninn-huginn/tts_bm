import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

export const probeResults = pgTable(
  "probe_results",
  {
    id: serial("id").primaryKey(),
    providerId: text("provider_id").notNull(),
    phraseLabel: text("phrase_label").notNull(),
    timestamp: timestamp("timestamp", { withTimezone: true })
      .notNull()
      .defaultNow(),
    ttfbMs: integer("ttfb_ms").notNull(),
    totalTimeMs: integer("total_time_ms").notNull(),
    audioDurationMs: integer("audio_duration_ms"),
    statusCode: integer("status_code").notNull(),
    errorMessage: text("error_message"),
    region: text("region"),
  },
  (table) => [
    index("idx_provider_timestamp").on(table.providerId, table.timestamp),
    index("idx_timestamp").on(table.timestamp),
    index("idx_provider_errors").on(table.providerId, table.statusCode),
  ]
);
