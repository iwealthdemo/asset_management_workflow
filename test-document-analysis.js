import { documentAnalysisService } from './server/services/documentAnalysisService.ts';
import { storage } from './server/storage.ts';
import path from 'path';
import fs from 'fs';

async function testDocumentAnalysis() {
  console.log('Testing document analysis for Reliance Annual Report...');
  
  try {
    // Check if document exists
    const document = await storage.getDocument(12);
    if (!document) {
      console.log('Document not found');
      return;
    }
    
    console.log('Document found:', document.fileName);
    
    // Check if file exists on disk
    const filePath = path.join(process.cwd(), 'uploads', document.fileName);
    if (!fs.existsSync(filePath)) {
      console.log('File not found on disk:', filePath);
      return;
    }
    
    console.log('File exists on disk, starting analysis...');
    
    // Run the analysis
    const analysis = await documentAnalysisService.analyzeDocument(12, filePath);
    
    console.log('Analysis completed:', {
      documentType: analysis.documentType,
      classification: analysis.classification,
      confidence: analysis.confidence,
      riskLevel: analysis.riskAssessment.level,
      summaryPreview: analysis.summary.substring(0, 200) + '...',
      recommendationsCount: analysis.recommendations.length
    });
    
  } catch (error) {
    console.error('Analysis failed:', error);
  }
}

testDocumentAnalysis();