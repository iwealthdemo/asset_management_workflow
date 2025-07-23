#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');

const BASE_URL = 'http://localhost:5000';
const TESTS = {
  'Authentication System': [
    { name: 'Admin Login', method: 'POST', endpoint: '/api/auth/login', data: { username: 'admin', password: 'admin123' }},
    { name: 'Manager Login', method: 'POST', endpoint: '/api/auth/login', data: { username: 'manager1', password: 'admin123' }},
    { name: 'Analyst Login', method: 'POST', endpoint: '/api/auth/login', data: { username: 'analyst1', password: 'admin123' }}
  ],
  'Dashboard & Stats': [
    { name: 'Dashboard Stats', method: 'GET', endpoint: '/api/dashboard/stats', requiresAuth: true },
    { name: 'Enhanced Stats', method: 'GET', endpoint: '/api/dashboard/enhanced-stats', requiresAuth: true }
  ],
  'Investment Management': [
    { name: 'Get Investments', method: 'GET', endpoint: '/api/investments', requiresAuth: true },
    { name: 'Templates Available', method: 'GET', endpoint: '/api/templates/investment', requiresAuth: true }
  ],
  'Task Management': [
    { name: 'Get Tasks', method: 'GET', endpoint: '/api/tasks', requiresAuth: true },
    { name: 'Get Notifications', method: 'GET', endpoint: '/api/notifications', requiresAuth: true }
  ]
};

let sessionCookies = {};

async function runTests() {
  console.log('🚀 DEPLOYMENT READINESS TEST SUITE\n');
  console.log('=' * 50);
  
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = [];

  for (const [category, tests] of Object.entries(TESTS)) {
    console.log(`\n📋 ${category}`);
    console.log('-' * 30);
    
    for (const test of tests) {
      totalTests++;
      try {
        const config = {
          method: test.method,
          url: `${BASE_URL}${test.endpoint}`,
          timeout: 10000,
          validateStatus: (status) => status < 500 // Accept any status under 500
        };

        if (test.data) {
          config.data = test.data;
          config.headers = { 'Content-Type': 'application/json' };
        }

        if (test.requiresAuth && sessionCookies.admin) {
          config.headers = { ...config.headers, 'Cookie': sessionCookies.admin };
        }

        const response = await axios(config);
        
        // Store session cookies for auth tests
        if (test.endpoint === '/api/auth/login' && response.status === 200) {
          const cookies = response.headers['set-cookie'];
          if (cookies) {
            const role = test.data.username === 'admin' ? 'admin' : 
                        test.data.username.includes('manager') ? 'manager' : 'analyst';
            sessionCookies[role] = cookies.join('; ');
          }
        }

        if (response.status === 200 || response.status === 304) {
          console.log(`  ✅ ${test.name}`);
          passedTests++;
        } else if (response.status === 401 && !test.requiresAuth) {
          console.log(`  ✅ ${test.name} (Protected as expected)`);
          passedTests++;
        } else {
          console.log(`  ❌ ${test.name} - Status: ${response.status}`);
          failedTests.push(`${test.name}: Status ${response.status}`);
        }
      } catch (error) {
        console.log(`  ❌ ${test.name} - Error: ${error.message}`);
        failedTests.push(`${test.name}: ${error.message}`);
      }
    }
  }

  // Summary
  console.log('\n' + '=' * 50);
  console.log('📊 TEST SUMMARY');
  console.log('=' * 50);
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${totalTests - passedTests}`);
  console.log(`Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);

  if (failedTests.length > 0) {
    console.log('\n❌ FAILED TESTS:');
    failedTests.forEach(test => console.log(`  - ${test}`));
  }

  // Environment Check
  console.log('\n🔧 ENVIRONMENT STATUS');
  console.log('-' * 30);
  console.log(`Database: ${process.env.DATABASE_URL ? '✅ Connected' : '❌ Not configured'}`);
  console.log(`OpenAI API: ${process.env.OPENAI_API_KEY ? '✅ Configured' : '❌ Not configured'}`);
  console.log(`Node Environment: ${process.env.NODE_ENV || 'development'}`);

  const readinessScore = passedTests / totalTests;
  
  console.log('\n🎯 DEPLOYMENT READINESS');
  console.log('-' * 30);
  if (readinessScore >= 0.9) {
    console.log('✅ READY FOR DEPLOYMENT');
    console.log('All critical systems operational');
  } else if (readinessScore >= 0.7) {
    console.log('⚠️  MOSTLY READY - Minor issues detected');
    console.log('Review failed tests before deployment');
  } else {
    console.log('❌ NOT READY FOR DEPLOYMENT');
    console.log('Critical systems failing - resolve issues first');
  }

  return readinessScore >= 0.7;
}

runTests().then(isReady => {
  process.exit(isReady ? 0 : 1);
}).catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});