#!/usr/bin/env node

/**
 * Test script to demonstrate document scope control in cross-document search
 * This will show exactly what API payloads are sent to OpenAI
 */

import https from 'https';
import http from 'http';

// Test configuration
const BASE_URL = 'http://localhost:5000';
const TEST_CREDENTIALS = {
  username: 'admin',
  password: 'admin123'
};

// Helper function to make HTTP requests
function makeRequest(path, method = 'GET', data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (data && method !== 'GET') {
      const jsonData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(jsonData);
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const responseData = body ? JSON.parse(body) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: responseData
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: body
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data && method !== 'GET') {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Test suite
async function runTests() {
  console.log('🔍 Testing Document Scope Control in Cross-Document Search');
  console.log('=======================================================\n');

  try {
    // Step 1: Login
    console.log('1. Logging in...');
    const loginResponse = await makeRequest('/api/auth/login', 'POST', TEST_CREDENTIALS);
    
    if (loginResponse.status !== 200) {
      throw new Error(`Login failed: ${loginResponse.status} - ${JSON.stringify(loginResponse.data)}`);
    }

    const cookies = loginResponse.headers['set-cookie'];
    const sessionCookie = cookies ? cookies.find(c => c.startsWith('connect.sid=')) : null;
    
    if (!sessionCookie) {
      throw new Error('No session cookie received');
    }

    console.log('✅ Login successful');
    
    const headers = {
      'Cookie': sessionCookie
    };

    // Step 2: Find investment with multiple documents
    console.log('\n2. Finding investment requests with multiple documents...');
    const investmentsResponse = await makeRequest('/api/investments', 'GET', null, headers);
    
    if (investmentsResponse.status !== 200) {
      throw new Error(`Failed to get investments: ${investmentsResponse.status}`);
    }

    const investments = investmentsResponse.data;
    console.log(`Found ${investments.length} investment requests`);

    // Find an investment with multiple documents
    let testInvestment = null;
    let testDocuments = [];
    
    for (const investment of investments) {
      const documentsResponse = await makeRequest(`/api/documents/investment/${investment.id}`, 'GET', null, headers);
      if (documentsResponse.status === 200 && documentsResponse.data.length > 1) {
        testInvestment = investment;
        testDocuments = documentsResponse.data;
        console.log(`✅ Found investment ${investment.requestId} with ${documentsResponse.data.length} documents`);
        console.log('Documents:', testDocuments.map(d => ({ id: d.id, name: d.originalName })));
        break;
      }
    }

    if (!testInvestment) {
      console.log('❌ No investment with multiple documents found for scope testing');
      return;
    }

    // Step 3: Test document scope control with different selections
    console.log('\n3. Testing document scope control...');
    
    const testQuery = 'What are the main financial metrics mentioned in the documents?';
    
    // Test 1: Search all documents
    console.log('\n3a. Testing search across ALL documents:');
    console.log(`Query: "${testQuery}"`);
    console.log(`Document IDs: [ALL] ${testDocuments.map(d => d.id).join(', ')}`);
    
    const allDocsResponse = await makeRequest(
      '/api/cross-document-queries',
      'POST',
      {
        requestId: testInvestment.id,
        query: testQuery,
        documentIds: testDocuments.map(d => d.id)
      },
      headers
    );
    
    console.log('API Response Status:', allDocsResponse.status);
    if (allDocsResponse.status === 200) {
      console.log('✅ All documents search successful');
      console.log('Document Count:', allDocsResponse.data.documentCount);
    } else {
      console.log('❌ All documents search failed:', allDocsResponse.data);
    }

    // Test 2: Search only first document
    if (testDocuments.length > 1) {
      console.log('\n3b. Testing search with SINGLE document selection:');
      console.log(`Query: "${testQuery}"`);
      console.log(`Document IDs: [${testDocuments[0].id}] (${testDocuments[0].originalName})`);
      
      const singleDocResponse = await makeRequest(
        '/api/cross-document-queries',
        'POST',
        {
          requestId: testInvestment.id,
          query: testQuery,
          documentIds: [testDocuments[0].id]
        },
        headers
      );
      
      console.log('API Response Status:', singleDocResponse.status);
      if (singleDocResponse.status === 200) {
        console.log('✅ Single document search successful');
        console.log('Document Count:', singleDocResponse.data.documentCount);
      } else {
        console.log('❌ Single document search failed:', singleDocResponse.data);
      }
    }

    // Test 3: Search subset of documents
    if (testDocuments.length > 2) {
      console.log('\n3c. Testing search with SUBSET of documents:');
      const subsetIds = testDocuments.slice(0, 2).map(d => d.id);
      console.log(`Query: "${testQuery}"`);
      console.log(`Document IDs: [${subsetIds.join(', ')}]`);
      
      const subsetResponse = await makeRequest(
        '/api/cross-document-queries',
        'POST',
        {
          requestId: testInvestment.id,
          query: testQuery,
          documentIds: subsetIds
        },
        headers
      );
      
      console.log('API Response Status:', subsetResponse.status);
      if (subsetResponse.status === 200) {
        console.log('✅ Subset documents search successful');
        console.log('Document Count:', subsetResponse.data.documentCount);
      } else {
        console.log('❌ Subset documents search failed:', subsetResponse.data);
      }
    }

    console.log('\n🎉 Document Scope Control Test Complete!');
    console.log('=====================================');
    console.log('✅ Check the server logs to see the exact OpenAI API payloads');
    console.log('✅ The logs show how document IDs are filtered and sent to OpenAI');
    console.log('✅ Enhanced queries include specific document names for scope control');

  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
    console.error(error.stack);
  }
}

// Run the tests
runTests().catch(console.error);