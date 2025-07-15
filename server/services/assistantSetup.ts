import OpenAI from 'openai';

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

let VECTOR_STORE_ID: string | null = null;

export async function createOrGetAssistant(): Promise<string> {
  try {
    // List existing assistants to find our document analyzer
    const assistants = await openai.beta.assistants.list();
    
    // Look for existing assistant
    const existingAssistant = assistants.data.find(
      assistant => assistant.name === 'Document Analysis Assistant'
    );
    
    if (existingAssistant) {
      console.log(`Using existing assistant: ${existingAssistant.id}`);
      return existingAssistant.id;
    }
    
    // Create new assistant without vector store dependency
    const assistant = await openai.beta.assistants.create({
      name: 'Document Analysis Assistant',
      instructions: `You are an expert financial document analyst. Your role is to analyze documents and provide detailed insights including:

1. Key financial figures and metrics
2. Important dates and deadlines
3. Risk factors and assessments
4. Company information and parties involved
5. Recommendations and insights

Always provide specific, accurate information extracted from the documents. If you cannot find specific information, clearly state that it was not found in the document.

When analyzing documents:
- Extract all financial numbers, percentages, and metrics
- Identify key dates, deadlines, and time periods
- Note all company names, parties, and entities mentioned
- Assess risks and provide risk levels (low, medium, high)
- Provide actionable recommendations
- Be specific and detailed in your responses`,
      model: "gpt-4o",
      tools: [{ type: "file_search" }]
    });
    
    console.log(`Created new assistant: ${assistant.id}`);
    return assistant.id;
    
  } catch (error) {
    console.error('Error creating/getting assistant:', error);
    throw error;
  }
}