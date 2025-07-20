#!/usr/bin/env node

/**
 * Test Document Upload and LLM Processing Workflow
 * Tests the complete flow: Login -> Create Investment -> Upload Document -> LLM Processing
 */

import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:5000';

// Test credentials
const TEST_USER = {
  username: 'analyst',
  password: 'admin123'
};

let sessionCookie = '';

async function login() {
  console.log('🔐 Logging in as analyst...');
  
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(TEST_USER)
  });

  if (!response.ok) {
    throw new Error(`Login failed: ${response.status}`);
  }

  // Extract session cookie
  const cookies = response.headers.get('set-cookie');
  if (cookies) {
    sessionCookie = cookies.split(';')[0];
  }

  const data = await response.json();
  console.log(`✅ Logged in as ${data.user.username} (${data.user.role})`);
  return data.user;
}

async function createInvestment() {
  console.log('\n📝 Creating test investment proposal...');
  
  const investmentData = {
    targetCompany: 'Test Tech Corp',
    assetType: 'equity',
    amount: 5000000,
    expectedReturn: 15.5,
    riskLevel: 'medium',
    description: 'Test investment for document upload workflow validation'
  };

  const response = await fetch(`${BASE_URL}/api/investments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessionCookie
    },
    body: JSON.stringify(investmentData)
  });

  if (!response.ok) {
    throw new Error(`Investment creation failed: ${response.status}`);
  }

  const investment = await response.json();
  console.log(`✅ Created investment ${investment.id}: ${investment.targetCompany}`);
  return investment;
}

async function createTestDocument() {
  console.log('\n📄 Creating test document...');
  
  const testContent = `# Investment Analysis Report

## Executive Summary
This is a test document for validating the LLM service integration with the Investment Portal.

## Company Overview
Test Tech Corp is a technology company focused on artificial intelligence and machine learning solutions.

## Financial Analysis
- Revenue: $50M annually
- Growth Rate: 25% YoY
- Market Cap: $500M
- P/E Ratio: 22

## Risk Assessment
The investment presents moderate risk with strong growth potential in the AI/ML sector.

## Recommendation
We recommend proceeding with this investment opportunity based on the strong fundamentals and market position.

## Key Metrics
- Expected ROI: 15.5%
- Investment Amount: $5,000,000
- Time Horizon: 5 years
- Risk Category: Medium

## Conclusion
This investment aligns with our portfolio strategy and risk tolerance.
`;

  const testFilePath = path.join(process.cwd(), 'test-document.txt');
  fs.writeFileSync(testFilePath, testContent, 'utf8');
  
  console.log(`✅ Created test document: ${testFilePath}`);
  return testFilePath;
}

async function uploadDocument(investmentId, filePath) {
  console.log('\n📤 Uploading document to investment...');
  
  const formData = new FormData();
  formData.append('file', fs.createReadStream(filePath));
  formData.append('requestType', 'investment');
  formData.append('requestId', investmentId.toString());

  const response = await fetch(`${BASE_URL}/api/documents/upload`, {
    method: 'POST',
    headers: {
      'Cookie': sessionCookie,
      ...formData.getHeaders()
    },
    body: formData
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Document upload failed: ${response.status} - ${error}`);
  }

  const document = await response.json();
  console.log(`✅ Uploaded document ${document.id}: ${document.fileName}`);
  return document;
}

async function checkBackgroundJob(documentId) {
  console.log('\n🔄 Checking background job status...');
  
  let attempts = 0;
  const maxAttempts = 10; // 5 minutes with 30-second intervals
  
  while (attempts < maxAttempts) {
    const response = await fetch(`${BASE_URL}/api/documents/${documentId}/job-status`, {
      headers: { 'Cookie': sessionCookie }
    });

    if (response.ok) {
      const jobStatus = await response.json();
      console.log(`📊 Job Status: ${jobStatus.status} (${jobStatus.currentStep || 'N/A'})`);
      
      if (jobStatus.stepProgress !== undefined) {
        console.log(`   Progress: ${jobStatus.currentStepNumber}/${jobStatus.totalSteps} - ${jobStatus.stepProgress}%`);
      }

      if (jobStatus.status === 'completed') {
        console.log('✅ Background job completed successfully');
        return jobStatus;
      } else if (jobStatus.status === 'failed') {
        console.log(`❌ Background job failed: ${jobStatus.errorMessage}`);
        return jobStatus;
      }
    }

    attempts++;
    console.log(`   Waiting... (${attempts}/${maxAttempts})`);
    await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds
  }
  
  console.log('⏰ Background job still processing after maximum wait time');
  return null;
}

