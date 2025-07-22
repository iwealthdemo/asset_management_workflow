const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function testResponsesAPI() {
  try {
    console.log('Testing basic OpenAI Responses API...');
    
    const response = await openai.responses.create({
      model: "gpt-4o",
      input: "Write a short investment analysis for HDFC Bank.",
      tools: []  // No tools first
    });
    
    console.log('✅ Basic Responses API works!');
    console.log('Response ID:', response.id);
    console.log('Content preview:', response.content ? response.content.substring(0, 200) + '...' : 'No content');
    
    // Now test with web_search_preview
    console.log('\nTesting with web_search_preview...');
    const responseWithSearch = await openai.responses.create({
      model: "gpt-4o", 
      input: "What is HDFC Bank's current market performance in 2025?",
      tools: [
        {
          type: "web_search_preview",
          web_search_preview: {
            query: "HDFC Bank stock performance 2025 financial results"
          }
        }
      ]
    });
    
    console.log('✅ Web search tool works!');
    console.log('Response ID:', responseWithSearch.id);
    
  } catch (error) {
    console.log('❌ Error:', error.message);
    console.log('Error details:', error.error || error);
  }
}

testResponsesAPI();
