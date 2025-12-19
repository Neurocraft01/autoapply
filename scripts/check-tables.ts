import { config } from 'dotenv';
import { resolve } from 'path';
import { neon } from '@neondatabase/serverless';

// Load .env.local file
config({ path: resolve(process.cwd(), '.env.local') });

const sql = neon(process.env.DATABASE_URL!);

async function checkTables() {
  try {
    console.log('Checking job_portals table structure...\n');
    
    const result = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'job_portals'
      ORDER BY ordinal_position
    `;
    
    console.log('job_portals columns:');
    result.forEach((col: any) => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });
    
    console.log('\nChecking if portal_credentials exists...\n');
    
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name IN ('portal_credentials', 'job_portals')
    `;
    
    console.log('Tables:', tables);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkTables();
