ALTER TABLE `subscriptions` ADD `send_time` text DEFAULT '10:00' NOT NULL;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `time_zone` text DEFAULT 'Asia/Taipei' NOT NULL;