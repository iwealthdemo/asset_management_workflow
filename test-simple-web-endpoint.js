// Simple test to check if the endpoint is working
import fetch from 'node-fetch';

async function testSimpleEndpoint() {
  try {
    // Login first
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    
    const cookies = loginResponse.headers.get('set-cookie');
    console.log('✅ Login successful');
    
    // Test the endpoint with a simple payload
    console.log('\n🔍 Testing POST /api/search/web...');
    const response = await fetch('http://localhost:5000/api/search/web', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify({
        requestId: 90,
        query: "simple test query"
      })
    });
    
    console.log('Status:', response.status);
    console.log('Content-Type:', response.headers.get('content-type'));
    
    const responseText = await response.text();
    console.log('Response length:', responseText.length);
    console.log('Response preview (first 200 chars):', responseText.substring(0, 200));
    
    // Try to identify if it's HTML
    if (responseText.startsWith('<!DOCTYPE') || responseText.includes('<html>')) {
      console.log('❌ Response is HTML, not JSON - endpoint may not be working');
    } else {
      try {
        const json = JSON.parse(responseText);
        console.log('✅ Valid JSON response:', json);
      } catch (e) {
        console.log('❌ Response is not JSON:', e.message);
      }
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testSimpleEndpoint();