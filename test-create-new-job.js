/**
 * Test creating a new background job to verify progress tracking
 */

import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';

async function createNewJobTest() {
  console.log('🧪 Testing new background job creation...');
  
  // Login
  const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'analyst1', password: 'admin123' })
  });
  
  const setCookieHeader = loginResponse.headers.get('set-cookie');
  const cookies = setCookieHeader ? setCookieHeader.split(';')[0] : '';
  
  // Create a simple test investment
  const investmentResponse = await fetch('http://localhost:5000/api/investments', {
    method: 'POST',
    headers: { 
      'Cookie': cookies,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      targetCompany: 'Progress Tracking Test Corp',
      investmentType: 'equity',
      amount: '2000000',
      expectedReturn: '20',
      description: 'Testing the new progress tracking system with detailed steps',
      riskLevel: 'low'
    })
  });
  
  const investment = await investmentResponse.json();
  console.log('✅ Investment created:', investment.id);
  
  // Create a test file for upload
  const testContent = `Progress Tracking Test Document

This document is specifically created to test the new detailed progress tracking system.

Company: Progress Tracking Test Corp
Investment Amount: $2,000,000
Expected Return: 20%
Risk Level: Low
Test Date: ${new Date().toISOString()}

Key Features Being Tested:
1. Preparing for AI analysis
2. Uploading to vector store  
3. Generating summary
4. Generating insights
5. Completed status

Expected Progress Steps:
- Step 1/4: Preparing for AI analysis (25%)
- Step 2/4: Uploading to vector store (50%)
- Step 3/4: Generating summary (75%)
- Step 4/4: Generating insights (90%)
- Completed: 100%

This test should demonstrate the enhanced user experience with specific progress messages instead of generic "Processing" status.
`;

  const testFilePath = './progress-test.txt';
  fs.writeFileSync(testFilePath, testContent);
  
  // Upload the test file
  const formData = new FormData();
  formData.append('file', fs.createReadStream(testFilePath));
  formData.append('requestType', 'investment');
  formData.append('requestId', investment.id.toString());
  
  const uploadResponse = await fetch('http://localhost:5000/api/upload', {
    method: 'POST',
    headers: { 'Cookie': cookies },
    body: formData
  });
  
  console.log('Upload response status:', uploadResponse.status);
  
  // Clean up test file
  fs.unlinkSync(testFilePath);
  
  // Get the uploaded document
  const docsResponse = await fetch(`http://localhost:5000/api/documents/investment/${investment.id}`, {
    headers: { 'Cookie': cookies }
  });
  
  const docs = await docsResponse.json();
  console.log('Documents found:', docs.length);
  
  if (docs.length > 0) {
    const docId = docs[0].id;
    console.log('✅ Document uploaded:', docId);
    
    // Monitor progress for 2 minutes
    console.log('\n📊 Monitoring progress...');
    
    for (let i = 0; i < 12; i++) { // 12 * 10 seconds = 2 minutes
      const jobResponse = await fetch(`http://localhost:5000/api/documents/${docId}/job-status`, {
        headers: { 'Cookie': cookies }
      });
      
      const jobStatus = await jobResponse.json();
      
      if (jobStatus.hasJob) {
        const job = jobStatus.job;
        const stepNames = {
          'queued': 'Queued',
          'preparing': 'Preparing for AI analysis',
          'uploading': 'Uploading to vector store',
          'analyzing': 'Analyzing document',
          'generating_summary': 'Generating summary',
          'generating_insights': 'Generating insights',
          'completed': 'Completed'
        };
        
        const displayText = stepNames[job.currentStep] || 'Processing';
        console.log(`[${new Date().toLocaleTimeString()}] ${displayText} - ${job.stepProgress}% (Step ${job.currentStepNumber}/${job.totalSteps})`);
        
        if (job.status === 'completed') {
          console.log('\n✅ Job completed successfully!');
          console.log('🎉 Progress tracking system working correctly!');
          break;
        } else if (job.status === 'failed') {
          console.log('\n❌ Job failed:', job.errorMessage);
          break;
        }
      } else {
        console.log(`[${new Date().toLocaleTimeString()}] No job found yet...`);
      }
      
      if (i < 11) {
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }
  }
  
  console.log('\n🔍 Test completed!');
}

createNewJobTest().catch(console.error);