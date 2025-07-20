#!/usr/bin/env node

import fetch from 'node-fetch';

async function testManagerEnhanced() {
  const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'manager1', password: 'admin123' })
  });
  
  const cookies = loginResponse.headers.get('set-cookie');
  console.log('Manager login successful');
  
  const statsResponse = await fetch('http://localhost:5000/api/dashboard/enhanced-stats', {
    headers: { 'Cookie': cookies }
  });
  
  const stats = await statsResponse.json();
  console.log('Enhanced stats pendingManager:', stats.proposalSummary.investment.pendingManager);
  console.log('Enhanced stats total:', stats.proposalSummary.investment.total);
}

testManagerEnhanced();