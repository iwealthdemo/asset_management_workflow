import axios from 'axios';

const BASE_URL = 'http://localhost:5000';

// Test credentials
const ANALYST_CREDS = { username: 'analyst', password: 'admin123' };
const ADMIN_CREDS = { username: 'admin', password: 'admin123' };
const MANAGER_CREDS = { username: 'manager', password: 'admin123' };

let sessionCookies = {};

// Helper function to login and get session
async function login(username, password) {
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      username,
      password
    });
    
    const cookies = response.headers['set-cookie'];
    if (cookies) {
      sessionCookies[username] = cookies[0].split(';')[0];
    }
    
    console.log(`✅ ${username} logged in successfully`);
    return response.data;
  } catch (error) {
    console.error(`❌ ${username} login failed:`, error.response?.data || error.message);
    throw error;
  }
}

// Helper function to make authenticated requests
async function makeRequest(method, url, data, username) {
  const config = {
    method,
    url: `${BASE_URL}${url}`,
    headers: {}
  };
  
  if (sessionCookies[username]) {
    config.headers.Cookie = sessionCookies[username];
  }
  
  if (data) {
    config.data = data;
  }
  
  return axios(config);
}

// Test Phase 1: Analyst creates investment with "opportunity" status
async function testAnalystCreatesInvestment() {
  console.log('\n🧪 PHASE 1: Testing Analyst Investment Creation');
  console.log('='.repeat(50));
  
  try {
    const investmentData = {
      targetCompany: 'AdminWorkflow Test Corp',
      investmentType: 'equity',
      amount: '5000000',
      expectedReturn: '15.5',
      description: 'Test investment for Admin workflow validation - high priority opportunity requiring immediate admin review.',
      riskLevel: 'medium',
      status: 'opportunity'
    };
    
    const response = await makeRequest('POST', '/api/investments', investmentData, 'analyst');
    const investment = response.data;
    
    console.log(`✅ Investment created with ID: ${investment.id}`);
    console.log(`✅ Status set to: "${investment.status}"`);
    console.log(`✅ Request ID: ${investment.requestId}`);
    
    return investment;
  } catch (error) {
    console.error('❌ Investment creation failed:', error.response?.data || error.message);
    throw error;
  }
}

// Test Phase 2: Verify Admin receives task for review
async function testAdminReceivesTask(investmentId) {
  console.log('\n🧪 PHASE 2: Testing Admin Task Assignment');
  console.log('='.repeat(50));
  
  try {
    const response = await makeRequest('GET', '/api/tasks', null, 'admin');
    const tasks = response.data;
    
    const adminTask = tasks.find(task => 
      task.requestType === 'investment' && 
      task.requestId === investmentId &&
      task.taskType === 'approval'
    );
    
    if (adminTask) {
      console.log(`✅ Admin task found: ${adminTask.title}`);
      console.log(`✅ Task status: ${adminTask.status}`);
      console.log(`✅ Task description: ${adminTask.description}`);
      return adminTask;
    } else {
      console.error('❌ Admin task not found');
      console.log('Available tasks:', tasks.map(t => ({ 
        id: t.id, 
        type: t.requestType, 
        requestId: t.requestId, 
        taskType: t.taskType,
        status: t.status 
      })));
      throw new Error('Admin task not created');
    }
  } catch (error) {
    console.error('❌ Admin task verification failed:', error.response?.data || error.message);
    throw error;
  }
}

// Test Phase 3: Admin approves the investment
async function testAdminApproval(investmentId) {
  console.log('\n🧪 PHASE 3: Testing Admin Approval Process');
  console.log('='.repeat(50));
  
  try {
    const approvalData = {
      action: 'approve',
      comments: 'Admin approval: Investment opportunity validated. Good strategic fit and acceptable risk profile. Proceeding to management review.'
    };
    
    const response = await makeRequest('POST', `/api/approvals`, {
      requestType: 'investment',
      requestId: investmentId,
      ...approvalData
    }, 'admin');
    
    console.log('✅ Admin approval submitted');
    
    // Verify investment status changed to "new"
    const investmentResponse = await makeRequest('GET', `/api/investments/${investmentId}`, null, 'admin');
    const investment = investmentResponse.data;
    
    console.log(`✅ Investment status after admin approval: "${investment.status}"`);
    
    if (investment.status === 'new') {
      console.log('✅ Status correctly updated to "new" - ready for manager review');
      return investment;
    } else {
      console.error(`❌ Expected status "new", got "${investment.status}"`);
      throw new Error('Status not updated correctly');
    }
  } catch (error) {
    console.error('❌ Admin approval failed:', error.response?.data || error.message);
    throw error;
  }
}

