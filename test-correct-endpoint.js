// Test the correct API endpoint structure
import fetch from 'node-fetch';

async function testCorrectEndpoint() {
  try {
    // Login
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    
    const cookies = loginResponse.headers.get('set-cookie');
    console.log('✅ Login successful');
    
    // Test 1: Try the unified cross-document endpoint  
    console.log('\n🔍 Testing unified cross-document endpoint...');
    const unifiedResponse = await fetch('http://localhost:5000/api/cross-document-queries', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify({
        requestId: 90,  // Investment request ID
        query: 'What company is this annual report from?',
        documentIds: [67]
      })
    });
    
    console.log('Unified endpoint status:', unifiedResponse.status);
    console.log('Content-Type:', unifiedResponse.headers.get('content-type'));
    
    if (unifiedResponse.headers.get('content-type')?.includes('application/json')) {
      const result = await unifiedResponse.json();
      console.log('✅ SUCCESS! Got JSON response');
      console.log('Response keys:', Object.keys(result));
      console.log('Success:', result.success);
      console.log('Answer length:', result.answer?.length || 0);
      if (result.answer) {
        console.log('Answer preview:', result.answer.substring(0, 200) + '...');
      }
    } else {
      console.log('❌ Not JSON response');
      const text = await unifiedResponse.text();
      console.log('Response preview:', text.substring(0, 200));
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testCorrectEndpoint();