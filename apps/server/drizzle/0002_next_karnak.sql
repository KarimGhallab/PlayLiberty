DROP INDEX `playlist_source_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX `playlist_source_unique` ON `playlist` (`owner_account_id`,`provider`,`source_playlist_id`);