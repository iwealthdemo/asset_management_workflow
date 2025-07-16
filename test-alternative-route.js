/**
 * Test alternative route
 */

import fetch from 'node-fetch';

async function testAlternativeRoute() {
  console.log('Testing alternative route...');
  
  // Login first
  const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'analyst1', password: 'admin123' })
  });
  
  const setCookieHeader = loginResponse.headers.get('set-cookie');
  const cookies = setCookieHeader ? setCookieHeader.split(';')[0] : '';
  
  // Test the alternative route
  console.log('Testing alternative test route...');
  const testResponse = await fetch('http://localhost:5000/api/test-job-status/27', {
    method: 'GET',
    headers: {
      'Cookie': cookies,
      'Content-Type': 'application/json'
    }
  });
  
  console.log('Alternative route response:', testResponse.status);
  if (testResponse.ok) {
    const testData = await testResponse.json();
    console.log('Alternative route data:', testData);
  } else {
    const errorText = await testResponse.text();
    console.log('Alternative route error:', errorText);
  }
  
  // Test the original route
  console.log('Testing original route...');
  const originalResponse = await fetch('http://localhost:5000/api/documents/27/job-status', {
    method: 'GET',
    headers: {
      'Cookie': cookies,
      'Content-Type': 'application/json'
    }
  });
  
  console.log('Original route response:', originalResponse.status);
  if (originalResponse.ok) {
    const originalData = await originalResponse.json();
    console.log('Original route data:', originalData);
  } else {
    const errorText = await originalResponse.text();
    console.log('Original route error:', errorText);
  }
}

testAlternativeRoute().catch(console.error);