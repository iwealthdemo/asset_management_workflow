#!/usr/bin/env node

/**
 * Test LLM Service API directly to understand parameter structure
 */

import fetch from 'node-fetch';

const LLM_SERVICE_URL = 'https://llm-api-service-vinay2k.replit.app';
const API_KEY = 'aa123456789bb';

async function testLLMServiceAPI() {
  console.log('🔧 Testing LLM Service API Endpoints\n');

  try {
    // Test 1: Health check
    console.log('1️⃣ Testing health endpoint...');
    const healthResponse = await fetch(`${LLM_SERVICE_URL}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health:', healthData.status);
    console.log('   Vector Store:', healthData.default_vector_store);

    // Test 2: Check available endpoints
    console.log('\n2️⃣ Testing docs endpoint...');
    const docsResponse = await fetch(`${LLM_SERVICE_URL}/docs`, {
      headers: { 'X-API-Key': API_KEY }
    });
    
    if (docsResponse.ok) {
      const docsText = await docsResponse.text();
      console.log('✅ API Documentation available');
      
      // Extract endpoint info
      const endpoints = docsText.match(/POST\s+\/[^\s]+/g) || [];
      console.log('   Available POST endpoints:');
      endpoints.forEach(endpoint => console.log(`     ${endpoint}`));
    }

    // Test 3: Try investment insights endpoint
    console.log('\n3️⃣ Testing investment insights endpoint...');
    const insightsPayload = {
      document_ids: ['test-document.txt'],
      analysis_focus: 'comprehensive',
      context: {
        document_id: '64',
        request_id: '87',
        company_name: 'Test Corp'
      }
    };

    console.log('Sending payload:', JSON.stringify(insightsPayload, null, 2));

    const insightsResponse = await fetch(`${LLM_SERVICE_URL}/analysis/investment-insights`, {
      method: 'POST',
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(insightsPayload)
    });

    console.log(`Status: ${insightsResponse.status}`);
    const insightsData = await insightsResponse.text();
    console.log('Response:', insightsData);

    // Test 4: Try document analysis endpoint
    console.log('\n4️⃣ Testing document analysis endpoint...');
    const analysisPayload = {
      document_id: 'test-document.txt',
      analysis_type: 'investment',
      context: {
        document_id: '64',
        request_id: '87'
      }
    };

    const analysisResponse = await fetch(`${LLM_SERVICE_URL}/documents/analyze`, {
      method: 'POST',
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(analysisPayload)
    });

    console.log(`Analysis Status: ${analysisResponse.status}`);
    const analysisData = await analysisResponse.text();
    console.log('Analysis Response:', analysisData);

  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
  }
}

testLLMServiceAPI();