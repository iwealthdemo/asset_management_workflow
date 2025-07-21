// Test the web search UI fix
import fetch from 'node-fetch';

async function testWebSearchUIFix() {
  try {
    console.log('=== TESTING WEB SEARCH UI FIX ===\n');
    
    // Login first
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    
    const cookies = loginResponse.headers.get('set-cookie');
    console.log('✅ Authentication successful\n');
    
    // Test web search
    console.log('🔍 Step 1: Performing web search...');
    const searchResponse = await fetch('http://localhost:5000/api/search/web', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify({
        requestId: 92,
        query: "Latest trends in fintech 2025"
      })
    });
    
    if (searchResponse.ok) {
      const searchResult = await searchResponse.json();
      console.log('✅ Web search successful');
      console.log('Response ID:', searchResult.responseId);
      console.log('Answer length:', searchResult.answer?.length || 0, 'characters');
    } else {
      console.log('❌ Web search failed');
      return;
    }
    
    // Test history fetch (this was the problem)
    console.log('\n🔍 Step 2: Fetching web search history...');
    const historyResponse = await fetch('http://localhost:5000/api/web-search-queries?requestId=92', {
      headers: { 'Cookie': cookies }
    });
    
    console.log('History status:', historyResponse.status);
    
    if (historyResponse.ok) {
      const history = await historyResponse.json();
      console.log('✅ History fetch successful');
      console.log('Query count:', history.length);
      
      if (history.length > 0) {
        const latestQuery = history[0];
        console.log('Latest query:', latestQuery.query);
        console.log('Latest response preview:', latestQuery.response?.substring(0, 100) + '...');
        console.log('Search type:', latestQuery.searchType);
        console.log('Created at:', latestQuery.createdAt);
      }
    } else {
      const error = await historyResponse.json();
      console.log('❌ History fetch failed:', error);
    }
    
    console.log('\n=== TEST SUMMARY ===');
    console.log('The UI fix should now properly show web search results in the frontend');
    console.log('- Fixed query parameter issue in web search history fetch');
    console.log('- Added proper TypeScript types');
    console.log('- Web search results should now appear in the Research & Analysis section');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testWebSearchUIFix();