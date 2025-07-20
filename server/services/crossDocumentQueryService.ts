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

  private async getRawResponse(userQuery: string, vectorStoreId: string = VECTOR_STORE_ID, openaiFileIds?: string[], previousResponseId?: string): Promise<{text: string, metadata: any}> {
    try {
      console.log('=== OPENAI RESPONSES API CALL DETAILS ===');
      console.log('Using Vector Store ID:', vectorStoreId);
      console.log('Query:', userQuery);
      
      // Use OpenAI Responses API with proper file_id filtering structure
      const fileSearchTool: any = {
        type: "file_search",
        vector_store_ids: [vectorStoreId]
      };
      
      // Add file ID filtering if specific files are requested
      if (openaiFileIds && openaiFileIds.length > 0) {
        if (openaiFileIds.length === 1) {
          // Single file filtering
          fileSearchTool.filters = {
            type: "eq",
            key: "file_id",
            value: openaiFileIds[0]
          };
          console.log('Using single file ID filtering for:', openaiFileIds[0]);
        } else {
          // Multiple files filtering with OR logic
          fileSearchTool.filters = {
            type: "or",
            filters: openaiFileIds.map(fileId => ({
              type: "eq",
              key: "file_id",
              value: fileId
            }))
          };
          console.log('Using multiple file ID filtering for:', openaiFileIds);
        }
      } else {
        console.log('Searching all files in vector store');
      }
      
      const responsePayload: any = {
        model: "gpt-4o",
        tools: [fileSearchTool],
        input: userQuery
      };

      // Add previous response ID for conversation continuity
      if (previousResponseId) {
        responsePayload.previous_response_id = previousResponseId;
        console.log('Using previous response ID for context:', previousResponseId);
      }
      
      console.log('=== RESPONSES API PAYLOAD ===');
      console.log(JSON.stringify(responsePayload, null, 2));
      
      // Test if this format works
      console.log('Attempting OpenAI Responses API call...');
      const startTime = Date.now();
      const response = await openai.responses.create(responsePayload);
      const processingTime = Date.now() - startTime;
      
      console.log('=== OPENAI RESPONSES API RESPONSE ===');
      console.log('Response ID:', response.id);
      console.log('Model:', response.model);
      console.log('Usage:', JSON.stringify(response.usage, null, 2));
      console.log('Processing Time:', processingTime + 'ms');
      
      const responseText = response.output_text;
      console.log('Output Text Length:', responseText?.length || 0);
      console.log('Content Preview:', responseText ? responseText.substring(0, 300) + '...' : 'No content');
      console.log('=== END RESPONSES API RESPONSE ===');
      
      // Return response data with metadata
      return {
        text: responseText || 'No response received from document search',
        metadata: {
          openaiResponseId: response.id,
          openaiModel: response.model,
          inputTokens: response.usage?.input_tokens || 0,
          outputTokens: response.usage?.output_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
          processingTimeMs: processingTime
        }
      };
    } catch (error) {
      console.error('Error in Responses API call:', error);
      
      // Fallback to Assistant API if Responses API fails
      console.log('Falling back to Assistant API...');
      const fallbackResult = await this.fallbackToAssistantAPI(userQuery, openaiFileIds);
      return {
        text: fallbackResult,
        metadata: {
          openaiResponseId: null,
          openaiModel: 'fallback-assistant-api',
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          processingTimeMs: 0
        }
      };
    }
  }

  private async fallbackToAssistantAPI(userQuery: string, openaiFileIds?: string[]): Promise<string> {
    try {
      // Get or create the persistent assistant
      const assistant = await this.getOrCreateAssistant();
      console.log('Fallback: Using Assistant ID:', assistant.id);

      // Create a thread
      const thread = await openai.beta.threads.create();

      // Create message with file attachments for document-specific searches
      const messageContent: any = {
        role: "user",
        content: userQuery
      };
      
      // If specific files are requested, attach them to enable precise filtering
      if (openaiFileIds && openaiFileIds.length > 0) {
        messageContent.attachments = openaiFileIds.map(fileId => ({
          file_id: fileId,
          tools: [{ type: "file_search" }]
        }));
        console.log('Fallback: Attaching specific files for precise document filtering:', openaiFileIds);
      }

      // Add the message to the thread
      await openai.beta.threads.messages.create(thread.id, messageContent);

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

      // Get previous response ID for conversation continuity
      const previousResponseId = await storage.getLastResponseId(requestType, requestId, userId);
      if (previousResponseId) {
        console.log('Found previous response ID for context:', previousResponseId);
      } else {
        console.log('No previous response ID found - starting new conversation');
      }

      // Try Assistant API first due to better search accuracy for financial documents
      console.log('Using Assistant API for improved document search accuracy...');
      try {
        const assistantResult = await this.fallbackToAssistantAPI(enhancedQuery, openaiFileIds);
        const responseData = {
          text: assistantResult,
          metadata: {
            openaiResponseId: null,
            openaiModel: 'assistant-api-primary',
            inputTokens: 0,
            outputTokens: 0,
            totalTokens: 0,
            processingTimeMs: 0
          }
        };
        
        // Only use Responses API if Assistant API fails
        if (!assistantResult || assistantResult.includes('unable to find') || assistantResult.includes('couldn\'t find')) {
          console.log('Assistant API returned generic response, trying Responses API...');
          const responsesResult = await this.getRawResponse(enhancedQuery, VECTOR_STORE_ID, openaiFileIds, previousResponseId);
          if (responsesResult.text && !responsesResult.text.includes('unable to find')) {
            return responsesResult;
          }
        }
        
        // Save the query and response to database with metadata
        await storage.saveCrossDocumentQuery({
          requestType,
          requestId,
          userId,
          query,
          response: responseData.text,
          documentCount: readyDocuments.length,
          openaiResponseId: responseData.metadata.openaiResponseId,
          openaiModel: responseData.metadata.openaiModel,
          inputTokens: responseData.metadata.inputTokens,
          outputTokens: responseData.metadata.outputTokens,
          totalTokens: responseData.metadata.totalTokens,
          processingTimeMs: responseData.metadata.processingTimeMs
        });

        return {
          success: true,
          answer: responseData.text,
          documentCount: readyDocuments.length
        };
        
      } catch (error) {
        console.error('Assistant API failed, falling back to Responses API:', error);
        const responsesResult = await this.getRawResponse(enhancedQuery, VECTOR_STORE_ID, openaiFileIds, previousResponseId);
        
        // Save the query and response to database with metadata
        await storage.saveCrossDocumentQuery({
          requestType,
          requestId,
          userId,
          query,
          response: responsesResult.text,
          documentCount: readyDocuments.length,
          openaiResponseId: responsesResult.metadata.openaiResponseId,
          openaiModel: responsesResult.metadata.openaiModel,
          inputTokens: responsesResult.metadata.inputTokens,
          outputTokens: responsesResult.metadata.outputTokens,
          totalTokens: responsesResult.metadata.totalTokens,
          processingTimeMs: responsesResult.metadata.processingTimeMs
        });

        return {
          success: true,
          answer: responsesResult.text,
          documentCount: readyDocuments.length
        };
      }
        userId,
        query,
        response: responseData.text,
        documentCount: readyDocuments.length,
        openaiResponseId: responseData.metadata.openaiResponseId,
        openaiModel: responseData.metadata.openaiModel,
        inputTokens: responseData.metadata.inputTokens,
        outputTokens: responseData.metadata.outputTokens,
        totalTokens: responseData.metadata.totalTokens,
        processingTimeMs: responseData.metadata.processingTimeMs
      });

      return {
        success: true,
        answer: responseData.text,
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