/**
 * Debug Job Status API
 */

import fetch from 'node-fetch';

async function testJobStatusAPI() {
  console.log('Testing job status API...');
  
  // Login first
  const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'analyst1', password: 'admin123' })
  });
  
  const setCookieHeader = loginResponse.headers.get('set-cookie');
  const cookies = setCookieHeader ? setCookieHeader.split(';')[0] : '';
  
  console.log('Login successful, cookies:', cookies);
  
  // Test job status API
  const jobStatusResponse = await fetch('http://localhost:5000/api/documents/27/job-status', {
    method: 'GET',
    headers: {
      'Cookie': cookies,
      'Content-Type': 'application/json'
    }
  });
  
  console.log('Job status response status:', jobStatusResponse.status);
  const responseText = await jobStatusResponse.text();
  console.log('Job status response body:', responseText);
  
  // Test with different document ID
  const jobStatusResponse2 = await fetch('http://localhost:5000/api/documents/1/job-status', {
    method: 'GET',
    headers: {
      'Cookie': cookies,
      'Content-Type': 'application/json'
    }
  });
  
  console.log('Job status response 2 status:', jobStatusResponse2.status);
  const responseText2 = await jobStatusResponse2.text();
  console.log('Job status response 2 body:', responseText2);
}

testJobStatusAPI().catch(console.error);