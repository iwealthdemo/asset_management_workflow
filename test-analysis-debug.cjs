#!/usr/bin/env node

/**
 * Debug Analysis Endpoint - Test analysis data retrieval
 */

const fetch = require('node-fetch');

async function debugAnalysis() {
  console.log('🔍 Debugging Document Analysis Data\n');

  try {
    // Login first
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'analyst1', password: 'admin123' })
    });
    
    const loginData = await loginRes.json();
    const cookies = loginRes.headers.get('set-cookie');
    const sessionCookie = cookies ? cookies.split(';')[0] : '';
    
    console.log('✅ Logged in successfully');
    
    // Get latest document from investment 89
    const docsRes = await fetch('http://localhost:5000/api/documents/investment/89', {
      headers: { 'Cookie': sessionCookie }
    });
    
    const docs = await docsRes.json();
    const doc = docs[0];
    
    console.log(`📄 Document ${doc.id}:`);
    console.log(`   Status: ${doc.analysisStatus}`);
    console.log(`   Has analysisResult: ${!!doc.analysisResult}`);
    console.log(`   AnalysisResult length: ${doc.analysisResult?.length || 0}`);
    
    if (doc.analysisResult) {
      try {
        const parsed = JSON.parse(doc.analysisResult);
        console.log(`   Analysis keys: ${Object.keys(parsed).join(', ')}`);
        console.log(`   Summary length: ${parsed.summary?.length || 0}`);
        console.log(`   Insights length: ${parsed.insights?.length || 0}`);
        console.log(`   Sample summary: ${parsed.summary?.substring(0, 100)}...`);
      } catch (e) {
        console.log(`   ❌ Parse error: ${e.message}`);
        console.log(`   Raw first 200 chars: ${doc.analysisResult.substring(0, 200)}`);
      }
    }
    
    // Test analysis endpoint
    console.log(`\n🔍 Testing analysis endpoint for document ${doc.id}...`);
    
    const analysisRes = await fetch(`http://localhost:5000/api/documents/${doc.id}/analysis`, {
      headers: { 'Cookie': sessionCookie }
    });
    
    console.log(`   Status: ${analysisRes.status}`);
    
    if (analysisRes.ok) {
      const analysis = await analysisRes.json();
      console.log('   ✅ Analysis retrieved successfully');
      console.log(`   Keys: ${Object.keys(analysis).join(', ')}`);
      console.log(`   Summary: ${analysis.summary?.substring(0, 100)}...`);
    } else {
      const errorText = await analysisRes.text();
      console.log(`   ❌ Error: ${errorText}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

debugAnalysis().catch(console.error);