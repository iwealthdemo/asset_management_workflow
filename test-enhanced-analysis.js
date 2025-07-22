// Test script to verify enhanced document analysis generates comprehensive insights
import fetch from 'node-fetch';
import fs from 'fs';

async function testEnhancedAnalysis() {
  try {
    console.log('🧪 Testing Enhanced Document Analysis');
    
    // Read session cookie
    const sessionCookie = fs.readFileSync('session_cookie.txt', 'utf8').trim();
    
    // Get a recent document that should have analysis
    console.log('📋 Fetching recent investment documents...');
    const investmentsResponse = await fetch('http://localhost:5000/api/investments', {
      headers: {
        'Cookie': `connect.sid=${sessionCookie}`
      }
    });
    
    if (!investmentsResponse.ok) {
      throw new Error(`Failed to fetch investments: ${investmentsResponse.status}`);
    }
    
    const investments = await investmentsResponse.json();
    console.log(`Found ${investments.length} investments`);
    
    // Find an investment with documents
    let testInvestment = null;
    for (const investment of investments) {
      const docsResponse = await fetch(`http://localhost:5000/api/documents/investment/${investment.id}`, {
        headers: {
          'Cookie': `connect.sid=${sessionCookie}`
        }
      });
      
      if (docsResponse.ok) {
        const docs = await docsResponse.json();
        if (docs.length > 0) {
          testInvestment = investment;
          console.log(`📄 Found investment ${investment.requestId} with ${docs.length} documents`);
          
          // Check analysis status and content length for each document
          for (const doc of docs) {
            console.log(`\n📄 Document: ${doc.originalName}`);
            console.log(`   Status: ${doc.analysisStatus}`);
            
            if (doc.analysisResult) {
              const analysisResult = JSON.parse(doc.analysisResult);
              const summaryLength = analysisResult.summary?.length || 0;
              const insightsLength = analysisResult.insights?.length || 0;
              
              console.log(`   Summary: ${summaryLength} characters`);
              console.log(`   Insights: ${insightsLength} characters`);
              
              // Check if we have the enhanced comprehensive analysis
              if (summaryLength > 200 && insightsLength > 400) {
                console.log(`   ✅ COMPREHENSIVE ANALYSIS DETECTED`);
                console.log(`   📊 Summary preview: ${analysisResult.summary.substring(0, 100)}...`);
                console.log(`   🔍 Insights preview: ${analysisResult.insights.substring(0, 100)}...`);
              } else {
                console.log(`   ⚠️  Brief analysis (may need reprocessing): Summary=${summaryLength}, Insights=${insightsLength}`);
              }
            } else {
              console.log(`   ❌ No analysis result found`);
            }
          }
          break;
        }
      }
    }
    
    if (!testInvestment) {
      console.log('❌ No investments with documents found for testing');
      return;
    }
    
    console.log('\n🎯 Enhanced Document Analysis Test Summary:');
    console.log('- Updated backgroundJobService.ts with comprehensive 300-400 word summaries');
    console.log('- Updated backgroundJobService.ts with detailed 500-600 word investment insights');
    console.log('- Enhanced getInsightsService.ts with structured analytical prompts');
    console.log('- All new document processing will use enhanced comprehensive analysis');
    console.log('- Existing documents can be reprocessed to get enhanced analysis');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testEnhancedAnalysis();