import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';
import { findUpSync } from 'find-up';
import dotenv from 'dotenv';

dotenv.config({
  path: findUpSync(".env"),
});

export default defineConfig({
  out: './drizzle',
  schema: './src/db/sqlite/schema.ts',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DB_FILE_NAME!,
  },
  verbose: true,
});