// Test to compare how proposals appear for initiators vs approvers
async function testProposalViewDifferences() {
  const baseUrl = 'http://localhost:5000';
  
  // Get proposal INV-2025-987149 (ID 76)
  const proposalId = 76;
  
  console.log('\n=== Testing Proposal View Differences ===');
  console.log(`Testing proposal ID: ${proposalId} (INV-2025-987149)`);
  
  // Test as analyst (initiator) - login as analyst1
  console.log('\n--- Testing as Analyst (Initiator) ---');
  let response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'analyst1', password: 'admin123' }),
  });
  
  if (!response.ok) {
    console.log('Failed to login as analyst1');
    return;
  }
  
  const analystLoginData = await response.json();
  const analystCookies = response.headers.get('set-cookie');
  console.log(`Logged in as: ${analystLoginData.user.firstName} ${analystLoginData.user.lastName} (${analystLoginData.user.role})`);
  
  // Get investment details as analyst
  response = await fetch(`${baseUrl}/api/investments/${proposalId}`, {
    headers: { 'Cookie': analystCookies },
  });
  
  if (response.ok) {
    const analystView = await response.json();
    console.log('Analyst view - Investment data:');
    console.log(`  Status: ${analystView.status}`);
    console.log(`  Current Approval Stage: ${analystView.currentApprovalStage}`);
    console.log(`  Can Edit: ${analystView.status === 'draft' || analystView.status === 'changes_requested'}`);
    
    // Get approval history as analyst
    const approvalResponse = await fetch(`${baseUrl}/api/approvals/investment/${proposalId}`, {
      headers: { 'Cookie': analystCookies },
    });
    if (approvalResponse.ok) {
      const analystApprovals = await approvalResponse.json();
      console.log(`  Approval History Count: ${analystApprovals.length}`);
      console.log(`  Approvals: ${JSON.stringify(analystApprovals.map(a => ({ stage: a.approvalStage, status: a.status, approver: a.approverName })))}`);
    }
  } else {
    console.log(`Failed to get investment details as analyst: ${response.status}`);
  }
  
  // Test as manager (approver) - login as manager1
  console.log('\n--- Testing as Manager (Approver) ---');
  response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'manager1', password: 'admin123' }),
  });
  
  if (!response.ok) {
    console.log('Failed to login as manager1');
    return;
  }
  
  const managerLoginData = await response.json();
  const managerCookies = response.headers.get('set-cookie');
  console.log(`Logged in as: ${managerLoginData.user.firstName} ${managerLoginData.user.lastName} (${managerLoginData.user.role})`);
  
  // Get investment details as manager
  response = await fetch(`${baseUrl}/api/investments/${proposalId}`, {
    headers: { 'Cookie': managerCookies },
  });
  
  if (response.ok) {
    const managerView = await response.json();
    console.log('Manager view - Investment data:');
    console.log(`  Status: ${managerView.status}`);
    console.log(`  Current Approval Stage: ${managerView.currentApprovalStage}`);
    console.log(`  Can Edit: ${managerView.status === 'draft' || managerView.status === 'changes_requested'}`);
    
    // Get approval history as manager
    const approvalResponse = await fetch(`${baseUrl}/api/approvals/investment/${proposalId}`, {
      headers: { 'Cookie': managerCookies },
    });
    if (approvalResponse.ok) {
      const managerApprovals = await approvalResponse.json();
      console.log(`  Approval History Count: ${managerApprovals.length}`);
      console.log(`  Approvals: ${JSON.stringify(managerApprovals.map(a => ({ stage: a.approvalStage, status: a.status, approver: a.approverName })))}`);
    }
    
    // Get tasks for manager (this is what shows in My Tasks)
    const tasksResponse = await fetch(`${baseUrl}/api/tasks`, {
      headers: { 'Cookie': managerCookies },
    });
    if (tasksResponse.ok) {
      const managerTasks = await tasksResponse.json();
      const relevantTask = managerTasks.find(t => t.relatedEntityId === proposalId);
      if (relevantTask) {
        console.log('Manager task view:');
        console.log(`  Task Type: ${relevantTask.taskType}`);
        console.log(`  Task Status: ${relevantTask.status}`);
        console.log(`  Task Description: ${relevantTask.description}`);
        console.log(`  Related Entity: ${relevantTask.relatedEntityType} ${relevantTask.relatedEntityId}`);
      } else {
        console.log('No task found for this proposal in manager\'s task list');
      }
    }
  } else {
    console.log(`Failed to get investment details as manager: ${response.status}`);
  }
  
  // Compare document access
  console.log('\n--- Testing Document Access ---');
  response = await fetch(`${baseUrl}/api/documents/investment/${proposalId}`, {
    headers: { 'Cookie': analystCookies },
  });
  
  if (response.ok) {
    const analystDocs = await response.json();
    console.log(`Analyst can see ${analystDocs.length} documents`);
  }
  
  response = await fetch(`${baseUrl}/api/documents/investment/${proposalId}`, {
    headers: { 'Cookie': managerCookies },
  });
  
  if (response.ok) {
    const managerDocs = await response.json();
    console.log(`Manager can see ${managerDocs.length} documents`);
  }
  
  console.log('\n=== Analysis Complete ===');
}

testProposalViewDifferences().catch(console.error);