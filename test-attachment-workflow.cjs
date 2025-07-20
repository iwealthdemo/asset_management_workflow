const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

class AttachmentWorkflowValidator {
  constructor() {
    this.baseUrl = 'http://localhost:5000';
    this.cookies = {};
  }

  async makeRequest(method, endpoint, data, cookies = null) {
    const fetch = (await import('node-fetch')).default;
    const url = `${this.baseUrl}${endpoint}`;
    
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies || ''
      }
    };

    if (data && method !== 'GET') {
      if (data instanceof FormData) {
        options.body = data;
        delete options.headers['Content-Type'];
      } else {
        options.body = JSON.stringify(data);
      }
    }

    return await fetch(url, options);
  }

  async login(username, password) {
    const response = await this.makeRequest('POST', '/api/auth/login', {
      username,
      password
    });

    if (response.ok) {
      const setCookieHeader = response.headers.get('set-cookie');
      if (setCookieHeader) {
        return setCookieHeader;
      }
    }
    return null;
  }

  async createTestFile(filename, content) {
    const filePath = path.join(__dirname, filename);
    fs.writeFileSync(filePath, content);
    return filePath;
  }

  async uploadDocument(investmentId, filePath, cookies) {
    const fetch = (await import('node-fetch')).default;
    const formData = new FormData();
    formData.append('documents', fs.createReadStream(filePath));

    const response = await fetch(`${this.baseUrl}/api/documents/investment/${investmentId}`, {
      method: 'POST',
      body: formData,
      headers: {
        'Cookie': cookies || ''
      }
    });

    return response;
  }

  async validateAttachmentWorkflow() {
    console.log('🔍 Validating Attachment Upload/Delete Workflow...\n');
    
    // Login as analyst
    const analystCookies = await this.login('analyst1', 'admin123');
    if (!analystCookies) {
      console.log('❌ Failed to login as analyst1');
      return false;
    }
    console.log('✅ Analyst logged in successfully');

    // Create a draft investment
    const investmentData = {
      targetCompany: 'Attachment Test Company',
      investmentType: 'equity',
      amount: '500000',
      expectedReturn: '12',
      riskLevel: 'medium',
      description: 'Test investment for attachment validation'
    };

    const createResponse = await this.makeRequest('POST', '/api/investments', investmentData, analystCookies);
    
    if (!createResponse.ok) {
      console.log('❌ Failed to create investment');
      return false;
    }

    const investment = await createResponse.json();
    console.log(`✅ Created draft investment: ${investment.requestId}`);

    // Create test files
    const testFile1 = await this.createTestFile('test-document-1.txt', 'This is a test document for attachment validation - Document 1');
    const testFile2 = await this.createTestFile('test-document-2.txt', 'This is a test document for attachment validation - Document 2');
    const testFile3 = await this.createTestFile('test-document-3.txt', 'This is a test document for attachment validation - Document 3');

    console.log('✅ Created test files');

    // Upload first document
    const upload1Response = await this.uploadDocument(investment.id, testFile1, analystCookies);
    if (!upload1Response.ok) {
      console.log('❌ Failed to upload first document');
      return false;
    }
    const document1 = await upload1Response.json();
    console.log(`✅ Uploaded first document: ${document1[0].fileName}`);

    // Upload second document
    const upload2Response = await this.uploadDocument(investment.id, testFile2, analystCookies);
    if (!upload2Response.ok) {
      console.log('❌ Failed to upload second document');
      return false;
    }
    const document2 = await upload2Response.json();
    console.log(`✅ Uploaded second document: ${document2[0].fileName}`);

    // Get documents to verify upload
    const getDocsResponse = await this.makeRequest('GET', `/api/documents/investment/${investment.id}`, null, analystCookies);
    if (!getDocsResponse.ok) {
      console.log('❌ Failed to get documents');
      return false;
    }
    const documents = await getDocsResponse.json();
    
    if (documents.length !== 2) {
      console.log(`❌ Expected 2 documents, got ${documents.length}`);
      return false;
    }
    console.log('✅ Documents retrieved successfully');

    // Edit the investment while it has attachments
    const editResponse = await this.makeRequest('PUT', `/api/investments/${investment.id}`, {
      targetCompany: 'Attachment Test Company - Updated',
      investmentType: 'equity',
      amount: '750000', // Updated amount
      expectedReturn: '15', // Updated return
      riskLevel: 'high', // Updated risk
      description: 'Updated test investment with attachments'
    }, analystCookies);

    if (!editResponse.ok) {
      console.log('❌ Failed to edit investment with attachments');
      return false;
    }
    console.log('✅ Investment edited successfully while maintaining attachments');

    // Verify documents still exist after edit
    const getDocsAfterEditResponse = await this.makeRequest('GET', `/api/documents/investment/${investment.id}`, null, analystCookies);
    if (!getDocsAfterEditResponse.ok) {
      console.log('❌ Failed to get documents after edit');
      return false;
    }
    const documentsAfterEdit = await getDocsAfterEditResponse.json();
    
    if (documentsAfterEdit.length !== 2) {
      console.log(`❌ Expected 2 documents after edit, got ${documentsAfterEdit.length}`);
      return false;
    }
    console.log('✅ Documents preserved after investment edit');

    // Upload third document after edit
    const upload3Response = await this.uploadDocument(investment.id, testFile3, analystCookies);
    if (!upload3Response.ok) {
      console.log('❌ Failed to upload third document after edit');
      return false;
    }
    console.log('✅ Third document uploaded after edit');

    // Verify all 3 documents exist
    const getFinalDocsResponse = await this.makeRequest('GET', `/api/documents/investment/${investment.id}`, null, analystCookies);
    const finalDocuments = await getFinalDocsResponse.json();
    
    if (finalDocuments.length !== 3) {
      console.log(`❌ Expected 3 documents, got ${finalDocuments.length}`);
      return false;
    }
    console.log('✅ All 3 documents present');

    // Delete one document
    const documentToDelete = finalDocuments[0];
    const deleteResponse = await this.makeRequest('DELETE', `/api/documents/${documentToDelete.id}`, null, analystCookies);
    
    if (!deleteResponse.ok) {
      console.log('❌ Failed to delete document');
      return false;
    }
    console.log('✅ Document deleted successfully');

    // Verify document count after deletion
    const getDocsAfterDeleteResponse = await this.makeRequest('GET', `/api/documents/investment/${investment.id}`, null, analystCookies);
    const documentsAfterDelete = await getDocsAfterDeleteResponse.json();
    
    if (documentsAfterDelete.length !== 2) {
      console.log(`❌ Expected 2 documents after deletion, got ${documentsAfterDelete.length}`);
      return false;
    }
    console.log('✅ Document count correct after deletion');

    // Edit investment again after document deletion
    const editAfterDeleteResponse = await this.makeRequest('PUT', `/api/investments/${investment.id}`, {
      targetCompany: 'Attachment Test Company - Final Update',
      investmentType: 'equity',
      amount: '800000',
      expectedReturn: '18',
      riskLevel: 'high',
      description: 'Final update after document deletion'
    }, analystCookies);

    if (!editAfterDeleteResponse.ok) {
      console.log('❌ Failed to edit investment after document deletion');
      return false;
    }
    console.log('✅ Investment edited successfully after document deletion');

    // Final verification - documents should still be there
    const getFinalVerificationResponse = await this.makeRequest('GET', `/api/documents/investment/${investment.id}`, null, analystCookies);
    const finalVerificationDocuments = await getFinalVerificationResponse.json();
    
    if (finalVerificationDocuments.length !== 2) {
      console.log(`❌ Expected 2 documents in final verification, got ${finalVerificationDocuments.length}`);
      return false;
    }
    console.log('✅ Documents preserved through all operations');

    // Submit the investment for approval to test attachment workflow in approval process
    const submitResponse = await this.makeRequest('POST', `/api/investments/${investment.id}/submit`, {}, analystCookies);
    
    if (!submitResponse.ok) {
      console.log('❌ Failed to submit investment with attachments');
      return false;
    }
    console.log('✅ Investment with attachments submitted for approval');

    // Clean up test files
    fs.unlinkSync(testFile1);
    fs.unlinkSync(testFile2);
    fs.unlinkSync(testFile3);
    console.log('✅ Test files cleaned up');

    return true;
  }

  async validateAttachmentDuringChangesWorkflow() {
    console.log('\n🔍 Validating Attachment Management During Changes Requested Workflow...\n');
    
    // Login as analyst and manager
    const analystCookies = await this.login('analyst1', 'admin123');
    const managerCookies = await this.login('manager1', 'admin123');
    
    if (!analystCookies || !managerCookies) {
      console.log('❌ Failed to login');
      return false;
    }
    console.log('✅ Both users logged in successfully');

    // Create investment with attachments
    const investmentData = {
      targetCompany: 'Changes Attachment Test Company',
      investmentType: 'equity',
      amount: '600000',
      expectedReturn: '10',
      riskLevel: 'medium',
      description: 'Test investment for changes workflow with attachments'
    };

    const createResponse = await this.makeRequest('POST', '/api/investments', investmentData, analystCookies);
    const investment = await createResponse.json();
    console.log(`✅ Created investment: ${investment.requestId}`);

    // Upload document
    const testFile = await this.createTestFile('changes-test-document.txt', 'Original document for changes workflow');
    const uploadResponse = await this.uploadDocument(investment.id, testFile, analystCookies);
    
    if (!uploadResponse.ok) {
      console.log('❌ Failed to upload document');
      return false;
    }
    console.log('✅ Document uploaded');

    // Submit for approval
    const submitResponse = await this.makeRequest('POST', `/api/investments/${investment.id}/submit`, {}, analystCookies);
    if (!submitResponse.ok) {
      console.log('❌ Failed to submit investment');
      return false;
    }
    console.log('✅ Investment submitted for approval');

    // Get manager task
    const tasksResponse = await this.makeRequest('GET', '/api/tasks', null, managerCookies);
    const tasks = await tasksResponse.json();
    const task = tasks.find(t => t.requestId === investment.id);
    
    if (!task) {
      console.log('❌ Manager task not found');
      return false;
    }

    // Manager requests changes
    const changesResponse = await this.makeRequest('POST', `/api/approvals`, {
      requestType: task.requestType,
      requestId: task.requestId,
      action: 'changes_requested',
      comments: 'Please add more financial documentation'
    }, managerCookies);

    if (!changesResponse.ok) {
      console.log('❌ Failed to request changes');
      return false;
    }
    console.log('✅ Changes requested by manager');

    // Analyst adds new document during changes
    const additionalFile = await this.createTestFile('additional-document.txt', 'Additional document per manager request');
    const additionalUploadResponse = await this.uploadDocument(investment.id, additionalFile, analystCookies);
    
    if (!additionalUploadResponse.ok) {
      console.log('❌ Failed to upload additional document');
      return false;
    }
    console.log('✅ Additional document uploaded during changes');

    // Verify both documents exist
    const getDocsResponse = await this.makeRequest('GET', `/api/documents/investment/${investment.id}`, null, analystCookies);
    const documents = await getDocsResponse.json();
    
    if (documents.length !== 2) {
      console.log(`❌ Expected 2 documents, got ${documents.length}`);
      return false;
    }
    console.log('✅ Both documents present');

    // Edit investment
    const editResponse = await this.makeRequest('PUT', `/api/investments/${investment.id}`, {
      targetCompany: 'Changes Attachment Test Company - Updated',
      investmentType: 'equity',
      amount: '700000',
      expectedReturn: '12',
      riskLevel: 'medium',
      description: 'Updated investment with additional financial documentation'
    }, analystCookies);

    if (!editResponse.ok) {
      console.log('❌ Failed to edit investment during changes');
      return false;
    }
    console.log('✅ Investment edited during changes requested status');

    // Resubmit
    const resubmitResponse = await this.makeRequest('POST', `/api/investments/${investment.id}/submit`, {}, analystCookies);
    if (!resubmitResponse.ok) {
      console.log('❌ Failed to resubmit investment');
      return false;
    }
    console.log('✅ Investment resubmitted with attachments');

    // Verify documents still exist after resubmission
    const finalDocsResponse = await this.makeRequest('GET', `/api/documents/investment/${investment.id}`, null, analystCookies);
    const finalDocuments = await finalDocsResponse.json();
    
    if (finalDocuments.length !== 2) {
      console.log(`❌ Expected 2 documents after resubmission, got ${finalDocuments.length}`);
      return false;
    }
    console.log('✅ Documents preserved through changes workflow');

    // Clean up
    fs.unlinkSync(testFile);
    fs.unlinkSync(additionalFile);
    console.log('✅ Test files cleaned up');

    return true;
  }

  async run() {
    console.log('🚀 Starting Attachment Workflow Validation\n');
    
    const basicAttachmentResult = await this.validateAttachmentWorkflow();
    const changesAttachmentResult = await this.validateAttachmentDuringChangesWorkflow();

    console.log('\n📊 Validation Results:');
    console.log('========================');
    console.log(`Basic Attachment Workflow: ${basicAttachmentResult ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Changes Workflow with Attachments: ${changesAttachmentResult ? '✅ PASSED' : '❌ FAILED'}`);
    
    const totalPassed = (basicAttachmentResult ? 1 : 0) + (changesAttachmentResult ? 1 : 0);
    console.log(`\n📈 Overall: ${totalPassed}/2 attachment workflows validated`);

    if (totalPassed === 2) {
      console.log('🎉 All attachment workflows validated successfully!');
    } else {
      console.log('⚠️  Some attachment workflows failed validation.');
    }
  }
}

// Run the validation
const validator = new AttachmentWorkflowValidator();
validator.run().catch(console.error);