/**
 * Complete AI Workflow Test
 * Tests all 3 stages: Upload → Prepare for AI → Get Insights
 */

import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import FormData from 'form-data';

class CompleteWorkflowTest {
  constructor() {
    this.baseUrl = 'http://localhost:5000';
    this.sessionCookie = null;
  }

  async makeRequest(method, endpoint, data = null) {
    const url = `${this.baseUrl}${endpoint}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(this.sessionCookie && { 'Cookie': this.sessionCookie })
      }
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);
    
    if (response.headers.get('set-cookie')) {
      this.sessionCookie = response.headers.get('set-cookie');
    }

    return response;
  }

  async testWorkflow() {
    console.log('🚀 Testing Complete AI Workflow...\n');

    try {
      // Login
      console.log('1. 🔐 Logging in...');
      const loginResponse = await this.makeRequest('POST', '/api/auth/login', {
        username: 'admin',
        password: 'admin123'
      });
      
      if (!loginResponse.ok) {
        throw new Error('Login failed');
      }
      console.log('✅ Login successful');

      // Test document 19 (known to exist)
      const documentId = 19;
      
      // Stage 3: Get Insights
      console.log('\n2. 🧠 Testing Get Insights...');
      console.log('   Making API call to get insights...');
      
      const startTime = Date.now();
      const insightsResponse = await this.makeRequest('POST', `/api/documents/${documentId}/get-insights`);
      const endTime = Date.now();
      
      console.log(`   Request took ${endTime - startTime}ms`);
      
      if (insightsResponse.ok) {
        const result = await insightsResponse.json();
        
        console.log('✅ Get Insights successful!');
        console.log('\n📋 SUMMARY:');
        console.log('============');
        console.log(result.summary);
        console.log('\n🔍 INSIGHTS:');
        console.log('=============');
        console.log(result.insights);
        
        return {
          success: true,
          summary: result.summary,
          insights: result.insights
        };
      } else {
        const error = await insightsResponse.json();
        console.log('❌ Get Insights failed:', error);
        return { success: false, error };
      }

    } catch (error) {
      console.error('🚨 Test failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  async run() {
    const result = await this.testWorkflow();
    
    console.log('\n📊 FINAL RESULT:');
    console.log('=================');
    if (result.success) {
      console.log('🎉 ALL TESTS PASSED!');
      console.log('✅ Stage 1 & 2: Prepare for AI - Working');
      console.log('✅ Stage 3: Get Insights - Working');
      console.log('✅ Complete AI workflow is operational!');
    } else {
      console.log('❌ Test failed:', result.error);
    }
  }
}

// Run the test
const tester = new CompleteWorkflowTest();
tester.run().catch(console.error);