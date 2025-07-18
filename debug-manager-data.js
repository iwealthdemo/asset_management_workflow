#!/usr/bin/env node

import fetch from 'node-fetch';

async function debugManagerData() {
  try {
    // Login as manager
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'manager1', password: 'admin123' })
    });
    
    const cookies = loginResponse.headers.get('set-cookie');
    console.log('Manager login successful');
    
    // Get investments
    const investmentsResponse = await fetch('http://localhost:5000/api/investments', {
      headers: { 'Cookie': cookies }
    });
    
    const investments = await investmentsResponse.json();
    console.log('Investments visible to manager:', JSON.stringify(investments, null, 2));
    
    // Get tasks
    const tasksResponse = await fetch('http://localhost:5000/api/tasks', {
      headers: { 'Cookie': cookies }
    });
    
    const tasks = await tasksResponse.json();
    console.log('Tasks for manager:', JSON.stringify(tasks, null, 2));
    
    // Get enhanced dashboard stats
    const statsResponse = await fetch('http://localhost:5000/api/dashboard/enhanced-stats', {
      headers: { 'Cookie': cookies }
    });
    
    const stats = await statsResponse.json();
    console.log('Enhanced dashboard stats for manager:', JSON.stringify(stats, null, 2));
    
  } catch (error) {
    console.error('Debug failed:', error);
  }
}

debugManagerData();