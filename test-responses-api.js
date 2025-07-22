// Test the fixed OpenAI Responses API format for background job fallback

const OpenAI = require('openai');

async function testResponsesAPI() {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  try {
    console.log('Testing OpenAI Responses API with file_search...');
    
    // Use the same vector store and file format as cross-document query
    const vectorStoreId = 'vs_687584b54f908191b0a21ffa42948fb5';
    const testFileId = 'file-CbfZf2ihtJBqGKpSSdpUrr'; // Known working file from Investment 93
    
    const fileSearchTool = {
      type: "file_search",
      file_search: {
        vector_store_ids: [vectorStoreId],
        filter: {
          type: "eq",
          key: "file_id", 
          value: testFileId
        }
      }
    };

    const responsePayload = {
      model: "gpt-4o",
      tools: [fileSearchTool],
      input: "Please provide a brief summary of this investment document. What are the key financial metrics?"
    };

    console.log('Payload:', JSON.stringify(responsePayload, null, 2));

    const response = await openai.responses.create(responsePayload);
    
    console.log('Success! Response ID:', response.id);
    console.log('Model:', response.model);
    console.log('Usage:', JSON.stringify(response.usage, null, 2));
    console.log('Output text length:', response.output_text?.length || 0);
    console.log('Output preview:', response.output_text?.substring(0, 200) + '...');
    
    return {
      success: true,
      text: response.output_text,
      metadata: {
        openaiResponseId: response.id,
        openaiModel: response.model,
        inputTokens: response.usage?.input_tokens || 0,
        outputTokens: response.usage?.output_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0
      }
    };
    
  } catch (error) {
    console.error('Error testing Responses API:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the test
testResponsesAPI().then(result => {
  if (result.success) {
    console.log('\n✅ Responses API test SUCCESSFUL');
    console.log('The background job fallback should now work properly!');
  } else {
    console.log('\n❌ Responses API test FAILED');
    console.log('Error:', result.error);
  }
}).catch(console.error);