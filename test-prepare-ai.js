/**
 * Test Suite for Prepare AI Functionality
 * Tests the document upload to vector store workflow
 */

import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import FormData from 'form-data';

class PrepareAITestRunner {
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

  async createTestInvestment() {
    console.log('📝 Creating test investment request...');
    const response = await this.makeRequest('POST', '/api/investments', {
      targetCompany: 'Test Company AI Prep',
      investmentType: 'equity',
      amount: '1000000',
      expectedReturn: '15',
      riskLevel: 'medium',
      description: 'Test investment for AI preparation'
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Investment created:', result.requestId);
      return result.id;
    } else {
      console.log('❌ Investment creation failed:', response.status);
      return null;
    }
  }

  async uploadTestDocument(investmentId) {
    console.log('📄 Uploading test document...');
    
    // Create a simple test document
    const testContent = `
TEST DOCUMENT FOR AI PREPARATION
=====================================

Company: Test Company AI Prep
Investment Amount: $1,000,000
Expected Return: 15%
Risk Level: Medium

Financial Highlights:
- Revenue: $50M annually
- Profit Margin: 12%
- Growth Rate: 25% YoY
- Market Cap: $500M

Risk Factors:
- Market volatility
- Regulatory changes
- Competition

Recommendation: APPROVE with conditions
`;

    const testFilePath = path.join(process.cwd(), 'test-document-ai.txt');
    fs.writeFileSync(testFilePath, testContent);

    const form = new FormData();
    form.append('documents', fs.createReadStream(testFilePath));
    form.append('requestType', 'investment');
    form.append('requestId', investmentId.toString());

    const response = await fetch(`${this.baseUrl}/api/documents/upload`, {
      method: 'POST',
      body: form,
      headers: {
        ...(this.sessionCookie && { 'Cookie': this.sessionCookie })
      }
    });

    // Clean up test file
    fs.unlinkSync(testFilePath);

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Document uploaded:', result);
      // The API returns an array directly, not wrapped in documents
      if (result && result.length > 0) {
        console.log('📄 Document name:', result[0].originalName);
        return result[0].id;
      } else {
        console.log('❌ No documents in response');
        return null;
      }
    } else {
      console.log('❌ Document upload failed:', response.status, await response.text());
      return null;
    }
  }

  async testPrepareForAI(documentId) {
    console.log('🧠 Testing Prepare for AI functionality...');
    
    const startTime = Date.now();
    const response = await this.makeRequest('POST', `/api/documents/${documentId}/prepare-ai`);
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`⏱️  Request took ${duration}ms`);

    if (response.ok) {
      const result = await response.json();
      console.log('✅ AI preparation result:', result);
      return {
        success: true,
        duration,
        result
      };
    } else {
      const error = await response.json();
      console.log('❌ AI preparation failed:', error);
      return {
        success: false,
        duration,
        error
      };
    }
  }

  async verifyDocumentStatus(documentId) {
    console.log('🔍 Verifying document status...');
    
    const response = await this.makeRequest('GET', `/api/documents/${documentId}`);
    
    if (response.ok) {
      const document = await response.json();
      console.log('📊 Document status:', document.analysisStatus);
      console.log('📋 Analysis result:', document.analysisResult ? 'Present' : 'Missing');
      
      if (document.analysisResult) {
        const analysis = JSON.parse(document.analysisResult);
        console.log('🔗 OpenAI File ID:', analysis.openai_file_id);
        console.log('🗂️  Vector Store ID:', analysis.vector_store_id);
        console.log('📦 File Batch ID:', analysis.file_batch_id);
      }
      
      return document;
    } else {
      console.log('❌ Failed to get document status:', response.status);
      return null;
    }
  }

  async runFullTest() {
    console.log('🚀 Starting Prepare AI Test Suite...\n');

    try {
      // Step 1: Login
      const loginSuccess = await this.login();
      if (!loginSuccess) {
        throw new Error('Login failed');
      }

      // Step 2: Create investment
      const investmentId = await this.createTestInvestment();
      if (!investmentId) {
        throw new Error('Investment creation failed');
      }

      // Step 3: Upload document
      const documentId = await this.uploadTestDocument(investmentId);
      if (!documentId) {
        throw new Error('Document upload failed');
      }

      // Step 4: Test prepare for AI
      const prepareResult = await this.testPrepareForAI(documentId);
      
      // Step 5: Verify final status
      const finalStatus = await this.verifyDocumentStatus(documentId);

      // Generate report
      this.generateReport({
        investmentId,
        documentId,
        prepareResult,
        finalStatus
      });

    } catch (error) {
      console.error('🚨 Test failed:', error.message);
    }
  }

  generateReport(results) {
    console.log('\n📋 TEST REPORT');
    console.log('===============');
    console.log(`Investment ID: ${results.investmentId}`);
    console.log(`Document ID: ${results.documentId}`);
    console.log(`Prepare AI Success: ${results.prepareResult.success ? '✅' : '❌'}`);
    console.log(`Processing Time: ${results.prepareResult.duration}ms`);
    console.log(`Final Status: ${results.finalStatus?.analysisStatus || 'Unknown'}`);
    
    if (results.prepareResult.success) {
      console.log('\n🎉 ALL TESTS PASSED! Prepare for AI is working correctly.');
    } else {
      console.log('\n❌ TEST FAILED. Check the error details above.');
    }
  }
}

// Run the test
const tester = new PrepareAITestRunner();
tester.runFullTest().catch(console.error);