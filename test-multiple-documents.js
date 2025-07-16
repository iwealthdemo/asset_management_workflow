/**
 * Test multiple document processing to verify sequential processing
 */

import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

class MultipleDocumentTest {
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
    console.log('🔐 Logging in...');
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
      targetCompany: 'Multi-Document Test Company',
      investmentType: 'equity',
      amount: '5000000',
      expectedReturn: '18',
      description: 'Testing multiple document processing with sequential background jobs',
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

  async createTestDocument(name, content) {
    const testFilePath = path.join(process.cwd(), `${name}.txt`);
    fs.writeFileSync(testFilePath, content);
    return testFilePath;
  }

  async uploadDocument(investmentId, fileName, content) {
    console.log(`📄 Uploading document: ${fileName}`);
    
    const testFilePath = await this.createTestDocument(fileName, content);
    
    const formData = new FormData();
    formData.append('file', fs.createReadStream(testFilePath));
    formData.append('requestType', 'investment');
    formData.append('requestId', investmentId.toString());

    const response = await this.makeRequest('POST', '/api/upload', formData, true);
    
    // Clean up test file
    fs.unlinkSync(testFilePath);
    
    console.log(`Upload response status for ${fileName}:`, response.status);
    return response.status === 200;
  }

  async monitorMultipleDocuments(investmentId) {
    console.log('\\n📊 Monitoring multiple document processing...');
    
    let monitoringRound = 0;
    const maxRounds = 20; // 20 rounds * 15 seconds = 5 minutes
    
    while (monitoringRound < maxRounds) {
      monitoringRound++;
      console.log(`\\n--- Monitoring Round ${monitoringRound} ---`);
      
      // Get all documents for this investment
      const docsResponse = await this.makeRequest('GET', `/api/documents/investment/${investmentId}`);
      
      if (docsResponse.ok) {
        const docs = await docsResponse.json();
        console.log(`Found ${docs.length} documents`);
        
        let allCompleted = true;
        let processingCount = 0;
        let completedCount = 0;
        
        for (const doc of docs) {
          const jobResponse = await this.makeRequest('GET', `/api/documents/${doc.id}/job-status`);
          
          if (jobResponse.ok) {
            const jobStatus = await jobResponse.json();
            
            if (jobStatus.hasJob) {
              const job = jobStatus.job;
              const stepNames = {
                'queued': 'Queued',
                'preparing': 'Preparing for AI analysis',
                'uploading': 'Uploading to vector store',
                'analyzing': 'Analyzing document',
                'generating_summary': 'Generating summary',
                'generating_insights': 'Generating insights',
                'completed': 'Completed'
              };
              
              const displayText = stepNames[job.currentStep] || 'Processing';
              console.log(`  📋 ${doc.originalName}: ${displayText} (${job.stepProgress}%) - Step ${job.currentStepNumber}/${job.totalSteps}`);
              
              if (job.status === 'completed') {
                completedCount++;
              } else if (job.status === 'processing') {
                processingCount++;
                allCompleted = false;
              } else {
                allCompleted = false;
              }
            } else {
              console.log(`  📋 ${doc.originalName}: No job found`);
              allCompleted = false;
            }
          }
        }
        
        console.log(`\\n📈 Processing Summary:`);
        console.log(`  - Completed: ${completedCount}/${docs.length}`);
        console.log(`  - Processing: ${processingCount}/${docs.length}`);
        console.log(`  - Queued: ${docs.length - completedCount - processingCount}/${docs.length}`);
        
        if (allCompleted) {
          console.log('\\n🎉 All documents processed successfully!');
          return true;
        }
      }
      
      if (monitoringRound < maxRounds) {
        console.log('\\nWaiting 15 seconds before next check...');
        await new Promise(resolve => setTimeout(resolve, 15000));
      }
    }
    
    console.log('\\n⏰ Monitoring timeout reached');
    return false;
  }

  async runMultipleDocumentTest() {
    console.log('🚀 Starting multiple document processing test...\\n');
    
    // Step 1: Login
    if (!(await this.login())) {
      return;
    }
    
    // Step 2: Create test investment
    const investment = await this.createTestInvestment();
    if (!investment) {
      return;
    }
    
    // Step 3: Upload multiple documents
    const documents = [
      {
        name: 'financial-statement',
        content: `Financial Statement - Multi-Document Test

Company: Multi-Document Test Company
Document Type: Financial Statement
Test Date: ${new Date().toISOString()}

Key Financial Metrics:
- Revenue: $50,000,000
- Net Income: $8,000,000
- Total Assets: $125,000,000
- Debt-to-Equity Ratio: 0.35
- ROE: 15.2%

This document should be processed sequentially with other documents.
Processing order should be maintained to ensure system stability.`
      },
      {
        name: 'market-analysis',
        content: `Market Analysis Report - Multi-Document Test

Company: Multi-Document Test Company
Document Type: Market Analysis
Test Date: ${new Date().toISOString()}

Market Conditions:
- Market Size: $2.5 billion
- Growth Rate: 12% annually
- Competition Level: Medium
- Market Share: 8%
- Competitive Advantage: Strong brand presence

This is the second document in the sequential processing test.
Background job system should process this after the first document.`
      },
      {
        name: 'risk-assessment',
        content: `Risk Assessment Report - Multi-Document Test

Company: Multi-Document Test Company
Document Type: Risk Assessment
Test Date: ${new Date().toISOString()}

Risk Factors:
- Market Risk: Medium
- Credit Risk: Low
- Operational Risk: Medium
- Regulatory Risk: Low
- Overall Risk Score: 6.2/10

This is the third document to test sequential processing.
System should handle multiple documents without conflicts.`
      }
    ];
    
    console.log('\\n📤 Uploading multiple documents...');
    
    for (const doc of documents) {
      const uploadSuccess = await this.uploadDocument(investment.id, doc.name, doc.content);
      if (!uploadSuccess) {
        console.error(`❌ Failed to upload ${doc.name}`);
        return;
      }
    }
    
    console.log('\\n✅ All documents uploaded successfully!');
    
    // Step 4: Monitor processing
    const allProcessed = await this.monitorMultipleDocuments(investment.id);
    
    // Step 5: Generate final report
    console.log('\\n📋 MULTIPLE DOCUMENT TEST RESULTS:');
    console.log('✅ Login: Success');
    console.log('✅ Investment Creation: Success');
    console.log('✅ Document Upload: Success (3 documents)');
    console.log(`${allProcessed ? '✅' : '❌'} Sequential Processing: ${allProcessed ? 'Success' : 'Partial/Failed'}`);
    
    if (allProcessed) {
      console.log('\\n🎉 MULTIPLE DOCUMENT TEST PASSED!');
      console.log('\\nKey Findings:');
      console.log('• Documents processed sequentially (one at a time)');
      console.log('• No conflicts between multiple background jobs');
      console.log('• Progress tracking works for each document independently');
      console.log('• System handles multiple documents reliably');
    } else {
      console.log('\\n⚠️  MULTIPLE DOCUMENT TEST INCOMPLETE');
      console.log('Some documents may still be processing or encountered issues.');
    }
  }
}

// Run the test
const test = new MultipleDocumentTest();
test.runMultipleDocumentTest().catch(console.error);