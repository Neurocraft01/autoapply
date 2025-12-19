import { config } from 'dotenv';
import { resolve } from 'path';
import { neon } from '@neondatabase/serverless';

// Load .env.local file
config({ path: resolve(process.cwd(), '.env.local') });

const sql = neon(process.env.DATABASE_URL!);

async function setupTables() {
  try {
    console.log('Migrating job_portals table...');
    
    // Drop and recreate job_portals with correct schema
    await sql`DROP TABLE IF EXISTS portal_credentials CASCADE`;
    console.log('✓ Dropped portal_credentials');
    
    await sql`DROP TABLE IF EXISTS job_portals CASCADE`;
    console.log('✓ Dropped old job_portals');
    
    await sql`
      CREATE TABLE job_portals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL UNIQUE,
        url TEXT NOT NULL,
        logo_url TEXT,
        is_active BOOLEAN DEFAULT true NOT NULL,
        requires_auth BOOLEAN DEFAULT true NOT NULL,
        scraping_enabled BOOLEAN DEFAULT true NOT NULL,
        api_available BOOLEAN DEFAULT false NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `;
    console.log('✓ Created new job_portals table');
    
    await sql`
      CREATE TABLE portal_credentials (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        portal_id UUID NOT NULL REFERENCES job_portals(id) ON DELETE CASCADE,
        username TEXT NOT NULL,
        encrypted_password TEXT NOT NULL,
        is_active BOOLEAN DEFAULT true NOT NULL,
        last_used TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
        UNIQUE(user_id, portal_id)
      )
    `;
    console.log('✓ Created portal_credentials table');
    
    console.log('Inserting default portals...');
    
    await sql`
      INSERT INTO job_portals (name, url, is_active, requires_auth, scraping_enabled, api_available)
      VALUES 
        ('LinkedIn', 'https://www.linkedin.com/jobs', true, true, true, true),
        ('Indeed', 'https://www.indeed.com', true, true, true, true),
        ('Glassdoor', 'https://www.glassdoor.com', true, true, true, false),
        ('ZipRecruiter', 'https://www.ziprecruiter.com', true, true, true, false),
        ('Monster', 'https://www.monster.com', true, true, true, false),
        ('Dice', 'https://www.dice.com', true, true, true, false)
    `;
    
    console.log('✓ Default portals inserted');
    
    console.log('\n✅ Database setup complete!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

setupTables();
