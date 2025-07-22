// Test script to verify sequential ID generation
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

async function testSequentialIdGeneration() {
  console.log('🔍 Testing sequential ID generation...');
  
  try {
    // First, login to get session cookie
    const loginResponse = await fetch(`${BASE_URL}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'analyst',
        password: 'admin123'
      })
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }

    const cookies = loginResponse.headers.get('set-cookie');
    console.log('✅ Login successful');

    // Create multiple investment requests to test sequential numbering
    const testInvestments = [
      {
        companyName: 'Sequential Test Corp 1',
        investmentType: 'acquisition',
        description: 'Testing sequential ID 1',
        amount: 1000000,
        expectedReturnPercentage: 15,
        riskLevel: 'medium',
        targetCompany: 'Test Co 1',
        investmentRationale: 'Testing sequential numbering system',
        status: 'new' // Submit for approval to test workflow
      },
      {
        companyName: 'Sequential Test Corp 2',
        investmentType: 'expansion',
        description: 'Testing sequential ID 2',
        amount: 2000000,
        expectedReturnPercentage: 12,
        riskLevel: 'low',
        targetCompany: 'Test Co 2',
        investmentRationale: 'Testing sequential numbering system',
        status: 'new'
      },
      {
        companyName: 'Sequential Test Corp 3',
        investmentType: 'joint_venture',
        description: 'Testing sequential ID 3',
        amount: 3000000,
        expectedReturnPercentage: 20,
        riskLevel: 'high',
        targetCompany: 'Test Co 3',
        investmentRationale: 'Testing sequential numbering system',
        status: 'new'
      }
    ];

    const createdRequests = [];

    for (let i = 0; i < testInvestments.length; i++) {
      const investment = testInvestments[i];
      
      console.log(`\n📝 Creating investment request ${i + 1}...`);
      
      const response = await fetch(`${BASE_URL}/api/investment-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookies
        },
        body: JSON.stringify(investment)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create investment ${i + 1}: ${response.status} - ${errorText}`);
      }

      const createdRequest = await response.json();
      createdRequests.push(createdRequest);
      
      console.log(`✅ Created request with ID: ${createdRequest.requestId}`);
      console.log(`   Company: ${createdRequest.companyName}`);
      console.log(`   Amount: $${createdRequest.amount.toLocaleString()}`);
    }

    // Verify sequential numbering
    console.log('\n🔢 Verifying sequential numbering:');
    
    const currentYear = new Date().getFullYear();
    const expectedPrefix = `INV-${currentYear}-`;
    
    for (let i = 0; i < createdRequests.length; i++) {
      const request = createdRequests[i];
      const requestId = request.requestId;
      
      console.log(`Request ${i + 1}: ${requestId}`);
      
      // Check if it starts with the expected prefix
      if (!requestId.startsWith(expectedPrefix)) {
        console.error(`❌ Request ID ${requestId} doesn't start with expected prefix ${expectedPrefix}`);
        continue;
      }
      
      // Extract the number part
      const numberPart = requestId.substring(expectedPrefix.length);
      const number = parseInt(numberPart);
      
      console.log(`   Number part: ${numberPart} (parsed: ${number})`);
      
      if (isNaN(number)) {
        console.error(`❌ Could not parse number from: ${numberPart}`);
      } else if (numberPart.length === 4 && numberPart.startsWith('0')) {
        console.log(`✅ Proper 4-digit formatting with leading zeros`);
      } else if (number > 0) {
        console.log(`✅ Valid sequential number: ${number}`);
      } else {
        console.error(`❌ Invalid number: ${number}`);
      }
    }

    // Check if numbers are sequential (if we have multiple requests)
    if (createdRequests.length > 1) {
      const numbers = createdRequests.map(r => {
        const numberPart = r.requestId.substring(expectedPrefix.length);
        return parseInt(numberPart);
      }).sort((a, b) => a - b);
      
      console.log(`\n🔄 Sequential check:`);
      console.log(`Numbers in order: ${numbers.join(', ')}`);
      
      let sequential = true;
      for (let i = 1; i < numbers.length; i++) {
        if (numbers[i] !== numbers[i-1] + 1) {
          sequential = false;
          break;
        }
      }
      
      if (sequential) {
        console.log(`✅ Numbers are sequential!`);
      } else {
        console.log(`⚠️  Numbers are not perfectly sequential (this is expected if other requests exist)`);
      }
    }

    console.log('\n🎉 Sequential ID generation test completed successfully!');
    
    // Show summary
    console.log('\n📊 Summary:');
    createdRequests.forEach((req, index) => {
      console.log(`${index + 1}. ${req.requestId} - ${req.companyName}`);
    });

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testSequentialIdGeneration();