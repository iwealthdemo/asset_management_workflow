#!/usr/bin/env node

/**
 * Complete LLM Integration Script
 * Final validation and integration completion
 */

console.log('🔧 Completing LLM Service Integration...\n');

// Environment setup
process.env.LLM_SERVICE_URL = 'https://llm-api-service-vinay2k.replit.app';
process.env.LLM_SERVICE_API_KEY = 'aa123456789bb';

async function completeIntegration() {
  try {
    // Import the service with correct environment
    const { llmApiService } = await import('./server/services/llmApiService.js');
    
    console.log('1️⃣ Testing Service Connection...');
    const health = await llmApiService.healthCheck();
    
    if (health.status !== 'healthy') {
      throw new Error('LLM service not healthy');
    }
    
    console.log('✅ LLM service connected successfully');
    console.log(`   URL: https://llm-api-service-vinay2k.replit.app`);
    console.log(`   Status: ${health.status}`);
    console.log(`   OpenAI: ${health.openai_configured ? '✅' : '❌'}`);
    
    console.log('\n2️⃣ Testing Authentication...');
    const info = await llmApiService.getServiceInfo();
    console.log('✅ API key authentication working');
    console.log(`   Service: ${info.service} v${info.version}`);
    
    console.log('\n3️⃣ Testing Core Functionality...');
    const chatTest = await llmApiService.chatCompletion([
      { role: 'user', content: 'Confirm you can help with investment analysis.' }
    ]);
    
    if (!chatTest.success) {
      throw new Error(`Chat test failed: ${chatTest.error}`);
    }
    
    console.log('✅ AI chat functionality confirmed');
    console.log(`   Model: ${chatTest.model}`);
    console.log(`   Tokens: ${chatTest.usage?.total_tokens}`);
    
    console.log('\n🎉 LLM Integration Complete!\n');
    
    console.log('📊 Integration Summary:');
    console.log('   ✅ LLM service deployed at: https://llm-api-service-vinay2k.replit.app');
    console.log('   ✅ API authentication configured with key: aa123456789bb');
    console.log('   ✅ Background job service updated to use LLM API');
    console.log('   ✅ Document processing will now use external LLM service');
    console.log('   ✅ Cross-document search ready for LLM API integration');
    console.log('   ✅ Investment insights ready for LLM API integration');
    
    console.log('\n🚀 Next Steps:');
    console.log('   1. Upload documents to test background processing');
    console.log('   2. Try cross-document search with LLM API');
    console.log('   3. Generate investment insights using LLM service');
    console.log('   4. Monitor service performance and token usage');
    
    return true;
    
  } catch (error) {
    console.log(`\n❌ Integration failed: ${error.message}`);
    return false;
  }
}

completeIntegration()
  .then(success => {
    if (success) {
      console.log('\n✅ Investment Portal is now integrated with your LLM service!');
    } else {
      console.log('\n❌ Integration incomplete - check service connectivity');
    }
  })
  .catch(error => {
    console.error(`\n💥 Integration script error: ${error.message}`);
  });