const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function debugWebSearch() {
  console.log('=== WEB SEARCH DEBUG TEST ===\n');
  
  try {
    // Login
    console.log('🔐 Logging in...');
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    
    if (!loginResponse.ok) {
      console.log('❌ Login failed');
      return;
    }
    
    const cookies = loginResponse.headers.get('set-cookie');
    console.log('✅ Login successful');
    console.log('Cookies:', cookies?.substring(0, 100) + '...\n');
    
    // Test web search with proper authentication
    console.log('🌐 Testing web search API...');
    const webSearchPayload = {
      requestType: 'investment_request',
      requestId: 78,
      query: 'test web search query'
    };
    
    console.log('Payload:', JSON.stringify(webSearchPayload, null, 2));
    
    const webSearchResponse = await fetch('http://localhost:5000/api/web-search-queries', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify(webSearchPayload)
    });
    
    console.log('Response status:', webSearchResponse.status);
    console.log('Response headers:', Object.fromEntries(webSearchResponse.headers.entries()));
    
    const responseText = await webSearchResponse.text();
    console.log('Response body (first 500 chars):');
    console.log(responseText.substring(0, 500));
    
    // Try to parse as JSON
    try {
      const jsonResponse = JSON.parse(responseText);
      console.log('\n✅ Successfully parsed as JSON:', jsonResponse);
    } catch (e) {
      console.log('\n❌ Failed to parse as JSON - this is the issue!');
      console.log('This confirms the route is returning HTML instead of JSON');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

debugWebSearch();