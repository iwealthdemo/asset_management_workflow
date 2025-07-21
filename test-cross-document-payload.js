// Test script to demonstrate the exact payload sent to OpenAI API for cross-document search
import fetch from 'node-fetch';

async function testCrossDocumentPayload() {
  console.log('=== TESTING CROSS-DOCUMENT SEARCH PAYLOAD ===\n');
  
  // Login first
  const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  });
  
  const cookies = loginResponse.headers.get('set-cookie');
  
  // Test cross-document query with both documents selected
  console.log('Sending cross-document query with both documents (67, 68) selected...\n');
  
  const queryResponse = await fetch('http://localhost:5000/api/investments/90/cross-document-queries', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Cookie': cookies
    },
    body: JSON.stringify({
      query: 'What are the revenue figures from both annual reports?',
      document_ids: [67, 68]  // Both HDFC and Reliance documents
    })
  });
  
  const result = await queryResponse.json();
  console.log('API Response:', result);
}

testCrossDocumentPayload().catch(console.error);