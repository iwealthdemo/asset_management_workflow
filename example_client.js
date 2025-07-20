/**
 * Example client showing how to use the Vector Store Service from any Node.js/JavaScript application
 */

import fetch from 'node-fetch';
import fs from 'fs';

class VectorStoreClient {
    constructor(serviceUrl = "http://localhost:5001") {
        this.serviceUrl = serviceUrl;
    }

    async checkHealth() {
        try {
            const response = await fetch(`${this.serviceUrl}/health`);
            return await response.json();
        } catch (error) {
            return { status: "error", message: error.message };
        }
    }

    async getServiceInfo() {
        try {
            const response = await fetch(`${this.serviceUrl}/info`);
            return await response.json();
        } catch (error) {
            return { error: error.message };
        }
    }

    async uploadAndAttach(filePath, vectorStoreId = null, attributes = {}) {
        const payload = {
            file_path: filePath,
            attributes: attributes
        };

        if (vectorStoreId) {
            payload.vector_store_id = vectorStoreId;
        }

        try {
            const response = await fetch(`${this.serviceUrl}/upload_and_attach`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            return await response.json();
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

async function exampleUsage() {
    console.log('🔧 Vector Store Service Client Example');
    console.log('='.repeat(50));

    // Initialize client
    const client = new VectorStoreClient("http://localhost:5001");

    // Check service health
    console.log('\n1. Checking service health...');
    const health = await client.checkHealth();
    console.log(`   Status: ${health.status || 'unknown'}`);

    if (health.status !== 'healthy') {
        console.log('   ❌ Service not available. Please start the service first.');
        return;
    }

    // Get service info
    console.log('\n2. Getting service information...');
    const info = await client.getServiceInfo();
    console.log(`   Service: ${info.service || 'unknown'}`);
    console.log(`   Version: ${info.version || 'unknown'}`);

    // Example file upload (you'll need to provide a real file path)
    const exampleFile = "/path/to/your/document.pdf";  // Change this to a real file

    if (fs.existsSync(exampleFile)) {
        console.log(`\n3. Uploading and attaching file: ${exampleFile}`);

        // Custom attributes for your application
        const customAttrs = {
            application: "my_web_app",
            user_id: "user_456",
            uploaded_by: "javascript_client",
            category: "test_document",
            priority: "high",
            department: "engineering"
        };

        const result = await client.uploadAndAttach(
            exampleFile,
            null, // Use default vector store
            customAttrs
        );

        if (result.success) {
            console.log('   ✅ Upload successful!');
            console.log(`   📄 File ID: ${result.file.id}`);
            console.log(`   📊 Size: ${result.file.bytes} bytes`);
            console.log(`   🏷️  Attributes applied: ${Object.keys(result.applied_attributes).length}`);
            console.log('\n   Auto-extracted metadata:');
            const attrs = result.applied_attributes;
            console.log(`      • Company: ${attrs.company || 'N/A'}`);
            console.log(`      • Document Type: ${attrs.document_type || 'N/A'}`);
            console.log(`      • Year: ${attrs.year || 'N/A'}`);
        } else {
            console.log(`   ❌ Upload failed: ${result.error}`);
        }
    } else {
        console.log(`\n3. Skipping file upload - file not found: ${exampleFile}`);
        console.log('   💡 Update the "exampleFile" path to test file upload');
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ Example completed. The service can be used from any application!');
}

// Export for use in other modules
export { VectorStoreClient };

// Run example if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    exampleUsage().catch(console.error);
}