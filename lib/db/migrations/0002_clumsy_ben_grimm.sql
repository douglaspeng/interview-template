CREATE TABLE `TokenUsage` (
	`id` text PRIMARY KEY NOT NULL,
	`promptTokens` integer NOT NULL,
	`completionTokens` integer NOT NULL,
	`totalTokens` integer NOT NULL,
	`cost` integer NOT NULL,
	`timestamp` integer NOT NULL,
	`operation` text NOT NULL,
	`invoiceId` text,
	`cached` integer DEFAULT false NOT NULL,
	`cacheKey` text,
	`cacheHit` integer DEFAULT false NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`invoiceId`) REFERENCES `Invoice`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `Invoice` ADD `currency` text DEFAULT 'USD';--> statement-breakpoint
ALTER TABLE `Invoice` ADD `extraction_method` text;--> statement-breakpoint
ALTER TABLE `Invoice` ADD `processing_errors` text;