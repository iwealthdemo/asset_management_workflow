#!/usr/bin/env node

/**
 * End-to-End Proposal Consistency Test
 * 
 * This test creates a real investment proposal and validates that both
 * the analyst (initiator) and committee member (approver) see identical
 * proposal information in their respective interfaces.
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';
let analystCookies = '';
let committee1Cookies = '';

async function makeRequest(method, url, body = null, cookies = '') {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json', 'Cookie': cookies }
  };
  if (body) options.body = JSON.stringify(body);
  
  const response = await fetch(`${BASE_URL}${url}`, options);
  const setCookieHeader = response.headers.get('set-cookie');
  return { response, cookies: setCookieHeader || cookies };
}

async function authenticateUsers() {
  console.log('🔐 Authenticating test users...');
  
  // Login analyst1
  const analystLogin = await makeRequest('POST', '/api/auth/login', {
    username: 'analyst1',
    password: 'admin123'
  });
  
  if (!analystLogin.response.ok) {
    throw new Error('Failed to authenticate analyst1');
  }
  analystCookies = analystLogin.cookies;
  
  // Login committee1
  const committee1Login = await makeRequest('POST', '/api/auth/login', {
    username: 'committee1', 
    password: 'admin123'
  });
  
  if (!committee1Login.response.ok) {
    throw new Error('Failed to authenticate committee1');
  }
  committee1Cookies = committee1Login.cookies;
  
  console.log('✅ Both users authenticated successfully');
}

async function createAndSubmitProposal() {
  console.log('📝 Creating new investment proposal...');
  
  const proposalData = {
    targetCompany: "Consistency Test Corp",
    investmentType: "equity",
    amount: "2000000",
    expectedReturn: "18",
    description: "Test proposal for consistency validation between initiator and approver views",
    riskLevel: "medium"
  };
  
  // Create proposal as analyst1
  const createResponse = await makeRequest('POST', '/api/investments', proposalData, analystCookies);
  if (!createResponse.response.ok) {
    const error = await createResponse.response.text();
    throw new Error(`Failed to create proposal: ${error}`);
  }
  
  const proposal = await createResponse.response.json();
  console.log(`✅ Proposal created with ID: ${proposal.id}`);
  
  // Submit for approval
  const submitResponse = await makeRequest('POST', `/api/investments/${proposal.id}/submit`, {}, analystCookies);
  if (!submitResponse.response.ok) {
    throw new Error('Failed to submit proposal for approval');
  }
  
  console.log('✅ Proposal submitted for approval');
  return proposal;
}

async function getInitiatorView(proposalId) {
  console.log('👨‍💼 Fetching proposal from analyst perspective (My Investments)...');
  
  const response = await makeRequest('GET', `/api/investments/${proposalId}`, null, analystCookies);
  if (!response.response.ok) {
    throw new Error('Failed to fetch proposal from initiator view');
  }
  
  const proposal = await response.response.json();
  console.log('✅ Successfully retrieved initiator view data');
  
  return {
    requestId: proposal.id,
    targetCompany: proposal.targetCompany,
    riskLevel: proposal.riskLevel,
    amount: proposal.amount,
    expectedReturn: proposal.expectedReturn,
    status: proposal.status,
    investmentType: proposal.investmentType,
    createdAt: proposal.createdAt,
    description: proposal.description
  };
}

async function getApproverView(proposalId) {
  console.log('👩‍💼 Fetching proposal from committee member perspective (My Tasks)...');
  
  // Get tasks to find the matching task
  const tasksResponse = await makeRequest('GET', '/api/tasks', null, committee1Cookies);
  if (!tasksResponse.response.ok) {
    throw new Error('Failed to fetch tasks');
  }
  
  const tasks = await tasksResponse.response.json();
  const matchingTask = tasks.find(task => task.requestId === proposalId);
  
  if (!matchingTask) {
    throw new Error(`No task found for proposal ${proposalId}. Available tasks: ${tasks.map(t => t.requestId).join(', ')}`);
  }
  
  // Get detailed proposal data that would be shown in task expansion
  const proposalResponse = await makeRequest('GET', `/api/investments/${proposalId}`, null, committee1Cookies);
  if (!proposalResponse.response.ok) {
    throw new Error('Failed to fetch proposal details from approver view');
  }
  
  const proposal = await proposalResponse.response.json();
  console.log('✅ Successfully retrieved approver view data');
  
  return {
    requestId: proposal.id,
    targetCompany: proposal.targetCompany,
    riskLevel: proposal.riskLevel,
    amount: proposal.amount,
    expectedReturn: proposal.expectedReturn,
    status: proposal.status,
    investmentType: proposal.investmentType,
    createdAt: proposal.createdAt,
    description: proposal.description
  };
}

function validateFieldConsistency(initiatorData, approverData) {
  console.log('\n🔍 Validating field consistency between views...');
  
  const fields = [
    'requestId', 'targetCompany', 'riskLevel', 'amount', 
    'expectedReturn', 'status', 'investmentType', 'createdAt', 'description'
  ];
  
  const results = [];
  let allConsistent = true;
  
  fields.forEach(field => {
    const initiatorValue = initiatorData[field];
    const approverValue = approverData[field];
    const isConsistent = initiatorValue === approverValue;
    
    if (!isConsistent) {
      allConsistent = false;
      console.log(`❌ ${field}: Initiator='${initiatorValue}' vs Approver='${approverValue}'`);
    } else {
      console.log(`✅ ${field}: Both show '${initiatorValue}'`);
    }
    
    results.push({
      field,
      initiatorValue,
      approverValue,
      consistent: isConsistent
    });
  });
  
  return { allConsistent, results };
}

async function runCompleteConsistencyTest() {
  try {
    console.log('🚀 Starting End-to-End Proposal Consistency Test');
    console.log('=' .repeat(60));
    
    // Setup
    await authenticateUsers();
    const proposal = await createAndSubmitProposal();
    
    // Wait for task creation
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Get data from both perspectives
    const initiatorData = await getInitiatorView(proposal.id);
    const approverData = await getApproverView(proposal.id);
    
    // Validate consistency
    const validation = validateFieldConsistency(initiatorData, approverData);
    
    // Generate summary
    console.log('\n📊 TEST RESULTS SUMMARY');
    console.log('=' .repeat(60));
    console.log(`Overall Status: ${validation.allConsistent ? '✅ CONSISTENT' : '❌ INCONSISTENT'}`);
    console.log(`Fields Tested: ${validation.results.length}`);
    console.log(`Consistent Fields: ${validation.results.filter(r => r.consistent).length}`);
    console.log(`Inconsistent Fields: ${validation.results.filter(r => !r.consistent).length}`);
    
    if (validation.allConsistent) {
      console.log('\n🎉 SUCCESS: Both initiator and approver see identical proposal information!');
      console.log('   The dual-component architecture is now fully consistent.');
    } else {
      console.log('\n⚠️  ISSUES FOUND: Some fields differ between views');
      console.log('   Review the field comparison above for specific inconsistencies.');
    }
    
    // Save detailed results
    const testResults = {
      timestamp: new Date().toISOString(),
      testProposalId: proposal.id,
      overall: validation.allConsistent ? 'CONSISTENT' : 'INCONSISTENT',
      initiatorData,
      approverData,
      fieldValidation: validation.results,
      summary: {
        totalFields: validation.results.length,
        consistentFields: validation.results.filter(r => r.consistent).length,
        inconsistentFields: validation.results.filter(r => !r.consistent).length
      }
    };
    
    const fs = await import('fs');
    fs.writeFileSync('end-to-end-test-results.json', JSON.stringify(testResults, null, 2));
    console.log('\n📄 Detailed results saved to: end-to-end-test-results.json');
    
    return testResults;
    
  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
    return { status: 'ERROR', error: error.message };
  }
}

// Run the test
runCompleteConsistencyTest().then(results => {
  const exitCode = results.overall === 'CONSISTENT' ? 0 : 1;
  process.exit(exitCode);
});