const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function debugResponse() {
  try {
    const response = await openai.responses.create({
      model: "gpt-4o",
      input: "Write a short investment analysis for HDFC Bank in 100 words.",
      tools: []
    });
    
    console.log('=== Full Response Structure ===');
    console.log(JSON.stringify(response, null, 2));
    
    console.log('\n=== Available Properties ===');
    console.log('Keys:', Object.keys(response));
    
    console.log('\n=== Content Extraction Tests ===');
    console.log('response.content:', response.content);
    console.log('response.choices?.[0]?.message?.content:', response.choices?.[0]?.message?.content);
    console.log('response.data?.content:', response.data?.content);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

debugResponse();
