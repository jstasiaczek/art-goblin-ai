CREATE TABLE `user_favorite_models` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`model_id` text NOT NULL,
	`created_at` integer NOT NULL
);
