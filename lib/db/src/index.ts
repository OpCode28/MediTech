import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

export const isDbAvailable = Boolean(process.env.DATABASE_URL);

if (!isDbAvailable) {
  console.warn(
    "[MediTech DB] DATABASE_URL is not set. Operating with fallback in-memory mock repository."
  );
}

export const pool = isDbAvailable ? new Pool({ connectionString: process.env.DATABASE_URL }) : null;
export const db = isDbAvailable ? drizzle(pool!, { schema }) : (null as any);

export * from "./schema";
export * from "./mock";
