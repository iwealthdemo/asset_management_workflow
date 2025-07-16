/**
 * Test Background Job System Fix
 * Tests the corrected workflow: analyst uploads → background job → manager sees insights
 */

import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import FormData from 'form-data';

class BackgroundJobFixTest {
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

  async login(userType) {
    const users = {
      analyst: { username: 'analyst1', password: 'admin123' },
      manager: { username: 'manager1', password: 'admin123' }
    };

    const user = users[userType];
    if (!user) throw new Error(`Unknown user type: ${userType}`);

    const response = await this.makeRequest('POST', '/api/auth/login', user);
    
    if (response.ok) {
      const setCookieHeader = response.headers.get('set-cookie');
      if (setCookieHeader) {
        this.cookies = setCookieHeader.split(';')[0];
      }
      console.log(`✅ Logged in as ${userType}`);
      return true;
    } else {
      console.log(`❌ Login failed for ${userType}`);
      return false;
    }
  }

  async testAnalystUploadWithBackgroundJob() {
    console.log('\n🔬 Testing Analyst Upload with Background Job...');
    
    // Step 1: Login as analyst
    const loginSuccess = await this.login('analyst');
    if (!loginSuccess) return { success: false, error: 'Login failed' };

    // Step 2: Create investment proposal
    const proposalData = {
      targetCompany: 'Test Company for Background Job',
      investmentType: 'equity',
      amount: '500000',
      expectedReturn: '15',
      description: 'Testing background job system',
      riskLevel: 'medium'
    };

    const proposalResponse = await this.makeRequest('POST', '/api/investments', proposalData);
    if (!proposalResponse.ok) {
      return { success: false, error: 'Failed to create proposal' };
    }

    const proposal = await proposalResponse.json();
    console.log(`✅ Created proposal: ${proposal.requestId}`);

    // Step 3: Upload document (should trigger background job)
    const testDocPath = path.join(process.cwd(), 'test-document.txt');
    
    // Create a test document if it doesn't exist
    if (!fs.existsSync(testDocPath)) {
      fs.writeFileSync(testDocPath, 'This is a test document for background job processing.\n\nIt contains important investment information that should be processed by AI.');
    }

    const formData = new FormData();
    formData.append('documents', fs.createReadStream(testDocPath));
    formData.append('requestType', 'investment');
    formData.append('requestId', proposal.id.toString());

    const uploadResponse = await this.makeRequest('POST', '/api/documents/upload', formData, this.cookies, true);
    if (!uploadResponse.ok) {
      return { success: false, error: 'Failed to upload document' };
    }

    const uploadResult = await uploadResponse.json();
    const documentId = uploadResult[0]?.id;
    console.log(`✅ Document uploaded, ID: ${documentId}`);

    // Step 4: Check initial job status
    const jobStatusResponse = await this.makeRequest('GET', `/api/documents/${documentId}/job-status`);
    if (!jobStatusResponse.ok) {
      return { success: false, error: 'Failed to get job status' };
    }

    const jobStatus = await jobStatusResponse.json();
    console.log(`📋 Initial job status:`, jobStatus);

    // Step 5: Wait for background job to process (up to 60 seconds)
    let jobCompleted = false;
    let attempts = 0;
    const maxAttempts = 12; // 60 seconds with 5-second intervals

    while (!jobCompleted && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      attempts++;

      const statusResponse = await this.makeRequest('GET', `/api/documents/${documentId}/job-status`);
      if (statusResponse.ok) {
        const status = await statusResponse.json();
        console.log(`⏳ Attempt ${attempts}: Job status = ${status.hasJob ? status.job.status : 'No job'}`);

        if (status.hasJob && (status.job.status === 'completed' || status.job.status === 'failed')) {
          jobCompleted = true;
          
          if (status.job.status === 'completed') {
            console.log(`✅ Background job completed successfully`);
            return {
              success: true,
              proposalId: proposal.id,
              documentId: documentId,
              jobStatus: status.job
            };
          } else {
            console.log(`❌ Background job failed: ${status.job.errorMessage}`);
            return {
              success: false,
              error: `Background job failed: ${status.job.errorMessage}`,
              proposalId: proposal.id,
              documentId: documentId
            };
          }
        }
      }
    }

    return {
      success: false,
      error: 'Background job timed out after 60 seconds',
      proposalId: proposal.id,
      documentId: documentId
    };
  }

