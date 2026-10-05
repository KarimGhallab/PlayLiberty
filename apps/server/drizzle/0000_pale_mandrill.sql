CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`pangolin_user_id` text NOT NULL,
	`display_name` text NOT NULL,
	`email` text,
	`avatar_url` text,
	`role` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `account_pangolin_user_id_unique` ON `account` (`pangolin_user_id`);--> statement-breakpoint
CREATE TABLE `association` (
	`id` text PRIMARY KEY NOT NULL,
	`playlist_id` text NOT NULL,
	`track_id` text NOT NULL,
	`origin` text NOT NULL,
	`position` integer NOT NULL,
	`added_at` text NOT NULL,
	FOREIGN KEY (`playlist_id`) REFERENCES `playlist`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`track_id`) REFERENCES `track`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `association_playlist_track_unique` ON `association` (`playlist_id`,`track_id`);--> statement-breakpoint
CREATE INDEX `association_playlist_idx` ON `association` (`playlist_id`);--> statement-breakpoint
CREATE INDEX `association_track_idx` ON `association` (`track_id`);--> statement-breakpoint
CREATE TABLE `playlist` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_account_id` text NOT NULL,
	`name` text NOT NULL,
	`cover_url` text,
	`provider` text NOT NULL,
	`source_playlist_id` text NOT NULL,
	`source_url` text,
	`sync_status` text DEFAULT 'idle' NOT NULL,
	`skip_non_music` integer DEFAULT true NOT NULL,
	`last_synced_at` text,
	`track_count` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`owner_account_id`) REFERENCES `account`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `playlist_source_unique` ON `playlist` (`owner_account_id`,`provider`,`source_playlist_id`);--> statement-breakpoint
CREATE INDEX `playlist_owner_idx` ON `playlist` (`owner_account_id`);--> statement-breakpoint
CREATE TABLE `share` (
	`id` text PRIMARY KEY NOT NULL,
	`playlist_id` text NOT NULL,
	`account_id` text NOT NULL,
	`level` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`playlist_id`) REFERENCES `playlist`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`account_id`) REFERENCES `account`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `share_playlist_account_unique` ON `share` (`playlist_id`,`account_id`);--> statement-breakpoint
CREATE INDEX `share_account_idx` ON `share` (`account_id`);--> statement-breakpoint
CREATE TABLE `suppression` (
	`playlist_id` text NOT NULL,
	`video_id` text NOT NULL,
	`removed_at` text NOT NULL,
	PRIMARY KEY(`playlist_id`, `video_id`),
	FOREIGN KEY (`playlist_id`) REFERENCES `playlist`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sync_run` (
	`id` text PRIMARY KEY NOT NULL,
	`playlist_id` text NOT NULL,
	`status` text NOT NULL,
	`added_count` integer DEFAULT 0 NOT NULL,
	`retained_count` integer DEFAULT 0 NOT NULL,
	`removed_count` integer DEFAULT 0 NOT NULL,
	`failed_count` integer DEFAULT 0 NOT NULL,
	`started_at` text NOT NULL,
	`finished_at` text,
	`error` text,
	FOREIGN KEY (`playlist_id`) REFERENCES `playlist`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sync_run_playlist_idx` ON `sync_run` (`playlist_id`);--> statement-breakpoint
CREATE TABLE `track` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`video_id` text NOT NULL,
	`title` text NOT NULL,
	`duration_seconds` integer,
	`skip_non_music` integer DEFAULT true NOT NULL,
	`thumbnail_path` text,
	`thumbnail_url` text,
	`file_status` text DEFAULT 'pending' NOT NULL,
	`source_status` text DEFAULT 'available' NOT NULL,
	`file_path` text,
	`failure_reason` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `track_video_id_unique` ON `track` (`video_id`);--> statement-breakpoint
CREATE INDEX `track_file_status_idx` ON `track` (`file_status`);