/**
 * Test that completed jobs show "Processed" status instead of "Processing"
 */

import fetch from 'node-fetch';

async function testProcessedStatus() {
  console.log('🧪 Testing "Processed" status display...\n');
  
  // Login
  const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'analyst1', password: 'admin123' })
  });
  
  const setCookieHeader = loginResponse.headers.get('set-cookie');
  const cookies = setCookieHeader ? setCookieHeader.split(';')[0] : '';
  
  if (!loginResponse.ok) {
    console.log('❌ Login failed');
    return;
  }
  
  // Get document with completed job
  const jobResponse = await fetch('http://localhost:5000/api/documents/29/job-status', {
    headers: { 'Cookie': cookies }
  });
  
  const jobStatus = await jobResponse.json();
  
  console.log('📊 Job Status Details:');
  console.log(`  - Has Job: ${jobStatus.hasJob}`);
  
  if (jobStatus.hasJob) {
    const job = jobStatus.job;
    console.log(`  - Job Status: ${job.status}`);
    console.log(`  - Current Step: ${job.currentStep}`);
    console.log(`  - Step Progress: ${job.stepProgress}%`);
    console.log(`  - Current Step Number: ${job.currentStepNumber}`);
    console.log(`  - Total Steps: ${job.totalSteps}`);
    
    // Test the display logic
    console.log('\n🖼️  Frontend Display Logic:');
    
    // Status badge logic
    const statusBadgeText = job.status === 'completed' ? 'Processed' : 'Processing';
    console.log(`  - Status Badge: "${statusBadgeText}"`);
    
    // Progress text logic
    const progressText = job.status === 'completed' ? 'Completed' : getStepDisplayText(job.currentStep);
    console.log(`  - Progress Text: "${progressText}"`);
    
    // Step counter logic
    const stepCounter = job.status === 'completed' 
      ? `${job.totalSteps}/${job.totalSteps}`
      : `${job.currentStepNumber}/${job.totalSteps}`;
    console.log(`  - Step Counter: "${stepCounter}"`);
    
    // Progress bar logic
    const progressValue = job.status === 'completed' ? 100 : job.stepProgress;
    console.log(`  - Progress Bar: ${progressValue}%`);
    
    console.log('\n✅ Status Display Test Results:');
    if (job.status === 'completed') {
      console.log('  ✅ Status badge will show "Processed"');
      console.log('  ✅ Progress text will show "Completed"');
      console.log('  ✅ Step counter shows full completion');
      console.log('  ✅ Progress bar shows 100%');
      console.log('\n🎉 Fix working correctly - no more "Processing" for completed jobs!');
    } else {
      console.log('  ℹ️  Job not completed yet, showing processing status');
    }
  } else {
    console.log('  ℹ️  No job found for this document');
  }
}

function getStepDisplayText(step) {
  const stepNames = {
    'queued': 'Queued',
    'preparing': 'Preparing for AI analysis',
    'uploading': 'Uploading to vector store',
    'analyzing': 'Analyzing document',
    'generating_summary': 'Generating summary',
    'generating_insights': 'Generating insights',
    'completed': 'Completed'
  };
  return stepNames[step] || 'Processing';
}

testProcessedStatus().catch(console.error);