  async testManagerViewsAutoInsights(proposalId, documentId) {
    console.log('\n👔 Testing Manager Views Auto-Insights...');
    
    // Step 1: Login as manager
    const loginSuccess = await this.login('manager');
    if (!loginSuccess) return { success: false, error: 'Manager login failed' };

    // Step 2: Check if document has completed analysis
    const docResponse = await this.makeRequest('GET', `/api/documents/investment/${proposalId}`);
    if (!docResponse.ok) {
      return { success: false, error: 'Failed to get documents' };
    }

    const documents = await docResponse.json();
    const document = documents.find(doc => doc.id === documentId);
    
    if (!document) {
      return { success: false, error: 'Document not found' };
    }

    console.log(`📄 Document status: ${document.analysisStatus}`);

    // Step 3: If analysis is completed, check for automatic insights
    if (document.analysisStatus === 'completed') {
      console.log('✅ Document analysis completed - checking for auto-insights...');
      
      // The UI should automatically call get-insights for completed background jobs
      // Let's simulate what the UI would do
      const insightsResponse = await this.makeRequest('POST', `/api/documents/${documentId}/get-insights`);
      
      if (insightsResponse.ok) {
        const insights = await insightsResponse.json();
        console.log('✅ Auto-insights generated successfully');
        console.log('📋 Summary:', insights.summary?.substring(0, 100) + '...');
        console.log('🔍 Insights:', insights.insights?.substring(0, 100) + '...');
        
        return {
          success: true,
          hasAutoInsights: true,
          insights: insights
        };
      } else {
        console.log('❌ Failed to get auto-insights');
        return {
          success: false,
          error: 'Failed to get auto-insights',
          documentStatus: document.analysisStatus
        };
      }
    } else {
      console.log(`⏳ Document still in ${document.analysisStatus} status`);
      return {
        success: false,
        error: `Document not ready for insights: ${document.analysisStatus}`,
        documentStatus: document.analysisStatus
      };
    }
  }

  async runCompleteTest() {
    console.log('🚀 Starting Background Job Fix Test...\n');
    
    const results = {
      timestamp: new Date().toISOString(),
      tests: []
    };

    try {
      // Test 1: Analyst uploads document with background job
      console.log('='.repeat(60));
      const analystTest = await this.testAnalystUploadWithBackgroundJob();
      results.tests.push({
        name: 'Analyst Upload with Background Job',
        ...analystTest
      });

      if (analystTest.success) {
        // Test 2: Manager views auto-insights
        console.log('='.repeat(60));
        const managerTest = await this.testManagerViewsAutoInsights(
          analystTest.proposalId,
          analystTest.documentId
        );
        results.tests.push({
          name: 'Manager Views Auto-Insights',
          ...managerTest
        });
      }

      // Generate report
      this.generateReport(results);

    } catch (error) {
      console.error('💥 Test suite failed:', error.message);
      results.error = error.message;
      this.generateReport(results);
    }
  }

  generateReport(results) {
    console.log('\n' + '='.repeat(60));
    console.log('📊 BACKGROUND JOB FIX TEST RESULTS');
    console.log('='.repeat(60));
    
    results.tests.forEach((test, index) => {
      console.log(`\n${index + 1}. ${test.name}`);
      console.log(`   Status: ${test.success ? '✅ PASSED' : '❌ FAILED'}`);
      
      if (test.error) {
        console.log(`   Error: ${test.error}`);
      }
      
      if (test.proposalId) {
        console.log(`   Proposal ID: ${test.proposalId}`);
      }
      
      if (test.documentId) {
        console.log(`   Document ID: ${test.documentId}`);
      }
      
      if (test.jobStatus) {
        console.log(`   Job Status: ${test.jobStatus.status}`);
        console.log(`   Job Type: ${test.jobStatus.jobType}`);
      }
      
      if (test.hasAutoInsights) {
        console.log(`   Auto-Insights: ✅ Generated`);
      }
    });

    const passedTests = results.tests.filter(t => t.success).length;
    const totalTests = results.tests.length;
    
    console.log(`\n📈 SUMMARY: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
      console.log('🎉 ALL TESTS PASSED! Background job system is working correctly.');
    } else {
      console.log('⚠️  Some tests failed. Check the error messages above.');
    }
    
    console.log('='.repeat(60));
  }
}

// Run the test
const test = new BackgroundJobFixTest();
test.runCompleteTest();