import OpenAI from 'openai';
import { storage } from '../storage';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const VECTOR_STORE_ID = 'vs_687584b54f908191b0a21ffa42948fb5';

// Create a persistent assistant to avoid recreation overhead
let cachedCrossDocumentAssistant: any = null;

export class CrossDocumentQueryService {
  private async getOrCreateAssistant() {
    if (cachedCrossDocumentAssistant) {
      return cachedCrossDocumentAssistant;
    }

    try {
      cachedCrossDocumentAssistant = await openai.beta.assistants.create({
        name: "Cross-Document Query Assistant",
        instructions: "You are an intelligent assistant that can search across multiple documents in a vector store and provide comprehensive answers based on information from one or more documents. Always provide clear, well-sourced responses and indicate which documents contain the relevant information when possible. When searching across documents, synthesize information from multiple sources and clearly indicate which documents contain the relevant details.",
        model: "gpt-4o-mini",
        tools: [
          {
            type: "file_search"
          }
        ],
        tool_resources: {
          file_search: {
            vector_store_ids: [VECTOR_STORE_ID]
          }
        }
      });
      
      console.log('Created persistent cross-document assistant:', cachedCrossDocumentAssistant.id);
      return cachedCrossDocumentAssistant;
    } catch (error) {
      console.error('Error creating cross-document assistant:', error);
      throw error;
    }
  }

  private async getRawResponse(userQuery: string): Promise<string> {
    try {
      console.log('=== OPENAI API CALL DETAILS ===');
      
      // Get or create the persistent assistant
      const assistant = await this.getOrCreateAssistant();
      console.log('Using Assistant ID:', assistant.id);
      console.log('Assistant Model:', assistant.model);
      console.log('Assistant Tools:', JSON.stringify(assistant.tools, null, 2));
      console.log('Vector Store IDs:', assistant.tool_resources?.file_search?.vector_store_ids);

      // Create a thread
      const thread = await openai.beta.threads.create();
      console.log('Created Thread ID:', thread.id);

      // Add the message to the thread
      const messagePayload = {
        role: "user" as const,
        content: userQuery
      };
      console.log('=== MESSAGE PAYLOAD ===');
      console.log(JSON.stringify(messagePayload, null, 2));
      
      await openai.beta.threads.messages.create(thread.id, messagePayload);

      // Run the assistant with polling
      const runPayload = {
        assistant_id: assistant.id,
        instructions: "Please search through all documents in the vector store to find information relevant to this query. If information spans multiple documents, please synthesize the information and indicate which documents contain the relevant details."
      };
      console.log('=== RUN PAYLOAD ===');
      console.log(JSON.stringify(runPayload, null, 2));
      
      const run = await openai.beta.threads.runs.createAndPoll(thread.id, runPayload);

      console.log('Run Status:', run.status);
      console.log('Run Details:', JSON.stringify(run, null, 2));

      if (run.status === 'completed') {
        const messages = await openai.beta.threads.messages.list(thread.id);
        console.log('=== OPENAI RESPONSE MESSAGES ===');
        console.log('Total Messages:', messages.data.length);
        
        // Get the most recent assistant message (should be first in the list)
        const assistantMessages = messages.data.filter(msg => msg.role === 'assistant');
        console.log('Assistant Messages Found:', assistantMessages.length);
        
        if (assistantMessages.length > 0) {
          const assistantMessage = assistantMessages[0]; // Most recent first
          console.log('Message Content Type:', assistantMessage.content[0]?.type);
          console.log('=== ASSISTANT MESSAGE CONTENT ===');
          console.log('Content blocks:', assistantMessage.content.length);
          
          if (assistantMessage.content[0] && assistantMessage.content[0].type === 'text') {
            const content = assistantMessage.content[0].text.value;
            console.log('Extracted Content Length:', content.length);
            console.log('Content Preview:', content.substring(0, 300));
            console.log('=== END CONTENT PREVIEW ===');
            
            return content;
          } else {
            console.log('Unexpected content type:', assistantMessage.content[0]?.type);
            console.log('Full content:', JSON.stringify(assistantMessage.content, null, 2));
          }
        } else {
          console.log('No assistant messages found');
          console.log('All messages:', messages.data.map(m => ({ role: m.role, content_type: m.content[0]?.type })));
        }
      }
      
      throw new Error(`OpenAI assistant run failed with status: ${run.status}`);
    } catch (error) {
      console.error('Error in cross-document getRawResponse:', error);
      throw error;
    }
  }

