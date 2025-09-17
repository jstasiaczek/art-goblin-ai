import { int, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const usersTable = sqliteTable("users", {
  id: int().primaryKey({ autoIncrement: true }),
  uuid: text().notNull().unique(),
  email: text().notNull().unique(),
  password: text().notNull(),
  role: text().notNull().default('user'),
});

export const projectGroupsTable = sqliteTable("project_groups", {
  id: int().primaryKey({ autoIncrement: true }),
  uuid: text().notNull().unique(),
  name: text().notNull(),
  user_id: int().notNull(),
  sort_order: int().notNull().default(0),
});

export const projectsTable = sqliteTable("projects", {
  id: int().primaryKey({ autoIncrement: true }),
  uuid: text().notNull().unique(),
  name: text().notNull(),
  user_id: int().notNull(),
  group_uuid: text().notNull(),
});

export const historyTable = sqliteTable("history", {
  id: int().primaryKey({ autoIncrement: true }),
  uuid: text().notNull().unique(),
  create_date: int({mode: 'timestamp'}).notNull(),
  model: text().notNull(),
  image_name: text().notNull(),
  prompt: text().notNull(),
  width: int().notNull(),
  height: int().notNull(),
  negative_prompt: text(),
  n_images: int(),
  num_steps: int(),
  resolution: text(),
  sampler_name: text(),
  scale: real(),
  image_data_url: text(),
  // Provider / API-2 specific additions
  provider: text(),
  response_format: text(),
  seed: int(),
  kontext_max_mode: int({ mode: 'boolean' }),
  favorite: int({ mode: 'boolean' }).default(false),
  user_id: int().notNull(),
  project_uuid: text().notNull(),
});

export const snippetsTable = sqliteTable("snippets", {
  id: int().primaryKey({ autoIncrement: true }),
  uuid: text().notNull().unique(),
  user_id: int().notNull(),
  title: text(),
  snippet: text().notNull(),
  created_at: int().notNull(),
});

export const modelsTable = sqliteTable("models", {
  id: text().primaryKey(),
  name: text().notNull(),
  sizes: text().notNull(),
});
