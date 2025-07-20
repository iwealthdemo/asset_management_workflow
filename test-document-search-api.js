const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testDocumentSearch() {
  console.log('=== DOCUMENT SEARCH API TEST ===\n');
  
  try {
    // Login
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    
    const cookies = loginResponse.headers.get('set-cookie');
    console.log('✅ Authentication successful\n');
    
    // Test Document Search with valid document IDs (54-58)
    console.log('📄 Testing Document Search (file_search API)...');
    const docSearchResponse = await fetch('http://localhost:5000/api/cross-document-queries', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify({
        requestType: 'investment_request',
        requestId: 78,
        query: 'What are the key financial metrics mentioned in these documents?',
        documentIds: [54, 55] // Valid document IDs
      })
    });
    
    console.log('Document Search Response Status:', docSearchResponse.status);
    
    if (docSearchResponse.ok) {
      const result = await docSearchResponse.json();
      console.log('✅ Document search successful');
      console.log('📝 Answer Preview:', result.answer?.substring(0, 200) + '...');
      console.log('🆔 Response ID:', result.responseId);
      console.log('📊 Token Usage:', {
        input: result.inputTokens,
        output: result.outputTokens,
        total: result.totalTokens
      });
    } else {
      const errorText = await docSearchResponse.text();
      console.log('❌ Document search failed');
      console.log('Error:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testDocumentSearch();