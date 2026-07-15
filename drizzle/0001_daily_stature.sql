CREATE TABLE `live_races` (
	`race_id` text PRIMARY KEY NOT NULL,
	`meet_id` text NOT NULL,
	`status` text NOT NULL,
	`category` text NOT NULL,
	`round_name` text NOT NULL,
	`event` text NOT NULL,
	`server_job_id` text NOT NULL,
	`captured_at` text NOT NULL,
	`received_at` text NOT NULL,
	`payload_json` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `live_races_received_at_idx` ON `live_races` (`received_at`);--> statement-breakpoint
CREATE INDEX `live_races_status_idx` ON `live_races` (`status`);--> statement-breakpoint
CREATE INDEX `live_races_server_job_idx` ON `live_races` (`server_job_id`);