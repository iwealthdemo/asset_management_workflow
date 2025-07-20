#!/usr/bin/env node

/**
 * Test LLM Integration with User Credentials
 */

import { llmApiService } from './server/services/llmApiService.js';

// Use provided credentials
process.env.LLM_SERVICE_URL = 'https://llm-api-service-vinay2k.replit.app';
process.env.LLM_SERVICE_API_KEY = 'aa123456789bb';

async function testIntegration() {
  console.log('🧪 Testing LLM Integration with Your Credentials\n');

  try {
    // Test service health
    console.log('1️⃣ Testing Service Health...');
    const health = await llmApiService.healthCheck();
    
    if (health.status === 'healthy') {
      console.log('✅ LLM service is healthy and accessible');
      console.log(`   OpenAI configured: ${health.openai_configured ? 'Yes' : 'No'}`);
      console.log(`   Vector Store ID: ${health.default_vector_store}`);
    } else {
      console.log('❌ Service not healthy:', health);
      return false;
    }

    // Test authentication with your API key
    console.log('\n2️⃣ Testing API Key Authentication...');
    const info = await llmApiService.getServiceInfo();
    console.log('✅ Authentication successful');
    console.log(`   Service: ${info.service} v${info.version}`);
    console.log(`   Rate limits: ${info.concurrency_limits?.rate_limit_per_minute}/min`);

    // Test chat completion
    console.log('\n3️⃣ Testing AI Chat...');
    const chatResult = await llmApiService.chatCompletion([
      { role: 'user', content: 'Hello! Can you help analyze investment documents?' }
    ]);
    
    if (chatResult.success) {
      console.log('✅ AI chat working correctly');
      console.log(`   Model: ${chatResult.model}`);
      console.log(`   Response preview: ${chatResult.response?.substring(0, 100)}...`);
      console.log(`   Token usage: ${chatResult.usage?.total_tokens}`);
    } else {
      console.log('❌ Chat failed:', chatResult.error);
      return false;
    }

    // Test document search endpoint
    console.log('\n4️⃣ Testing Document Search...');
    const searchResult = await llmApiService.searchDocuments(
      'What are common investment risk factors?',
      [], // No specific documents
      { test_mode: true, source: 'investment_portal' }
    );
    
    console.log(`✅ Document search endpoint accessible`);
    if (searchResult.response) {
      console.log(`   Response available: ${searchResult.response.length} characters`);
    }

    console.log('\n🎉 Integration Test Successful!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Service deployed and running');
    console.log('   ✅ API key authentication working');
    console.log('   ✅ AI endpoints operational');
    console.log('   ✅ Ready for Investment Portal integration');
    
    return true;

  } catch (error) {
    console.log('\n❌ Integration test failed');
    console.log(`Error: ${error.message}`);
    return false;
  }
}

testIntegration()
  .then(success => {
    if (success) {
      console.log('\n✅ Your LLM service integration is ready!');
    } else {
      console.log('\n❌ Integration issues detected');
    }
  })
  .catch(console.error);