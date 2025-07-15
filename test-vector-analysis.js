import { documentAnalysisService } from './server/services/documentAnalysisService.ts';
import { storage } from './server/storage.ts';
import path from 'path';

async function testVectorAnalysis() {
  console.log('Testing vector store analysis for Reliance Annual Report...');
  
  try {
    const document = await storage.getDocument(12);
    console.log('Document found:', document.fileName);
    
    const filePath = path.join(process.cwd(), 'uploads', document.fileName);
    
    // This should now use the vector store approach since the document has openai_file_id
    const analysis = await documentAnalysisService.analyzeDocument(12, filePath);
    
    console.log('Analysis completed successfully:');
    console.log('- Document Type:', analysis.documentType);
    console.log('- Classification:', analysis.classification);
    console.log('- Confidence:', analysis.confidence);
    console.log('- Risk Level:', analysis.riskAssessment.level);
    console.log('- Summary Preview:', analysis.summary.substring(0, 300) + '...');
    console.log('- Recommendations Count:', analysis.recommendations.length);
    console.log('- Key Information:', Object.keys(analysis.keyInformation));
    
  } catch (error) {
    console.error('Vector analysis failed:', error);
  }
}

testVectorAnalysis();