/**
 * Test Suite for Get Insights Functionality
 * Tests the complete Stage 3 workflow: Generate summary and insights from vector store
 */

import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

class GetInsightsTestRunner {
  constructor() {
    this.baseUrl = 'http://localhost:5000';
    this.sessionCookie = null;
    this.testResults = [];
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
    
    // Save session cookie if present
    if (response.headers.get('set-cookie')) {
      this.sessionCookie = response.headers.get('set-cookie');
    }

    return response;
  }

  async login() {
    console.log('🔐 Logging in as admin...');
    const response = await this.makeRequest('POST', '/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Login successful:', result.user.username);
      return true;
    } else {
      console.log('❌ Login failed:', response.status);
      return false;
    }
  }

  async testGetInsights() {
    console.log('🧠 Testing Get Insights functionality...');
    
    // Test with document ID 19 (from previous test)
    const documentId = 19;
    const startTime = Date.now();
    
    const response = await this.makeRequest('POST', `/api/documents/${documentId}/get-insights`);
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`⏱️  Request took ${duration}ms`);

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Get Insights result:', result);
      
      // Validate result structure
      if (result.summary && result.insights) {
        console.log('✅ Summary generated successfully');
        console.log('✅ Insights generated successfully');
        
        // Display the results
        console.log('\n📋 SUMMARY:');
        console.log('===========');
        console.log(result.summary);
        
        console.log('\n🔍 INSIGHTS:');
        console.log('============');
        console.log(result.insights);
        
        return {
          success: true,
          duration,
          summary: result.summary,
          insights: result.insights
        };
      } else {
        console.log('❌ Missing summary or insights in response');
        return {
          success: false,
          duration,
          error: 'Missing summary or insights'
        };
      }
    } else {
      const error = await response.json();
      console.log('❌ Get Insights failed:', error);
      return {
        success: false,
        duration,
        error
      };
    }
  }

  async verifyDocumentInsights(documentId) {
    console.log('🔍 Verifying document insights were saved...');
    
    const response = await this.makeRequest('GET', `/api/documents/${documentId}`);
    
    if (response.ok) {
      const document = await response.json();
      console.log('📊 Document status:', document.analysisStatus);
      
      if (document.analysisResult) {
        const analysis = JSON.parse(document.analysisResult);
        console.log('📝 Has summary:', analysis.summary ? 'Yes' : 'No');
        console.log('🔍 Has insights:', analysis.insights ? 'Yes' : 'No');
        console.log('📅 Insights generated at:', analysis.insightsGeneratedAt || 'Not set');
        
        return {
          hasSummary: !!analysis.summary,
          hasInsights: !!analysis.insights,
          insightsGeneratedAt: analysis.insightsGeneratedAt
        };
      }
      
      return {
        hasSummary: false,
        hasInsights: false,
        insightsGeneratedAt: null
      };
    } else {
      console.log('❌ Failed to get document:', response.status);
      return null;
    }
  }

  async runFullTest() {
    console.log('🚀 Starting Get Insights Test Suite...\n');

    try {
      // Step 1: Login
      const loginSuccess = await this.login();
      if (!loginSuccess) {
        throw new Error('Login failed');
      }

      // Step 2: Test get insights
      const insightsResult = await this.testGetInsights();
      
      // Step 3: Verify insights were saved
      const verificationResult = await this.verifyDocumentInsights(19);

      // Generate report
      this.generateReport({
        documentId: 19,
        insightsResult,
        verificationResult
      });

    } catch (error) {
      console.error('🚨 Test failed:', error.message);
    }
  }

  generateReport(results) {
    console.log('\n📋 GET INSIGHTS TEST REPORT');
    console.log('============================');
    console.log(`Document ID: ${results.documentId}`);
    console.log(`Get Insights Success: ${results.insightsResult.success ? '✅' : '❌'}`);
    console.log(`Processing Time: ${results.insightsResult.duration}ms`);
    console.log(`Summary Generated: ${results.verificationResult?.hasSummary ? '✅' : '❌'}`);
    console.log(`Insights Generated: ${results.verificationResult?.hasInsights ? '✅' : '❌'}`);
    console.log(`Saved to Database: ${results.verificationResult?.insightsGeneratedAt ? '✅' : '❌'}`);
    
    if (results.insightsResult.success && results.verificationResult?.hasSummary && results.verificationResult?.hasInsights) {
      console.log('\n🎉 ALL TESTS PASSED! Get Insights functionality is working correctly.');
      console.log('✅ Stage 3 implementation complete!');
    } else {
      console.log('\n❌ TEST FAILED. Check the error details above.');
    }
  }
}

// Run the test
const tester = new GetInsightsTestRunner();
tester.runFullTest().catch(console.error);