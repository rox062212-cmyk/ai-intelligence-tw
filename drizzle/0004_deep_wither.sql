ALTER TABLE `subscriptions` ADD `next_send_at` text;--> statement-breakpoint
CREATE INDEX `idx_subscriptions_due` ON `subscriptions` (`status`,`next_send_at`);