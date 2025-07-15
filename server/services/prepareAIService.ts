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
      
      // Step 4: Add file to vector store using file_batches (Python equivalent)
      console.log('Adding file to vector store using file_batches...');
      const fileBatch = await openai.vectorStores.fileBatches.createAndPoll(
        vectorStore.id,
        {
          file_ids: [uploadedFile.id]
        }
      );
      
      console.log(`File batch created and processed: ${fileBatch.id}, status: ${fileBatch.status}`);
      
      // Step 5: Check final status and update document
      if (fileBatch.status === 'completed') {
        await storage.updateDocument(documentId, {
          analysisStatus: 'completed',
          analysisResult: JSON.stringify({
            openai_file_id: uploadedFile.id,
            vector_store_id: vectorStore.id,
            file_batch_id: fileBatch.id,
            status: 'processed'
          })
        });
      } else {
        throw new Error(`File batch processing failed with status: ${fileBatch.status}`);
      }
      
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
  

}

export const prepareAIService = new PrepareAIService();