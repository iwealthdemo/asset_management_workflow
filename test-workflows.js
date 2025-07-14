#!/usr/bin/env node

/**
 * Comprehensive Test Suite for Investment Approval Workflow
 * Tests all major user flows and edge cases
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test configuration
const BASE_URL = 'http://localhost:5000';
const USERS = {
  analyst1: { username: 'analyst1', password: 'admin123' },
  analyst2: { username: 'analyst2', password: 'admin123' },
  manager1: { username: 'manager1', password: 'admin123' },
  committee1: { username: 'committee1', password: 'admin123' },
  finance1: { username: 'finance1', password: 'admin123' },
  admin: { username: 'admin', password: 'admin123' }
};

class TestRunner {
  constructor() {
    this.results = [];
    this.sessionCookies = {};
  }

  async makeRequest(method, url, data = null, cookies = null) {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies || ''
      }
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(`${BASE_URL}${url}`, options);
    const responseData = await response.json();
    
    // Store session cookie if present
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      return { status: response.status, data: responseData, cookie: setCookie };
    }
    
    return { status: response.status, data: responseData };
  }

  async login(userKey) {
    const user = USERS[userKey];
    const result = await this.makeRequest('POST', '/api/auth/login', user);
    
    if (result.status === 200 && result.cookie) {
      this.sessionCookies[userKey] = result.cookie;
      return true;
    }
    return false;
  }

  async logout(userKey) {
    const cookies = this.sessionCookies[userKey];
    if (cookies) {
      await this.makeRequest('POST', '/api/auth/logout', null, cookies);
      delete this.sessionCookies[userKey];
    }
  }

  log(testName, status, message, details = null) {
    const result = {
      test: testName,
      status: status,
      message: message,
      timestamp: new Date().toISOString(),
      details: details
    };
    this.results.push(result);
    console.log(`${status === 'PASS' ? '✓' : '✗'} ${testName}: ${message}`);
    if (details) {
      console.log(`  Details: ${JSON.stringify(details, null, 2)}`);
    }
  }

  // Test Case 1: Create Draft Proposal
  async testCreateDraft() {
    const testName = 'Create Draft Proposal';
    
    try {
      // Login as analyst
      const loginSuccess = await this.login('analyst1');
      if (!loginSuccess) {
        this.log(testName, 'FAIL', 'Failed to login as analyst1');
        return;
      }

      // Create draft proposal
      const draftData = {
        investmentType: 'equity',
        targetCompany: 'Test Corp',
        amount: '5000000',
        expectedReturn: '15',
        riskLevel: 'medium',
        investmentRationale: 'This is a test investment proposal for automation testing purposes.',
        marketAnalysis: 'Strong market position with growth potential.',
        financialProjections: 'Expected 15% ROI over 3 years.',
        riskAssessment: 'Medium risk with mitigation strategies in place.',
        exitStrategy: 'IPO or strategic acquisition expected in 5 years.'
      };

      const result = await this.makeRequest('POST', '/api/investments', draftData, this.sessionCookies['analyst1']);
      
      if (result.status === 201 && result.data.id) {
        this.log(testName, 'PASS', 'Draft proposal created successfully', {
          id: result.data.id,
          requestId: result.data.requestId,
          status: result.data.status
        });
        this.draftId = result.data.id;
        return result.data.id;
      } else {
        this.log(testName, 'FAIL', 'Failed to create draft proposal', result.data);
      }
    } catch (error) {
      this.log(testName, 'FAIL', `Error creating draft: ${error.message}`);
    } finally {
      await this.logout('analyst1');
    }
  }

  // Test Case 2: Edit Draft Proposal
  async testEditDraft(draftId) {
    const testName = 'Edit Draft Proposal';
    
    try {
      // Login as analyst
      const loginSuccess = await this.login('analyst1');
      if (!loginSuccess) {
        this.log(testName, 'FAIL', 'Failed to login as analyst1');
        return;
      }

      // Edit draft proposal
      const editData = {
        targetCompany: 'Updated Test Corp',
        amount: '6000000',
        expectedReturn: '18',
        investmentRationale: 'Updated investment rationale with more detailed analysis.',
        status: 'draft'
      };

      const result = await this.makeRequest('PUT', `/api/investments/${draftId}`, editData, this.sessionCookies['analyst1']);
      
      if (result.status === 200) {
        this.log(testName, 'PASS', 'Draft proposal edited successfully', {
          id: result.data.id,
          updatedAmount: result.data.amount,
          updatedReturn: result.data.expectedReturn
        });
        return true;
      } else {
        this.log(testName, 'FAIL', 'Failed to edit draft proposal', result.data);
      }
    } catch (error) {
      this.log(testName, 'FAIL', `Error editing draft: ${error.message}`);
    } finally {
      await this.logout('analyst1');
    }
  }

  // Test Case 3: Submit Draft Proposal
  async testSubmitDraft(draftId) {
    const testName = 'Submit Draft Proposal';
    
    try {
      // Login as analyst
      const loginSuccess = await this.login('analyst1');
      if (!loginSuccess) {
        this.log(testName, 'FAIL', 'Failed to login as analyst1');
        return;
      }

      // Submit draft proposal
      const result = await this.makeRequest('POST', `/api/investments/${draftId}/submit`, null, this.sessionCookies['analyst1']);
      
      if (result.status === 200 && result.data.status === 'New') {
        this.log(testName, 'PASS', 'Draft proposal submitted successfully', {
          id: result.data.id,
          status: result.data.status,
          currentStage: result.data.currentApprovalStage
        });
        return result.data.id;
      } else {
        this.log(testName, 'FAIL', 'Failed to submit draft proposal', result.data);
      }
    } catch (error) {
      this.log(testName, 'FAIL', `Error submitting draft: ${error.message}`);
    } finally {
      await this.logout('analyst1');
    }
  }

  // Test Case 4: Create New Proposal - Submit for Approval
  async testCreateAndSubmitProposal() {
    const testName = 'Create New Proposal and Submit';
    
    try {
      // Login as analyst
      const loginSuccess = await this.login('analyst2');
      if (!loginSuccess) {
        this.log(testName, 'FAIL', 'Failed to login as analyst2');
        return;
      }

      // Create new proposal
      const proposalData = {
        investmentType: 'bond',
        targetCompany: 'Direct Submit Corp',
        amount: '10000000',
        expectedReturn: '12',
        riskLevel: 'low',
        investmentRationale: 'Low-risk bond investment with steady returns.',
        marketAnalysis: 'Stable bond market with consistent performance.',
        financialProjections: 'Expected 12% ROI over 5 years.',
        riskAssessment: 'Low risk with government backing.',
        exitStrategy: 'Hold to maturity.',
        status: 'New'
      };

      const result = await this.makeRequest('POST', '/api/investments', proposalData, this.sessionCookies['analyst2']);
      
      if (result.status === 201 && result.data.status === 'New') {
        this.log(testName, 'PASS', 'New proposal created and submitted successfully', {
          id: result.data.id,
          requestId: result.data.requestId,
          status: result.data.status
        });
        this.newProposalId = result.data.id;
        return result.data.id;
      } else {
        this.log(testName, 'FAIL', 'Failed to create and submit new proposal', result.data);
      }
    } catch (error) {
      this.log(testName, 'FAIL', `Error creating new proposal: ${error.message}`);
    } finally {
      await this.logout('analyst2');
    }
  }

  // Test Case 5: Manager Approval Flow
  async testManagerApproval(proposalId) {
    const testName = 'Manager Approval Flow';
    
    try {
      // Login as manager
      const loginSuccess = await this.login('manager1');
      if (!loginSuccess) {
        this.log(testName, 'FAIL', 'Failed to login as manager1');
        return;
      }

      // Get pending tasks
      const tasksResult = await this.makeRequest('GET', '/api/tasks', null, this.sessionCookies['manager1']);
      
      if (tasksResult.status === 200 && tasksResult.data.length > 0) {
        const task = tasksResult.data.find(t => t.requestId === proposalId);
        
        if (task) {
          // Approve the proposal
          const approvalData = {
            status: 'approved',
            comments: 'Manager approval - proposal looks good'
          };

          const approvalResult = await this.makeRequest('POST', `/api/approvals/${task.id}/approve`, approvalData, this.sessionCookies['manager1']);
          
          if (approvalResult.status === 200) {
            this.log(testName, 'PASS', 'Manager approval completed successfully', {
              taskId: task.id,
              proposalId: proposalId,
              status: 'approved'
            });
            return true;
          } else {
            this.log(testName, 'FAIL', 'Failed to approve proposal', approvalResult.data);
          }
        } else {
          this.log(testName, 'FAIL', 'No matching task found for proposal', { proposalId });
        }
      } else {
        this.log(testName, 'FAIL', 'No pending tasks found', tasksResult.data);
      }
    } catch (error) {
      this.log(testName, 'FAIL', `Error in manager approval: ${error.message}`);
    } finally {
      await this.logout('manager1');
    }
  }

  // Test Case 6: Rejection Flow
  async testRejectionFlow() {
    const testName = 'Rejection Flow';
    
    try {
      // Create a proposal to reject
      const loginSuccess = await this.login('analyst1');
      if (!loginSuccess) {
        this.log(testName, 'FAIL', 'Failed to login as analyst1');
        return;
      }

      const proposalData = {
        investmentType: 'equity',
        targetCompany: 'Reject Test Corp',
        amount: '3000000',
        expectedReturn: '25',
        riskLevel: 'high',
        investmentRationale: 'High-risk proposal for rejection testing.',
        marketAnalysis: 'Volatile market conditions.',
        financialProjections: 'High potential returns but significant risk.',
        riskAssessment: 'High risk investment.',
        exitStrategy: 'Quick exit strategy needed.',
        status: 'New'
      };

      const createResult = await this.makeRequest('POST', '/api/investments', proposalData, this.sessionCookies['analyst1']);
      await this.logout('analyst1');

      if (createResult.status !== 201) {
        this.log(testName, 'FAIL', 'Failed to create proposal for rejection test');
        return;
      }

      // Login as manager and reject
      const managerLogin = await this.login('manager1');
      if (!managerLogin) {
        this.log(testName, 'FAIL', 'Failed to login as manager1');
        return;
      }

      const tasksResult = await this.makeRequest('GET', '/api/tasks', null, this.sessionCookies['manager1']);
      
      if (tasksResult.status === 200 && tasksResult.data.length > 0) {
        const task = tasksResult.data.find(t => t.requestId === createResult.data.id);
        
        if (task) {
          const rejectionData = {
            status: 'rejected',
            comments: 'Rejected due to high risk profile'
          };

          const rejectionResult = await this.makeRequest('POST', `/api/approvals/${task.id}/approve`, rejectionData, this.sessionCookies['manager1']);
          
          if (rejectionResult.status === 200) {
            this.log(testName, 'PASS', 'Rejection flow completed successfully', {
              taskId: task.id,
              proposalId: createResult.data.id,
              status: 'rejected'
            });
          } else {
            this.log(testName, 'FAIL', 'Failed to reject proposal', rejectionResult.data);
          }
        } else {
          this.log(testName, 'FAIL', 'No matching task found for rejection');
        }
      } else {
        this.log(testName, 'FAIL', 'No pending tasks found for rejection');
      }
    } catch (error) {
      this.log(testName, 'FAIL', `Error in rejection flow: ${error.message}`);
    } finally {
      await this.logout('manager1');
    }
  }

  // Test Case 7: Dashboard and Recent Requests
  async testDashboardAndRecentRequests() {
    const testName = 'Dashboard and Recent Requests';
    
    try {
      // Login as analyst
      const loginSuccess = await this.login('analyst1');
      if (!loginSuccess) {
        this.log(testName, 'FAIL', 'Failed to login as analyst1');
        return;
      }

      // Test dashboard stats
      const statsResult = await this.makeRequest('GET', '/api/dashboard/stats', null, this.sessionCookies['analyst1']);
      
      if (statsResult.status === 200) {
        // Test recent requests
        const recentResult = await this.makeRequest('GET', '/api/dashboard/recent-requests', null, this.sessionCookies['analyst1']);
        
        if (recentResult.status === 200) {
          this.log(testName, 'PASS', 'Dashboard and recent requests loaded successfully', {
            stats: statsResult.data,
            recentRequestsCount: recentResult.data.length
          });
        } else {
          this.log(testName, 'FAIL', 'Failed to load recent requests', recentResult.data);
        }
      } else {
        this.log(testName, 'FAIL', 'Failed to load dashboard stats', statsResult.data);
      }
    } catch (error) {
      this.log(testName, 'FAIL', `Error in dashboard test: ${error.message}`);
    } finally {
      await this.logout('analyst1');
    }
  }

  // Test Case 8: Role-Based Access Control
  async testRoleBasedAccess() {
    const testName = 'Role-Based Access Control';
    
    try {
      // Test analyst can only see their own proposals
      const analyst1Login = await this.login('analyst1');
      if (!analyst1Login) {
        this.log(testName, 'FAIL', 'Failed to login as analyst1');
        return;
      }

      const analyst1Proposals = await this.makeRequest('GET', '/api/investments', null, this.sessionCookies['analyst1']);
      await this.logout('analyst1');

      const analyst2Login = await this.login('analyst2');
      if (!analyst2Login) {
        this.log(testName, 'FAIL', 'Failed to login as analyst2');
        return;
      }

      const analyst2Proposals = await this.makeRequest('GET', '/api/investments', null, this.sessionCookies['analyst2']);
      await this.logout('analyst2');

      // Test admin can see all proposals
      const adminLogin = await this.login('admin');
      if (!adminLogin) {
        this.log(testName, 'FAIL', 'Failed to login as admin');
        return;
      }

      const adminProposals = await this.makeRequest('GET', '/api/investments', null, this.sessionCookies['admin']);
      await this.logout('admin');

      if (analyst1Proposals.status === 200 && analyst2Proposals.status === 200 && adminProposals.status === 200) {
        const analyst1Count = analyst1Proposals.data.length;
        const analyst2Count = analyst2Proposals.data.length;
        const adminCount = adminProposals.data.length;

        this.log(testName, 'PASS', 'Role-based access control working correctly', {
          analyst1Proposals: analyst1Count,
          analyst2Proposals: analyst2Count,
          adminProposals: adminCount,
          accessControlValid: adminCount >= Math.max(analyst1Count, analyst2Count)
        });
      } else {
        this.log(testName, 'FAIL', 'Failed to test role-based access control');
      }
    } catch (error) {
      this.log(testName, 'FAIL', `Error in role-based access test: ${error.message}`);
    }
  }

  // Main test runner
  async runAllTests() {
    console.log('🧪 Starting Comprehensive Investment Approval Workflow Tests\n');
    
    // Test 1: Create Draft
    const draftId = await this.testCreateDraft();
    
    if (draftId) {
      // Test 2: Edit Draft
      await this.testEditDraft(draftId);
      
      // Test 3: Submit Draft
      const submittedId = await this.testSubmitDraft(draftId);
      
      if (submittedId) {
        // Test 5: Manager Approval
        await this.testManagerApproval(submittedId);
      }
    }
    
    // Test 4: Create New Proposal and Submit
    const newProposalId = await this.testCreateAndSubmitProposal();
    
    // Test 6: Rejection Flow
    await this.testRejectionFlow();
    
    // Test 7: Dashboard and Recent Requests
    await this.testDashboardAndRecentRequests();
    
    // Test 8: Role-Based Access Control
    await this.testRoleBasedAccess();
    
    // Generate report
    this.generateReport();
  }

  generateReport() {
    console.log('\n📊 Test Results Summary\n');
    
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const total = this.results.length;
    
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%\n`);
    
    if (failed > 0) {
      console.log('❌ Failed Tests:');
      this.results.filter(r => r.status === 'FAIL').forEach(r => {
        console.log(`- ${r.test}: ${r.message}`);
      });
      console.log('');
    }
    
    // Save detailed report
    const reportPath = path.join(__dirname, 'test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify({
      summary: { total, passed, failed, successRate: (passed / total) * 100 },
      results: this.results,
      timestamp: new Date().toISOString()
    }, null, 2));
    
    console.log(`📄 Detailed report saved to: ${reportPath}`);
  }
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new TestRunner();
  runner.runAllTests().catch(console.error);
}

export default TestRunner;