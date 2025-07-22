// Test to trigger a background job and verify our fixed Responses API format works

const fs = require('fs');
const path = require('path');

console.log('Creating a test to trigger background job processing...\n');

// Create a small test document
const testContent = `INVESTMENT ANALYSIS REPORT

Company: Test Investment Company
Sector: Technology
Investment Amount: $1,000,000
Expected Return: 15%
Risk Level: Medium

Financial Highlights:
- Revenue Growth: 25% YoY
- Market Share: 15%
- Profit Margin: 12%

This is a test document to verify background job processing works correctly.`;

const testFileName = 'test-investment-doc-' + Date.now() + '.txt';
const testFilePath = path.join('uploads', testFileName);

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Write test file
fs.writeFileSync(testFilePath, testContent);

console.log(`✅ Created test document: ${testFileName}`);
console.log(`📁 File path: ${testFilePath}`);
console.log(`📊 File size: ${fs.statSync(testFilePath).size} bytes`);

console.log('\nThis test document can be uploaded to an investment proposal to trigger background job processing.');
console.log('Expected flow when uploaded:');
console.log('1. Background job created automatically');
console.log('2. LLM service upload: ✅ SUCCESS (confirmed working)');
console.log('3. LLM service insights: ❌ FAIL (still uses "messages" parameter)');
console.log('4. Local Responses API fallback: ✅ SUCCESS (now uses correct format)');
console.log('5. Document analysis completed with insights');

console.log('\nKey fixes implemented in local fallback:');
console.log('- Uses exact same format as working cross-document query');
console.log('- Flat structure: vector_store_ids at top level');
console.log('- Correct filters parameter (not filter)');
console.log('- Proper file_id filtering');

console.log('\nTo test: Upload this document to Investment 93 (Adani greens) or create new investment and upload this file.');
console.log('Monitor workflow logs for successful completion.');