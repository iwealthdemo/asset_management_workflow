#!/usr/bin/env python3
"""
Start the Python Vector Store Service
"""

import os
import subprocess
import sys

def start_python_service():
    # Set environment variables
    os.environ['FLASK_APP'] = 'python_services/vector_store_service.py'
    os.environ['PYTHON_API_PORT'] = '5001'
    
    # Get OpenAI API key from environment (already set in Replit)
    if not os.getenv('OPENAI_API_KEY'):
        print("Warning: OPENAI_API_KEY not found in environment")
    
    print("Starting Python Vector Store Service on port 5001...")
    
    try:
        # Start the Flask application
        subprocess.run([
            sys.executable, 
            'python_services/vector_store_service.py'
        ], check=True)
    except KeyboardInterrupt:
        print("\nPython service stopped.")
    except Exception as e:
        print(f"Error starting Python service: {e}")

if __name__ == '__main__':
    start_python_service()