CREATE TABLE `result_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`meet_id` text NOT NULL,
	`kind` text NOT NULL,
	`category` text NOT NULL,
	`round_name` text NOT NULL,
	`event` text NOT NULL,
	`stage` text NOT NULL,
	`is_final` integer NOT NULL,
	`row_count` integer NOT NULL,
	`server_job_id` text NOT NULL,
	`place_id` text NOT NULL,
	`universe_id` text NOT NULL,
	`captured_at` text NOT NULL,
	`received_at` text NOT NULL,
	`payload_json` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `result_reports_received_at_idx` ON `result_reports` (`received_at`);--> statement-breakpoint
CREATE INDEX `result_reports_event_idx` ON `result_reports` (`event`);--> statement-breakpoint
CREATE INDEX `result_reports_kind_idx` ON `result_reports` (`kind`);--> statement-breakpoint
CREATE INDEX `result_reports_server_job_idx` ON `result_reports` (`server_job_id`);