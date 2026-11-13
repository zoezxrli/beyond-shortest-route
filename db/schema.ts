import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const reports = sqliteTable("reports", {
  id: text("id").primaryKey(),
  createdAt: text("created_at").notNull(),
  contributorType: text("contributor_type").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull().default(""),
  locationLabel: text("location_label").notNull(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  urgency: text("urgency").notNull().default("routine"),
  photoKey: text("photo_key"),
  aiTags: text("ai_tags").notNull(),
  aiSummary: text("ai_summary").notNull(),
  aiConfidence: integer("ai_confidence").notNull(),
  status: text("status").notNull().default("queued"),
  cycleId: text("cycle_id"),
});

export const plans = sqliteTable("plans", {
  id: text("id").primaryKey(),
  generatedAt: text("generated_at").notNull(),
  periodStart: text("period_start").notNull(),
  periodEnd: text("period_end").notNull(),
  reportCount: integer("report_count").notNull(),
  dominantIssue: text("dominant_issue").notNull(),
  summary: text("summary").notNull(),
  recommendation: text("recommendation").notNull(),
  routeMode: text("route_mode").notNull(),
  proposedDistanceKm: real("proposed_distance_km").notNull(),
  estimatedMinutesSaved: integer("estimated_minutes_saved").notNull(),
  avoidedIssues: integer("avoided_issues").notNull(),
  status: text("status").notNull().default("needs_review"),
});
