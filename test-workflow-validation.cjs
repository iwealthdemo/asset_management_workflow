#!/usr/bin/env node

// Test suite for approval workflow validation
const https = require('https');
const http = require('http');
const url = require('url');

class WorkflowValidator {
  constructor() {
    this.baseUrl = 'http://localhost:5000';
    this.cookies = {};
    this.results = [];
  }

  async makeRequest(method, path, data = null, userCookies = '') {
    return new Promise((resolve, reject) => {
      const parsedUrl = url.parse(this.baseUrl + path);
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 5000,
        path: parsedUrl.path,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Cookie': userCookies
        }
      };

      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          try {
            const jsonBody = body ? JSON.parse(body) : {};
            resolve({
              ok: res.statusCode >= 200 && res.statusCode < 300,
              status: res.statusCode,
              headers: res.headers,
              json: () => Promise.resolve(jsonBody),
              text: () => Promise.resolve(body)
            });
          } catch (e) {
            resolve({
              ok: res.statusCode >= 200 && res.statusCode < 300,
              status: res.statusCode,
              headers: res.headers,
              json: () => Promise.reject(e),
              text: () => Promise.resolve(body)
            });
          }
        });
      });

      req.on('error', reject);
      
      if (data) {
        req.write(JSON.stringify(data));
      }
      
      req.end();
    });
  }

  async login(username, password) {
    const response = await this.makeRequest('POST', '/api/auth/login', {
      username: username,
      password: password
    });

    if (response.ok) {
      const setCookie = response.headers['set-cookie'];
      if (setCookie) {
        this.cookies[username] = setCookie[0].split(';')[0];
      }
      return true;
    }
    return false;
  }

  async validateBasicWorkflow() {
    console.log('🔍 Validating Basic Approval Workflow...\n');
    
    // Step 1: Login users
    const users = [
      { username: 'analyst1', password: 'admin123' },
      { username: 'manager1', password: 'admin123' },
      { username: 'committee1', password: 'admin123' },
      { username: 'finance1', password: 'admin123' },
      { username: 'admin', password: 'admin123' }
    ];

    for (const user of users) {
      const loginSuccess = await this.login(user.username, user.password);
      if (loginSuccess) {
        console.log(`✅ ${user.username} logged in successfully`);
      } else {
        console.log(`❌ ${user.username} login failed`);
        return false;
      }
    }

    // Step 2: Create investment as analyst
    const investmentData = {
      targetCompany: 'Workflow Test Company',
      investmentType: 'equity',
      amount: '1000000',
      expectedReturn: '15',
      riskLevel: 'medium',
      description: 'Test investment for workflow validation'
    };

    const createResponse = await this.makeRequest('POST', '/api/investments', investmentData, this.cookies.analyst1);
    
    if (!createResponse.ok) {
      console.log('❌ Failed to create investment');
      return false;
    }

    const investment = await createResponse.json();
    console.log(`✅ Created investment: ${investment.requestId}`);

    // Step 3: Submit for approval
    const submitResponse = await this.makeRequest('POST', `/api/investments/${investment.id}/submit`, {}, this.cookies.analyst1);
    
    if (!submitResponse.ok) {
      console.log('❌ Failed to submit investment for approval');
      return false;
    }

    console.log('✅ Investment submitted for approval');

    // Step 4: Check manager tasks
    const managerTasksResponse = await this.makeRequest('GET', '/api/tasks', null, this.cookies.manager1);
    
    if (!managerTasksResponse.ok) {
      console.log('❌ Failed to get manager tasks');
      return false;
    }

    const managerTasks = await managerTasksResponse.json();
    const managerTask = managerTasks.find(t => t.requestId === investment.id);
    
    if (!managerTask) {
      console.log('❌ Manager task not found');
      return false;
    }

    console.log(`✅ Manager task created: ${managerTask.id}`);

    // Step 5: Manager approval
    const approvalResponse = await this.makeRequest('POST', `/api/approvals`, {
      requestType: managerTask.requestType,
      requestId: managerTask.requestId,
      action: 'approve',
      comments: 'Approved by manager - test validation'
    }, this.cookies.manager1);

    if (!approvalResponse.ok) {
      console.log('❌ Manager approval failed');
      return false;
    }

    console.log('✅ Manager approved successfully');

    // Step 6: Check committee tasks (wait a moment for workflow to progress)
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const committeeTasksResponse = await this.makeRequest('GET', '/api/tasks', null, this.cookies.committee1);
    
    if (!committeeTasksResponse.ok) {
      console.log('❌ Failed to get committee tasks');
      return false;
    }

    const committeeTasks = await committeeTasksResponse.json();
    const committeeTask = committeeTasks.find(t => t.requestId === investment.id);
    
    if (!committeeTask) {
      console.log('❌ Committee task not found');
      console.log('Committee tasks found:', committeeTasks);
      return false;
    }

    console.log(`✅ Committee task created: ${committeeTask.id}`);

    // Step 7: Committee approval
    const committeeApprovalResponse = await this.makeRequest('POST', `/api/approvals`, {
      requestType: committeeTask.requestType,
      requestId: committeeTask.requestId,
      action: 'approve',
      comments: 'Approved by committee - test validation'
    }, this.cookies.committee1);

    if (!committeeApprovalResponse.ok) {
      console.log('❌ Committee approval failed');
      return false;
    }

    console.log('✅ Committee approved successfully');

    // Step 8: Check finance tasks (wait a moment for workflow to progress)
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const financeTasksResponse = await this.makeRequest('GET', '/api/tasks', null, this.cookies.finance1);
    
    if (!financeTasksResponse.ok) {
      console.log('❌ Failed to get finance tasks');
      return false;
    }

    const financeTasks = await financeTasksResponse.json();
    const financeTask = financeTasks.find(t => t.requestId === investment.id);
    
    if (!financeTask) {
      console.log('❌ Finance task not found');
      console.log('Finance tasks found:', financeTasks);
      return false;
    }

    console.log(`✅ Finance task created: ${financeTask.id}`);

    // Step 9: Finance approval
    const financeApprovalResponse = await this.makeRequest('POST', `/api/approvals`, {
      requestType: financeTask.requestType,
      requestId: financeTask.requestId,
      action: 'approve',
      comments: 'Approved by finance - test validation'
    }, this.cookies.finance1);

    if (!financeApprovalResponse.ok) {
      console.log('❌ Finance approval failed');
      return false;
    }

    console.log('✅ Finance approved successfully');

    // Step 10: Check final status
    const finalStatusResponse = await this.makeRequest('GET', `/api/investments/${investment.id}`, null, this.cookies.admin);
    
    if (!finalStatusResponse.ok) {
      console.log('❌ Failed to get final status');
      return false;
    }

    const finalInvestment = await finalStatusResponse.json();
    const finalStatus = finalInvestment.status;

    if (finalStatus === 'approved') {
      console.log('✅ Investment fully approved - workflow complete');
      return true;
    } else {
      console.log(`❌ Expected 'approved', got '${finalStatus}'`);
      return false;
    }
  }

  async validateRejectionWorkflow() {
    console.log('\n🔍 Validating Rejection Workflow...\n');
    
    // Create investment
    const investmentData = {
      targetCompany: 'Rejection Test Company',
      investmentType: 'equity',
      amount: '500000',
      expectedReturn: '10',
      riskLevel: 'high',
      description: 'Test investment for rejection validation'
    };

    const createResponse = await this.makeRequest('POST', '/api/investments', investmentData, this.cookies.analyst1);
    
    if (!createResponse.ok) {
      console.log('❌ Failed to create investment for rejection test');
      return false;
    }

    const investment = await createResponse.json();
    console.log(`✅ Created investment for rejection: ${investment.requestId}`);

    // Submit for approval
    const submitResponse = await this.makeRequest('POST', `/api/investments/${investment.id}/submit`, {}, this.cookies.analyst1);
    
    if (!submitResponse.ok) {
      console.log('❌ Failed to submit investment for approval');
      return false;
    }

    console.log('✅ Investment submitted for approval');

    // Get manager task
    const managerTasksResponse = await this.makeRequest('GET', '/api/tasks', null, this.cookies.manager1);
    const managerTasks = await managerTasksResponse.json();
    const managerTask = managerTasks.find(t => t.requestId === investment.id);
    
    if (!managerTask) {
      console.log('❌ Manager task not found');
      return false;
    }

    // Manager rejection
    const rejectionResponse = await this.makeRequest('POST', `/api/approvals`, {
      requestType: managerTask.requestType,
      requestId: managerTask.requestId,
      action: 'reject',
      comments: 'Rejected by manager - test validation'
    }, this.cookies.manager1);

    if (!rejectionResponse.ok) {
      console.log('❌ Manager rejection failed');
      return false;
    }

    console.log('✅ Manager rejected successfully');

    // Check final status (wait a moment for status to update)
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const finalStatusResponse = await this.makeRequest('GET', `/api/investments/${investment.id}`, null, this.cookies.admin);
    const finalInvestment = await finalStatusResponse.json();
    const finalStatus = finalInvestment.status;

    if (finalStatus === 'rejected' || finalStatus.includes('rejected')) {
      console.log('✅ Investment rejected - rejection workflow complete');
      return true;
    } else {
      console.log(`❌ Expected 'rejected' or status containing 'rejected', got '${finalStatus}'`);
      console.log('Final investment object:', finalInvestment);
      return false;
    }
  }

  async validateChangesRequestedWorkflow() {
    console.log('\n🔍 Validating Changes Requested Workflow...\n');
    
    // Create investment
    const investmentData = {
      targetCompany: 'Changes Requested Test Company',
      investmentType: 'equity',
      amount: '750000',
      expectedReturn: '12',
      riskLevel: 'medium',
      description: 'Test investment for changes requested validation'
    };

    const createResponse = await this.makeRequest('POST', '/api/investments', investmentData, this.cookies.analyst1);
    
    if (!createResponse.ok) {
      console.log('❌ Failed to create investment for changes requested test');
      return false;
    }

    const investment = await createResponse.json();
    console.log(`✅ Created investment for changes requested: ${investment.requestId}`);

    // Submit for approval
    const submitResponse = await this.makeRequest('POST', `/api/investments/${investment.id}/submit`, {}, this.cookies.analyst1);
    
    if (!submitResponse.ok) {
      console.log('❌ Failed to submit investment for approval');
      return false;
    }

    console.log('✅ Investment submitted for approval');

    // Get manager task
    const managerTasksResponse = await this.makeRequest('GET', '/api/tasks', null, this.cookies.manager1);
    const managerTasks = await managerTasksResponse.json();
    const managerTask = managerTasks.find(t => t.requestId === investment.id);
    
    if (!managerTask) {
      console.log('❌ Manager task not found');
      return false;
    }

    // Manager requests changes
    const changesResponse = await this.makeRequest('POST', `/api/approvals`, {
      requestType: managerTask.requestType,
      requestId: managerTask.requestId,
      action: 'changes_requested',
      comments: 'Please provide more financial details - test validation'
    }, this.cookies.manager1);

    if (!changesResponse.ok) {
      console.log('❌ Manager changes request failed');
      return false;
    }

    console.log('✅ Manager requested changes successfully');

    // Check investment status should be "changes_requested"
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const statusResponse = await this.makeRequest('GET', `/api/investments/${investment.id}`, null, this.cookies.admin);
    const investmentStatus = await statusResponse.json();
    
    if (investmentStatus.status !== 'changes_requested') {
      console.log(`❌ Expected 'changes_requested', got '${investmentStatus.status}'`);
      return false;
    }

    console.log('✅ Investment status correctly set to changes_requested');

    // Now analyst should be able to modify and resubmit
    const modifyResponse = await this.makeRequest('PUT', `/api/investments/${investment.id}`, {
      targetCompany: 'Changes Requested Test Company - Updated',
      investmentType: 'equity',
      amount: '750000',
      expectedReturn: '15', // Updated expected return
      riskLevel: 'medium',
      description: 'Updated test investment with more financial details per manager request'
    }, this.cookies.analyst1);

    if (!modifyResponse.ok) {
      console.log('❌ Failed to modify investment after changes requested');
      return false;
    }

    console.log('✅ Investment modified successfully');

    // Resubmit for approval
    const resubmitResponse = await this.makeRequest('POST', `/api/investments/${investment.id}/submit`, {}, this.cookies.analyst1);
    
    if (!resubmitResponse.ok) {
      console.log('❌ Failed to resubmit investment after changes');
      return false;
    }

    console.log('✅ Investment resubmitted for approval');

    // Verify new manager task is created
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const newManagerTasksResponse = await this.makeRequest('GET', '/api/tasks', null, this.cookies.manager1);
    const newManagerTasks = await newManagerTasksResponse.json();
    const newManagerTask = newManagerTasks.find(t => t.requestId === investment.id && t.status === 'pending');
    
    if (!newManagerTask) {
      console.log('❌ New manager task not found after resubmission');
      return false;
    }

    console.log('✅ New manager task created after resubmission');

    // Manager approves the updated request
    const finalApprovalResponse = await this.makeRequest('POST', `/api/approvals`, {
      requestType: newManagerTask.requestType,
      requestId: newManagerTask.requestId,
      action: 'approve',
      comments: 'Approved - changes look good'
    }, this.cookies.manager1);

    if (!finalApprovalResponse.ok) {
      console.log('❌ Manager final approval failed');
      return false;
    }

    console.log('✅ Manager approved the updated request');

    // Check final status should show progression
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const finalStatusResponse = await this.makeRequest('GET', `/api/investments/${investment.id}`, null, this.cookies.admin);
    const finalInvestment = await finalStatusResponse.json();
    const finalStatus = finalInvestment.status;

    if (finalStatus === 'Manager approved') {
      console.log('✅ Changes requested workflow completed successfully');
      return true;
    } else {
      console.log(`❌ Expected 'Manager approved' after changes workflow, got '${finalStatus}'`);
      return false;
    }
  }

  async run() {
    console.log('🚀 Starting Approval Workflow Validation\n');
    
    const approvalResult = await this.validateBasicWorkflow();
    const rejectionResult = await this.validateRejectionWorkflow();
    const changesResult = await this.validateChangesRequestedWorkflow();

    console.log('\n📊 Validation Results:');
    console.log('========================');
    console.log(`Complete Approval Workflow: ${approvalResult ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Rejection Workflow: ${rejectionResult ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Changes Requested Workflow: ${changesResult ? '✅ PASSED' : '❌ FAILED'}`);
    
    const totalPassed = (approvalResult ? 1 : 0) + (rejectionResult ? 1 : 0) + (changesResult ? 1 : 0);
    console.log(`\n📈 Overall: ${totalPassed}/3 workflows validated`);

    if (totalPassed === 3) {
      console.log('🎉 All workflows validated successfully!');
    } else {
      console.log('⚠️  Some workflows failed validation.');
    }
  }
}

// Run validation
const validator = new WorkflowValidator();
validator.run().catch(console.error);