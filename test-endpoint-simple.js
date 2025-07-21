// Simple test to debug the endpoint issue
import fetch from 'node-fetch';

async function testEndpoint() {
  try {
    console.log('Testing authentication first...');
    
    // Login
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    
    const cookies = loginResponse.headers.get('set-cookie');
    console.log('Login successful, cookies:', cookies ? 'Present' : 'Missing');
    
    // Test with authentication
    console.log('\nTesting POST /search/web with auth...');
    const response = await fetch('http://localhost:5000/search/web', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookies || ''
      },
      body: JSON.stringify({
        requestId: 90,
        query: "test query"
      })
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers));
    
    const text = await response.text();
    console.log('Response body (first 500 chars):', text.substring(0, 500));
    
    // Try JSON parsing
    try {
      const json = JSON.parse(text);
      console.log('✅ Valid JSON response:', json);
    } catch (e) {
      console.log('❌ Not valid JSON response');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testEndpoint();