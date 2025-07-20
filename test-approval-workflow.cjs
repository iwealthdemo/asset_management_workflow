#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

class ApprovalWorkflowTester {
  constructor() {
    this.baseUrl = 'http://localhost:5000';
    this.users = {
      analyst: { username: 'analyst1', password: 'admin123', role: 'analyst' },
      manager: { username: 'manager1', password: 'admin123', role: 'manager' },
      committee: { username: 'committee1', password: 'admin123', role: 'committee_member' },
      finance: { username: 'finance1', password: 'admin123', role: 'finance' },
      admin: { username: 'admin', password: 'admin123', role: 'admin' }
    };
    this.cookies = {};
    this.testResults = [];
  }

  async makeRequest(method, url, data = null, cookies = '', isFormData = false) {
    const headers = { 'Cookie': cookies };
    
    if (data && !isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    const options = {
      method,
      headers,
      body: data ? (isFormData ? data : JSON.stringify(data)) : undefined,
    };

    return await fetch(`${this.baseUrl}${url}`, options);
  }

  async login(userType) {
    const user = this.users[userType];
    const response = await this.makeRequest('POST', '/api/auth/login', {
      username: user.username,
      password: user.password
    });

    if (response.ok) {
      const setCookieHeader = response.headers.get('set-cookie');
      this.cookies[userType] = setCookieHeader ? setCookieHeader.split(';')[0] : '';
      console.log(`✅ Logged in as ${userType} (${user.username})`);
      return true;
    }
    
    console.log(`❌ Login failed for ${userType}`);
    return false;
  }

  async createTestInvestment(testName) {
    const response = await this.makeRequest('POST', '/api/investments', {
      targetCompany: `Test Company ${testName}`,
      investmentType: 'equity',
      amount: '1000000',
      expectedReturn: '15',
      riskLevel: 'medium',
      description: `Test investment for ${testName}`
    }, this.cookies.analyst);

    if (response.ok) {
      const result = await response.json();
      console.log(`✅ Created investment ${result.requestId} for ${testName}`);
      return result;
    }
    
    console.log(`❌ Failed to create investment for ${testName}`);
    return null;
  }

  async uploadTestDocument(investmentId, documentName) {
    const testContent = `
TEST DOCUMENT: ${documentName}
=====================================

Investment ID: ${investmentId}
Document Type: Financial Analysis
Created: ${new Date().toISOString()}

Financial Highlights:
- Revenue: $50M annually
- Profit Margin: 12%
- Growth Rate: 25% YoY
- Market Cap: $500M

Risk Assessment:
- Market Risk: Medium
- Regulatory Risk: Low
- Operational Risk: Low

Recommendation: APPROVE
`;

    const testFilePath = path.join(process.cwd(), `test-${documentName}.txt`);
    fs.writeFileSync(testFilePath, testContent);

    const formData = new FormData();
    formData.append('documents', fs.createReadStream(testFilePath));

    // Use direct fetch call for file upload
    const response = await fetch(`${this.baseUrl}/api/documents/investment/${investmentId}`, {
      method: 'POST',
      headers: {
        'Cookie': this.cookies.analyst,
      },
      body: formData,
    });

    // Clean up test file
    fs.unlinkSync(testFilePath);

    if (response.ok) {
      const documents = await response.json();
      console.log(`✅ Uploaded document ${documentName} for investment ${investmentId}`);
      return documents[0];
    }
    
    console.log(`❌ Failed to upload document ${documentName}, status: ${response.status}`);
    return null;
  }

  async submitInvestmentForApproval(investmentId) {
    const response = await this.makeRequest('POST', `/api/investments/${investmentId}/submit`, {}, this.cookies.analyst);

    if (response.ok) {
      console.log(`✅ Submitted investment ${investmentId} for approval`);
      return true;
    }
    
    console.log(`❌ Failed to submit investment ${investmentId}`);
    return false;
  }

  async getTasks(userType) {
    const response = await this.makeRequest('GET', '/api/tasks', null, this.cookies[userType]);

    if (response.ok) {
      const tasks = await response.json();
      return tasks;
    }
    
    return [];
  }

  async approveTask(taskId, userType, comments = 'Approved via test suite') {
    const response = await this.makeRequest('POST', `/api/tasks/${taskId}/approve`, {
      comments,
      decision: 'approve'
    }, this.cookies[userType]);

    if (response.ok) {
      console.log(`✅ Task ${taskId} approved by ${userType}`);
      return true;
    }
    
    console.log(`❌ Failed to approve task ${taskId} by ${userType}`);
    return false;
  }

  async rejectTask(taskId, userType, comments = 'Rejected via test suite') {
    const response = await this.makeRequest('POST', `/api/tasks/${taskId}/reject`, {
      comments,
      decision: 'reject'
    }, this.cookies[userType]);

    if (response.ok) {
      console.log(`✅ Task ${taskId} rejected by ${userType}`);
      return true;
    }
    
    console.log(`❌ Failed to reject task ${taskId} by ${userType}`);
    return false;
  }

  async requestChanges(taskId, userType, comments = 'Changes requested via test suite') {
    const response = await this.makeRequest('POST', `/api/tasks/${taskId}/request-changes`, {
      comments,
      decision: 'changes_requested'
    }, this.cookies[userType]);

    if (response.ok) {
      console.log(`✅ Changes requested for task ${taskId} by ${userType}`);
      return true;
    }
    
    console.log(`❌ Failed to request changes for task ${taskId} by ${userType}`);
    return false;
  }

  async getInvestmentStatus(investmentId) {
    const response = await this.makeRequest('GET', `/api/investments/${investmentId}`, null, this.cookies.admin);

    if (response.ok) {
      const investment = await response.json();
      return investment.status;
    }
    
    return 'unknown';
  }

  async waitForBackgroundJobs(documentId, maxWaitTime = 30000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      const response = await this.makeRequest('GET', `/api/documents/${documentId}/job-status`, null, this.cookies.admin);
      
      if (response.ok) {
        const jobStatus = await response.json();
        if (jobStatus.hasJob && jobStatus.job.status === 'completed') {
          return true;
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    return false;
  }

  // Test Path 1: Complete Approval Workflow (Happy Path)
  async testCompleteApprovalWorkflow() {
    console.log('\n🧪 Testing Complete Approval Workflow (Happy Path)');
    
    try {
      // Create investment
      const investment = await this.createTestInvestment('Complete Approval');
      if (!investment) return false;

      // Upload document
      const document = await this.uploadTestDocument(investment.id, 'complete-approval-doc');
      if (!document) return false;

      // Submit for approval
      const submitted = await this.submitInvestmentForApproval(investment.id);
      if (!submitted) return false;

      // Wait for background job processing
      await this.waitForBackgroundJobs(document.id);

      // Stage 1: Manager approval
      let managerTasks = await this.getTasks('manager');
      const managerTask = managerTasks.find(t => t.requestId === investment.id);
      if (!managerTask) {
        console.log('❌ Manager task not found');
        return false;
      }

      await this.approveTask(managerTask.id, 'manager', 'Approved by manager - good investment');

      // Stage 2: Committee approval
      let committeeTasks = await this.getTasks('committee');
      const committeeTask = committeeTasks.find(t => t.requestId === investment.id);
      if (!committeeTask) {
        console.log('❌ Committee task not found');
        return false;
      }

      await this.approveTask(committeeTask.id, 'committee', 'Approved by committee - strategic fit');

      // Stage 3: Finance approval
      let financeTasks = await this.getTasks('finance');
      const financeTask = financeTasks.find(t => t.requestId === investment.id);
      if (!financeTask) {
        console.log('❌ Finance task not found');
        return false;
      }

      await this.approveTask(financeTask.id, 'finance', 'Approved by finance - budget available');

      // Check final status
      const finalStatus = await this.getInvestmentStatus(investment.id);
      const success = finalStatus === 'approved';
      
      console.log(`Final Status: ${finalStatus}`);
      console.log(success ? '✅ Complete Approval Workflow: PASSED' : '❌ Complete Approval Workflow: FAILED');
      
      return success;

    } catch (error) {
      console.error('❌ Complete Approval Workflow: ERROR', error.message);
      return false;
    }
  }

  // Test Path 2: Manager Rejection
  async testManagerRejection() {
    console.log('\n🧪 Testing Manager Rejection');
    
    try {
      // Create investment
      const investment = await this.createTestInvestment('Manager Rejection');
      if (!investment) return false;

      // Upload document
      const document = await this.uploadTestDocument(investment.id, 'manager-rejection-doc');
      if (!document) return false;

      // Submit for approval
      const submitted = await this.submitInvestmentForApproval(investment.id);
      if (!submitted) return false;

      // Wait for background job processing
      await this.waitForBackgroundJobs(document.id);

      // Stage 1: Manager rejection
      let managerTasks = await this.getTasks('manager');
      const managerTask = managerTasks.find(t => t.requestId === investment.id);
      if (!managerTask) {
        console.log('❌ Manager task not found');
        return false;
      }

      await this.rejectTask(managerTask.id, 'manager', 'Rejected by manager - insufficient ROI');

      // Check final status
      const finalStatus = await this.getInvestmentStatus(investment.id);
      const success = finalStatus === 'rejected';
      
      console.log(`Final Status: ${finalStatus}`);
      console.log(success ? '✅ Manager Rejection: PASSED' : '❌ Manager Rejection: FAILED');
      
      return success;

    } catch (error) {
      console.error('❌ Manager Rejection: ERROR', error.message);
      return false;
    }
  }

  // Test Path 3: Committee Rejection
  async testCommitteeRejection() {
    console.log('\n🧪 Testing Committee Rejection');
    
    try {
      // Create investment
      const investment = await this.createTestInvestment('Committee Rejection');
      if (!investment) return false;

      // Upload document
      const document = await this.uploadTestDocument(investment.id, 'committee-rejection-doc');
      if (!document) return false;

      // Submit for approval
      const submitted = await this.submitInvestmentForApproval(investment.id);
      if (!submitted) return false;

      // Wait for background job processing
      await this.waitForBackgroundJobs(document.id);

      // Stage 1: Manager approval
      let managerTasks = await this.getTasks('manager');
      const managerTask = managerTasks.find(t => t.requestId === investment.id);
      if (!managerTask) {
        console.log('❌ Manager task not found');
        return false;
      }

      await this.approveTask(managerTask.id, 'manager', 'Approved by manager');

      // Stage 2: Committee rejection
      let committeeTasks = await this.getTasks('committee');
      const committeeTask = committeeTasks.find(t => t.requestId === investment.id);
      if (!committeeTask) {
        console.log('❌ Committee task not found');
        return false;
      }

      await this.rejectTask(committeeTask.id, 'committee', 'Rejected by committee - strategic mismatch');

      // Check final status
      const finalStatus = await this.getInvestmentStatus(investment.id);
      const success = finalStatus === 'rejected';
      
      console.log(`Final Status: ${finalStatus}`);
      console.log(success ? '✅ Committee Rejection: PASSED' : '❌ Committee Rejection: FAILED');
      
      return success;

    } catch (error) {
      console.error('❌ Committee Rejection: ERROR', error.message);
      return false;
    }
  }

  // Test Path 4: Finance Rejection
  async testFinanceRejection() {
    console.log('\n🧪 Testing Finance Rejection');
    
    try {
      // Create investment
      const investment = await this.createTestInvestment('Finance Rejection');
      if (!investment) return false;

      // Upload document
      const document = await this.uploadTestDocument(investment.id, 'finance-rejection-doc');
      if (!document) return false;

      // Submit for approval
      const submitted = await this.submitInvestmentForApproval(investment.id);
      if (!submitted) return false;

      // Wait for background job processing
      await this.waitForBackgroundJobs(document.id);

      // Stage 1: Manager approval
      let managerTasks = await this.getTasks('manager');
      const managerTask = managerTasks.find(t => t.requestId === investment.id);
      if (!managerTask) {
        console.log('❌ Manager task not found');
        return false;
      }

      await this.approveTask(managerTask.id, 'manager', 'Approved by manager');

      // Stage 2: Committee approval
      let committeeTasks = await this.getTasks('committee');
      const committeeTask = committeeTasks.find(t => t.requestId === investment.id);
      if (!committeeTask) {
        console.log('❌ Committee task not found');
        return false;
      }

      await this.approveTask(committeeTask.id, 'committee', 'Approved by committee');

      // Stage 3: Finance rejection
      let financeTasks = await this.getTasks('finance');
      const financeTask = financeTasks.find(t => t.requestId === investment.id);
      if (!financeTask) {
        console.log('❌ Finance task not found');
        return false;
      }

      await this.rejectTask(financeTask.id, 'finance', 'Rejected by finance - budget constraints');

      // Check final status
      const finalStatus = await this.getInvestmentStatus(investment.id);
      const success = finalStatus === 'rejected';
      
      console.log(`Final Status: ${finalStatus}`);
      console.log(success ? '✅ Finance Rejection: PASSED' : '❌ Finance Rejection: FAILED');
      
      return success;

    } catch (error) {
      console.error('❌ Finance Rejection: ERROR', error.message);
      return false;
    }
  }

  // Test Path 5: Changes Requested and Resubmission
  async testChangesRequestedWorkflow() {
    console.log('\n🧪 Testing Changes Requested Workflow');
    
    try {
      // Create investment
      const investment = await this.createTestInvestment('Changes Requested');
      if (!investment) return false;

      // Upload document
      const document = await this.uploadTestDocument(investment.id, 'changes-requested-doc');
      if (!document) return false;

      // Submit for approval
      const submitted = await this.submitInvestmentForApproval(investment.id);
      if (!submitted) return false;

      // Wait for background job processing
      await this.waitForBackgroundJobs(document.id);

      // Stage 1: Manager requests changes
      let managerTasks = await this.getTasks('manager');
      const managerTask = managerTasks.find(t => t.requestId === investment.id);
      if (!managerTask) {
        console.log('❌ Manager task not found');
        return false;
      }

      await this.requestChanges(managerTask.id, 'manager', 'Please provide more detailed financial projections');

      // Check status after changes requested
      let currentStatus = await this.getInvestmentStatus(investment.id);
      if (currentStatus !== 'changes_requested') {
        console.log(`❌ Expected status 'changes_requested', got '${currentStatus}'`);
        return false;
      }

      // Analyst modifies the investment
      const modifyResponse = await this.makeRequest('PUT', `/api/investments/${investment.id}`, {
        targetCompany: `Modified Test Company Changes Requested`,
        investmentType: 'equity',
        amount: '1200000',
        expectedReturn: '18',
        riskLevel: 'medium',
        description: 'Updated investment with detailed financial projections'
      }, this.cookies.analyst);

      if (!modifyResponse.ok) {
        console.log('❌ Failed to modify investment');
        return false;
      }

      // Resubmit for approval
      const resubmitted = await this.submitInvestmentForApproval(investment.id);
      if (!resubmitted) return false;

      // Stage 1: Manager approval (second time)
      managerTasks = await this.getTasks('manager');
      const newManagerTask = managerTasks.find(t => t.requestId === investment.id);
      if (!newManagerTask) {
        console.log('❌ New manager task not found after resubmission');
        return false;
      }

      await this.approveTask(newManagerTask.id, 'manager', 'Approved - changes look good');

      // Stage 2: Committee approval
      let committeeTasks = await this.getTasks('committee');
      const committeeTask = committeeTasks.find(t => t.requestId === investment.id);
      if (!committeeTask) {
        console.log('❌ Committee task not found');
        return false;
      }

      await this.approveTask(committeeTask.id, 'committee', 'Approved by committee');

      // Stage 3: Finance approval
      let financeTasks = await this.getTasks('finance');
      const financeTask = financeTasks.find(t => t.requestId === investment.id);
      if (!financeTask) {
        console.log('❌ Finance task not found');
        return false;
      }

      await this.approveTask(financeTask.id, 'finance', 'Approved by finance');

      // Check final status
      const finalStatus = await this.getInvestmentStatus(investment.id);
      const success = finalStatus === 'approved';
      
      console.log(`Final Status: ${finalStatus}`);
      console.log(success ? '✅ Changes Requested Workflow: PASSED' : '❌ Changes Requested Workflow: FAILED');
      
      return success;

    } catch (error) {
      console.error('❌ Changes Requested Workflow: ERROR', error.message);
      return false;
    }
  }

  // Test Path 6: Multiple Rejections at Different Stages
  async testMultipleRejectionsWorkflow() {
    console.log('\n🧪 Testing Multiple Rejections Workflow');
    
    try {
      let allPassed = true;
      
      // Test rejection at each stage
      const stages = [
        { stage: 'manager', description: 'Manager Stage' },
        { stage: 'committee', description: 'Committee Stage' },
        { stage: 'finance', description: 'Finance Stage' }
      ];

      for (const stageInfo of stages) {
        console.log(`\n  Testing rejection at ${stageInfo.description}`);
        
        const investment = await this.createTestInvestment(`Multi-Rejection-${stageInfo.stage}`);
        if (!investment) {
          allPassed = false;
          continue;
        }

        const document = await this.uploadTestDocument(investment.id, `multi-rejection-${stageInfo.stage}-doc`);
        if (!document) {
          allPassed = false;
          continue;
        }

        const submitted = await this.submitInvestmentForApproval(investment.id);
        if (!submitted) {
          allPassed = false;
          continue;
        }

        await this.waitForBackgroundJobs(document.id);

        // Approve through stages until we reach the rejection stage
        const approvalStages = ['manager', 'committee', 'finance'];
        const rejectionStageIndex = approvalStages.indexOf(stageInfo.stage);

        let stageSuccess = true;
        for (let i = 0; i < approvalStages.length; i++) {
          const currentStage = approvalStages[i];
          const tasks = await this.getTasks(currentStage);
          const task = tasks.find(t => t.requestId === investment.id);
          
          if (!task) {
            console.log(`❌ Task not found for ${currentStage}`);
            stageSuccess = false;
            break;
          }

          if (i === rejectionStageIndex) {
            // Reject at this stage
            await this.rejectTask(task.id, currentStage, `Rejected at ${currentStage} stage`);
            break;
          } else {
            // Approve at this stage
            await this.approveTask(task.id, currentStage, `Approved at ${currentStage} stage`);
          }
        }

        if (stageSuccess) {
          const finalStatus = await this.getInvestmentStatus(investment.id);
          if (finalStatus !== 'rejected') {
            console.log(`❌ Expected 'rejected', got '${finalStatus}' for ${stageInfo.description}`);
            allPassed = false;
          } else {
            console.log(`✅ ${stageInfo.description} rejection: PASSED`);
          }
        } else {
          allPassed = false;
        }
      }

      console.log(allPassed ? '✅ Multiple Rejections Workflow: PASSED' : '❌ Multiple Rejections Workflow: FAILED');
      return allPassed;

    } catch (error) {
      console.error('❌ Multiple Rejections Workflow: ERROR', error.message);
      return false;
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Approval Workflow Test Suite\n');
    
    // Login all users
    console.log('🔐 Logging in users...');
    const loginResults = await Promise.all([
      this.login('analyst'),
      this.login('manager'),
      this.login('committee'),
      this.login('finance'),
      this.login('admin')
    ]);

    if (!loginResults.every(result => result)) {
      console.log('❌ Failed to login all users. Aborting tests.');
      return;
    }

    // Run all test paths
    const testResults = [];
    
    testResults.push(await this.testCompleteApprovalWorkflow());
    testResults.push(await this.testManagerRejection());
    testResults.push(await this.testCommitteeRejection());
    testResults.push(await this.testFinanceRejection());
    testResults.push(await this.testChangesRequestedWorkflow());
    testResults.push(await this.testMultipleRejectionsWorkflow());

    // Summary
    console.log('\n📊 Test Results Summary');
    console.log('=========================');
    
    const testNames = [
      'Complete Approval Workflow',
      'Manager Rejection',
      'Committee Rejection',
      'Finance Rejection',
      'Changes Requested Workflow',
      'Multiple Rejections Workflow'
    ];

    testResults.forEach((result, index) => {
      const status = result ? '✅ PASSED' : '❌ FAILED';
      console.log(`${testNames[index]}: ${status}`);
    });

    const passedCount = testResults.filter(r => r).length;
    const totalCount = testResults.length;
    
    console.log(`\n📈 Overall: ${passedCount}/${totalCount} tests passed`);
    
    if (passedCount === totalCount) {
      console.log('🎉 All tests passed! Approval workflow is working correctly.');
    } else {
      console.log('⚠️  Some tests failed. Please review the workflow implementation.');
    }
  }
}

// Run the tests
if (require.main === module) {
  const tester = new ApprovalWorkflowTester();
  tester.runAllTests().catch(console.error);
}

module.exports = ApprovalWorkflowTester;