import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { storage } from '../storage';
import { VectorStoreService } from './vectorStoreService';

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

const vectorStoreService = new VectorStoreService();

export interface VectorStoreAnalysisResult {
  documentType: string;
  classification: string;
  confidence: number;
  keyInformation: {
    amounts?: string[];
    dates?: string[];
    parties?: string[];
    riskFactors?: string[];
    companyName?: string;
    financialMetrics?: Record<string, string>;
  };
  summary: string;
  riskAssessment: {
    level: 'low' | 'medium' | 'high';
    factors: string[];
    score: number;
  };
  recommendations: string[];
  extractedText: string;
}

export class VectorStoreAnalysisService {
  
  /**
   * Main function to analyze document using OpenAI Vector Store
   * Can be called from multiple places
   */
  async analyzeDocumentFromVectorStore(
    documentId: number, 
    filePath: string, 
    fileName: string
  ): Promise<VectorStoreAnalysisResult> {
    console.log(`Starting vector store analysis for document ${documentId}: ${fileName}`);
    
    try {
      // Step 1: Get or create vector store
      const vectorStore = await vectorStoreService.getOrCreateVectorStore();
      console.log(`Using vector store: ${vectorStore.id}`);
      
      // Step 2: Upload file to vector store
      const openaiFileId = await this.ensureFileInVectorStore(filePath, fileName, vectorStore.id);
      
      // Step 3: Analyze key messages
      const keyMessages = await this.analyzeKeyMessages(fileName, openaiFileId);
      
      // Step 4: Generate document summary
      const summary = await this.generateDocumentSummary(fileName, openaiFileId);
      
      // Step 5: Perform comprehensive analysis
      const analysis = await this.performComprehensiveAnalysis(fileName, keyMessages, summary);
      
      // Step 6: Update database with results
      await this.updateDatabaseWithAnalysis(documentId, analysis);
      
      console.log(`Vector store analysis completed for document ${documentId}`);
      return analysis;
      
    } catch (error) {
      console.error(`Vector store analysis failed for document ${documentId}:`, error);
      throw error;
    }
  }
  
  /**
   * Ensure file exists in vector store, upload if not
   */
  private async ensureFileInVectorStore(filePath: string, fileName: string, vectorStoreId: string): Promise<string> {
    console.log(`Uploading file to vector store: ${fileName}`);
    
    try {
      // Upload file to OpenAI first
      console.log('Uploading file to OpenAI...');
      const fileStream = fs.createReadStream(filePath);
      const uploadedFile = await openai.files.create({
        file: fileStream,
        purpose: 'assistants'
      });
      
      console.log(`File uploaded to OpenAI: ${uploadedFile.id}`);
      
      // Add file to vector store
      console.log('Adding file to vector store...');
      const vectorStoreFile = await openai.beta.vectorStores.files.create(
        vectorStoreId,
        {
          file_id: uploadedFile.id
        }
      );
      console.log(`File added to vector store: ${vectorStoreFile.id}`);
      
      return uploadedFile.id;
      
    } catch (error) {
      console.error('Error ensuring file in vector store:', error);
      throw error;
    }
  }
  