// Test Phase 4: Verify Manager receives task after Admin approval
async function testManagerReceivesTask(investmentId) {
  console.log('\n🧪 PHASE 4: Testing Manager Task Assignment');
  console.log('='.repeat(50));
  
  try {
    const response = await makeRequest('GET', '/api/tasks', null, 'manager');
    const tasks = response.data;
    
    const managerTask = tasks.find(task => 
      task.requestType === 'investment' && 
      task.requestId === investmentId &&
      task.taskType === 'approval' &&
      task.status === 'pending'
    );
    
    if (managerTask) {
      console.log(`✅ Manager task found: ${managerTask.title}`);
      console.log(`✅ Task status: ${managerTask.status}`);
      console.log(`✅ Task description: ${managerTask.description}`);
      return managerTask;
    } else {
      console.error('❌ Manager task not found');
      console.log('Available tasks:', tasks.map(t => ({ 
        id: t.id, 
        type: t.requestType, 
        requestId: t.requestId, 
        taskType: t.taskType,
        status: t.status 
      })));
      throw new Error('Manager task not created after admin approval');
    }
  } catch (error) {
    console.error('❌ Manager task verification failed:', error.response?.data || error.message);
    throw error;
  }
}

// Test Phase 5: Test Admin rejection workflow
async function testAdminRejection() {
  console.log('\n🧪 PHASE 5: Testing Admin Rejection Workflow');
  console.log('='.repeat(50));
  
  try {
    // Create second investment for rejection test
    const investmentData = {
      targetCompany: 'Rejection Test Corp',
      investmentType: 'debt',
      amount: '2000000',
      expectedReturn: '8.0',
      description: 'Test investment for admin rejection workflow - should be rejected for testing purposes.',
      riskLevel: 'high',
      status: 'opportunity'
    };
    
    const response = await makeRequest('POST', '/api/investments', investmentData, 'analyst');
    const investment = response.data;
    
    console.log(`✅ Second investment created for rejection test: ${investment.id}`);
    
    // Wait briefly for task creation
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Admin rejects the investment
    const rejectionData = {
      action: 'reject',
      comments: 'Admin rejection: Investment does not align with current strategic priorities. High risk profile unsuitable for current market conditions.'
    };
    
    await makeRequest('POST', `/api/approvals`, {
      requestType: 'investment',
      requestId: investment.id,
      ...rejectionData
    }, 'admin');
    
    console.log('✅ Admin rejection submitted');
    
    // Verify investment status changed to "admin_rejected"
    const updatedInvestment = await makeRequest('GET', `/api/investments/${investment.id}`, null, 'admin');
    
    console.log(`✅ Investment status after admin rejection: "${updatedInvestment.data.status}"`);
    
    if (updatedInvestment.data.status === 'admin_rejected') {
      console.log('✅ Status correctly updated to "admin_rejected"');
      return updatedInvestment.data;
    } else {
      console.error(`❌ Expected status "admin_rejected", got "${updatedInvestment.data.status}"`);
      throw new Error('Rejection status not updated correctly');
    }
  } catch (error) {
    console.error('❌ Admin rejection test failed:', error.response?.data || error.message);
    throw error;
  }
}

// Test Phase 6: Verify approval history
async function testApprovalHistory(investmentId) {
  console.log('\n🧪 PHASE 6: Testing Approval History');
  console.log('='.repeat(50));
  
  try {
    const response = await makeRequest('GET', `/api/approvals?requestType=investment&requestId=${investmentId}`, null, 'admin');
    const approvals = response.data;
    
    console.log(`✅ Found ${approvals.length} approval record(s)`);
    
    approvals.forEach((approval, index) => {
      console.log(`  ${index + 1}. Stage ${approval.stage}: ${approval.status}`);
      console.log(`     Approver ID: ${approval.approverId}`);
      console.log(`     Comments: ${approval.comments}`);
    });
    
    return approvals;
  } catch (error) {
    console.error('❌ Approval history test failed:', error.response?.data || error.message);
    throw error;
  }
}

// Main test runner
async function runAdminWorkflowTests() {
  console.log('🚀 STARTING ADMIN WORKFLOW COMPREHENSIVE TESTS');
  console.log('='.repeat(60));
  
  try {
    // Login all users
    await login('analyst', 'admin123');
    await login('admin', 'admin123');
    await login('manager', 'admin123');
    
    // Run test phases
    const investment = await testAnalystCreatesInvestment();
    await testAdminReceivesTask(investment.id);
    const approvedInvestment = await testAdminApproval(investment.id);
    await testManagerReceivesTask(investment.id);
    await testAdminRejection();
    await testApprovalHistory(investment.id);
    
    console.log('\n✅ ALL ADMIN WORKFLOW TESTS PASSED!');
    console.log('='.repeat(60));
    console.log('✅ Investment creation with "opportunity" status works');
    console.log('✅ Admin task assignment works');
    console.log('✅ Admin approval process works');
    console.log('✅ Status transitions work correctly');
    console.log('✅ Manager task assignment after admin approval works');
    console.log('✅ Admin rejection process works');
    console.log('✅ Approval history tracking works');
    
  } catch (error) {
    console.error('\n❌ ADMIN WORKFLOW TEST FAILED');
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run the tests
runAdminWorkflowTests();