/**
 * LLM API Client Service
 * For integrating with the dedicated LLM API service from Investment Portal
 */

import fs from 'fs';

export class LLMApiClient {
    constructor(baseUrl, apiKey) {
        this.baseUrl = baseUrl;
        this.apiKey = apiKey;
        this.timeout = 300000; // 5 minutes for large files
    }

    /**
     * Upload file and vectorize - Base64 method
     * Best for cross-application file transfer
     */
    async uploadAndVectorizeBase64(filePath, attributes = {}) {
        try {
            // Read file and encode to base64
            const fileBuffer = fs.readFileSync(filePath);
            const fileContent = fileBuffer.toString('base64');
            const filename = path.basename(filePath);

            const response = await fetch(`${this.baseUrl}/documents/upload-and-vectorize`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': this.apiKey
                },
                body: JSON.stringify({
                    file_content: fileContent,
                    filename: filename,
                    attributes: attributes
                }),
                timeout: this.timeout
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('LLM API upload error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Upload file and vectorize - File path method
     * Only works if both services share file system
     */
    async uploadAndVectorizePath(filePath, attributes = {}) {
        try {
            const response = await fetch(`${this.baseUrl}/documents/upload-and-vectorize`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': this.apiKey
                },
                body: JSON.stringify({
                    file_path: filePath,
                    attributes: attributes
                }),
                timeout: this.timeout
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('LLM API upload error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Search documents
     */
    async searchDocuments(query, documentIds = [], context = {}) {
        try {
            const response = await fetch(`${this.baseUrl}/documents/search`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': this.apiKey
                },
                body: JSON.stringify({
                    query: query,
                    document_ids: documentIds,
                    context: context
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('LLM API search error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Analyze document
     */
    async analyzeDocument(documentId, analysisType = 'general', context = {}) {
        try {
            const response = await fetch(`${this.baseUrl}/documents/analyze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': this.apiKey
                },
                body: JSON.stringify({
                    document_id: documentId,
                    analysis_type: analysisType,
                    context: context
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('LLM API analysis error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Generate investment insights
     */
    async getInvestmentInsights(documentIds, analysisFocus = 'general', context = {}) {
        try {
            const response = await fetch(`${this.baseUrl}/analysis/investment-insights`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': this.apiKey
                },
                body: JSON.stringify({
                    document_ids: documentIds,
                    analysis_focus: analysisFocus,
                    context: context
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('LLM API insights error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Document Q&A
     */
    async documentQA(question, documentIds, context = {}) {
        try {
            const response = await fetch(`${this.baseUrl}/chat/document-qa`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': this.apiKey
                },
                body: JSON.stringify({
                    question: question,
                    document_ids: documentIds,
                    context: context
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('LLM API Q&A error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Health check
     */
    async healthCheck() {
        try {
            const response = await fetch(`${this.baseUrl}/health`);
            return await response.json();
        } catch (error) {
            return { status: 'unhealthy', error: error.message };
        }
    }
}

// Export singleton instance
export const llmApiClient = new LLMApiClient(
    process.env.LLM_SERVICE_URL || 'http://localhost:5000',
    process.env.LLM_SERVICE_API_KEY || 'dev-key-change-in-production'
);