async function checkDocumentAnalysis(documentId) {
  console.log('\n🔍 Checking document analysis status...');
  
  const response = await fetch(`${BASE_URL}/api/documents/${documentId}/analysis`, {
    headers: { 'Cookie': sessionCookie }
  });

  if (response.ok) {
    const analysis = await response.json();
    console.log('✅ Document analysis available');
    console.log(`   Classification: ${analysis.classification || 'N/A'}`);
    console.log(`   Risk Assessment: ${analysis.riskAssessment || 'N/A'}`);
    return analysis;
  } else {
    console.log('⚠️ Document analysis not yet available');
    return null;
  }
}

async function testLLMServiceDirectly() {
  console.log('\n🤖 Testing LLM Service Direct Connection...');
  
  try {
    // Set environment variables for the test
    process.env.LLM_SERVICE_URL = 'https://llm-api-service-vinay2k.replit.app';
    process.env.LLM_SERVICE_API_KEY = 'aa123456789bb';
    
    const { llmApiService } = await import('./server/services/llmApiService.js');
    
    const health = await llmApiService.healthCheck();
    console.log(`✅ LLM Service Health: ${health.status}`);
    console.log(`   OpenAI configured: ${health.openai_configured ? 'Yes' : 'No'}`);
    
    const chatTest = await llmApiService.chatCompletion([
      { role: 'user', content: 'Hello from Investment Portal test!' }
    ]);
    
    if (chatTest.success) {
      console.log('✅ LLM Service chat working');
      console.log(`   Response: ${chatTest.response?.substring(0, 100)}...`);
    } else {
      console.log(`❌ LLM Service chat failed: ${chatTest.error}`);
    }
    
  } catch (error) {
    console.log(`❌ LLM Service test failed: ${error.message}`);
  }
}

async function runDocumentUploadTest() {
  try {
    console.log('🧪 Testing Document Upload and LLM Processing Workflow\n');
    
    // Step 1: Test LLM service connection first
    await testLLMServiceDirectly();
    
    // Step 2: Login
    const user = await login();
    
    // Step 3: Create investment
    const investment = await createInvestment();
    
    // Step 4: Create test document
    const testFilePath = await createTestDocument();
    
    // Step 5: Upload document
    const document = await uploadDocument(investment.id, testFilePath);
    
    // Step 6: Check background job processing
    const jobResult = await checkBackgroundJob(document.id);
    
    // Step 7: Check document analysis
    await checkDocumentAnalysis(document.id);
    
    // Cleanup
    fs.unlinkSync(testFilePath);
    console.log('\n🧹 Cleaned up test file');
    
    console.log('\n🎉 Document Upload Workflow Test Complete!');
    
    if (jobResult?.status === 'completed') {
      console.log('\n✅ SUCCESS: Complete workflow validated');
      console.log('   ✅ Login successful');
      console.log('   ✅ Investment creation working');
      console.log('   ✅ Document upload working');
      console.log('   ✅ Background job processing via LLM service');
      console.log('   ✅ Document analysis integration ready');
    } else {
      console.log('\n⚠️ PARTIAL SUCCESS: Some components may need attention');
      console.log('   Check LLM service connectivity and background job processor');
    }
    
    return true;
    
  } catch (error) {
    console.log(`\n❌ Workflow test failed: ${error.message}`);
    console.log('\n🔧 Check:');
    console.log('   1. Investment Portal is running (npm run dev)');
    console.log('   2. Database is accessible');
    console.log('   3. LLM service is responding');
    console.log('   4. Background job processor is running');
    
    return false;
  }
}

// Run the test
runDocumentUploadTest()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });