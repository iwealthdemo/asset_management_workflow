// Simple test to verify the API endpoint is working
import fetch from 'node-fetch';

async function testSimpleAPI() {
  try {
    // Login
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    
    const cookies = loginResponse.headers.get('set-cookie');
    console.log('Login successful:', loginResponse.ok);
    
    // Test cross-document query API
    console.log('\nTesting cross-document query API...');
    const queryResponse = await fetch('http://localhost:5000/api/investments/90/cross-document-queries', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify({
        query: 'What is the name of the company in this report?',
        document_ids: [67]
      })
    });
    
    console.log('Status:', queryResponse.status);
    console.log('Content-Type:', queryResponse.headers.get('content-type'));
    
    const responseText = await queryResponse.text();
    console.log('Response type:', typeof responseText);
    console.log('Response length:', responseText.length);
    console.log('First 200 chars:', responseText.substring(0, 200));
    
    if (queryResponse.headers.get('content-type')?.includes('application/json')) {
      const jsonResponse = JSON.parse(responseText);
      console.log('JSON Response:', jsonResponse);
    } else {
      console.log('Response is not JSON - likely an error page');
    }
    
  } catch (error) {
    console.error('Test error:', error.message);
  }
}

testSimpleAPI();