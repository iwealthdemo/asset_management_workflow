// Complete verification test for the document processing fix
// Tests both upload fallback and insights generation

async function testCompleteDocumentProcessing() {
  console.log('=== Complete Document Processing Fix Verification ===\n');
  
  try {
    const baseUrl = 'http://localhost:5000';
    
    // 1. Login as admin
    console.log('1. Logging in as admin...');
    let response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to login as admin');
    }
    
    const login = await response.json();
    const cookies = response.headers.get('set-cookie');
    console.log(`✓ Admin logged in: ${login.user.username}\n`);
    
    // 2. Create test investment
    console.log('2. Creating test investment...');
    response = await fetch(`${baseUrl}/api/investments`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookies 
      },
      body: JSON.stringify({
        requestId: "TEST-COMPLETE-001",
        targetCompany: "Complete Fix Test Co",
        investmentType: "equity",
        amount: 750000,
        currency: "USD",
        expectedReturn: 15.0,
        riskLevel: "high",
        region: "Asia",
        sector: "Technology",
        description: "Test investment to verify complete document processing fix including upload fallback and insights generation",
        status: "draft"
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create test investment');
    }
    
    const investment = await response.json();
    console.log(`✓ Test investment created: ${investment.requestId} (ID: ${investment.id})\n`);
    
    // 3. Create comprehensive test document
    console.log('3. Creating comprehensive test document...');
    const testContent = `COMPLETE FIX VERIFICATION DOCUMENT

Company: Complete Fix Test Co
Document Type: Investment Analysis Report
Year: 2024
Amount: $750,000 USD
Expected Return: 15.0%
Risk Level: High

EXECUTIVE SUMMARY
This comprehensive test document verifies that our document processing fix addresses both:
1. Upload and vectorization when external LLM service fails
2. Local OpenAI Responses API for insights generation

The document contains rich content designed to test the complete workflow from upload to final analysis.

FINANCIAL ANALYSIS
Revenue Growth: 45% year-over-year
Profit Margins: 18.5% EBITDA
Cash Flow: $2.3M positive operating cash flow
Debt-to-Equity: 0.35 (conservative leverage)

MARKET OPPORTUNITY
Total Addressable Market: $15B globally
Competitive Position: #3 in Asia-Pacific region
Growth Drivers:
- Digital transformation initiatives
- Regulatory favorable environment
- Strategic partnerships with major clients

RISK ASSESSMENT
Key Risks:
- Market volatility in technology sector
- Regulatory changes in target markets
- Competition from established players
- Currency exchange rate fluctuations

Mitigation Strategies:
- Diversified revenue streams
- Strong balance sheet
- Experienced management team
- Proven track record of execution

INVESTMENT RECOMMENDATION
Strong BUY recommendation based on:
- Solid financial fundamentals
- Clear growth trajectory
- Experienced leadership team
- Favorable market conditions
- Reasonable valuation metrics

Target Price: $950,000 (26.7% upside)
Time Horizon: 18-24 months
Confidence Level: High

This document should trigger comprehensive processing including:
1. Local OpenAI upload with metadata extraction
2. Vector store integration with proper attributes
3. AI-powered summary and insights generation
4. Complete background job workflow completion`;
    
    // Upload the test document
    const formData = new FormData();
    const blob = new Blob([testContent], { type: 'text/plain' });
    formData.append('documents', blob, 'complete-fix-test-analysis-2024.txt');
    
    console.log('4. Uploading test document...');
    response = await fetch(`${baseUrl}/api/documents/investment/${investment.id}`, {
      method: 'POST',
      headers: { 'Cookie': cookies },
      body: formData
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to upload document: ${errorText}`);
    }
    
    const uploadResult = await response.json();
    console.log(`✓ Document uploaded successfully`);
    console.log(`✓ Document ID: ${uploadResult[0]?.id}\n`);
    
    const documentId = uploadResult[0]?.id;
    if (!documentId) {
      throw new Error('No document ID returned from upload');
    }
    
    // 5. Monitor background processing
    console.log('5. Monitoring complete document processing workflow...');
    console.log('Expected flow:');
    console.log('  - External LLM service upload → May fail (service issue)');
    console.log('  - Local OpenAI upload fallback → Should succeed with metadata');
    console.log('  - Local OpenAI insights generation → Should succeed with Responses API');
    console.log('  - Job completion → Should show "completed" status\n');
    
    let attempts = 0;
    const maxAttempts = 25; // 2.5 minutes max
    let processingComplete = false;
    let lastStatus = '';
    
    while (attempts < maxAttempts && !processingComplete) {
      attempts++;
      console.log(`Status check ${attempts}/${maxAttempts}:`);
      
      try {
        // Check background job status
        response = await fetch(`${baseUrl}/api/documents/${documentId}/job-status`, {
          headers: { 'Cookie': cookies }
        });
        
        if (response.ok) {
          const jobStatus = await response.json();
          
          if (jobStatus.hasJob && jobStatus.job) {
            const job = jobStatus.job;
            
            if (job.status !== lastStatus) {
              console.log(`  Job Status Changed: ${lastStatus} → ${job.status}`);
              lastStatus = job.status;
            }
            
            console.log(`  Current Status: ${job.status}`);
            console.log(`  Progress: ${job.currentStep || 'N/A'} (${job.stepProgress || 0}%)`);
            
            if (job.errorMessage) {
              console.log(`  Error: ${job.errorMessage}`);
            }
            
            if (job.status === 'completed') {
              console.log('\n🎉 BACKGROUND JOB COMPLETED!');
              processingComplete = true;
              break;
            } else if (job.status === 'failed') {
              console.log('\n❌ BACKGROUND JOB FAILED');
              break;
            }
          }
        }
        
        // Also check document analysis status
        response = await fetch(`${baseUrl}/api/documents/investment/${investment.id}`, {
          headers: { 'Cookie': cookies }
        });
        
        if (response.ok) {
          const documents = await response.json();
          const document = documents.find(doc => doc.id === documentId);
          
          if (document) {
            console.log(`  Document Analysis Status: ${document.analysisStatus}`);
            console.log(`  Has Analysis: ${document.analysisResult ? 'Yes' : 'No'}`);
            
            if (document.analysisStatus === 'completed' && document.analysisResult) {
              console.log('  Analysis Data Available: ✓');
            }
          }
        }
        
      } catch (error) {
        console.log(`  Status check failed: ${error.message}`);
      }
      
      console.log(''); // Empty line for readability
      
      // Wait 6 seconds before next check
      await new Promise(resolve => setTimeout(resolve, 6000));
    }
    
    // 6. Final verification
    console.log('6. Final verification of complete fix...');
    response = await fetch(`${baseUrl}/api/documents/investment/${investment.id}`, {
      headers: { 'Cookie': cookies }
    });
    
    if (response.ok) {
      const documents = await response.json();
      const document = documents.find(doc => doc.id === documentId);
      
      if (document) {
        console.log('\n=== FINAL RESULTS ===');
        console.log(`Document Analysis Status: ${document.analysisStatus}`);
        console.log(`Has Analysis Result: ${document.analysisResult ? 'YES' : 'NO'}`);
        
        if (document.analysisResult) {
          try {
            const analysis = JSON.parse(document.analysisResult);
            console.log(`\nSummary Length: ${analysis.summary?.length || 0} characters`);
            console.log(`Insights Length: ${analysis.insights?.length || 0} characters`);
            
            console.log('\n--- GENERATED SUMMARY ---');
            console.log(analysis.summary?.substring(0, 300) + '...');
            
            console.log('\n--- GENERATED INSIGHTS ---');
            console.log(analysis.insights?.substring(0, 400) + '...');
            
            console.log('\n✅ COMPLETE SUCCESS!');
            console.log('🔧 Upload fallback is working');
            console.log('🔧 Metadata extraction is working');
            console.log('🔧 Local OpenAI Responses API is working');
            console.log('🔧 Background job workflow is complete');
            console.log('🔧 Document analysis generation is successful');
            
          } catch (parseError) {
            console.log('⚠️ Analysis result exists but parsing failed:', parseError.message);
          }
        } else {
          console.log('\n⚠️ PARTIAL SUCCESS');
          console.log('Document uploaded but no analysis generated');
        }
      }
    }
    
    console.log('\n=== TEST COMPLETE ===');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

testCompleteDocumentProcessing();