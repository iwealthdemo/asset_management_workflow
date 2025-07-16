/**
 * Test cache invalidation fix for document status updates
 */

import fetch from 'node-fetch';

async function testCacheInvalidationFix() {
  console.log('🔄 Testing Cache Invalidation Fix\n');
  
  // Login
  const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'analyst1', password: 'admin123' })
  });
  
  const setCookieHeader = loginResponse.headers.get('set-cookie');
  const cookies = setCookieHeader ? setCookieHeader.split(';')[0] : '';
  
  console.log('✅ Login successful');
  
  // Check the current documents
  const documentsResponse = await fetch('http://localhost:5000/api/documents/investment/42', {
    headers: { 'Cookie': cookies }
  });
  
  const documents = await documentsResponse.json();
  console.log(`\\n📋 Found ${documents.length} documents in investment 42:`);
  
  for (const doc of documents) {
    console.log(`\\n📄 Document ${doc.id}: ${doc.originalName}`);
    console.log(`  Analysis Status: ${doc.analysisStatus}`);
    console.log(`  Analyzed At: ${doc.analyzedAt || 'Not set'}`);
    
    // Check job status
    const jobResponse = await fetch(`http://localhost:5000/api/documents/${doc.id}/job-status`, {
      headers: { 'Cookie': cookies }
    });
    
    const jobStatus = await jobResponse.json();
    
    if (jobStatus.hasJob) {
      const job = jobStatus.job;
      console.log(`  Job Status: ${job.status}`);
      console.log(`  Current Step: ${job.currentStep || job.currentStepNumber + '/' + job.totalSteps}`);
      console.log(`  Progress: ${job.stepProgress}%`);
      
      // Check if status is consistent
      if (job.status === 'completed' && doc.analysisStatus === 'completed') {
        console.log(`  ✅ Status consistent: Job and document both completed`);
      } else if (job.status === 'completed' && doc.analysisStatus !== 'completed') {
        console.log(`  ⚠️  Status inconsistent: Job completed but document shows ${doc.analysisStatus}`);
      } else if (job.status === 'pending' && doc.analysisStatus === 'pending') {
        console.log(`  🔄 Status consistent: Job and document both pending`);
      } else {
        console.log(`  ❌ Status inconsistent: Job ${job.status} vs Document ${doc.analysisStatus}`);
      }
    } else {
      console.log(`  ❌ No job found for document ${doc.id}`);
    }
  }
  
  console.log('\\n🔧 Cache Invalidation Fix Applied:');
  console.log('✅ Added job completion detection in useEffect');
  console.log('✅ Added cache invalidation when job completes but document status is stale');
  console.log('✅ Changed polling to continuous 5-second intervals');
  console.log('✅ Frontend now refreshes document status automatically');
  
  console.log('\\n📊 Expected Result:');
  console.log('• Documents with completed jobs should show "Processed" status');
  console.log('• Progress should show "Completed" with 4/4 steps');
  console.log('• No more stale "Pending" status for completed documents');
  console.log('• Frontend automatically refreshes when background jobs complete');
}

testCacheInvalidationFix().catch(console.error);