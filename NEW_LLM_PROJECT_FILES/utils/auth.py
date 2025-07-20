"""
Authentication utilities for LLM API service
"""

import os
from functools import wraps
from flask import request, jsonify

def require_api_key(f):
    """
    Decorator to require API key authentication
    
    API key should be provided in:
    - Header: Authorization: Bearer <api_key>
    - Header: X-API-Key: <api_key>
    - Query parameter: api_key=<api_key>
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Get expected API key from environment
        expected_key = os.getenv('SERVICE_API_KEY', 'dev-key-change-in-production')
        
        # Check multiple authentication methods
        provided_key = None
        
        # Method 1: Authorization header
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            provided_key = auth_header.split(' ')[1]
            
        # Method 2: X-API-Key header
        if not provided_key:
            provided_key = request.headers.get('X-API-Key')
            
        # Method 3: Query parameter
        if not provided_key:
            provided_key = request.args.get('api_key')
            
        # Validate API key
        if not provided_key:
            return jsonify({
                'success': False,
                'error': 'API key required',
                'message': 'Provide API key in Authorization header, X-API-Key header, or api_key query parameter'
            }), 401
            
        if provided_key != expected_key:
            return jsonify({
                'success': False,
                'error': 'Invalid API key',
                'message': 'The provided API key is not valid'
            }), 401
            
        return f(*args, **kwargs)
    return decorated_function

def generate_api_key():
    """Generate a secure API key for the service"""
    import secrets
    return f"llm-{secrets.token_urlsafe(32)}"