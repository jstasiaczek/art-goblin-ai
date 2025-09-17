import { drizzle } from 'drizzle-orm/libsql';
import { findUpSync } from 'find-up';
import dotenv from 'dotenv';

dotenv.config({
  path: findUpSync(".env"),
});

export const db = drizzle(process.env.DB_FILE_NAME!);