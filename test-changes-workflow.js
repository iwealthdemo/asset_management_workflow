import axios from 'axios';

const BASE_URL = 'http://localhost:5173';

async function login(username, password) {
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      username,
      password
    });
    return response.data.user;
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
    throw error;
  }
}

async function createInvestmentRequest(user) {
  try {
    const response = await axios.post(`${BASE_URL}/api/investments`, {
      requestId: "TEST-CHG-001",
      targetCompany: "Test Changes Company",
      investmentType: "Equity",
      amount: 1000000,
      currency: "USD",
      expectedReturn: 15.5,
      riskLevel: "Medium",
      region: "North America",
      sector: "Technology",
      description: "Test investment for changes workflow",
      status: "new"
    });
    console.log('✓ Investment request created:', response.data.requestId);
    return response.data;
  } catch (error) {
    console.error('✗ Failed to create investment:', error.response?.data || error.message);
    throw error;
  }
}

async function getTasks(user) {
  try {
    const response = await axios.get(`${BASE_URL}/api/tasks`);
    return response.data;
  } catch (error) {
    console.error('Failed to get tasks:', error.response?.data || error.message);
    return [];
  }
}

async function processApproval(taskId, action, comments) {
  try {
    const response = await axios.post(`${BASE_URL}/api/approvals`, {
      taskId,
      action,
      comments
    });
    console.log(`✓ Approval processed: ${action}`);
    return response.data;
  } catch (error) {
    console.error(`✗ Failed to process approval:`, error.response?.data || error.message);
    throw error;
  }
}

async function submitDraft(investmentId) {
  try {
    const response = await axios.post(`${BASE_URL}/api/investments/${investmentId}/submit`);
    console.log('✓ Draft submitted for approval');
    return response.data;
  } catch (error) {
    console.error('✗ Failed to submit draft:', error.response?.data || error.message);
    throw error;
  }
}

async function testChangesWorkflow() {
  console.log('=== Testing Changes Requested Workflow ===\n');

  try {
    // 1. Login as analyst
    console.log('1. Logging in as analyst...');
    const analyst = await login('analyst', 'admin123');
    console.log(`   Analyst logged in: ${analyst.username} (${analyst.role})\n`);

    // 2. Create investment request
    console.log('2. Creating investment request...');
    const investment = await createInvestmentRequest(analyst);
    console.log(`   Investment ID: ${investment.id}\n`);

    // 3. Wait for approval task to be created
    console.log('3. Waiting for approval tasks...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 4. Login as manager
    console.log('4. Logging in as manager...');
    const manager = await login('manager', 'admin123');
    console.log(`   Manager logged in: ${manager.username} (${manager.role})\n`);

    // 5. Get manager tasks
    console.log('5. Getting manager tasks...');
    const managerTasks = await getTasks(manager);
    const approvalTask = managerTasks.find(task => 
      task.requestId === investment.id && 
      task.taskType === 'approval' && 
      task.status === 'pending'
    );
    
    if (!approvalTask) {
      console.error('✗ No approval task found for manager');
      return;
    }
    console.log(`   Found approval task: ${approvalTask.id}\n`);

    // 6. Request changes
    console.log('6. Manager requesting changes...');
    await processApproval(approvalTask.id, 'changes_requested', 'Please add more financial details to the proposal');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 7. Login back as analyst
    console.log('7. Logging back in as analyst...');
    await login('analyst', 'admin123');

    // 8. Check analyst tasks for changes_requested task
    console.log('8. Checking analyst tasks for changes requested...');
    const analystTasks = await getTasks(analyst);
    const changesTask = analystTasks.find(task => 
      task.requestId === investment.id && 
      task.taskType === 'changes_requested' && 
      task.status === 'pending'
    );
    
    if (changesTask) {
      console.log(`✓ Changes requested task found: ${changesTask.id}`);
      console.log(`   Task title: ${changesTask.title}`);
      console.log(`   Task description: ${changesTask.description}\n`);
    } else {
      console.error('✗ No changes requested task found for analyst');
      return;
    }

    // 9. Resubmit the proposal
    console.log('9. Analyst resubmitting proposal...');
    await submitDraft(investment.id);
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 10. Check if changes_requested task is completed
    console.log('10. Checking if changes requested task is completed...');
    const updatedAnalystTasks = await getTasks(analyst);
    const completedChangesTask = updatedAnalystTasks.find(task => 
      task.requestId === investment.id && 
      task.taskType === 'changes_requested'
    );
    
    if (completedChangesTask) {
      console.log(`✓ Changes task status: ${completedChangesTask.status}`);
      if (completedChangesTask.status === 'completed') {
        console.log('✓ Changes requested task automatically completed upon resubmission');
      } else {
        console.log('✗ Changes requested task not completed');
      }
    }

    console.log('\n=== Changes Workflow Test Complete ===');

  } catch (error) {
    console.error('\n=== Test Failed ===');
    console.error('Error:', error.message);
  }
}

// Run the test
testChangesWorkflow();