  async processCrossDocumentQuery(
    requestType: string,
    requestId: number,
    userId: number,
    query: string,
    documentIds?: number[]
  ): Promise<{
    success: boolean;
    answer?: string;
    error?: string;
    documentCount?: number;
  }> {
    try {
      console.log('=== CROSS-DOCUMENT QUERY DEBUG ===');
      console.log('Request Type:', requestType);
      console.log('Request ID:', requestId);
      console.log('User ID:', userId);
      console.log('Original Query:', query);
      console.log('Document IDs Filter:', documentIds);
      
      // Get all documents for this request
      let documents = await storage.getDocumentsByRequest(requestType, requestId);
      console.log('All Documents Found:', documents.length);
      console.log('Document Details:', documents.map(d => ({ id: d.id, name: d.originalName, hasAnalysis: !!d.analysisResult })));
      
      if (documents.length === 0) {
        return {
          success: false,
          error: 'No documents found for this request'
        };
      }

      // Filter to selected documents if documentIds are provided
      if (documentIds && documentIds.length > 0) {
        console.log('Filtering documents to selected IDs:', documentIds);
        documents = documents.filter(doc => documentIds.includes(doc.id));
        console.log('Documents after filtering:', documents.length);
        console.log('Filtered Document Details:', documents.map(d => ({ id: d.id, name: d.originalName })));
        
        if (documents.length === 0) {
          return {
            success: false,
            error: 'None of the selected documents are available for this request'
          };
        }
      }

      // Count documents that are ready for AI analysis
      const readyDocuments = documents.filter(doc => {
        const analysisResult = doc.analysisResult ? JSON.parse(doc.analysisResult) : null;
        return analysisResult && analysisResult.openai_file_id;
      });

      console.log('Ready Documents (with OpenAI file IDs):', readyDocuments.length);
      console.log('Ready Document Details:', readyDocuments.map(d => {
        const analysis = JSON.parse(d.analysisResult || '{}');
        return { 
          id: d.id, 
          name: d.originalName, 
          openai_file_id: analysis.openai_file_id 
        };
      }));

      if (readyDocuments.length === 0) {
        return {
          success: false,
          error: 'No documents are ready for AI analysis. Please ensure documents are processed first.'
        };
      }

      // Create a comprehensive query that mentions specific documents to search
      const documentNames = readyDocuments.map(doc => doc.fileName || doc.originalName).join(', ');
      const openaiFileIds = readyDocuments.map(doc => {
        const analysis = JSON.parse(doc.analysisResult || '{}');
        return analysis.openai_file_id;
      }).filter(Boolean);
      
      const enhancedQuery = `
I have ${readyDocuments.length} specific documents that I want you to search: ${documentNames}

Please search ONLY within these ${readyDocuments.length} documents to answer the following question: ${query}

Important: Focus your search exclusively on the documents I mentioned above. Do not use information from any other documents in the vector store. If the answer requires information from multiple of these specific documents, please synthesize the information and clearly indicate which of these documents contain the relevant details.

Document names to search: ${documentNames}
OpenAI File IDs: ${openaiFileIds.join(', ')}
      `.trim();

      console.log('=== ENHANCED QUERY SENT TO OPENAI ===');
      console.log(enhancedQuery);
      console.log('=== END ENHANCED QUERY ===');

      // Get response from OpenAI
      const answer = await this.getRawResponse(enhancedQuery);

      // Save the query and response to database
      await storage.saveCrossDocumentQuery({
        requestType,
        requestId,
        userId,
        query,
        response: answer,
        documentCount: readyDocuments.length
      });

      return {
        success: true,
        answer,
        documentCount: readyDocuments.length
      };

    } catch (error) {
      console.error('Error processing cross-document query:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export const crossDocumentQueryService = new CrossDocumentQueryService();