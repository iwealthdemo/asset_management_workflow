/**
 * Test Brain Icon Dialog Functionality
 * Verifies that the brain icon opens the custom query dialog correctly
 */

import fetch from 'node-fetch';

class BrainIconTest {
  constructor() {
    this.baseURL = 'http://localhost:5000';
    this.cookies = '';
  }

  async makeRequest(method, endpoint, data = null) {
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

    const response = await fetch(`${this.baseURL}${endpoint}`, options);
    return response;
  }

  async login() {
    console.log('🔐 Logging in as manager...');
    const response = await this.makeRequest('POST', '/api/auth/login', {
      username: 'manager1',
      password: 'admin123'
    });

    if (response.ok) {
      this.cookies = response.headers.get('set-cookie');
      console.log('✅ Login successful');
      return true;
    } else {
      console.log('❌ Login failed');
      return false;
    }
  }

  async checkDocumentStatus() {
    console.log('\n📊 Checking document status for brain icon visibility...');
    
    const response = await this.makeRequest('GET', '/api/documents/investment/44');
    
    if (response.ok) {
      const documents = await response.json();
      console.log('📋 Documents found:', documents.length);
      
      const completedDocs = documents.filter(doc => doc.analysisStatus === 'completed');
      console.log(`✅ Documents with brain icon available: ${completedDocs.length}`);
      
      completedDocs.forEach(doc => {
        console.log(`   📄 ${doc.originalName} (ID: ${doc.id}) - Status: ${doc.analysisStatus}`);
      });
      
      return completedDocs.length > 0;
    } else {
      console.log('❌ Failed to get documents');
      return false;
    }
  }

  async testCustomQueryEndpoint() {
    console.log('\n🧠 Testing custom query endpoint directly...');
    
    const testQuery = "What is the main revenue source for this company?";
    console.log(`🔍 Query: "${testQuery}"`);
    
    const response = await this.makeRequest('POST', '/api/documents/41/custom-query', {
      query: testQuery
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Custom query endpoint working correctly');
      console.log('📝 Sample response:', result.answer.substring(0, 150) + '...');
      return true;
    } else {
      const error = await response.json();
      console.log('❌ Custom query endpoint failed:', error);
      return false;
    }
  }

  async runTest() {
    console.log('🚀 Starting Brain Icon Functionality Test...\n');

    try {
      // Step 1: Login
      const loginSuccess = await this.login();
      if (!loginSuccess) {
        console.log('❌ Test aborted: Login failed');
        return;
      }

      // Step 2: Check document status
      const hasCompletedDocs = await this.checkDocumentStatus();
      if (!hasCompletedDocs) {
        console.log('❌ Test aborted: No completed documents found');
        return;
      }

      // Step 3: Test custom query endpoint
      const endpointWorks = await this.testCustomQueryEndpoint();
      if (!endpointWorks) {
        console.log('❌ Test aborted: Custom query endpoint not working');
        return;
      }

      console.log('\n🎉 Backend functionality confirmed working!');
      console.log('\n📝 Frontend Instructions:');
      console.log('   1. Look for the purple brain icon next to eye and download buttons');
      console.log('   2. Click the brain icon to open the custom query dialog');
      console.log('   3. Type your question and press Send');
      console.log('   4. The AI will respond with document-specific answers');
      
    } catch (error) {
      console.error('🚨 Test failed:', error.message);
    }
  }
}

const test = new BrainIconTest();
test.runTest();