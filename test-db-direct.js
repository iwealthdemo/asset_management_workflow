/**
 * Test direct database connection without route
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq, desc } from 'drizzle-orm';
import { pgTable, serial, varchar, integer, text, timestamp } from 'drizzle-orm/pg-core';
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Define background jobs table schema inline
const backgroundJobs = pgTable("background_jobs", {
  id: serial("id").primaryKey(),
  jobType: varchar("job_type", { length: 50 }),
  status: varchar("status", { length: 20 }),
  documentId: integer("document_id"),
  requestType: varchar("request_type", { length: 50 }),
  requestId: integer("request_id"),
  priority: varchar("priority", { length: 10 }),
  attempts: integer("attempts"),
  maxAttempts: integer("max_attempts"),
  errorMessage: text("error_message"),
  result: text("result"),
  createdAt: timestamp("created_at"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
});

const db = drizzle({ client: pool });

async function testDirectDB() {
  try {
    console.log('Testing direct database connection...');
    
    // Test 1: Simple query
    console.log('Test 1: Simple table query');
    const result = await db.select().from(backgroundJobs).limit(5);
    console.log('Simple query result:', result);
    
    // Test 2: Query with document ID 27
    console.log('\nTest 2: Query with document ID 27');
    const result2 = await db
      .select()
      .from(backgroundJobs)
      .where(eq(backgroundJobs.documentId, 27))
      .orderBy(desc(backgroundJobs.createdAt));
    console.log('Filtered query result:', result2);
    
    console.log('\n✅ Direct database queries successful!');
    
  } catch (error) {
    console.error('❌ Direct database query failed:', error);
    console.error('Error stack:', error.stack);
  }
}

testDirectDB().catch(console.error);