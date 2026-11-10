CREATE TABLE `access_token` (
	`pangolin_token_id` text PRIMARY KEY NOT NULL,
	`family_id` text NOT NULL,
	`expires_at` text NOT NULL,
	`revoked_at` text,
	FOREIGN KEY (`family_id`) REFERENCES `refresh_family`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `access_token_family_idx` ON `access_token` (`family_id`);--> statement-breakpoint
CREATE TABLE `refresh_family` (
	`id` text PRIMARY KEY NOT NULL,
	`pangolin_user_id` text NOT NULL,
	`created_at` text NOT NULL,
	`last_used_at` text,
	`expires_at` text NOT NULL,
	`revoked_at` text
);
--> statement-breakpoint
CREATE INDEX `refresh_family_user_idx` ON `refresh_family` (`pangolin_user_id`);--> statement-breakpoint
CREATE TABLE `refresh_token` (
	`id` text PRIMARY KEY NOT NULL,
	`family_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`consumed_at` text,
	FOREIGN KEY (`family_id`) REFERENCES `refresh_family`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `refresh_token_token_hash_unique` ON `refresh_token` (`token_hash`);--> statement-breakpoint
CREATE INDEX `refresh_token_family_idx` ON `refresh_token` (`family_id`);