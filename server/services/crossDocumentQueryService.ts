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

  private async getRawResponse(userQuery: string, vectorStoreId: string = VECTOR_STORE_ID, openaiFileIds?: string[]): Promise<string> {
    try {
      console.log('=== OPENAI RESPONSES API CALL DETAILS ===');
      console.log('Using Vector Store ID:', vectorStoreId);
      console.log('Query:', userQuery);
      
      // Use OpenAI Responses API with file_search tool and optional file ID filtering
      const fileSearchTool: any = {
        type: "file_search",
        vector_store_ids: [vectorStoreId]
      };
      
      // Add file ID filtering if specific files are requested
      if (openaiFileIds && openaiFileIds.length > 0) {
        fileSearchTool.filters = {
          file_id: openaiFileIds
        };
        console.log('Using file ID filtering for:', openaiFileIds);
      } else {
        console.log('No file ID filtering - searching all files in vector store');
      }
      
      const responsePayload = {
        model: "gpt-4o",
        tools: [fileSearchTool],
        input: userQuery
      };
      
      console.log('=== RESPONSES API PAYLOAD ===');
      console.log(JSON.stringify(responsePayload, null, 2));
      
      // Test if this format works
      console.log('Attempting OpenAI Responses API call...');
      const response = await openai.responses.create(responsePayload);
      
      console.log('=== OPENAI RESPONSES API RESPONSE ===');
      console.log('Response ID:', response.id);
      console.log('Model:', response.model);
      console.log('Usage:', JSON.stringify(response.usage, null, 2));
      
      const responseText = response.output_text;
      console.log('Output Text Length:', responseText?.length || 0);
      console.log('Content Preview:', responseText ? responseText.substring(0, 300) + '...' : 'No content');
      console.log('=== END RESPONSES API RESPONSE ===');
      
      return responseText || 'No response received from document search';
    } catch (error) {
      console.error('Error in Responses API call:', error);
      
      // Fallback to Assistant API if Responses API fails
      console.log('Falling back to Assistant API...');
      return await this.fallbackToAssistantAPI(userQuery);
    }
  }

  private async fallbackToAssistantAPI(userQuery: string): Promise<string> {
    try {
      // Get or create the persistent assistant
      const assistant = await this.getOrCreateAssistant();
      console.log('Fallback: Using Assistant ID:', assistant.id);

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
        const assistantMessages = messages.data.filter(msg => msg.role === 'assistant');
        
        if (assistantMessages.length > 0) {
          const assistantMessage = assistantMessages[0];
          if (assistantMessage.content[0] && assistantMessage.content[0].type === 'text') {
            return assistantMessage.content[0].text.value;
          }
        }
      }
      
      throw new Error(`Assistant API fallback failed with status: ${run.status}`);
    } catch (error) {
      console.error('Error in Assistant API fallback:', error);
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

      // Get response from OpenAI with file ID filtering
      const answer = await this.getRawResponse(enhancedQuery, VECTOR_STORE_ID, openaiFileIds);

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