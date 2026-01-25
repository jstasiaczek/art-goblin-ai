CREATE TABLE `history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uuid` text NOT NULL,
	`create_date` integer NOT NULL,
	`model` text NOT NULL,
	`image_name` text NOT NULL,
	`prompt` text NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`negative_prompt` text,
	`n_images` integer,
	`num_steps` integer,
	`resolution` text,
	`sampler_name` text,
	`scale` real,
	`image_data_url` text,
	`provider` text,
	`response_format` text,
	`seed` integer,
	`kontext_max_mode` integer,
	`favorite` integer DEFAULT false,
	`user_id` integer NOT NULL,
	`project_uuid` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `history_uuid_unique` ON `history` (`uuid`);--> statement-breakpoint
CREATE TABLE `models` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`sizes` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `project_groups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uuid` text NOT NULL,
	`name` text NOT NULL,
	`user_id` integer NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `project_groups_uuid_unique` ON `project_groups` (`uuid`);--> statement-breakpoint
CREATE TABLE `projects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uuid` text NOT NULL,
	`name` text NOT NULL,
	`user_id` integer NOT NULL,
	`group_uuid` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `projects_uuid_unique` ON `projects` (`uuid`);--> statement-breakpoint
CREATE TABLE `snippets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uuid` text NOT NULL,
	`user_id` integer NOT NULL,
	`title` text,
	`snippet` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `snippets_uuid_unique` ON `snippets` (`uuid`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uuid` text NOT NULL,
	`email` text NOT NULL,
	`password` text NOT NULL,
	`role` text DEFAULT 'user' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_uuid_unique` ON `users` (`uuid`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);