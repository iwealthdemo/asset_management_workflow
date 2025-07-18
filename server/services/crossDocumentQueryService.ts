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
      console.log('Sending cross-document query to OpenAI:', userQuery);
      
      // Get or create the persistent assistant
      const assistant = await this.getOrCreateAssistant();

      // Create a thread
      const thread = await openai.beta.threads.create();

      // Add the message to the thread
      await openai.beta.threads.messages.create(thread.id, {
        role: "user",
        content: userQuery
      });

      // Run the assistant with polling
      const run = await openai.beta.threads.runs.createAndPoll(thread.id, {
        assistant_id: assistant.id,
        instructions: "Please search through all documents in the vector store to find information relevant to this query. If information spans multiple documents, please synthesize the information and indicate which documents contain the relevant details."
      });

      if (run.status === 'completed') {
        const messages = await openai.beta.threads.messages.list(thread.id);
        const assistantMessage = messages.data.find(msg => msg.role === 'assistant');
        
        if (assistantMessage && assistantMessage.content[0].type === 'text') {
          const content = assistantMessage.content[0].text.value;
          console.log('Cross-document response received:', content ? content.substring(0, 200) + '...' : 'No content');
          
          return content;
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
    query: string
  ): Promise<{
    success: boolean;
    answer?: string;
    error?: string;
    documentCount?: number;
  }> {
    try {
      // Get all documents for this request
      const documents = await storage.getDocumentsByRequest(requestType, requestId);
      
      if (documents.length === 0) {
        return {
          success: false,
          error: 'No documents found for this request'
        };
      }

      // Count documents that are ready for AI analysis
      const readyDocuments = documents.filter(doc => {
        const analysisResult = doc.analysisResult ? JSON.parse(doc.analysisResult) : null;
        return analysisResult && analysisResult.openai_file_id;
      });

      if (readyDocuments.length === 0) {
        return {
          success: false,
          error: 'No documents are ready for AI analysis. Please ensure documents are processed first.'
        };
      }

      // Create a comprehensive query that mentions we're searching across multiple documents
      const enhancedQuery = `
I have ${readyDocuments.length} documents uploaded to the vector store for this ${requestType} request. 
Please search across all these documents to answer the following question: ${query}

If the answer requires information from multiple documents, please synthesize the information and indicate which documents contain the relevant details. If possible, include document names or references in your response.
      `.trim();

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