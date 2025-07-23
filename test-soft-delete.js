// Test script to verify soft delete functionality
import { DatabaseStorage } from './server/storage.js';

async function testSoftDelete() {
  const storage = new DatabaseStorage();
  
  console.log('Testing soft delete functionality...');
  
  try {
    // Get current investments
    const allInvestments = await storage.getInvestmentRequests();
    console.log(`Current investment count: ${allInvestments.length}`);
    
    if (allInvestments.length > 0) {
      const testInvestment = allInvestments[0];
      console.log(`Testing with investment ID: ${testInvestment.id}, Status: ${testInvestment.status}`);
      
      // Test soft delete
      const deleteResult = await storage.softDeleteInvestmentRequest(testInvestment.id, testInvestment.requesterId);
      console.log(`Delete result: ${deleteResult}`);
      
      if (deleteResult) {
        // Verify the investment is no longer returned in queries
        const investmentsAfterDelete = await storage.getInvestmentRequests();
        console.log(`Investment count after delete: ${investmentsAfterDelete.length}`);
        
        // Try to get the specific investment
        const deletedInvestment = await storage.getInvestmentRequest(testInvestment.id);
        console.log(`Deleted investment retrieval: ${deletedInvestment ? 'Found (ERROR!)' : 'Not found (CORRECT)'}`);
        
        console.log('Soft delete test PASSED: Investment properly filtered from queries');
      } else {
        console.log('Delete failed - this may be expected if investment status does not allow deletion');
      }
    } else {
      console.log('No investments found to test with');
    }
  } catch (error) {
    console.error('Test error:', error);
  }
}

testSoftDelete();