import http from 'http';

// Test cross-document search functionality
async function testCrossDocumentSearch() {
  console.log('=== TESTING CROSS-DOCUMENT SEARCH ===');
  
  // Step 1: Login
  console.log('1. Logging in...');
  const loginData = JSON.stringify({
    username: 'admin',
    password: 'admin123'
  });

  const loginOptions = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(loginData)
    }
  };

  const sessionCookie = await new Promise((resolve, reject) => {
    const req = http.request(loginOptions, (res) => {
      console.log('Login status:', res.statusCode);
      
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          const setCookieHeader = res.headers['set-cookie'];
          if (setCookieHeader) {
            const sessionCookie = setCookieHeader.find(cookie => cookie.startsWith('connect.sid='));
            if (sessionCookie) {
              resolve(sessionCookie.split(';')[0]);
            } else {
              reject(new Error('No session cookie found'));
            }
          } else {
            reject(new Error('No set-cookie header'));
          }
        } else {
          console.log('Login failed:', body);
          reject(new Error('Login failed'));
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(loginData);
    req.end();
  });

  console.log('Session cookie obtained:', sessionCookie);

  // Step 2: Check recent investments and their documents
  console.log('\n2. Getting recent investments...');
  const investmentsOptions = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/investments',
    method: 'GET',
    headers: {
      'Cookie': sessionCookie
    }
  };

  const investments = await new Promise((resolve, reject) => {
    const req = http.request(investmentsOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(body));
        } else {
          reject(new Error('Failed to get investments'));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });

  console.log('Investments found:', investments.length);
  
  // Check documents for each investment to find one with documents
  let targetInvestmentId = null;
  let documents = [];
  
  for (const investment of investments.slice(0, 3)) {  // Check first 3 investments
    console.log(`\nChecking investment ${investment.id} (${investment.targetCompany})...`);
    
    const documentsOptions = {
      hostname: 'localhost',
      port: 5000,
      path: `/api/documents/investment/${investment.id}`,
      method: 'GET',
    headers: {
      'Cookie': sessionCookie
    }
  };

    const investmentDocs = await new Promise((resolve, reject) => {
      const req = http.request(documentsOptions, (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const docs = JSON.parse(body);
              console.log(`  Documents found: ${docs.length}`);
              if (docs.length > 0) {
                docs.forEach(doc => {
                  console.log(`    - ID: ${doc.id}, Name: ${doc.originalName}, Status: ${doc.analysisStatus}`);
                });
              }
              resolve(docs);
            } catch (err) {
              resolve([]);
            }
          } else {
            resolve([]);
          }
        });
      });
      req.on('error', () => resolve([]));
      req.end();
    });
    
    if (investmentDocs.length > 0) {
      targetInvestmentId = investment.id;
      documents = investmentDocs;
      console.log(`✓ Using investment ${targetInvestmentId} with ${documents.length} documents`);
      break;
    }
  }
  
  if (!targetInvestmentId) {
    console.log('No investments with documents found');
    return;
  }

  // Step 3: Test cross-document query
  if (documents.length > 0) {
    console.log('\n3. Testing cross-document query...');
    
    // Select first 5 documents (or all if less than 5)
    const selectedDocuments = documents.slice(0, 5).map(doc => doc.id);
    console.log('Selected document IDs:', selectedDocuments);
    
    const queryData = JSON.stringify({
      requestType: 'investment_request',
      requestId: targetInvestmentId,
      query: 'Analyze the evolution of Adani Green energy limited\'s (AGEL) financial leverage and capital management strategy over the past five fiscal years (FY20-25), specifically detailing how net debt to run-rate EBITDA ratio, debt cost, and maturity profiles have changed, and identify the key financial initiatives (e.g. bond issuances, refinancing, equity infusions, strategic partnerships) that have contributed to these trends.',
      documentIds: selectedDocuments
    });

    const queryOptions = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/cross-document-queries',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(queryData),
        'Cookie': sessionCookie
      }
    };

    const queryResult = await new Promise((resolve, reject) => {
      const req = http.request(queryOptions, (res) => {
        console.log('Query status:', res.statusCode);
        
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        
        res.on('end', () => {
          console.log('Query response body:', body);
          if (res.statusCode === 200 || res.statusCode === 201) {
            try {
              const result = JSON.parse(body);
              resolve(result);
            } catch (err) {
              console.log('Failed to parse JSON:', err);
              resolve({ error: 'JSON parse error', body });
            }
          } else {
            resolve({ error: 'HTTP error', status: res.statusCode, body });
          }
        });
      });

      req.on('error', (err) => {
        reject(err);
      });

      req.write(queryData);
      req.end();
    });

    console.log('\n=== QUERY RESULT ===');
    console.log(JSON.stringify(queryResult, null, 2));
    
    // Step 4: Check if query was saved
    console.log('\n4. Checking saved queries...');
    const savedQueriesOptions = {
      hostname: 'localhost',
      port: 5000,
      path: `/api/cross-document-queries/${targetInvestmentId}`,
      method: 'GET',
      headers: {
        'Cookie': sessionCookie
      }
    };

    const savedQueries = await new Promise((resolve, reject) => {
      const req = http.request(savedQueriesOptions, (res) => {
        console.log('Saved queries status:', res.statusCode);
        
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const queries = JSON.parse(body);
              resolve(queries);
            } catch (err) {
              reject(err);
            }
          } else {
            console.log('Get saved queries failed:', body);
            resolve([]);
          }
        });
      });

      req.on('error', (err) => {
        reject(err);
      });

      req.end();
    });

    console.log('Saved queries:', savedQueries.length);
    savedQueries.forEach((query, index) => {
      console.log(`Query ${index + 1}:`, {
        id: query.id,
        query: query.query.substring(0, 100) + '...',
        hasResponse: !!query.response,
        responseLength: query.response ? query.response.length : 0
      });
    });
  } else {
    console.log('No documents found for testing');
  }
}

// Run the test
testCrossDocumentSearch().catch(console.error);