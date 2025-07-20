#!/usr/bin/env python3
"""
Vector Store Service API
Handles file upload and attachment to OpenAI vector store with attributes
"""

import os
import sys
from pathlib import Path
from flask import Flask, request, jsonify
from openai import OpenAI
import json

# Initialize Flask app
app = Flask(__name__)

# Enable CORS for cross-origin requests
from flask_cors import CORS
CORS(app)

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

# Default vector store ID (can be overridden per request)
DEFAULT_VECTOR_STORE_ID = os.getenv('DEFAULT_VECTOR_STORE_ID', 'vs_687584b54f908191b0a21ffa42948fb5')

def extract_metadata_from_filename(filename):
    """Extract metadata from filename"""
    metadata = {
        'filename': filename,
        'category': 'FinancialReport'
    }
    
    # Extract company name
    filename_lower = filename.lower()
    if 'hdfc' in filename_lower:
        metadata['company'] = 'HDFC_Bank'
    elif 'reliance' in filename_lower:
        metadata['company'] = 'Reliance'
    elif 'hsbc' in filename_lower:
        metadata['company'] = 'HSBC'
    elif 'sbi' in filename_lower:
        metadata['company'] = 'SBI'
    else:
        metadata['company'] = 'Unknown'
    
    # Extract year
    import re
    year_match = re.search(r'(\d{4}[-_]?\d{2})', filename)
    if year_match:
        metadata['year'] = year_match.group(1)
    else:
        metadata['year'] = 'Unknown'
    
    # Extract document type
    if 'annual' in filename_lower and 'report' in filename_lower:
        metadata['document_type'] = 'annual_report'
    elif 'quarterly' in filename_lower:
        metadata['document_type'] = 'quarterly_report'
    elif 'journey' in filename_lower:
        metadata['document_type'] = 'process_guide'
    else:
        metadata['document_type'] = 'financial_document'
    
    return metadata

@app.route('/upload_file_to_openai', methods=['POST'])
def upload_file_to_openai():
    """Step 1: Upload file to OpenAI Files API"""
    try:
        data = request.get_json()
        file_path = data.get('file_path')
        
        if not file_path or not os.path.exists(file_path):
            return jsonify({'error': 'File not found'}), 400
        
        # Upload file to OpenAI
        with open(file_path, 'rb') as file:
            uploaded_file = client.files.create(
                file=file,
                purpose='assistants'
            )
        
        # Convert to dict and return all properties
        file_data = {
            'id': uploaded_file.id,
            'object': uploaded_file.object,
            'purpose': uploaded_file.purpose,
            'filename': uploaded_file.filename,
            'bytes': uploaded_file.bytes,
            'created_at': uploaded_file.created_at,
            'expires_at': uploaded_file.expires_at,
            'status': uploaded_file.status,
            'status_details': uploaded_file.status_details
        }
        
        return jsonify({
            'success': True,
            'file': file_data
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/attach_file_to_vector_store', methods=['POST'])
def attach_file_to_vector_store():
    """Step 2: Attach file to vector store with attributes"""
    try:
        data = request.get_json()
        file_id = data.get('file_id')
        vector_store_id = data.get('vector_store_id', DEFAULT_VECTOR_STORE_ID)
        custom_attributes = data.get('attributes', {})
        filename = data.get('filename', '')
        
        if not file_id:
            return jsonify({'error': 'file_id is required'}), 400
        
        # Extract metadata from filename
        auto_attributes = extract_metadata_from_filename(filename)
        
        # Merge custom attributes with auto-extracted ones
        attributes = {**auto_attributes, **custom_attributes}
        attributes['file_id'] = file_id
        
        # Attach to vector store with attributes - your tested syntax
        vector_store_file = client.vector_stores.files.create_and_poll(
            vector_store_id=vector_store_id,
            file_id=file_id,
            attributes=attributes
        )
        
        # Convert to dict and return all properties
        result = {
            'id': vector_store_file.id,
            'object': vector_store_file.object,
            'usage_bytes': vector_store_file.usage_bytes,
            'created_at': vector_store_file.created_at,
            'vector_store_id': vector_store_file.vector_store_id,
            'status': vector_store_file.status,
            'last_error': vector_store_file.last_error,
            'chunking_strategy': vector_store_file.chunking_strategy.__dict__ if hasattr(vector_store_file.chunking_strategy, '__dict__') else vector_store_file.chunking_strategy,
            'attributes': vector_store_file.attributes
        }
        
        return jsonify({
            'success': True,
            'vector_store_file': result,
            'applied_attributes': attributes
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/upload_and_attach', methods=['POST'])
def upload_and_attach():
    """Combined: Upload file to OpenAI and attach to vector store in one call"""
    try:
        data = request.get_json()
        file_path = data.get('file_path')
        vector_store_id = data.get('vector_store_id', DEFAULT_VECTOR_STORE_ID)
        custom_attributes = data.get('attributes', {})
        
        if not file_path or not os.path.exists(file_path):
            return jsonify({'error': 'File not found'}), 400
        
        # Step 1: Upload to OpenAI
        with open(file_path, 'rb') as file:
            uploaded_file = client.files.create(
                file=file,
                purpose='assistants'
            )
        
        # Step 2: Extract metadata and prepare attributes
        filename = uploaded_file.filename
        auto_attributes = extract_metadata_from_filename(filename)
        
        # Add file properties to attributes
        file_attributes = {
            'file_size_bytes': str(uploaded_file.bytes),
            'upload_timestamp': str(uploaded_file.created_at),
            'openai_filename': uploaded_file.filename
        }
        
        # Merge all attributes
        attributes = {**auto_attributes, **file_attributes, **custom_attributes}
        attributes['file_id'] = uploaded_file.id
        
        # Step 3: Attach to vector store
        vector_store_file = client.vector_stores.files.create_and_poll(
            vector_store_id=vector_store_id,
            file_id=uploaded_file.id,
            attributes=attributes
        )
        
        return jsonify({
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
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy', 
        'service': 'vector_store_service',
        'version': '1.0.0',
        'openai_configured': bool(os.getenv('OPENAI_API_KEY')),
        'default_vector_store': DEFAULT_VECTOR_STORE_ID
    })

@app.route('/info', methods=['GET'])
def service_info():
    """Service information and capabilities"""
    return jsonify({
        'service': 'OpenAI Vector Store Service',
        'version': '1.0.0',
        'description': 'Handles file uploads and vector store operations with rich metadata support',
        'endpoints': {
            'POST /upload_file_to_openai': 'Upload file to OpenAI Files API',
            'POST /attach_file_to_vector_store': 'Attach file to vector store with attributes',
            'POST /upload_and_attach': 'Combined upload and attach operation',
            'GET /health': 'Health check',
            'GET /info': 'Service information'
        },
        'features': [
            'Automatic metadata extraction from filenames',
            'Custom attributes support',
            'Company/year/document type detection',
            'CORS enabled for cross-origin requests',
            'Comprehensive error handling',
            'Configurable vector store ID'
        ],
        'requirements': {
            'OPENAI_API_KEY': 'Required - Your OpenAI API key',
            'DEFAULT_VECTOR_STORE_ID': 'Optional - Default vector store ID to use'
        }
    })

if __name__ == '__main__':
    port = int(os.getenv('PYTHON_API_PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=True)