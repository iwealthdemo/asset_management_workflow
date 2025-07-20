/**
 * Test direct database connection without route
 */

import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from './shared/schema.ts';
import { eq, desc } from 'drizzle-orm';

async function testDirectDB() {
  console.log('🔍 Testing direct database connection...');
  
  try {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle({ client: pool, schema });
    
    console.log('✅ Database connection established');
    
    // Test the exact query from the route
    const jobs = await db
      .select()
      .from(schema.backgroundJobs)
      .where(eq(schema.backgroundJobs.documentId, 27))
      .orderBy(desc(schema.backgroundJobs.createdAt));
    
    console.log('✅ Query executed successfully');
    console.log('Jobs found:', jobs.length);
    console.log('Jobs:', jobs);
    
  } catch (error) {
    console.error('❌ Database error:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
  }
}

testDirectDB();