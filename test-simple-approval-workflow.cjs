#!/usr/bin/env node

// Use built-in fetch for Node.js 18+
const fetch = globalThis.fetch || require('node-fetch');

class SimpleApprovalWorkflowTester {
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
  }

  async makeRequest(method, url, data = null, cookies = '') {
    const headers = { 'Cookie': cookies };
    
    if (data) {
      headers['Content-Type'] = 'application/json';
    }

    const options = {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
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
    
    const errorText = await response.text();
    console.log(`❌ Failed to approve task ${taskId} by ${userType}: ${errorText}`);
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
    
    const errorText = await response.text();
    console.log(`❌ Failed to reject task ${taskId} by ${userType}: ${errorText}`);
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

  // Test Path 1: Complete Approval Workflow (Happy Path)
  async testCompleteApprovalWorkflow() {
    console.log('\n🧪 Testing Complete Approval Workflow (Happy Path)');
    
    try {
      // Create investment
      const investment = await this.createTestInvestment('Complete Approval');
      if (!investment) return false;

      // Submit for approval (without documents for now)
      const submitted = await this.submitInvestmentForApproval(investment.id);
      if (!submitted) return false;

      // Stage 1: Manager approval
      let managerTasks = await this.getTasks('manager');
      const managerTask = managerTasks.find(t => t.requestId === investment.id);
      if (!managerTask) {
        console.log('❌ Manager task not found');
        return false;
      }

      const managerApproved = await this.approveTask(managerTask.id, 'manager', 'Approved by manager - good investment');
      if (!managerApproved) return false;

      // Stage 2: Committee approval
      let committeeTasks = await this.getTasks('committee');
      const committeeTask = committeeTasks.find(t => t.requestId === investment.id);
      if (!committeeTask) {
        console.log('❌ Committee task not found');
        return false;
      }

      const committeeApproved = await this.approveTask(committeeTask.id, 'committee', 'Approved by committee - strategic fit');
      if (!committeeApproved) return false;

      // Stage 3: Finance approval
      let financeTasks = await this.getTasks('finance');
      const financeTask = financeTasks.find(t => t.requestId === investment.id);
      if (!financeTask) {
        console.log('❌ Finance task not found');
        return false;
      }

      const financeApproved = await this.approveTask(financeTask.id, 'finance', 'Approved by finance - budget available');
      if (!financeApproved) return false;

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

      // Submit for approval
      const submitted = await this.submitInvestmentForApproval(investment.id);
      if (!submitted) return false;

      // Stage 1: Manager rejection
      let managerTasks = await this.getTasks('manager');
      const managerTask = managerTasks.find(t => t.requestId === investment.id);
      if (!managerTask) {
        console.log('❌ Manager task not found');
        return false;
      }

      const managerRejected = await this.rejectTask(managerTask.id, 'manager', 'Rejected by manager - insufficient ROI');
      if (!managerRejected) return false;

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

  async runSimpleTests() {
    console.log('🚀 Starting Simple Approval Workflow Test Suite\n');
    
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

    // Run basic tests
    const testResults = [];
    
    testResults.push(await this.testCompleteApprovalWorkflow());
    testResults.push(await this.testManagerRejection());

    // Summary
    console.log('\n📊 Test Results Summary');
    console.log('=========================');
    
    const testNames = [
      'Complete Approval Workflow',
      'Manager Rejection'
    ];

    testResults.forEach((result, index) => {
      const status = result ? '✅ PASSED' : '❌ FAILED';
      console.log(`${testNames[index]}: ${status}`);
    });

    const passedCount = testResults.filter(r => r).length;
    const totalCount = testResults.length;
    
    console.log(`\n📈 Overall: ${passedCount}/${totalCount} tests passed`);
    
    if (passedCount === totalCount) {
      console.log('🎉 All tests passed! Basic approval workflow is working correctly.');
    } else {
      console.log('⚠️  Some tests failed. Please review the workflow implementation.');
    }
  }
}

// Run the tests
if (require.main === module) {
  const tester = new SimpleApprovalWorkflowTester();
  tester.runSimpleTests().catch(console.error);
}

module.exports = SimpleApprovalWorkflowTester;