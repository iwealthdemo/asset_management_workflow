/**
 * Simple test to isolate the exact issue
 */

import fetch from 'node-fetch';

async function testSimpleJobStatus() {
  console.log('🔍 Testing simple job status...');
  
  // Test without login first
  const noAuthResponse = await fetch('http://localhost:5000/api/documents/27/job-status');
  console.log('No auth response:', noAuthResponse.status);
  
  // Login
  const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'analyst1', password: 'admin123' })
  });
  
  const setCookieHeader = loginResponse.headers.get('set-cookie');
  const cookies = setCookieHeader ? setCookieHeader.split(';')[0] : '';
  
  // Test with minimal request
  const response = await fetch('http://localhost:5000/api/documents/27/job-status', {
    method: 'GET',
    headers: { 'Cookie': cookies }
  });
  
  console.log('Status:', response.status);
  console.log('Headers:', response.headers.get('content-type'));
  
  const text = await response.text();
  console.log('Response:', text);
  
  // Test with different document ID
  const response2 = await fetch('http://localhost:5000/api/documents/1/job-status', {
    method: 'GET',
    headers: { 'Cookie': cookies }
  });
  
  console.log('Status (ID 1):', response2.status);
  
  // Test with invalid ID
  const response3 = await fetch('http://localhost:5000/api/documents/abc/job-status', {
    method: 'GET',
    headers: { 'Cookie': cookies }
  });
  
  console.log('Status (invalid ID):', response3.status);
}

testSimpleJobStatus().catch(console.error);