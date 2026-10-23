CREATE TABLE `egress_config` (
	`name` text PRIMARY KEY NOT NULL,
	`endpoint` text,
	`status` text DEFAULT 'unknown' NOT NULL,
	`consecutive_failures` integer DEFAULT 0 NOT NULL,
	`last_attempt_at` text,
	`last_error` text,
	`last_probe_at` text,
	`last_exit_ip` text,
	`active` integer DEFAULT false NOT NULL,
	`updated_at` text NOT NULL
);
