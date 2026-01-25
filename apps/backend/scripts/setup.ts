import 'dotenv/config';
import { findUpSync } from 'find-up';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import { createClient } from '@libsql/client';

dotenv.config({ path: findUpSync('.env') });

function getDbPath(): string | null {
  const dbUrl = process.env.DB_FILE_NAME || '';
  if (!dbUrl) return null;
  if (dbUrl.startsWith('file:')) return dbUrl.slice(5);
  if (/\.db$/i.test(dbUrl)) return dbUrl;
  return null;
}

function ensureDir(p: string) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

async function main() {
  try {
    const dbRel = getDbPath();
    if (dbRel) {
      const dbAbs = path.isAbsolute(dbRel) ? dbRel : path.resolve(process.cwd(), dbRel);
      ensureDir(path.dirname(dbAbs));

      const dbExists = fs.existsSync(dbAbs);
      const backendRoot = path.resolve(__dirname, '..');

      if (dbExists) {
        // Check if this is a legacy database without migrations table
        const client = createClient({ url: `file:${dbAbs}` });
        try {
          const result = await client.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='__drizzle_migrations'"
          );

          if (result.rows.length === 0) {
            // Legacy database - mark baseline as applied
            console.log('[setup] Legacy database detected. Marking baseline migration...');
            execSync('node ./node_modules/tsx/dist/cli.mjs scripts/baseline-migration.ts', {
              cwd: backendRoot,
              stdio: 'inherit',
              shell: '/bin/sh',
            });
          } else {
            console.log('[setup] Database has migrations table.');
          }
        } finally {
          await client.close();
        }
      } else {
        console.log(`[setup] DB not found at ${dbAbs}. Will be created by migrations.`);
      }

      // Run migrations (for new DB creates tables, for existing applies new migrations)
      console.log('[setup] Running migrations...');
      execSync('node ./node_modules/drizzle-kit/bin.cjs migrate', {
        cwd: backendRoot,
        stdio: 'inherit',
        shell: '/bin/sh',
      });
    } else {
      console.log('[setup] DB_FILE_NAME not a sqlite file path. Skipping.');
    }

    const genDir = process.env.GENERATED_DIR;
    if (genDir) {
      const genAbs = path.isAbsolute(genDir) ? genDir : path.resolve(process.cwd(), genDir);
      ensureDir(genAbs);
      console.log(`[setup] Ensured GENERATED_DIR at ${genAbs}`);
    }
  } catch (e) {
    console.error('[setup] Failed:', e);
    process.exit(1);
  }
}

void main();
