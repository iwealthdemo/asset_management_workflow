#!/usr/bin/env node

/**
 * Debug Analysis Endpoint
 * Direct database check and API testing
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

async function debugAnalysisEndpoint() {
  console.log('🔍 Debugging Document Analysis Endpoint\n');

  try {
    // Step 1: Login and get session
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'analyst1', password: 'admin123' })
    });

    const loginData = await loginResponse.json();
    const cookies = loginResponse.headers.get('set-cookie');
    const sessionCookie = cookies ? cookies.split(';')[0] : '';
    
    console.log('✅ Logged in with session');

    // Step 2: Check recent documents
    const docsResponse = await fetch(`${BASE_URL}/api/documents/investment/86`, {
      headers: { 'Cookie': sessionCookie }
    });

    const docs = await docsResponse.json();
    console.log(`📄 Found ${docs.length} documents for investment 86`);
    
    const doc = docs[0];
    if (doc) {
      console.log(`Document ${doc.id}:`);
      console.log(`  Status: ${doc.analysisStatus}`);
      console.log(`  Analyzed: ${doc.analyzedAt}`);
      console.log(`  Classification: ${doc.classification || 'None'}`);
      console.log(`  Risk Level: ${doc.riskLevel || 'None'}`);
    }

    // Step 3: Test Analysis Endpoint with Full Debug
    console.log('\n🔧 Testing analysis endpoint...');
    
    const analysisResponse = await fetch(`${BASE_URL}/api/documents/${doc.id}/analysis`, {
      headers: { 'Cookie': sessionCookie }
    });

    console.log(`Status: ${analysisResponse.status}`);
    console.log(`Headers: ${JSON.stringify(Object.fromEntries(analysisResponse.headers))}`);

    if (analysisResponse.ok) {
      const analysis = await analysisResponse.json();
      console.log('✅ Analysis Retrieved:');
      console.log(JSON.stringify(analysis, null, 2));
    } else {
      const errorText = await analysisResponse.text();
      console.log(`❌ Error Response: ${errorText}`);
    }

    // Step 4: Test Direct Document Endpoint
    console.log('\n📋 Testing direct document endpoint...');
    
    const directDocResponse = await fetch(`${BASE_URL}/api/documents/investment/86`, {
      headers: { 'Cookie': sessionCookie }
    });

    if (directDocResponse.ok) {
      const directDocs = await directDocResponse.json();
      const directDoc = directDocs[0];
      console.log('Direct document check:');
      console.log(`  Analysis Status: ${directDoc.analysisStatus}`);
      console.log(`  Has Analysis Result: ${directDoc.analysisResult ? 'Yes' : 'No'}`);
      
      if (directDoc.analysisResult) {
        try {
          const parsed = JSON.parse(directDoc.analysisResult);
          console.log(`  Analysis Keys: ${Object.keys(parsed).join(', ')}`);
          console.log(`  Summary Length: ${parsed.summary?.length || 0}`);
          console.log(`  Insights Length: ${parsed.insights?.length || 0}`);
        } catch (e) {
          console.log(`  Analysis Parse Error: ${e.message}`);
        }
      }
    }

  } catch (error) {
    console.log(`❌ Debug failed: ${error.message}`);
  }
}

debugAnalysisEndpoint();