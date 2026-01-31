import { neon, NeonQueryFunction } from "@neondatabase/serverless";
import { drizzle, NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Lazy initialization to avoid build-time errors when DATABASE_URL is not set
let _db: NeonHttpDatabase<typeof schema> | null = null;

function getDb(): NeonHttpDatabase<typeof schema> {
  if (!_db) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    const sql: NeonQueryFunction<false, false> = neon(process.env.DATABASE_URL);
    _db = drizzle(sql, { schema });
  }
  return _db;
}

export const db = new Proxy({} as NeonHttpDatabase<typeof schema>, {
  get(_target, prop) {
    return getDb()[prop as keyof NeonHttpDatabase<typeof schema>];
  },
});
