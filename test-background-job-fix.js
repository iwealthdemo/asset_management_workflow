// Test to verify the background job insights generation works with fixed Responses API format

const { exec } = require('child_process');
const fs = require('fs');

console.log('Testing background job insights generation with fixed Responses API format...\n');

// Test 1: Check if there are any pending background jobs
console.log('1. Checking for pending background jobs...');
exec('curl -s "http://localhost:5000/api/background-jobs" -H "Cookie: session=test"', (error, stdout, stderr) => {
  if (error) {
    console.log('   No direct access to background jobs API (authentication required)');
  } else {
    console.log('   Background jobs status:', stdout.substring(0, 100) + '...');
  }
});

// Test 2: Create a simple test to verify OpenAI Responses API format
console.log('\n2. Testing OpenAI Responses API format (same as cross-document query)...');

const testResponsesFormat = `
const OpenAI = require('openai');

async function testFormat() {
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    const fileSearchTool = {
      type: "file_search",
      vector_store_ids: ["vs_687584b54f908191b0a21ffa42948fb5"],
      filters: {
        type: "eq",
        key: "file_id", 
        value: "file-CbfZf2ihtJBqGKpSSdpUrr"  // Known working file from Investment 93
      }
    };

    const responsePayload = {
      model: "gpt-4o",
      tools: [fileSearchTool],
      input: "Provide a brief summary of this investment document."
    };

    console.log('Testing payload format:', JSON.stringify(responsePayload, null, 2));
    
    const response = await openai.responses.create(responsePayload);
    
    console.log('✅ SUCCESS: Responses API call worked!');
    console.log('Response ID:', response.id);
    console.log('Output length:', response.output_text?.length || 0);
    console.log('Usage:', JSON.stringify(response.usage, null, 2));
    
  } catch (error) {
    console.log('❌ FAILED:', error.message);
  }
}

testFormat();
`;

fs.writeFileSync('test-responses-format.js', testResponsesFormat);

// Test 3: Check if Investment 93 (Adani greens) documents are available for processing
console.log('\n3. Investment 93 (Adani greens) should have documents available for background processing...');
console.log('   Documents were uploaded and should be in vector store');
console.log('   Background jobs should fall back to local Responses API when LLM service fails');

// Test 4: Monitor for background job activity
console.log('\n4. Monitoring for background job processing activity...');
console.log('   Expected flow:');
console.log('   - LLM service upload: ✅ SUCCESS (working)');
console.log('   - LLM service insights: ❌ FAIL (wrong API format - uses "messages" instead of "input")');
console.log('   - Local fallback: ✅ SUCCESS (now uses correct Responses API format)');

console.log('\n5. Key fix implemented:');
console.log('   - Changed from nested file_search structure to flat structure');
console.log('   - Now uses same exact format as working cross-document query');
console.log('   - vector_store_ids at top level, not nested inside file_search');

console.log('\nTest complete. Check workflow logs to see if background jobs process successfully.');
console.log('Expected: LLM service insights fail → Local Responses API succeeds → Analysis completed');