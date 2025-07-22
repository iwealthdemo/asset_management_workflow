#!/usr/bin/env node

/**
 * Debug LLM Service Upload Issue
 */

import fetch from 'node-fetch';
import fs from 'fs';

const LLM_SERVICE_URL = 'https://llm-api-service-vinay2k.replit.app';
const LLM_SERVICE_API_KEY = 'aa123456789bb';

async function debugLLMService() {
  console.log('🔍 Debugging LLM Service Upload Issue\n');

  try {
    // Step 1: Health check
    console.log('1️⃣ Testing health endpoint...');
    const healthResponse = await fetch(`${LLM_SERVICE_URL}/health`, {
      headers: { 'X-API-Key': LLM_SERVICE_API_KEY }
    });
    
    console.log(`Health status: ${healthResponse.status}`);
    
    if (healthResponse.ok) {
      const health = await healthResponse.json();
      console.log('✅ Service healthy:', health.service);
      console.log(`   OpenAI configured: ${health.openai_configured}`);
      console.log(`   Vector store: ${health.default_vector_store}`);
    } else {
      const errorText = await healthResponse.text();
      console.log('❌ Health check failed');
      console.log('Response:', errorText.substring(0, 300));
      return;
    }

    // Step 2: Test upload with minimal payload
    console.log('\n2️⃣ Testing upload endpoint...');
    
    const testPayload = {
      file_content: Buffer.from('This is a test document content for AI analysis.').toString('base64'),
      filename: 'test-document.txt',
      attributes: {
        document_id: '999',
        request_id: '999'
      }
    };

    console.log('Payload structure:', JSON.stringify(testPayload, null, 2));

    const uploadResponse = await fetch(`${LLM_SERVICE_URL}/documents/upload-and-vectorize`, {
      method: 'POST',
      headers: { 
        'X-API-Key': LLM_SERVICE_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPayload)
    });
    
    console.log(`Upload status: ${uploadResponse.status}`);
    const responseText = await uploadResponse.text();
    
    if (uploadResponse.ok) {
      console.log('✅ Upload successful');
      try {
        const result = JSON.parse(responseText);
        console.log('Upload result:', JSON.stringify(result, null, 2));
        
        // Step 3: Test insights with the file ID
        if (result.file?.id) {
          console.log('\n3️⃣ Testing insights endpoint...');
          
          const insightsPayload = {
            document_ids: [result.file.id],
            analysis_focus: 'comprehensive',
            context: {
              document_id: '999',
              request_id: '999',
              analysis_type: 'comprehensive'
            }
          };
          
          console.log('Insights payload:', JSON.stringify(insightsPayload, null, 2));
          
          const insightsResponse = await fetch(`${LLM_SERVICE_URL}/analysis/investment-insights`, {
            method: 'POST',
            headers: { 
              'X-API-Key': LLM_SERVICE_API_KEY,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(insightsPayload)
          });
          
          console.log(`Insights status: ${insightsResponse.status}`);
          const insightsText = await insightsResponse.text();
          
          if (insightsResponse.ok) {
            console.log('✅ Insights successful');
            const insightsResult = JSON.parse(insightsText);
            console.log('Insights result:', JSON.stringify(insightsResult, null, 2));
          } else {
            console.log('❌ Insights failed');
            console.log('Response:', insightsText.substring(0, 300));
          }
        }
        
      } catch (parseError) {
        console.log('❌ Failed to parse upload response as JSON');
        console.log('Response text:', responseText.substring(0, 300));
      }
    } else {
      console.log('❌ Upload failed');
      console.log('Response:', responseText.substring(0, 300));
      
      // Check if it's an HTML error page
      if (responseText.includes('<html>')) {
        console.log('⚠️ Service returned HTML error page - check service status');
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

debugLLMService().catch(console.error);