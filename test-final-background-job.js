/**
 * Final Background Job Test - After Fixes
 * Tests the complete workflow with all fixes applied
 */

import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import FormData from 'form-data';

class FinalBackgroundJobTest {
  constructor() {
    this.baseUrl = 'http://localhost:5000';
    this.cookies = '';
    this.testResults = [];
  }

  async makeRequest(method, endpoint, data = null, cookies = '', isFormData = false) {
    const url = `${this.baseUrl}${endpoint}`;
    const options = {
      method,
      headers: {
        'Cookie': cookies || this.cookies,
        ...(isFormData ? {} : { 'Content-Type': 'application/json' })
      }
    };

    if (data) {
      options.body = isFormData ? data : JSON.stringify(data);
    }

    return await fetch(url, options);
  }

  async login(userType = 'analyst') {
    const users = {
      analyst: { username: 'analyst1', password: 'admin123' },
      manager: { username: 'manager1', password: 'admin123' }
    };

    const user = users[userType];
    const response = await this.makeRequest('POST', '/api/auth/login', user);
    
    if (response.ok) {
      const setCookieHeader = response.headers.get('set-cookie');
      if (setCookieHeader) {
        this.cookies = setCookieHeader.split(';')[0];
      }
      return true;
    }
    return false;
  }

  async testCompleteWorkflow() {
    console.log('🚀 Testing Complete Background Job Workflow...\n');
    
    const results = {
      analystUpload: false,
      backgroundJobProcessing: false,
      documentCompleted: false,
      managerInsights: false,
      jobStatusAPI: false
    };

    try {
      // Step 1: Login as analyst
      console.log('👤 Step 1: Login as analyst...');
      const analystLogin = await this.login('analyst');
      if (!analystLogin) {
        console.log('❌ Analyst login failed');
        return results;
      }
      console.log('✅ Analyst logged in successfully');

      // Step 2: Create investment proposal
      console.log('\n💼 Step 2: Create investment proposal...');
      const proposalData = {
        targetCompany: 'Final Test Company',
        investmentType: 'equity',
        amount: '1000000',
        expectedReturn: '20',
        description: 'Final test of background job system',
        riskLevel: 'medium'
      };

      const proposalResponse = await this.makeRequest('POST', '/api/investments', proposalData);
      if (!proposalResponse.ok) {
        console.log('❌ Failed to create proposal');
        return results;
      }

      const proposal = await proposalResponse.json();
      console.log(`✅ Proposal created: ${proposal.requestId}`);

      // Step 3: Upload document (should trigger background job)
      console.log('\n📄 Step 3: Upload document with background job trigger...');
      const testDocPath = path.join(process.cwd(), 'final-test-document.txt');
      
      const testContent = `FINAL BACKGROUND JOB TEST
=============================

Investment Proposal: Final Test Company
Amount: $1,000,000
Expected Return: 20%
Risk Level: Medium

This document tests the complete background job workflow:
1. Analyst uploads document
2. Background job automatically queues
3. Document gets processed and uploaded to vector store
4. Status changes to completed
5. Manager can get automatic insights

Key Financial Metrics:
- Revenue: $50M annually
- Growth Rate: 30% YoY
- Profit Margin: 15%
- Market Cap: $500M
- Debt to Equity: 0.3

Risk Factors:
- Market competition
- Regulatory changes
- Economic downturns
- Technology disruption

This comprehensive document should provide sufficient content for AI analysis and insight generation.
`;

      fs.writeFileSync(testDocPath, testContent);

      const formData = new FormData();
      formData.append('documents', fs.createReadStream(testDocPath));
      formData.append('requestType', 'investment');
      formData.append('requestId', proposal.id.toString());

      const uploadResponse = await this.makeRequest('POST', '/api/documents/upload', formData, this.cookies, true);
      if (!uploadResponse.ok) {
        console.log('❌ Document upload failed');
        return results;
      }

      const uploadResult = await uploadResponse.json();
      const documentId = uploadResult[0]?.id;
      console.log(`✅ Document uploaded successfully, ID: ${documentId}`);
      results.analystUpload = true;

      // Step 4: Test job status API
      console.log('\n🔍 Step 4: Test job status API...');
      const jobStatusResponse = await this.makeRequest('GET', `/api/documents/${documentId}/job-status`);
      if (jobStatusResponse.ok) {
        const jobStatus = await jobStatusResponse.json();
        console.log(`✅ Job status API working: ${JSON.stringify(jobStatus, null, 2)}`);
        results.jobStatusAPI = true;
        
        if (jobStatus.hasJob) {
          console.log(`📋 Background job found: ${jobStatus.job.status}`);
          results.backgroundJobProcessing = true;
        }
      } else {
        console.log(`❌ Job status API failed: ${jobStatusResponse.status}`);
      }

      // Step 5: Monitor background job completion
      console.log('\n⏳ Step 5: Monitor background job processing...');
      let processingComplete = false;
      let attempts = 0;
      const maxAttempts = 24; // 120 seconds total (5 second intervals)

      while (!processingComplete && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        attempts++;

        // Check both job status and document status
        const jobResponse = await this.makeRequest('GET', `/api/documents/${documentId}/job-status`);
        const docResponse = await this.makeRequest('GET', `/api/documents/investment/${proposal.id}`);

        if (jobResponse.ok && docResponse.ok) {
          const jobData = await jobResponse.json();
          const documents = await docResponse.json();
          const document = documents.find(doc => doc.id === documentId);

          if (document) {
            console.log(`📊 Attempt ${attempts}: Document=${document.analysisStatus}, Job=${jobData.hasJob ? jobData.job.status : 'none'}`);
            
            if (document.analysisStatus === 'completed') {
              console.log('✅ Document processing completed!');
              results.documentCompleted = true;
              processingComplete = true;
              break;
            } else if (document.analysisStatus === 'failed') {
              console.log('❌ Document processing failed');
              break;
            }
          }
        }
      }

      if (!processingComplete) {
        console.log('⚠️  Background job processing timed out');
      }

      // Step 6: Test manager insights (if document completed)
      if (results.documentCompleted) {
        console.log('\n👔 Step 6: Test manager automatic insights...');
        
        // Login as manager
        const managerLogin = await this.login('manager');
        if (managerLogin) {
          console.log('✅ Manager logged in');
          
          // Try to get insights
          const insightsResponse = await this.makeRequest('POST', `/api/documents/${documentId}/get-insights`);
          if (insightsResponse.ok) {
            const insights = await insightsResponse.json();
            console.log('✅ Manager insights generated successfully!');
            console.log(`📋 Summary preview: ${insights.summary?.substring(0, 100)}...`);
            console.log(`🔍 Insights preview: ${insights.insights?.substring(0, 100)}...`);
            results.managerInsights = true;
          } else {
            console.log('❌ Manager insights generation failed');
          }
        }
      }

      return results;

    } catch (error) {
      console.error('💥 Test failed with error:', error.message);
      return results;
    }
  }

