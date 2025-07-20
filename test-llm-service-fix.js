#!/usr/bin/env node

/**
 * Test LLM Service Fix - Direct API Test
 * Tests the external LLM service and our fallback mechanism
 */

const fetch = require('node-fetch');

// Test configuration
const LLM_SERVICE_URL = 'https://llm-api-service-vinay2k.replit.app';
const LLM_SERVICE_API_KEY = 'aa123456789bb';

async function testLLMService() {
  console.log('🧪 Testing LLM Service Fix Implementation\n');

  // Test 1: Health check
  console.log('1️⃣ Testing LLM service health...');
  try {
    const response = await fetch(`${LLM_SERVICE_URL}/health`, {
      headers: {
        'X-API-Key': LLM_SERVICE_API_KEY
      }
    });
    
    if (response.ok) {
      const health = await response.json();
      console.log('✅ LLM service is healthy:', health.service);
    } else {
      console.log('❌ LLM service health check failed:', response.status);
    }
  } catch (error) {
    console.log('❌ LLM service unreachable:', error.message);
  }

  // Test 2: Simple summarization endpoint
  console.log('\n2️⃣ Testing summarization endpoint...');
  try {
    const response = await fetch(`${LLM_SERVICE_URL}/analysis/summarize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': LLM_SERVICE_API_KEY
      },
      body: JSON.stringify({
        content: 'This is a comprehensive test document for investment analysis. The company shows strong revenue growth of 25% year-over-year with expanding market share in the technology sector.',
        summary_type: 'general'
      })
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('✅ Summarization working:', result.summary?.substring(0, 100) + '...');
    } else {
      console.log('❌ Summarization failed:', result.error || 'Unknown error');
      console.log('   Response:', JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.log('❌ Summarization request failed:', error.message);
  }

  // Test 3: Investment insights endpoint (the failing one)
  console.log('\n3️⃣ Testing investment insights endpoint...');
  try {
    const response = await fetch(`${LLM_SERVICE_URL}/analysis/insights`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': LLM_SERVICE_API_KEY
      },
      body: JSON.stringify({
        document_ids: ['test-doc-123'],
        analysis_focus: 'comprehensive',
        context: {
          document_id: 'test-doc-123',
          request_id: 'test-request-456',
          company_name: 'Test Investment Target',
          analysis_focus: 'investment_analysis'
        }
      })
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('✅ Investment insights working:', result.insights?.substring(0, 100) + '...');
    } else {
      console.log('❌ Investment insights failed:', result.error || 'Unknown error');
      console.log('   Response:', JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.log('❌ Investment insights request failed:', error.message);
  }

  console.log('\n📊 Test Summary:');
  console.log('The LLM service may still be using the old OpenAI API.');
  console.log('Our fallback mechanism in backgroundJobService.ts should handle this gracefully.');
  console.log('Next step: Test our background job processor with the fallback enabled.');
}

if (require.main === module) {
  testLLMService().catch(console.error);
}

module.exports = { testLLMService };