# File Transfer Integration Examples

## Problem: Cross-Service File Handling
When the Investment Portal uploads files and the LLM API service needs to process them, we have several approaches depending on your deployment architecture.

## Solution Options

### Option 1: Base64 File Transfer (Recommended)
**Best for**: Separate deployments, different servers, cloud services

**Investment Portal Side:**
```javascript
import fs from 'fs';
import path from 'path';

// After user uploads file in Investment Portal
app.post('/api/documents/upload', upload.single('file'), async (req, res) => {
    try {
        const filePath = req.file.path;
        
        // Read file and convert to base64
        const fileBuffer = fs.readFileSync(filePath);
        const fileContent = fileBuffer.toString('base64');
        const filename = req.file.originalname;
        
        // Call LLM service with base64 content
        const llmResponse = await fetch('https://llm-service.replit.app/documents/upload-and-vectorize', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': process.env.LLM_SERVICE_API_KEY
            },
            body: JSON.stringify({
                file_content: fileContent,
                filename: filename,
                attributes: {
                    user_id: req.user.id,
                    request_id: req.body.request_id,
                    source: 'investment_portal'
                }
            })
        });
        
        const result = await llmResponse.json();
        
        if (result.success) {
            // Save OpenAI file ID to database
            await storage.updateDocument(req.body.document_id, {
                openai_file_id: result.file.id,
                processing_status: 'completed'
            });
        }
        
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
```

**LLM Service Side** (already implemented):
```python
@app.route('/documents/upload-and-vectorize', methods=['POST'])
def upload_and_vectorize():
    data = request.get_json()
    file_content = data.get('file_content')  # Base64 string
    filename = data.get('filename')
    
    # Service handles base64 decoding and temporary file creation
    result = document_service.upload_and_vectorize(
        file_content=file_content,
        filename=filename,
        custom_attributes=data.get('attributes', {})
    )
    return jsonify(result)
```

### Option 2: Shared File Storage
**Best for**: Same cloud provider, shared network storage

```javascript
// Investment Portal - save to shared location
const sharedPath = `/shared/uploads/${filename}`;
fs.copyFileSync(tempPath, sharedPath);

// Call LLM service with shared path
const response = await fetch('https://llm-service.replit.app/documents/upload-and-vectorize', {
    method: 'POST',
    headers: { 'X-API-Key': process.env.LLM_SERVICE_API_KEY },
    body: JSON.stringify({
        file_path: sharedPath,
        attributes: { user_id: user.id }
    })
});
```

### Option 3: Direct Upload Endpoint
**Best for**: Simple integration, small files

```javascript
// LLM Service provides direct upload endpoint
const formData = new FormData();
formData.append('file', fileStream);
formData.append('attributes', JSON.stringify(attributes));

const response = await fetch('https://llm-service.replit.app/documents/upload-direct', {
    method: 'POST',
    headers: { 'X-API-Key': process.env.LLM_SERVICE_API_KEY },
    body: formData
});
```

## Implementation Recommendations

### For Replit Deployments (Base64 Approach)
```javascript
// In your Investment Portal background job service
export class BackgroundJobService {
    async processDocumentWithLLMService(job) {
        try {
            const document = await storage.getDocument(job.document_id);
            const filePath = path.join('./uploads', document.filename);
            
            // Convert to base64 and send to LLM service
            const fileBuffer = fs.readFileSync(filePath);
            const fileContent = fileBuffer.toString('base64');
            
            const llmResult = await llmApiClient.uploadAndVectorizeBase64(
                filePath, 
                {
                    user_id: job.user_id,
                    request_id: job.request_id,
                    document_id: job.document_id,
                    source: 'investment_portal'
                }
            );
            
            if (llmResult.success) {
                // Update document with OpenAI file ID
                await storage.updateDocumentAnalysis(job.document_id, {
                    openai_file_id: llmResult.file.id,
                    status: 'processed',
                    metadata: llmResult.applied_attributes
                });
            }
            
            return llmResult;
        } catch (error) {
            console.error('Background job processing error:', error);
            throw error;
        }
    }
}
```

### Environment Configuration
```bash
# Investment Portal .env
LLM_SERVICE_URL=https://your-llm-service.replit.app
LLM_SERVICE_API_KEY=your-secure-api-key
LLM_SERVICE_TIMEOUT=300000  # 5 minutes for large files

# LLM Service .env  
SERVICE_API_KEY=your-secure-api-key
OPENAI_API_KEY=sk-...
DEFAULT_VECTOR_STORE_ID=vs-...
```

## Error Handling & Fallbacks

```javascript
export class LLMServiceClient {
    async uploadWithFallback(filePath, attributes) {
        // Try base64 method first
        try {
            const result = await this.uploadAndVectorizeBase64(filePath, attributes);
            if (result.success) return result;
        } catch (error) {
            console.warn('Base64 upload failed, trying path method:', error);
        }
        
        // Fallback to path method (if shared storage available)
        try {
            return await this.uploadAndVectorizePath(filePath, attributes);
        } catch (error) {
            console.error('All upload methods failed:', error);
            return { success: false, error: 'Upload failed on all methods' };
        }
    }
}
```

## Performance Considerations

### File Size Limits
- **Base64**: ~35MB max (due to encoding overhead)
- **Shared storage**: No size limit
- **Direct upload**: Depends on server configuration

### Optimization Tips
```javascript
// Compress large files before base64 encoding
import zlib from 'zlib';

function compressAndEncode(filePath) {
    const fileBuffer = fs.readFileSync(filePath);
    const compressed = zlib.gzipSync(fileBuffer);
    return compressed.toString('base64');
}

// LLM service should decompress
function decodeAndDecompress(base64Data) {
    const compressed = Buffer.from(base64Data, 'base64');
    return zlib.gunzipSync(compressed);
}
```

## Summary

**For your architecture**, I recommend the **Base64 approach** because:

1. ✅ Works with separate Replit deployments
2. ✅ No shared storage requirements  
3. ✅ Simple to implement and debug
4. ✅ Handles authentication cleanly
5. ✅ Works across different cloud providers

The LLM service I created already supports both file path and base64 methods, so you can choose based on your deployment needs.