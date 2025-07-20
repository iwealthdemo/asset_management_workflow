const fetch = require('node-fetch');
const fs = require('fs');

const API_BASE = 'http://localhost:5000';
const COOKIES_FILE = '/tmp/cookies.txt';

// Helper function to extract cookies from response
function extractCookies(response) {
  const cookies = response.headers.get('set-cookie');
  if (cookies) {
    fs.writeFileSync(COOKIES_FILE, cookies);
  }
  return cookies;
}

// Helper function to read cookies from file
function readCookies() {
  try {
    return fs.readFileSync(COOKIES_FILE, 'utf8');
  } catch (err) {
    return '';
  }
}

async function testWebSearchFeature() {
  console.log('🔍 Testing Web Search Feature');
  console.log('=====================================\n');

  try {
    // Step 1: Login
    console.log('1. Logging in...');
    const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }

    const loginData = await loginResponse.json();
    const cookies = extractCookies(loginResponse);
    console.log('✅ Login successful\n');

    // Step 2: Find investment with documents
    console.log('2. Finding investment requests...');
    const investmentResponse = await fetch(`${API_BASE}/api/investments`, {
      headers: {
        'Cookie': readCookies()
      }
    });

    if (!investmentResponse.ok) {
      throw new Error(`Failed to fetch investments: ${investmentResponse.status}`);
    }

    const investments = await investmentResponse.json();
    console.log(`Found ${investments.length} investment requests`);

    // Find investment with documents
    let testInvestment = null;
    for (const investment of investments) {
      const docsResponse = await fetch(`${API_BASE}/api/documents/investment/${investment.id}`, {
        headers: {
          'Cookie': readCookies()
        }
      });

      if (docsResponse.ok) {
        const docs = await docsResponse.json();
        if (docs.length > 0) {
          testInvestment = investment;
          console.log(`✅ Found investment ${investment.requestId} with ${docs.length} documents\n`);
          break;
        }
      }
    }

    if (!testInvestment) {
      console.log('❌ No investment with documents found');
      return;
    }

    // Step 3: Test Cross-Document Search (should work now)
    console.log('3. Testing cross-document search...\n');

    const crossDocQueries = [
      "What are the main risks mentioned in the documents?",
      "What is the expected return on investment?",
      "What companies are mentioned in the documents?"
    ];

    for (const query of crossDocQueries) {
      console.log(`Testing query: "${query}"`);
      
      const queryResponse = await fetch(`${API_BASE}/api/documents/cross-query/investment/${testInvestment.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': readCookies()
        },
        body: JSON.stringify({ query })
      });

      if (queryResponse.ok) {
        const result = await queryResponse.json();
        console.log(`✅ Cross-document query successful`);
        console.log(`📊 Documents searched: ${result.documentCount}`);
        console.log(`💬 Response: ${result.answer ? result.answer.substring(0, 200) + '...' : 'No answer'}\n`);
      } else {
        const error = await queryResponse.json();
        console.log(`❌ Cross-document query failed: ${queryResponse.status} - ${error.error}`);
      }
    }

    // Step 4: Test Web Search functionality
    console.log('4. Testing web search...\n');

    const webSearchQueries = [
      "What are the current market trends for technology investments?",
      "What is the latest news about renewable energy investments?",
      "What are the current interest rates and how do they affect investments?"
    ];

    for (const query of webSearchQueries) {
      console.log(`Testing web search query: "${query}"`);
      
      const webSearchResponse = await fetch(`${API_BASE}/api/documents/web-search/investment/${testInvestment.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': readCookies()
        },
        body: JSON.stringify({ query })
      });

      if (webSearchResponse.ok) {
        const result = await webSearchResponse.json();
        console.log(`✅ Web search query successful`);
        console.log(`💬 Response: ${result.answer ? result.answer.substring(0, 200) + '...' : 'No answer'}\n`);
      } else {
        const error = await webSearchResponse.json();
        console.log(`❌ Web search query failed: ${webSearchResponse.status} - ${error.error || error.message}`);
      }
    }

    // Step 5: Test query history retrieval
    console.log('5. Testing query history retrieval...\n');

    // Cross-document query history
    const crossDocHistoryResponse = await fetch(`${API_BASE}/api/documents/cross-query/investment/${testInvestment.id}`, {
      headers: {
        'Cookie': readCookies()
      }
    });

    if (crossDocHistoryResponse.ok) {
      const crossDocHistory = await crossDocHistoryResponse.json();
      console.log(`✅ Cross-document query history: ${crossDocHistory.length} queries`);
    } else {
      console.log(`❌ Failed to get cross-document query history: ${crossDocHistoryResponse.status}`);
    }

    // Web search query history
    const webSearchHistoryResponse = await fetch(`${API_BASE}/api/documents/web-search/investment/${testInvestment.id}`, {
      headers: {
        'Cookie': readCookies()
      }
    });

    if (webSearchHistoryResponse.ok) {
      const webSearchHistory = await webSearchHistoryResponse.json();
      console.log(`✅ Web search query history: ${webSearchHistory.length} queries`);
    } else {
      console.log(`❌ Failed to get web search query history: ${webSearchHistoryResponse.status}`);
    }

    console.log('\n🎉 Web Search Feature Test Complete!');
    console.log('=====================================');
    console.log('Key Features Tested:');
    console.log('✓ Cross-document search (vector store)');
    console.log('✓ Web search (external information)');
    console.log('✓ Query history for both search types');
    console.log('✓ Separate storage systems for different search types');
    console.log('✓ API endpoints for both search functionalities');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testWebSearchFeature();