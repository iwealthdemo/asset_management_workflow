"""
Document Service - Handles all document-related operations
"""

import os
import logging
from datetime import datetime
from utils.metadata_extractor import extract_metadata_from_filename

logger = logging.getLogger(__name__)

class DocumentService:
    def __init__(self, openai_client):
        self.client = openai_client
        
    def upload_and_vectorize(self, file_path=None, file_content=None, filename=None, vector_store_id=None, custom_attributes=None):
        """
        Upload file to OpenAI and add to vector store with metadata
        
        Args:
            file_path (str): Path to the file to upload (if file is local)
            file_content (str): Base64 encoded file content (if file is remote)
            filename (str): Original filename (required if using file_content)
            vector_store_id (str): Vector store ID
            custom_attributes (dict): Custom metadata attributes
            
        Returns:
            dict: Result with file info and vector store details
        """
        try:
            # Handle file upload from different sources
            if file_path:
                # Option 1: Local file path
                if not os.path.exists(file_path):
                    return {'success': False, 'error': 'File not found'}
                    
                with open(file_path, 'rb') as file:
                    uploaded_file = self.client.files.create(
                        file=file,
                        purpose='assistants'
                    )
                filename = os.path.basename(file_path)
                
            elif file_content and filename:
                # Option 2: Base64 encoded content
                import base64
                import tempfile
                
                # Decode base64 content
                try:
                    file_bytes = base64.b64decode(file_content)
                except Exception as e:
                    return {'success': False, 'error': f'Invalid base64 content: {str(e)}'}
                
                # Create temporary file
                with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(filename)[1]) as temp_file:
                    temp_file.write(file_bytes)
                    temp_file_path = temp_file.name
                
                try:
                    # Upload to OpenAI
                    with open(temp_file_path, 'rb') as file:
                        uploaded_file = self.client.files.create(
                            file=file,
                            purpose='assistants'
                        )
                finally:
                    # Clean up temporary file
                    os.unlink(temp_file_path)
                    
            else:
                return {'success': False, 'error': 'Either file_path or (file_content + filename) required'}
                
            # Step 2: Extract metadata
            auto_attributes = extract_metadata_from_filename(filename)
            
            # Step 3: Merge all attributes
            file_attributes = {
                'file_size_bytes': str(uploaded_file.bytes),
                'upload_timestamp': str(uploaded_file.created_at),
                'openai_filename': uploaded_file.filename
            }
            
            attributes = {**auto_attributes, **file_attributes, **(custom_attributes or {})}
            attributes['file_id'] = uploaded_file.id
            
            # Step 4: Attach to vector store with attributes
            vector_store_file = self.client.vector_stores.files.create_and_poll(
                vector_store_id=vector_store_id,
                file_id=uploaded_file.id,
                attributes=attributes
            )
            
            return {
                'success': True,
                'file': {
                    'id': uploaded_file.id,
                    'filename': uploaded_file.filename,
                    'bytes': uploaded_file.bytes,
                    'created_at': uploaded_file.created_at,
                    'status': uploaded_file.status
                },
                'vector_store_file': {
                    'id': vector_store_file.id,
                    'status': vector_store_file.status,
                    'usage_bytes': vector_store_file.usage_bytes,
                    'attributes': vector_store_file.attributes
                },
                'applied_attributes': attributes
            }
            
        except Exception as e:
            logger.error(f"Upload and vectorize error: {str(e)}")
            return {'success': False, 'error': str(e)}
            
    def search_documents(self, query, document_ids, vector_store_id, context=None):
        """
        Search across documents using OpenAI Responses API
        
        Args:
            query (str): Search query
            document_ids (list): List of document IDs to search
            vector_store_id (str): Vector store ID
            context (dict): Additional context
            
        Returns:
            dict: Search results with AI response
        """
        try:
            # Prepare file filters
            if document_ids:
                if len(document_ids) == 1:
                    file_filter = {
                        "type": "eq",
                        "key": "file_id", 
                        "value": document_ids[0]
                    }
                else:
                    file_filter = {
                        "type": "or",
                        "filters": [
                            {"type": "eq", "key": "file_id", "value": doc_id}
                            for doc_id in document_ids
                        ]
                    }
            else:
                file_filter = None
                
            # Build tool configuration
            tools = [{
                "type": "file_search",
                "file_search": {
                    "vector_store_ids": [vector_store_id]
                }
            }]
            
            if file_filter:
                tools[0]["file_search"]["file_filter"] = file_filter
                
            # Enhanced instructions
            instructions = f"""
            You are an expert document analyst. Search through the provided documents to answer: {query}
            
            Provide a comprehensive response that includes:
            1. Direct answer to the question
            2. Supporting evidence from the documents
            3. Source references with page numbers when available
            4. Any limitations or uncertainties in the information
            
            Document scope: {"Specific documents" if document_ids else "All documents in vector store"}
            """
            
            # Call OpenAI Responses API
            response = self.client.responses.create(
                model="gpt-4o",
                messages=[{
                    "role": "user", 
                    "content": query
                }],
                instructions=instructions,
                tools=tools,
                temperature=0.3
            )
            
            return {
                'success': True,
                'response': response.choices[0].message.content,
                'model': response.model,
                'usage': {
                    'input_tokens': response.usage.prompt_tokens,
                    'output_tokens': response.usage.completion_tokens,
                    'total_tokens': response.usage.total_tokens
                },
                'search_context': {
                    'query': query,
                    'document_ids': document_ids,
                    'vector_store_id': vector_store_id
                }
            }
            
        except Exception as e:
            logger.error(f"Document search error: {str(e)}")
            return {'success': False, 'error': str(e)}