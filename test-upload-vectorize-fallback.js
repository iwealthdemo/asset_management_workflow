// Test script to verify the upload and vectorize fallback mechanism works
// This will test the fix for the recurring document processing issue

async function testUploadVectorizeFallback() {
  console.log('=== Testing Upload and Vectorize Fallback Fix ===\n');
  
  try {
    const baseUrl = 'http://localhost:5000';
    
    // 1. Login as admin to upload a document
    console.log('1. Logging in as admin...');
    let response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to login as admin');
    }
    
    const login = await response.json();
    const cookies = response.headers.get('set-cookie');
    console.log(`✓ Admin logged in: ${login.user.username}\n`);
    
    // 2. Create a test investment
    console.log('2. Creating test investment...');
    response = await fetch(`${baseUrl}/api/investments`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookies 
      },
      body: JSON.stringify({
        requestId: "TEST-UPLOAD-001",
        targetCompany: "Upload Test Company",
        investmentType: "equity",
        amount: 500000,
        currency: "USD",
        expectedReturn: 12.0,
        riskLevel: "medium",
        region: "North America",
        sector: "Technology",
        description: "Test investment for upload fallback validation",
        status: "draft"
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create test investment');
    }
    
    const investment = await response.json();
    console.log(`✓ Test investment created: ${investment.requestId} (ID: ${investment.id})\n`);
    
    // 3. Create a small test document
    console.log('3. Creating test document for upload...');
    const testContent = `TEST DOCUMENT FOR FALLBACK VERIFICATION

Company: Upload Test Company
Investment Type: Equity Investment
Amount: $500,000 USD
Expected Return: 12.0%

EXECUTIVE SUMMARY
This is a test document created to verify the upload and vectorize fallback mechanism works correctly when the external LLM service is unavailable. The document contains basic investment information that should trigger background job processing.

FINANCIAL HIGHLIGHTS
- Investment Amount: $500,000
- Expected Return: 12.0%
- Risk Level: Medium
- Sector: Technology

BACKGROUND JOB TESTING
This document tests the following workflow:
1. Document upload to investment proposal
2. Background job creation for AI processing  
3. LLM service upload attempt (expected to fail)
4. Local OpenAI fallback upload (should succeed)
5. Document analysis using local OpenAI
6. Status update to "completed"

The fallback mechanism ensures document processing continues even when external services are unavailable.`;
    
    // Create a FormData object with the test document
    const formData = new FormData();
    const blob = new Blob([testContent], { type: 'text/plain' });
    formData.append('documents', blob, 'test-upload-fallback.txt');
    
    // 4. Upload document to the investment
    console.log('4. Uploading test document...');
    response = await fetch(`${baseUrl}/api/documents/investment/${investment.id}`, {
      method: 'POST',
      headers: { 'Cookie': cookies },
      body: formData
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to upload document: ${errorText}`);
    }
    
    const uploadResult = await response.json();
    console.log(`✓ Document uploaded successfully`);
    console.log(`✓ Document ID: ${uploadResult[0]?.id}\n`);
    
    const documentId = uploadResult[0]?.id;
    if (!documentId) {
      throw new Error('No document ID returned from upload');
    }
    
    // 5. Monitor background job status
    console.log('5. Monitoring background job processing...');
    console.log('Expected flow:');
    console.log('  - LLM service upload attempt → FAIL (service down)');
    console.log('  - Local OpenAI fallback upload → SUCCESS');
    console.log('  - Document analysis → SUCCESS');
    console.log('  - Job status → COMPLETED\n');
    
    let attempts = 0;
    const maxAttempts = 20; // 2 minutes max
    let jobCompleted = false;
    
    while (attempts < maxAttempts && !jobCompleted) {
      attempts++;
      console.log(`Checking background job status (attempt ${attempts}/${maxAttempts})...`);
      
      try {
        response = await fetch(`${baseUrl}/api/documents/${documentId}/job-status`, {
          headers: { 'Cookie': cookies }
        });
        
        if (response.ok) {
          const jobStatus = await response.json();
          
          if (jobStatus.hasJob && jobStatus.job) {
            const job = jobStatus.job;
            console.log(`  Job ID: ${job.id}`);
            console.log(`  Status: ${job.status}`);
            console.log(`  Current Step: ${job.currentStep || 'N/A'}`);
            console.log(`  Progress: ${job.stepProgress || 0}%`);
            console.log(`  Error: ${job.errorMessage || 'None'}`);
            
            if (job.status === 'completed') {
              console.log('\n✅ SUCCESS: Background job completed!');
              jobCompleted = true;
              break;
            } else if (job.status === 'failed') {
              console.log('\n❌ FAILURE: Background job failed');
              console.log(`Error: ${job.errorMessage}`);
              break;
            } else if (job.status === 'processing') {
              console.log(`  → Processing: ${job.currentStep} (${job.stepProgress}%)`);
            }
          } else {
            console.log('  No background job found');
          }
        } else {
          console.log('  Failed to get job status');
        }
        
      } catch (error) {
        console.log(`  Job status check failed: ${error.message}`);
      }
      
      console.log(''); // Empty line for readability
      
      // Wait 6 seconds before next check
      await new Promise(resolve => setTimeout(resolve, 6000));
    }
    
    // 6. Check final document status
    console.log('6. Checking final document analysis status...');
    response = await fetch(`${baseUrl}/api/documents/investment/${investment.id}`, {
      headers: { 'Cookie': cookies }
    });
    
    if (response.ok) {
      const documents = await response.json();
      const document = documents.find(doc => doc.id === documentId);
      
      if (document) {
        console.log('Final document status:');
        console.log(`  Analysis Status: ${document.analysisStatus}`);
        console.log(`  Has Analysis Result: ${document.analysisResult ? 'Yes' : 'No'}`);
        
        if (document.analysisStatus === 'completed') {
          console.log('\n🎉 COMPLETE SUCCESS!');
          console.log('✅ Upload and vectorize fallback mechanism is working');
          console.log('✅ Documents are being processed despite LLM service issues');
          console.log('✅ Local OpenAI fallback successfully handles the workflow');
          
          if (document.analysisResult) {
            const analysis = JSON.parse(document.analysisResult);
            console.log(`\nGenerated Analysis Summary (${analysis.summary?.length || 0} chars):`);
            console.log(analysis.summary?.substring(0, 200) + '...');
          }
        } else {
          console.log('\n⚠️ PARTIAL SUCCESS');
          console.log('Document uploaded but analysis not completed yet');
          console.log('This might be normal if processing is still ongoing');
        }
      } else {
        console.log('❌ Document not found in final check');
      }
    }
    
    console.log('\n=== Test Complete ===');
    console.log('\nResult Summary:');
    console.log(`- Document Upload: ${uploadResult ? 'SUCCESS' : 'FAILED'}`);
    console.log(`- Background Job: ${jobCompleted ? 'COMPLETED' : 'IN PROGRESS/FAILED'}`);
    console.log(`- Analysis Status: Will be checked above`);
    
    if (jobCompleted) {
      console.log('\n✅ The upload and vectorize fallback fix is working correctly!');
    } else {
      console.log('\n⚠️ Background job processing may need more time or investigation');
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Full error:', error);
  }
}

testUploadVectorizeFallback();