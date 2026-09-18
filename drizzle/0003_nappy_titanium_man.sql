CREATE TABLE `email_deliveries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`subscription_id` integer NOT NULL,
	`digest_date` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`resend_email_id` text,
	`last_error` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`sent_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_email_delivery_subscription_date` ON `email_deliveries` (`subscription_id`,`digest_date`);--> statement-breakpoint
CREATE INDEX `idx_email_delivery_status` ON `email_deliveries` (`status`,`updated_at`);