  generateReport(results) {
    console.log('\n' + '='.repeat(60));
    console.log('📊 FINAL BACKGROUND JOB TEST RESULTS');
    console.log('='.repeat(60));
    
    const tests = [
      { name: 'Analyst Document Upload', status: results.analystUpload },
      { name: 'Job Status API', status: results.jobStatusAPI },
      { name: 'Background Job Processing', status: results.backgroundJobProcessing },
      { name: 'Document Completion', status: results.documentCompleted },
      { name: 'Manager Automatic Insights', status: results.managerInsights }
    ];
    
    tests.forEach((test, index) => {
      const icon = test.status ? '✅' : '❌';
      const status = test.status ? 'PASSED' : 'FAILED';
      console.log(`${index + 1}. ${test.name}: ${icon} ${status}`);
    });
    
    const passedTests = tests.filter(t => t.status).length;
    const totalTests = tests.length;
    
    console.log(`\n📈 SUMMARY: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
      console.log('🎉 ALL TESTS PASSED! Background job system is fully operational.');
      console.log('\n✨ Workflow verified:');
      console.log('   • Analyst uploads → Background job queues');
      console.log('   • Document processes → Status becomes completed');
      console.log('   • Manager gets automatic insights');
    } else {
      console.log('⚠️  Some tests failed. See details above.');
    }
    
    console.log('='.repeat(60));
  }

  async runTest() {
    console.log('🔬 FINAL BACKGROUND JOB TEST - AFTER FIXES');
    console.log('='.repeat(60));
    
    const results = await this.testCompleteWorkflow();
    this.generateReport(results);
    
    return results;
  }
}

// Run the test
const test = new FinalBackgroundJobTest();
test.runTest().then(results => {
  process.exit(0);
}).catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});