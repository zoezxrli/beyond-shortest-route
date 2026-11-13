CREATE TABLE `plans` (
	`id` text PRIMARY KEY NOT NULL,
	`generated_at` text NOT NULL,
	`period_start` text NOT NULL,
	`period_end` text NOT NULL,
	`report_count` integer NOT NULL,
	`dominant_issue` text NOT NULL,
	`summary` text NOT NULL,
	`recommendation` text NOT NULL,
	`route_mode` text NOT NULL,
	`proposed_distance_km` real NOT NULL,
	`estimated_minutes_saved` integer NOT NULL,
	`avoided_issues` integer NOT NULL,
	`status` text DEFAULT 'needs_review' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reports` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`contributor_type` text NOT NULL,
	`category` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`location_label` text NOT NULL,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	`urgency` text DEFAULT 'routine' NOT NULL,
	`photo_key` text,
	`ai_tags` text NOT NULL,
	`ai_summary` text NOT NULL,
	`ai_confidence` integer NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`cycle_id` text
);
