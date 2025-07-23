import axios from 'axios';

const BASE_URL = 'https://5000-01janvg0yq3d6fks7j4vp5rmkx.id.replit.dev';

// Test notification system with Committee approval followed by Finance rejection
async function testNotificationSystem() {
  console.log('=== Testing Notification System ===\n');
  
  try {
    // Step 1: Login as Admin to create investment
    console.log('1. Logging in as Admin...');
    const adminLogin = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'admin',
      password: 'admin123',
    }, { withCredentials: true });
    
    const adminCookies = adminLogin.headers['set-cookie'];
    console.log('✓ Admin logged in successfully');

    // Step 2: Create new investment request
    console.log('\n2. Creating investment request...');
    const investmentData = {
      targetCompany: 'TestCorp Notification Co',
      amount: '2500000',
      investmentType: 'equity',
      expectedReturn: '15',
      riskLevel: 'medium',
      description: 'Test investment for notification system validation - Committee will approve, Finance will reject',
      status: 'new'
    };

    const createResponse = await axios.post(`${BASE_URL}/api/investment-requests`, investmentData, {
      headers: { Cookie: adminCookies?.join('; ') },
      withCredentials: true
    });
    
    const investmentId = createResponse.data.id;
    console.log(`✓ Investment created with ID: ${investmentId}`);

    // Step 3: Admin approves
    console.log('\n3. Admin approving investment...');
    await axios.post(`${BASE_URL}/api/approvals`, {
      requestType: 'investment',
      requestId: investmentId,
      action: 'approved',
      comments: 'Admin approval - moving to manager stage'
    }, {
      headers: { Cookie: adminCookies?.join('; ') },
      withCredentials: true
    });
    console.log('✓ Admin approved investment');

    // Step 4: Login as Manager
    console.log('\n4. Logging in as Manager...');
    const managerLogin = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'manager',
      password: 'admin123',
    }, { withCredentials: true });
    
    const managerCookies = managerLogin.headers['set-cookie'];
    console.log('✓ Manager logged in successfully');

    // Step 5: Manager approves
    console.log('\n5. Manager approving investment...');
    await axios.post(`${BASE_URL}/api/approvals`, {
      requestType: 'investment',
      requestId: investmentId,
      action: 'approved',
      comments: 'Manager approval - moving to committee stage'
    }, {
      headers: { Cookie: managerCookies?.join('; ') },
      withCredentials: true
    });
    console.log('✓ Manager approved investment');

    // Step 6: Login as Committee Member
    console.log('\n6. Logging in as Committee Member...');
    const committeeLogin = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'committee1',
      password: 'admin123',
    }, { withCredentials: true });
    
    const committeeCookies = committeeLogin.headers['set-cookie'];
    console.log('✓ Committee member logged in successfully');

    // Step 7: Committee approves
    console.log('\n7. Committee approving investment...');
    await axios.post(`${BASE_URL}/api/approvals`, {
      requestType: 'investment',
      requestId: investmentId,
      action: 'approved',
      comments: 'Committee approval - investment looks good, moving to finance stage'
    }, {
      headers: { Cookie: committeeCookies?.join('; ') },
      withCredentials: true
    });
    console.log('✓ Committee approved investment');

    // Step 8: Login as Finance
    console.log('\n8. Logging in as Finance...');
    const financeLogin = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'finance',
      password: 'admin123',
    }, { withCredentials: true });
    
    const financeCookies = financeLogin.headers['set-cookie'];
    console.log('✓ Finance user logged in successfully');

    // Step 9: Finance REJECTS - This should trigger notifications
    console.log('\n9. Finance REJECTING investment (This should trigger notifications)...');
    await axios.post(`${BASE_URL}/api/approvals`, {
      requestType: 'investment',
      requestId: investmentId,
      action: 'rejected',
      comments: 'Finance rejection - budget constraints prevent this investment. Notifying all previous approvers of this decision.'
    }, {
      headers: { Cookie: financeCookies?.join('; ') },
      withCredentials: true
    });
    console.log('✓ Finance REJECTED investment - Notifications should be sent!');

    // Step 10: Check notifications for previous approvers
    console.log('\n10. Checking notifications for previous approvers...');
    
    // Check Admin notifications
    const adminNotifications = await axios.get(`${BASE_URL}/api/notifications`, {
      headers: { Cookie: adminCookies?.join('; ') },
      withCredentials: true  
    });
    console.log(`Admin notifications: ${adminNotifications.data.length}`);
    if (adminNotifications.data.length > 0) {
      console.log('Admin notification sample:', {
        title: adminNotifications.data[0].title,
        message: adminNotifications.data[0].message,
        higherStageAction: adminNotifications.data[0].higherStageAction,
        higherStageRole: adminNotifications.data[0].higherStageRole,
        investmentSummary: adminNotifications.data[0].investmentSummary
      });
    }

    // Check Manager notifications  
    const managerNotifications = await axios.get(`${BASE_URL}/api/notifications`, {
      headers: { Cookie: managerCookies?.join('; ') },
      withCredentials: true
    });
    console.log(`Manager notifications: ${managerNotifications.data.length}`);
    if (managerNotifications.data.length > 0) {
      console.log('Manager notification sample:', {
        title: managerNotifications.data[0].title,
        message: managerNotifications.data[0].message,
        higherStageAction: managerNotifications.data[0].higherStageAction,
        higherStageRole: managerNotifications.data[0].higherStageRole,
        investmentSummary: managerNotifications.data[0].investmentSummary
      });
    }

    // Check Committee notifications
    const committeeNotifications = await axios.get(`${BASE_URL}/api/notifications`, {
      headers: { Cookie: committeeCookies?.join('; ') },
      withCredentials: true
    });
    console.log(`Committee notifications: ${committeeNotifications.data.length}`);
    if (committeeNotifications.data.length > 0) {
      console.log('Committee notification sample:', {
        title: committeeNotifications.data[0].title,
        message: committeeNotifications.data[0].message,
        higherStageAction: committeeNotifications.data[0].higherStageAction,
        higherStageRole: committeeNotifications.data[0].higherStageRole,
        investmentSummary: committeeNotifications.data[0].investmentSummary
      });
    }

    console.log('\n=== Notification System Test Complete ===');
    console.log('✓ Created investment proposal');
    console.log('✓ Admin, Manager, and Committee approved');
    console.log('✓ Finance rejected (triggering notifications)');
    console.log('✓ Checked notification delivery to all previous approvers');
    
  } catch (error) {
    console.error('Test failed:', error.response?.data || error.message);
  }
}

testNotificationSystem();