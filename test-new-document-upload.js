#!/usr/bin/env node

/**
 * Test New Document Upload with Updated Background Job Processing
 * Tests the complete workflow with the improved summary and insights generation
 */

import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';

const BASE_URL = 'http://localhost:5000';

async function testNewDocumentUpload() {
  console.log('🧪 Testing Updated Document Processing with Summary & Insights\n');

  try {
    // Step 1: Login
    console.log('1️⃣ Logging in...');
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'analyst1', password: 'admin123' })
    });

    if (!loginResponse.ok) {
      console.log('❌ Login failed');
      return false;
    }

    const loginData = await loginResponse.json();
    console.log(`✅ Logged in as ${loginData.user.username}`);

    const cookies = loginResponse.headers.get('set-cookie');
    const sessionCookie = cookies ? cookies.split(';')[0] : '';

    // Step 2: Create Investment
    console.log('\n2️⃣ Creating new investment...');
    
    const investmentData = {
      targetCompany: 'AI Insights Test Corp',
      assetType: 'equity',
      investmentType: 'venture_capital',
      amount: '5000000',
      expectedReturn: '22.0',
      riskLevel: 'high',
      description: 'Testing updated LLM service integration with comprehensive summary and insights generation'
    };

    const investmentResponse = await fetch(`${BASE_URL}/api/investments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      },
      body: JSON.stringify(investmentData)
    });

    if (!investmentResponse.ok) {
      console.log('❌ Investment creation failed');
      return false;
    }

    const investment = await investmentResponse.json();
    console.log(`✅ Created investment ${investment.id}: ${investment.targetCompany}`);

    // Step 3: Create Enhanced Test Document
    console.log('\n3️⃣ Creating comprehensive test document...');
    
    const testDocument = `# Comprehensive Investment Analysis Report

## Executive Summary
AI Insights Test Corp represents a significant opportunity in the artificial intelligence and machine learning sector. This analysis provides a detailed evaluation of the investment opportunity, including financial projections, risk assessment, and strategic recommendations.

## Company Overview
- **Company Name**: ${investment.targetCompany}
- **Industry**: Artificial Intelligence & Machine Learning
- **Stage**: Growth Stage
- **Headquarters**: San Francisco, CA
- **Founded**: 2019
- **Employees**: 150+

## Financial Analysis

### Revenue Projections
- Current Annual Revenue: $15M
- Projected Year 1: $22M (47% growth)
- Projected Year 2: $35M (59% growth)
- Projected Year 3: $55M (57% growth)

### Investment Details
- **Investment Amount**: $${investment.amount}
- **Expected Return**: ${investment.expectedReturn}%
- **Valuation**: $80M pre-money
- **Use of Funds**: Product development (40%), Sales & Marketing (35%), Team expansion (25%)

## Market Analysis

### Market Size
- Total Addressable Market (TAM): $350B
- Serviceable Addressable Market (SAM): $45B
- Serviceable Obtainable Market (SOM): $2.8B

### Competitive Landscape
The company competes with established players like OpenAI, Anthropic, and Google AI, but has carved out a niche in enterprise automation solutions.

## Risk Assessment

### High-Risk Factors
1. **Technology Risk**: Rapid evolution in AI technology could make current solutions obsolete
2. **Competitive Risk**: Large tech companies with significant resources entering the market
3. **Regulatory Risk**: Potential AI regulation could impact business operations
4. **Market Risk**: Economic downturn could reduce enterprise spending on AI solutions

### Mitigation Strategies
- Strong IP portfolio with 15+ patents
- Diversified customer base across multiple industries
- Experienced management team with proven track record
- Strategic partnerships with major cloud providers

## Management Team

### Key Leadership
- **CEO**: Sarah Chen - Former VP at Google AI, Stanford PhD
- **CTO**: Michael Rodriguez - Ex-Tesla Autopilot team lead
- **CFO**: Jessica Park - Former investment banker at Goldman Sachs

## Financial Metrics

### Key Performance Indicators
- Monthly Recurring Revenue: $1.8M
- Customer Acquisition Cost: $15K
- Lifetime Value: $280K
- Gross Margin: 78%
- Churn Rate: 3% monthly

### Unit Economics
- Revenue per employee: $100K
- EBITDA Margin: 15%
- Cash Burn Rate: $800K/month
- Runway: 18 months

## Investment Recommendation

### Recommendation: PROCEED WITH INVESTMENT

### Key Strengths
1. Strong product-market fit evidenced by 15% month-over-month growth
2. Experienced leadership team with domain expertise
3. Defensible technology moat with proprietary algorithms
4. Large and growing market opportunity
5. Strong unit economics and path to profitability

### Investment Thesis
This investment aligns with our thesis of backing category-defining AI companies with strong fundamentals. The combination of experienced leadership, proven technology, and large market opportunity makes this an attractive investment at current valuation.

### Expected Outcomes
- 3-5x return over 5-year investment horizon
- Potential for strategic acquisition by major tech company
- Strong probability of follow-on investment rounds
- Market leadership position in enterprise AI automation

## Conclusion

AI Insights Test Corp represents a compelling investment opportunity with strong fundamentals, experienced leadership, and significant market potential. We recommend proceeding with the investment as proposed.

---
*Report generated for LLM service integration testing*
*Document contains comprehensive analysis suitable for AI processing*
`;

    const testFilePath = 'comprehensive-analysis.txt';
    fs.writeFileSync(testFilePath, testDocument, 'utf8');
    console.log(`✅ Created comprehensive document: ${testFilePath} (${testDocument.length} characters)`);

    // Step 4: Upload Document
    console.log('\n4️⃣ Uploading document with enhanced processing...');
    
    const formData = new FormData();
    formData.append('documents', fs.createReadStream(testFilePath));
    formData.append('requestType', 'investment');
    formData.append('requestId', investment.id.toString());

    const uploadResponse = await fetch(`${BASE_URL}/api/documents/upload`, {
      method: 'POST',
      headers: {
        'Cookie': sessionCookie,
        ...formData.getHeaders()
      },
      body: formData
    });

    if (!uploadResponse.ok) {
      console.log('❌ Document upload failed');
      return false;
    }

    const documents = await uploadResponse.json();
    const document = documents[0];
    console.log(`✅ Document uploaded: ID ${document.id}`);

    // Step 5: Monitor Processing with Extended Wait
    console.log('\n5️⃣ Monitoring enhanced background processing...');
    
    let attempts = 0;
    const maxAttempts = 10; // 5 minutes
    let jobCompleted = false;

    while (attempts < maxAttempts && !jobCompleted) {
      await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds
      
      // Check job status
      const statusResponse = await fetch(`${BASE_URL}/api/documents/${document.id}/job-status`, {
        headers: { 'Cookie': sessionCookie }
      });

      if (statusResponse.ok) {
        const jobStatus = await statusResponse.json();
        console.log(`📊 Job: ${jobStatus.job?.status || 'unknown'} | Step: ${jobStatus.job?.currentStep || 'N/A'}`);
        
        if (jobStatus.job?.status === 'completed') {
          console.log('✅ Background job completed!');
          jobCompleted = true;
        } else if (jobStatus.job?.status === 'failed') {
          console.log(`❌ Background job failed: ${jobStatus.job?.errorMessage}`);
          break;
        }
      }

      // Check document status
      const docResponse = await fetch(`${BASE_URL}/api/documents/investment/${investment.id}`, {
        headers: { 'Cookie': sessionCookie }
      });

      if (docResponse.ok) {
        const docs = await docResponse.json();
        const updatedDoc = docs.find(d => d.id === document.id);
        
        if (updatedDoc) {
          console.log(`📄 Document Status: ${updatedDoc.analysisStatus} | Analyzed: ${updatedDoc.analyzedAt ? 'Yes' : 'No'}`);
          
          if (updatedDoc.analysisStatus === 'completed') {
            jobCompleted = true;
          }
        }
      }

      attempts++;
      if (!jobCompleted) {
        console.log(`   Waiting... (${attempts}/${maxAttempts})`);
      }
    }

    // Step 6: Verify Analysis Results
    console.log('\n6️⃣ Verifying analysis results...');
    
    const analysisResponse = await fetch(`${BASE_URL}/api/documents/${document.id}/analysis`, {
      headers: { 'Cookie': sessionCookie }
    });

    if (analysisResponse.ok) {
      const analysis = await analysisResponse.json();
      console.log('🎉 ANALYSIS AVAILABLE!');
      console.log(`   Summary: ${analysis.summary ? 'Generated (' + analysis.summary.length + ' chars)' : 'Missing'}`);
      console.log(`   Insights: ${analysis.insights ? 'Generated (' + analysis.insights.length + ' chars)' : 'Missing'}`);
      console.log(`   Classification: ${analysis.classification || 'None'}`);
      console.log(`   Risk Assessment: ${analysis.riskAssessment || 'None'}`);
      
      if (analysis.summary && analysis.insights) {
        console.log('\n📝 Summary Preview:');
        console.log(`   "${analysis.summary.substring(0, 150)}..."`);
        console.log('\n💡 Insights Preview:');
        console.log(`   "${analysis.insights.substring(0, 150)}..."`);
        
        console.log('\n✅ SUCCESS: Full LLM analysis pipeline operational!');
        return true;
      } else {
        console.log('\n⚠️ Analysis incomplete - missing summary or insights');
      }
    } else {
      console.log(`❌ Analysis not available: ${analysisResponse.status}`);
    }

    // Cleanup
    fs.unlinkSync(testFilePath);
    console.log('\n🧹 Cleaned up test files');

    return jobCompleted;

  } catch (error) {
    console.log(`\n❌ Test failed: ${error.message}`);
    return false;
  }
}

testNewDocumentUpload()
  .then(success => {
    if (success) {
      console.log('\n🚀 COMPLETE SUCCESS: LLM service generating summary and insights!');
    } else {
      console.log('\n⚠️ Partial success: Check background job processing');
    }
  })
  .catch(error => {
    console.error('Test execution failed:', error);
  });