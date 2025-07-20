/**
 * Test LLM Service Access - Check if deployed service is accessible
 */

// Try common deployment URLs for your LLM service
const possibleUrls = [
  'https://llm-api-service.replit.app',
  'https://your-llm-service.replit.app', 
  'https://llm-service.replit.app',
  'https://investment-llm.replit.app',
  'http://localhost:5000' // Local development
];

async function testServiceAccess() {
  console.log('🔍 Testing LLM Service Access...\n');
  
  for (const url of possibleUrls) {
    console.log(`Testing: ${url}`);
    
    try {
      const response = await fetch(`${url}/health`, {
        method: 'GET',
        timeout: 10000
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ SUCCESS: ${url}`);
        console.log(`   Status: ${data.status}`);
        console.log(`   OpenAI: ${data.openai_configured ? '✅' : '❌'}`);
        console.log(`   Vector Store: ${data.default_vector_store || 'Not configured'}`);
        
        // Test info endpoint
        try {
          const infoResponse = await fetch(`${url}/info`);
          const infoData = await infoResponse.json();
          console.log(`   Service: ${infoData.service}`);
          console.log(`   Version: ${infoData.version}`);
        } catch (e) {
          console.log('   Info endpoint not accessible');
        }
        
        return url; // Return first working URL
        
      } else {
        console.log(`❌ HTTP ${response.status}: ${url}`);
      }
      
    } catch (error) {
      console.log(`❌ Failed: ${error.message.includes('fetch') ? 'Service not deployed' : error.message}`);
    }
    
    console.log(''); // Blank line
  }
  
  console.log('🚨 No accessible LLM service found');
  console.log('\n💡 Next steps:');
  console.log('   1. Deploy your LLM service in the separate Replit project');
  console.log('   2. Copy the deployment URL');
  console.log('   3. Test again with the actual URL');
  
  return null;
}

async function testWithApiKey(serviceUrl) {
  if (!serviceUrl) return;
  
  console.log('\n🔐 Testing with API Key Authentication...');
  
  const testApiKey = 'dev-key-change-in-production'; // Default dev key
  
  try {
    const response = await fetch(`${serviceUrl}/documents/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': testApiKey
      },
      body: JSON.stringify({
        query: 'test query',
        context: { test: true }
      })
    });
    
    const data = await response.json();
    
    if (response.status === 401) {
      console.log('✅ Authentication working (got 401 as expected)');
    } else if (response.status === 200 || data.success !== undefined) {
      console.log('✅ API endpoint accessible');
      console.log(`   Response: ${data.success ? 'Success' : data.error || 'Unknown'}`);
    } else {
      console.log(`⚠️  Unexpected response: ${response.status}`);
    }
    
  } catch (error) {
    console.log(`❌ API test failed: ${error.message}`);
  }
}

// Run the tests
testServiceAccess()
  .then(workingUrl => testWithApiKey(workingUrl))
  .catch(error => console.error('Test failed:', error));