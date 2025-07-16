/**
 * Test to isolate and fix job status API error
 */

import fetch from 'node-fetch';

async function testJobStatusFix() {
  console.log('🔍 Testing job status API fix...');
  
  // Login first
  const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'analyst1', password: 'admin123' })
  });
  
  const setCookieHeader = loginResponse.headers.get('set-cookie');
  const cookies = setCookieHeader ? setCookieHeader.split(';')[0] : '';
  
  // Test with existing document ID 27 (from previous test)
  const testDocId = 27;
  
  const jobStatusResponse = await fetch(`http://localhost:5000/api/documents/${testDocId}/job-status`, {
    method: 'GET',
    headers: {
      'Cookie': cookies,
      'Content-Type': 'application/json'
    }
  });
  
  console.log('Response status:', jobStatusResponse.status);
  const responseText = await jobStatusResponse.text();
  console.log('Response body:', responseText);
  
  if (jobStatusResponse.status === 500) {
    console.log('❌ Still getting 500 error');
    
    // Let's check the database directly
    console.log('\n📊 Checking database directly...');
    
    // Create a simple database test
    const dbTestResponse = await fetch('http://localhost:5000/api/investments', {
      method: 'GET',
      headers: {
        'Cookie': cookies,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('DB test response status:', dbTestResponse.status);
    
    if (dbTestResponse.ok) {
      console.log('✅ Database connection is working');
      console.log('❌ Issue is specifically with background jobs table query');
    }
  } else {
    console.log('✅ Job status API is working!');
  }
}

testJobStatusFix().catch(console.error);