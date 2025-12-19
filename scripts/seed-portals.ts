import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { jobPortals } from '../src/lib/db/schema';

// Load environment variables from .env.local
config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

const portals = [
  {
    name: 'LinkedIn',
    url: 'https://www.linkedin.com/jobs',
    logoUrl: null,
    isActive: true,
    requiresAuth: true,
    scrapingEnabled: true,
    apiAvailable: true,
  },
  {
    name: 'Indeed',
    url: 'https://www.indeed.com',
    logoUrl: null,
    isActive: true,
    requiresAuth: true,
    scrapingEnabled: true,
    apiAvailable: true,
  },
  {
    name: 'Glassdoor',
    url: 'https://www.glassdoor.com',
    logoUrl: null,
    isActive: true,
    requiresAuth: true,
    scrapingEnabled: true,
    apiAvailable: false,
  },
  {
    name: 'ZipRecruiter',
    url: 'https://www.ziprecruiter.com',
    logoUrl: null,
    isActive: true,
    requiresAuth: true,
    scrapingEnabled: true,
    apiAvailable: false,
  },
  {
    name: 'Monster',
    url: 'https://www.monster.com',
    logoUrl: null,
    isActive: true,
    requiresAuth: true,
    scrapingEnabled: true,
    apiAvailable: false,
  },
  {
    name: 'Dice',
    url: 'https://www.dice.com',
    logoUrl: null,
    isActive: true,
    requiresAuth: true,
    scrapingEnabled: true,
    apiAvailable: false,
  },
];

async function seed() {
  try {
    console.log('Seeding job portals...');
    
    for (const portal of portals) {
      await db.insert(jobPortals).values(portal).onConflictDoNothing();
      console.log(`✓ Added ${portal.name}`);
    }
    
    console.log('✅ Seeding complete!');
  } catch (error) {
    console.error('❌ Error seeding portals:', error);
    process.exit(1);
  }
}

seed();
