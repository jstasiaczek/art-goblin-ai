import { db } from "./client";
import { modelsTable, projectGroupsTable, projectsTable, snippetsTable, usersTable } from "./schema";

export const seed = async () => {
  await db.delete(modelsTable);
  await db.delete(projectsTable);
  await db.delete(projectGroupsTable);
  await db.delete(snippetsTable);
  await db.delete(usersTable);

  console.log("Seeding done.");
}
