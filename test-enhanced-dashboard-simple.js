#!/usr/bin/env node

import fetch from 'node-fetch';

async function testSimpleEnhancedDashboard() {
  try {
    console.log('Testing simple enhanced dashboard stats API...');
    
    // Login first
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });

    if (!loginResponse.ok) {
      console.log('Login failed:', loginResponse.status);
      return;
    }

    const cookies = loginResponse.headers.get('set-cookie');
    console.log('Admin login successful');

    // Test enhanced stats with admin user
    const statsResponse = await fetch('http://localhost:5000/api/dashboard/enhanced-stats', {
      headers: {
        'Cookie': cookies
      }
    });

    console.log('Enhanced stats response status:', statsResponse.status);
    
    if (statsResponse.ok) {
      const data = await statsResponse.json();
      console.log('Enhanced stats data:', JSON.stringify(data, null, 2));
    } else {
      const errorText = await statsResponse.text();
      console.log('Enhanced stats error:', errorText);
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testSimpleEnhancedDashboard();