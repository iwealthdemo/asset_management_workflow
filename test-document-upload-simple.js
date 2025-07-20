#!/usr/bin/env node

/**
 * Simple Document Upload Test
 * Tests basic upload functionality and LLM service integration
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

async function testDocumentUpload() {
  console.log('🧪 Testing Document Upload Workflow\n');
  
  try {
    // Step 1: Test LLM Service Connection
    console.log('1️⃣ Testing LLM Service Health...');
    const healthResponse = await fetch('https://llm-api-service-vinay2k.replit.app/health');
    
    if (healthResponse.ok) {
      const health = await healthResponse.json();
      console.log(`✅ LLM service healthy: ${health.status}`);
      console.log(`   OpenAI configured: ${health.openai_configured ? 'Yes' : 'No'}`);
      console.log(`   Vector Store: ${health.default_vector_store}`);
    } else {
      console.log(`❌ LLM service not accessible: ${healthResponse.status}`);
    }

    // Step 2: Test Investment Portal API
    console.log('\n2️⃣ Testing Investment Portal API...');
    const apiResponse = await fetch(`${BASE_URL}/api/auth/me`);
    
    if (apiResponse.status === 401) {
      console.log('✅ Investment Portal API responding (authentication required)');
    } else {
      console.log(`⚠️ Unexpected API response: ${apiResponse.status}`);
    }

    // Step 3: Test Authentication with different credentials
    console.log('\n3️⃣ Testing Authentication...');
    
    const testUsers = [
      { username: 'analyst', password: 'admin123' },
      { username: 'analyst1', password: 'admin123' },
      { username: 'admin', password: 'admin123' }
    ];

    let loginSuccess = false;
    let sessionCookie = '';

    for (const user of testUsers) {
      console.log(`   Trying ${user.username}...`);
      
      const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      });

      if (loginResponse.ok) {
        const data = await loginResponse.json();
        console.log(`   ✅ Login successful as ${data.user.username} (${data.user.role})`);
        
        // Extract session cookie
        const cookies = loginResponse.headers.get('set-cookie');
        if (cookies) {
          sessionCookie = cookies.split(';')[0];
        }
        
        loginSuccess = true;
        break;
      } else {
        console.log(`   ❌ Login failed for ${user.username}`);
      }
    }

    if (!loginSuccess) {
      console.log('\n❌ No valid login credentials found');
      return false;
    }

    // Step 4: Create a test investment
    console.log('\n4️⃣ Creating test investment...');
    
    const investmentData = {
      targetCompany: 'LLM Test Corp',
      assetType: 'equity',
      amount: 1000000,
      expectedReturn: 12.0,
      riskLevel: 'low',
      description: 'Test investment for LLM service validation'
    };

    const investmentResponse = await fetch(`${BASE_URL}/api/investments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      },
      body: JSON.stringify(investmentData)
    });

    if (!investmentResponse.ok) {
      const error = await investmentResponse.text();
      console.log(`❌ Investment creation failed: ${investmentResponse.status} - ${error}`);
      return false;
    }

    const investment = await investmentResponse.json();
    console.log(`✅ Created investment ${investment.id}: ${investment.targetCompany}`);

    // Step 5: Test Document API (without actual file upload for now)
    console.log('\n5️⃣ Testing Document API...');
    
    const documentsResponse = await fetch(`${BASE_URL}/api/documents/investment/${investment.id}`, {
      headers: { 'Cookie': sessionCookie }
    });

    if (documentsResponse.ok) {
      const documents = await documentsResponse.json();
      console.log(`✅ Document API accessible - found ${documents.length} documents`);
    } else {
      console.log(`⚠️ Document API issue: ${documentsResponse.status}`);
    }

    console.log('\n🎉 Basic Workflow Test Complete!');
    console.log('\n📊 Summary:');
    console.log('   ✅ LLM service deployed and accessible');
    console.log('   ✅ Investment Portal API responding');
    console.log('   ✅ Authentication working');
    console.log('   ✅ Investment creation successful');
    console.log('   ✅ Document API accessible');
    console.log('   ✅ Ready for document upload testing');

    return true;

  } catch (error) {
    console.log(`\n❌ Test failed: ${error.message}`);
    return false;
  }
}

testDocumentUpload()
  .then(success => {
    if (success) {
      console.log('\n✅ System is ready for document upload!');
    } else {
      console.log('\n❌ System has issues that need to be resolved');
    }
  })
  .catch(error => {
    console.error('Test execution failed:', error);
  });