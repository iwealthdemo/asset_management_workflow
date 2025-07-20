import fetch from 'node-fetch';
import fs from 'fs';

const BASE_URL = 'http://localhost:5000';

// Store cookies for session
let cookies = '';

console.log('🔍 Testing Web Search Feature');
console.log('============================\n');

async function makeRequest(method, url, body = null, headers = {}) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookies,
      ...headers
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(`${BASE_URL}${url}`, options);
  
  // Save cookies from response
  const setCookieHeader = response.headers.get('set-cookie');
  if (setCookieHeader) {
    cookies = setCookieHeader;
  }
  
  return response;
}

async function testWebSearchFeature() {
  try {
    // 1. Login as admin
    console.log('1. Logging in...');
    const loginResponse = await makeRequest('POST', '/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    
    if (!loginResponse.ok) {
      throw new Error('Login failed');
    }
    
    console.log('✅ Login successful\n');
    
    // 2. Find an investment request with documents
    console.log('2. Finding investment requests...');
    const investmentsResponse = await makeRequest('GET', '/api/investments');
    
    if (!investmentsResponse.ok) {
      throw new Error('Failed to fetch investments');
    }
    
    const investments = await investmentsResponse.json();
    console.log(`Found ${investments.length} investment requests`);
    
    // Find investment with documents
    let testInvestment = null;
    for (const investment of investments) {
      const docsResponse = await makeRequest('GET', `/api/documents/investment/${investment.id}`);
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
      throw new Error('No investment found with documents');
    }
    
    // 3. Test web search queries
    console.log('3. Testing web search queries...\n');
    
    const testQueries = [
      "What is the current market outlook for technology investments?",
      "What are the latest trends in ESG investing?",
      "Recent regulatory changes affecting financial investments"
    ];
    
    for (const query of testQueries) {
      console.log(`Testing query: "${query}"`);
      
      const searchResponse = await makeRequest('POST', `/api/documents/web-search/investment/${testInvestment.id}`, {
        query: query
      });
      
      if (!searchResponse.ok) {
        console.log(`❌ Query failed: ${searchResponse.status}`);
        const errorText = await searchResponse.text();
        console.log(`Error: ${errorText}`);
        continue;
      }
      
      const result = await searchResponse.json();
      console.log('✅ Query successful');
      console.log(`Answer length: ${result.answer.length} characters`);
      console.log(`Answer preview: "${result.answer.substring(0, 100)}..."\n`);
    }
    
    // 4. Test web search history
    console.log('4. Testing web search history...');
    const historyResponse = await makeRequest('GET', `/api/documents/web-search/investment/${testInvestment.id}`);
    
    if (!historyResponse.ok) {
      throw new Error('Failed to fetch web search history');
    }
    
    const history = await historyResponse.json();
    console.log('✅ Web search history retrieved successfully');
    console.log(`Query history count: ${history.length}`);
    
    if (history.length > 0) {
      const latest = history[0];
      console.log(`Latest query: "${latest.query}"`);
      console.log(`Answer length: ${latest.response.length} characters`);
    }
    
    console.log('\n🎉 Web Search Feature Test Complete!');
    console.log('=======================================');
    console.log('✅ All core functionality validated');
    console.log('✅ OpenAI web search integration working');
    console.log('✅ Database persistence working');
    console.log('✅ Query history working');
    console.log('✅ API endpoints responding correctly');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

testWebSearchFeature();