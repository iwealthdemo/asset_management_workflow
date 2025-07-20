#!/usr/bin/env node

import fetch from 'node-fetch';

async function testDashboard() {
  try {
    console.log('Testing enhanced dashboard stats API...');
    
    // Login first
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'analyst1',
        password: 'admin123'
      })
    });

    if (!loginResponse.ok) {
      console.log('Login failed:', loginResponse.status);
      return;
    }

    const cookies = loginResponse.headers.get('set-cookie');
    console.log('Login successful, cookies:', cookies);

    // Test enhanced stats
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

    // Test regular stats for comparison
    const regularStatsResponse = await fetch('http://localhost:5000/api/dashboard/stats', {
      headers: {
        'Cookie': cookies
      }
    });

    console.log('Regular stats response status:', regularStatsResponse.status);
    
    if (regularStatsResponse.ok) {
      const regularData = await regularStatsResponse.json();
      console.log('Regular stats data:', JSON.stringify(regularData, null, 2));
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testDashboard();