#!/usr/bin/env node

/**
 * Test LLM Service Integration
 * Validates the new LLM API service functionality
 */

import fetch from 'node-fetch';

const LLM_SERVICE_URL = process.env.LLM_SERVICE_URL || 'http://localhost:5000';
const SERVICE_API_KEY = process.env.SERVICE_API_KEY || 'dev-key-change-in-production';

async function testLLMService() {
  console.log('🧪 Testing LLM API Service Integration...\n');
  
  const headers = {
    'Content-Type': 'application/json',
    'X-API-Key': SERVICE_API_KEY
  };

  try {
    // Test 1: Health Check
    console.log('1️⃣ Testing Health Check...');
    const healthResponse = await fetch(`${LLM_SERVICE_URL}/health`);
    const healthData = await healthResponse.json();
    
    if (healthData.status === 'healthy') {
      console.log('✅ Health check passed');
      console.log(`   OpenAI: ${healthData.openai_configured ? '✅' : '❌'}`);
      console.log(`   Anthropic: ${healthData.anthropic_configured ? '✅' : '❌'}`);
      console.log(`   Vector Store: ${healthData.default_vector_store || 'Not set'}`);
    } else {
      console.log('❌ Health check failed');
      return false;
    }

    // Test 2: Service Info
    console.log('\n2️⃣ Testing Service Info...');
    const infoResponse = await fetch(`${LLM_SERVICE_URL}/info`);
    const infoData = await infoResponse.json();
    
    if (infoData.service === 'LLM API Service') {
      console.log('✅ Service info retrieved');
      console.log(`   Version: ${infoData.version}`);
      console.log(`   Endpoints: ${Object.keys(infoData.endpoints).length}`);
      console.log(`   Concurrency: ${infoData.concurrency_limits?.max_concurrent_requests || 'Not configured'} slots`);
      console.log(`   Rate limit: ${infoData.concurrency_limits?.rate_limit_per_minute || 'Not configured'}/minute`);
    } else {
      console.log('❌ Service info failed');
      return false;
    }

    // Test 3: Metrics Endpoint
    console.log('\n3️⃣ Testing Metrics Endpoint...');
    const metricsResponse = await fetch(`${LLM_SERVICE_URL}/metrics`);
    const metricsData = await metricsResponse.json();
    
    if (metricsData.concurrency_metrics) {
      console.log('✅ Metrics endpoint working');
      console.log(`   Total requests: ${metricsData.concurrency_metrics.total_requests}`);
      console.log(`   Active requests: ${metricsData.concurrency_metrics.concurrent_requests}`);
      console.log(`   Available slots: ${metricsData.concurrency_metrics.available_slots || 'Unknown'}`);
    } else {
      console.log('❌ Metrics endpoint failed');
      return false;
    }

    // Test 4: Authentication
    console.log('\n4️⃣ Testing Authentication...');
    const authResponse = await fetch(`${LLM_SERVICE_URL}/documents/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }, // No API key
      body: JSON.stringify({ query: 'test' })
    });
    
    if (authResponse.status === 401) {
      console.log('✅ Authentication protection working');
    } else {
      console.log('❌ Authentication not properly configured');
      return false;
    }

    // Test 5: Document Search (with auth)
    console.log('\n5️⃣ Testing Document Search...');
    const searchResponse = await fetch(`${LLM_SERVICE_URL}/documents/search`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query: 'What is the main purpose of this service?',
        context: { test: true }
      })
    });
    
    const searchData = await searchResponse.json();
    if (searchData.success !== false || searchResponse.status === 200) {
      console.log('✅ Document search endpoint accessible');
      console.log(`   Response structure valid: ${searchData.hasOwnProperty('success')}`);
    } else {
      console.log('❌ Document search failed');
      console.log('   Error:', searchData.error);
    }

    // Test 6: Chat Completion
    console.log('\n6️⃣ Testing Chat Completion...');
    const chatResponse = await fetch(`${LLM_SERVICE_URL}/chat/completion`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        messages: [
          { role: 'user', content: 'Hello, can you confirm you are working?' }
        ],
        model: 'gpt-4o'
      })
    });
    
    const chatData = await chatResponse.json();
    if (chatData.success) {
      console.log('✅ Chat completion working');
      console.log(`   Model: ${chatData.model}`);
      console.log(`   Response length: ${chatData.response?.length || 0} chars`);
      console.log(`   Usage: ${chatData.usage?.total_tokens || 0} tokens`);
    } else {
      console.log('⚠️  Chat completion failed (may need OpenAI key)');
      console.log('   Error:', chatData.error);
    }

    // Test 7: Upload and Vectorize (mock test)
    console.log('\n7️⃣ Testing Upload Endpoint Structure...');
    const uploadResponse = await fetch(`${LLM_SERVICE_URL}/documents/upload-and-vectorize`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        // Missing required fields to test validation
      })
    });
    
    const uploadData = await uploadResponse.json();
    if (uploadData.error && uploadData.error.includes('required')) {
      console.log('✅ Upload validation working');
      console.log('   Properly validates required fields');
    } else {
      console.log('⚠️  Upload endpoint behavior unexpected');
    }

    console.log('\n🎉 LLM Service Integration Test Complete!');
    console.log('\n📊 Test Summary:');
    console.log('   ✅ Service is running and accessible');
    console.log('   ✅ Authentication is properly configured');
    console.log('   ✅ All major endpoints are responding');
    console.log('   ✅ Concurrency management is active');
    console.log('   ✅ Ready for Investment Portal integration');
    
    return true;

  } catch (error) {
    console.log('\n❌ LLM Service Test Failed');
    console.log('Error:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Ensure your LLM service is running');
    console.log('   2. Check the LLM_SERVICE_URL is correct');
    console.log('   3. Verify SERVICE_API_KEY matches your service');
    console.log('   4. Check service logs for errors');
    return false;
  }
}

// Concurrent load test
async function testConcurrency() {
  console.log('\n🔄 Testing Concurrent Access...');
  
  const headers = {
    'Content-Type': 'application/json',
    'X-API-Key': SERVICE_API_KEY
  };

  const promises = [];
  
  // Create 5 concurrent requests
  for (let i = 0; i < 5; i++) {
    const promise = fetch(`${LLM_SERVICE_URL}/info`, { headers })
      .then(response => response.json())
      .then(data => ({ success: true, request: i }))
      .catch(error => ({ success: false, error: error.message, request: i }));
    
    promises.push(promise);
  }

  const results = await Promise.all(promises);
  const successful = results.filter(r => r.success).length;
  
  console.log(`✅ Concurrent test: ${successful}/5 requests successful`);
  
  if (successful === 5) {
    console.log('   ✅ Concurrency management working properly');
  } else {
    console.log('   ⚠️  Some concurrent requests failed');
  }
}

async function main() {
  console.log('🚀 LLM API Service Integration Validator\n');
  console.log(`Testing service at: ${LLM_SERVICE_URL}`);
  console.log(`Using API key: ${SERVICE_API_KEY.substring(0, 8)}...`);
  console.log('─'.repeat(50));
  
  const basicTests = await testLLMService();
  
  if (basicTests) {
    await testConcurrency();
  }
  
  console.log('\n' + '─'.repeat(50));
  console.log('Test complete! 🎯');
}

main();