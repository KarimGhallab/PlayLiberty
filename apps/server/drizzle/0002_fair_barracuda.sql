CREATE TABLE `playlist_pin` (
	`account_id` text NOT NULL,
	`playlist_id` text NOT NULL,
	`pinned_at` text NOT NULL,
	PRIMARY KEY(`account_id`, `playlist_id`),
	FOREIGN KEY (`account_id`) REFERENCES `account`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`playlist_id`) REFERENCES `playlist`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `playlist_pin_account_idx` ON `playlist_pin` (`account_id`,`pinned_at`);