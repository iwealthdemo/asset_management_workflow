// Test script to verify document visibility after change request resubmission
import http from 'http';
import fs from 'fs';
import FormData from 'form-data';

// Session cookies for different users
const analystCookie = 'connect.sid=s%3AExJYHXaaqMSkFHsGrZ-pSmXXLqCUOV4q.JGZzQKnFfMdhtxH1JIvg6a4Zux91LYp3Cb%2FIePtebMc';
const managerCookie = 'connect.sid=s%3AExJYHXaaqMSkFHsGrZ-pSmXXLqCUOV4q.JGZzQKnFfMdhtxH1JIvg6a4Zux91LYp3Cb%2FIePtebMc';

function makeRequest(endpoint, method, data, cookie) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: endpoint,
      method,
      headers: {
        'Cookie': cookie,
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    
    if (data && method !== 'GET') {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

function uploadDocument(investmentId, filePath, cookie) {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('files', fs.createReadStream(filePath));
    form.append('requestType', 'investment');
    form.append('requestId', investmentId.toString());
    
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/documents/upload',
      method: 'POST',
      headers: {
        'Cookie': cookie,
        ...form.getHeaders()
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    form.pipe(req);
  });
}

async function testDocumentVisibilityAfterResubmission() {
  console.log('🧪 Testing Document Visibility After Change Request Resubmission\n');

  try {
    // Step 1: Create investment as analyst
    console.log('1️⃣ Creating investment as analyst...');
    const investmentData = {
      targetCompany: 'Document Visibility Test Corp',
      investmentType: 'equity',
      amount: '2000000',
      expectedReturn: '15',
      description: 'Testing document visibility after resubmission',
      riskLevel: 'medium',
      status: 'new'
    };

    const createResponse = await makeRequest('/api/investments', 'POST', investmentData, analystCookie);
    if (createResponse.status !== 200) {
      console.log('❌ Investment creation failed:', createResponse.data);
      return;
    }

    const investment = createResponse.data;
    console.log(`✅ Investment created: ID ${investment.id}, Request ID ${investment.requestId}`);

    // Step 2: Upload initial document as analyst
    console.log('\n2️⃣ Uploading initial document as analyst...');
    const initialDoc = 'This is the initial document uploaded with the investment proposal.\n'.repeat(50);
    const initialDocPath = './initial-doc.txt';
    fs.writeFileSync(initialDocPath, initialDoc);

    const initialUploadResponse = await uploadDocument(investment.id, initialDocPath, analystCookie);
    if (initialUploadResponse.status !== 200) {
      console.log('❌ Initial document upload failed:', initialUploadResponse.data);
      return;
    }

    console.log(`✅ Initial document uploaded: ${initialUploadResponse.data.documents?.length || initialUploadResponse.data.length || 0} documents`);

    // Step 3: Manager views the task and documents
    console.log('\n3️⃣ Manager viewing task and documents...');
    const tasksResponse = await makeRequest('/api/tasks', 'GET', null, managerCookie);
    const tasks = tasksResponse.status === 200 ? tasksResponse.data : [];
    const matchingTask = tasks.find(task => task.requestId === investment.id);

    if (!matchingTask) {
      console.log('❌ Manager cannot see the task');
      return;
    }

    const managerDocsResponse = await makeRequest(`/api/documents/investment/${investment.id}`, 'GET', null, managerCookie);
    const managerInitialDocs = managerDocsResponse.status === 200 ? managerDocsResponse.data : [];
    console.log(`✅ Manager can see ${managerInitialDocs.length} initial documents`);

    // Step 4: Manager requests changes
    console.log('\n4️⃣ Manager requesting changes...');
    const changeRequestResponse = await makeRequest('/api/approvals', 'POST', {
      requestType: 'investment',
      requestId: investment.id,
      action: 'changes_requested',
      comments: 'Please provide additional financial documentation'
    }, managerCookie);

    if (changeRequestResponse.status !== 200) {
      console.log('❌ Change request failed:', changeRequestResponse.data);
      return;
    }

    console.log('✅ Manager requested changes');

    // Step 5: Analyst adds new document after change request
    console.log('\n5️⃣ Analyst uploading additional document after change request...');
    const additionalDoc = 'This is the additional document uploaded after manager requested changes.\n'.repeat(50);
    const additionalDocPath = './additional-doc.txt';
    fs.writeFileSync(additionalDocPath, additionalDoc);

    const additionalUploadResponse = await uploadDocument(investment.id, additionalDocPath, analystCookie);
    if (additionalUploadResponse.status !== 200) {
      console.log('❌ Additional document upload failed:', additionalUploadResponse.data);
      return;
    }

    console.log(`✅ Additional document uploaded: ${additionalUploadResponse.data.documents?.length || additionalUploadResponse.data.length || 0} documents`);

    // Step 6: Analyst resubmits investment
    console.log('\n6️⃣ Analyst resubmitting investment for approval...');
    const resubmitResponse = await makeRequest(`/api/investments/${investment.id}/submit`, 'POST', null, analystCookie);
    if (resubmitResponse.status !== 200) {
      console.log('❌ Resubmission failed:', resubmitResponse.data);
      return;
    }

    console.log('✅ Investment resubmitted for approval');

    // Step 7: Wait a moment for cache invalidation
    console.log('\n7️⃣ Waiting for cache invalidation...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 8: Manager checks if they can see the new document
    console.log('\n8️⃣ Manager checking for updated documents...');
    const updatedTasksResponse = await makeRequest('/api/tasks', 'GET', null, managerCookie);
    const updatedTasks = updatedTasksResponse.status === 200 ? updatedTasksResponse.data : [];
    const updatedTask = updatedTasks.find(task => task.requestId === investment.id);

    const managerUpdatedDocsResponse = await makeRequest(`/api/documents/investment/${investment.id}`, 'GET', null, managerCookie);
    const managerUpdatedDocs = managerUpdatedDocsResponse.status === 200 ? managerUpdatedDocsResponse.data : [];

    console.log(`✅ Manager can now see ${managerUpdatedDocs.length} total documents`);
    console.log(`   Expected: 2 documents (initial + additional)`);
    console.log(`   Actual: ${managerUpdatedDocs.length} documents`);

    if (managerUpdatedDocs.length >= 2) {
      console.log('\n🎉 SUCCESS: Document visibility after resubmission works correctly!');
      console.log('Documents visible to manager:');
      managerUpdatedDocs.forEach((doc, index) => {
        console.log(`   ${index + 1}. ${doc.originalName} (ID: ${doc.id})`);
      });
    } else {
      console.log('\n❌ FAILED: Manager cannot see all documents after resubmission');
    }

    // Step 9: Verify task exists for manager
    if (updatedTask) {
      console.log(`✅ Manager has active task for investment ${investment.id}`);
    } else {
      console.log(`❌ Manager does not have active task for investment ${investment.id}`);
    }

    // Clean up test files
    if (fs.existsSync(initialDocPath)) {
      fs.unlinkSync(initialDocPath);
    }
    if (fs.existsSync(additionalDocPath)) {
      fs.unlinkSync(additionalDocPath);
    }

    console.log('\n📋 Test Summary:');
    console.log('✓ Investment creation');
    console.log('✓ Initial document upload');
    console.log('✓ Manager task visibility');
    console.log('✓ Change request workflow');
    console.log('✓ Additional document upload');
    console.log('✓ Investment resubmission');
    console.log(`${managerUpdatedDocs.length >= 2 ? '✓' : '❌'} Document visibility after resubmission`);

  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testDocumentVisibilityAfterResubmission();