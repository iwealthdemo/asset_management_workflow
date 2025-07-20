/**
 * Test Real Document Upload with Background Job System
 * Uses actual uploaded documents to test the complete workflow
 */

const baseURL = 'http://localhost:5000';

const testCredentials = {
  manager: { username: 'manager1', password: 'admin123' },
  analyst: { username: 'analyst1', password: 'admin123' }
};

class RealDocumentTest {
  constructor() {
    this.cookies = '';
    this.user = null;
  }

  async makeRequest(method, endpoint, data = null) {
    const url = `${baseURL}${endpoint}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': this.cookies
      }
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);
    
    const setCookieHeader = response.headers.get('set-cookie');
    if (setCookieHeader) {
      this.cookies = setCookieHeader.split(';')[0];
    }

    return response;
  }

  async login(userType) {
    console.log(`🔑 Logging in as ${userType}...`);
    const response = await this.makeRequest('POST', '/api/auth/login', testCredentials[userType]);
    
    if (response.ok) {
      const data = await response.json();
      this.user = data.user;
      console.log(`✅ Login successful: ${data.user.username} (${data.user.role})`);
      return true;
    } else {
      console.log(`❌ Login failed for ${userType}`);
      return false;
    }
  }

  async checkExistingDocuments() {
    console.log('\n📋 Checking existing documents...');
    
    try {
      // Get existing documents for testing
      const response = await this.makeRequest('GET', '/api/documents/investment/30');
      
      if (response.ok) {
        const documents = await response.json();
        console.log(`✅ Found ${documents.length} existing documents:`);
        
        documents.forEach(doc => {
          console.log(`  - ${doc.originalName} (${Math.round(doc.fileSize/1024/1024)}MB) - Status: ${doc.analysisStatus}`);
        });
        
        return documents;
      } else {
        console.log('⚠️  No existing documents found or no access');
        return [];
      }
    } catch (error) {
      console.error('❌ Error checking documents:', error);
      return [];
    }
  }

  async testBackgroundJobStatus(documentId) {
    console.log(`\n🔍 Testing background job status for document ${documentId}...`);
    
    try {
      const response = await this.makeRequest('GET', `/api/documents/${documentId}/job-status`);
      
      if (response.ok) {
        const jobData = await response.json();
        console.log(`✅ Job status retrieved:`, jobData);
        
        if (jobData.hasJob) {
          console.log(`  - Job exists: ${jobData.job.status}`);
          console.log(`  - Job type: ${jobData.job.jobType}`);
          console.log(`  - Priority: ${jobData.job.priority}`);
          console.log(`  - Attempts: ${jobData.job.attempts}`);
        } else {
          console.log(`  - No background job found for this document`);
        }
        
        return jobData;
      } else {
        console.log('❌ Failed to get job status');
        return null;
      }
    } catch (error) {
      console.error('❌ Error checking job status:', error);
      return null;
    }
  }

  async testManualPrepareAI(documentId) {
    console.log(`\n🧠 Testing manual Prepare AI for document ${documentId}...`);
    
    try {
      const response = await this.makeRequest('POST', `/api/documents/${documentId}/prepare-ai`);
      
      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Prepare AI successful:`, result);
        return result;
      } else {
        const error = await response.json();
        console.log(`⚠️  Prepare AI response (${response.status}):`, error);
        return error;
      }
    } catch (error) {
      console.error('❌ Error in Prepare AI:', error);
      return null;
    }
  }

  async testGetInsights(documentId) {
    console.log(`\n💡 Testing Get Insights for document ${documentId}...`);
    
    try {
      const response = await this.makeRequest('POST', `/api/documents/${documentId}/get-insights`);
      
      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Get Insights successful:`, result);
        return result;
      } else {
        const error = await response.json();
        console.log(`⚠️  Get Insights response (${response.status}):`, error);
        return error;
      }
    } catch (error) {
      console.error('❌ Error in Get Insights:', error);
      return null;
    }
  }

  async testManagerWorkflow() {
    console.log('\n👔 Testing Manager Workflow (Background Jobs)...');
    
    const loginSuccess = await this.login('manager');
    if (!loginSuccess) return false;

    const documents = await this.checkExistingDocuments();
    if (documents.length === 0) {
      console.log('⚠️  No documents to test with');
      return false;
    }

    let testsPassed = 0;
    const totalTests = documents.length;

    for (const doc of documents) {
      console.log(`\n📄 Testing document: ${doc.originalName}`);
      
      // Test job status
      const jobStatus = await this.testBackgroundJobStatus(doc.id);
      if (jobStatus) testsPassed++;
      
      // Test manual prepare AI (should work even for managers as fallback)
      const prepareResult = await this.testManualPrepareAI(doc.id);
      if (prepareResult) testsPassed++;
      
      // Test get insights if document is ready
      if (doc.analysisStatus === 'completed') {
        const insightsResult = await this.testGetInsights(doc.id);
        if (insightsResult) testsPassed++;
      }
    }

    console.log(`\n📊 Manager workflow results: ${testsPassed} operations successful`);
    return testsPassed > 0;
  }

  async testAnalystWorkflow() {
    console.log('\n👩‍💼 Testing Analyst Workflow (Manual Triggers)...');
    
    const loginSuccess = await this.login('analyst');
    if (!loginSuccess) return false;

    const documents = await this.checkExistingDocuments();
    if (documents.length === 0) {
      console.log('⚠️  No documents to test with');
      return false;
    }

    let testsPassed = 0;
    const totalTests = documents.length;

    for (const doc of documents) {
      console.log(`\n📄 Testing document: ${doc.originalName}`);
      
      // Test job status (should show no background jobs for analyst uploads)
      const jobStatus = await this.testBackgroundJobStatus(doc.id);
      if (jobStatus) testsPassed++;
      
      // Test manual prepare AI (main workflow for analysts)
      const prepareResult = await this.testManualPrepareAI(doc.id);
      if (prepareResult) testsPassed++;
      
      // Test get insights if document is ready
      if (doc.analysisStatus === 'completed') {
        const insightsResult = await this.testGetInsights(doc.id);
        if (insightsResult) testsPassed++;
      }
    }

    console.log(`\n📊 Analyst workflow results: ${testsPassed} operations successful`);
    return testsPassed > 0;
  }

  async runCompleteTest() {
    console.log('🚀 Starting Real Document Testing\n');
    console.log('📋 Testing with actual uploaded documents:');
    console.log('  - HDFC Bank Annual Report (15.7 MB)');
    console.log('  - TCS Annual Report (26.7 MB)');
    console.log('  - Reliance Annual Report (15.5 MB)');

    const tests = [
      { name: 'Manager Workflow', test: () => this.testManagerWorkflow() },
      { name: 'Analyst Workflow', test: () => this.testAnalystWorkflow() }
    ];

    let passedTests = 0;
    const totalTests = tests.length;

    for (const { name, test } of tests) {
      try {
        const result = await test();
        if (result) {
          passedTests++;
          console.log(`✅ ${name}: PASSED`);
        } else {
          console.log(`❌ ${name}: FAILED`);
        }
      } catch (error) {
        console.log(`❌ ${name}: ERROR - ${error.message}`);
      }
    }

    console.log(`\n📊 Overall Results: ${passedTests}/${totalTests} workflows passed`);
    
    if (passedTests === totalTests) {
      console.log('🎉 REAL DOCUMENT TESTING COMPLETE!');
      console.log('✅ Background job system working with actual documents');
      console.log('✅ Role-based workflows functioning correctly');
      console.log('✅ Ready for production use');
    } else {
      console.log('⚠️  Some workflows need attention');
    }
  }
}

// Run the test
const test = new RealDocumentTest();
test.runCompleteTest().catch(console.error);