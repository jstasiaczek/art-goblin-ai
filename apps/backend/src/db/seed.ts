import { seed } from './sqlite/seed';

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});