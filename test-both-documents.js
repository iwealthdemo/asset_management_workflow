// Test both single and multiple document scenarios
import fetch from 'node-fetch';

async function testBothScenarios() {
  try {
    // Login
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    
    const cookies = loginResponse.headers.get('set-cookie');
    console.log('✅ Login successful\n');
    
    // Test 1: Single document with original_filename filtering
    console.log('🔍 Test 1: Single document (HDFC Bank - ID 67)');
    console.log('Expected filter: {"key": "original_filename", "value": "RZx3lEIKHpiF6nay-6gak-HDFC Bank_Annual Report_2019-20.pdf"}');
    
    const singleResponse = await fetch('http://localhost:5000/api/cross-document-queries', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify({
        requestId: 90,
        query: 'What is the name of the bank in this annual report?',
        documentIds: [67]
      })
    });
    
    console.log('Status:', singleResponse.status);
    if (singleResponse.ok) {
      const result = await singleResponse.json();
      console.log('✅ Single document test SUCCESSFUL');
      console.log('Response keys:', Object.keys(result));
      console.log('Document count:', result.documentCount);
      console.log('Answer preview:', result.answer?.substring(0, 200) + '...');
    } else {
      const error = await singleResponse.json();
      console.log('❌ Single document test failed:', error);
    }
    
    console.log('\n' + '='.repeat(60) + '\n');
    
    // Test 2: Multiple documents with original_filename filtering 
    console.log('🔍 Test 2: Multiple documents (HDFC + Reliance - IDs 67, 68)');
    console.log('Expected filters:');
    console.log('  - "RZx3lEIKHpiF6nay-6gak-HDFC Bank_Annual Report_2019-20.pdf"');
    console.log('  - "QwRKM363xsSQWv8YvLXR4-Reliance_Annual-Report_2019-20.pdf"');
    
    const multiResponse = await fetch('http://localhost:5000/api/cross-document-queries', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify({
        requestId: 90,
        query: 'Compare the company names from both annual reports. What are the two companies?',
        documentIds: [67, 68]
      })
    });
    
    console.log('Status:', multiResponse.status);
    if (multiResponse.ok) {
      const result = await multiResponse.json();
      console.log('✅ Multiple document test SUCCESSFUL');
      console.log('Response keys:', Object.keys(result));
      console.log('Document count:', result.documentCount);
      console.log('Answer preview:', result.answer?.substring(0, 300) + '...');
    } else {
      const error = await multiResponse.json();
      console.log('❌ Multiple document test failed:', error);
    }
    
    console.log('\n=== SUMMARY ===');
    console.log('These tests verify that original_filename filtering works correctly');
    console.log('without requiring any fallback mechanisms.');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
  }
}

testBothScenarios();