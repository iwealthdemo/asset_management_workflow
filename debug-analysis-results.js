import { db } from './server/db.ts';
import { documents } from './shared/schema.ts';
import { eq } from 'drizzle-orm';

async function debugAnalysisResults() {
  console.log('=== DEBUGGING ANALYSIS RESULTS ===');
  
  try {
    // Get a specific document to see what's in its analysis result
    const doc = await db.select().from(documents).where(eq(documents.id, 103)).limit(1);
    
    if (doc.length > 0) {
      console.log('Document ID:', doc[0].id);
      console.log('Document Name:', doc[0].originalName);
      console.log('Analysis Status:', doc[0].analysisStatus);
      console.log('Has Analysis Result:', !!doc[0].analysisResult);
      
      if (doc[0].analysisResult) {
        try {
          const analysisData = JSON.parse(doc[0].analysisResult);
          console.log('\n=== ANALYSIS DATA STRUCTURE ===');
          console.log('Keys:', Object.keys(analysisData));
          
          // Check for different possible key names
          console.log('Has openaiFileId:', !!analysisData.openaiFileId);
          console.log('Has openai_file_id:', !!analysisData.openai_file_id);
          console.log('Has summary:', !!analysisData.summary);
          console.log('Has insights:', !!analysisData.insights);
          
          if (analysisData.summary) {
            console.log('Summary length:', analysisData.summary.length);
            console.log('Summary preview:', analysisData.summary.substring(0, 200) + '...');
          }
          
          if (analysisData.insights) {
            console.log('Insights length:', analysisData.insights.length);
            console.log('Insights preview:', analysisData.insights.substring(0, 200) + '...');
          }
          
          console.log('\n=== FULL ANALYSIS DATA ===');
          console.log(JSON.stringify(analysisData, null, 2));
          
        } catch (e) {
          console.error('Error parsing analysis result:', e);
          console.log('Raw analysis result type:', typeof doc[0].analysisResult);
          console.log('Raw analysis result length:', doc[0].analysisResult.length);
          console.log('Raw analysis result preview:', doc[0].analysisResult.substring(0, 500));
        }
      }
    } else {
      console.log('Document not found');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  process.exit(0);
}

debugAnalysisResults();