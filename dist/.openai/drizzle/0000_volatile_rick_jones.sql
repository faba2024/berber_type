CREATE TABLE `records` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`data` text NOT NULL,
	`updated` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `slots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`booking` text NOT NULL,
	`barber` text NOT NULL,
	`day` text NOT NULL,
	`minute` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `slot_unique` ON `slots` (`barber`,`day`,`minute`);