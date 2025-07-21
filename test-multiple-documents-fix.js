// Test multiple documents with correct setup
import fetch from 'node-fetch';

async function testMultipleDocuments() {
  try {
    // Login
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    
    const cookies = loginResponse.headers.get('set-cookie');
    console.log('Login successful\n');
    
    // Ensure document 68 is in the same request as document 67
    await fetch('http://localhost:5000/api/documents/68/assign-to-request', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify({ requestId: 90 })
    });
    
    console.log('Testing multiple documents (IDs 67, 68)...');
    console.log('Expected payload structure:');
    console.log('{\n  "filters": {\n    "type": "or",\n    "filters": [');
    console.log('      {"type": "eq", "key": "original_filename", "value": "RZx3lEIKHpiF6nay-6gak-HDFC Bank_Annual Report_2019-20.pdf"},');
    console.log('      {"type": "eq", "key": "original_filename", "value": "QwRKM363xsSQWv8YvLXR4-Reliance_Annual-Report_2019-20.pdf"}');
    console.log('    ]\n  }\n}');
    
    const response = await fetch('http://localhost:5000/api/cross-document-queries', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify({
        requestId: 90,
        query: 'What are the names of both companies mentioned in these annual reports?',
        documentIds: [67, 68]
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('\n✅ SUCCESS - Multiple document filtering working!');
      console.log('Document count processed:', result.documentCount);
      console.log('Response:', result.answer);
    } else {
      const error = await response.json();
      console.log('\n❌ Error:', error);
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testMultipleDocuments();