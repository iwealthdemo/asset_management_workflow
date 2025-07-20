/**
 * Simple Background Job Test
 * Direct test of the background job processing without job status API
 */

import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import FormData from 'form-data';

class SimpleBackgroundJobTest {
  constructor() {
    this.baseUrl = 'http://localhost:5000';
    this.cookies = '';
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

  async login() {
    const response = await this.makeRequest('POST', '/api/auth/login', {
      username: 'analyst1',
      password: 'admin123'
    });
    
    if (response.ok) {
      const setCookieHeader = response.headers.get('set-cookie');
      if (setCookieHeader) {
        this.cookies = setCookieHeader.split(';')[0];
      }
      console.log('✅ Logged in as analyst');
      return true;
    }
    return false;
  }

  async testBackgroundJobProcessing() {
    console.log('🚀 Testing Background Job Processing...\n');
    
    // Step 1: Login
    const loginSuccess = await this.login();
    if (!loginSuccess) {
      console.log('❌ Login failed');
      return false;
    }

    // Step 2: Create proposal
    const proposalData = {
      targetCompany: 'Background Job Test Company',
      investmentType: 'equity',
      amount: '750000',
      expectedReturn: '18',
      description: 'Testing background job processing',
      riskLevel: 'medium'
    };

    const proposalResponse = await this.makeRequest('POST', '/api/investments', proposalData);
    if (!proposalResponse.ok) {
      console.log('❌ Failed to create proposal');
      return false;
    }

    const proposal = await proposalResponse.json();
    console.log(`✅ Created proposal: ${proposal.requestId}`);

    // Step 3: Upload document
    const testDocPath = path.join(process.cwd(), 'test-document.txt');
    
    // Create test document
    const testContent = `
BACKGROUND JOB TEST DOCUMENT
============================

Company: Background Job Test Company
Investment Type: Equity
Amount: $750,000
Expected Return: 18%
Risk Level: Medium

This document is being used to test the background job processing system.
It should be automatically processed when uploaded by an analyst.

Key Information:
- Investment target: Background Job Test Company
- Sector: Technology
- Market cap: $2.5 billion
- Revenue growth: 25% YoY
- Risk factors: Market volatility, competition

The background job system should:
1. Automatically queue this document for AI processing
2. Upload it to the vector store
3. Mark it as completed
4. Make it available for insights generation
`;

    fs.writeFileSync(testDocPath, testContent);

    const formData = new FormData();
    formData.append('documents', fs.createReadStream(testDocPath));
    formData.append('requestType', 'investment');
    formData.append('requestId', proposal.id.toString());

    const uploadResponse = await this.makeRequest('POST', '/api/documents/upload', formData, this.cookies, true);
    if (!uploadResponse.ok) {
      console.log('❌ Failed to upload document');
      return false;
    }

    const uploadResult = await uploadResponse.json();
    const documentId = uploadResult[0]?.id;
    console.log(`✅ Document uploaded, ID: ${documentId}`);

    // Step 4: Monitor document processing by checking document status
    console.log('⏳ Monitoring document processing...');
    
    let processingComplete = false;
    let attempts = 0;
    const maxAttempts = 20; // 100 seconds total

    while (!processingComplete && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      attempts++;

      // Check document status directly
      const docResponse = await this.makeRequest('GET', `/api/documents/investment/${proposal.id}`);
      if (docResponse.ok) {
        const documents = await docResponse.json();
        const document = documents.find(doc => doc.id === documentId);
        
        if (document) {
          console.log(`📋 Attempt ${attempts}: Document status = ${document.analysisStatus}`);
          
          if (document.analysisStatus === 'completed') {
            console.log('✅ Document processing completed!');
            processingComplete = true;
            
            // Try to get insights
            const insightsResponse = await this.makeRequest('POST', `/api/documents/${documentId}/get-insights`);
            if (insightsResponse.ok) {
              const insights = await insightsResponse.json();
              console.log('✅ Insights generated successfully!');
              console.log('📋 Summary preview:', insights.summary?.substring(0, 100) + '...');
              return true;
            } else {
              console.log('⚠️  Document processed but insights generation failed');
              return false;
            }
          } else if (document.analysisStatus === 'failed') {
            console.log('❌ Document processing failed');
            return false;
          }
        }
      }
    }

    if (!processingComplete) {
      console.log('❌ Background job processing timed out after 100 seconds');
      return false;
    }

    return true;
  }

  async runTest() {
    console.log('🔬 Simple Background Job Test');
    console.log('=' .repeat(50));
    
    const success = await this.testBackgroundJobProcessing();
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST RESULTS');
    console.log('='.repeat(50));
    
    if (success) {
      console.log('🎉 SUCCESS: Background job system is working correctly!');
      console.log('- Document uploaded by analyst');
      console.log('- Background job processed document');
      console.log('- Document marked as completed');
      console.log('- Insights generated successfully');
    } else {
      console.log('❌ FAILED: Background job system needs troubleshooting');
    }
  }
}

// Run the test
const test = new SimpleBackgroundJobTest();
test.runTest();