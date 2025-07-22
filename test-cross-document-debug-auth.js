import fetch from 'node-fetch';

async function testCrossDocumentSearchWithAuth() {
  console.log('=== TESTING CROSS-DOCUMENT SEARCH WITH AUTH ===');
  
  let sessionCookie = '';
  
  try {
    // 1. Login first
    console.log('1. Logging in...');
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });
    
    console.log('Login status:', loginResponse.status);
    
    if (loginResponse.status === 200) {
      // Extract session cookie
      const setCookieHeader = loginResponse.headers.get('set-cookie');
      if (setCookieHeader) {
        sessionCookie = setCookieHeader.split(';')[0];
        console.log('Session cookie obtained:', sessionCookie);
      }
    } else {
      console.log('Login failed');
      return;
    }

    // 2. Test cross-document query with proper authentication
    console.log('\n2. Testing cross-document query with auth...');
    const queryResponse = await fetch('http://localhost:5000/api/cross-document-queries', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      },
      body: JSON.stringify({
        requestType: 'investment',
        requestId: 93,
        documentIds: [103, 102, 101],
        query: 'What are the key financial highlights from these documents?'
      })
    });

    console.log('Query status:', queryResponse.status);
    
    if (queryResponse.status === 200) {
      const result = await queryResponse.json();
      console.log('\n=== SUCCESS ===');
      console.log('Answer length:', result.answer?.length);
      console.log('Document count:', result.documentCount);
      console.log('First 200 chars:', result.answer?.substring(0, 200) + '...');
    } else {
      const errorText = await queryResponse.text();
      console.log('\n=== ERROR ===');
      console.log('Error response:', errorText);
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testCrossDocumentSearchWithAuth();