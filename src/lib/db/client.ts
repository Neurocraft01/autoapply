import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('Missing DATABASE_URL environment variable. Please check your .env.local file.');
}

// Create Neon SQL client
const sql = neon(databaseUrl || '');

// Create Drizzle ORM client
export const db = drizzle(sql);

// Export the SQL client for raw queries if needed
export const neonClient = sql;