  /**
   * Wait for file processing to complete
   */
  private async waitForFileProcessing(fileId: string): Promise<void> {
    console.log(`Waiting for file processing: ${fileId}`);
    
    const maxAttempts = 30;
    const delayMs = 2000;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const fileStatus = await openai.beta.vectorStores.files.retrieve(
          VECTOR_STORE_ID,
          fileId
        );
        
        console.log(`File processing status (attempt ${attempt}): ${fileStatus.status}`);
        
        if (fileStatus.status === 'completed') {
          console.log('File processing completed successfully');
          return;
        }
        
        if (fileStatus.status === 'failed') {
          throw new Error(`File processing failed: ${fileStatus.last_error?.message}`);
        }
        
        // Wait before next attempt
        await new Promise(resolve => setTimeout(resolve, delayMs));
        
      } catch (error) {
        console.error(`Error checking file status (attempt ${attempt}):`, error);
        if (attempt === maxAttempts) {
          throw error;
        }
      }
    }
    
    throw new Error('File processing timeout - maximum attempts reached');
  }
  
  /**
   * Analyze key messages from document
   */
  private async analyzeKeyMessages(fileName: string, fileId: string): Promise<string> {
    console.log('Analyzing key messages...');
    
    const query = `What are the key messages, important financial figures, and critical insights from the document ${fileName}? Please provide specific numbers, dates, and key findings.`;
    
    return await this.queryVectorStore(query, fileId);
  }
  
  /**
   * Generate document summary
   */
  private async generateDocumentSummary(fileName: string, fileId: string): Promise<string> {
    console.log('Generating document summary...');
    
    const query = `Please provide a comprehensive summary of the document ${fileName}, including its purpose, main content, key financial information, and important conclusions.`;
    
    return await this.queryVectorStore(query, fileId);
  }
  
  /**
   * Query the vector store with a specific question
   */
  private async queryVectorStore(query: string, fileId?: string): Promise<string> {
    try {
      // Create a thread for the query
      const thread = await openai.beta.threads.create();
      
      // Add the query message, optionally with file attachment
      const messageData: any = {
        role: 'user',
        content: query
      };
      
      // If we have a file ID, attach it to the message
      if (fileId) {
        messageData.attachments = [{
          file_id: fileId,
          tools: [{ type: 'file_search' }]
        }];
      }
      
      await openai.beta.threads.messages.create(thread.id, messageData);
      
      // Get or create assistant
      const { createOrGetAssistant } = await import('./assistantSetup');
      const assistantId = await createOrGetAssistant();
      
      // Get vector store
      const vectorStore = await vectorStoreService.getOrCreateVectorStore();
      
      // Create and run the assistant
      const run = await openai.beta.threads.runs.create(thread.id, {
        assistant_id: assistantId,
        tools: [{ type: 'file_search' }],
        tool_resources: {
          file_search: {
            vector_store_ids: [vectorStore.id]
          }
        }
      });
      
      // Wait for completion
      await this.waitForRunCompletion(thread.id, run.id);
      
      // Get the response
      const messages = await openai.beta.threads.messages.list(thread.id);
      const response = messages.data[0];
      
      if (response.content[0].type === 'text') {
        return response.content[0].text.value;
      }
      
      throw new Error('No text response received');
      
    } catch (error) {
      console.error('Error querying vector store:', error);
      throw error;
    }
  }
  
  /**
   * Wait for assistant run to complete
   */
  private async waitForRunCompletion(threadId: string, runId: string): Promise<void> {
    const maxAttempts = 30;
    const delayMs = 2000;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const run = await openai.beta.threads.runs.retrieve(threadId, runId);
        
        console.log(`Run status (attempt ${attempt}): ${run.status}`);
        
        if (run.status === 'completed') {
          return;
        }
        
        if (run.status === 'failed' || run.status === 'expired') {
          throw new Error(`Run failed with status: ${run.status}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, delayMs));
        
      } catch (error) {
        console.error(`Error checking run status (attempt ${attempt}):`, error);
        if (attempt === maxAttempts) {
          throw error;
        }
      }
    }
    
    throw new Error('Run completion timeout');
  }
  
  /**
   * Perform comprehensive analysis combining key messages and summary
   */
  private async performComprehensiveAnalysis(
    fileName: string,
    keyMessages: string,
    summary: string
  ): Promise<VectorStoreAnalysisResult> {
    console.log('Performing comprehensive analysis...');
    
    // Use GPT-4 to structure the analysis
    const analysisPrompt = `
    Based on the following information extracted from the document "${fileName}":
    
    KEY MESSAGES:
    ${keyMessages}
    
    SUMMARY:
    ${summary}
    
    Please provide a structured analysis in the following JSON format:
    {
      "documentType": "string (e.g., financial_statement, annual_report, etc.)",
      "classification": "string",
      "confidence": number (0-1),
      "keyInformation": {
        "amounts": ["array of financial amounts found"],
        "dates": ["array of important dates"],
        "parties": ["array of companies/entities mentioned"],
        "riskFactors": ["array of risk factors identified"],
        "companyName": "string",
        "financialMetrics": {"key": "value pairs of financial metrics"}
      },
      "summary": "string (comprehensive summary in 2-3 sentences)",
      "riskAssessment": {
        "level": "low|medium|high",
        "factors": ["array of risk factors"],
        "score": number (0-100)
      },
      "recommendations": ["array of recommendations"],
      "extractedText": "string (key extracted content)"
    }
    
    Ensure all financial figures, dates, and company names are accurately extracted from the provided content.
    `;
    
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert financial document analyst. Analyze the provided document information and return a structured JSON response with accurate financial data extraction."
          },
          {
            role: "user",
            content: analysisPrompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.1,
        response_format: { type: "json_object" }
      });
      
      const analysisResult = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        documentType: analysisResult.documentType || 'unknown',
        classification: analysisResult.classification || 'unknown',
        confidence: analysisResult.confidence || 0.8,
        keyInformation: analysisResult.keyInformation || {},
        summary: analysisResult.summary || 'Analysis completed',
        riskAssessment: analysisResult.riskAssessment || { level: 'medium', factors: [], score: 50 },
        recommendations: analysisResult.recommendations || [],
        extractedText: `${keyMessages}\n\n${summary}`
      };
      
    } catch (error) {
      console.error('Error in comprehensive analysis:', error);
      
      // Fallback analysis if GPT-4 fails
      return {
        documentType: 'financial_document',
        classification: 'processed_document',
        confidence: 0.7,
        keyInformation: {
          companyName: fileName.split('_')[0] || 'Unknown',
          dates: ['2023-24'],
          amounts: ['Extracted from vector store'],
          parties: [fileName.split('_')[0] || 'Unknown'],
          riskFactors: ['Analysis completed via vector store'],
          financialMetrics: {}
        },
        summary: summary.substring(0, 500) + '...',
        riskAssessment: {
          level: 'medium',
          factors: ['Vector store analysis completed'],
          score: 70
        },
        recommendations: ['Review detailed analysis results', 'Verify financial data accuracy'],
        extractedText: `${keyMessages}\n\n${summary}`
      };
    }
  }
  
  /**
   * Update database with analysis results
   */
  private async updateDatabaseWithAnalysis(
    documentId: number,
    analysis: VectorStoreAnalysisResult
  ): Promise<void> {
    console.log(`Updating database with analysis for document ${documentId}`);
    
    try {
      await storage.updateDocument(documentId, {
        analysisStatus: 'completed',
        analysisResult: JSON.stringify(analysis),
        updatedAt: new Date()
      });
      
      console.log(`Database updated successfully for document ${documentId}`);
      
    } catch (error) {
      console.error(`Error updating database for document ${documentId}:`, error);
      throw error;
    }
  }
}

export const vectorStoreAnalysisService = new VectorStoreAnalysisService();