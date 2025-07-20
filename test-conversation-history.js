const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testConversationHistory() {
  console.log('=== Testing OpenAI Conversation History Feature ===\n');
  
  try {
    // Login as analyst
    console.log('1. Logging in as analyst...');
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'analyst', password: 'admin123' })
    });
    
    if (!loginResponse.ok) {
      console.log('❌ Login failed');
      return;
    }
    
    const cookies = loginResponse.headers.get('set-cookie');
    console.log('✅ Login successful\n');
    
    // Test 1: First query (no previous context)
    console.log('2. Testing FIRST query (no previous context)...');
    const firstQuery = await fetch('http://localhost:5000/api/cross-document-queries', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify({
        requestType: 'investment_request',
        requestId: 76,
        query: 'What is the main business focus of the companies mentioned?',
        documentIds: [53, 52] // 2 documents
      })
    });
    
    if (firstQuery.ok) {
      const result1 = await firstQuery.json();
      console.log('✅ First query successful');
      console.log('Answer preview:', result1.answer?.substring(0, 150) + '...\n');
    } else {
      console.log('❌ First query failed:', firstQuery.status);
      return;
    }
    
    // Wait a moment for database write
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 2: Second query (should use previous context)
    console.log('3. Testing SECOND query (should use previous response ID for context)...');
    const secondQuery = await fetch('http://localhost:5000/api/cross-document-queries', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify({
        requestType: 'investment_request',
        requestId: 76,
        query: 'Can you provide more details about their financial performance?',
        documentIds: [53, 52] // Same documents
      })
    });
    
    if (secondQuery.ok) {
      const result2 = await secondQuery.json();
      console.log('✅ Second query successful');
      console.log('Answer preview:', result2.answer?.substring(0, 150) + '...\n');
    } else {
      console.log('❌ Second query failed:', secondQuery.status);
      return;
    }
    
    // Test 3: Web search with conversation history
    console.log('4. Testing WEB SEARCH with conversation history...');
    
    // First web search
    const firstWebSearch = await fetch('http://localhost:5000/api/web-search-queries', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify({
        requestType: 'investment_request',
        requestId: 76,
        query: 'What are the latest market trends for technology companies?'
      })
    });
    
    if (firstWebSearch.ok) {
      const webResult1 = await firstWebSearch.json();
      console.log('✅ First web search successful');
      console.log('Answer preview:', webResult1.answer?.substring(0, 150) + '...\n');
    } else {
      console.log('❌ First web search failed:', firstWebSearch.status);
      return;
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Second web search (should use context)
    const secondWebSearch = await fetch('http://localhost:5000/api/web-search-queries', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify({
        requestType: 'investment_request',
        requestId: 76,
        query: 'How do these trends affect investment decisions?'
      })
    });
    
    if (secondWebSearch.ok) {
      const webResult2 = await secondWebSearch.json();
      console.log('✅ Second web search successful (with context)');
      console.log('Answer preview:', webResult2.answer?.substring(0, 150) + '...\n');
    } else {
      console.log('❌ Second web search failed:', secondWebSearch.status);
    }
    
    console.log('=== Conversation History Test Complete ===');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

testConversationHistory();