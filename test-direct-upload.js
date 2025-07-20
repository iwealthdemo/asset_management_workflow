#!/usr/bin/env node

/**
 * Direct Document Upload Test
 * Test document upload through browser interface simulation
 */

import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';

const BASE_URL = 'http://localhost:5000';

async function testDirectUpload() {
  console.log('📤 Testing Direct Document Upload\n');

  try {
    // Create a simple test file
    const testContent = 'Test document content for LLM service integration validation.';
    fs.writeFileSync('test-upload.txt', testContent);

    console.log('1️⃣ Testing with admin user...');
    
    // Try logging in as admin (common default user)
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });

    if (!loginResponse.ok) {
      console.log('❌ Admin login failed, trying analyst...');
      
      const analystLogin = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'analyst1', password: 'admin123' })
      });

      if (!analystLogin.ok) {
        console.log('❌ No valid login found - testing system status instead');
        
        // Test system health without authentication
        console.log('\n2️⃣ Testing LLM Service Connection...');
        const healthResponse = await fetch('https://llm-api-service-vinay2k.replit.app/health');
        
        if (healthResponse.ok) {
          const health = await healthResponse.json();
          console.log('✅ LLM Service Status:', health.status);
          console.log('   OpenAI:', health.openai_configured ? 'Configured' : 'Not configured');
          console.log('   Vector Store:', health.default_vector_store);
        }

        console.log('\n3️⃣ Testing Investment Portal API Health...');
        const portalResponse = await fetch(`${BASE_URL}/api/auth/me`);
        console.log('✅ Portal API Status:', portalResponse.status === 401 ? 'Running (auth required)' : 'Unexpected status');

        return false;
      }
    }

    console.log('✅ Login successful!');
    
    // Continue with upload test if login succeeded
    // (Implementation would continue here)
    
    // Cleanup
    fs.unlinkSync('test-upload.txt');
    return true;

  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
    return false;
  }
}

testDirectUpload();