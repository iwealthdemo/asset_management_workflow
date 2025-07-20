/**
 * Test Custom Query Functionality
 * Tests the brain icon and custom query feature
 */

import fetch from 'node-fetch';
import fs from 'fs';

class CustomQueryTest {
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

  async testCustomQuery() {
    console.log('\n🧠 Testing Custom Query Functionality...');
    
    // Test with document 41 (Reliance Annual Report)
    const documentId = 41;
    const testQueries = [
      "What is the main business of this company?",
      "What are the key financial highlights from this annual report?",
      "What are the major risks mentioned in this document?",
      "What is the company's strategy for growth?"
    ];

    for (const query of testQueries) {
      console.log(`\n📝 Testing query: "${query}"`);
      
      const startTime = Date.now();
      const response = await this.makeRequest('POST', `/api/documents/${documentId}/custom-query`, {
        query
      });
      const endTime = Date.now();
      
      console.log(`⏱️  Request took ${endTime - startTime}ms`);
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Query successful');
        console.log('🔍 Response:', result.answer.substring(0, 200) + '...');
        
        // Wait a bit between queries to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        const error = await response.json();
        console.log('❌ Query failed:', error);
      }
    }
  }

  async testDocumentStatus() {
    console.log('\n📊 Checking document status...');
    
    const response = await this.makeRequest('GET', '/api/documents/investment/44');
    
    if (response.ok) {
      const documents = await response.json();
      console.log('📋 Documents found:', documents.length);
      
      documents.forEach(doc => {
        console.log(`   Document ${doc.id}: ${doc.originalName}`);
        console.log(`   Status: ${doc.analysisStatus}`);
        console.log(`   Brain icon should be visible: ${doc.analysisStatus === 'completed' ? 'YES' : 'NO'}`);
      });
    } else {
      console.log('❌ Failed to get documents');
    }
  }

  async runTest() {
    console.log('🚀 Starting Custom Query Test...\n');

    try {
      // Step 1: Login
      const loginSuccess = await this.login();
      if (!loginSuccess) {
        console.log('❌ Test aborted: Login failed');
        return;
      }

      // Step 2: Check document status
      await this.testDocumentStatus();

      // Step 3: Test custom queries
      await this.testCustomQuery();

      console.log('\n🎉 Custom Query Test completed successfully!');
      
    } catch (error) {
      console.error('🚨 Test failed:', error.message);
    }
  }
}

const test = new CustomQueryTest();
test.runTest();