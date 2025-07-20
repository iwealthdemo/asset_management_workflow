import OpenAI from 'openai';
import { storage } from '../storage';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const VECTOR_STORE_ID = 'vs_687584b54f908191b0a21ffa42948fb5';

export class CrossDocumentQueryService {
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
        console.log('No file ID filtering - searching all documents in vector store');
      }

      // Build the API payload for Responses API
      const payload: any = {
        model: "gpt-4o",
        tools: [fileSearchTool],
        input: userQuery
      };

      // Add conversation context if available
      if (previousResponseId) {
        payload.previous_response_id = previousResponseId;
        console.log('Using previous response ID for context:', previousResponseId);
      }

      console.log('=== RESPONSES API PAYLOAD ===');
      console.log(JSON.stringify(payload, null, 2));

      const startTime = Date.now();
      console.log('Attempting OpenAI Responses API call...');

      // Make the API call using OpenAI Responses API
      const response = await openai.responses.create(payload);
      const processingTime = Date.now() - startTime;

      console.log('=== OPENAI RESPONSES API RESPONSE ===');
      console.log('Response ID:', response.id);
      console.log('Model:', response.model);
      console.log('Usage:', JSON.stringify(response.usage));
      console.log('Processing Time:', processingTime + 'ms');

      const outputText = response.output_text || '';
      console.log('Output Text Length:', outputText.length);
      console.log('Content Preview:', outputText.substring(0, 150) + '...');
      console.log('=== END RESPONSES API RESPONSE ===');

      return {
        text: outputText,
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
      console.error('OpenAI Responses API Error:', error);
      throw new Error(`Failed to get response from OpenAI: ${error.message}`);
    }
  }

  async processQuery(requestType: string, requestId: number, userId: number, query: string, documentIds?: number[]): Promise<any> {
    try {
      console.log('=== CROSS-DOCUMENT QUERY PROCESSING ===');
      console.log('Request Type:', requestType);
      console.log('Request ID:', requestId);
      console.log('User ID:', userId);
      console.log('Query:', query);
      console.log('Document IDs:', documentIds);

      // Get all documents for this request
      const allDocuments = await storage.getDocumentsByRequest(requestType, requestId);
      console.log('All Documents for Request:', allDocuments.map(d => ({ id: d.id, name: d.name, hasAnalysis: d.hasAnalysis })));

      let documentsToQuery = allDocuments;

      // Filter to selected documents if specified
      if (documentIds && documentIds.length > 0) {
        console.log('Filtering documents to selected IDs:', documentIds);
        documentsToQuery = allDocuments.filter(doc => documentIds.includes(doc.id));
        console.log('Documents after filtering:', documentsToQuery.length);
      }

      console.log('Filtered Document Details:', documentsToQuery.map(d => ({ id: d.id, name: d.name })));

      // Only include documents that have been processed and have OpenAI file IDs
      const readyDocuments = documentsToQuery.filter(doc => doc.openai_file_id);
      console.log('Ready Documents (with OpenAI file IDs):', readyDocuments.length);
      console.log('Ready Document Details:', readyDocuments.map(d => ({ id: d.id, name: d.name, openai_file_id: d.openai_file_id })));

      if (readyDocuments.length === 0) {
        return {
          success: false,
          error: 'No processed documents available for analysis. Please ensure documents have been uploaded and processed.'
        };
      }

      // Extract OpenAI file IDs for filtering
      const openaiFileIds = readyDocuments.map(doc => doc.openai_file_id).filter(Boolean);

      // Enhanced query with explicit document context
      const enhancedQuery = `I have ${readyDocuments.length} specific documents that I want you to search: ${readyDocuments.map(d => `${d.id}-${d.name}`).join(', ')}

Please search ONLY within these ${readyDocuments.length} documents to answer the following question: ${query}

Important: Focus your search exclusively on the documents I mentioned above. Do not use information from any other documents in the vector store. If the answer requires information from multiple of these specific documents, please synthesize the information and clearly indicate which of these documents contain the relevant details.

Document names to search: ${readyDocuments.map(d => `${d.id}-${d.name}`).join(', ')}
OpenAI File IDs: ${openaiFileIds.join(', ')}`;

      console.log('=== ENHANCED QUERY SENT TO OPENAI ===');
      console.log(enhancedQuery);
      console.log('=== END ENHANCED QUERY ===');

      // Check for conversation context
      let previousResponseId: string | null = null;
      try {
        previousResponseId = await storage.getLastResponseId(userId, requestType, requestId);
        if (previousResponseId) {
          console.log('Found previous response ID for context:', previousResponseId);
        } else {
          console.log('No previous response ID found - starting new conversation');
        }
      } catch (error) {
        console.log('Error getting previous response ID:', error);
        previousResponseId = null;
      }

      // Get response from OpenAI Responses API with file ID filtering and conversation context
      const responseData = await this.getRawResponse(enhancedQuery, VECTOR_STORE_ID, openaiFileIds, previousResponseId);

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
      console.error('Error processing cross-document query:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export const crossDocumentQueryService = new CrossDocumentQueryService();