import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function testFileUploadPayload() {
  try {
    // Get a real file from uploads directory
    const uploadsDir = './uploads';
    const files = fs.readdirSync(uploadsDir);
    const testFile = files.find(file => file.endsWith('.pdf'));
    
    if (!testFile) {
      console.log('No PDF files found in uploads directory');
      return;
    }

    console.log(`Testing with file: ${testFile}`);
    const filePath = path.join(uploadsDir, testFile);
    
    // Step 1: Upload file to OpenAI Files API
    console.log('\n=== STEP 1: Upload file to OpenAI Files API ===');
    const fileStream = fs.createReadStream(filePath);
    const uploadedFile = await openai.files.create({
      file: fileStream,
      purpose: 'assistants'
    });

    console.log('Complete File Object Response:');
    console.log(JSON.stringify(uploadedFile, null, 2));
    
    console.log('\nFile Object Properties:');
    console.log('- ID:', uploadedFile.id);
    console.log('- Object:', uploadedFile.object);  
    console.log('- Bytes:', uploadedFile.bytes);
    console.log('- Created At:', uploadedFile.created_at);
    console.log('- Filename:', uploadedFile.filename);
    console.log('- Purpose:', uploadedFile.purpose);
    console.log('- All Keys:', Object.keys(uploadedFile));

    // Step 2: Get vector store ID (use existing one)
    const vectorStoreId = 'vs_687584b54f908191b0a21ffa42948fb5';
    
    // Step 3: Attach file to vector store with metadata
    console.log('\n=== STEP 2: Attach file to vector store with metadata ===');
    
    // Extract attributes from filename
    const attributes = {
      filename: uploadedFile.filename,
      file_id: uploadedFile.id,
      category: "FinancialReport",
      document_type: "annual_report", 
      company: extractCompanyFromFilename(uploadedFile.filename),
      year: extractYearFromFilename(uploadedFile.filename),
      file_size_bytes: uploadedFile.bytes.toString(),
      upload_timestamp: uploadedFile.created_at.toString()
    };

    console.log('Attributes to be attached:');
    console.log(JSON.stringify(attributes, null, 2));

    // Show the payload structure that would be sent
    const vectorStorePayload = {
      vector_store_id: vectorStoreId,
      file_id: uploadedFile.id,
      attributes: attributes
    };

    console.log('\nVector Store Attachment Payload:');
    console.log(JSON.stringify(vectorStorePayload, null, 2));

    // Actually attach to vector store with attributes
    const vectorStoreFile = await openai.vectorStores.files.createAndPoll(
      vectorStoreId, 
      {
        file_id: uploadedFile.id,
        attributes: attributes
      }
    );

    console.log('\nVector Store File Response:');
    console.log(JSON.stringify(vectorStoreFile, null, 2));
    console.log('Vector Store File Keys:', Object.keys(vectorStoreFile));

  } catch (error) {
    console.error('Error:', error.message);
    console.error('Full error:', error);
  }
}

// Helper functions for metadata extraction
function extractCompanyFromFilename(filename) {
  if (filename.toLowerCase().includes('hdfc')) return 'HDFC_Bank';
  if (filename.toLowerCase().includes('reliance')) return 'Reliance';
  if (filename.toLowerCase().includes('hsbc')) return 'HSBC';
  return 'Unknown';
}

function extractYearFromFilename(filename) {
  const yearMatch = filename.match(/(\d{4}-?\d{2})/);
  return yearMatch ? yearMatch[1] : 'Unknown';
}

// Run the test
testFileUploadPayload();