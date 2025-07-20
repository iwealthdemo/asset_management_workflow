/**
 * Test simple route registration
 */

import fetch from 'node-fetch';

async function testSimpleRoute() {
  console.log('Testing simple route registration...');
  
  // Login first
  const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'analyst1', password: 'admin123' })
  });
  
  const setCookieHeader = loginResponse.headers.get('set-cookie');
  const cookies = setCookieHeader ? setCookieHeader.split(';')[0] : '';
  
  // Test that other routes work
  console.log('Testing other routes work...');
  const testResponse = await fetch('http://localhost:5000/api/auth/me', {
    method: 'GET',
    headers: {
      'Cookie': cookies,
      'Content-Type': 'application/json'
    }
  });
  
  console.log('Auth me response:', testResponse.status);
  
  // Test the problematic route
  console.log('Testing problematic route...');
  const problemResponse = await fetch('http://localhost:5000/api/documents/27/job-status', {
    method: 'GET',
    headers: {
      'Cookie': cookies,
      'Content-Type': 'application/json'
    }
  });
  
  console.log('Job status route response:', problemResponse.status);
  
  // Try a different document ID
  console.log('Testing with different document ID...');
  const altResponse = await fetch('http://localhost:5000/api/documents/1/job-status', {
    method: 'GET',
    headers: {
      'Cookie': cookies,
      'Content-Type': 'application/json'
    }
  });
  
  console.log('Alt job status route response:', altResponse.status);
  
  // Test the job status route without authentication
  console.log('Testing job status without auth...');
  const noAuthResponse = await fetch('http://localhost:5000/api/documents/27/job-status', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });
  
  console.log('No auth job status response:', noAuthResponse.status);
  const noAuthText = await noAuthResponse.text();
  console.log('No auth response text:', noAuthText);
}

testSimpleRoute().catch(console.error);