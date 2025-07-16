/**
 * Debug the error handler to see what's causing the 500 error
 */

import fetch from 'node-fetch';

async function debugErrorHandler() {
  console.log('🔍 Debugging error handler...');
  
  // Login first
  const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'analyst1', password: 'admin123' })
  });
  
  const setCookieHeader = loginResponse.headers.get('set-cookie');
  const cookies = setCookieHeader ? setCookieHeader.split(';')[0] : '';
  
  console.log('✅ Login successful');
  
  // Make the failing request and check response headers
  const jobStatusResponse = await fetch('http://localhost:5000/api/documents/27/job-status', {
    method: 'GET',
    headers: {
      'Cookie': cookies,
      'Content-Type': 'application/json'
    }
  });
  
  console.log('📊 Response Status:', jobStatusResponse.status);
  console.log('📊 Response Headers:', Object.fromEntries(jobStatusResponse.headers.entries()));
  
  const responseText = await jobStatusResponse.text();
  console.log('📊 Response Body:', responseText);
  
  // Check if there are any other endpoints that might be conflicting
  console.log('\n🔍 Testing similar endpoints...');
  
  // Test the documents endpoint that works
  const docsResponse = await fetch('http://localhost:5000/api/documents/investment/35', {
    method: 'GET',
    headers: {
      'Cookie': cookies,
      'Content-Type': 'application/json'
    }
  });
  
  console.log('📋 Documents endpoint status:', docsResponse.status);
  
  // Test prepare-ai endpoint (similar pattern)
  const prepareResponse = await fetch('http://localhost:5000/api/documents/27/prepare-ai', {
    method: 'POST',
    headers: {
      'Cookie': cookies,
      'Content-Type': 'application/json'
    }
  });
  
  console.log('📋 Prepare AI endpoint status:', prepareResponse.status);
  
  // Test get-insights endpoint (similar pattern)
  const insightsResponse = await fetch('http://localhost:5000/api/documents/27/get-insights', {
    method: 'POST',
    headers: {
      'Cookie': cookies,
      'Content-Type': 'application/json'
    }
  });
  
  console.log('📋 Get insights endpoint status:', insightsResponse.status);
}

debugErrorHandler().catch(console.error);