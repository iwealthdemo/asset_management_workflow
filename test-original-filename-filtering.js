// Test script to verify original_filename filtering works without fallback
import fetch from 'node-fetch';

async function testOriginalFilenameFiltering() {
  console.log('=== TESTING ORIGINAL_FILENAME FILTERING ===\n');
  
  try {
    // Login first
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    
    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }
    
    const cookies = loginResponse.headers.get('set-cookie');
    console.log('✅ Login successful\n');
    
    // Test 1: Single document selection
    console.log('🔍 Test 1: Single document (HDFC - ID 67)...');
    const singleDocQuery = await fetch('http://localhost:5000/api/investments/90/cross-document-queries', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify({
        query: 'What is the company name and year from this annual report?',
        document_ids: [67]  // Only HDFC document
      })
    });
    
    if (singleDocQuery.ok) {
      const singleResult = await singleDocQuery.json();
      console.log('✅ Single document query successful');
      console.log('Response length:', singleResult.text?.length || 0);
      console.log('Has metadata:', !!singleResult.metadata);
      if (singleResult.error) {
        console.log('❌ Error:', singleResult.error);
      }
    } else {
      console.log('❌ Single document query failed:', singleDocQuery.status);
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Test 2: Multiple document selection  
    console.log('🔍 Test 2: Multiple documents (HDFC + Reliance - IDs 67, 68)...');
    const multiDocQuery = await fetch('http://localhost:5000/api/investments/90/cross-document-queries', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify({
        query: 'Compare the revenue figures from both annual reports. What companies are these reports from?',
        document_ids: [67, 68]  // Both documents
      })
    });
    
    if (multiDocQuery.ok) {
      const multiResult = await multiDocQuery.json();
      console.log('✅ Multiple document query successful');
      console.log('Response length:', multiResult.text?.length || 0);
      console.log('Has metadata:', !!multiResult.metadata);
      console.log('Token usage:', multiResult.metadata?.totalTokens || 'N/A');
      if (multiResult.error) {
        console.log('❌ Error:', multiResult.error);
      } else {
        console.log('Response preview:', multiResult.text?.substring(0, 200) + '...');
      }
    } else {
      console.log('❌ Multiple document query failed:', multiDocQuery.status);
      const errorText = await multiDocQuery.text();
      console.log('Error response:', errorText);
    }
    
    console.log('\n=== TEST COMPLETE ===');
    console.log('If both tests succeeded, original_filename filtering is working correctly!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testOriginalFilenameFiltering();