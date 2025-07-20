#!/usr/bin/env python3
"""
Example client showing how to use the Vector Store Service from any Python application
"""

import requests
import json
import os

class VectorStoreClient:
    def __init__(self, service_url="http://localhost:5001"):
        self.service_url = service_url
        
    def check_health(self):
        """Check if the service is healthy"""
        try:
            response = requests.get(f"{self.service_url}/health")
            return response.json()
        except Exception as e:
            return {"status": "error", "message": str(e)}
    
    def get_service_info(self):
        """Get service information and capabilities"""
        try:
            response = requests.get(f"{self.service_url}/info")
            return response.json()
        except Exception as e:
            return {"error": str(e)}
    
    def upload_and_attach(self, file_path, vector_store_id=None, attributes=None):
        """
        Upload file and attach to vector store with custom attributes
        
        Args:
            file_path (str): Path to the file to upload
            vector_store_id (str, optional): Vector store ID to use
            attributes (dict, optional): Custom attributes to add
            
        Returns:
            dict: Service response
        """
        payload = {
            "file_path": file_path,
            "attributes": attributes or {}
        }
        
        if vector_store_id:
            payload["vector_store_id"] = vector_store_id
            
        try:
            response = requests.post(
                f"{self.service_url}/upload_and_attach",
                headers={"Content-Type": "application/json"},
                json=payload
            )
            return response.json()
        except Exception as e:
            return {"success": False, "error": str(e)}

def example_usage():
    """Example of how to use the Vector Store Service from any application"""
    
    print("🔧 Vector Store Service Client Example")
    print("=" * 50)
    
    # Initialize client
    client = VectorStoreClient("http://localhost:5001")
    
    # Check service health
    print("\n1. Checking service health...")
    health = client.check_health()
    print(f"   Status: {health.get('status', 'unknown')}")
    
    if health.get('status') != 'healthy':
        print("   ❌ Service not available. Please start the service first.")
        return
    
    # Get service info
    print("\n2. Getting service information...")
    info = client.get_service_info()
    print(f"   Service: {info.get('service', 'unknown')}")
    print(f"   Version: {info.get('version', 'unknown')}")
    
    # Example file upload (you'll need to provide a real file path)
    example_file = "/path/to/your/document.pdf"  # Change this to a real file
    
    if os.path.exists(example_file):
        print(f"\n3. Uploading and attaching file: {example_file}")
        
        # Custom attributes for your application
        custom_attrs = {
            "application": "my_document_manager",
            "user_id": "user_123",
            "uploaded_by": "example_script",
            "category": "test_document",
            "priority": "normal",
            "department": "research"
        }
        
        result = client.upload_and_attach(
            file_path=example_file,
            attributes=custom_attrs
        )
        
        if result.get("success"):
            print("   ✅ Upload successful!")
            print(f"   📄 File ID: {result['file']['id']}")
            print(f"   📊 Size: {result['file']['bytes']} bytes")
            print(f"   🏷️  Attributes applied: {len(result['applied_attributes'])}")
            print("\n   Auto-extracted metadata:")
            attrs = result['applied_attributes']
            print(f"      • Company: {attrs.get('company', 'N/A')}")
            print(f"      • Document Type: {attrs.get('document_type', 'N/A')}")
            print(f"      • Year: {attrs.get('year', 'N/A')}")
        else:
            print(f"   ❌ Upload failed: {result.get('error')}")
    else:
        print(f"\n3. Skipping file upload - file not found: {example_file}")
        print("   💡 Update the 'example_file' path to test file upload")
    
    print("\n" + "=" * 50)
    print("✅ Example completed. The service can be used from any application!")

if __name__ == "__main__":
    example_usage()