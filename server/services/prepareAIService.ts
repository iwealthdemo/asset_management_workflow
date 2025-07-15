import OpenAI from 'openai';
import fs from 'fs';
import { storage } from '../storage';
import { VectorStoreService } from './vectorStoreService';

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

const vectorStoreService = new VectorStoreService();

export class PrepareAIService {
  
  /**
   * Prepare document for AI analysis by uploading to vector store
   * Step 1: Check if file exists in vector store by filename
   * Step 2: If not exists, upload to OpenAI and add to vector store
   * Step 3: Wait for embedding processing to complete
   * Step 4: Update document status to 'processed'
   */
  async prepareDocumentForAI(
    documentId: number,
    filePath: string,
    fileName: string
  ): Promise<{ success: boolean; message: string; fileId?: string }> {
    console.log(`Starting AI preparation for document ${documentId}: ${fileName}`);
    
    try {
      // Update status to processing
      await storage.updateDocument(documentId, {
        analysisStatus: 'processing'
      });
      
      // Step 1: Get or create vector store
      const vectorStore = await vectorStoreService.getOrCreateVectorStore();
      console.log(`Using vector store:`, vectorStore);
      
      if (!vectorStore || !vectorStore.id) {
        throw new Error('Failed to get or create vector store');
      }
      
      // Step 2: Check if file already exists in vector store
      const existingFile = await this.checkFileInVectorStore(vectorStore.id, fileName);
      
      if (existingFile) {
        console.log(`File ${fileName} already exists in vector store with ID: ${existingFile.id}`);
        
        // Update document status to completed
        await storage.updateDocument(documentId, {
          analysisStatus: 'completed',
          analysisResult: JSON.stringify({
            openai_file_id: existingFile.id,
            vector_store_id: vectorStore.id,
            status: 'already_processed'
          })
        });
        
        return {
          success: true,
          message: 'Document already prepared for AI',
          fileId: existingFile.id
        };
      }
      
      // Step 3: Upload file to OpenAI
      console.log('Uploading file to OpenAI...');
      const fileStream = fs.createReadStream(filePath);
      const uploadedFile = await openai.files.create({
        file: fileStream,
        purpose: 'assistants'
      });
      
      console.log(`File uploaded to OpenAI: ${uploadedFile.id}`);
      
      // Step 4: Add file to vector store
      console.log('Adding file to vector store...');
      const vectorStoreFile = await openai.vectorStores.files.create(
        vectorStore.id,
        {
          file_id: uploadedFile.id
        }
      );
      
      console.log(`File added to vector store: ${vectorStoreFile.id}`);
      
      // Step 5: Wait for embedding processing
      console.log(`About to wait for embedding completion with vectorStore.id: ${vectorStore.id} and uploadedFile.id: ${uploadedFile.id}`);
      await this.waitForEmbeddingCompletion(vectorStore.id, uploadedFile.id);
      
      // Step 6: Update document status to completed
      await storage.updateDocument(documentId, {
        analysisStatus: 'completed',
        analysisResult: JSON.stringify({
          openai_file_id: uploadedFile.id,
          vector_store_id: vectorStore.id,
          vector_store_file_id: vectorStoreFile.id,
          status: 'processed'
        })
      });
      
      console.log(`AI preparation completed for document ${documentId}`);
      
      return {
        success: true,
        message: 'Document prepared for AI successfully',
        fileId: uploadedFile.id
      };
      
    } catch (error) {
      console.error(`AI preparation failed for document ${documentId}:`, error);
      
      // Update document status to failed
      await storage.updateDocument(documentId, {
        analysisStatus: 'failed'
      });
      
      throw error;
    }
  }
  
  /**
   * Check if file exists in vector store by filename
   */
  private async checkFileInVectorStore(vectorStoreId: string, fileName: string): Promise<{ id: string } | null> {
    try {
      console.log(`Checking if file ${fileName} exists in vector store ${vectorStoreId}`);
      
      // List files in vector store
      const files = await openai.vectorStores.files.list(vectorStoreId);
      
      // Check each file by getting its details
      for (const file of files.data) {
        try {
          const fileDetails = await openai.files.retrieve(file.id);
          if (fileDetails.filename === fileName) {
            console.log(`Found existing file: ${fileName} with ID: ${file.id}`);
            return { id: file.id };
          }
        } catch (error) {
          console.error(`Error checking file ${file.id}:`, error);
          continue;
        }
      }
      
      console.log(`File ${fileName} not found in vector store`);
      return null;
      
    } catch (error) {
      console.error('Error checking files in vector store:', error);
      return null;
    }
  }
  
  /**
   * Wait for embedding processing to complete
   */
  private async waitForEmbeddingCompletion(vectorStoreId: string, fileId: string): Promise<void> {
    console.log(`Waiting for embedding completion for file ${fileId} in vector store ${vectorStoreId}`);
    console.log(`Debug: vectorStoreId type: ${typeof vectorStoreId}, value: ${vectorStoreId}`);
    console.log(`Debug: fileId type: ${typeof fileId}, value: ${fileId}`);
    
    if (!vectorStoreId || !fileId) {
      throw new Error(`Invalid parameters: vectorStoreId=${vectorStoreId}, fileId=${fileId}`);
    }
    
    const maxAttempts = 60; // 2 minutes max
    const delayMs = 2000; // 2 seconds between checks
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // Check the status of the file in the vector store
        // The fileId here should be the original uploaded file ID, not the vector store file ID
        console.log(`Debug attempt ${attempt}: About to call openai.vectorStores.files.retrieve(${vectorStoreId}, ${fileId})`);
        const fileStatus = await openai.vectorStores.files.retrieve(vectorStoreId, fileId);
        
        console.log(`Embedding status (attempt ${attempt}): ${fileStatus.status}`);
        
        if (fileStatus.status === 'completed') {
          console.log('Embedding processing completed successfully');
          return;
        }
        
        if (fileStatus.status === 'failed') {
          throw new Error(`Embedding processing failed: ${fileStatus.last_error?.message || 'Unknown error'}`);
        }
        
        // Wait before next attempt
        await new Promise(resolve => setTimeout(resolve, delayMs));
        
      } catch (error) {
        console.error(`Error checking embedding status (attempt ${attempt}):`, error);
        
        // If this is the last attempt, throw the error
        if (attempt === maxAttempts) {
          throw new Error(`Embedding processing timeout: ${error.message}`);
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    
    throw new Error('Embedding processing timeout - maximum attempts reached');
  }
}

export const prepareAIService = new PrepareAIService();