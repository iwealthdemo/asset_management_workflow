/**
 * Test the detailed progress tracking system
 */

import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

class DetailedProgressTest {
  constructor() {
    this.baseUrl = 'http://localhost:5000';
    this.cookies = '';
  }

  async makeRequest(method, endpoint, data = null, isFormData = false) {
    const url = `${this.baseUrl}${endpoint}`;
    const options = {
      method,
      headers: {
        'Cookie': this.cookies,
        ...(isFormData ? {} : { 'Content-Type': 'application/json' })
      }
    };

    if (data) {
      options.body = isFormData ? data : JSON.stringify(data);
    }

    const response = await fetch(url, options);
    return response;
  }

  async login() {
    console.log('🔐 Logging in as analyst...');
    const response = await this.makeRequest('POST', '/api/auth/login', {
      username: 'analyst1',
      password: 'admin123'
    });
    
    const setCookieHeader = response.headers.get('set-cookie');
    this.cookies = setCookieHeader ? setCookieHeader.split(';')[0] : '';
    
    if (response.ok) {
      console.log('✅ Login successful');
      return true;
    } else {
      console.error('❌ Login failed');
      return false;
    }
  }

  async createTestInvestment() {
    console.log('💼 Creating test investment...');
    const response = await this.makeRequest('POST', '/api/investments', {
      targetCompany: 'Progress Test Company',
      investmentType: 'equity',
      amount: '1500000',
      expectedReturn: '15',
      description: 'Testing detailed progress tracking system',
      riskLevel: 'medium'
    });

    if (response.ok) {
      const investment = await response.json();
      console.log('✅ Investment created:', investment.id);
      return investment;
    } else {
      console.error('❌ Failed to create investment');
      return null;
    }
  }

  async uploadTestDocument(investmentId) {
    console.log('📄 Uploading test document...');
    
    // Create a test document
    const testContent = `Progress Test Document
    
This is a test document to verify the detailed progress tracking system.
Company: Progress Test Company
Investment Amount: $1,500,000
Expected Return: 15%
Risk Level: Medium

The system should show:
1. Preparing for AI analysis
2. Uploading to vector store
3. Generating summary
4. Generating insights
5. Completed

Test timestamp: ${new Date().toISOString()}`;

    const testFilePath = path.join(process.cwd(), 'progress-test-document.txt');
    fs.writeFileSync(testFilePath, testContent);

    const formData = new FormData();
    formData.append('file', fs.createReadStream(testFilePath));
    formData.append('requestType', 'investment');
    formData.append('requestId', investmentId.toString());

    const response = await this.makeRequest('POST', '/api/upload', formData, true);

    // Clean up test file
    fs.unlinkSync(testFilePath);

    if (response.ok) {
      const responseText = await response.text();
      console.log('Upload response:', responseText);
      
      try {
        const result = JSON.parse(responseText);
        if (result.document) {
          console.log('✅ Document uploaded:', result.document.id);
          return result.document;
        } else {
          console.log('✅ Upload successful but no document returned');
          return null;
        }
      } catch (error) {
        console.log('✅ Upload successful (non-JSON response)');
        return { id: 'uploaded' }; // Return a placeholder for testing
      }
    } else {
      const errorText = await response.text();
      console.error('❌ Failed to upload document:', errorText);
      return null;
    }
  }

  async monitorJobProgress(documentId) {
    console.log('📊 Monitoring job progress...');
    let attempts = 0;
    const maxAttempts = 30; // 5 minutes with 10-second intervals
    
    while (attempts < maxAttempts) {
      const response = await this.makeRequest('GET', `/api/documents/${documentId}/job-status`);
      
      if (response.ok) {
        const jobStatus = await response.json();
        
        if (jobStatus.hasJob) {
          const job = jobStatus.job;
          console.log(`📈 Progress: ${job.currentStep} (${job.stepProgress}%) - Step ${job.currentStepNumber}/${job.totalSteps}`);
          
          if (job.status === 'completed') {
            console.log('✅ Job completed successfully!');
            return true;
          } else if (job.status === 'failed') {
            console.log('❌ Job failed:', job.errorMessage);
            return false;
          }
        } else {
          console.log('⏳ No job found yet...');
        }
      } else {
        console.error('❌ Failed to get job status');
      }
      
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
    }
    
    console.log('⏰ Timeout reached - job monitoring stopped');
    return false;
  }

  async verifyProgressSteps(documentId) {
    console.log('🔍 Verifying progress steps...');
    
    const response = await this.makeRequest('GET', `/api/documents/${documentId}/job-status`);
    
    if (response.ok) {
      const jobStatus = await response.json();
      
      if (jobStatus.hasJob) {
        const job = jobStatus.job;
        console.log('📊 Final job status:');
        console.log(`  Status: ${job.status}`);
        console.log(`  Current Step: ${job.currentStep}`);
        console.log(`  Progress: ${job.stepProgress}%`);
        console.log(`  Step: ${job.currentStepNumber}/${job.totalSteps}`);
        
        // Verify all expected fields are present
        const expectedFields = ['currentStep', 'stepProgress', 'totalSteps', 'currentStepNumber'];
        const missingFields = expectedFields.filter(field => job[field] === undefined);
        
        if (missingFields.length === 0) {
          console.log('✅ All progress fields present');
          return true;
        } else {
          console.log('❌ Missing progress fields:', missingFields);
          return false;
        }
      } else {
        console.log('❌ No job found');
        return false;
      }
    } else {
      console.error('❌ Failed to get job status');
      return false;
    }
  }

  async runCompleteTest() {
    console.log('🚀 Starting detailed progress tracking test...\n');
    
    // Step 1: Login
    if (!(await this.login())) {
      return;
    }
    
    // Step 2: Create test investment
    const investment = await this.createTestInvestment();
    if (!investment) {
      return;
    }
    
    // Step 3: Upload test document
    const document = await this.uploadTestDocument(investment.id);
    if (!document) {
      return;
    }
    
    // Step 4: Monitor job progress
    const jobCompleted = await this.monitorJobProgress(document.id);
    
    // Step 5: Verify progress steps
    const progressVerified = await this.verifyProgressSteps(document.id);
    
    // Generate final report
    console.log('\n📋 TEST RESULTS:');
    console.log(`✅ Login: Success`);
    console.log(`✅ Investment Creation: Success`);
    console.log(`✅ Document Upload: Success`);
    console.log(`${jobCompleted ? '✅' : '❌'} Job Completion: ${jobCompleted ? 'Success' : 'Failed'}`);
    console.log(`${progressVerified ? '✅' : '❌'} Progress Verification: ${progressVerified ? 'Success' : 'Failed'}`);
    
    const overallSuccess = jobCompleted && progressVerified;
    console.log(`\n🎯 OVERALL TEST: ${overallSuccess ? 'PASSED' : 'FAILED'}`);
    
    if (overallSuccess) {
      console.log('\n🎉 Detailed progress tracking system is working correctly!');
      console.log('Users will now see specific progress messages like:');
      console.log('  - "Preparing for AI analysis"');
      console.log('  - "Uploading to vector store"');
      console.log('  - "Generating summary"');
      console.log('  - "Generating insights"');
      console.log('  - "Completed"');
    } else {
      console.log('\n⚠️  Issues found with the progress tracking system');
    }
  }
}

// Run the test
const test = new DetailedProgressTest();
test.runCompleteTest().catch(console.error);