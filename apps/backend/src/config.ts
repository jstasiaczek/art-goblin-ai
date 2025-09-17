import 'dotenv/config';
import dotenv from 'dotenv';
import { findUpSync } from 'find-up';
import path from 'path';

dotenv.config({
  path: findUpSync('.env'),
});

export const PORT = Number(process.env.PORT || process.env.BACEKND_PORT) || 3000;
export const API_KEY = process.env.API_KEY;
export const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
export const NANO_GPT_BASE_URL = process.env.NANO_GPT_BASE_URL || 'https://nano-gpt.com';

const parseBoolean = (value: string | undefined): boolean | undefined => {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  return undefined;
};

const cookieSecureOverride = parseBoolean(process.env.COOKIE_SECURE);
export const COOKIE_SECURE = cookieSecureOverride ?? process.env.NODE_ENV === 'production';

export const resolveGeneratedDir = () => {
  const envDir = process.env.GENERATED_DIR;
  if (envDir && envDir.trim()) {
    return path.isAbsolute(envDir) ? envDir : path.resolve(process.cwd(), envDir);
  }
  return path.resolve(__dirname, '../generated');
};

export const GENERATED_DIR = resolveGeneratedDir();
