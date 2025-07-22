#!/usr/bin/env node

async function testLLMService() {
  console.log('Testing LLM Service Connection...');
  
  const LLM_SERVICE_URL = 'https://llm-api-service-vinay2k.replit.app';
  const LLM_SERVICE_API_KEY = 'aa123456789bb';
  
  try {
    const response = await fetch(LLM_SERVICE_URL + '/health', {
      headers: { 'X-API-Key': LLM_SERVICE_API_KEY }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ LLM Service Health:', JSON.stringify(data, null, 2));
      console.log('OpenAI configured:', data.openai_configured);
      console.log('Vector store:', data.default_vector_store);
      return true;
    } else {
      const text = await response.text();
      console.log('❌ LLM Service Error:', response.status, text.substring(0, 200));
      return false;
    }
  } catch (error) {
    console.error('❌ Connection Error:', error.message);
    return false;
  }
}

testLLMService();