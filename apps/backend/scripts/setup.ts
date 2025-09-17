import 'dotenv/config';
import { findUpSync } from 'find-up';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

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
      if (!fs.existsSync(dbAbs)) {
        console.log(`[setup] DB not found at ${dbAbs}. Running migrations...`);
        // Run migrations (drizzle-kit reads drizzle.config.ts in CWD)
        const backendRoot = path.resolve(__dirname, '..');
        execSync('node ./node_modules/drizzle-kit/bin.cjs push', {
          cwd: backendRoot,
          stdio: 'inherit',
          shell: '/bin/sh',
        });
      } else {
        console.log(`[setup] DB exists at ${dbAbs}. Skipping migrations/seed.`);
      }
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
