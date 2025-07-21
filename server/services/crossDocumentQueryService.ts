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

  private async getRawResponse(userQuery: string, vectorStoreId: string = VECTOR_STORE_ID, openaiFileIds?: string[], previousResponseId?: string, fullFilenames?: string[]): Promise<{text: string, metadata: any}> {
    try {
      console.log('=== OPENAI RESPONSES API CALL DETAILS ===');
      console.log('Using Vector Store ID:', vectorStoreId);
      console.log('Query:', userQuery);
      
      // Use OpenAI Responses API with proper file_id filtering structure
      const fileSearchTool: any = {
        type: "file_search",
        vector_store_ids: [vectorStoreId]
      };
      
      // Add original_filename filtering using full filenames with vector store prefix
      if (fullFilenames && fullFilenames.length > 0) {
        if (fullFilenames.length === 1) {
          // Single file filtering using original_filename with full filename (vector store prefix)
          fileSearchTool.filters = {
            type: "eq",
            key: "original_filename",
            value: fullFilenames[0]
          };
          console.log('Using single original_filename filtering for:', fullFilenames[0]);
        } else {
          // Multiple files filtering with OR logic using original_filename
          fileSearchTool.filters = {
            type: "or",
            filters: fullFilenames.map(fileName => ({
              type: "eq",
              key: "original_filename",
              value: fileName
            }))
          };
          console.log('Using multiple original_filename filtering for:', fullFilenames);
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

      // Create a comprehensive query that mentions specific documents to search using FULL filenames (with vector store prefix)
      const fullDocumentNames = readyDocuments.map(doc => doc.fileName).join(', ');
      const documentDetails = readyDocuments.map(doc => {
        const analysis = JSON.parse(doc.analysisResult || '{}');
        return {
          id: doc.id,
          originalName: doc.originalName,
          fileName: doc.fileName, // This includes the vector store prefix
          openaiFileId: analysis.openai_file_id
        };
      });
      
      const openaiFileIds = documentDetails.map(doc => doc.openaiFileId).filter(Boolean);
      const fullFilenames = documentDetails.map(doc => doc.fileName).filter(Boolean);
      
      // Create detailed document list for API call using full filenames with vector store prefix
      const documentsList = documentDetails.map(doc => 
        `- "${doc.fileName}" (Original: "${doc.originalName}", OpenAI File ID: ${doc.openaiFileId})`
      ).join('\n');
      
      const enhancedQuery = `
I want you to search within these ${readyDocuments.length} specific documents (using their full filenames with vector store prefix):

${documentsList}

Please search ONLY within these documents to answer the following question: ${query}

Full Document Filenames (with vector store prefix):
${fullDocumentNames}

Important instructions:
1. Focus your search exclusively on the documents listed above by their full filenames (including vector store prefix)
2. Do not use information from any other documents in the vector store
3. If the answer requires information from multiple documents, synthesize the information and clearly indicate which full filename contains each piece of information
4. When referencing sources, use the full filenames with vector store prefix that I provided above
5. Ensure your search is limited to these specific documents: ${fullDocumentNames}
      `.trim();

      console.log('=== ENHANCED QUERY WITH FULL FILENAMES (INCLUDING VECTOR STORE PREFIX) ===');
      console.log('Full Document Filenames Being Sent to API:');
      documentDetails.forEach(doc => {
        console.log(`  - Full filename: "${doc.fileName}"`);
        console.log(`    Original filename: "${doc.originalName}"`);
        console.log(`    Document ID: ${doc.id}, OpenAI File ID: ${doc.openaiFileId}`);
      });
      console.log('\nFull Enhanced Query:');
      console.log(enhancedQuery);
      console.log('=== END ENHANCED QUERY ===');

      // Get previous response ID for conversation continuity
      const previousResponseId = await storage.getLastResponseId(requestType, requestId, userId);
      if (previousResponseId) {
        console.log('Found previous response ID for context:', previousResponseId);
      } else {
        console.log('No previous response ID found - starting new conversation');
      }

      // Get response from OpenAI with original_filename filtering and conversation context
      const responseData = await this.getRawResponse(enhancedQuery, VECTOR_STORE_ID, openaiFileIds, previousResponseId, fullFilenames);

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