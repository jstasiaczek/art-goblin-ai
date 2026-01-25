import 'dotenv/config';
import { findUpSync } from 'find-up';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { createClient } from '@libsql/client';

dotenv.config({ path: findUpSync('.env') });

function getDbPath(): string | null {
  const dbUrl = process.env.DB_FILE_NAME || '';
  if (!dbUrl) return null;
  if (dbUrl.startsWith('file:')) return dbUrl.slice(5);
  if (/\.db$/i.test(dbUrl)) return dbUrl;
  return null;
}

async function main() {
  const dbRel = getDbPath();
  if (!dbRel) {
    console.error('[baseline] DB_FILE_NAME not set or not a sqlite file path.');
    process.exit(1);
  }

  const dbAbs = path.isAbsolute(dbRel) ? dbRel : path.resolve(process.cwd(), dbRel);
  if (!fs.existsSync(dbAbs)) {
    console.error(`[baseline] Database file not found at ${dbAbs}`);
    process.exit(1);
  }

  // Find the first migration file in drizzle/
  const drizzleDir = path.resolve(__dirname, '..', 'drizzle');
  if (!fs.existsSync(drizzleDir)) {
    console.error('[baseline] No drizzle/ directory found. Run db:generate first.');
    process.exit(1);
  }

  const migrationFiles = fs.readdirSync(drizzleDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  if (migrationFiles.length === 0) {
    console.error('[baseline] No migration files found in drizzle/');
    process.exit(1);
  }

  const baselineMigration = migrationFiles[0];
  // Extract the migration hash/name (remove .sql extension)
  const migrationName = baselineMigration.replace('.sql', '');

  console.log(`[baseline] Marking migration as applied: ${migrationName}`);

  const client = createClient({ url: `file:${dbAbs}` });

  try {
    // Create the migrations table if it doesn't exist
    await client.execute(`
      CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hash TEXT NOT NULL,
        created_at INTEGER
      )
    `);

    // Check if already marked
    const existing = await client.execute({
      sql: 'SELECT id FROM "__drizzle_migrations" WHERE hash = ?',
      args: [migrationName],
    });

    if (existing.rows.length > 0) {
      console.log(`[baseline] Migration ${migrationName} already marked as applied.`);
    } else {
      // Insert the baseline migration record
      await client.execute({
        sql: 'INSERT INTO "__drizzle_migrations" (hash, created_at) VALUES (?, ?)',
        args: [migrationName, Date.now()],
      });
      console.log(`[baseline] Successfully marked ${migrationName} as applied.`);
    }
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error('[baseline] Error:', err);
  process.exit(1);
});
