import axios from 'axios';
import fs from 'fs';

// Test cases with different types of investment text
const testCases = [
  {
    name: "Grammar & Spelling Issues",
    originalText: "this compnay is doing good in the market and we shoudl invest becuse there revenue is growing rapidy and the managment team have experience in this feild"
  },
  {
    name: "Informal Language",
    originalText: "Tesla is awesome! They're crushing it in the EV space and Elon is a genius. The stock is gonna moon because everyone wants electric cars now."
  },
  {
    name: "Technical but Unclear",
    originalText: "The company has EBITDA margins expanding with revenue growth YoY at 15% CAGR over 3 years. Market cap/revenue multiple is attractive vs peers in same sector."
  },
  {
    name: "Basic Description",
    originalText: "Apple makes phones and computers. They sell a lot and make money. The iPhone is popular. Good investment."
  },
  {
    name: "Mixed Issues",
    originalText: "Microsoft's cloud busines is doing great, there Azure platform is growing fast and beating Amazon sometimes. The stock price went up alot this year and they make good software products that everyone uses."
  }
];

async function testTextEnhancement() {
  try {
    console.log('🧪 TESTING TEXT ENHANCEMENT API\n');
    console.log('=' * 80);
    
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      console.log(`\n📝 TEST CASE ${i + 1}: ${testCase.name}`);
      console.log('-'.repeat(60));
      
      console.log('\n📄 ORIGINAL TEXT:');
      console.log(`"${testCase.originalText}"`);
      
      try {
        const response = await axios.post('http://localhost:5000/api/text/enhance', {
          text: testCase.originalText,
          type: 'professional'
        }, {
          headers: {
            'Content-Type': 'application/json'
          },
          withCredentials: true,
          timeout: 30000
        });
        
        if (response.data && response.data.enhancedText) {
          console.log('\n✨ ENHANCED TEXT:');
          console.log(`"${response.data.enhancedText}"`);
          
          // Calculate improvement metrics
          const originalWords = testCase.originalText.split(' ').length;
          const enhancedWords = response.data.enhancedText.split(' ').length;
          const wordChange = enhancedWords - originalWords;
          
          console.log('\n📊 METRICS:');
          console.log(`• Original words: ${originalWords}`);
          console.log(`• Enhanced words: ${enhancedWords}`);
          console.log(`• Word change: ${wordChange > 0 ? '+' : ''}${wordChange}`);
          
        } else {
          console.log('\n❌ ERROR: No enhanced text received');
          console.log('Response:', response.data);
        }
        
      } catch (apiError) {
        console.log('\n❌ API ERROR:');
        if (apiError.response) {
          console.log(`Status: ${apiError.response.status}`);
          console.log(`Message: ${apiError.response.data.message || 'Unknown error'}`);
        } else {
          console.log(`Error: ${apiError.message}`);
        }
      }
      
      console.log('\n' + '='.repeat(80));
      
      // Add delay between requests to avoid rate limiting
      if (i < testCases.length - 1) {
        console.log('⏳ Waiting 3 seconds before next test...\n');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
    console.log('\n🎉 All test cases completed!');
    
  } catch (error) {
    console.error('❌ Test execution error:', error.message);
  }
}

// Run the tests
testTextEnhancement();