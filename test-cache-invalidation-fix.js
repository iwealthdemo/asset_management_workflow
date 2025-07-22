// Simple test to verify cache invalidation works correctly
// This test will verify that when a draft is edited and submitted, 
// approvers see the updated information

async function testCacheInvalidation() {
  console.log('=== Testing Cache Invalidation Fix ===\n');
  
  try {
    // Test plan:
    // 1. Create a draft investment
    // 2. Edit the draft (add description)
    // 3. Submit for approval
    // 4. Login as manager and verify the updated description is visible
    
    const baseUrl = 'http://localhost:5173';
    
    // 1. Login as analyst
    console.log('1. Logging in as analyst...');
    let response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'analyst', password: 'admin123' }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to login as analyst');
    }
    
    const analystLogin = await response.json();
    const analystCookies = response.headers.get('set-cookie');
    console.log(`✓ Analyst logged in: ${analystLogin.user.username}\n`);
    
    // 2. Create a draft investment
    console.log('2. Creating draft investment...');
    response = await fetch(`${baseUrl}/api/investments`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': analystCookies 
      },
      body: JSON.stringify({
        requestId: "TEST-CACHE-001",
        targetCompany: "Cache Test Company",
        investmentType: "equity",
        amount: 1000000,
        currency: "USD",
        expectedReturn: 15.0,
        riskLevel: "medium",
        region: "North America",
        sector: "Technology",
        description: "Initial description before edit",
        status: "draft"
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create investment');
    }
    
    const investment = await response.json();
    console.log(`✓ Draft investment created: ${investment.requestId} (ID: ${investment.id})\n`);
    
    // 3. Edit the draft (update description)
    console.log('3. Editing draft investment...');
    response = await fetch(`${baseUrl}/api/investments/${investment.id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': analystCookies 
      },
      body: JSON.stringify({
        targetCompany: "Cache Test Company",
        investmentType: "equity",
        amount: "1000000",
        expectedReturn: "15.0",
        riskLevel: "medium",
        description: "UPDATED DESCRIPTION - This text was added during edit and should be visible to approvers"
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to edit investment');
    }
    
    console.log('✓ Draft investment edited with new description\n');
    
    // 4. Submit the draft for approval
    console.log('4. Submitting draft for approval...');
    response = await fetch(`${baseUrl}/api/investments/${investment.id}/submit`, {
      method: 'POST',
      headers: { 'Cookie': analystCookies },
    });
    
    if (!response.ok) {
      throw new Error('Failed to submit draft');
    }
    
    console.log('✓ Draft submitted for approval\n');
    
    // Wait for workflow to create tasks
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 5. Login as manager
    console.log('5. Logging in as manager...');
    response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'manager', password: 'admin123' }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to login as manager');
    }
    
    const managerLogin = await response.json();
    const managerCookies = response.headers.get('set-cookie');
    console.log(`✓ Manager logged in: ${managerLogin.user.username}\n`);
    
    // 6. Get investment details as manager (what approver sees)
    console.log('6. Fetching investment details as manager...');
    response = await fetch(`${baseUrl}/api/investments/${investment.id}`, {
      headers: { 'Cookie': managerCookies },
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch investment as manager');
    }
    
    const managerViewInvestment = await response.json();
    console.log('Investment details from manager view:');
    console.log(`  Request ID: ${managerViewInvestment.requestId}`);
    console.log(`  Target Company: ${managerViewInvestment.targetCompany}`);
    console.log(`  Status: ${managerViewInvestment.status}`);
    console.log(`  Description: ${managerViewInvestment.description}`);
    
    // 7. Verify the fix worked
    console.log('\n7. Verifying cache invalidation fix...');
    const expectedDescription = "UPDATED DESCRIPTION - This text was added during edit and should be visible to approvers";
    
    if (managerViewInvestment.description === expectedDescription) {
      console.log('✅ SUCCESS: Manager sees the updated description!');
      console.log('✅ Cache invalidation fix is working correctly');
    } else {
      console.log('❌ FAILURE: Manager sees old description');
      console.log(`   Expected: ${expectedDescription}`);
      console.log(`   Actual: ${managerViewInvestment.description}`);
      console.log('❌ Cache invalidation fix needs more work');
    }
    
    console.log('\n=== Test Complete ===');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

testCacheInvalidation();