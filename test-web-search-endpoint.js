// Test the new POST /search/web endpoint integration
import fetch from 'node-fetch';

async function testWebSearchEndpoint() {
  try {
    console.log('=== TESTING POST /search/web ENDPOINT ===\n');
    
    // Login first
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    
    if (!loginResponse.ok) {
      console.log('❌ Authentication failed');
      return;
    }
    
    const cookies = loginResponse.headers.get('set-cookie');
    console.log('✅ Authentication successful\n');
    
    // Test the new /search/web endpoint
    console.log('🔍 Testing POST /search/web endpoint...');
    console.log('Payload: {"requestId": 90, "query": "What are the latest trends in investment banking 2025?"}');
    
    const webSearchResponse = await fetch('http://localhost:5000/api/search/web', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify({
        requestId: 90,
        query: "What are the latest trends in investment banking 2025?"
      })
    });
    
    console.log('Status:', webSearchResponse.status);
    console.log('Content-Type:', webSearchResponse.headers.get('content-type'));
    
    if (webSearchResponse.ok) {
      const result = await webSearchResponse.json();
      console.log('✅ SUCCESS - New endpoint working!');
      console.log('Response keys:', Object.keys(result));
      console.log('Success flag:', result.success);
      console.log('Answer length:', result.answer?.length || 0, 'characters');
      console.log('Response ID:', result.responseId || 'Not provided');
      console.log('Answer preview:', result.answer?.substring(0, 200) + '...');
      
      // Verify the response is stored in database
      console.log('\n🔍 Verifying database storage...');
      const historyResponse = await fetch('http://localhost:5000/api/web-search-queries?requestId=90', {
        headers: { 'Cookie': cookies }
      });
      
      if (historyResponse.ok) {
        const history = await historyResponse.json();
        console.log('✅ Database verification successful');
        console.log('Query history count:', history.length);
        
        if (history.length > 0) {
          const latestQuery = history[0];
          console.log('Latest query in DB:', latestQuery.query);
          console.log('Latest response length:', latestQuery.response?.length || 0);
        }
      } else {
        console.log('⚠️ Could not verify database storage (history endpoint issue)');
      }
      
    } else {
      const error = await webSearchResponse.json();
      console.log('❌ FAILED');
      console.log('Error:', error);
    }
    
    console.log('\n=== TEST COMPLETE ===');
    console.log('Summary: POST /search/web endpoint integration test');
    console.log('This verifies the Research & Analysis section can use the new endpoint');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testWebSearchEndpoint();