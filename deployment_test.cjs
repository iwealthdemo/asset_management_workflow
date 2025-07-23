#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function testDeploymentReadiness() {
  console.log('🚀 INVESTMENT APPROVAL PORTAL - DEPLOYMENT READINESS CHECK');
  console.log('===========================================================\n');
  
  let totalTests = 0;
  let passedTests = 0;
  const failedTests = [];

  // Test 1: Authentication System
  console.log('1. 🔐 Authentication System');
  console.log('   Testing user login capabilities...');
  
  const authTests = [
    { user: 'admin', password: 'admin123', role: 'admin' },
    { user: 'manager1', password: 'admin123', role: 'manager' },
    { user: 'analyst1', password: 'admin123', role: 'analyst' }
  ];

  const sessions = {};
  
  for (const { user, password, role } of authTests) {
    totalTests++;
    try {
      const response = await axios.post(`${BASE_URL}/api/auth/login`, {
        username: user,
        password: password
      });
      
      if (response.status === 200 && response.data.user) {
        console.log(`   ✅ ${role.toUpperCase()} login successful`);
        passedTests++;
        
        // Store session cookies
        const cookies = response.headers['set-cookie'];
        if (cookies) {
          sessions[role] = cookies.join('; ');
        }
      } else {
        console.log(`   ❌ ${role.toUpperCase()} login failed`);
        failedTests.push(`${role} authentication`);
      }
    } catch (error) {
      console.log(`   ❌ ${role.toUpperCase()} login error: ${error.message}`);
      failedTests.push(`${role} authentication: ${error.message}`);
    }
  }

  // Test 2: Core API Endpoints
  console.log('\n2. 🌐 Core API Endpoints');
  console.log('   Testing essential application endpoints...');
  
  const apiTests = [
    { name: 'Dashboard Stats', endpoint: '/api/dashboard/stats', session: 'admin' },
    { name: 'Investment Templates', endpoint: '/api/templates/investment', session: 'admin' },
    { name: 'User Tasks', endpoint: '/api/tasks', session: 'manager' },
    { name: 'Investment List', endpoint: '/api/investments', session: 'analyst' },
    { name: 'Notifications', endpoint: '/api/notifications', session: 'admin' }
  ];

  for (const test of apiTests) {
    totalTests++;
    try {
      const config = {
        method: 'GET',
        url: `${BASE_URL}${test.endpoint}`,
        timeout: 10000,
        headers: sessions[test.session] ? { 'Cookie': sessions[test.session] } : {}
      };

      const response = await axios(config);
      
      if (response.status === 200 || response.status === 304) {
        console.log(`   ✅ ${test.name}`);
        passedTests++;
      } else {
        console.log(`   ❌ ${test.name} - Status: ${response.status}`);
        failedTests.push(`${test.name}: HTTP ${response.status}`);
      }
    } catch (error) {
      console.log(`   ❌ ${test.name} - Error: ${error.response?.status || error.message}`);
      failedTests.push(`${test.name}: ${error.message}`);
    }
  }

  // Test 3: Environment Configuration
  console.log('\n3. ⚙️  Environment Configuration');
  console.log('   Checking required environment variables...');
  
  const envChecks = [
    { name: 'Database Connection', env: 'DATABASE_URL' },
    { name: 'OpenAI API Key', env: 'OPENAI_API_KEY' },
    { name: 'Node Environment', env: 'NODE_ENV', optional: true }
  ];

  for (const check of envChecks) {
    totalTests++;
    const value = process.env[check.env];
    
    if (value) {
      console.log(`   ✅ ${check.name}`);
      passedTests++;
    } else if (check.optional) {
      console.log(`   ⚠️  ${check.name} (optional)`);
      passedTests++; // Don't fail for optional vars
    } else {
      console.log(`   ❌ ${check.name} - Not configured`);
      failedTests.push(`${check.name}: Missing environment variable`);
    }
  }

  // Test 4: Database Connectivity
  console.log('\n4. 🗄️  Database Status');
  console.log('   Verifying database connectivity...');
  
  totalTests++;
  try {
    const response = await axios.get(`${BASE_URL}/api/dashboard/stats`, {
      headers: sessions.admin ? { 'Cookie': sessions.admin } : {},
      timeout: 5000
    });
    
    if (response.status === 200) {
      console.log(`   ✅ Database connectivity verified`);
      passedTests++;
    } else {
      console.log(`   ❌ Database connectivity issue`);
      failedTests.push('Database connectivity');
    }
  } catch (error) {
    console.log(`   ❌ Database error: ${error.message}`);
    failedTests.push(`Database: ${error.message}`);
  }

  // Results Summary
  console.log('\n===========================================================');
  console.log('📊 DEPLOYMENT READINESS SUMMARY');
  console.log('===========================================================');
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${totalTests - passedTests}`);
  
  const successRate = Math.round((passedTests / totalTests) * 100);
  console.log(`Success Rate: ${successRate}%`);

  if (failedTests.length > 0) {
    console.log('\n❌ FAILED COMPONENTS:');
    failedTests.forEach(test => console.log(`   • ${test}`));
  }

  console.log('\n🎯 DEPLOYMENT RECOMMENDATION:');
  if (successRate >= 90) {
    console.log('✅ READY FOR DEPLOYMENT');
    console.log('   All critical systems are operational');
    return true;
  } else if (successRate >= 70) {
    console.log('⚠️  CAUTION - Review Required');
    console.log('   Some components failed - review before deployment');
    return false;
  } else {
    console.log('❌ NOT READY FOR DEPLOYMENT');
    console.log('   Critical failures detected - resolve issues first');
    return false;
  }
}

// Run the test suite
testDeploymentReadiness().then(isReady => {
  console.log('\n===========================================================');
  process.exit(isReady ? 0 : 1);
}).catch(error => {
  console.error('❌ Test suite execution failed:', error.message);
  process.exit(1);
});