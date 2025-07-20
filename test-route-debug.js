/**
 * Debug specific route issue
 */

import fetch from 'node-fetch';

async function testRouteDebug() {
  console.log('Testing route debugging...');
  
  // Login first
  const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'analyst1', password: 'admin123' })
  });
  
  const setCookieHeader = loginResponse.headers.get('set-cookie');
  const cookies = setCookieHeader ? setCookieHeader.split(';')[0] : '';
  
  console.log('Cookies:', cookies);
  
  // Test different endpoints to isolate the problem
  console.log('\n1. Testing documents endpoint:');
  const docsResponse = await fetch('http://localhost:5000/api/documents/investment/35', {
    method: 'GET',
    headers: {
      'Cookie': cookies,
      'Content-Type': 'application/json'
    }
  });
  console.log('Documents response:', docsResponse.status, docsResponse.ok);
  
  console.log('\n2. Testing investments endpoint:');
  const invResponse = await fetch('http://localhost:5000/api/investments', {
    method: 'GET',
    headers: {
      'Cookie': cookies,
      'Content-Type': 'application/json'
    }
  });
  console.log('Investments response:', invResponse.status, invResponse.ok);
  
  console.log('\n3. Testing job status endpoint:');
  const jobResponse = await fetch('http://localhost:5000/api/documents/27/job-status', {
    method: 'GET',
    headers: {
      'Cookie': cookies,
      'Content-Type': 'application/json'
    }
  });
  console.log('Job status response:', jobResponse.status, jobResponse.ok);
  
  // Also test if status is returning an error message
  const jobResponseText = await jobResponse.text();
  console.log('Job status body:', jobResponseText);
}

testRouteDebug().catch(console.error);